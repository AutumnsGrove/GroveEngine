import type { RequestHandler } from "./$types";

/**
 * Temporary static OG image fallback.
 *
 * Dynamic OG images are broken due to workers-og WASM bundling issues with SvelteKit + Cloudflare Pages.
 * This endpoint redirects to the static fallback image until we implement a proper solution.
 *
 * See TODOS.md for details.
 */
export const GET: RequestHandler = async ({ url }) => {
  // Redirect to static OG image
  const staticImageUrl = new URL("/og-image.png", url.origin);
  return new Response(null, {
    status: 302,
    headers: {
      Location: staticImageUrl.toString(),
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
      "X-Generated-At": new Date().toISOString(),
      "X-OG-Status": "static-fallback",
    },
  });
};
