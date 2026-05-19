import type { HumProviderInfo } from "../types.js";

export const bandcamp: HumProviderInfo = {
	name: "Bandcamp",
	color: "#1da0c3",
	patterns: [/^https?:\/\/[a-zA-Z0-9_-]+\.bandcamp\.com\/(track|album)\/[a-zA-Z0-9_-]+/],
};
