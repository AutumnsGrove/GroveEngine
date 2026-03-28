import { defineConfig } from "vite";
import { createGroveViteConfig } from "@autumnsgrove/infra/vite";
import { showroomPlugin } from "./src/lib/vite-plugin-showroom";

const base = createGroveViteConfig();

export default defineConfig({
	...base,
	// showroomPlugin must run before sveltekit
	plugins: [showroomPlugin(), ...base.plugins!],
	server: {
		port: 5188,
		fs: {
			// Allow serving files from the entire monorepo (components live in libs/)
			allow: ["../.."],
		},
	},
});
