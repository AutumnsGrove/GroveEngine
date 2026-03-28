<script lang="ts">
	import { GroveTerm, GroveText } from "@autumnsgrove/lattice/ui";
	import { featureIcons, phaseIcons, chromeIcons, stateIcons, resolveAnyIcon } from "@autumnsgrove/prism/icons";
	import type { Tool } from "./workshop-data";
	import { getStatusBadge, getToolId } from "./workshop-data";

	const FileText = featureIcons.fileText;
	const BookOpen = featureIcons.bookOpen;
	const Github = chromeIcons.github;
	const Lightbulb = phaseIcons.lightbulb;

	function getToolIcon(iconKey: string) {
		return resolveAnyIcon(iconKey, stateIcons.circle);
	}

	let { tool, cardClass }: { tool: Tool; cardClass: string } = $props();

	const badge = $derived(getStatusBadge(tool.status));
	const ToolIcon = $derived(getToolIcon(tool.icon));
</script>

<article id={getToolId(tool.name)} class={cardClass}>
	<div class="flex items-start justify-between mb-4">
		<div class="flex items-center gap-3">
			<div
				class="w-10 h-10 rounded-lg bg-warning-bg flex items-center justify-center text-warning"
			>
				<ToolIcon class="w-5 h-5" />
			</div>
			<div>
				<h3 class="text-xl font-serif text-foreground">
					{#if tool.termSlug}<GroveTerm interactive term={tool.termSlug}>{tool.name}</GroveTerm
						>{:else}{tool.name}{/if}
				</h3>
				<p class="text-sm text-foreground-muted">{tool.tagline}</p>
			</div>
		</div>
		<span class="px-2 py-1 rounded-full text-xs font-medium {badge.class}">
			{badge.text}
		</span>
	</div>

	{#if tool.subComponents && tool.subComponents.length > 0}
		<div class="flex flex-wrap gap-1.5 mb-3" role="list" aria-label="Components">
			{#each tool.subComponents as sub}
				{@const SubIcon = getToolIcon(sub.icon)}
				<svelte:element
					this={sub.href ? "a" : "span"}
					href={sub.href}
					class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-xs text-foreground-muted transition-colors {sub.href
						? 'cursor-pointer hover:bg-warning-bg hover:text-warning-foreground'
						: ''}"
					title={sub.description}
					role="listitem"
					aria-label="{sub.name}{sub.description ? `: ${sub.description}` : ''}"
				>
					<SubIcon class="w-3 h-3" aria-hidden="true" />
					{sub.name}
				</svelte:element>
			{/each}
		</div>
	{/if}

	<p class="text-foreground-muted mb-4 leading-relaxed">
		<GroveText content={tool.description} />
	</p>

	<div class="pt-4 border-t border-border space-y-2">
		{#if tool.domain}
			<div class="flex items-start gap-2 text-sm min-w-0">
				<span class="text-foreground-subtle shrink-0">Domain:</span>
				{#if tool.domain.includes("{you}")}
					<code
						class="px-2 py-0.5 rounded bg-surface-subtle text-foreground-muted break-all"
						>{tool.domain}</code
					>
				{:else}
					<a
						href="https://{tool.domain}"
						target="_blank"
						rel="noopener noreferrer"
						class="px-2 py-0.5 rounded bg-surface-subtle text-foreground-muted hover:text-accent hover:bg-surface-elevated transition-colors font-mono text-sm break-all"
						>{tool.domain}</a
					>
				{/if}
			</div>
		{/if}
		<div class="text-sm text-foreground-subtle">
			{tool.integration}
		</div>
		<div class="flex flex-wrap gap-3">
			{#if tool.whatIsLink}
				<a
					href={tool.whatIsLink}
					aria-label="Learn more about {tool.name}"
					class="inline-flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground transition-colors"
				>
					<BookOpen class="w-4 h-4" />
					<span>Read more</span>
				</a>
			{/if}
			{#if tool.spec}
				<a
					href={tool.spec}
					class="inline-flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground transition-colors"
				>
					<FileText class="w-4 h-4" />
					<span>Spec</span>
				</a>
			{/if}
			{#if tool.howLink}
				<a
					href={tool.howLink}
					class="inline-flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground transition-colors"
				>
					<Lightbulb class="w-4 h-4" />
					<span>How we'll do it</span>
				</a>
			{/if}
			{#if tool.github}
				<a
					href={tool.github}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-sm text-foreground-subtle hover:text-foreground transition-colors"
				>
					<Github class="w-4 h-4" />
					<span>GitHub</span>
				</a>
			{/if}
		</div>
	</div>
</article>
