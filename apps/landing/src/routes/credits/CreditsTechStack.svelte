<script lang="ts">
	import { GroveTerm } from "@autumnsgrove/lattice/ui";
	import { chromeIcons } from "@autumnsgrove/prism/icons";
	const Shredder = chromeIcons.shredder;
</script>

				<!-- AI Coding Tools -->
				<section class="mb-12" id="ai-tools">
					<h2 class="text-2xl font-serif text-foreground mb-2">AI Coding Assistants</h2>
					<p class="text-foreground-subtle font-sans text-sm mb-6">
						The AI tools that helped write and refine Grove's code.
					</p>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div class="card p-5">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-lg font-serif text-foreground mb-1">Claude Code</h3>
									<p class="text-foreground-subtle font-sans text-sm mb-2">by Anthropic</p>
									<p class="text-foreground-muted font-sans text-sm">
										Primary development tool. Used with Claude Haiku, Sonnet, and Opus 4.5
										models—primarily Opus for complex architectural decisions and implementation.
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3 mt-3">
								<a
									href="https://claude.ai/code"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent-muted text-sm font-sans hover:underline"
								>
									claude.ai/code →
								</a>
							</div>
						</div>

						<div class="card p-5">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-lg font-serif text-foreground mb-1">Kilo Code</h3>
									<p class="text-foreground-subtle font-sans text-sm mb-2">VS Code Extension</p>
									<p class="text-foreground-muted font-sans text-sm">
										Secondary development tool. Used with frontier open source models all via
										OpenRouter with ZDR enabled.
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3 mt-3">
								<a
									href="https://kilocode.ai"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent-muted text-sm font-sans hover:underline"
								>
									kilocode.ai →
								</a>
								<a
									href="/knowledge/help/what-is-zdr"
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-xs text-foreground-muted hover:bg-surface-hover hover:text-warning transition-colors"
									title="Zero Data Retention"
								>
									<Shredder class="w-3 h-3" />
									ZDR
								</a>
							</div>
						</div>

						<div class="card p-5">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-lg font-serif text-foreground mb-1">OpenCode</h3>
									<p class="text-foreground-subtle font-sans text-sm mb-2">Interactive CLI Tool</p>
									<p class="text-foreground-muted font-sans text-sm">
										Secondary development tool. Used with frontier open source models all via
										OpenRouter with ZDR enabled.
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3 mt-3">
								<a
									href="https://opencode.ai"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent-muted text-sm font-sans hover:underline"
								>
									opencode.ai →
								</a>
								<a
									href="/knowledge/help/what-is-zdr"
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-xs text-foreground-muted hover:bg-surface-hover hover:text-warning transition-colors"
									title="Zero Data Retention"
								>
									<Shredder class="w-3 h-3" />
									ZDR
								</a>
							</div>
						</div>

						<div class="card p-5">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="text-lg font-serif text-foreground mb-1">Crush</h3>
									<p class="text-foreground-subtle font-sans text-sm mb-2">by Charmbracelet</p>
									<p class="text-foreground-muted font-sans text-sm">
										A delightful terminal AI coding agent. Used with frontier open source models via
										OpenRouter with ZDR enabled.
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3 mt-3">
								<a
									href="https://github.com/charmbracelet/crush"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent-muted text-sm font-sans hover:underline"
								>
									charmbracelet/crush →
								</a>
								<a
									href="/knowledge/help/what-is-zdr"
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-xs text-foreground-muted hover:bg-surface-hover hover:text-warning transition-colors"
									title="Zero Data Retention"
								>
									<Shredder class="w-3 h-3" />
									ZDR
								</a>
							</div>
						</div>
					</div>
				</section>

				<!-- Tech Stack -->
				<section class="mb-12" id="tech-stack">
					<h2 class="text-2xl font-serif text-foreground mb-2">Tech Stack</h2>
					<p class="text-foreground-subtle font-sans text-sm mb-6">
						The core technologies powering Grove.
					</p>

					<div class="grid gap-4">
						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">SvelteKit</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Full-stack framework for building fast, modern web applications. The foundation of
								Grove's frontend and server-side rendering.
							</p>
							<a
								href="https://kit.svelte.dev"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								kit.svelte.dev →
							</a>
						</div>

						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">Cloudflare</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Edge computing platform. Grove runs on Workers, stores data in D1 (SQLite), caches
								with KV, and hosts media on R2.
							</p>
							<a
								href="https://developers.cloudflare.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								developers.cloudflare.com →
							</a>
						</div>

						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">Better Auth</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Authentication framework powering <GroveTerm interactive term="heartwood">Heartwood</GroveTerm>.
								Handles OAuth and session management with KV-cached sessions
								for sub-100ms validation.
							</p>
							<a
								href="https://better-auth.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								better-auth.com →
							</a>
						</div>

						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">Tailwind CSS</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Utility-first CSS framework. Enables rapid, consistent styling across the entire
								platform.
							</p>
							<a
								href="https://tailwindcss.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								tailwindcss.com →
							</a>
						</div>

						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">Stripe</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Payment processing for subscriptions, billing, and secure checkout. Powers Grove's
								payment flows with reliability and developer-friendly tooling.
							</p>
							<a
								href="https://stripe.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								stripe.com →
							</a>
						</div>

						<div class="card p-5">
							<h3 class="text-lg font-serif text-foreground mb-1">Resend</h3>
							<p class="text-foreground-muted font-sans text-sm">
								Email delivery service. Powers transactional emails and notifications.
							</p>
							<a
								href="https://resend.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block"
							>
								resend.com →
							</a>
						</div>
					</div>
				</section>
