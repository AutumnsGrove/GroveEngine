import { ImageResponse } from "workers-og";

export interface Env {
  ENVIRONMENT: string;
}

// HTML escape for security
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Validate hex color
function isValidHex(hex: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(hex);
}

// Font cache (Workers have warm instances)
let fontCache: ArrayBuffer | null = null;

async function getFont(ctx: ExecutionContext): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;

  // Fetch Lexend font from Grove CDN
  const fontUrl = "https://cdn.grove.place/fonts/Lexend-Regular.ttf";

  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.status}`);
  }

  fontCache = await response.arrayBuffer();
  return fontCache;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // CORS headers for cross-origin requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle GET requests to root or /og
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname !== "/" && url.pathname !== "/og") {
      return new Response("Not found", { status: 404 });
    }

    try {
      // Parse query params
      const rawTitle = url.searchParams.get("title") || "Grove";
      const rawSubtitle = url.searchParams.get("subtitle") || "A place to Be.";
      const rawAccent = url.searchParams.get("accent") || "16a34a";

      // Sanitize and truncate
      const title = escapeHtml(rawTitle.slice(0, 100));
      const subtitle = escapeHtml(rawSubtitle.slice(0, 200));
      const accent = isValidHex(rawAccent) ? rawAccent : "16a34a";

      // Load font
      const fontData = await getFont(ctx);

      // Generate OG image HTML
      const html = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); padding: 60px; font-family: 'Lexend', sans-serif;">
          <!-- Decorative accent bar -->
          <div style="display: flex; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #${accent}, #${accent}88, #${accent});"></div>

          <!-- Main content -->
          <div style="display: flex; flex-direction: column; flex: 1; justify-content: center; align-items: flex-start;">
            <!-- Logo mark -->
            <div style="display: flex; align-items: center; margin-bottom: 40px;">
              <svg width="48" height="48" viewBox="0 0 417 512" fill="#${accent}">
                <path d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
                <path d="M0 173.468h126.068l-89.622-85.44L97.58 26.195l89.622 85.44V0h42.232v111.635l89.622-85.44 61.134 61.833-89.622 85.44H417v42.232H290.57l89.621 85.439-61.133 61.834-89.622-85.44v111.635h-42.232V277.533l-89.622 85.44-61.134-61.834 89.622-85.44H0v-42.23z"/>
              </svg>
              <span style="display: flex; margin-left: 16px; font-size: 32px; font-weight: 600; color: #${accent};">Grove</span>
            </div>

            <!-- Title -->
            <h1 style="display: flex; font-size: 64px; font-weight: 700; color: #f8fafc; margin: 0 0 20px 0; line-height: 1.1; max-width: 900px;">
              ${title}
            </h1>

            <!-- Subtitle -->
            <p style="display: flex; font-size: 28px; color: #94a3b8; margin: 0; line-height: 1.4; max-width: 800px;">
              ${subtitle}
            </p>
          </div>

          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px;">
            <span style="display: flex; font-size: 20px; color: #64748b;">grove.place</span>
            <div style="display: flex; width: 12px; height: 12px; border-radius: 50%; background: #${accent};"></div>
          </div>
        </div>
      `;

      const response = new ImageResponse(html, {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Lexend",
            data: fontData,
            weight: 400,
            style: "normal",
          },
        ],
      });

      // Add custom headers
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
      headers.set("X-Generated-At", new Date().toISOString());
      headers.set("X-OG-Status", "dynamic");
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("OG generation error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to generate image",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }
  },
};
