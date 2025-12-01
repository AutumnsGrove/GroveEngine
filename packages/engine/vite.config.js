import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    // Disable source maps in production to prevent source code exposure
    sourcemap: false,
  },
  server: {
    fs: {
      // Allow serving files from project root directories (dev only)
      allow: [".."],
    },
  },
});
