/**
 * Grove Design System
 *
 * A calm, organic component library for the Grove blogging platform.
 * "a place to Be"
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

// Buttons & Actions
export { default as Button } from './components/Button.svelte';

// Form Elements
export { default as Input } from './components/Input.svelte';
export { default as Textarea } from './components/Textarea.svelte';

// Layout & Containers
export { default as Card } from './components/Card.svelte';
export { default as Divider } from './components/Divider.svelte';

// Labels & Badges
export { default as Badge } from './components/Badge.svelte';
export { default as Tag } from './components/Tag.svelte';

// Feedback
export { default as Alert } from './components/Alert.svelte';
export { default as Spinner } from './components/Spinner.svelte';
export { default as Progress } from './components/Progress.svelte';

// Overlays
export { default as Modal } from './components/Modal.svelte';
export { default as Tooltip } from './components/Tooltip.svelte';

// Media
export { default as Avatar } from './components/Avatar.svelte';
export { default as Icon } from './components/Icon.svelte';

// Navigation
export { default as Header } from './components/Header.svelte';
export { default as Footer } from './components/Footer.svelte';
export { default as NavLink } from './components/NavLink.svelte';

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────

export * from './tokens';
