<script lang="ts">
	import { Header as EngineHeader } from '@autumnsgrove/lattice/ui/chrome';
	import {
		LANDING_MOBILE_RESOURCE_LINKS,
		LANDING_MOBILE_CONNECT_LINKS
	} from '@autumnsgrove/lattice/ui/chrome';
	import type { MaxWidth, HeaderUser } from '@autumnsgrove/lattice/ui/chrome';

	interface Props {
		maxWidth?: MaxWidth;
		user?: HeaderUser | null;
		signInHref?: string;
		signInLabel?: string;
		userHref?: string;
		showSidebarToggle?: boolean;
		/** Shows the same "Demo" chip Aspen shows when ?demo=<secret> is active */
		isDemo?: boolean;
		/** Shows the same "Beta" chip Aspen shows — here, purely a local-branch signal (see arbor/+layout.server.ts) */
		isBeta?: boolean;
	}

	let {
		maxWidth,
		user,
		signInHref,
		signInLabel,
		userHref,
		showSidebarToggle = false,
		isDemo = false,
		isBeta = false,
	}: Props = $props();
</script>

<EngineHeader
	resourceLinks={LANDING_MOBILE_RESOURCE_LINKS}
	connectLinks={LANDING_MOBILE_CONNECT_LINKS}
	{maxWidth}
	{user}
	{signInHref}
	{signInLabel}
	{userHref}
	{showSidebarToggle}
	{isDemo}
	{isBeta}
/>
