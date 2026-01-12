<script>
	let { headers = [] } = $props();

	let activeId = $state('');

	// Set up intersection observer to track active section
	function setupScrollTracking() {
		if (typeof window === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0% -35% 0%',
				threshold: 0
			}
		);

		// Observe all headers in the document
		headers.forEach((header) => {
			const element = document.getElementById(header.id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}

	// Set up scroll tracking (runs on mount and when headers change)
	$effect(() => {
		const cleanup = setupScrollTracking();
		return cleanup;
	});

	/** @param {string} id */
	function scrollToHeader(id) {
		const element = document.getElementById(id);
		if (element) {
			// Calculate offset for sticky headers
			const offset = 80; // Account for any fixed headers
			const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
			const offsetPosition = elementPosition - offset;

			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			});
			
			// Update URL hash without jumping
			history.pushState(null, '', `#${id}`);
		} else {
			console.warn(`TableOfContents: Header element not found for ID: ${id}`);
		}
	}
</script>

{#if headers.length > 0}
	<nav class="toc">
		<h3 class="toc-title">Table of Contents</h3>
		<ul class="toc-list">
			{#each headers as header (header.id)}
				<li
					class="toc-item level-{header.level}"
					class:active={activeId === header.id}
				>
					<button
						type="button"
						onclick={() => scrollToHeader(header.id)}
						class="toc-link"
					>
						{header.text}
					</button>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: 2rem;
		max-height: calc(100vh - 4rem);
		overflow-y: auto;
		padding: 1.25rem;
		font-size: 0.875rem;
		/* Glass effect */
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 16px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}
	.toc:hover {
		background: rgba(255, 255, 255, 0.7);
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .toc {
		background: rgba(16, 50, 37, 0.45);
		border-color: rgba(74, 222, 128, 0.15);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .toc:hover {
		background: rgba(16, 50, 37, 0.55);
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.25);
	}
	.toc-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		transition: color 0.3s ease, border-color 0.3s ease;
	}
	:global(.dark) .toc-title {
		color: rgba(255, 255, 255, 0.6);
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}
	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.toc-item {
		margin: 0;
		padding: 0;
	}
	.toc-link {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.375rem 0;
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
		transition: color 0.2s ease;
		font-size: inherit;
		font-family: inherit;
		line-height: 1.4;
	}
	.toc-link:hover {
		color: #2c5f2d;
		padding-left: 0.5rem;
	}
	:global(.dark) .toc-link:hover {
		color: var(--accent-success);
	}
	.toc-item.active .toc-link {
		color: #2c5f2d;
		font-weight: 600;
		/* Active indicator */
		background: rgba(44, 95, 45, 0.1);
		padding: 0.375rem 0.75rem;
		margin-left: -0.75rem;
		margin-right: -0.75rem;
		border-radius: 8px;
	}
	:global(.dark) .toc-item.active .toc-link {
		color: var(--accent-success);
		background: rgba(74, 222, 128, 0.1);
	}
	/* Indentation based on header level */
	.level-1 .toc-link {
		padding-left: 0;
		font-weight: 600;
	}
	.level-2 .toc-link {
		padding-left: 0;
	}
	.level-3 .toc-link {
		padding-left: 1rem;
	}
	.level-4 .toc-link {
		padding-left: 2rem;
	}
	.level-5 .toc-link {
		padding-left: 3rem;
	}
	.level-6 .toc-link {
		padding-left: 4rem;
	}
	/* Scrollbar styling */
	.toc::-webkit-scrollbar {
		width: 4px;
	}
	.toc::-webkit-scrollbar-track {
		background: transparent;
	}
	.toc::-webkit-scrollbar-thumb {
		background: var(--light-text-secondary);
		border-radius: 2px;
	}
	:global(.dark) .toc::-webkit-scrollbar-thumb {
		background: var(--light-border-light);
	}
</style>
