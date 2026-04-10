# Architecture Notes

> Extracted from `AGENT.md` — the authoritative reference for Grove's infrastructure and database architecture.

---

- Multi-tenant architecture with subdomain routing
- Cloudflare-first infrastructure (Workers, D1, KV, R2)
- Phase-based development: Lattice → Multi-tenant → Website → Meadow → Polish

## D1 Database Architecture (3 databases)

| Database                 | Binding    | Tables | Purpose                                              |
| ------------------------ | ---------- | ------ | ---------------------------------------------------- |
| `grove-engine-db`        | `DB`       | ~78    | Core: auth, tenants, pages, billing, platform config |
| `grove-curios-db`        | `CURIO_DB` | 45     | Curio widgets: timeline, gallery, guestbook, etc.    |
| `grove-observability-db` | `OBS_DB`   | 16     | Observability: sentinel monitoring, vista analytics  |

**Binding rules:**

- **Curio routes** (`/api/curios/*`, `/arbor/curios/*`, `/(site)/timeline|gallery|guestbook|pulse`) → use `platform?.env?.CURIO_DB`
- **Observability routes** (`/api/sentinel/*`, `/api/vista/*`) → use `platform?.env?.OBS_DB`
- **Everything else** (auth, tenants, pages, billing) → use `platform?.env?.DB`
- **Cross-DB routes** (e.g., timeline generate/backfill/save-token) need **both** `DB` and `CURIO_DB` — `DB` for SecretsManager, `CURIO_DB` for curio tables

## Warden (Credential Gateway)

**Warden** (`workers/warden/`) is Grove's centralized API credential gateway. No other worker should hold raw API keys — they resolve credentials through Warden via service binding.

**Credential flow:** Worker receives request → calls Warden `/resolve` with its agent API key → Warden authenticates, checks scopes, decrypts credential from `tenant_secrets` → returns key → worker uses it for the external API call. Raw keys never leave Warden except over internal service bindings (same colo, in-process).

**Agent enrollment:** Each worker that needs credentials must be registered as a Warden agent with scoped permissions:

```bash
gw warden agent enroll --write --name <worker-name> --owner system \
  --scopes "openrouter:*" --rpm 600 --daily 50000 --apply-to <worker-name>
```

This registers the agent, generates a unique API key, saves it to the vault, and deploys it to the worker.

**Key `gw warden` commands:**

| Command                                  | Tier   | Description                        |
| ---------------------------------------- | ------ | ---------------------------------- |
| `gw warden status`                       | Read   | Check Warden health                |
| `gw warden agent list`                   | Read   | List registered agents             |
| `gw warden logs [--service] [--agent]`   | Read   | Fetch audit logs                   |
| `gw warden agent enroll --write [flags]` | Write  | Register agent + save key to vault |
| `gw warden agent revoke --write --force` | Danger | Disable an agent (irreversible)    |

**Alias fallback:** Warden checks multiple key names per service (e.g., `openrouter_api_key` then `timeline_openrouter_key`) so credentials saved under legacy names are still discoverable.

## Key Architecture Documents

| Document                                                            | Purpose                                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/plans/infra/completed/database-consolidation-architecture.md` | 3-phase database extraction plan (completed Feb 2026)                             |
| `docs/patterns/loom-durable-objects-pattern.md`                     | Loom DO coordination layer for auth, tenant coordination, D1 batching             |
| `docs/specs/rings-spec.md`                                          | Rings analytics system with privacy-first design and DO integration               |
| `docs/grove-ai-gateway-integration.md`                              | Cloudflare AI Gateway integration for per-tenant AI quotas and observability      |
| `docs/specs/server-sdk-spec.md`                                     | Infra SDK infrastructure abstraction layer (Ports & Adapters)                     |
| `docs/specs/drizzle-integration-spec.md`                            | Drizzle ORM integration (The Aquifer): typed D1 queries, scopedDb, migration plan |
