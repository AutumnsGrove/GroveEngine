/**
 * Theme Store for GroveUI
 * Manages light/dark/system theme preferences
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
	// Initialize theme from localStorage or default to 'system'
	const initialTheme: Theme = browser
		? (localStorage.getItem('theme') as Theme | null) ?? 'system'
		: 'system';

	const theme = writable<Theme>(initialTheme);

	// Resolved theme (light/dark based on system preference if theme is 'system')
	const resolvedTheme = derived(theme, ($theme) => {
		if ($theme === 'system' && browser) {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return $theme === 'system' ? 'light' : $theme;
	});

	// Apply theme to document
	function applyTheme(t: 'light' | 'dark') {
		if (browser) {
			document.documentElement.classList.toggle('dark', t === 'dark');
		}
	}

	// Subscribe to resolved theme changes and apply
	if (browser) {
		resolvedTheme.subscribe((t) => applyTheme(t));

		// Listen for system preference changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			// Re-trigger derived store calculation
			theme.update(t => t);
		});
	}

	function setTheme(newTheme: Theme) {
		theme.set(newTheme);
		if (browser) {
			localStorage.setItem('theme', newTheme);
		}
	}

	function toggle() {
		const current = get(resolvedTheme);
		setTheme(current === 'dark' ? 'light' : 'dark');
	}

	return {
		theme,
		resolvedTheme,
		setTheme,
		toggle
	};
}

export const themeStore = createThemeStore();
