import { getAboutPage } from '$lib/utils/markdown.js';
import { error } from '@sveltejs/kit';

export function load() {
	const page = getAboutPage();

	if (!page) {
		throw error(404, 'About page not found');
	}

	return {
		page
	};
}

export const prerender = true;
