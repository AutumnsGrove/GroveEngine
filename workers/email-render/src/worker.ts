/**
 * Email Render Worker
 *
 * Stateless worker that renders Grove email templates on demand.
 * Provides an API for the catch-up cron and preview tools.
 *
 * POST /render
 * {
 *   "template": "WelcomeEmail",
 *   "audienceType": "wanderer",
 *   "name": "Autumn" // optional
 * }
 *
 * Returns:
 * {
 *   "html": "<html>...</html>",
 *   "text": "Plain text version..."
 * }
 */

import * as React from "react";
import { render } from "@react-email/render";

// Import templates - synced from engine package during build
// See scripts/sync-templates.mjs
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { Day1Email } from "./templates/Day1Email";
import { Day7Email } from "./templates/Day7Email";
import { Day14Email } from "./templates/Day14Email";
import { Day30Email } from "./templates/Day30Email";
import type { AudienceType } from "./templates/types";

// =============================================================================
// Types
// =============================================================================

interface RenderRequest {
  template: string;
  audienceType: AudienceType;
  name?: string | null;
}

interface RenderResponse {
  html: string;
  text: string;
}

// =============================================================================
// Template Registry
// =============================================================================

type TemplateProps = {
  name?: string;
  audienceType: AudienceType;
};

type TemplateComponent = (props: TemplateProps) => React.ReactElement;

const TEMPLATES: Record<string, TemplateComponent> = {
  WelcomeEmail: WelcomeEmail as TemplateComponent,
  Day1Email: Day1Email as TemplateComponent,
  Day7Email: Day7Email as TemplateComponent,
  Day14Email: Day14Email as TemplateComponent,
  Day30Email: Day30Email as TemplateComponent,
};

// =============================================================================
// Worker Handler
// =============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Health check
    if (url.pathname === "/health") {
      return json({ status: "ok", templates: Object.keys(TEMPLATES) });
    }

    // Render endpoint
    if (url.pathname === "/render" && request.method === "POST") {
      return handleRender(request);
    }

    // List available templates
    if (url.pathname === "/templates" && request.method === "GET") {
      return json({
        templates: Object.keys(TEMPLATES),
        audienceTypes: ["wanderer", "promo", "rooted"],
      });
    }

    return json({ error: "Not found" }, 404);
  },
};

// =============================================================================
// Render Handler
// =============================================================================

async function handleRender(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RenderRequest;

    // Validate request
    if (!body.template) {
      return json({ error: "Missing template parameter" }, 400);
    }

    if (!body.audienceType) {
      return json({ error: "Missing audienceType parameter" }, 400);
    }

    if (!["wanderer", "promo", "rooted"].includes(body.audienceType)) {
      return json({ error: "Invalid audienceType" }, 400);
    }

    // Get template
    const Template = TEMPLATES[body.template];
    if (!Template) {
      return json(
        {
          error: `Unknown template: ${body.template}`,
          available: Object.keys(TEMPLATES),
        },
        400,
      );
    }

    // Render the template
    const element = React.createElement(Template, {
      name: body.name || undefined,
      audienceType: body.audienceType,
    });

    const html = await render(element);
    const text = await render(element, { plainText: true });

    const response: RenderResponse = { html, text };
    return json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Render error:", message);
    return json({ error: `Render failed: ${message}` }, 500);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
