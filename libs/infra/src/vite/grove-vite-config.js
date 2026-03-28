import { sveltekit } from "@sveltejs/kit/vite";

/**
 * Creates a base Vite config for Grove SvelteKit apps.
 *
 * Includes: SvelteKit plugin, JXL externalization, Lucide SSR noExternal.
 * Pass overrides to extend (arrays are concatenated, objects deep-merged).
 *
 * @param {import('vite').UserConfig} overrides
 * @returns {import('vite').UserConfig}
 */
export function createGroveViteConfig(overrides = {}) {
	const base = {
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

	return deepMergeConfig(base, overrides);
}

/**
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} overrides
 * @returns {Record<string, unknown>}
 */
function deepMergeConfig(base, overrides) {
	const result = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		const baseVal = result[key];
		if (Array.isArray(value) && Array.isArray(baseVal)) {
			result[key] = [...baseVal, ...value];
		} else if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			baseVal &&
			typeof baseVal === "object"
		) {
			result[key] = deepMergeConfig(baseVal, value);
		} else {
			result[key] = value;
		}
	}

	return result;
}
