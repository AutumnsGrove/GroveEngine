import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

export default createGroveViteConfig({
	optimizeDeps: {
		exclude: ["workers-og", "@autumnsgrove/gossamer"],
	},
	build: {
		rollupOptions: {
			external: ["workers-og"],
		},
	},
	ssr: {
		// These packages ship .svelte files that need processing during SSR
		noExternal: ["lucide-svelte", "@tabler/icons-svelte", "@autumnsgrove/gossamer"],
	},
});
