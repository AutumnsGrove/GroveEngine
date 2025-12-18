/**
 * Debounce function calls
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timeoutId = null;

	return function (/** @type {any[]} */ ...args) {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		const context = this;
		timeoutId = setTimeout(() => fn.apply(context, args), delay);
	};
}
