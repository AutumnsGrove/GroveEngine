import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	resolve: {
		alias: [
			{ find: "$lib", replacement: resolve(__dirname, "./src/lib") },
			{
				find: "@autumnsgrove/lattice/ui/icons",
				replacement: resolve(__dirname, "./src/lib/__mocks__/icons.ts"),
			},
			{
				find: "@autumnsgrove/lattice/errors",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/errors/index.ts"),
			},
			{
				find: "@autumnsgrove/lattice/config",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/config/index.ts"),
			},
			{
				find: "@autumnsgrove/lattice/utils/user",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/utils/user.ts"),
			},
			{
				find: "@autumnsgrove/lattice/utils",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/utils.ts"),
			},
			{
				find: "@autumnsgrove/lattice/pulse",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/pulse/index.ts"),
			},
			{
				find: "@autumnsgrove/lattice/platform/config",
				replacement: resolve(__dirname, "../../libs/engine/dist/platform/config/index.js"),
			},
			{
				find: "@autumnsgrove/lattice/platform/pricing",
				replacement: resolve(__dirname, "../../libs/engine/src/lib/platform/pricing/index.ts"),
			},
			{
				find: /^@autumnsgrove\/infra$/,
				replacement: resolve(__dirname, "../../libs/infra/src/index.ts"),
			},
		],
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		globals: true,
	},
});
