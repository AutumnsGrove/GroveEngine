<script lang="ts">
	// SearchForm.svelte
	// Search input form — vibe mode and detailed mode, with TLD selection

	import { GlassCard } from "@autumnsgrove/lattice/ui";

	// Types shared with parent
	import type { SearchMode, VibeOptions, TldGroup, ParsedVibe } from "./types.js";

	interface Props {
		searchMode: SearchMode;
		isFormDisabled: boolean;
		errorMessage: string;
		// Vibe mode
		vibeText: string;
		isParsingVibe: boolean;
		parsedVibe: ParsedVibe | null;
		vibeWordCount: number;
		vibeError: string;
		isSubmitting: boolean;
		// Detailed mode
		businessName: string;
		domainIdea: string;
		vibe: string;
		keywords: string;
		tldPreferences: string[];
		diverseTlds: boolean;
		expandedGroups: Set<string>;
		// Callbacks
		currentJobStatus: string | null;
		onSearchModeChange: (mode: SearchMode) => void;
		onVibeTextChange: (value: string) => void;
		onSubmitVibe: () => void;
		onClearVibeResults: () => void;
		onUseExample: (example: string) => void;
		onStartSearchFromVibe: () => void;
		onParsedVibeChange: (vibe: ParsedVibe) => void;
		onBusinessNameChange: (value: string) => void;
		onDomainIdeaChange: (value: string) => void;
		onVibeChange: (value: string) => void;
		onKeywordsChange: (value: string) => void;
		onToggleTld: (tld: string) => void;
		onToggleGroup: (groupId: string) => void;
		onSelectAllInGroup: (groupId: string) => void;
		onDeselectAllInGroup: (groupId: string) => void;
		onDiverseTldsChange: (value: boolean) => void;
		onStartSearch: () => void;
		onStartNewSearch: () => void;
	}

	let {
		searchMode,
		isFormDisabled,
		errorMessage,
		vibeText,
		isParsingVibe,
		parsedVibe,
		vibeWordCount,
		vibeError,
		isSubmitting,
		businessName,
		domainIdea,
		vibe,
		keywords,
		tldPreferences,
		diverseTlds,
		expandedGroups,
		currentJobStatus,
		onSearchModeChange,
		onVibeTextChange,
		onSubmitVibe,
		onClearVibeResults,
		onUseExample,
		onStartSearchFromVibe,
		onParsedVibeChange,
		onBusinessNameChange,
		onDomainIdeaChange,
		onVibeChange,
		onKeywordsChange,
		onToggleTld,
		onToggleGroup,
		onSelectAllInGroup,
		onDeselectAllInGroup,
		onDiverseTldsChange,
		onStartSearch,
		onStartNewSearch,
	}: Props = $props();

	const vibeOptions: VibeOptions[] = [
		{ value: "professional", label: "Professional" },
		{ value: "creative", label: "Creative" },
		{ value: "minimal", label: "Minimal" },
		{ value: "bold", label: "Bold" },
		{ value: "personal", label: "Personal" },
		{ value: "playful", label: "Playful" },
		{ value: "tech", label: "Tech-focused" },
	];

	const vibeExamples = [
		"A modern tech startup called Quantum Labs focusing on AI and machine learning",
		"Cozy coffee shop called Morning Bloom with artisan, local, and organic vibes",
		"Freelance graphic designer Jane Smith, creative and minimal aesthetic",
	];

	const tldGroups: TldGroup[] = [
		{
			id: "classic",
			label: "Classic",
			description: "Traditional and widely recognized",
			tlds: [
				{ value: "com", label: ".com" },
				{ value: "net", label: ".net" },
				{ value: "org", label: ".org" },
			],
		},
		{
			id: "tech",
			label: "Tech",
			description: "Perfect for startups and developers",
			tlds: [
				{ value: "io", label: ".io" },
				{ value: "dev", label: ".dev" },
				{ value: "app", label: ".app" },
				{ value: "tech", label: ".tech" },
				{ value: "ai", label: ".ai" },
				{ value: "software", label: ".software" },
			],
		},
		{
			id: "creative",
			label: "Creative",
			description: "For designers, artists, and makers",
			tlds: [
				{ value: "design", label: ".design" },
				{ value: "studio", label: ".studio" },
				{ value: "space", label: ".space" },
				{ value: "art", label: ".art" },
				{ value: "gallery", label: ".gallery" },
			],
		},
		{
			id: "nature",
			label: "Nature",
			description: "Earthy and organic vibes",
			tlds: [
				{ value: "garden", label: ".garden" },
				{ value: "earth", label: ".earth" },
				{ value: "green", label: ".green" },
				{ value: "place", label: ".place" },
				{ value: "life", label: ".life" },
				{ value: "land", label: ".land" },
			],
		},
		{
			id: "business",
			label: "Business",
			description: "Professional and corporate",
			tlds: [
				{ value: "co", label: ".co" },
				{ value: "biz", label: ".biz" },
				{ value: "company", label: ".company" },
				{ value: "agency", label: ".agency" },
				{ value: "consulting", label: ".consulting" },
			],
		},
		{
			id: "personal",
			label: "Personal",
			description: "Great for personal brands",
			tlds: [
				{ value: "me", label: ".me" },
				{ value: "name", label: ".name" },
				{ value: "blog", label: ".blog" },
				{ value: "page", label: ".page" },
			],
		},
	];

	const aiProviderInfo = {
		provider: "OpenRouter",
		model: "DeepSeek v3.2",
		description: "Zero data retention, great quality, low cost",
	};

	function getSelectedCountInGroup(groupId: string): number {
		const group = tldGroups.find((g) => g.id === groupId);
		if (!group) return 0;
		return group.tlds.filter((t) => tldPreferences.includes(t.value)).length;
	}
</script>

<GlassCard class="p-4 sm:p-6">
	<div class="flex items-center justify-between mb-4 sm:mb-6">
		<h2 class="font-serif text-base sm:text-lg text-bark dark:text-foreground">New Search</h2>
		{#if currentJobStatus && !["running", "pending"].includes(currentJobStatus)}
			<button
				type="button"
				onclick={onStartNewSearch}
				class="text-sm font-sans text-domain-600 hover:text-domain-700"
			>
				Clear & Start New
			</button>
		{/if}
	</div>

	<!-- Search Mode Tabs -->
	<div class="flex gap-1 p-1 bg-bark/5 rounded-lg mb-6">
		<button
			type="button"
			onclick={() => onSearchModeChange("vibe")}
			class="flex-1 px-4 py-2 text-sm font-sans font-medium rounded-md transition-all {searchMode ===
			'vibe'
				? 'bg-surface-elevated dark:bg-card text-bark dark:text-foreground shadow-sm'
				: 'text-foreground-muted hover:text-foreground'}"
			disabled={isFormDisabled}
		>
			Vibe Mode
		</button>
		<button
			type="button"
			onclick={() => onSearchModeChange("detailed")}
			class="flex-1 px-4 py-2 text-sm font-sans font-medium rounded-md transition-all {searchMode ===
			'detailed'
				? 'bg-surface-elevated dark:bg-card text-bark dark:text-foreground shadow-sm'
				: 'text-foreground-muted hover:text-foreground'}"
			disabled={isFormDisabled}
		>
			Detailed
		</button>
	</div>

	{#if errorMessage}
		<div class="mb-4 bg-surface-subtle border border-error text-error px-4 py-3 rounded-lg">
			<p class="text-sm font-sans">{errorMessage}</p>
		</div>
	{/if}

	<!-- Vibe Mode -->
	{#if searchMode === "vibe"}
		<div class="space-y-4">
			{#if !parsedVibe}
				<!-- Vibe Input Form -->
				<div>
					<label
						for="vibe_text"
						class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2"
					>
						Describe your business or project
					</label>
					<textarea
						id="vibe_text"
						value={vibeText}
						oninput={(e) => onVibeTextChange(e.currentTarget.value)}
						placeholder="Tell us about your business in a few sentences... What's it called? What does it do? What vibe are you going for?"
						class="input-field min-h-[120px] resize-y"
						disabled={isParsingVibe || isFormDisabled}
					></textarea>

					<!-- Word count indicator -->
					<div class="flex items-center justify-between mt-2">
						<span
							class="text-xs font-sans {vibeWordCount >= 5
								? 'text-grove-600'
								: 'text-foreground-subtle'}"
						>
							{vibeWordCount} word{vibeWordCount === 1 ? "" : "s"}
							{#if vibeWordCount < 5}
								<span class="text-foreground-faint">· need {5 - vibeWordCount} more</span>
							{:else}
								<span class="text-grove-500">· ready!</span>
							{/if}
						</span>
						{#if vibeText.length > 0}
							<button
								type="button"
								onclick={() => {
									onVibeTextChange("");
								}}
								class="text-xs text-foreground-faint hover:text-foreground-muted font-sans"
								disabled={isParsingVibe}
							>
								Clear
							</button>
						{/if}
					</div>
				</div>

				<!-- Error message -->
				{#if vibeError}
					<div class="bg-surface-subtle border border-warning text-warning px-4 py-3 rounded-lg">
						<p class="text-sm font-sans">{vibeError}</p>
					</div>
				{/if}

				<!-- Example prompts -->
				<div class="pt-2">
					<p class="text-xs font-sans text-foreground-subtle mb-2">Try an example:</p>
					<div class="flex flex-col gap-2">
						{#each vibeExamples as example}
							<button
								type="button"
								onclick={() => onUseExample(example)}
								class="text-left px-3 py-2 text-sm font-sans text-foreground-muted bg-bark/5 hover:bg-bark/10 dark:hover:bg-surface-hover rounded-lg transition-colors line-clamp-2"
								disabled={isParsingVibe || isFormDisabled}
							>
								"{example}"
							</button>
						{/each}
					</div>
				</div>

				<!-- Submit button -->
				<button
					type="button"
					onclick={onSubmitVibe}
					class="btn-primary w-full flex items-center justify-center gap-2"
					disabled={isParsingVibe || vibeWordCount < 5 || isFormDisabled}
				>
					{#if isParsingVibe}
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
						Understanding your vibe...
					{:else}
						Find Domains
					{/if}
				</button>
			{:else}
				<!-- Parsed Results - Editable -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-sans font-medium text-bark dark:text-foreground">
							Here's what we understood:
						</h3>
						<button
							type="button"
							onclick={onClearVibeResults}
							class="text-xs text-foreground-subtle hover:text-foreground-muted font-sans"
						>
							Start over
						</button>
					</div>

					<div class="bg-grove-50 border border-grove-200 rounded-lg p-4 space-y-3">
						<!-- Business Name -->
						<div>
							<label
								for="business_name_parsed"
								class="block text-xs font-sans text-foreground-muted mb-1">Business Name</label
							>
							<input
								id="business_name_parsed"
								type="text"
								value={parsedVibe.business_name}
								oninput={(e) =>
									onParsedVibeChange({ ...parsedVibe, business_name: e.currentTarget.value })}
								class="input-field text-sm"
								disabled={isSubmitting}
							/>
						</div>

						<!-- Vibe -->
						<div>
							<label for="vibe_parsed" class="block text-xs font-sans text-foreground-muted mb-1"
								>Vibe</label
							>
							<select
								id="vibe_parsed"
								value={parsedVibe.vibe}
								onchange={(e) => onParsedVibeChange({ ...parsedVibe, vibe: e.currentTarget.value })}
								class="input-field text-sm"
								disabled={isSubmitting}
							>
								{#each vibeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Keywords -->
						<div>
							<label
								for="keywords_parsed"
								class="block text-xs font-sans text-foreground-muted mb-1">Keywords</label
							>
							<input
								id="keywords_parsed"
								type="text"
								value={parsedVibe.keywords}
								oninput={(e) =>
									onParsedVibeChange({ ...parsedVibe, keywords: e.currentTarget.value })}
								placeholder="comma, separated, keywords"
								class="input-field text-sm"
								disabled={isSubmitting}
							/>
						</div>

						<!-- Domain Idea -->
						<div>
							<label
								for="domain_idea_parsed"
								class="block text-xs font-sans text-foreground-muted mb-1"
								>Domain Idea (optional)</label
							>
							<input
								id="domain_idea_parsed"
								type="text"
								value={parsedVibe.domain_idea || ""}
								oninput={(e) =>
									onParsedVibeChange({ ...parsedVibe, domain_idea: e.currentTarget.value || null })}
								placeholder="e.g., mybusiness.com"
								class="input-field text-sm"
								disabled={isSubmitting}
							/>
						</div>

						<!-- TLD Preferences -->
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-xs font-sans text-foreground-muted mb-1"
								>TLD Preferences</label
							>
							<div class="flex flex-wrap gap-1.5">
								{#each ["com", "co", "io", "dev", "app", "net", "org", "ai", "studio", "design", "place"] as tld}
									<button
										type="button"
										onclick={() => {
											if (!parsedVibe) return;
											if (parsedVibe.tld_preferences.includes(tld)) {
												onParsedVibeChange({
													...parsedVibe,
													tld_preferences: parsedVibe.tld_preferences.filter((t) => t !== tld),
												});
											} else {
												onParsedVibeChange({
													...parsedVibe,
													tld_preferences: [...parsedVibe.tld_preferences, tld],
												});
											}
										}}
										class="px-2 py-1 rounded-full text-xs font-sans transition-colors {parsedVibe.tld_preferences.includes(
											tld,
										)
											? 'bg-domain-100 text-domain-700 border border-domain-300'
											: 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-surface-hover'}"
										disabled={isSubmitting}
									>
										.{tld}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- AI Provider Info (locked) -->
					<div class="bg-grove-50 border border-grove-200 rounded-lg p-3">
						<div class="text-xs font-sans text-foreground-muted mb-1">AI Model</div>
						<div class="text-sm font-sans text-bark dark:text-foreground font-medium">
							{aiProviderInfo.model} via {aiProviderInfo.provider}
						</div>
						<div class="text-xs font-sans text-foreground-subtle mt-1">
							{aiProviderInfo.description}
						</div>
					</div>

					<!-- Start Search button -->
					<button
						type="button"
						onclick={onStartSearchFromVibe}
						class="btn-primary w-full flex items-center justify-center gap-2"
						disabled={isSubmitting || !parsedVibe.business_name.trim()}
					>
						{#if isSubmitting}
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
							Starting Search...
						{:else}
							Start Domain Search
						{/if}
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Detailed Mode (original form) -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				onStartSearch();
			}}
			class="space-y-6"
		>
			<!-- Business Name -->
			<div>
				<label
					for="business_name"
					class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2"
				>
					Business / Project Name *
				</label>
				<input
					id="business_name"
					type="text"
					value={businessName}
					oninput={(e) => onBusinessNameChange(e.currentTarget.value)}
					placeholder="e.g., Sunrise Bakery"
					class="input-field"
					required
					disabled={isFormDisabled}
				/>
			</div>

			<!-- Domain Idea -->
			<div>
				<label
					for="domain_idea"
					class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2"
				>
					Domain Idea (optional)
				</label>
				<input
					id="domain_idea"
					type="text"
					value={domainIdea}
					oninput={(e) => onDomainIdeaChange(e.currentTarget.value)}
					placeholder="e.g., sunrisebakery.com"
					class="input-field"
					disabled={isFormDisabled}
				/>
				<p class="mt-1 text-xs text-foreground-subtle font-sans">
					If you have a specific domain in mind, we'll check it and find similar alternatives
				</p>
			</div>

			<!-- Vibe -->
			<div>
				<label
					for="vibe-select"
					class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2"
				>
					Brand Vibe
				</label>
				<select
					id="vibe-select"
					value={vibe}
					onchange={(e) => onVibeChange(e.currentTarget.value)}
					class="input-field"
					disabled={isFormDisabled}
				>
					{#each vibeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- TLD Preferences - Grouped -->
			<div>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2">
					Preferred TLDs
				</label>
				<div class="space-y-2 border border-grove-200 rounded-lg overflow-hidden">
					{#each tldGroups as group}
						{@const isExpanded = expandedGroups.has(group.id)}
						{@const selectedCount = getSelectedCountInGroup(group.id)}
						<div class="border-b border-grove-100 last:border-b-0">
							<!-- Group Header -->
							<button
								type="button"
								onclick={() => onToggleGroup(group.id)}
								disabled={isFormDisabled}
								class="w-full px-3 py-2 flex items-center justify-between bg-grove-50 hover:bg-grove-100 transition-colors disabled:opacity-50"
							>
								<div class="flex items-center gap-2">
									<svg
										class="w-4 h-4 text-foreground-subtle transition-transform {isExpanded
											? 'rotate-90'
											: ''}"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="font-sans font-medium text-bark dark:text-foreground text-sm"
										>{group.label}</span
									>
									<span class="text-xs text-foreground-subtle font-sans">{group.description}</span>
								</div>
								{#if selectedCount > 0}
									<span
										class="px-2 py-0.5 text-xs font-sans bg-domain-100 text-domain-700 rounded-full"
									>
										{selectedCount} selected
									</span>
								{/if}
							</button>

							<!-- Group Content -->
							{#if isExpanded}
								<div class="px-3 py-2 bg-surface-elevated">
									<div class="flex items-center justify-between mb-2">
										<div class="flex gap-2">
											<button
												type="button"
												onclick={() => onSelectAllInGroup(group.id)}
												disabled={isFormDisabled}
												class="text-xs text-domain-600 hover:text-domain-700 font-sans disabled:opacity-50"
											>
												Select all
											</button>
											<span class="text-foreground-faint">|</span>
											<button
												type="button"
												onclick={() => onDeselectAllInGroup(group.id)}
												disabled={isFormDisabled}
												class="text-xs text-foreground-subtle hover:text-foreground-muted font-sans disabled:opacity-50"
											>
												Clear
											</button>
										</div>
									</div>
									<div class="flex flex-wrap gap-1.5">
										{#each group.tlds as tld}
											<button
												type="button"
												onclick={() => onToggleTld(tld.value)}
												class="px-2.5 py-1 rounded-full text-xs font-sans transition-colors {tldPreferences.includes(
													tld.value,
												)
													? 'bg-domain-100 text-domain-700 border border-domain-300'
													: 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-surface-hover'}"
												disabled={isFormDisabled}
											>
												{tld.label}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Diverse TLDs Toggle -->
				<div class="flex items-center justify-between mt-3 pt-3 border-t border-grove-100">
					<div>
						<span class="text-sm font-sans font-medium text-bark dark:text-foreground"
							>Diverse TLDs</span
						>
						<p class="text-xs text-foreground-subtle font-sans">
							Encourage variety in TLD suggestions
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={diverseTlds}
						aria-label="Toggle diverse TLDs"
						onclick={() => onDiverseTldsChange(!diverseTlds)}
						disabled={isFormDisabled}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 {diverseTlds
							? 'bg-domain-600'
							: 'bg-bark/20'}"
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-surface-elevated shadow transition-transform {diverseTlds
								? 'translate-x-6'
								: 'translate-x-1'}"
						></span>
					</button>
				</div>
			</div>

			<!-- Keywords -->
			<div>
				<label
					for="keywords"
					class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2"
				>
					Keywords (optional)
				</label>
				<input
					id="keywords"
					type="text"
					value={keywords}
					oninput={(e) => onKeywordsChange(e.currentTarget.value)}
					placeholder="e.g., artisan, local, organic"
					class="input-field"
					disabled={isFormDisabled}
				/>
			</div>

			<!-- AI Provider Info (locked) -->
			<div>
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="block text-sm font-sans font-medium text-bark dark:text-foreground mb-2">
					AI Model
				</label>
				<div class="card p-4 bg-grove-50">
					<div class="text-base font-sans text-bark dark:text-foreground font-medium">
						{aiProviderInfo.model} via {aiProviderInfo.provider}
					</div>
					<p class="mt-1 text-sm text-foreground-muted font-sans">
						{aiProviderInfo.description}
					</p>
				</div>
			</div>

			<!-- Submit -->
			<button
				type="submit"
				class="btn-primary w-full flex items-center justify-center gap-2"
				disabled={isSubmitting || !businessName.trim() || currentJobStatus === "running"}
			>
				{#if isSubmitting}
					<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Starting Search...
				{:else if currentJobStatus === "running"}
					<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Search in Progress...
				{:else}
					Start Domain Search
				{/if}
			</button>
		</form>
	{/if}
</GlassCard>
