<script lang="ts">
	import { page } from '$app/stores';
	import {
		Home,
		Telescope,
		CreditCard,
		BookOpen,
		Trees,
		Compass,
		PenLine,
		Scale,
		Heart,
		X
	} from 'lucide-svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();

	let currentPath = $derived($page.url.pathname);

	// Close on escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			onClose();
		}
	}

	// Navigation items with icons
	type NavItem = {
		href: string;
		label: string;
		icon: typeof Home;
		external?: boolean;
	};

	const navItems: NavItem[] = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/vision', label: 'Vision', icon: Telescope },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/knowledge', label: 'Knowledge', icon: BookOpen },
		{ href: '/forest', label: 'Forest', icon: Trees },
		{ href: '/journey', label: 'Journey', icon: Compass },
		{ href: 'https://autumnsgrove.com/blog', label: 'Blog', icon: PenLine, external: true },
		{ href: '/legal', label: 'Legal', icon: Scale },
		{ href: '/credits', label: 'Credits', icon: Heart }
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
		onclick={onClose}
		aria-label="Close menu"
	></button>
{/if}

<!-- Slide-out panel -->
<div
	class="fixed top-0 right-0 z-50 h-full w-64 transform bg-surface border-l border-default shadow-xl transition-transform duration-300 ease-out {open
		? 'translate-x-0'
		: 'translate-x-full'}"
	role="dialog"
	aria-modal="true"
	aria-label="Navigation menu"
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-default">
		<span class="text-sm font-medium text-foreground-subtle">Menu</span>
		<button
			onclick={onClose}
			class="p-2 -mr-2 text-foreground-subtle hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
			aria-label="Close menu"
		>
			<X class="w-5 h-5" />
		</button>
	</div>

	<!-- Navigation -->
	<nav class="p-2">
		{#each navItems as item}
			{@const Icon = item.icon}
			{@const active = isActive(item.href)}
			<a
				href={item.href}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noopener noreferrer' : undefined}
				onclick={onClose}
				class="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
					{active
					? 'bg-accent/10 text-accent-muted'
					: 'text-foreground hover:bg-surface-hover hover:text-accent-muted'}"
			>
				<Icon class="w-5 h-5 flex-shrink-0" />
				<span class="text-sm font-medium">{item.label}</span>
				{#if item.external}
					<span class="text-xs text-foreground-subtle ml-auto">External</span>
				{/if}
			</a>
		{/each}
	</nav>
</div>
