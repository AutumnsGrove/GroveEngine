<script lang="ts">
	import InternalsPostViewer from "@autumnsgrove/lattice/components/custom/InternalsPostViewer.svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import FollowButton from "@autumnsgrove/lattice/ui/components/chrome/FollowButton.svelte";
	import SubscribeButton from "@autumnsgrove/lattice/ui/components/chrome/SubscribeButton.svelte";
	import ShareButton from "@autumnsgrove/lattice/ui/components/chrome/ShareButton.svelte";
	import { page } from "$app/state";

	let { data } = $props();

	// Show follow/subscribe buttons when a logged-in visitor is on someone else's grove
	const showFollow = $derived(data.user && !data.isOwner && data.context?.type === "tenant");
	// Show share button for the grove owner
	const showShare = $derived(data.isOwner);
	// The real host the visitor is on — grove.place subdomain in prod, localhost:port in dev
	const heroHost = $derived(data.context?.type === "tenant" ? page.url.host : null);
</script>

<svelte:head>
	<title
		>{data.title}{data.context?.type === "tenant"
			? ` - ${data.siteSettings?.grove_title || data.context.tenant.name}`
			: ""}</title
	>
	<meta name="description" content={data.description || ""} />
</svelte:head>

{#if data.needsSetup}
	<div class="setup-page">
		<div class="setup-backdrop" aria-hidden="true"></div>
		<div class="setup-content">
			<span class="setup-kicker">a new grove</span>
			<h1>Welcome to {data.tenantName}</h1>
			<p class="setup-subtitle">This ground is cleared. Nothing's been planted yet.</p>
			<p class="setup-description">
				Sign in to the <GroveTerm term="arbor" standard="dashboard">admin panel</GroveTerm> to create
				your first post, customize your theme, and make this space your own.
			</p>
			<div class="setup-actions">
				<Button href="/arbor" variant="default" size="lg">Set Up Your Grove</Button>
			</div>
			<p class="setup-hint">You'll be asked to sign in with your Grove account to continue.</p>
		</div>
	</div>
{:else if data.hero}
	<section class="hero">
		<div class="hero-glow" aria-hidden="true"></div>
		<!-- accent-ok: matches VineBackground.svelte's own fallback — vine color is
		     intentionally independent from accent unless the tenant opts into
		     "Match Accent" in Appearance settings, which sets --grove-vine-color itself. -->
		<svg class="hero-vines" viewBox="0 0 1200 800" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
			<g fill="none" stroke="var(--grove-vine-color, #22c55e)" stroke-linecap="round">
				<path
					d="M-40 750 C120 700 90 600 180 520 S300 380 250 260 S330 100 260 -30"
					stroke-width="1.6"
					opacity="0.22"
				/>
				<path
					d="M1240 700 C1080 660 1120 560 1020 500 S890 390 950 270 S870 90 950 -40"
					stroke-width="1.4"
					opacity="0.18"
				/>
				<path d="M-40 40 C90 80 60 160 140 210" stroke-width="1.3" opacity="0.14" />
				<path d="M1240 80 C1100 120 1130 190 1050 230" stroke-width="1.3" opacity="0.14" />
			</g>
			<!-- accent-ok: same vine-color fallback as above -->
			<g fill="var(--grove-vine-color, #22c55e)" opacity="0.14">
				<ellipse cx="180" cy="500" rx="13" ry="20" transform="rotate(-30 180 500)" />
				<ellipse cx="950" cy="480" rx="12" ry="18" transform="rotate(25 950 480)" />
				<ellipse cx="200" cy="190" rx="10" ry="15" transform="rotate(-20 200 190)" />
				<ellipse cx="1010" cy="200" rx="10" ry="15" transform="rotate(30 1010 200)" />
			</g>
		</svg>

		{#if heroHost}
			<p class="hero-kicker">{heroHost}</p>
		{/if}

		<GlassCard
			variant="frosted"
			as="section"
			class="hero-card"
			hoverable={false}
			gossamer="grove-dew"
		>
			<h1 class="hero-title">{data.hero.title}</h1>
			{#if data.hero.subtitle}
				<p class="hero-subtitle">{data.hero.subtitle}</p>
			{/if}
			{#if data.hero.cta || showFollow || showShare}
				<div class="hero-actions">
					{#if data.hero.cta}
						<Button href={data.hero.cta.link} variant="default" size="lg" class="hero-cta"
							>{data.hero.cta.text}</Button
						>
					{/if}
					{#if showFollow && data.context?.type === "tenant"}
						<FollowButton
							tenantId={data.context.tenant.id}
							subdomain={data.context.tenant.subdomain}
							name={data.context.tenant.name}
						/>
						<SubscribeButton tenantId={data.context.tenant.id} name={data.context.tenant.name} />
					{/if}
					{#if showShare && data.context?.type === "tenant"}
						<ShareButton title={data.context.tenant.name} />
					{/if}
				</div>
			{/if}
		</GlassCard>
	</section>
{/if}

{#if data.latestPost}
	<section class="latest-post-section">
		<h2 class="section-title">Fresh from the garden</h2>
		<InternalsPostViewer post={data.latestPost} />
	</section>
{:else if !data.needsSetup}
	<section class="latest-post-section">
		<div class="empty-garden">
			<span class="empty-garden-mark" aria-hidden="true"></span>
			<p class="empty-garden-text">
				The garden is quiet for now — check back soon, or wander through the rest of this grove.
			</p>
		</div>
	</section>
{/if}

{#if data.content}
	<div class="intro">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitized HTML content -->
		{@html data.content}
	</div>
{/if}

<style>
	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Setup flow — new grove with no content */
	.setup-page {
		position: relative;
		display: flex;
		align-items: center;
		min-height: 55vh;
		padding: clamp(2rem, 6vw, 4rem) clamp(1.25rem, 5vw, 3rem);
		overflow: hidden;
	}
	.setup-backdrop {
		position: absolute;
		inset: -20% -10% auto -10%;
		height: 60%;
		background: radial-gradient(
			ellipse at 20% 0%,
			var(--grove-accent-15) 0%,
			var(--grove-accent-5) 45%,
			transparent 75%
		);
		pointer-events: none;
	}
	.setup-content {
		position: relative;
		max-width: 34rem;
	}
	.setup-kicker {
		display: inline-block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--grove-accent);
		letter-spacing: 0.02em;
		margin-bottom: 0.75rem;
	}
	.setup-page h1 {
		font-size: clamp(2rem, 4vw + 0.5rem, 2.75rem);
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-text);
		margin: 0 0 0.625rem 0;
		transition: color 0.3s ease;
	}
	.setup-subtitle {
		font-size: 1.1875rem;
		color: var(--color-text-muted);
		margin: 0 0 1.5rem 0;
		transition: color 0.3s ease;
	}
	.setup-description {
		font-size: 1rem;
		max-width: 42ch;
		color: var(--color-text-muted);
		line-height: 1.65;
		margin: 0 0 2rem 0;
		transition: color 0.3s ease;
	}
	.setup-actions {
		margin-bottom: 1.25rem;
	}
	.setup-hint {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0;
		opacity: 0.75;
		transition: color 0.3s ease;
	}

	/* Hero — poster-scale identity moment: vine linework wrapping the fold,
	   name held in a frosted, gossamer-textured GlassCard front and center. */
	.hero {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: clamp(3.5rem, 10vw, 6rem) clamp(1.25rem, 5vw, 3rem) clamp(3rem, 7vw, 5rem);
		margin: -2.5rem -2rem 2rem;
		overflow: hidden;
	}
	.hero-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 65% 55% at 50% 15%,
			var(--grove-accent-15) 0%,
			transparent 70%
		);
		pointer-events: none;
	}
	.hero-vines {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.hero-kicker {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--grove-accent);
		letter-spacing: 0.03em;
		margin: 0 0 1.5rem 0;
		animation: rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.hero-kicker::before,
	.hero-kicker::after {
		content: "";
		width: 1.5rem;
		height: 1px;
		background: currentColor;
		opacity: 0.4;
	}
	:global(.hero-card) {
		position: relative;
		width: 100%;
		max-width: 40rem;
		text-align: center;
		animation: rise-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both;
	}
	.hero-title {
		font-size: clamp(2.25rem, 5vw + 1rem, 4rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.02em;
		max-width: 16ch;
		margin: 0 auto 1rem;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.hero-subtitle {
		font-size: 1.1875rem;
		color: var(--color-text-muted);
		margin: 0 auto 1.75rem;
		max-width: 46ch;
		line-height: 1.6;
		transition: color 0.3s ease;
	}
	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-kicker,
		:global(.hero-card) {
			animation: none;
		}
	}

	/* Content area — the tenant's own free-form home page text */
	.intro {
		max-width: 66ch;
		margin: 3.5rem auto 0;
	}
	.intro :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 2.5rem 0 1rem;
		transition: color 0.3s ease;
	}
	.intro :global(h2:first-child) {
		margin-top: 0;
	}
	.intro :global(p) {
		font-size: 1.0625rem;
		color: var(--color-text-muted);
		line-height: 1.85;
		margin: 0 0 1.25rem;
		transition: color 0.3s ease;
	}

	/* Latest post / empty garden section — sits right below the hero */
	.latest-post-section {
		max-width: 42rem;
		margin: 0 auto;
	}
	.section-title {
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: lowercase;
		color: var(--grove-accent);
		letter-spacing: 0.02em;
		margin: 0 0 1rem 0;
	}

	/* Empty garden state — plain text, no boxed card */
	.empty-garden {
		display: flex;
		align-items: baseline;
		gap: 0.875rem;
		padding-top: 0.25rem;
	}
	.empty-garden-mark {
		flex: none;
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 999px;
		background: var(--grove-accent-40);
		transform: translateY(-0.15rem);
	}
	.empty-garden-text {
		margin: 0;
		font-size: 1.0625rem;
		color: var(--color-text-muted);
		line-height: 1.65;
	}

	/* Scoped override: the shadcn Button's default variant is wired to a fixed
	   brand-green token (--primary), not the tenant's --grove-accent — rewiring
	   that globally would touch every button across all 8 apps, so this CTA
	   alone follows the same solid-accent + white-text pairing used everywhere
	   else in the platform (ArborPanel, LanternVisitingCard, PhotoPicker, etc). */
	:global(.hero-cta) {
		background: var(--grove-accent) !important;
		border-color: var(--grove-accent) !important;
		color: #fff !important;
	}
	:global(.hero-cta:hover) {
		background: var(--grove-accent-dark) !important;
		border-color: var(--grove-accent-dark) !important;
	}

	@media (max-width: 768px) {
		.hero {
			margin: -1.5rem -1rem 2rem;
		}
	}
</style>
