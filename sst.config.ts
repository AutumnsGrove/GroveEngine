/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST Configuration for GroveEngine
 *
 * Unifies all Cloudflare resources previously spread across 6 wrangler.toml files:
 * - packages/engine/wrangler.toml
 * - landing/wrangler.toml
 * - plant/wrangler.toml
 * - domains/wrangler.toml
 * - packages/grove-router/wrangler.toml
 * - packages/example-site/wrangler.toml
 *
 * Run: npx sst dev (local development)
 * Run: npx sst deploy --stage production (deploy to prod)
 */

export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        // Stripe provider will be added in Phase 2
        // stripe: {
        //   apiKey: input?.stage === "production"
        //     ? process.env.STRIPE_SECRET_KEY
        //     : process.env.STRIPE_TEST_SECRET_KEY,
        // },
      },
    };
  },

  async run() {
    const stage = $app.stage;
    const isProd = stage === "production";

    // =========================================================================
    // SHARED RESOURCES
    // =========================================================================

    // D1 Database - shared by all apps
    // In production, import existing database to avoid data loss
    const db = isProd
      ? sst.cloudflare.D1.get("GroveDB", "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68")
      : new sst.cloudflare.D1("GroveDB");

    // KV Namespace - for caching and rate limiting
    // Used by: engine, example-site
    const cache = isProd
      ? sst.cloudflare.Kv.get("GroveCache", "514e91e81cc44d128a82ec6f668303e4")
      : new sst.cloudflare.Kv("GroveCache");

    // R2 Buckets
    // grove-media: blog images, user uploads (engine, example-site)
    const media = isProd
      ? sst.cloudflare.R2.get("GroveMedia", "grove-media")
      : new sst.cloudflare.R2("GroveMedia");

    // grove-cdn: landing site assets, static files (landing, grove-router)
    const cdn = isProd
      ? sst.cloudflare.R2.get("GroveCDN", "grove-cdn")
      : new sst.cloudflare.R2("GroveCDN");

    // =========================================================================
    // STRIPE PRODUCTS (Phase 2 - uncomment when ready)
    // =========================================================================
    // Since we have no existing Stripe products, SST will create them fresh
    //
    // const seedling = new stripe.Product("Seedling", {
    //   name: isProd ? "Seedling Plan" : `[${stage}] Seedling Plan`,
    //   description: "Perfect for personal blogs - 1GB storage, 3 themes",
    // });
    //
    // const sapling = new stripe.Product("Sapling", {
    //   name: isProd ? "Sapling Plan" : `[${stage}] Sapling Plan`,
    //   description: "For growing communities - 5GB storage, 10 themes",
    // });
    //
    // const oak = new stripe.Product("Oak", {
    //   name: isProd ? "Oak Plan" : `[${stage}] Oak Plan`,
    //   description: "Professional publishing - 20GB storage, customizer, custom domain",
    // });
    //
    // const evergreen = new stripe.Product("Evergreen", {
    //   name: isProd ? "Evergreen Plan" : `[${stage}] Evergreen Plan`,
    //   description: "Enterprise features - 100GB storage, custom fonts, priority support",
    // });
    //
    // // Prices (monthly)
    // const prices = {
    //   seedling: {
    //     monthly: new stripe.Price("SeedlingMonthly", {
    //       product: seedling.id,
    //       currency: "usd",
    //       unitAmount: 800, // $8.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("SeedlingYearly", {
    //       product: seedling.id,
    //       currency: "usd",
    //       unitAmount: 8160, // $81.60 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   sapling: {
    //     monthly: new stripe.Price("SaplingMonthly", {
    //       product: sapling.id,
    //       currency: "usd",
    //       unitAmount: 1200, // $12.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("SaplingYearly", {
    //       product: sapling.id,
    //       currency: "usd",
    //       unitAmount: 12240, // $122.40 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   oak: {
    //     monthly: new stripe.Price("OakMonthly", {
    //       product: oak.id,
    //       currency: "usd",
    //       unitAmount: 2500, // $25.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("OakYearly", {
    //       product: oak.id,
    //       currency: "usd",
    //       unitAmount: 25500, // $255.00 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   evergreen: {
    //     monthly: new stripe.Price("EvergreenMonthly", {
    //       product: evergreen.id,
    //       currency: "usd",
    //       unitAmount: 3500, // $35.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("EvergreenYearly", {
    //       product: evergreen.id,
    //       currency: "usd",
    //       unitAmount: 35700, // $357.00 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    // };

    // =========================================================================
    // SVELTEKIT APPS
    // =========================================================================

    // Helper for stage-based domain names
    const getDomain = (subdomain: string) => {
      if (isProd) return subdomain ? `${subdomain}.grove.place` : "grove.place";
      if (stage === "dev") return `${subdomain}.dev.grove.place`;
      return `${subdomain}.${stage}.grove.place`; // PR previews: pr-123.grove.place
    };

    // -------------------------------------------------------------------------
    // Grove Landing (grove.place)
    // Marketing site, knowledge base, pricing
    // -------------------------------------------------------------------------
    const landing = new sst.cloudflare.SvelteKit("Landing", {
      path: "landing",
      link: [db, cdn],
      environment: {
        CDN_URL: isProd ? "https://cdn.grove.place" : "http://localhost:5173/cdn",
      },
      domain: isProd ? "grove.place" : undefined,
    });

    // -------------------------------------------------------------------------
    // Grove Plant (plant.grove.place)
    // Tenant onboarding, signup flow, payment
    // -------------------------------------------------------------------------
    const plant = new sst.cloudflare.SvelteKit("Plant", {
      path: "plant",
      link: [db],
      environment: {
        GROVEAUTH_URL: "https://auth.grove.place",
        // Stripe keys will be added as secrets
      },
      domain: getDomain("plant"),
    });

    // -------------------------------------------------------------------------
    // Grove Domains (domains.grove.place)
    // Domain search and registration (Forage)
    // -------------------------------------------------------------------------
    const domains = new sst.cloudflare.SvelteKit("Domains", {
      path: "domains",
      link: [db],
      environment: {
        SITE_NAME: "Forage",
        SITE_URL: isProd ? "https://domains.grove.place" : "http://localhost:5174",
        GROVEAUTH_URL: "https://auth.grove.place",
      },
      domain: getDomain("domains"),
    });

    // -------------------------------------------------------------------------
    // GroveEngine (*.grove.place - tenant blogs)
    // Main blog engine serving all tenant subdomains
    // -------------------------------------------------------------------------
    const engine = new sst.cloudflare.SvelteKit("Engine", {
      path: "packages/engine",
      link: [db, cache, media],
      environment: {
        CACHE_TTL_SECONDS: "3600",
        GROVEAUTH_URL: "https://auth.grove.place",
      },
      // Wildcard domain for all tenant subdomains
      domain: isProd
        ? { name: "*.grove.place", zone: "grove.place" }
        : undefined,
    });

    // -------------------------------------------------------------------------
    // Example Site (example.grove.place)
    // Demo site showcasing GroveEngine features - "The Midnight Bloom"
    // -------------------------------------------------------------------------
    const exampleSite = new sst.cloudflare.SvelteKit("ExampleSite", {
      path: "packages/example-site",
      link: [db, cache, media],
      environment: {
        CACHE_TTL_SECONDS: "3600",
        SITE_NAME: "The Midnight Bloom",
        SITE_URL: isProd ? "https://example.grove.place" : "http://localhost:5175",
      },
      domain: getDomain("example"),
    });

    // =========================================================================
    // WORKERS
    // =========================================================================

    // -------------------------------------------------------------------------
    // Grove Router (*.grove.place wildcard handler)
    // Catches all subdomain requests and routes to appropriate service
    // -------------------------------------------------------------------------
    // Note: With SST managing explicit domains for each app, the router's
    // role is reduced. It may only be needed for edge cases or CDN proxying.
    //
    // const router = new sst.cloudflare.Worker("Router", {
    //   handler: "packages/grove-router/src/index.ts",
    //   link: [cdn],
    //   url: true,
    //   // Routes will be configured after other apps have their domains
    // });

    // =========================================================================
    // OUTPUTS
    // =========================================================================

    return {
      // URLs for each app
      landing: landing.url,
      plant: plant.url,
      domains: domains.url,
      engine: engine.url,
      exampleSite: exampleSite.url,

      // Resource IDs (useful for debugging)
      dbId: db.id,
      cacheId: cache.id,
      mediaId: media.id,
      cdnId: cdn.id,
    };
  },
});
