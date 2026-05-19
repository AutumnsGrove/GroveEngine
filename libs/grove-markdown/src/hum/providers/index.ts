import type { HumProvider, HumProviderInfo } from "../types.js";
import { appleMusic } from "./apple-music.js";
import { spotify } from "./spotify.js";
import { youtubeMusic } from "./youtube-music.js";
import { soundcloud } from "./soundcloud.js";
import { tidal } from "./tidal.js";
import { deezer } from "./deezer.js";
import { bandcamp } from "./bandcamp.js";
import { amazonMusic } from "./amazon-music.js";
import { unknown } from "./unknown.js";

export const HUM_PROVIDERS: Record<HumProvider, HumProviderInfo> = {
	"apple-music": appleMusic,
	spotify,
	"youtube-music": youtubeMusic,
	soundcloud,
	tidal,
	deezer,
	bandcamp,
	"amazon-music": amazonMusic,
	unknown,
};
