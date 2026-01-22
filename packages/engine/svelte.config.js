import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// In CI builds, we don't have wrangler authentication.
// The AI binding (added for Petal) requires remote Cloudflare access -
// it can't be emulated locally and wrangler will error without auth.
// We skip prerendering in CI since it tries to emulate all bindings.
const isCI = process.env.CI === "true";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),

    // CSRF protection: Trust all *.grove.place subdomains
    // Required because grove-router proxies requests, causing Origin/Host mismatch
    // SvelteKit compares Origin header against Host, but behind our proxy the Host
    // is the internal worker hostname while Origin is the public subdomain.
    // This tells SvelteKit to trust form submissions from any grove.place subdomain.
    csrf: {
      checkOrigin: true,
      // @ts-ignore - trustedOrigins exists in SvelteKit 2.x but types may lag
      trustedOrigins: [
        "https://grove.place",
        "https://*.grove.place",
        // Local development
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
      ],
    },
    prerender: {
      // In CI, skip prerendering - the AI binding requires remote auth
      // that's not available in GitHub Actions. At runtime on Cloudflare,
      // all bindings are available. Prerendering would only help with
      // static routes which are already fast server-rendered.
      entries: isCI ? [] : ["*"],
      handleHttpError: ({ path, referrer, message }) => {
        // Ignore 404s for content pages - content is provided by consuming sites
        if (message.includes("404")) {
          console.warn(`Prerender skipping ${path}: ${message}`);
          return;
        }
        // Throw other errors
        throw new Error(message);
      },
      // In CI, ignore routes with `prerender = true` that weren't crawled
      // (since we use entries: [] to skip prerendering entirely)
      handleUnseenRoutes: isCI ? "ignore" : "fail",
    },
  },
};

export default config;
