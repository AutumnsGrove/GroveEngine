<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Types for worker responses
	interface DomainResult {
		domain: string;
		tld: string;
		status: 'available' | 'registered' | 'unknown';
		price_cents?: number;
		score: number;
		flags: string[];
		evaluation_data?: {
			pronounceable: boolean;
			memorable: boolean;
			brand_fit: boolean;
			email_friendly: boolean;
			notes: string;
			pricing_category?: 'bundled' | 'recommended' | 'standard' | 'premium';
			renewal_cents?: number;
		};
		price_display?: string;
		pricing_category?: string;
	}

	interface PricingSummary {
		bundled: number;
		recommended: number;
		standard: number;
		premium: number;
	}

	interface TokenUsage {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	}

	interface ResultsResponse {
		job_id: string;
		status: string;
		batch_num: number;
		domains: DomainResult[];
		total_checked: number;
		pricing_summary: PricingSummary;
		usage: TokenUsage;
	}

	interface QuizQuestion {
		id: string;
		type: 'text' | 'single_select' | 'multi_select';
		prompt: string;
		required: boolean;
		placeholder?: string;
		options?: { value: string; label: string }[];
		default?: string | string[];
	}

	interface FollowupResponse {
		job_id: string;
		questions: QuizQuestion[];
		context: {
			batches_completed: number;
			domains_checked: number;
			good_found: number;
			target: number;
		};
	}

	// Form state
	let businessName = $state('');
	let domainIdea = $state('');
	let vibe = $state('professional');
	let keywords = $state('');
	let tldPreferences = $state<string[]>(['com', 'co']);

	// UI state
	let isSubmitting = $state(false);
	let isCancelling = $state(false);
	let isLoadingResults = $state(false);
	let isSubmittingFollowup = $state(false);
	let errorMessage = $state('');
	let currentJob = $state(data.currentJob);
	let jobResults = $state<DomainResult[]>([]);
	let pricingSummary = $state<PricingSummary | null>(null);
	let tokenUsage = $state<TokenUsage | null>(null);
	let followupQuiz = $state<FollowupResponse | null>(null);
	let followupAnswers = $state<Record<string, string | string[]>>({});
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	// Timer state for live elapsed time
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const vibeOptions = [
		{ value: 'professional', label: 'Professional' },
		{ value: 'creative', label: 'Creative' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'bold', label: 'Bold' },
		{ value: 'personal', label: 'Personal' },
		{ value: 'playful', label: 'Playful' },
		{ value: 'tech', label: 'Tech-focused' }
	];

	const tldOptions = [
		{ value: 'com', label: '.com' },
		{ value: 'co', label: '.co' },
		{ value: 'io', label: '.io' },
		{ value: 'dev', label: '.dev' },
		{ value: 'app', label: '.app' },
		{ value: 'me', label: '.me' },
		{ value: 'net', label: '.net' },
		{ value: 'org', label: '.org' }
	];

	function toggleTld(tld: string) {
		if (tldPreferences.includes(tld)) {
			tldPreferences = tldPreferences.filter(t => t !== tld);
		} else {
			tldPreferences = [...tldPreferences, tld];
		}
	}

	async function startSearch() {
		if (!businessName.trim()) {
			errorMessage = 'Business name is required';
			return;
		}

		isSubmitting = true;
		errorMessage = '';
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;

		try {
			const response = await fetch('/api/search/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					business_name: businessName.trim(),
					domain_idea: domainIdea.trim() || null,
					vibe,
					keywords: keywords.trim() || null,
					tld_preferences: tldPreferences
				})
			});

			const result = (await response.json()) as { success?: boolean; error?: string; job?: typeof currentJob };

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				startPolling();
			} else {
				throw new Error(result.error || 'Failed to start search');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to start search';
		} finally {
			isSubmitting = false;
		}
	}

	function startPolling() {
		if (pollingInterval) clearInterval(pollingInterval);

		pollingInterval = setInterval(async () => {
			if (!currentJob) return;

			try {
				const response = await fetch(`/api/search/status?job_id=${currentJob.id}`);
				const result = (await response.json()) as { job?: typeof currentJob };

				if (response.ok && result.job) {
					currentJob = result.job;

					// Stop polling and fetch results if job is terminal
					if (currentJob && ['complete', 'failed', 'cancelled', 'needs_followup'].includes(currentJob.status)) {
						stopPolling();
						stopTimer();

						// Fetch full results
						if (currentJob.status === 'complete' || currentJob.status === 'needs_followup') {
							await fetchResults();
						}

						// Fetch followup quiz if needed
						if (currentJob.status === 'needs_followup') {
							await fetchFollowup();
						}
					}
				}
			} catch (err) {
				console.error('Polling error:', err);
			}
		}, 2000); // Poll every 2 seconds
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	async function fetchResults() {
		if (!currentJob) return;

		isLoadingResults = true;
		try {
			const response = await fetch(`/api/search/results?job_id=${currentJob.id}`);
			if (response.ok) {
				const results = (await response.json()) as ResultsResponse;
				jobResults = results.domains || [];
				pricingSummary = results.pricing_summary || null;
				tokenUsage = results.usage || null;
			}
		} catch (err) {
			console.error('Failed to fetch results:', err);
		} finally {
			isLoadingResults = false;
		}
	}

	async function fetchFollowup() {
		if (!currentJob) return;

		try {
			const response = await fetch(`/api/search/followup?job_id=${currentJob.id}`);
			if (response.ok) {
				followupQuiz = (await response.json()) as FollowupResponse;
				// Initialize answers with defaults
				followupQuiz.questions.forEach(q => {
					if (q.default) {
						followupAnswers[q.id] = q.default;
					}
				});
			}
		} catch (err) {
			console.error('Failed to fetch followup:', err);
		}
	}

	async function submitFollowup() {
		if (!currentJob || !followupQuiz) return;

		isSubmittingFollowup = true;
		try {
			const response = await fetch(`/api/search/resume?job_id=${currentJob.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ followup_responses: followupAnswers })
			});

			if (response.ok) {
				currentJob = { ...currentJob, status: 'running' };
				followupQuiz = null;
				followupAnswers = {};
				startPolling();
				startTimer();
			}
		} catch (err) {
			console.error('Failed to resume search:', err);
		} finally {
			isSubmittingFollowup = false;
		}
	}

	async function cancelSearch() {
		if (!currentJob) return;

		isCancelling = true;
		try {
			const response = await fetch('/api/search/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ job_id: currentJob.id })
			});

			if (response.ok) {
				currentJob = { ...currentJob, status: 'cancelled', error: 'Cancelled by user' };
				stopPolling();
				stopTimer();
			}
		} catch (err) {
			console.error('Cancel error:', err);
		} finally {
			isCancelling = false;
		}
	}

	function startNewSearch() {
		currentJob = null;
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;
		followupAnswers = {};
		errorMessage = '';
	}

	function startTimer() {
		// Calculate initial elapsed time from started_at
		if (currentJob?.started_at) {
			const startTime = new Date(currentJob.started_at).getTime();
			elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
		} else {
			elapsedSeconds = 0;
		}

		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			if (currentJob?.started_at) {
				const startTime = new Date(currentJob.started_at).getTime();
				elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null || seconds === undefined) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
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

	function formatPrice(cents: number | null | undefined): string {
		if (!cents) return '-';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getPriceClass(category: string | null | undefined): string {
		switch (category) {
			case 'bundled': return 'text-grove-600';
			case 'recommended': return 'text-domain-600';
			case 'premium': return 'text-amber-600';
			default: return 'text-bark/60';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'running': return 'text-domain-600';
			case 'pending': return 'text-bark/60';
			case 'complete': return 'text-grove-600';
			case 'needs_followup': return 'text-amber-600';
			case 'failed': return 'text-red-600';
			case 'cancelled': return 'text-red-500';
			default: return 'text-bark/60';
		}
	}

	function getStatusDot(status: string): string {
		switch (status) {
			case 'running': return 'status-dot-running';
			case 'pending': return 'status-dot-pending';
			case 'complete': return 'status-dot-complete';
			case 'needs_followup': return 'status-dot-warning';
			case 'failed':
			case 'cancelled': return 'status-dot-error';
			default: return 'status-dot-pending';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'needs_followup': return 'Needs Follow-up';
			default: return status;
		}
	}

	// Check if form should be disabled
	const isFormDisabled = $derived(isSubmitting || currentJob?.status === 'running');

	// Start polling and timer if there's an active job
	$effect(() => {
		if (currentJob && (currentJob.status === 'running' || currentJob.status === 'pending')) {
			startPolling();
			startTimer();
		} else {
			stopTimer();
		}
		return () => {
			stopPolling();
			stopTimer();
		};
	});
</script>

<svelte:head>
	<title>Searcher - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-serif text-bark">Domain Searcher</h1>
		<p class="text-bark/60 font-sans mt-1">AI-powered domain discovery with live pricing</p>
	</div>

	<div class="grid lg:grid-cols-2 gap-8">
		<!-- Search Form -->
		<div class="card p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="font-serif text-lg text-bark">New Search</h2>
				{#if currentJob && !['running', 'pending'].includes(currentJob.status)}
					<button
						type="button"
						onclick={startNewSearch}
						class="text-sm font-sans text-domain-600 hover:text-domain-700"
					>
						Clear & Start New
					</button>
				{/if}
			</div>

			{#if errorMessage}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					<p class="text-sm font-sans">{errorMessage}</p>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); startSearch(); }} class="space-y-6">
				<!-- Business Name -->
				<div>
					<label for="business_name" class="block text-sm font-sans font-medium text-bark mb-2">
						Business / Project Name *
					</label>
					<input
						id="business_name"
						type="text"
						bind:value={businessName}
						placeholder="e.g., Sunrise Bakery"
						class="input-field"
						required
						disabled={isFormDisabled}
					/>
				</div>

				<!-- Domain Idea -->
				<div>
					<label for="domain_idea" class="block text-sm font-sans font-medium text-bark mb-2">
						Domain Idea (optional)
					</label>
					<input
						id="domain_idea"
						type="text"
						bind:value={domainIdea}
						placeholder="e.g., sunrisebakery.com"
						class="input-field"
						disabled={isFormDisabled}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">If you have a specific domain in mind, we'll check it and find similar alternatives</p>
				</div>

				<!-- Vibe -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark mb-2">
						Brand Vibe
					</label>
					<select
						bind:value={vibe}
						class="input-field"
						disabled={isFormDisabled}
					>
						{#each vibeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- TLD Preferences -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark mb-2">
						Preferred TLDs
					</label>
					<div class="flex flex-wrap gap-2">
						{#each tldOptions as option}
							<button
								type="button"
								onclick={() => toggleTld(option.value)}
								class="px-3 py-1.5 rounded-full text-sm font-sans transition-colors {tldPreferences.includes(option.value) ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-bark/60 border border-transparent hover:bg-bark/10'}"
								disabled={isFormDisabled}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Keywords -->
				<div>
					<label for="keywords" class="block text-sm font-sans font-medium text-bark mb-2">
						Keywords (optional)
					</label>
					<input
						id="keywords"
						type="text"
						bind:value={keywords}
						placeholder="e.g., artisan, local, organic"
						class="input-field"
						disabled={isFormDisabled}
					/>
				</div>

				<!-- Submit -->
				<button
					type="submit"
					class="btn-primary w-full flex items-center justify-center gap-2"
					disabled={isSubmitting || !businessName.trim() || currentJob?.status === 'running'}
				>
					{#if isSubmitting}
						<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Starting Search...
					{:else if currentJob?.status === 'running'}
						<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Search in Progress...
					{:else}
						Start Domain Search
					{/if}
				</button>
			</form>
		</div>

		<!-- Current Job Status -->
		<div class="space-y-6">
			{#if currentJob}
				<!-- Status Card -->
				<div class="card p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-serif text-lg text-bark">Search Status</h2>
						<div class="flex items-center gap-2">
							<div class="status-dot {getStatusDot(currentJob.status)}"></div>
							<span class="text-sm font-sans capitalize {getStatusColor(currentJob.status)}">
								{getStatusLabel(currentJob.status)}
							</span>
						</div>
					</div>

					<div class="space-y-3">
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Business</span>
							<span class="text-bark font-medium">{currentJob.business_name}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Batch</span>
							<span class="text-bark">{currentJob.batch_num} / 6</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Domains Checked</span>
							<span class="text-bark">{currentJob.domains_checked}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Available Found</span>
							<span class="text-domain-600 font-medium">{currentJob.domains_available ?? 0}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Good Results</span>
							<span class="text-grove-600 font-medium">{currentJob.good_results}</span>
						</div>
						<!-- Live elapsed time for running jobs, final duration for completed -->
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">
								{currentJob.status === 'running' || currentJob.status === 'pending' ? 'Elapsed' : 'Duration'}
							</span>
							{#if currentJob.status === 'running' || currentJob.status === 'pending'}
								<span class="text-domain-600 font-medium font-mono tabular-nums">
									{formatElapsed(elapsedSeconds)}
								</span>
							{:else if currentJob.duration_seconds}
								<span class="text-bark font-mono tabular-nums">{formatDuration(currentJob.duration_seconds)}</span>
							{:else}
								<span class="text-bark/40">-</span>
							{/if}
						</div>
					</div>

					<!-- Progress bar -->
					{#if currentJob.status === 'running'}
						<div class="mt-4">
							<div class="h-2 bg-grove-100 rounded-full overflow-hidden">
								<div
									class="h-full bg-domain-500 transition-all duration-500"
									style="width: {Math.min((currentJob.batch_num / 6) * 100, 100)}%"
								></div>
							</div>
						</div>

						<!-- Cancel button -->
						<button
							type="button"
							onclick={cancelSearch}
							disabled={isCancelling}
							class="mt-4 w-full px-4 py-2 text-sm font-sans font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
						>
							{isCancelling ? 'Cancelling...' : 'Cancel Search'}
						</button>
					{/if}

					<!-- Error/cancelled message -->
					{#if (currentJob.status === 'failed' || currentJob.status === 'cancelled') && currentJob.error}
						<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<p class="text-sm text-red-700 font-sans">{currentJob.error}</p>
						</div>
					{/if}
				</div>

				<!-- Follow-up Quiz -->
				{#if currentJob.status === 'needs_followup' && followupQuiz}
					<div class="card p-6">
						<h2 class="font-serif text-lg text-bark mb-2">Refine Your Search</h2>
						<p class="text-sm text-bark/60 font-sans mb-4">
							We found {followupQuiz.context.good_found} good domains out of {followupQuiz.context.target} target.
							Answer these questions to help us find more.
						</p>

						<div class="space-y-4">
							{#each followupQuiz.questions as question}
								<div>
									<label class="block text-sm font-sans font-medium text-bark mb-2">
										{question.prompt}
										{#if question.required}<span class="text-red-500">*</span>{/if}
									</label>

									{#if question.type === 'text'}
										<input
											type="text"
											class="input-field"
											placeholder={question.placeholder}
											bind:value={followupAnswers[question.id]}
										/>
									{:else if question.type === 'single_select' && question.options}
										<select
											class="input-field"
											bind:value={followupAnswers[question.id]}
										>
											<option value="">Select...</option>
											{#each question.options as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									{:else if question.type === 'multi_select' && question.options}
										<div class="flex flex-wrap gap-2">
											{#each question.options as opt}
												{@const currentVal = followupAnswers[question.id]}
												{@const currentArr = Array.isArray(currentVal) ? currentVal : []}
												{@const selected = currentArr.includes(opt.value)}
												<button
													type="button"
													onclick={() => {
														const arr = Array.isArray(followupAnswers[question.id]) ? [...followupAnswers[question.id] as string[]] : [];
														if (arr.includes(opt.value)) {
															followupAnswers[question.id] = arr.filter((v: string) => v !== opt.value);
														} else {
															followupAnswers[question.id] = [...arr, opt.value];
														}
													}}
													class="px-3 py-1.5 rounded-full text-sm font-sans transition-colors {selected ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-bark/60 border border-transparent hover:bg-bark/10'}"
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
								onclick={submitFollowup}
								disabled={isSubmittingFollowup}
								class="btn-primary w-full flex items-center justify-center gap-2"
							>
								{#if isSubmittingFollowup}
									<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Resuming...
								{:else}
									Continue Search
								{/if}
							</button>
						</div>
					</div>
				{/if}

				<!-- Pricing Summary -->
				{#if pricingSummary && (currentJob.status === 'complete' || currentJob.status === 'needs_followup')}
					<div class="card p-6">
						<h2 class="font-serif text-lg text-bark mb-4">Pricing Summary</h2>
						<div class="grid grid-cols-2 gap-4">
							<div class="text-center p-3 bg-grove-50 rounded-lg">
								<div class="text-2xl font-mono font-bold text-grove-600">{pricingSummary.bundled}</div>
								<div class="text-xs text-bark/60 font-sans">Bundled (&le;$30/yr)</div>
							</div>
							<div class="text-center p-3 bg-domain-50 rounded-lg">
								<div class="text-2xl font-mono font-bold text-domain-600">{pricingSummary.recommended}</div>
								<div class="text-xs text-bark/60 font-sans">Recommended (&le;$50/yr)</div>
							</div>
							<div class="text-center p-3 bg-bark/5 rounded-lg">
								<div class="text-2xl font-mono font-bold text-bark/70">{pricingSummary.standard}</div>
								<div class="text-xs text-bark/60 font-sans">Standard</div>
							</div>
							<div class="text-center p-3 bg-amber-50 rounded-lg">
								<div class="text-2xl font-mono font-bold text-amber-600">{pricingSummary.premium}</div>
								<div class="text-xs text-bark/60 font-sans">Premium (&gt;$50/yr)</div>
							</div>
						</div>

						{#if tokenUsage}
							<div class="mt-4 pt-4 border-t border-grove-200">
								<div class="flex justify-between text-xs font-sans text-bark/50">
									<span>API Usage</span>
									<span>{tokenUsage.total_tokens.toLocaleString()} tokens</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Results -->
				{#if jobResults.length > 0}
					<div class="card">
						<div class="p-4 border-b border-grove-200 flex justify-between items-center">
							<h2 class="font-serif text-lg text-bark">Available Domains</h2>
							<span class="text-sm text-bark/60 font-sans">
								{#if isLoadingResults}
									Loading...
								{:else}
									{jobResults.filter(r => r.status === 'available').length} available
								{/if}
							</span>
						</div>
						<div class="max-h-[500px] overflow-y-auto divide-y divide-grove-100">
							{#each jobResults.filter(r => r.status === 'available').sort((a, b) => b.score - a.score) as result}
								<div class="p-4 hover:bg-grove-50 transition-colors">
									<div class="flex items-center justify-between">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="font-mono text-bark font-medium truncate">{result.domain}</span>
												{#if result.pricing_category || result.evaluation_data?.pricing_category}
													{@const category = result.pricing_category || result.evaluation_data?.pricing_category}
													<span class="flex-shrink-0 px-2 py-0.5 text-xs font-sans rounded-full
														{category === 'bundled' ? 'bg-grove-100 text-grove-700' :
														 category === 'recommended' ? 'bg-domain-100 text-domain-700' :
														 category === 'premium' ? 'bg-amber-100 text-amber-700' :
														 'bg-bark/10 text-bark/60'}">
														{category}
													</span>
												{/if}
											</div>
											<div class="flex items-center gap-3 mt-1">
												<span class="text-xs font-sans text-bark/50">Score: {(result.score * 100).toFixed(0)}%</span>
												{#if result.flags && result.flags.length > 0}
													<div class="flex gap-1 flex-wrap">
														{#each result.flags.slice(0, 3) as flag}
															<span class="text-xs font-sans text-bark/40">{flag}</span>
														{/each}
													</div>
												{/if}
											</div>
											{#if result.evaluation_data?.notes}
												<p class="text-xs text-bark/50 font-sans mt-1 line-clamp-1">{result.evaluation_data.notes}</p>
											{/if}
										</div>
										<div class="text-right flex-shrink-0 ml-4">
											<span class="{getPriceClass(result.pricing_category || result.evaluation_data?.pricing_category)} font-sans font-medium">
												{result.price_display || formatPrice(result.price_cents)}
											</span>
											<span class="text-xs text-bark/40 font-sans block">/year</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else if currentJob.status === 'complete' && !isLoadingResults}
					<div class="card p-8 text-center">
						<p class="text-bark/60 font-sans">No available domains found. Try adjusting your search criteria.</p>
					</div>
				{/if}
			{:else}
				<div class="card p-8 text-center">
					<svg class="w-16 h-16 mx-auto text-bark/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
					<p class="text-bark/60 font-sans">No active search. Fill out the form to start finding domains.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
