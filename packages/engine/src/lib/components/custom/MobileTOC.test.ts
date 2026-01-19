import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MobileTOC from './MobileTOC.svelte';

describe('MobileTOC', () => {
	const mockHeaders = [
		{ id: 'intro', text: 'Introduction', level: 2 },
		{ id: 'features', text: 'Features', level: 2 },
		{ id: 'getting-started', text: 'Getting Started', level: 3 },
	];

	describe('Rendering', () => {
		it('renders nothing when headers array is empty', () => {
			const { container } = render(MobileTOC, { props: { headers: [] } });
			expect(container.querySelector('.mobile-toc-wrapper')).toBeFalsy();
		});

		it('renders wrapper when headers are provided', () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			expect(container.querySelector('.mobile-toc-wrapper')).toBeTruthy();
		});

		it('has aria-expanded false initially', () => {
			render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');
			expect(button.getAttribute('aria-expanded')).toBe('false');
		});

		it('renders toggle button with correct aria-label', () => {
			render(MobileTOC, { props: { headers: mockHeaders } });
			expect(screen.getByLabelText('Toggle table of contents')).toBeTruthy();
		});
	});

	describe('Menu Toggle', () => {
		it('shows menu when button is clicked', async () => {
			render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(screen.getByText('Introduction')).toBeTruthy();
			expect(screen.getByText('Features')).toBeTruthy();
		});

		it('sets aria-expanded true when open', async () => {
			render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(button.getAttribute('aria-expanded')).toBe('true');
		});

		it('renders default title in menu', async () => {
			render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(screen.getByText('Table of Contents')).toBeTruthy();
		});

		it('renders custom title when provided', async () => {
			render(MobileTOC, { props: { headers: mockHeaders, title: 'Jump to' } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(screen.getByText('Jump to')).toBeTruthy();
		});
	});

	describe('Level Classes', () => {
		it('applies correct level-2 classes when menu is open', async () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			const level2Items = container.querySelectorAll('.level-2');
			expect(level2Items.length).toBe(2);
		});

		it('applies correct level-3 classes when menu is open', async () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			const level3Items = container.querySelectorAll('.level-3');
			expect(level3Items.length).toBe(1);
		});
	});

	describe('Structure', () => {
		it('has mobile-toc-wrapper class on container', () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			expect(container.querySelector('.mobile-toc-wrapper')).toBeTruthy();
		});

		it('renders toc-button', () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			expect(container.querySelector('.toc-button')).toBeTruthy();
		});

		it('renders menu with toc-menu class when open', async () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(container.querySelector('.toc-menu')).toBeTruthy();
		});
	});

	describe('Snapshots', () => {
		it('matches snapshot when closed', () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			expect(container.innerHTML).toMatchSnapshot();
		});

		it('matches snapshot when open', async () => {
			const { container } = render(MobileTOC, { props: { headers: mockHeaders } });
			const button = screen.getByLabelText('Toggle table of contents');

			await fireEvent.click(button);

			expect(container.innerHTML).toMatchSnapshot();
		});
	});
});
