import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		prerender: {
			entries: ['*'],
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore 404s for content pages - content is provided by consuming sites
				if (message.includes('404')) {
					console.warn(`Prerender skipping ${path}: ${message}`);
					return;
				}
				// Throw other errors
				throw new Error(message);
			}
		}
	}
};

export default config;
