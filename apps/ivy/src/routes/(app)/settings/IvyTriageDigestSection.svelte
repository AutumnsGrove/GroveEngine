<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";

	interface Props {
		digestEnabled: boolean;
		digestTimes: string[];
		digestTimezone: string;
		digestRecipient: string;
		savingDigest: boolean;
		digestSaved: boolean;
		sendingDigest: boolean;
		digestMessage: string;
		onDigestEnabledChange: (value: boolean) => void;
		onDigestTimezoneChange: (value: string) => void;
		onDigestRecipientChange: (value: string) => void;
		onUpdateDigestTime: (index: number, value: string) => void;
		onAddDigestTime: () => void;
		onRemoveDigestTime: (index: number) => void;
		onSaveDigestSettings: () => void;
		onTriggerDigest: () => void;
	}

	let {
		digestEnabled,
		digestTimes,
		digestTimezone,
		digestRecipient,
		savingDigest,
		digestSaved,
		sendingDigest,
		digestMessage,
		onDigestEnabledChange,
		onDigestTimezoneChange,
		onDigestRecipientChange,
		onUpdateDigestTime,
		onAddDigestTime,
		onRemoveDigestTime,
		onSaveDigestSettings,
		onTriggerDigest,
	}: Props = $props();
</script>

<section class="settings-section">
	<h2 class="section-title">Triage & Digest</h2>

	<div class="setting-card">
		<!-- Digest toggle -->
		<label class="setting-item">
			<div class="setting-info">
				<Icon name="inbox" size={20} />
				<div class="setting-details">
					<span class="setting-label">Email digest</span>
					<span class="setting-description"
						>Receive AI-summarized email briefings at scheduled times</span
					>
				</div>
			</div>
			<input
				type="checkbox"
				class="toggle-checkbox"
				checked={digestEnabled}
				onchange={(e) => onDigestEnabledChange(e.currentTarget.checked)}
			/>
		</label>

		<div class="setting-divider"></div>

		<!-- Digest times -->
		<div class="setting-item column">
			<div class="setting-info full">
				<Icon name="settings" size={20} />
				<div class="setting-details">
					<span class="setting-label">Digest schedule</span>
					<span class="setting-description">When to receive digest emails</span>
				</div>
			</div>
			<div class="digest-times">
				{#each digestTimes as time, i}
					<div class="digest-time-row">
						<input
							type="time"
							class="time-input"
							value={time}
							oninput={(e) => onUpdateDigestTime(i, (e.target as HTMLInputElement).value)}
						/>
						{#if digestTimes.length > 1}
							<button
								class="remove-time-btn"
								onclick={() => onRemoveDigestTime(i)}
								title="Remove time"
							>
								<Icon name="x" size={14} />
							</button>
						{/if}
					</div>
				{/each}
				{#if digestTimes.length < 6}
					<button class="add-time-btn" onclick={onAddDigestTime}>+ Add time</button>
				{/if}
			</div>
		</div>

		<div class="setting-divider"></div>

		<!-- Timezone -->
		<div class="setting-item">
			<div class="setting-info">
				<Icon name="settings" size={20} />
				<div class="setting-details">
					<span class="setting-label">Timezone</span>
				</div>
			</div>
			<select
				class="select-input"
				value={digestTimezone}
				onchange={(e) => onDigestTimezoneChange(e.currentTarget.value)}
			>
				<option value="America/New_York">Eastern (ET)</option>
				<option value="America/Chicago">Central (CT)</option>
				<option value="America/Denver">Mountain (MT)</option>
				<option value="America/Los_Angeles">Pacific (PT)</option>
				<option value="Europe/London">London (GMT)</option>
				<option value="Europe/Berlin">Berlin (CET)</option>
				<option value="Asia/Tokyo">Tokyo (JST)</option>
			</select>
		</div>

		<div class="setting-divider"></div>

		<!-- Recipient -->
		<div class="setting-item">
			<div class="setting-info">
				<Icon name="send" size={20} />
				<div class="setting-details">
					<span class="setting-label">Send digest to</span>
					<span class="setting-description">Email address for digest delivery</span>
				</div>
			</div>
			<input
				type="email"
				class="text-input"
				placeholder="you@example.com"
				value={digestRecipient}
				oninput={(e) => onDigestRecipientChange(e.currentTarget.value)}
			/>
		</div>

		<div class="setting-divider"></div>

		<!-- Save + Send Now buttons -->
		<div class="setting-item">
			<button class="btn-outline" onclick={onSaveDigestSettings} disabled={savingDigest}>
				{#if savingDigest}Saving...{:else if digestSaved}Saved!{:else}Save Settings{/if}
			</button>
			<button class="btn-outline" onclick={onTriggerDigest} disabled={sendingDigest}>
				{#if sendingDigest}Sending...{:else}Send Digest Now{/if}
			</button>
		</div>
		{#if digestMessage}
			<div class="digest-message">{digestMessage}</div>
		{/if}
	</div>
</section>

<style>
	.settings-section {
		margin-bottom: var(--space-8);
	}

	.section-title {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-3);
	}

	.setting-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		gap: var(--space-4);
	}

	.setting-item.column {
		flex-direction: column;
		align-items: stretch;
	}

	label.setting-item {
		cursor: pointer;
	}

	label.setting-item:hover {
		background: var(--color-surface-hover);
	}

	.setting-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-secondary);
	}

	.setting-info.full {
		width: 100%;
	}

	.setting-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.setting-label {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.setting-description {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.setting-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: 0 var(--space-4);
	}

	.btn-outline {
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.btn-outline:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.select-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.select-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.text-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.text-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.toggle-checkbox {
		width: 44px;
		height: 24px;
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		cursor: pointer;
		position: relative;
		transition: all var(--transition-fast);
	}

	.toggle-checkbox::after {
		content: "";
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: var(--color-text-tertiary);
		border-radius: var(--radius-full);
		transition: all var(--transition-fast);
	}

	.toggle-checkbox:checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.toggle-checkbox:checked::after {
		left: 22px;
		background: white;
	}

	.digest-times {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.digest-time-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.time-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.time-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.remove-time-btn {
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
	}

	.remove-time-btn:hover {
		color: var(--color-error);
		background: var(--color-surface-hover);
	}

	.add-time-btn {
		padding: var(--space-1) var(--space-2);
		color: var(--color-primary);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		background: transparent;
		transition: color var(--transition-fast);
	}

	.add-time-btn:hover {
		color: var(--color-primary-hover);
	}

	.digest-message {
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		color: var(--color-primary);
		text-align: center;
	}
</style>
