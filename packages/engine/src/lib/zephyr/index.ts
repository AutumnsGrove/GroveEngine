/**
 * Zephyr — Grove's Email Gateway Client
 *
 * Use this module to send emails through Grove's unified email gateway.
 * Zephyr handles retries, template rendering, logging, and error surfacing.
 *
 * @example
 * ```typescript
 * import { Zephyr } from '@autumnsgrove/groveengine/zephyr';
 *
 * const result = await Zephyr.send({
 *   type: "notification",
 *   template: "porch-reply",
 *   to: "visitor@example.com",
 *   data: { content: "Thanks for reaching out!" },
 * });
 *
 * if (!result.success) {
 *   // Errors are RETURNED, not swallowed
 *   console.error("Email failed:", result.error);
 * }
 * ```
 *
 * @module
 */

// Main client
export {
  Zephyr,
  sendPorchReply,
  sendVerificationCode,
  sendPaymentEmail,
  sendSequenceEmail,
  sendRawEmail,
} from "./client";

// Types
export type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrError,
  ZephyrErrorCode,
  ZephyrMetadata,
  ZephyrResponseMetadata,
  EmailType,
  TemplateName,
  PorchReplyData,
  VerificationCodeData,
  PaymentData,
  SequenceData,
} from "./types";
