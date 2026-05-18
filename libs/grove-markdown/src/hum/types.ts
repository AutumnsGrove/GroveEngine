/**
 * Hum: Universal Music Link Previews
 *
 * Type definitions for music metadata, providers, and card states.
 *
 * A hum is the ambient music of a living forest — bees in the undergrowth,
 * wind through the canopy, the vibration of everything being alive.
 */

/** Supported music providers */
export type HumProvider =
	| "apple-music"
	| "spotify"
	| "youtube-music"
	| "soundcloud"
	| "bandcamp"
	| "tidal"
	| "deezer"
	| "amazon-music"
	| "unknown";

/** Content type of the music link */
export type HumContentType = "track" | "album" | "playlist" | "artist" | "unknown";

/** Resolution quality */
export type HumStatus = "resolved" | "partial" | "unresolved";

/** Normalized metadata returned by /api/hum/resolve */
export interface HumMetadata {
	sourceUrl: string;
	provider: HumProvider;
	type: HumContentType;
	title: string | null;
	artist: string | null;
	album: string | null;
	artworkUrl: string | null;
	platformLinks: Partial<Record<HumProvider, string>>;
	resolvedAt: string;
	status: HumStatus;
}

/** Provider display metadata */
export interface HumProviderInfo {
	name: string;
	color: string;
	patterns: RegExp[];
}
