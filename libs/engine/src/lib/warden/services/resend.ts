/**
 * Type-safe Resend methods for the Warden client.
 *
 * Convenience wrapper for sending emails through Warden.
 * Domain-restricted to @grove.place by the worker-side Zod schema.
 */

import type { WardenClient } from "../client";
import type { WardenResponse, ResendEmailResponse } from "../types";

export class WardenResend {
	constructor(private client: WardenClient) {}

	async sendEmail(params: {
		from: string;
		to: string | string[];
		subject: string;
		html?: string;
		text?: string;
		reply_to?: string;
		cc?: string | string[];
		bcc?: string | string[];
		tags?: Array<{ name: string; value: string }>;
	}): Promise<WardenResponse<ResendEmailResponse>> {
		return this.client.request({
			service: "resend",
			action: "send_email",
			params,
		});
	}
}
