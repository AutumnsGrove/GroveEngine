<script lang="ts">
	/**
	 * Beta Invite Landing Page
	 *
	 * Where invitees land after clicking the link in their invite email.
	 * Shows a warm welcome, the invite details, and a Google sign-in
	 * button so they can get started with one click.
	 */

	import { browser } from "$app/environment";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { phaseIcons, natureIcons, featureIcons } from "@autumnsgrove/prism/icons";
	import { LOGIN_URL } from "@autumnsgrove/lattice/auth/login";

	let { data } = $props();

	function displayTier(tier: string): string {
		return tier.charAt(0).toUpperCase() + tier.slice(1);
	}

	function signInWithGoogle() {
		if (!browser) return;
		const returnTo = `/auth/callback?inviteToken=${encodeURIComponent(data.token)}`;
		window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(`${window.location.origin}${returnTo}`)}`;
	}
</script>

<div class="space-y-8 animate-fade-in">
	<!-- Welcome header -->
	<section class="text-center space-y-4">
		<div
			class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning-bg/20 mb-2"
		>
			<phaseIcons.sparkles size={40} class="text-warning" aria-hidden="true" />
		</div>

		{#if data.inviteType === "beta"}
			<h1 class="text-2xl md:text-3xl font-medium text-foreground">Welcome to the Grove beta</h1>
			<p class="text-foreground-muted max-w-md mx-auto leading-relaxed">
				We're building a quiet corner of the internet for your words to grow. And we'd love for you
				to be one of the first to try it.
			</p>
		{:else}
			<h1 class="text-2xl md:text-3xl font-medium text-foreground">You've been invited to Grove</h1>
			<p class="text-foreground-muted max-w-md mx-auto leading-relaxed">
				Someone believes you deserve your own space online — a place where your words can grow
				without algorithms, ads, or tracking.
			</p>
		{/if}
	</section>

	<!-- Invite details card -->
	<GlassCard variant="frosted" class="max-w-md mx-auto">
		<!-- Tier badge -->
		<div class="text-center mb-6">
			<div
				class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning-bg/10 border border-warning/20 mb-4"
			>
				<natureIcons.leaf size={16} class="text-warning" aria-hidden="true" />
				<span class="text-sm font-medium text-warning">
					{#if data.inviteType === "beta"}
						Beta Tester — {displayTier(data.inviteTier)} Plan
					{:else}
						Complimentary {displayTier(data.inviteTier)} Account
					{/if}
				</span>
			</div>

			{#if data.customMessage}
				<div
					class="p-4 rounded-lg bg-white/50 dark:bg-bark-800/30 border border-border/40 mb-4"
				>
					<p class="text-foreground-muted italic">
						"{data.customMessage}"
					</p>
				</div>
			{/if}

			<p class="text-foreground-muted text-sm">
				A free <span class="font-medium text-primary">{displayTier(data.inviteTier)}</span> plan is waiting
				for you.
			</p>
		</div>

		<!-- Sign in -->
		<div class="border-t border-border/40 pt-6">
			<div class="space-y-4">
				<div>
					<p class="block text-sm font-medium text-foreground mb-2">Your email</p>
					<div
						class="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/60 dark:bg-bark-800/40 border border-border/50 dark:border-bark-700/40"
					>
						<featureIcons.mail size={16} class="text-foreground-subtle flex-shrink-0" aria-hidden="true" />
						<span class="text-foreground">{data.inviteEmail}</span>
					</div>
				</div>

				<button
					type="button"
					onclick={signInWithGoogle}
					class="btn-primary w-full justify-center text-base py-3 min-h-[44px]"
					aria-label="Sign in with Google to claim your invite"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
						<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
						<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
						<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
					</svg>
					Continue with Google
				</button>

				<p class="text-xs text-foreground-subtle text-center">
					Sign in with the Google account for <span class="font-medium">{data.inviteEmail}</span> to claim your invite.
				</p>
			</div>
		</div>
	</GlassCard>

	<!-- What's next -->
	<section class="text-center">
		<p class="text-sm text-foreground-subtle flex items-center justify-center gap-1.5">
			<natureIcons.heart size={14} class="text-accent" aria-hidden="true" />
			{#if data.inviteType === "beta"}
				Thank you for helping us grow
			{:else}
				A gift from someone who believes in you
			{/if}
		</p>
	</section>
</div>
