<script lang="ts">
	// Re-export shim — ModerationQueue moved to ./moderation/ModerationQueue.svelte
	// This file preserves backward compatibility for existing imports.

	import type { CommunityTheme, CommunityThemeStatus } from "../types.js";
	import ModerationQueueImpl from "./moderation/ModerationQueue.svelte";

	interface Props {
		themes: CommunityTheme[];
		onStatusChange?: (themeId: string, status: CommunityThemeStatus, reason?: string) => void;
		onPreview?: (theme: CommunityTheme) => void;
	}

	let { themes, onStatusChange, onPreview }: Props = $props();
</script>

<ModerationQueueImpl {themes} {onStatusChange} {onPreview} />
