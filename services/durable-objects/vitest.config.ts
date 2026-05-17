import { defineConfig } from "vitest/config";
import path from "path";

const engineLib = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: {
			"cloudflare:workers": path.resolve(__dirname, "src/test-stubs/cloudflare-workers.ts"),
			"@autumnsgrove/loom": path.resolve(__dirname, "../../libs/loom/src/index.ts"),
			"@autumnsgrove/grove-errors": path.resolve(__dirname, "../../libs/grove-errors/src/index.ts"),
			"@autumnsgrove/lattice/errors": path.resolve(engineLib, "errors/index.ts"),
			// Stub heavy dependencies that DOs import but tests don't need
			"@autumnsgrove/lattice/ai/lumen": path.resolve(__dirname, "src/test-stubs/lumen.ts"),
		},
	},
});
