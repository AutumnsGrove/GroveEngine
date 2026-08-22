// GroveUI - Component Barrel
//
// All `export *` wildcards replaced with explicit named exports
// to prevent hidden re-export cascades that break tree-shaking.
//
// Prefer direct imports for Svelte files:
//   import Button from "$lib/ui/components/ui/Button.svelte"
// over barrel imports:
//   import { Button } from "$lib/ui/components/ui"

// --- Types ---
export type { GlassVariant } from "./types";

// --- Core Components ---
export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as FeatureStar } from "./FeatureStar.svelte";
export { default as Dialog } from "./Dialog.svelte";
export { default as Input } from "./Input.svelte";
export { default as Textarea } from "./Textarea.svelte";
export { default as Select } from "./Select.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Accordion } from "./Accordion.svelte";
export { default as Sheet } from "./Sheet.svelte";
export { default as Toast } from "./Toast.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as Spinner } from "./Spinner.svelte";
export { default as Table } from "./Table.svelte";
export { default as CollapsibleSection } from "./CollapsibleSection.svelte";
export { default as Logo } from "./Logo.svelte";
export { default as LogoLoader } from "./LogoLoader.svelte";
export { default as LogoArchive } from "./LogoArchive.svelte";

// --- Beta ---
export { default as BetaBadge } from "./BetaBadge.svelte";
export { default as BetaWelcomeDialog } from "./BetaWelcomeDialog.svelte";

// --- Demo ---
export { default as DemoBadge } from "./DemoBadge.svelte";

// --- Glass Suite ---
export { default as Glass } from "./Glass.svelte";
export { default as GlassButton } from "./GlassButton.svelte";
export { default as GlassCard } from "./GlassCard.svelte";
export { default as GlassConfirmDialog } from "./GlassConfirmDialog.svelte";
export { default as GlassNavbar } from "./GlassNavbar.svelte";
export { default as GlassOverlay } from "./GlassOverlay.svelte";
export { default as PassageTransition } from "./PassageTransition.svelte";
export { default as GlassLogo } from "./GlassLogo.svelte";
export { default as GlassLogoArchive } from "./GlassLogoArchive.svelte";
export { default as GlassCarousel } from "./GlassCarousel.svelte";
export { default as GlassLegend } from "./GlassLegend.svelte";
export { default as GlassStatusWidget } from "./GlassStatusWidget.svelte";
export { default as GlassComparisonTable } from "./GlassComparisonTable.svelte";

// --- GlassChat ---
export { default as GlassChat } from "./glasschat/GlassChat.svelte";
export { default as ChatMessage } from "./glasschat/ChatMessage.svelte";
export { default as ChatInput } from "./glasschat/ChatInput.svelte";
export { default as ChatTypingIndicator } from "./glasschat/ChatTypingIndicator.svelte";
export type {
	ChatMessageStatus,
	ChatSender,
	ChatMessageData,
	ChatRoleConfig,
	ChatRoleMap,
} from "./glasschat/types";
export { DEFAULT_ROLE_CONFIG } from "./glasschat/types";
export {
	createChatMessage,
	createChatController,
	createAIChatController,
	createConversationalChatController,
} from "./glasschat/controller.svelte";
export type {
	ChatController,
	AIChatController,
	AIChatControllerOptions,
	AIChatResponse,
	ConversationalChatController,
	ConversationalChatControllerOptions,
} from "./glasschat/controller.svelte";

// --- Waystone ---
export { default as Waystone } from "./Waystone.svelte";
export { default as WaystonePopup } from "./waystone/WaystonePopup.svelte";
export type { WaystoneExcerpt, WaystoneManifest, WaystoneCache } from "./waystone/types";
export { createWaystoneCache } from "./waystone/types";

// --- Grove Messages ---
export { default as GroveMessages } from "./grove-messages/GroveMessages.svelte";
export type { GroveMessage, GroveMessageType, GroveMessageChannel } from "./grove-messages/types";

// --- Grove Icon ---
export { default as GroveIcon } from "./groveicon/GroveIcon.svelte";
export { defaultSuite, groveIconManifest, getSuite } from "./groveicon/manifest";
export { resolveIcon, hasIcon } from "./groveicon/resolver";
export type {
	IconComponent,
	GroveIconEntry,
	GroveIconSuite,
	GroveIconManifest,
	ResolvedIcon,
} from "./groveicon/types";

// --- Table Primitives ---
export {
	TableHeader,
	TableBody,
	TableRow,
	TableCell,
	TableHead,
	TableFooter,
	TableCaption,
} from "$lib/ui/components/primitives/table";

// --- Toast Utility ---
export { toast } from "./toast.js";

export const UI_VERSION = "0.3.0";
