import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

export default createGroveViteConfig({
	optimizeDeps: {
		exclude: ["gray-matter"],
	},
	build: {
		rollupOptions: {
			// gray-matter is excluded from dependency pre-bundling and externalized
			external: ["gray-matter"],
		},
	},
});
