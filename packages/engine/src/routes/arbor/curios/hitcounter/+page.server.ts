import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "$lib/errors";
import {
  generateHitCounterId,
  sanitizeLabel,
  DEFAULT_HIT_COUNTER_CONFIG,
  HIT_COUNTER_STYLE_OPTIONS,
} from "$lib/curios/hitcounter";

interface CounterRow {
  id: string;
  page_path: string;
  count: number;
  style: string;
  label: string;
  show_since_date: number;
  started_at: string;
  updated_at: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db || !tenantId) {
    return {
      config: null,
      styleOptions: HIT_COUNTER_STYLE_OPTIONS,
      error: "Database not available",
    };
  }

  const counter = await db
    .prepare(
      `SELECT id, page_path, count, style, label, show_since_date, started_at, updated_at
       FROM hit_counters
       WHERE tenant_id = ? AND page_path = '/'`,
    )
    .bind(tenantId)
    .first<CounterRow>()
    .catch(() => null);

  let parsedConfig = null;
  if (counter) {
    parsedConfig = {
      pagePath: counter.page_path,
      count: counter.count,
      style: counter.style,
      label: counter.label,
      showSinceDate: Boolean(counter.show_since_date),
      startedAt: counter.started_at,
      updatedAt: counter.updated_at,
    };
  }

  return {
    config: parsedConfig || {
      ...DEFAULT_HIT_COUNTER_CONFIG,
      startedAt: new Date().toISOString(),
    },
    styleOptions: HIT_COUNTER_STYLE_OPTIONS,
  };
};

export const actions: Actions = {
  save: async ({ request, platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const formData = await request.formData();

    const style = formData.get("style") as string;
    const label = formData.get("label") as string;
    const showSinceDate = formData.get("showSinceDate") === "true";

    // Validate
    const validStyles = ["classic", "odometer", "minimal", "lcd"];
    const finalStyle = validStyles.includes(style)
      ? style
      : DEFAULT_HIT_COUNTER_CONFIG.style;
    const finalLabel = sanitizeLabel(label);

    try {
      await db
        .prepare(
          `INSERT INTO hit_counters (id, tenant_id, page_path, count, style, label, show_since_date, updated_at)
           VALUES (?, ?, '/', 0, ?, ?, ?, datetime('now'))
           ON CONFLICT(tenant_id, page_path) DO UPDATE SET
             style = excluded.style,
             label = excluded.label,
             show_since_date = excluded.show_since_date,
             updated_at = datetime('now')`,
        )
        .bind(
          generateHitCounterId(),
          tenantId,
          finalStyle,
          finalLabel,
          showSinceDate ? 1 : 0,
        )
        .run();

      return { success: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
        error_code: ARBOR_ERRORS.SAVE_FAILED.code,
      });
    }
  },

  reset: async ({ platform, locals }) => {
    const db = platform?.env?.DB;
    const tenantId = locals.tenantId;

    if (!db || !tenantId) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    try {
      await db
        .prepare(
          `UPDATE hit_counters SET count = 0, started_at = datetime('now'), updated_at = datetime('now')
           WHERE tenant_id = ? AND page_path = '/'`,
        )
        .bind(tenantId)
        .run();

      return { success: true, reset: true };
    } catch (error) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
