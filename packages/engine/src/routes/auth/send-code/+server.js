import { json } from "@sveltejs/kit";
import { isAllowedAdmin } from "$lib/auth/session.js";

// Constants
const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const CODE_MIN = 100000;
const CODE_MAX = 999999;
const CODE_RANGE = CODE_MAX - CODE_MIN + 1;

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_EMAIL = 3; // Max 3 requests per email per minute
const MAX_REQUESTS_PER_IP = 10; // Max 10 requests per IP per minute

/**
 * Generate a cryptographically secure random 6-digit code
 * @returns {string}
 */
function generateCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % CODE_RANGE + CODE_MIN).toString();
}

/**
 * Check rate limits for email and IP
 * @param {D1Database} db
 * @param {string} email
 * @param {string} ip
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function checkRateLimit(db, email, ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  try {
    // Check email rate limit
    const emailCount = await db.prepare(
      "SELECT COUNT(*) as count FROM magic_codes WHERE email = ? AND created_at > ?"
    ).bind(email, windowStart).first();

    if (emailCount && emailCount.count >= MAX_REQUESTS_PER_EMAIL) {
      return { allowed: false, reason: "Too many requests. Please wait before requesting another code." };
    }

    // Check IP rate limit using a separate rate_limits table
    const ipCount = await db.prepare(
      "SELECT COUNT(*) as count FROM rate_limits WHERE ip_address = ? AND created_at > ?"
    ).bind(ip, windowStart).first();

    if (ipCount && ipCount.count >= MAX_REQUESTS_PER_IP) {
      return { allowed: false, reason: "Too many requests from this IP. Please try again later." };
    }

    return { allowed: true };
  } catch (error) {
    // If rate_limits table doesn't exist, allow the request but log warning
    console.warn("Rate limit check failed:", error);
    return { allowed: true };
  }
}

/**
 * Record a rate limit entry for IP tracking
 * @param {D1Database} db
 * @param {string} ip
 */
async function recordRateLimit(db, ip) {
  const now = Date.now();
  try {
    // Clean up old rate limit entries and insert new one
    await db.prepare(
      "DELETE FROM rate_limits WHERE created_at < ?"
    ).bind(now - RATE_LIMIT_WINDOW_MS).run();

    await db.prepare(
      "INSERT INTO rate_limits (ip_address, created_at) VALUES (?, ?)"
    ).bind(ip, now).run();
  } catch (error) {
    // Table might not exist yet - that's ok
    console.warn("Rate limit recording failed:", error);
  }
}

/**
 * Send magic code via Resend
 * @param {string} email
 * @param {string} code
 * @param {string} apiKey
 */
async function sendEmail(email, code, apiKey) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Autumns Grove <noreply@grove.place>",
      to: [email],
      subject: "Your login code for Autumns Grove",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #24292e; margin-bottom: 20px;">Admin Login Code</h2>
          <p style="color: #586069; margin-bottom: 20px;">
            Here's your verification code to access the Autumns Grove admin panel:
          </p>
          <div style="background: #f6f8fa; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #24292e;">
              ${code}
            </span>
          </div>
          <p style="color: #6a737d; font-size: 14px;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

export async function POST({ request, platform, getClientAddress }) {
  const env = platform?.env;

  if (!env) {
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  const { RESEND_API_KEY, ALLOWED_ADMIN_EMAILS, SESSION_SECRET, GIT_STATS_DB } = env;

  if (!RESEND_API_KEY || !ALLOWED_ADMIN_EMAILS || !SESSION_SECRET || !GIT_STATS_DB) {
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  // Get client IP for rate limiting
  const clientIP = getClientAddress();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check rate limits before processing
  const rateLimit = await checkRateLimit(GIT_STATS_DB, normalizedEmail, clientIP);
  if (!rateLimit.allowed) {
    return json({ error: rateLimit.reason }, { status: 429 });
  }

  // Record this request for IP rate limiting
  await recordRateLimit(GIT_STATS_DB, clientIP);

  // Check if email is allowed
  if (!isAllowedAdmin(normalizedEmail, ALLOWED_ADMIN_EMAILS)) {
    // Return generic message to prevent email enumeration
    return json({ success: true, message: "If this email is registered, a code has been sent." });
  }

  // Generate code
  const code = generateCode();
  const now = Date.now();
  const expiresAt = now + CODE_EXPIRATION_MS;

  // Store code in D1
  try {
    // Clean up old codes for this email
    await GIT_STATS_DB.prepare(
      "DELETE FROM magic_codes WHERE email = ? OR expires_at < ?"
    ).bind(normalizedEmail, now).run();

    // Insert new code
    await GIT_STATS_DB.prepare(
      "INSERT INTO magic_codes (email, code, created_at, expires_at, used) VALUES (?, ?, ?, ?, 0)"
    ).bind(normalizedEmail, code, now, expiresAt).run();
  } catch (error) {
    console.error("Database error:", error);
    return json({ error: "Failed to generate code" }, { status: 500 });
  }

  // Send email
  try {
    await sendEmail(normalizedEmail, code, RESEND_API_KEY);
  } catch (error) {
    console.error("Email error:", error);
    return json({ error: "Failed to send email" }, { status: 500 });
  }

  return json({ success: true, message: "If this email is registered, a code has been sent." });
}
