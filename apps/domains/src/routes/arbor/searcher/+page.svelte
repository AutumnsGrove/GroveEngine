<script lang="ts">
	// +page.svelte — Searcher orchestrator
	// Manages top-level state, API calls, polling/SSE, and composes child components

	import type { PageData } from "./$types";
	import { untrack } from "svelte";
	import SearchForm from "./SearchForm.svelte";
	import SearchStatus from "./SearchStatus.svelte";
	import SearchResults from "./SearchResults.svelte";
	import type {
		SearchMode,
		ParsedVibe,
		DomainResult,
		PricingSummary,
		TokenUsage,
		FollowupResponse,
		SSEStatusEvent,
		ResultsResponse,
	} from "./types.js";

	let { data }: { data: PageData } = $props();

	// Search mode
	let searchMode = $state<SearchMode>("vibe");

	// Form state
	let businessName = $state("");
	let domainIdea = $state("");
	let vibe = $state("professional");
	let keywords = $state("");
	let tldPreferences = $state<string[]>(["com", "co"]);
	const aiProvider = "openrouter";

	// Vibe mode state
	let vibeText = $state("");
	let isParsingVibe = $state(false);
	let parsedVibe = $state<ParsedVibe | null>(null);
	let pendingJobId = $state<string | null>(null);
	let vibeError = $state("");

	const vibeWordCount = $derived(vibeText.trim().split(/\s+/).filter(Boolean).length);

	// UI state
	let isSubmitting = $state(false);
	let isCancelling = $state(false);
	let isLoadingResults = $state(false);
	let isSubmittingFollowup = $state(false);
	let errorMessage = $state("");
	let currentJob = $state(untrack(() => data.currentJob));
	let jobResults = $state<DomainResult[]>([]);
	let pricingSummary = $state<PricingSummary | null>(null);
	let tokenUsage = $state<TokenUsage | null>(null);
	let followupQuiz = $state<FollowupResponse | null>(null);
	let followupAnswers = $state<Record<string, string | string[]>>({});
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let eventSource: EventSource | null = null;
	let useSSE = $state(true);

	// Timer state
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Expanded domains
	let expandedDomains = $state<Set<string>>(new Set());

	// TLD group expansion
	let expandedGroups = $state<Set<string>>(new Set(["classic", "tech"]));
	let diverseTlds = $state(false);

	// Derived
	const isFormDisabled = $derived(isSubmitting || currentJob?.status === "running");

	// --- TLD group handlers ---
	function toggleGroup(groupId: string) {
		const newSet = new Set(expandedGroups);
		if (newSet.has(groupId)) {
			newSet.delete(groupId);
		} else {
			newSet.add(groupId);
		}
		expandedGroups = newSet;
	}

	// TLD groups data (needed for select/deselect all)
	const tldGroupsData = [
		{ id: "classic", tlds: ["com", "net", "org"] },
		{ id: "tech", tlds: ["io", "dev", "app", "tech", "ai", "software"] },
		{ id: "creative", tlds: ["design", "studio", "space", "art", "gallery"] },
		{ id: "nature", tlds: ["garden", "earth", "green", "place", "life", "land"] },
		{ id: "business", tlds: ["co", "biz", "company", "agency", "consulting"] },
		{ id: "personal", tlds: ["me", "name", "blog", "page"] },
	];

	function selectAllInGroup(groupId: string) {
		const group = tldGroupsData.find((g) => g.id === groupId);
		if (!group) return;
		tldPreferences = [...new Set([...tldPreferences, ...group.tlds])];
	}

	function deselectAllInGroup(groupId: string) {
		const group = tldGroupsData.find((g) => g.id === groupId);
		if (!group) return;
		const groupTldSet = new Set(group.tlds);
		tldPreferences = tldPreferences.filter((t) => !groupTldSet.has(t));
	}

	function toggleTld(tld: string) {
		if (tldPreferences.includes(tld)) {
			tldPreferences = tldPreferences.filter((t) => t !== tld);
		} else {
			tldPreferences = [...tldPreferences, tld];
		}
	}

	// --- Search handlers ---
	async function startSearch() {
		if (!businessName.trim()) {
			errorMessage = "Business name is required";
			return;
		}

		isSubmitting = true;
		errorMessage = "";
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;

		try {
			const response = await fetch("/api/search/start", {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					business_name: businessName.trim(),
					domain_idea: domainIdea.trim() || null,
					vibe,
					keywords: keywords.trim() || null,
					tld_preferences: tldPreferences,
					diverse_tlds: diverseTlds,
					...(aiProvider !== "openrouter" && { ai_provider: aiProvider }),
				}),
			});

			const result = (await response.json()) as {
				success?: boolean;
				error?: string;
				job?: typeof currentJob;
			};

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				startMonitoring();
			} else {
				throw new Error(result.error || "Failed to start search");
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Failed to start search";
		} finally {
			isSubmitting = false;
		}
	}

	// --- Vibe mode handlers ---
	interface VibeErrorResponse {
		success: false;
		error: string;
		hint?: string;
		word_count?: number;
	}

	interface VibeSuccessResponse {
		success: true;
		job_id: string;
		status: string;
		parsed: ParsedVibe;
	}

	type VibeResponse = VibeErrorResponse | VibeSuccessResponse;

	async function submitVibe() {
		if (vibeWordCount < 5) {
			vibeError = `Please add more detail - we need at least 5 words. You have ${vibeWordCount}.`;
			return;
		}

		isParsingVibe = true;
		vibeError = "";
		parsedVibe = null;
		pendingJobId = null;

		try {
			const response = await fetch("/api/vibe", {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ vibe_text: vibeText.trim() }),
			});

			const result = (await response.json()) as VibeResponse;

			if (!response.ok || !result.success) {
				const errorResult = result as VibeErrorResponse;
				if (errorResult.error === "word_count_too_low") {
					vibeError = errorResult.hint || "Please add more detail.";
				} else if (errorResult.error === "parsing_failed") {
					vibeError =
						errorResult.hint ||
						"We couldn't understand that. Try adding more detail about your business.";
				} else {
					vibeError = errorResult.error || "Something went wrong. Please try again.";
				}
				return;
			}

			parsedVibe = result.parsed;
			pendingJobId = result.job_id;
		} catch (err) {
			vibeError = err instanceof Error ? err.message : "Failed to process your description";
		} finally {
			isParsingVibe = false;
		}
	}

	async function startSearchFromVibe() {
		if (!parsedVibe || !pendingJobId) return;

		isSubmitting = true;
		errorMessage = "";
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;

		try {
			const response = await fetch("/api/search/start", {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					business_name: parsedVibe.business_name,
					domain_idea: parsedVibe.domain_idea || null,
					vibe: parsedVibe.vibe,
					keywords: parsedVibe.keywords || null,
					tld_preferences: parsedVibe.tld_preferences,
					diverse_tlds: false,
					...(aiProvider !== "openrouter" && { ai_provider: aiProvider }),
				}),
			});

			const result = (await response.json()) as {
				success?: boolean;
				error?: string;
				job?: typeof currentJob;
			};

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				parsedVibe = null;
				pendingJobId = null;
				vibeText = "";
				startMonitoring();
			} else {
				throw new Error(result.error || "Failed to start search");
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Failed to start search";
		} finally {
			isSubmitting = false;
		}
	}

	function clearVibeResults() {
		parsedVibe = null;
		pendingJobId = null;
		vibeError = "";
	}

	function useExample(example: string) {
		vibeText = example;
		parsedVibe = null;
		pendingJobId = null;
		vibeError = "";
	}

	function startNewSearch() {
		currentJob = null;
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;
		followupAnswers = {};
		errorMessage = "";
		parsedVibe = null;
		pendingJobId = null;
		vibeError = "";
	}

	// --- Monitoring (SSE + polling) ---
	function startSSEStream() {
		if (!currentJob) return;
		if (eventSource) {
			eventSource.close();
		}

		try {
			eventSource = new EventSource(`/api/search/stream?job_id=${currentJob.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as SSEStatusEvent;
					if (data.event === "status" && currentJob) {
						currentJob = {
							...currentJob,
							status: data.status as typeof currentJob.status,
							batch_num: data.batch_num,
							domains_checked: data.domains_checked,
							domains_available: data.domains_available,
							good_results: data.good_results,
						};

						if (["complete", "failed", "cancelled", "needs_followup"].includes(data.status)) {
							stopSSE();
							stopTimer();
							handleJobComplete(data.status);
						}
					}
				} catch (err) {
					console.error("SSE parse error:", err);
				}
			};

			eventSource.onerror = () => {
				console.warn("SSE connection error, falling back to polling");
				stopSSE();
				useSSE = false;
				startPolling();
			};
		} catch (err) {
			console.error("Failed to start SSE:", err);
			useSSE = false;
			startPolling();
		}
	}

	function stopSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	async function handleJobComplete(status: string) {
		console.log(`[Frontend] Job completed with status: ${status}`);

		if (status === "complete" || status === "needs_followup") {
			console.log(`[Frontend] Fetching results for status: ${status}`);
			await fetchResults();
		}
		if (status === "needs_followup") {
			console.log(`[Frontend] Job needs followup, fetching quiz...`);
			await fetchFollowup();
		}
	}

	function startPolling() {
		if (pollingInterval) clearInterval(pollingInterval);

		pollingInterval = setInterval(async () => {
			if (!currentJob) return;

			try {
				const response = await fetch(`/api/search/status?job_id=${currentJob.id}`); // csrf-ok
				const result = (await response.json()) as { job?: typeof currentJob };

				if (response.ok && result.job) {
					currentJob = result.job;

					if (
						currentJob &&
						["complete", "failed", "cancelled", "needs_followup"].includes(currentJob.status)
					) {
						stopPolling();
						stopTimer();
						await handleJobComplete(currentJob.status);
					}
				}
			} catch (err) {
				console.error("Polling error:", err);
			}
		}, 2000);
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function startMonitoring() {
		if (useSSE) {
			startSSEStream();
		} else {
			startPolling();
		}
	}

	function stopMonitoring() {
		stopSSE();
		stopPolling();
	}

	// --- Results fetching ---
	async function fetchResults() {
		if (!currentJob) return;

		isLoadingResults = true;
		try {
			const response = await fetch(`/api/search/results?job_id=${currentJob.id}`); // csrf-ok
			if (response.ok) {
				const results = (await response.json()) as ResultsResponse;
				jobResults = results.domains || [];
				pricingSummary = results.pricing_summary || null;
				tokenUsage = results.usage || null;
			}
		} catch (err) {
			console.error("Failed to fetch results:", err);
		} finally {
			isLoadingResults = false;
		}
	}

	async function fetchFollowup() {
		if (!currentJob) {
			console.log(`[Frontend] No current job, skipping followup fetch`);
			return;
		}

		console.log(`[Frontend] Fetching followup quiz for job_id: ${currentJob.id}`);
		console.log(`[Frontend] Current job status: ${currentJob.status}`);

		try {
			const response = await fetch(`/api/search/followup?job_id=${currentJob.id}`); // csrf-ok
			console.log(`[Frontend] Followup response status: ${response.status}`);

			if (response.ok) {
				const data = (await response.json()) as { questions?: unknown };
				console.log(`[Frontend] Followup quiz data received:`, data);

				if (!data || !data.questions || !Array.isArray(data.questions)) {
					console.error(`[Frontend] Invalid followup quiz data structure:`, data);
					errorMessage = "Invalid followup quiz data received from server";
					return;
				}

				followupQuiz = data as FollowupResponse;

				followupQuiz.questions.forEach((q) => {
					if (q.default) {
						followupAnswers[q.id] = q.default;
					}
				});
				console.log(
					`[Frontend] Followup quiz loaded with ${followupQuiz.questions?.length || 0} questions`,
				);
			} else {
				const errorText = await response.text();
				console.error(`[Frontend] Followup API error: ${response.status} - ${errorText}`);
				errorMessage = `Failed to load followup quiz: ${errorText}`;
			}
		} catch (err) {
			console.error("[Frontend] Failed to fetch followup:", err);
			errorMessage = err instanceof Error ? err.message : "Failed to load followup quiz";
		}
	}

	async function submitFollowup() {
		if (!currentJob || !followupQuiz) return;

		console.log(`[Frontend] Submitting followup answers for job_id: ${currentJob.id}`);
		console.log(`[Frontend] Followup answers:`, followupAnswers);

		isSubmittingFollowup = true;
		errorMessage = "";

		try {
			const response = await fetch(`/api/search/resume?job_id=${currentJob.id}`, {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ followup_responses: followupAnswers }),
			});

			console.log(`[Frontend] Resume search response status: ${response.status}`);

			if (response.ok) {
				console.log(`[Frontend] Successfully resumed search`);
				const result = await response.json();
				console.log(`[Frontend] Resume result:`, result);

				followupQuiz = null;
				followupAnswers = {};

				currentJob = { ...currentJob, status: "running" };
				startMonitoring();
				startTimer();
			} else {
				const errorText = await response.text();
				console.error(`[Frontend] Resume search API error: ${response.status} - ${errorText}`);
				errorMessage = `Failed to resume search: ${errorText}`;
			}
		} catch (err) {
			console.error("Failed to resume search:", err);
			errorMessage = err instanceof Error ? err.message : "Failed to resume search";
		} finally {
			isSubmittingFollowup = false;
		}
	}

	async function cancelSearch() {
		if (!currentJob) return;

		isCancelling = true;
		try {
			const response = await fetch("/api/search/cancel", {
				// csrf-ok
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ job_id: currentJob.id }),
			});

			if (response.ok) {
				currentJob = { ...currentJob, status: "cancelled", error: "Cancelled by user" };
				stopMonitoring();
				stopTimer();
			}
		} catch (err) {
			console.error("Cancel error:", err);
		} finally {
			isCancelling = false;
		}
	}

	// --- Timer ---
	function startTimer() {
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

	function toggleExpanded(domain: string) {
		const newSet = new Set(expandedDomains);
		if (newSet.has(domain)) {
			newSet.delete(domain);
		} else {
			newSet.add(domain);
		}
		expandedDomains = newSet;
	}

	// Start monitoring and timer if there's an active job
	$effect(() => {
		if (currentJob && (currentJob.status === "running" || currentJob.status === "pending")) {
			startMonitoring();
			startTimer();
		} else {
			stopTimer();
		}
		return () => {
			stopMonitoring();
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
		<h1 class="text-2xl font-serif text-bark dark:text-foreground">Domain Searcher</h1>
		<p class="text-foreground-muted font-sans mt-1">
			AI-powered domain discovery with live pricing
		</p>
	</div>

	<div class="grid lg:grid-cols-2 gap-8">
		<!-- Search Form -->
		<SearchForm
			{searchMode}
			{isFormDisabled}
			{errorMessage}
			{vibeText}
			{isParsingVibe}
			{parsedVibe}
			{vibeWordCount}
			{vibeError}
			{isSubmitting}
			{businessName}
			{domainIdea}
			{vibe}
			{keywords}
			{tldPreferences}
			{diverseTlds}
			{expandedGroups}
			currentJobStatus={currentJob?.status ?? null}
			onSearchModeChange={(mode) => (searchMode = mode)}
			onVibeTextChange={(v) => (vibeText = v)}
			onSubmitVibe={submitVibe}
			onClearVibeResults={clearVibeResults}
			onUseExample={useExample}
			onStartSearchFromVibe={startSearchFromVibe}
			onParsedVibeChange={(v) => (parsedVibe = v)}
			onBusinessNameChange={(v) => (businessName = v)}
			onDomainIdeaChange={(v) => (domainIdea = v)}
			onVibeChange={(v) => (vibe = v)}
			onKeywordsChange={(v) => (keywords = v)}
			onToggleTld={toggleTld}
			onToggleGroup={toggleGroup}
			onSelectAllInGroup={selectAllInGroup}
			onDeselectAllInGroup={deselectAllInGroup}
			onDiverseTldsChange={(v) => (diverseTlds = v)}
			onStartSearch={startSearch}
			onStartNewSearch={startNewSearch}
		/>

		<!-- Status + Results Column -->
		<div class="space-y-6">
			<SearchStatus
				{currentJob}
				{elapsedSeconds}
				{isCancelling}
				{followupQuiz}
				{followupAnswers}
				{isSubmittingFollowup}
				{pricingSummary}
				{tokenUsage}
				onCancel={cancelSearch}
				onSubmitFollowup={submitFollowup}
				onFollowupAnswerChange={(qId, val) => (followupAnswers[qId] = val)}
			/>

			{#if currentJob}
				<SearchResults
					results={jobResults}
					isLoading={isLoadingResults}
					jobStatus={currentJob.status}
					{expandedDomains}
					onToggleExpanded={toggleExpanded}
				/>
			{/if}
		</div>
	</div>
</div>
