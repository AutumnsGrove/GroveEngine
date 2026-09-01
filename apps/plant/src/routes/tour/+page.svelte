<script lang="ts">
	import { GroveTour } from "@autumnsgrove/lattice/ui/onboarding";
	import { buildAdminUrl } from "$lib/tenant-url";

	let { data } = $props();

	function goToAdmin(params: string) {
		const subdomain = data.user?.username || "example";
		window.location.href = buildAdminUrl(subdomain, new URL(window.location.href), params);
	}
</script>

<GroveTour
	username={data.user?.username ?? undefined}
	onComplete={() => goToAdmin("welcome=true&tour=complete")}
	onSkip={() => goToAdmin("welcome=true&tour=skipped")}
/>
