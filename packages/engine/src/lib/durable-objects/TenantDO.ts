/// <reference types="@cloudflare/workers-types" />

/**
 * TenantDO - Per-Tenant Durable Object
 *
 * Provides:
 * - Config caching (eliminates D1 reads on every request)
 * - Cross-device draft sync
 * - Analytics event buffering
 *
 * ID Pattern: tenant:{subdomain}
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// ============================================================================
// Types
// ============================================================================

export interface TenantConfig {
  subdomain: string;
  displayName: string;
  theme: Record<string, unknown> | null;
  tier: "seedling" | "sapling" | "oak" | "evergreen";
  limits: TierLimits;
  ownerId: string;
}

export interface TierLimits {
  postsPerMonth: number;
  storageBytes: number;
  customDomains: number;
}

export interface Draft {
  slug: string;
  content: string;
  metadata: DraftMetadata;
  lastSaved: number;
  deviceId: string;
}

export interface DraftMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

export interface AnalyticsEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// TenantDO Class
// ============================================================================

export class TenantDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // In-memory caches (faster than storage for hot data)
  private config: TenantConfig | null = null;
  private configLoadedAt: number = 0;
  private analyticsBuffer: AnalyticsEvent[] = [];
  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Block concurrent requests while initializing storage
    this.state.blockConcurrencyWhile(async () => {
      await this.initializeStorage();
    });
  }

  /**
   * Initialize SQLite tables in DO storage
   */
  private async initializeStorage(): Promise<void> {
    if (this.initialized) return;

    await this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS drafts (
        slug TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        last_saved INTEGER NOT NULL,
        device_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp INTEGER NOT NULL
      );
    `);

    this.initialized = true;
  }

  /**
   * Main request handler - routes to appropriate method
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Config endpoints
      if (path === "/config" && request.method === "GET") {
        return this.handleGetConfig();
      }

      if (path === "/config" && request.method === "PUT") {
        return this.handleUpdateConfig(request);
      }

      // Draft endpoints
      if (path === "/drafts" && request.method === "GET") {
        return this.handleListDrafts();
      }

      if (path.startsWith("/drafts/") && request.method === "GET") {
        const slug = path.split("/").pop();
        return this.handleGetDraft(slug!);
      }

      if (path.startsWith("/drafts/") && request.method === "PUT") {
        const slug = path.split("/").pop();
        return this.handleSaveDraft(slug!, request);
      }

      if (path.startsWith("/drafts/") && request.method === "DELETE") {
        const slug = path.split("/").pop();
        return this.handleDeleteDraft(slug!);
      }

      // Analytics endpoint
      if (path === "/analytics" && request.method === "POST") {
        return this.handleRecordEvent(request);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("[TenantDO] Error:", err);
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ============================================================================
  // Config Methods
  // ============================================================================

  /**
   * Get tenant config (cached in memory, refreshed from D1 if stale)
   */
  private async handleGetConfig(): Promise<Response> {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    // Refresh if stale or not loaded
    if (!this.config || Date.now() - this.configLoadedAt > STALE_THRESHOLD_MS) {
      await this.refreshConfig();
    }

    if (!this.config) {
      return new Response("Tenant not found", { status: 404 });
    }

    return Response.json(this.config);
  }

  /**
   * Refresh config from DO storage or D1
   */
  private async refreshConfig(): Promise<void> {
    // Try DO storage first (fastest)
    const stored = this.state.storage.sql
      .exec("SELECT value FROM config WHERE key = 'tenant_config'")
      .one();

    if (stored?.value) {
      this.config = JSON.parse(stored.value as string);
      this.configLoadedAt = Date.now();
      return;
    }

    // Fall back to D1
    const tenantId = this.getTenantIdFromName();
    const row = await this.env.DB.prepare(
      `
      SELECT subdomain, name as displayName, theme, tier, owner_id as ownerId
      FROM tenants
      WHERE subdomain = ?
    `,
    )
      .bind(tenantId)
      .first();

    if (row) {
      // Build config with tier limits
      this.config = {
        subdomain: row.subdomain as string,
        displayName: row.displayName as string,
        theme: row.theme ? JSON.parse(row.theme as string) : null,
        tier: (row.tier as TenantConfig["tier"]) || "seedling",
        ownerId: row.ownerId as string,
        limits: this.getTierLimits(
          (row.tier as TenantConfig["tier"]) || "seedling",
        ),
      };

      // Cache in DO storage for next time
      await this.state.storage.sql.exec(
        "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
        "tenant_config",
        JSON.stringify(this.config),
        Date.now(),
      );

      this.configLoadedAt = Date.now();
    }
  }

  /**
   * Update tenant config
   */
  private async handleUpdateConfig(request: Request): Promise<Response> {
    const updates = (await request.json()) as Partial<TenantConfig>;

    // Merge with existing config
    if (!this.config) {
      await this.refreshConfig();
    }

    if (!this.config) {
      return new Response("Tenant not found", { status: 404 });
    }

    this.config = { ...this.config, ...updates };

    // Update DO storage
    await this.state.storage.sql.exec(
      "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
      "tenant_config",
      JSON.stringify(this.config),
      Date.now(),
    );

    // Update D1 (source of truth)
    const tenantId = this.getTenantIdFromName();
    await this.env.DB.prepare(
      `
      UPDATE tenants
      SET name = ?, theme = ?, updated_at = datetime('now')
      WHERE subdomain = ?
    `,
    )
      .bind(
        this.config.displayName,
        this.config.theme ? JSON.stringify(this.config.theme) : null,
        tenantId,
      )
      .run();

    this.configLoadedAt = Date.now();

    return Response.json({ success: true });
  }

  /**
   * Get tier limits based on subscription level
   */
  private getTierLimits(tier: TenantConfig["tier"]): TierLimits {
    const limits: Record<TenantConfig["tier"], TierLimits> = {
      seedling: {
        postsPerMonth: 10,
        storageBytes: 100 * 1024 * 1024, // 100MB
        customDomains: 0,
      },
      sapling: {
        postsPerMonth: 50,
        storageBytes: 500 * 1024 * 1024, // 500MB
        customDomains: 1,
      },
      oak: {
        postsPerMonth: 200,
        storageBytes: 2 * 1024 * 1024 * 1024, // 2GB
        customDomains: 3,
      },
      evergreen: {
        postsPerMonth: -1, // Unlimited
        storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
        customDomains: 10,
      },
    };

    return limits[tier];
  }

  // ============================================================================
  // Draft Methods
  // ============================================================================

  /**
   * List all drafts for this tenant
   */
  private async handleListDrafts(): Promise<Response> {
    const rows = this.state.storage.sql
      .exec(
        "SELECT slug, metadata, last_saved, device_id FROM drafts ORDER BY last_saved DESC",
      )
      .toArray();

    const drafts = rows.map((row) => ({
      slug: row.slug,
      metadata: JSON.parse(row.metadata as string),
      lastSaved: row.last_saved,
      deviceId: row.device_id,
    }));

    return Response.json(drafts);
  }

  /**
   * Get a specific draft
   */
  private async handleGetDraft(slug: string): Promise<Response> {
    const row = this.state.storage.sql
      .exec("SELECT * FROM drafts WHERE slug = ?", slug)
      .one();

    if (!row) {
      return new Response("Draft not found", { status: 404 });
    }

    return Response.json({
      slug: row.slug,
      content: row.content,
      metadata: JSON.parse(row.metadata as string),
      lastSaved: row.last_saved,
      deviceId: row.device_id,
    });
  }

  /**
   * Save or update a draft
   */
  private async handleSaveDraft(
    slug: string,
    request: Request,
  ): Promise<Response> {
    const draft = (await request.json()) as Omit<Draft, "slug" | "lastSaved">;
    const now = Date.now();

    await this.state.storage.sql.exec(
      `
      INSERT OR REPLACE INTO drafts (slug, content, metadata, last_saved, device_id)
      VALUES (?, ?, ?, ?, ?)
    `,
      slug,
      draft.content,
      JSON.stringify(draft.metadata),
      now,
      draft.deviceId,
    );

    return Response.json({ success: true, lastSaved: now });
  }

  /**
   * Delete a draft
   */
  private async handleDeleteDraft(slug: string): Promise<Response> {
    await this.state.storage.sql.exec(
      "DELETE FROM drafts WHERE slug = ?",
      slug,
    );
    return Response.json({ success: true });
  }

  // ============================================================================
  // Analytics Methods
  // ============================================================================

  /**
   * Record an analytics event (buffered)
   */
  private async handleRecordEvent(request: Request): Promise<Response> {
    const event = (await request.json()) as AnalyticsEvent;

    // Add to memory buffer
    this.analyticsBuffer.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });

    // If buffer is large, flush immediately
    if (this.analyticsBuffer.length >= 100) {
      await this.flushAnalytics();
    } else {
      // Schedule flush via alarm if not already set
      const currentAlarm = await this.state.storage.getAlarm();
      if (!currentAlarm) {
        await this.state.storage.setAlarm(Date.now() + 60_000); // 1 minute
      }
    }

    return Response.json({ success: true });
  }

  /**
   * Alarm handler - flush analytics buffer
   */
  async alarm(): Promise<void> {
    await this.flushAnalytics();
  }

  /**
   * Flush analytics buffer to D1
   */
  private async flushAnalytics(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return;

    const events = this.analyticsBuffer.splice(0, this.analyticsBuffer.length);
    const tenantId = this.getTenantIdFromName();

    // For now, just log - analytics table implementation deferred to Rings
    console.log(
      `[TenantDO] Flushing ${events.length} analytics events for ${tenantId}`,
    );

    // TODO: When Rings is implemented, batch insert to analytics table
    // This will use the AnalyticsDO pattern from the Rings spec
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Extract tenant ID (subdomain) from DO name
   * ID format: tenant:{subdomain}
   */
  private getTenantIdFromName(): string {
    // The ID is set via idFromName("tenant:{subdomain}")
    // We need to parse it from the hex ID or store it on first access
    // For now, we'll need to pass it in requests or store it
    // This is a known limitation - we'll store it on first config load
    return this.config?.subdomain || "unknown";
  }
}

// ============================================================================
// Environment Type (for DO constructor)
// ============================================================================

interface Env {
  DB: D1Database;
  CACHE_KV: KVNamespace;
}
