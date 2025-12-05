<script>
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen domain-gradient">
	{@render children()}
</div>
