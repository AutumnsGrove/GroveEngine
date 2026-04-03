<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { metricIcons, featureIcons, phaseIcons } from "@autumnsgrove/prism/icons";

	let { data } = $props();
</script>

<ArborSection
	title="Features"
	icon={phaseIcons.sparkles}
	description="Tools that bring your grove to life."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<div class="feature-list">
		<!-- Rings (Analytics) -->
		<a href="/arbor/analytics" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<metricIcons.barChart class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="rings">Rings</GroveTerm>
							<Waystone slug="what-is-rings" label="Learn about Rings analytics" />
						</div>
						<p class="feature-description">
							Privacy-first analytics showing how <GroveTerm interactive term="wanderer"
								>Wanderers</GroveTerm
							> explore your Grove.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Trail -->
		<a href="/arbor/timeline" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<metricIcons.calendar class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="trails">Trail</GroveTerm>
							<Waystone slug="what-are-trails" label="Learn about Trail" />
						</div>
						<p class="feature-description">
							Track your creative journey with automated activity summaries.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Reeds (Comments) -->
		<a href="/arbor/reeds" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<featureIcons.messageSquare class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="reeds">Reeds</GroveTerm>
							<Waystone slug="what-are-reeds" label="Learn about Reeds comments" />
						</div>
						<p class="feature-description">
							Threaded comments that let <GroveTerm interactive term="wanderer"
								>Wanderers</GroveTerm
							> leave thoughts on your <GroveTerm interactive term="bloom">blooms</GroveTerm>.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Curios -->
		<a href="/arbor/curios" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon curios">
						<phaseIcons.sparkles class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="curios">Curios</GroveTerm>
							<Waystone slug="what-are-curios" label="Learn about Curios" />
						</div>
						<p class="feature-description">
							Guestbooks, counters, polls, shrines, ambient sounds, and more — 19 curios
							that make your site feel alive.
							{#if data.curiosCount > 0}
								<span class="curio-count">{data.curiosCount} active</span>
							{/if}
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Reverie (AI Configuration) -->
		<a href="/arbor/reverie" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<phaseIcons.sparkles class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="reverie">Reverie</GroveTerm>
							<Waystone slug="what-is-reverie" label="Learn about Reverie" />
						</div>
						<p class="feature-description">
							Describe a vibe and let AI configure your Grove — "make my site cozy" just works.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>
	</div>
</ArborSection>

<style>
	.feature-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.feature-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.feature-body {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
	}

	.feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--border-radius-button, 0.5rem);
		background: var(--grove-accent-10);
		color: var(--user-accent, var(--color-primary));
		flex-shrink: 0;
	}

	:global(.feature-icon .icon) {
		width: 20px;
		height: 20px;
	}

	.feature-content {
		flex: 1;
		min-width: 0;
	}

	.feature-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.25rem;
	}

	.feature-description {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.curio-count {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.125rem 0.5rem;
		background: var(--grove-accent-15);
		color: var(--user-accent, var(--color-primary));
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	@media (max-width: 480px) {
		.feature-body {
			padding: 0.75rem 1rem;
		}

		.feature-icon {
			width: 36px;
			height: 36px;
		}

		:global(.feature-icon .icon) {
			width: 18px;
			height: 18px;
		}
	}
</style>
