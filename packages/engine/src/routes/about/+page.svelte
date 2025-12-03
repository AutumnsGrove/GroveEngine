<script>
	import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';
	import { Card } from '@groveengine/ui';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.title} - AutumnsGrove</title>
	<meta name="description" content={data.page.description || data.page.title} />
</svelte:head>

<ContentWithGutter
	content={data.page.content}
	gutterContent={data.page.gutterContent || []}
	headers={data.page.headers || []}
>
	{#snippet children()}
		<!-- Temporary Warning Notice -->
		<Card variant="warning" class="site-warning">
			<strong>Note:</strong> This site has known navigation issues. If you came from the GitHub Dashboard,
			you may need to refresh this page. When returning to Home, refresh there as well.
		</Card>

		<header class="content-header">
			<h1>{data.page.title}</h1>
		</header>
	{/snippet}
</ContentWithGutter>
