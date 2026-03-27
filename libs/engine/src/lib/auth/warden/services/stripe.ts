/**
 * Type-safe Stripe methods for the Warden client.
 *
 * Read-only billing access routed through Warden.
 * No write actions — Stripe mutations go through the app's
 * server-side Stripe integration directly.
 */

import type { WardenClient } from "../client";
import type {
	WardenResponse,
	StripeCustomer,
	StripeSubscription,
	StripeInvoice,
	StripeListResponse,
} from "../types";

export class WardenStripe {
	constructor(private client: WardenClient) {}

	async listCustomers(params?: {
		limit?: number;
		starting_after?: string;
		ending_before?: string;
		email?: string;
	}): Promise<WardenResponse<StripeListResponse<StripeCustomer>>> {
		return this.client.request({
			service: "stripe",
			action: "list_customers",
			params: params ?? {},
		});
	}

	async getCustomer(params: { customer_id: string }): Promise<WardenResponse<StripeCustomer>> {
		return this.client.request({
			service: "stripe",
			action: "get_customer",
			params,
		});
	}

	async listSubscriptions(params?: {
		limit?: number;
		customer?: string;
		status?:
			| "active"
			| "past_due"
			| "unpaid"
			| "canceled"
			| "incomplete"
			| "incomplete_expired"
			| "trialing"
			| "all";
		starting_after?: string;
		ending_before?: string;
	}): Promise<WardenResponse<StripeListResponse<StripeSubscription>>> {
		return this.client.request({
			service: "stripe",
			action: "list_subscriptions",
			params: params ?? {},
		});
	}

	async listInvoices(params?: {
		limit?: number;
		customer?: string;
		subscription?: string;
		status?: "draft" | "open" | "paid" | "uncollectible" | "void";
		starting_after?: string;
		ending_before?: string;
	}): Promise<WardenResponse<StripeListResponse<StripeInvoice>>> {
		return this.client.request({
			service: "stripe",
			action: "list_invoices",
			params: params ?? {},
		});
	}

	async getInvoice(params: { invoice_id: string }): Promise<WardenResponse<StripeInvoice>> {
		return this.client.request({
			service: "stripe",
			action: "get_invoice",
			params,
		});
	}
}
