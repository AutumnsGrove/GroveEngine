import type { HumProviderInfo } from "../types.js";

export const spotify: HumProviderInfo = {
	name: "Spotify",
	color: "#1db954",
	patterns: [
		/^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+/,
	],
};
