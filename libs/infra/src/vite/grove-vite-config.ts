import { sveltekit } from "@sveltejs/kit/vite";
import type { UserConfig } from "vite";

/**
 * Creates a base Vite config for Grove SvelteKit apps.
 *
 * Includes: SvelteKit plugin, JXL externalization, Lucide SSR noExternal.
 * Pass overrides to extend (arrays are concatenated, objects deep-merged).
 */
export function createGroveViteConfig(overrides: UserConfig = {}): UserConfig {
	const base: UserConfig = {
		plugins: [sveltekit()],
		optimizeDeps: {
			exclude: ["@jsquash/jxl"],
		},
		build: {
			rollupOptions: {
				external: [/^@jsquash\//],
			},
		},
		ssr: {
			noExternal: ["@lucide/svelte"],
		},
	};

	// Deep merge: concatenate arrays, merge objects
	return deepMergeConfig(base, overrides);
}

function deepMergeConfig(base: UserConfig, overrides: UserConfig): UserConfig {
	const result = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		const baseVal = (result as Record<string, unknown>)[key];
		if (Array.isArray(value) && Array.isArray(baseVal)) {
			(result as Record<string, unknown>)[key] = [...baseVal, ...value];
		} else if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			baseVal &&
			typeof baseVal === "object"
		) {
			(result as Record<string, unknown>)[key] = deepMergeConfig(
				baseVal as UserConfig,
				value as UserConfig,
			);
		} else {
			(result as Record<string, unknown>)[key] = value;
		}
	}

	return result;
}
