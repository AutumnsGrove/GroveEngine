import type { HumProviderInfo } from "../types.js";

export const tidal: HumProviderInfo = {
	name: "Tidal",
	color: "#000000",
	patterns: [
		/^https?:\/\/(www\.|listen\.)?tidal\.com\/(browse\/)?(track|album|playlist|artist)\/[a-zA-Z0-9-]+/,
	],
};
