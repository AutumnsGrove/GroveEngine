// Simple utility for combining CSS classes
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(' ');
}