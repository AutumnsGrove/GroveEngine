import type { HumProviderInfo } from "../types.js";

export const appleMusic: HumProviderInfo = {
	name: "Apple Music",
	color: "#fc3c44",
	patterns: [
		/^https?:\/\/music\.apple\.com\/[a-z]{2}\/(album|playlist|music-video)\/[^/]+\/[a-zA-Z0-9.]+/,
		/^https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[^/]+\/\d+/,
	],
};
