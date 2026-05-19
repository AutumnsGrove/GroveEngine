import type { HumProviderInfo } from "../types.js";

export const soundcloud: HumProviderInfo = {
	name: "SoundCloud",
	color: "#ff5500",
	patterns: [/^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/],
};
