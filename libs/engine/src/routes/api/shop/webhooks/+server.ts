import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createPaymentProvider } from "$lib/payments";
import { sanitizeWebhookPayload, calculateWebhookExpiry } from "$lib/utils/webhook-sanitizer";
import { API_ERRORS, throwGroveError } from "$lib/errors";

/**
 * POST /api/shop/webhooks - Handle Stripe webhooks
 *
 * This endpoint receives webhooks from Stripe for:
 * - customer.subscription.created/updated/canceled — Platform billing events
 *
 * Shop e-commerce events (checkout, payment, refund, Connect) have been removed.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.STRIPE_SECRET_KEY) {
		throwGroveError(500, API_ERRORS.PAYMENT_PROVIDER_NOT_CONFIGURED, "API");
	}

	if (!platform?.env?.STRIPE_WEBHOOK_SECRET) {
		throwGroveError(500, API_ERRORS.WEBHOOK_SECRET_NOT_CONFIGURED, "API");
	}

	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	try {
		// Initialize Stripe provider
		const stripe = createPaymentProvider("stripe", {
			secretKey: platform.env.STRIPE_SECRET_KEY,
			webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
		});

		// Verify and parse webhook
		const result = await stripe.handleWebhook(request);

		if (!result.received) {
			console.error("Webhook verification failed:", result.error);
			throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
		}

		const event = result.event!;
		const eventData = event.data as Record<string, any>;

		console.log(`Processing webhook: ${event.type}`, {
			eventId: event.providerEventId,
		});

		// Store webhook event for idempotency
		const existingEvent = await platform.env.DB.prepare(
			"SELECT id FROM webhook_events WHERE provider_event_id = ?",
		)
			.bind(event.providerEventId)
			.first();

		if (existingEvent) {
			console.log("Webhook already processed:", event.providerEventId);
			return json({ received: true, message: "Already processed" });
		}

		// Insert webhook event with PII sanitization and retention TTL
		const sanitizedPayload = sanitizeWebhookPayload(eventData);
		const payloadToStore = sanitizedPayload
			? JSON.stringify(sanitizedPayload)
			: JSON.stringify({
					meta: { event_name: event.type },
					data: { id: eventData?.id, type: eventData?.object },
					_sanitization_failed: true,
				});
		const expiresAt = calculateWebhookExpiry(); // 120 days from now

		await platform.env.DB.prepare(
			`INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				event.id,
				"stripe",
				event.providerEventId,
				event.type,
				payloadToStore,
				Math.floor(Date.now() / 1000),
				expiresAt,
			)
			.run();

		// Process based on event type
		switch (event.type) {
			// Platform billing subscription events
			case "subscription.created":
			case "subscription.updated":
				await handleSubscriptionUpdated(platform.env.DB, eventData);
				break;

			case "subscription.canceled":
				await handleSubscriptionCanceled(platform.env.DB, eventData);
				break;

			default:
				console.log("Unhandled webhook event type:", event.type);
		}

		// Mark as processed
		await platform.env.DB.prepare(
			"UPDATE webhook_events SET processed = 1, processed_at = ? WHERE id = ?",
		)
			.bind(Math.floor(Date.now() / 1000), event.id)
			.run();

		return json({ received: true });
	} catch (err) {
		console.error("Webhook processing error:", err);

		// For Stripe, we should return 200 to prevent retries for non-recoverable errors
		// But 4xx/5xx for recoverable ones
		if (
			err &&
			typeof err === "object" &&
			"status" in err &&
			(err as Record<string, unknown>).status === 400
		) {
			throw err;
		}

		// Log error but acknowledge receipt to prevent retries
		const errorMessage = err instanceof Error ? err.message : "Unknown error";
		return json({ received: true, error: errorMessage });
	}
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleSubscriptionUpdated(
	db: any,
	subscriptionData: Record<string, any>,
): Promise<void> {
	const stripeSubId = subscriptionData.id;
	const status = subscriptionData.status;

	// Map Stripe status to our status
	const statusMap: Record<string, string> = {
		active: "active",
		past_due: "past_due",
		canceled: "canceled",
		unpaid: "unpaid",
		trialing: "active",
		paused: "paused",
	};

	const mappedStatus = (statusMap[status as string] || "active") as string;

	await db
		.prepare(
			`UPDATE platform_billing SET
        status = ?,
        current_period_start = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        updated_at = ?
       WHERE provider_subscription_id = ?`,
		)
		.bind(
			mappedStatus,
			subscriptionData.current_period_start,
			subscriptionData.current_period_end,
			subscriptionData.cancel_at_period_end ? 1 : 0,
			Math.floor(Date.now() / 1000),
			stripeSubId,
		)
		.run();
}

async function handleSubscriptionCanceled(
	db: any,
	subscriptionData: Record<string, any>,
): Promise<void> {
	const stripeSubId = subscriptionData.id;

	await db
		.prepare(
			`UPDATE platform_billing SET
        status = 'canceled',
        updated_at = ?
       WHERE provider_subscription_id = ?`,
		)
		.bind(Math.floor(Date.now() / 1000), stripeSubId)
		.run();
}
