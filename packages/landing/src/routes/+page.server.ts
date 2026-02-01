import type { ServerLoad } from "@sveltejs/kit";

export const load: ServerLoad = async ({ locals, platform }) => {
  let groveUrl: string | null = null;

  // If logged in, find their grove
  if (locals.user?.email && platform?.env?.DB) {
    try {
      const tenant = await platform.env.DB.prepare(
        "SELECT username FROM tenants WHERE email = ? LIMIT 1",
      )
        .bind(locals.user.email)
        .first<{ username: string }>();

      if (tenant?.username) {
        groveUrl = `https://${tenant.username}.grove.place/admin`;
      }
    } catch {
      // No grove yet - that's fine
    }
  }

  return {
    user: locals.user,
    groveUrl,
  };
};
