<script lang="ts">
	// SearchStatus.svelte
	// Job status card, progress bar, cancel button, followup quiz, and pricing summary

	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import type { FollowupResponse, PricingSummary, TokenUsage } from "./types.js";

	interface Props {
		currentJob: {
			id: string;
			status: string;
			business_name: string;
			batch_num: number;
			domains_checked: number;
			domains_available?: number | null;
			good_results: number;
			started_at?: string | null;
			duration_seconds?: number | null;
			error?: string | null;
		} | null;
		elapsedSeconds: number;
		isCancelling: boolean;
		followupQuiz: FollowupResponse | null;
		followupAnswers: Record<string, string | string[]>;
		isSubmittingFollowup: boolean;
		pricingSummary: PricingSummary | null;
		tokenUsage: TokenUsage | null;
		onCancel: () => void;
		onSubmitFollowup: () => void;
		onFollowupAnswerChange: (questionId: string, value: string | string[]) => void;
	}

	let {
		currentJob,
		elapsedSeconds,
		isCancelling,
		followupQuiz,
		followupAnswers,
		isSubmittingFollowup,
		pricingSummary,
		tokenUsage,
		onCancel,
		onSubmitFollowup,
		onFollowupAnswerChange,
	}: Props = $props();

	function getStatusColor(status: string): string {
		switch (status) {
			case "running":
				return "text-domain-600 dark:text-domain-400";
			case "pending":
				return "text-foreground-muted";
			case "complete":
				return "text-grove-600 dark:text-grove-400";
			case "needs_followup":
				return "text-warning";
			case "failed":
			case "cancelled":
				return "text-error";
			default:
				return "text-foreground-muted";
		}
	}

	function getStatusDot(status: string): string {
		switch (status) {
			case "running":
				return "status-dot-running";
			case "pending":
				return "status-dot-pending";
			case "complete":
				return "status-dot-complete";
			case "needs_followup":
				return "status-dot-warning";
			case "failed":
			case "cancelled":
				return "status-dot-error";
			default:
				return "status-dot-pending";
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case "needs_followup":
				return "Needs Follow-up";
			default:
				return status;
		}
	}

	function formatElapsed(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (mins < 60) return `${mins}m ${secs}s`;
		const hours = Math.floor(mins / 60);
		const remainingMins = mins % 60;
		return `${hours}h ${remainingMins}m ${secs}s`;
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null || seconds === undefined) return "-";
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	// DeepSeek v3.2 pricing via OpenRouter per million tokens [input, output]
	const MODEL_PRICING: [number, number] = [0.28, 0.42];

	function estimateCost(usage: TokenUsage): string {
		const [inputRate, outputRate] = MODEL_PRICING;
		const inputCost = (usage.input_tokens / 1_000_000) * inputRate;
		const outputCost = (usage.output_tokens / 1_000_000) * outputRate;
		const total = inputCost + outputCost;
		return `$${total.toFixed(3)}`;
	}
</script>

{#if currentJob}
	<!-- Status Card -->
	<GlassCard class="p-4 sm:p-6">
		<div class="flex items-center justify-between mb-3 sm:mb-4">
			<h2 class="font-serif text-base sm:text-lg text-bark dark:text-foreground">Search Status</h2>
			<div class="flex items-center gap-2">
				<div class="status-dot {getStatusDot(currentJob.status)}"></div>
				<span class="text-sm font-sans capitalize {getStatusColor(currentJob.status)}">
					{getStatusLabel(currentJob.status)}
				</span>
			</div>
		</div>

		<div class="space-y-3">
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">Business</span>
				<span class="text-bark dark:text-foreground font-medium">{currentJob.business_name}</span>
			</div>
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">Batch</span>
				<span class="text-bark dark:text-foreground">{currentJob.batch_num} / 6</span>
			</div>
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">Domains Checked</span>
				<span class="text-bark dark:text-foreground">{currentJob.domains_checked}</span>
			</div>
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">Available Found</span>
				<span class="text-domain-600 font-medium">{currentJob.domains_available ?? 0}</span>
			</div>
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">Good Results</span>
				<span class="text-grove-600 font-medium">{currentJob.good_results}</span>
			</div>
			<div class="flex justify-between text-sm font-sans">
				<span class="text-foreground-muted">
					{currentJob.status === "running" || currentJob.status === "pending"
						? "Elapsed"
						: "Duration"}
				</span>
				{#if currentJob.status === "running" || currentJob.status === "pending"}
					<span class="text-domain-600 font-medium font-mono tabular-nums">
						{formatElapsed(elapsedSeconds)}
					</span>
				{:else if currentJob.duration_seconds}
					<span class="text-bark dark:text-foreground font-mono tabular-nums"
						>{formatDuration(currentJob.duration_seconds)}</span
					>
				{:else}
					<span class="text-foreground-faint">-</span>
				{/if}
			</div>
		</div>

		<!-- Progress bar -->
		{#if currentJob.status === "running"}
			<div class="mt-4">
				<div class="h-2 bg-grove-100 rounded-full overflow-hidden">
					<div
						class="h-full bg-domain-500 transition-all duration-500"
						style="width: {Math.min((currentJob.batch_num / 6) * 100, 100)}%"
					></div>
				</div>
			</div>

			<button
				type="button"
				onclick={onCancel}
				disabled={isCancelling}
				class="mt-4 w-full px-4 py-2 text-sm font-sans font-medium text-error bg-surface-subtle hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
			>
				{isCancelling ? "Cancelling..." : "Cancel Search"}
			</button>
		{/if}

		<!-- Error/cancelled message -->
		{#if (currentJob.status === "failed" || currentJob.status === "cancelled") && currentJob.error}
			<div class="mt-4 p-3 bg-surface-subtle border border-error rounded-lg">
				<p class="text-sm text-error font-sans">{currentJob.error}</p>
			</div>
		{/if}
	</GlassCard>

	<!-- Follow-up Quiz -->
	{#if currentJob.status === "needs_followup" && followupQuiz}
		<GlassCard variant="accent" class="p-4 sm:p-6">
			<h2 class="font-serif text-base sm:text-lg text-bark dark:text-foreground mb-2">
				Refine Your Search
			</h2>
			<p class="text-sm text-foreground-muted font-sans mb-4">
				We found {followupQuiz.context.good_found} good domains out of {followupQuiz.context.target} target.
				Answer these questions to help us find more.
			</p>

			<div class="space-y-4">
				{#each followupQuiz.questions as question}
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2">
							{question.prompt}
							{#if question.required}<span class="text-error">*</span>{/if}
						</label>

						{#if question.type === "text"}
							<input
								type="text"
								class="input-field"
								placeholder={question.placeholder}
								value={followupAnswers[question.id] ?? ""}
								oninput={(e) => onFollowupAnswerChange(question.id, e.currentTarget.value)}
							/>
						{:else if question.type === "single_select" && question.options}
							<select
								class="input-field"
								value={followupAnswers[question.id] ?? ""}
								onchange={(e) => onFollowupAnswerChange(question.id, e.currentTarget.value)}
							>
								<option value="">Select...</option>
								{#each question.options as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						{:else if question.type === "multi_select" && question.options}
							<div class="flex flex-wrap gap-2">
								{#each question.options as opt}
									{@const currentVal = followupAnswers[question.id]}
									{@const currentArr = Array.isArray(currentVal) ? currentVal : []}
									{@const selected = currentArr.includes(opt.value)}
									<button
										type="button"
										onclick={() => {
											const arr = Array.isArray(followupAnswers[question.id])
												? [...(followupAnswers[question.id] as string[])]
												: [];
											if (arr.includes(opt.value)) {
												onFollowupAnswerChange(
													question.id,
													arr.filter((v: string) => v !== opt.value),
												);
											} else {
												onFollowupAnswerChange(question.id, [...arr, opt.value]);
											}
										}}
										class="px-3 py-1.5 rounded-full text-sm font-sans transition-colors {selected
											? 'bg-domain-100 text-domain-700 border border-domain-300'
											: 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-surface-hover'}"
									>
										{opt.label}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}

				<button
					type="button"
					onclick={onSubmitFollowup}
					disabled={isSubmittingFollowup}
					class="btn-primary w-full flex items-center justify-center gap-2"
				>
					{#if isSubmittingFollowup}
						<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Resuming...
					{:else}
						Continue Search
					{/if}
				</button>
			</div>
		</GlassCard>
	{/if}

	<!-- Pricing Summary -->
	{#if pricingSummary && (currentJob.status === "complete" || currentJob.status === "needs_followup")}
		<GlassCard class="p-4 sm:p-6">
			<h2 class="font-serif text-base sm:text-lg text-bark dark:text-foreground mb-3 sm:mb-4">
				Pricing Summary
			</h2>
			<div class="grid grid-cols-2 gap-2 sm:gap-4">
				<div class="text-center p-2 sm:p-3 bg-grove-50 rounded-lg">
					<div class="text-xl sm:text-2xl font-mono font-bold text-grove-600">
						{pricingSummary.bundled}
					</div>
					<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">
						Bundled (&le;$30/yr)
					</div>
				</div>
				<div class="text-center p-2 sm:p-3 bg-domain-50 rounded-lg">
					<div class="text-xl sm:text-2xl font-mono font-bold text-domain-600">
						{pricingSummary.recommended}
					</div>
					<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">
						Recommended (&le;$50/yr)
					</div>
				</div>
				<div class="text-center p-2 sm:p-3 bg-bark/5 rounded-lg">
					<div class="text-xl sm:text-2xl font-mono font-bold text-foreground-muted">
						{pricingSummary.standard}
					</div>
					<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">Standard</div>
				</div>
				<div class="text-center p-2 sm:p-3 bg-surface-subtle rounded-lg">
					<div class="text-xl sm:text-2xl font-mono font-bold text-warning">
						{pricingSummary.premium}
					</div>
					<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">
						Premium (&gt;$50/yr)
					</div>
				</div>
			</div>

			{#if tokenUsage}
				<div class="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-grove-200 space-y-1.5 sm:space-y-2">
					<div class="flex justify-between text-[10px] sm:text-xs font-sans text-foreground-subtle">
						<span>API Usage</span>
						<span class="font-mono">{tokenUsage.total_tokens.toLocaleString()} tokens</span>
					</div>
					<div class="grid grid-cols-2 gap-2 text-[10px] sm:text-xs font-sans">
						<div class="flex justify-between text-foreground-faint">
							<span>Input</span>
							<span class="font-mono">{tokenUsage.input_tokens.toLocaleString()}</span>
						</div>
						<div class="flex justify-between text-foreground-faint">
							<span>Output</span>
							<span class="font-mono">{tokenUsage.output_tokens.toLocaleString()}</span>
						</div>
					</div>
					<div
						class="flex justify-between text-[10px] sm:text-xs font-sans pt-1 border-t border-grove-100"
					>
						<span class="text-foreground-subtle">Est. Cost (DeepSeek v3.2)</span>
						<span class="font-mono text-domain-600 font-medium">{estimateCost(tokenUsage)}</span>
					</div>
				</div>
			{/if}
		</GlassCard>
	{/if}
{:else}
	<GlassCard variant="muted" class="p-8 text-center">
		<svg
			class="w-16 h-16 mx-auto text-foreground-faint mb-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
			/>
		</svg>
		<p class="text-foreground-muted font-sans">
			No active search. Fill out the form to start finding domains.
		</p>
	</GlassCard>
{/if}
