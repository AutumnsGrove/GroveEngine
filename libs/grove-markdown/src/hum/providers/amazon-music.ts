import type { HumProviderInfo } from "../types.js";

export const amazonMusic: HumProviderInfo = {
	name: "Amazon Music",
	color: "#25d1da",
	patterns: [/^https?:\/\/music\.amazon\.(com|co\.\w+)\/(albums|tracks|playlists)\/[a-zA-Z0-9]+/],
};
