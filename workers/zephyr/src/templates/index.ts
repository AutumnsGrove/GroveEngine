/**
 * Zephyr Template Registry
 *
 * Handles template rendering for all email types.
 *
 * IMPORTANT: This module uses inline HTML templates for Worker compatibility.
 * React Email requires Node.js rendering, so we pre-render templates or use
 * HTML template functions that work in the Cloudflare Workers environment.
 *
 * For complex templates, services can:
 * 1. Use the "raw" template with pre-rendered HTML
 * 2. Call the email-render worker first, then pass HTML to Zephyr
 */

import type { TemplateName } from "../types";

// Template components
import { porchReplyTemplate, type PorchReplyData } from "./porch-reply";
import {
  verificationCodeTemplate,
  type VerificationCodeData,
} from "./verification-code";
import { paymentTemplates, type PaymentData } from "./payment";
import { sequenceTemplates, type SequenceData } from "./sequences";
import {
  traceNotificationTemplate,
  type TraceNotificationData,
} from "./trace-notification";

// =============================================================================
// Template Registry
// =============================================================================

export interface RenderResult {
  html: string;
  text?: string;
}

type TemplateData = Record<string, unknown>;

type TemplateRenderer<T extends TemplateData = TemplateData> = (
  data: T,
) => RenderResult;

/**
 * Template registry mapping names to renderers.
 */
const templates: Partial<Record<TemplateName | string, TemplateRenderer>> = {
  // Notifications
  "porch-reply": porchReplyTemplate as TemplateRenderer,

  // Verification
  "verification-code": verificationCodeTemplate as TemplateRenderer,

  // Payment lifecycle
  "payment-received": paymentTemplates.received as TemplateRenderer,
  "payment-failed": paymentTemplates.failed as TemplateRenderer,
  "trial-ending": paymentTemplates.trialEnding as TemplateRenderer,

  // Sequences (use with pre-rendered HTML from Engine)
  welcome: sequenceTemplates.welcome as TemplateRenderer,
  "day-1": sequenceTemplates.day1 as TemplateRenderer,
  "day-7": sequenceTemplates.day7 as TemplateRenderer,
  "day-14": sequenceTemplates.day14 as TemplateRenderer,
  "day-30": sequenceTemplates.day30 as TemplateRenderer,

  // Internal notifications
  "trace-notification": traceNotificationTemplate as TemplateRenderer,
};

/**
 * Subject line registry for templates that have defaults.
 */
const subjectLines: Partial<
  Record<TemplateName | string, string | ((data: TemplateData) => string)>
> = {
  "porch-reply": (data) => {
    const d = data as PorchReplyData;
    return d.visitNumber
      ? `Re: ${d.subject || "Your message"} [${d.visitNumber}]`
      : `Re: ${d.subject || "Your message"}`;
  },
  "verification-code": "Your Grove verification code",
  "payment-received": "Payment received — thank you! 🌱",
  "payment-failed": "Payment issue with your Grove subscription",
  "trial-ending": "Your Grove trial is ending soon",
  welcome: (data) => {
    const d = data as SequenceData;
    const subjects = {
      wanderer: "Welcome to the Grove 🌿",
      promo: "You found Grove 🌱",
      rooted: "Welcome home 🏡",
    };
    return subjects[d.audienceType || "wanderer"];
  },
  "day-1": "Making it yours",
  "day-7": (data) => {
    const d = data as SequenceData;
    return d.audienceType === "promo"
      ? "Still thinking about it?"
      : "What makes Grove different";
  },
  "day-14": "Why Grove exists",
  "day-30": "Still there? 👋",
  "trace-notification": (data) => {
    const d = data as TraceNotificationData;
    const emoji = d.vote === "up" ? "👍" : "👎";
    return `[Trace] ${emoji} ${d.sourcePath}`;
  },
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a template with the given data.
 *
 * @throws Error if template is unknown
 */
export async function renderTemplate(
  template: TemplateName | string,
  data: TemplateData,
): Promise<RenderResult> {
  const renderer = templates[template];

  if (!renderer) {
    throw new Error(`Unknown template: ${template}`);
  }

  return renderer(data);
}

/**
 * Get the default subject line for a template.
 */
export function getTemplateSubject(
  template: TemplateName | string,
  data?: TemplateData,
): string {
  const subject = subjectLines[template];

  if (!subject) {
    return "(No subject)";
  }

  if (typeof subject === "function") {
    return subject(data || {});
  }

  return subject;
}

/**
 * Check if a template is registered.
 */
export function hasTemplate(template: string): boolean {
  return template in templates;
}

/**
 * Register a custom template (for runtime extension).
 */
export function registerTemplate(
  name: string,
  renderer: TemplateRenderer,
  subject?: string | ((data: TemplateData) => string),
): void {
  templates[name] = renderer;

  if (subject) {
    subjectLines[name] = subject;
  }
}

// Re-export data types
export type {
  PorchReplyData,
  VerificationCodeData,
  PaymentData,
  SequenceData,
  TraceNotificationData,
};
