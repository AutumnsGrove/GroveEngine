import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Exclude jsdom from SSR bundling - it's only needed for DOMPurify server-side
		// but isomorphic-dompurify handles this automatically
		noExternal: [],
		external: ['jsdom']
	},
	build: {
		rollupOptions: {
			external: ['jsdom']
		}
	}
});
