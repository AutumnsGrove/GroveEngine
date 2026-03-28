<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";

	interface Props {
		commentsEnabled: number;
		publicEnabled: number;
		whoCanComment: string;
		showCount: number;
		savingSettings: boolean;
		onCommentsEnabledToggle: () => void;
		onPublicEnabledToggle: () => void;
		onWhoCanCommentChange: (value: string) => void;
		onShowCountToggle: () => void;
		onSaveSettings: () => void;
	}

	let {
		commentsEnabled,
		publicEnabled,
		whoCanComment,
		showCount,
		savingSettings,
		onCommentsEnabledToggle,
		onPublicEnabledToggle,
		onWhoCanCommentChange,
		onShowCountToggle,
		onSaveSettings,
	}: Props = $props();
</script>

<div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
	<GlassCard variant="default">
		<div class="settings-form">
			<div class="setting-group">
				<span class="setting-label" id="label-comments-enabled">
					<span class="setting-name">Comments enabled</span>
					<span class="setting-desc">Allow visitors to leave comments on your posts</span>
				</span>
				<button
					class="toggle-btn"
					class:on={commentsEnabled}
					onclick={onCommentsEnabledToggle}
					role="switch"
					aria-checked={!!commentsEnabled}
					aria-labelledby="label-comments-enabled"
				>
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
				</button>
			</div>

			<div class="setting-group">
				<span class="setting-label" id="label-public-comments">
					<span class="setting-name">Public comments</span>
					<span class="setting-desc"
						>Allow public comments visible to all readers (otherwise, only private replies to
						you)</span
					>
				</span>
				<button
					class="toggle-btn"
					class:on={publicEnabled}
					onclick={onPublicEnabledToggle}
					role="switch"
					aria-checked={!!publicEnabled}
					aria-labelledby="label-public-comments"
				>
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
				</button>
			</div>

			<div class="setting-group">
				<label class="setting-label" for="who-can-comment">
					<span class="setting-name">Who can comment</span>
					<span class="setting-desc">Restrict who is allowed to leave comments</span>
				</label>
				<select
					id="who-can-comment"
					class="setting-select"
					value={whoCanComment}
					onchange={(e) => onWhoCanCommentChange(e.currentTarget.value)}
				>
					<option value="anyone">Anyone (signed in)</option>
					<option value="grove_members">Grove members only</option>
					<option value="paid_only">Paid subscribers only</option>
					<option value="nobody">Nobody (disabled)</option>
				</select>
			</div>

			<div class="setting-group">
				<span class="setting-label" id="label-show-count">
					<span class="setting-name">Show comment count</span>
					<span class="setting-desc">Display comment count badge on blog posts</span>
				</span>
				<button
					class="toggle-btn"
					class:on={showCount}
					onclick={onShowCountToggle}
					role="switch"
					aria-checked={!!showCount}
					aria-labelledby="label-show-count"
				>
					<span class="toggle-track">
						<span class="toggle-thumb"></span>
					</span>
				</button>
			</div>

			<div class="setting-actions">
				<button class="save-btn" onclick={onSaveSettings} disabled={savingSettings}>
					{savingSettings ? "Saving..." : "Save Settings"}
				</button>
			</div>
		</div>
	</GlassCard>
</div>

<style>
	.settings-form {
		padding: 0.5rem 0;
	}

	.setting-group {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
	}

	.setting-group:last-of-type {
		border-bottom: none;
	}

	:global(.dark) .setting-group {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .setting-group:last-of-type {
		border-bottom: none;
	}

	.setting-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.setting-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text, #333);
	}

	:global(.dark) .setting-name {
		color: var(--grove-text-strong, #d4d4d4);
	}

	.setting-desc {
		font-size: 0.8125rem;
		color: var(--color-text-muted, #888);
		line-height: 1.4;
	}

	.toggle-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.toggle-btn:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
		border-radius: 14px;
	}

	.toggle-track {
		position: relative;
		width: 40px;
		height: 22px;
		border-radius: 11px;
		background: var(--grove-overlay-20, rgba(0, 0, 0, 0.12));
		transition: background 0.2s;
	}

	:global(.dark) .toggle-track {
		background: #4b5563;
	}

	.toggle-btn.on .toggle-track {
		background: var(--grove-accent);
	}

	:global(.dark) .toggle-btn.on .toggle-track {
		background: var(--grove-accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.toggle-btn.on .toggle-thumb {
		transform: translateX(18px);
	}

	.setting-select {
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		border: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: var(--grove-overlay-4, rgba(255, 255, 255, 0.7));
		color: var(--color-text, #333);
		font-family: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.setting-select:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	:global(.dark) .setting-select {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--grove-text-strong, #d4d4d4);
	}

	.setting-actions {
		padding: 1.25rem;
		display: flex;
		justify-content: flex-end;
	}

	.save-btn {
		padding: 0.625rem 1.5rem;
		min-height: 44px;
		background: var(--grove-accent);
		color: white;
		border: none;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.save-btn:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	:global(.dark) .save-btn {
		background: var(--grove-accent);
		color: #1a1a1a;
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle-track,
		.toggle-thumb,
		.save-btn {
			transition: none;
		}
	}

	@media (max-width: 640px) {
		.setting-group {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.setting-select {
			width: 100%;
		}
	}

	@media (max-width: 600px) {
		.setting-group {
			padding: 0.875rem 1rem;
		}

		.setting-actions {
			padding: 1rem;
		}
	}
</style>
