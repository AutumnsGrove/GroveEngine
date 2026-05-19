/**
 * Stub for cloudflare:workers virtual module in vitest.
 * Provides a minimal DurableObject base class for testing.
 */
export class DurableObject {
	ctx: unknown;
	env: unknown;

	constructor(ctx: unknown, env: unknown) {
		this.ctx = ctx;
		this.env = env;
	}
}
