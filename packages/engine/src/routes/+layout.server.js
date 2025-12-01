export async function load({ locals, platform }) {
  // Default site settings
  let siteSettings = { font_family: "alagard" };

  // Only fetch from database at runtime (not during prerendering)
  // The Cloudflare adapter throws when accessing platform.env during prerendering
  try {
    // Check if platform and env exist (they won't during prerendering or if bindings aren't configured)
    if (platform?.env?.GIT_STATS_DB) {
      const db = platform.env.GIT_STATS_DB;
      const result = await db
        .prepare("SELECT setting_key, setting_value FROM site_settings")
        .all();

      if (result?.results) {
        for (const row of result.results) {
          siteSettings[row.setting_key] = row.setting_value;
        }
      }
    }
  } catch (error) {
    // During prerendering or if DB bindings aren't configured, gracefully fall back to defaults
    // This prevents 500 errors when D1 bindings aren't set up in Cloudflare Pages dashboard
    console.error("Failed to load site settings (using defaults):", error.message);
  }

  return {
    user: locals.user || null,
    siteSettings,
  };
}
