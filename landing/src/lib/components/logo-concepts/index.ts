/**
 * Grove Logo Concept Components
 *
 * Experimental logo designs for Grove - view them in /vineyard
 *
 * ## Common Props (all components)
 * - `class` - CSS classes for sizing/positioning (default: 'w-8 h-8')
 * - `color` - Fill/stroke color (default: 'currentColor')
 * - `title` - Accessible name for screen readers (renders SVG <title>)
 *
 * ## Additional Props
 * Some logos with visible tree trunks support a separate trunk color:
 * - `LogoConnectedCanopy` - has `trunkColor` for the small trunk at bottom
 * - `LogoGathering` - has `trunkColor` for the three tree trunks
 *
 * When `trunkColor` is not provided, it defaults to `color`.
 */

export { default as LogoClearingRing } from "./LogoClearingRing.svelte";
export { default as LogoConnectedCanopy } from "./LogoConnectedCanopy.svelte";
export { default as LogoOrganicG } from "./LogoOrganicG.svelte";
export { default as LogoGathering } from "./LogoGathering.svelte";
export { default as LogoMycelium } from "./LogoMycelium.svelte";
export { default as LogoClearingPath } from "./LogoClearingPath.svelte";
export { default as LogoThreeLeaves } from "./LogoThreeLeaves.svelte";
export { default as LogoGroveSeal } from "./LogoGroveSeal.svelte";
