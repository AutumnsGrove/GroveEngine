<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import { stateIcons, featureIcons } from "@autumnsgrove/prism/icons";
	import { enhance } from "$app/forms";
	const Check = stateIcons.check;
	const MailX = featureIcons.mailX;

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<SEO
	title="Unsubscribe — Grove"
	description="Manage your grove email subscription."
	url="/unsubscribe/grove"
/>

<Header user={data.user} />

<main class="min-h-screen flex flex-col items-center px-6 py-16">
	<div class="max-w-md w-full">
		<div class="text-center mb-10">
			<div class="mb-6">
				<Logo class="w-12 h-12 mx-auto" season={seasonStore.current} />
			</div>
		</div>

		<div class="glass-card rounded-2xl p-8 text-center">
			{#if form?.success}
				<div
					class="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center"
				>
					<Check class="w-8 h-8 text-accent" />
				</div>
				<h1 class="text-xl font-serif text-foreground mb-3">You're unsubscribed</h1>
				<p class="text-foreground-muted font-sans mb-6">
					You won't receive email updates from {form.groveName} anymore.
				</p>
				<a
					href="/"
					class="inline-block px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors"
				>
					Back to Grove
				</a>
			{:else if data.status === "confirm"}
				<div
					class="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center"
				>
					<MailX class="w-8 h-8 text-accent-muted" />
				</div>
				<h1 class="text-xl font-serif text-foreground mb-3">Unsubscribe from {data.groveName}?</h1>
				<p class="text-foreground-muted font-sans mb-6">
					You'll stop receiving email updates when they publish new posts.
				</p>
				<form
					method="POST"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<input type="hidden" name="token" value={data.token} />
					<button
						type="submit"
						disabled={submitting}
						class="inline-block px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
					>
						{submitting ? "Unsubscribing..." : "Unsubscribe"}
					</button>
				</form>
			{:else if data.status === "already"}
				<div
					class="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center"
				>
					<MailX class="w-8 h-8 text-accent-muted" />
				</div>
				<h1 class="text-xl font-serif text-foreground mb-3">Already unsubscribed</h1>
				<p class="text-foreground-muted font-sans mb-6">
					It looks like you've already been unsubscribed, or this link has expired.
				</p>
				<a
					href="/"
					class="inline-block px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors"
				>
					Back to Grove
				</a>
			{:else}
				<div
					class="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center"
				>
					<MailX class="w-8 h-8 text-accent-muted" />
				</div>
				<h1 class="text-xl font-serif text-foreground mb-3">Something went wrong</h1>
				<p class="text-foreground-muted font-sans mb-6">
					We couldn't process your unsubscribe request. Please try again or contact us.
				</p>
				<a
					href="/"
					class="inline-block px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors"
				>
					Back to Grove
				</a>
			{/if}
		</div>
	</div>
</main>

<Footer />

<style>
	.glass-card {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-divider);
	}

	:global(.dark) .glass-card {
		background: rgba(30, 41, 59, 0.5);
	}
</style>
