import type { HumProviderInfo } from "../types.js";

export const deezer: HumProviderInfo = {
	name: "Deezer",
	color: "#a238ff",
	patterns: [/^https?:\/\/(www\.)?deezer\.com\/(track|album|playlist|artist)\/\d+/],
};
