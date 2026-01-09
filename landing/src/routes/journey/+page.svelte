<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import {
		Tag, Sprout, ChevronDown, Sparkles, Wrench,
		Grid3X3, Heart, Bell, Leaf, Image, BarChart3,
		Users, Search, Accessibility, Activity, Globe,
		GitCommit, GitBranch, Box
	} from 'lucide-svelte';
	import type { FormattedRepoStats, FormattedActivityEvent } from '$lib/ecosystem/types';

	let { data } = $props();

	// Icon mapping for ecosystem repos
	const iconMap: Record<string, typeof Grid3X3> = {
		Grid3X3, Heart, Bell, Leaf, Image, BarChart3,
		Users, Search, Accessibility, Activity, Globe, Box
	};

	function getIcon(iconName: string) {
		return iconMap[iconName] || Box;
	}

	// Get summary for a version label
	function getSummary(label: string) {
		return data.summaries[label] || null;
	}

	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	function getGrowthIcon(value: number): string {
		if (value > 0) return '↑';
		if (value < 0) return '↓';
		return '→';
	}

	// Ecosystem helpers
	function getCommitTypeLabel(type: string | null): string {
		const labels: Record<string, string> = {
			feat: 'Feature',
			fix: 'Fix',
			docs: 'Docs',
			refactor: 'Refactor',
			test: 'Test',
			chore: 'Chore',
			perf: 'Perf',
		};
		return type ? labels[type] || type : 'Commit';
	}

	function getCommitTypeColor(type: string | null): string {
		const colors: Record<string, string> = {
			feat: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
			fix: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
			docs: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
			refactor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
			test: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
			chore: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
			perf: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
		};
		return type ? colors[type] || colors.chore : colors.chore;
	}

	// Filter active view for ecosystem
	let ecosystemView = $state<'overview' | 'activity'>('overview');

	// Calculate percentages for the language bar
	const languageBreakdown = $derived(() => {
		if (!data.latest) return [];
		const total = data.latest.totalCodeLines;
		if (total === 0) return [];
		return [
			{ name: 'Svelte', lines: data.latest.svelteLines, color: 'bg-orange-500', pct: Math.round((data.latest.svelteLines / total) * 100) },
			{ name: 'TypeScript', lines: data.latest.tsLines, color: 'bg-blue-500', pct: Math.round((data.latest.tsLines / total) * 100) },
			{ name: 'JavaScript', lines: data.latest.jsLines, color: 'bg-yellow-500', pct: Math.round((data.latest.jsLines / total) * 100) },
			{ name: 'CSS', lines: data.latest.cssLines, color: 'bg-pink-500', pct: Math.round((data.latest.cssLines / total) * 100) }
		];
	});

	// Get max values for chart scaling
	const maxCodeLines = $derived(
		data.snapshots.length > 0
			? Math.max(...data.snapshots.map((s: any) => s.totalCodeLines))
			: 0
	);

	// Filter milestones to only show version releases
	const milestones = $derived(
		data.snapshots.filter((s: any) => s.label.startsWith('v'))
	);

	// Calculate language breakdown for a given snapshot
	function getSnapshotBreakdown(snapshot: any) {
		const total = snapshot.totalCodeLines;
		if (total === 0) return [];
		return [
			{ name: 'Svelte', pct: Math.round((snapshot.svelteLines / total) * 100), color: 'bg-orange-500' },
			{ name: 'TypeScript', pct: Math.round((snapshot.tsLines / total) * 100), color: 'bg-blue-500' },
			{ name: 'JavaScript', pct: Math.round((snapshot.jsLines / total) * 100), color: 'bg-yellow-500' },
			{ name: 'CSS', pct: Math.round((snapshot.cssLines / total) * 100), color: 'bg-pink-500' }
		];
	}

	// Calculate TypeScript percentage for a snapshot (TS vs JS only)
	function getTsPercentage(snapshot: any): number {
		const scriptLines = snapshot.tsLines + snapshot.jsLines;
		if (scriptLines === 0) return 0;
		return Math.round((snapshot.tsLines / scriptLines) * 100);
	}

	// Get max doc words for chart scaling
	const maxDocWords = $derived(
		data.snapshots.length > 0
			? Math.max(...data.snapshots.map((s: any) => s.docWords))
			: 0
	);

	// Calculate code-to-docs ratio (lines of code per 100 words of docs)
	function getCodeToDocsRatio(snapshot: any): number {
		if (snapshot.docWords === 0) return 0;
		return Math.round((snapshot.totalCodeLines / snapshot.docWords) * 100) / 100;
	}

	// Get first and latest TS percentages for migration stats
	const tsProgression = $derived(() => {
		if (data.snapshots.length < 2) return null;
		const first = data.snapshots[0];
		const latest = data.snapshots[data.snapshots.length - 1];
		return {
			startPct: getTsPercentage(first),
			currentPct: getTsPercentage(latest),
			startLabel: first.label,
			currentLabel: latest.label,
			growth: getTsPercentage(latest) - getTsPercentage(first)
		};
	});
</script>

<SEO
	title="The Journey — Grove"
	description="Watch Grove grow. A visual timeline of our codebase evolution, one commit at a time."
	url="/journey"
/>

<main class="min-h-screen flex flex-col">
	<Header />

	<article class="flex-1 px-6 py-12">
		<div class="max-w-4xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<p class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-3">Building in Public</p>
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">The Journey</h1>
				<p class="text-foreground-muted font-sans text-lg max-w-xl mx-auto">
					Every tree starts as a seed. Watch Grove grow from its first commit to the forest it's becoming.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-divider"></div>
					<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			<!-- Ecosystem Overview -->
			{#if data.ecosystem.summary || data.ecosystem.repos.length > 0}
			<section class="mb-16">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide">The Grove Ecosystem</h2>
					<div class="flex gap-2">
						<button
							onclick={() => ecosystemView = 'overview'}
							class="px-3 py-1 text-xs font-sans rounded-full transition-colors {ecosystemView === 'overview' ? 'bg-accent text-accent-foreground' : 'text-foreground-muted hover:text-foreground'}"
						>
							Overview
						</button>
						<button
							onclick={() => ecosystemView = 'activity'}
							class="px-3 py-1 text-xs font-sans rounded-full transition-colors {ecosystemView === 'activity' ? 'bg-accent text-accent-foreground' : 'text-foreground-muted hover:text-foreground'}"
						>
							Activity
						</button>
					</div>
				</div>

				{#if ecosystemView === 'overview'}
					<!-- Ecosystem Summary Stats -->
					{#if data.ecosystem.summary}
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<div class="card p-4 text-center">
							<div class="text-2xl font-serif text-accent-muted">{data.ecosystem.summary.active_repos}</div>
							<div class="text-xs text-foreground-muted font-sans">Active Repos</div>
						</div>
						<div class="card p-4 text-center">
							<div class="text-2xl font-serif text-accent-muted">{formatNumber(data.ecosystem.summary.total_commits)}</div>
							<div class="text-xs text-foreground-muted font-sans">Total Commits</div>
						</div>
						<div class="card p-4 text-center">
							<div class="text-2xl font-serif text-accent-muted">{formatNumber(data.ecosystem.summary.commits_last_30_days)}</div>
							<div class="text-xs text-foreground-muted font-sans">Last 30 Days</div>
						</div>
						<div class="card p-4 text-center">
							<div class="text-2xl font-serif text-accent-muted">{data.ecosystem.summary.total_releases}</div>
							<div class="text-xs text-foreground-muted font-sans">Releases</div>
						</div>
					</div>
					{/if}

					<!-- Repo Grid -->
					<div class="grid md:grid-cols-2 gap-4">
						{#each data.ecosystem.repos as repo}
							{@const IconComponent = getIcon(repo.icon)}
							<div class="card p-4 flex items-start gap-4">
								<div class="w-10 h-10 rounded-lg {repo.color} flex items-center justify-center flex-shrink-0">
									<IconComponent class="w-5 h-5 text-white" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between gap-2 mb-1">
										<h3 class="font-sans font-medium text-foreground truncate">{repo.name}</h3>
										{#if repo.isActive}
											<span class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active"></span>
										{:else}
											<span class="flex-shrink-0 w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" title="Inactive"></span>
										{/if}
									</div>
									<p class="text-xs text-foreground-muted mb-2 line-clamp-1">{repo.description}</p>
									<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-faint font-mono">
										<span>{repo.totalCommits} commits</span>
										{#if repo.totalReleases > 0}
											<span>{repo.totalReleases} releases</span>
										{/if}
										{#if repo.commitsLast7Days > 0}
											<span class="text-green-600 dark:text-green-400">+{repo.commitsLast7Days} this week</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Empty State -->
					{#if data.ecosystem.repos.length === 0}
					<div class="card p-8 text-center">
						<GitBranch class="w-8 h-8 mx-auto text-foreground-faint mb-3" />
						<p class="text-foreground-muted font-sans text-sm">
							Ecosystem data is being collected. Check back soon.
						</p>
					</div>
					{/if}

				{:else}
					<!-- Activity Feed -->
					<div class="space-y-3">
						{#each data.ecosystem.recentActivity.slice(0, 20) as event}
							<div class="card p-3 flex items-start gap-3">
								<!-- Event Type Icon -->
								<div class="w-8 h-8 rounded-lg {event.color} flex items-center justify-center flex-shrink-0 opacity-80">
									{#if event.eventType === 'release'}
										<Tag class="w-4 h-4 text-white" />
									{:else}
										<GitCommit class="w-4 h-4 text-white" />
									{/if}
								</div>

								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-0.5">
										<span class="text-xs font-medium text-foreground-muted">{event.repoName}</span>
										{#if event.commitType}
											<span class="px-1.5 py-0.5 text-[10px] font-sans rounded {getCommitTypeColor(event.commitType)}">
												{getCommitTypeLabel(event.commitType)}
											</span>
										{:else if event.eventType === 'release'}
											<span class="px-1.5 py-0.5 text-[10px] font-sans rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
												Release
											</span>
										{/if}
									</div>
									<p class="text-sm text-foreground font-sans truncate">{event.title}</p>
									<div class="flex items-center gap-2 mt-1">
										{#if event.authorLogin}
											<span class="text-xs text-foreground-faint">{event.authorLogin}</span>
										{/if}
										<span class="text-xs text-foreground-faint">{event.formattedDate}</span>
									</div>
								</div>

								{#if event.url}
									<a
										href={event.url}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="View on GitHub"
										class="flex-shrink-0 text-foreground-faint hover:text-accent transition-colors"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								{/if}
							</div>
						{/each}

						{#if data.ecosystem.recentActivity.length === 0}
						<div class="card p-8 text-center">
							<Activity class="w-8 h-8 mx-auto text-foreground-faint mb-3" />
							<p class="text-foreground-muted font-sans text-sm">
								No recent activity yet. Activity will appear here as commits are made.
							</p>
						</div>
						{/if}
					</div>
				{/if}

				<!-- Last Sync -->
				{#if data.ecosystem.lastSyncAt}
				<p class="text-xs text-foreground-faint text-center mt-4 font-sans">
					Last synced: {new Date(data.ecosystem.lastSyncAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
				</p>
				{/if}
			</section>

			<!-- Divider -->
			<div class="flex items-center justify-center gap-4 mb-16">
				<div class="w-12 h-px bg-divider"></div>
				<Sprout class="w-4 h-4 text-accent-subtle" />
				<div class="w-12 h-px bg-divider"></div>
			</div>
			{/if}

			{#if data.latest}
			<!-- Current Stats Grid -->
			<section class="mb-16">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Current Growth</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.totalCodeLines)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Lines of Code</div>
						{#if data.growth}
							<div class="text-xs text-foreground-faint mt-2 font-sans">
								{getGrowthIcon(data.growth.codeLines)} {formatNumber(Math.abs(data.growth.codeLines))} since start
							</div>
						{/if}
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.docWords)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Words of Docs</div>
						{#if data.growth}
							<div class="text-xs text-foreground-faint mt-2 font-sans">
								~{Math.round(data.latest.docWords / 500)} pages
							</div>
						{/if}
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.totalFiles)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Files</div>
						<div class="text-xs text-foreground-faint mt-2 font-sans">
							across {data.latest.directories} directories
						</div>
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.commits)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Commits</div>
						<div class="text-xs text-foreground-faint mt-2 font-sans">
							and counting
						</div>
					</div>
				</div>
			</section>

			<!-- Code Composition -->
			<section class="mb-16">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Code Composition</h2>

				<div class="card p-6">
					<!-- Stacked bar -->
					<div class="h-8 rounded-full overflow-hidden flex mb-6">
						{#each languageBreakdown() as lang}
							<div
								class="{lang.color} transition-all duration-500"
								style="width: {lang.pct}%"
								title="{lang.name}: {lang.pct}%"
							></div>
						{/each}
					</div>

					<!-- Legend -->
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						{#each languageBreakdown() as lang}
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded-full {lang.color}"></div>
								<span class="text-sm font-sans text-foreground-muted">
									{lang.name} <span class="text-foreground-faint">({lang.pct}%)</span>
								</span>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<!-- Growth Over Time -->
			{#if data.snapshots.length > 1}
				<section class="mb-16">
					<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Growth Over Time</h2>

					<div class="card p-6">
						<!-- Stacked language bar chart -->
						<div class="space-y-3">
							{#each data.snapshots as snapshot, i}
								{@const barWidth = (snapshot.totalCodeLines / maxCodeLines) * 100}
								{@const breakdown = getSnapshotBreakdown(snapshot)}
								<div class="flex items-center gap-4">
									<div class="w-32 text-right flex flex-col">
										<span class="text-xs font-sans text-foreground-faint">{snapshot.date}</span>
										<span class="text-xs font-mono text-accent-muted">{snapshot.label}</span>
									</div>
									<div class="flex-1 h-6 bg-surface rounded-full overflow-hidden">
										<div class="h-full flex" style="width: {barWidth}%">
											{#each breakdown as lang}
												<div
													class="{lang.color} h-full transition-all duration-500"
													style="width: {lang.pct}%"
													title="{lang.name}: {lang.pct}%"
												></div>
											{/each}
										</div>
									</div>
									<div class="w-20 text-left">
										<span class="text-xs font-mono text-foreground-muted">{formatNumber(snapshot.totalCodeLines)}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Milestones Timeline -->
			{#if milestones.length > 0}
			<section class="mb-16">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Milestones</h2>

				<div class="relative">
					<!-- Timeline line -->
					<div class="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-divider transform md:-translate-x-1/2"></div>

					<div class="space-y-8">
						{#each milestones as snapshot, i}
							{@const isLeft = i % 2 === 0}
							{@const summary = getSummary(snapshot.label)}
							<div class="relative flex items-start {isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}">
								<!-- Dot -->
								<div class="absolute left-4 md:left-1/2 w-3 h-3 bg-accent-muted rounded-full transform -translate-x-1/2 z-10 mt-5"></div>

								<!-- Content -->
								<div class="ml-12 md:ml-0 md:w-1/2 {isLeft ? 'md:pr-12' : 'md:pl-12'}">
									<div class="card p-5 {isLeft ? 'md:text-right' : ''}">
										<!-- Header -->
										<div class="text-xs font-mono text-foreground-faint mb-1">{snapshot.date}</div>
										<div class="font-serif text-xl text-accent-muted mb-2 flex items-center gap-2 {isLeft ? 'md:justify-end' : ''}">
											<Tag class="w-4 h-4" /> {snapshot.label}
										</div>

										<!-- AI Summary -->
										{#if summary}
											<p class="text-sm text-foreground-muted font-sans leading-relaxed mb-3 {isLeft ? 'md:text-right' : ''}">
												{summary.summary}
											</p>

											<!-- Stats badges -->
											<div class="flex flex-wrap gap-2 mb-3 {isLeft ? 'md:justify-end' : ''}">
												{#if summary.stats.features > 0}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-sans rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
														<Sparkles class="w-3 h-3" />
														{summary.stats.features} features
													</span>
												{/if}
												{#if summary.stats.fixes > 0}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-sans rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
														<Wrench class="w-3 h-3" />
														{summary.stats.fixes} fixes
													</span>
												{/if}
											</div>

											<!-- Expandable highlights -->
											{#if summary.highlights.features.length > 0 || summary.highlights.fixes.length > 0}
												<details class="group mt-3 pt-3 border-t border-divider">
													<summary class="cursor-pointer text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1 {isLeft ? 'md:justify-end' : ''}">
														<ChevronDown class="w-3 h-3 transition-transform group-open:rotate-180" />
														View highlights
													</summary>

													<div class="mt-3 space-y-3 text-left">
														{#if summary.highlights.features.length > 0}
															<div>
																<h4 class="text-xs font-semibold text-foreground mb-1.5">Features</h4>
																<ul class="space-y-1 text-xs text-foreground-muted">
																	{#each summary.highlights.features.slice(0, 5) as feature}
																		<li class="flex items-start gap-1.5">
																			<span class="text-green-500 mt-0.5">●</span>
																			<span>{feature}</span>
																		</li>
																	{/each}
																</ul>
															</div>
														{/if}

														{#if summary.highlights.fixes.length > 0}
															<div>
																<h4 class="text-xs font-semibold text-foreground mb-1.5">Fixes</h4>
																<ul class="space-y-1 text-xs text-foreground-muted">
																	{#each summary.highlights.fixes.slice(0, 5) as fix}
																		<li class="flex items-start gap-1.5">
																			<span class="text-blue-500 mt-0.5">●</span>
																			<span>{fix}</span>
																		</li>
																	{/each}
																</ul>
															</div>
														{/if}
													</div>
												</details>
											{/if}
										{:else}
											<!-- Fallback for versions without summaries -->
											<div class="text-sm text-foreground-muted font-sans">
												{formatNumber(snapshot.totalCodeLines)} lines · {formatNumber(snapshot.commits)} commits
											</div>
										{/if}

										<!-- Stats footer -->
										<div class="text-xs text-foreground-faint font-mono mt-3 pt-3 border-t border-divider flex items-center gap-3 {isLeft ? 'md:justify-end' : ''}">
											<span>{formatNumber(snapshot.totalCodeLines)} lines</span>
											<span>·</span>
											<span>{formatNumber(snapshot.commits)} commits</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
			{/if}

			<!-- Documentation -->
			{#if data.snapshots.length > 1}
			<section class="mb-16">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Documentation</h2>

				<div class="grid md:grid-cols-2 gap-6">
					<!-- Code to Docs Ratio Card -->
					<div class="card p-6">
						<div class="text-center mb-4">
							<div class="text-3xl font-serif text-accent-muted mb-1">
								{getCodeToDocsRatio(data.latest)}
							</div>
							<div class="text-sm text-foreground-muted font-sans">lines of code per doc word</div>
						</div>
						<div class="flex justify-between text-xs text-foreground-faint font-sans pt-4 border-t border-default">
							<span>{formatNumber(data.latest.totalCodeLines)} lines</span>
							<span>{formatNumber(data.latest.docWords)} words</span>
						</div>
					</div>

					<!-- Doc Pages Estimate -->
					<div class="card p-6">
						<div class="text-center mb-4">
							<div class="text-3xl font-serif text-accent-muted mb-1">
								~{Math.round(data.latest.docWords / 500)}
							</div>
							<div class="text-sm text-foreground-muted font-sans">pages of documentation</div>
						</div>
						<div class="flex justify-between text-xs text-foreground-faint font-sans pt-4 border-t border-default">
							<span>{formatNumber(data.latest.docLines)} lines</span>
							<span>~500 words/page</span>
						</div>
					</div>
				</div>

				<!-- Docs growth over time -->
				<div class="card p-6 mt-6">
					<h3 class="text-xs font-sans text-foreground-faint uppercase tracking-wide mb-4">Documentation Growth</h3>
					<div class="space-y-2">
						{#each data.snapshots as snapshot, i}
							{@const barWidth = (snapshot.docWords / maxDocWords) * 100}
							<div class="flex items-center gap-3">
								<div class="w-16 text-right">
									<span class="text-xs font-mono text-foreground-faint">{snapshot.label}</span>
								</div>
								<div class="flex-1 h-4 bg-surface rounded-full overflow-hidden">
									<div
										class="h-full bg-emerald-500 rounded-full transition-all duration-500"
										style="width: {barWidth}%"
									></div>
								</div>
								<div class="w-16 text-left">
									<span class="text-xs font-mono text-foreground-muted">{formatNumber(snapshot.docWords)}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
			{/if}

			<!-- TypeScript Migration Progress -->
			{#if tsProgression()}
			<section class="mb-16">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">TypeScript Migration</h2>

				<div class="card p-6">
					<!-- Summary stats -->
					<div class="flex justify-between items-center mb-6">
						<div class="text-center">
							<div class="text-2xl font-mono text-yellow-500">{tsProgression()?.startPct}%</div>
							<div class="text-xs text-foreground-faint font-sans">{tsProgression()?.startLabel}</div>
						</div>
						<div class="flex-1 mx-6 flex items-center gap-2">
							<div class="flex-1 h-px bg-divider"></div>
							<div class="text-accent-muted font-mono text-sm">+{tsProgression()?.growth}%</div>
							<div class="flex-1 h-px bg-divider"></div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-mono text-blue-500">{tsProgression()?.currentPct}%</div>
							<div class="text-xs text-foreground-faint font-sans">{tsProgression()?.currentLabel}</div>
						</div>
					</div>

					<!-- Progress bar timeline -->
					<div class="space-y-2">
						{#each data.snapshots as snapshot, i}
							{@const tsPct = getTsPercentage(snapshot)}
							<div class="flex items-center gap-3">
								<div class="w-16 text-right">
									<span class="text-xs font-mono text-foreground-faint">{snapshot.label}</span>
								</div>
								<div class="flex-1 h-4 bg-surface rounded-full overflow-hidden flex">
									<div
										class="h-full bg-blue-500 transition-all duration-500"
										style="width: {tsPct}%"
										title="TypeScript: {tsPct}%"
									></div>
									<div
										class="h-full bg-yellow-500 transition-all duration-500"
										style="width: {100 - tsPct}%"
										title="JavaScript: {100 - tsPct}%"
									></div>
								</div>
								<div class="w-12 text-left">
									<span class="text-xs font-mono text-blue-400">{tsPct}%</span>
								</div>
							</div>
						{/each}
					</div>

					<!-- Legend -->
					<div class="flex justify-center gap-6 mt-4 pt-4 border-t border-default">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-full bg-blue-500"></div>
							<span class="text-xs font-sans text-foreground-muted">TypeScript</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
							<span class="text-xs font-sans text-foreground-muted">JavaScript</span>
						</div>
					</div>
				</div>
			</section>
			{/if}

			<!-- Total Project Size -->
			<section class="mb-16">
				<div class="card p-8 text-center bg-accent border-accent">
					<div class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-2">Total Project Size</div>
					<div class="text-4xl md:text-5xl font-serif text-accent-muted mb-2">
						~{formatNumber(data.latest.estimatedTokens)}
					</div>
					<div class="text-foreground-muted font-sans">estimated tokens</div>
					<p class="text-foreground-faint font-sans text-sm mt-4 max-w-md mx-auto">
						That's roughly {Math.round(data.latest.estimatedTokens / 100000) * 100}k tokens — enough context for an AI to understand the entire codebase.
					</p>
				</div>
			</section>
			{:else}
			<!-- Empty state -->
			<section class="mb-16">
				<div class="card p-12 text-center">
					<div class="mb-4 flex justify-center"><Sprout class="w-10 h-10 text-accent-muted" /></div>
					<h2 class="text-xl font-serif text-foreground mb-2">No snapshots yet</h2>
					<p class="text-foreground-muted font-sans">
						The journey is just beginning. Check back after the first release.
					</p>
				</div>
			</section>
			{/if}

			<!-- Footer note -->
			<section class="text-center py-8 border-t border-default">
				<p class="text-foreground-faint font-sans text-sm mb-2">
					Snapshots are automatically generated with each release.
				</p>
				<p class="text-foreground-subtle font-sans italic inline-flex items-center gap-2 justify-center">
					Building something meaningful, one commit at a time. <Sprout class="w-4 h-4 text-accent-muted" />
				</p>
			</section>
		</div>
	</article>

	<Footer />
</main>

<style>
	.bg-divider {
		background-color: var(--color-divider);
	}
</style>
