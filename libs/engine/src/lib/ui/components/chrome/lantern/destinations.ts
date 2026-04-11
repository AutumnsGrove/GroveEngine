/**
 * Lantern Destinations & Services — Static Navigation Data
 *
 * Provides the navigation links shown in the Lantern panel's two tabs:
 * - Destinations: core grove pages (Home, Dashboard, Feed, etc.)
 * - Services: platform tools (Email, Storage, Admin, etc.)
 */

import { featureIcons } from "@autumnsgrove/prism/icons";
import { defaultSuite, resolveIcon } from "$lib/ui/components/ui/groveicon";
import { getArborHref } from "$lib/ui/stores/wanderer.svelte";
import type { LanternDestination } from "./types";

// Resolve service icons from the canonical manifest
const meadowIcon = resolveIcon(defaultSuite.meadow.icon);
const forestsIcon = resolveIcon(defaultSuite.forests.icon);
const ivyIcon = resolveIcon(defaultSuite.ivy.icon);
const amberIcon = resolveIcon(defaultSuite.amber.icon);
const arborIcon = resolveIcon(defaultSuite.arbor.icon);

/**
 * Build the destinations list, personalized with the user's home grove.
 *
 * Note: "Return to Your Grove" is NOT in this list — it's the prominent
 * button rendered separately above the tabs in LanternPanel.
 */
export function getDestinations(_homeGrove: string): LanternDestination[] {
	return [
		{
			href: "https://grove.place/canopy",
			label: "Dashboard",
			groveLabel: "Canopy",
			icon: featureIcons.bookUser,
			external: true,
			termSlug: "canopy",
		},
		{
			href: "https://meadow.grove.place",
			label: "Feed",
			groveLabel: "Meadow",
			icon: meadowIcon,
			external: true,
			termSlug: "meadow",
		},
		{
			href: "https://grove.place/forest",
			label: "Communities",
			groveLabel: "Forests",
			icon: forestsIcon,
			external: true,
			termSlug: "forests",
		},
		{
			href: "https://grove.place/knowledge",
			label: "Help",
			groveLabel: "Knowledge Base",
			icon: featureIcons.bookOpen,
			external: true,
		},
	];
}

/**
 * Build the platform services list shown in the Services tab.
 *
 * The Admin entry routes back to the user's OWN arbor when they're
 * visiting someone else's grove — otherwise a relative `/arbor` would
 * push them into the visited grove's admin panel. See getArborHref.
 */
export function getServices(
	homeGrove: string,
	currentGrove: string,
): LanternDestination[] {
	const arborHref = getArborHref(homeGrove, currentGrove);
	const arborExternal = arborHref.startsWith("http");
	return [
		{
			href: "https://ivy.grove.place",
			label: "Email",
			groveLabel: "Ivy",
			icon: ivyIcon,
			external: true,
			termSlug: "ivy",
		},
		{
			href: "https://amber.grove.place",
			label: "Storage",
			groveLabel: "Amber",
			icon: amberIcon,
			external: true,
			termSlug: "amber",
		},
		{
			href: arborHref,
			label: "Admin",
			groveLabel: "Arbor",
			icon: arborIcon,
			external: arborExternal,
			termSlug: "arbor",
		},
	];
}
