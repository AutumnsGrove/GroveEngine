import { defineConfig } from "vitest/config";
import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

export default defineConfig({
	...(createGroveViteConfig({
		server: {
			hmr: {
				overlay: false,
			},
		},
		resolve: {
			conditions: ["browser"],
		},
	}) as any),
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/tests/setup.ts"],
		server: {
			deps: {
				inline: [/svelte/],
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			exclude: ["node_modules/", "src/tests/", "**/*.d.ts", "**/*.config.*", ".svelte-kit/"],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
