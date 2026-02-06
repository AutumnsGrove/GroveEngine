<!--
  EditorDemo — Live split-pane markdown editor demo.
  Visitors can type markdown on the left and see the rendered preview on the right.
  Uses markdown-it (already a landing dependency) for live rendering.
  No API calls, no auth, pure client-side.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import MarkdownIt from 'markdown-it';

	const md = new MarkdownIt({
		html: false,
		breaks: true,
		linkify: true
	});

	const sampleContent = `# Finding Quiet on the Internet

I used to love having my own little corner of the web. A place where I could write without worrying about algorithms or engagement metrics.

Somewhere along the way, that feeling disappeared. Every platform wanted me to **perform** — to optimize, to post at the right time, to chase virality.

So I planted a grove instead.

> The best writing happens when nobody's watching.

Here, my words grow at their own pace. No analytics telling me which posts *performed*. Just me, writing into the quiet.

---

*And that's enough.*`;

	let content = $state(sampleContent);
	let rendered = $derived(md.render(content));
	let activeTab = $state<'split' | 'write' | 'preview'>('split');
</script>

<div class="w-full rounded-2xl overflow-hidden border border-subtle bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
	<!-- Toolbar -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-subtle bg-white/60 dark:bg-slate-800/60">
		<div class="flex items-center gap-1">
			<!-- Mode tabs -->
			<button
				onclick={() => activeTab = 'write'}
				class="px-2.5 py-1 rounded text-xs font-sans transition-colors
					{activeTab === 'write' ? 'bg-accent-subtle/30 text-accent-muted font-medium' : 'text-foreground-subtle hover:text-foreground-muted'}"
			>
				Write
			</button>
			<button
				onclick={() => activeTab = 'split'}
				class="px-2.5 py-1 rounded text-xs font-sans transition-colors
					{activeTab === 'split' ? 'bg-accent-subtle/30 text-accent-muted font-medium' : 'text-foreground-subtle hover:text-foreground-muted'}"
			>
				Split
			</button>
			<button
				onclick={() => activeTab = 'preview'}
				class="px-2.5 py-1 rounded text-xs font-sans transition-colors
					{activeTab === 'preview' ? 'bg-accent-subtle/30 text-accent-muted font-medium' : 'text-foreground-subtle hover:text-foreground-muted'}"
			>
				Preview
			</button>
		</div>

		<div class="flex items-center gap-2">
			<!-- Decorative formatting buttons -->
			<div class="hidden sm:flex items-center gap-0.5 text-foreground-faint">
				<span class="px-1.5 py-0.5 rounded text-xs font-mono hover:bg-white/50 cursor-default" title="Bold">B</span>
				<span class="px-1.5 py-0.5 rounded text-xs font-mono italic hover:bg-white/50 cursor-default" title="Italic">I</span>
				<span class="px-1.5 py-0.5 rounded text-xs font-mono hover:bg-white/50 cursor-default" title="Link">🔗</span>
			</div>
			<span class="text-[10px] text-foreground-faint font-sans px-2 py-0.5 rounded-full bg-accent-subtle/20">
				Flow Editor
			</span>
		</div>
	</div>

	<!-- Editor panes -->
	<div class="flex {activeTab === 'split' ? 'flex-col sm:flex-row' : ''}" style="height: 320px;">
		<!-- Write pane -->
		{#if activeTab === 'write' || activeTab === 'split'}
			<div class="{activeTab === 'split' ? 'w-full sm:w-1/2 h-1/2 sm:h-full' : 'w-full h-full'} relative">
				<textarea
					bind:value={content}
					class="w-full h-full p-4 font-mono text-sm text-foreground bg-transparent resize-none
						focus:outline-none leading-relaxed placeholder:text-foreground-faint"
					spellcheck="false"
					aria-label="Markdown editor"
				></textarea>
				{#if activeTab === 'split'}
					<div class="absolute right-0 top-0 bottom-0 w-px bg-subtle hidden sm:block" aria-hidden="true"></div>
					<div class="absolute left-0 right-0 bottom-0 h-px bg-subtle sm:hidden" aria-hidden="true"></div>
				{/if}
			</div>
		{/if}

		<!-- Preview pane -->
		{#if activeTab === 'preview' || activeTab === 'split'}
			<div class="{activeTab === 'split' ? 'w-full sm:w-1/2 h-1/2 sm:h-full' : 'w-full h-full'} overflow-y-auto">
				<div class="p-4 prose prose-sm prose-grove max-w-none
					prose-headings:font-serif prose-headings:text-foreground
					prose-p:text-foreground-muted prose-p:leading-relaxed
					prose-blockquote:border-accent-muted prose-blockquote:text-foreground-subtle prose-blockquote:italic
					prose-strong:text-foreground prose-em:text-foreground-muted
					prose-hr:border-subtle">
					{@html rendered}
				</div>
			</div>
		{/if}
	</div>
</div>
