import type { HumProviderInfo } from "../types.js";

export const youtubeMusic: HumProviderInfo = {
	name: "YouTube Music",
	color: "#ff0000",
	patterns: [
		/^https?:\/\/music\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
		/^https?:\/\/music\.youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/,
	],
};
