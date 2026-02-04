<script lang="ts">
	/**
	 * Engine Admin Login Page
	 *
	 * Uses LoginGraft for unified authentication across Grove properties.
	 * Redirects directly to Better Auth for OAuth, supports passkeys via WebAuthn.
	 */

	import { LoginGraft } from '$lib/grafts/login';
	import { Logo } from '$lib/ui/components/ui';
	import { page } from '$app/stores';

	// Get error details from URL params (set by callback on auth failure)
	const error = $derived($page.url.searchParams.get('error'));
	const errorCode = $derived($page.url.searchParams.get('error_code'));
</script>

<svelte:head>
	<title>Admin Login - Grove</title>
</svelte:head>

<LoginGraft
	variant="fullpage"
	providers={['google', 'passkey']}
	returnTo="/arbor"
>
	{#snippet logo()}
		<Logo class="w-16 h-16" />
	{/snippet}

	{#snippet header()}
		<h1 class="text-2xl font-semibold text-foreground">Admin Panel</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Sign in to access the admin panel
		</p>
		{#if error}
			<div class="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
				<p>{error}</p>
				{#if errorCode}
					<p class="mt-1 text-xs text-red-500 dark:text-red-400 font-mono">
						Error code: {errorCode}
					</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</LoginGraft>
