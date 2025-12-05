import { json } from "@sveltejs/kit";
import { createSession, createSessionCookie } from "$lib/auth/session.js";

// Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ARTIFICIAL_DELAY_MS = 100; // Constant delay for timing attack protection

/**
 * @typedef {Object} MagicCode
 * @property {number} id
 * @property {string} email
 * @property {string} code
 * @property {number} created_at
 * @property {number} expires_at
 * @property {number} used
 */

/**
 * @typedef {Object} FailedAttempt
 * @property {number} id
 * @property {string} email
 * @property {number} attempts
 * @property {number} last_attempt
 * @property {number} locked_until
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    b = a;
  }
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Add artificial delay for timing attack protection
 * @returns {Promise<void>}
 */
async function artificialDelay() {
  return new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
}

/**
 * Check if email is locked out due to failed attempts
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<{locked: boolean, remainingMs?: number}>}
 */
async function checkLockout(db, email) {
  try {
    /** @type {FailedAttempt | null} */
    const attempt = await db
      .prepare("SELECT * FROM failed_attempts WHERE email = ?")
      .bind(email)
      .first();

    if (!attempt) {
      return { locked: false };
    }

    const now = Date.now();
    if (attempt.locked_until && attempt.locked_until > now) {
      return { locked: true, remainingMs: attempt.locked_until - now };
    }

    return { locked: false };
  } catch (error) {
    // Table might not exist
    console.warn("Lockout check failed:", error);
    return { locked: false };
  }
}

/**
 * Record a failed verification attempt
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<{locked: boolean}>}
 */
async function recordFailedAttempt(db, email) {
  const now = Date.now();

  try {
    /** @type {FailedAttempt | null} */
    const existing = await db
      .prepare("SELECT * FROM failed_attempts WHERE email = ?")
      .bind(email)
      .first();

    if (existing) {
      const newAttempts = existing.attempts + 1;
      const lockedUntil =
        newAttempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null;

      await db
        .prepare(
          "UPDATE failed_attempts SET attempts = ?, last_attempt = ?, locked_until = ? WHERE email = ?",
        )
        .bind(newAttempts, now, lockedUntil, email)
        .run();

      return { locked: newAttempts >= MAX_FAILED_ATTEMPTS };
    } else {
      await db
        .prepare(
          "INSERT INTO failed_attempts (email, attempts, last_attempt, locked_until) VALUES (?, 1, ?, NULL)",
        )
        .bind(email, now)
        .run();

      return { locked: false };
    }
  } catch (error) {
    console.warn("Failed attempt recording failed:", error);
    return { locked: false };
  }
}

/**
 * Clear failed attempts after successful verification
 * @param {D1Database} db
 * @param {string} email
 */
async function clearFailedAttempts(db, email) {
  try {
    await db
      .prepare("DELETE FROM failed_attempts WHERE email = ?")
      .bind(email)
      .run();
  } catch (error) {
    console.warn("Failed to clear attempts:", error);
  }
}

export async function POST({ request, platform, url }) {
  const env = platform?.env;

  if (!env) {
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  const { SESSION_SECRET, GIT_STATS_DB } = env;

  if (!SESSION_SECRET || !GIT_STATS_DB) {
    return json({ error: "Server configuration error" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, code } = body;

  if (!email || typeof email !== "string") {
    return json({ error: "Email is required" }, { status: 400 });
  }

  if (!code || typeof code !== "string") {
    return json({ error: "Code is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  // Validate code format
  if (!/^\d{6}$/.test(normalizedCode)) {
    return json({ error: "Invalid code format" }, { status: 400 });
  }

  // Check if email is locked out
  const lockout = await checkLockout(GIT_STATS_DB, normalizedEmail);
  if (lockout.locked) {
    const minutes = Math.ceil((lockout.remainingMs || 0) / 60000);
    return json(
      {
        error: `Too many failed attempts. Please try again in ${minutes} minute(s).`,
      },
      { status: 429 },
    );
  }

  const now = Date.now();

  // Look up code in database
  /** @type {MagicCode | null} */
  let result;
  try {
    result = await GIT_STATS_DB.prepare(
      "SELECT * FROM magic_codes WHERE email = ? AND used = 0 AND expires_at > ?",
    )
      .bind(normalizedEmail, now)
      .first();
  } catch (error) {
    console.error("Database error:", error);
    return json({ error: "Verification failed" }, { status: 500 });
  }

  // Apply artificial delay and constant-time comparison
  await artificialDelay();

  // Check if code matches using constant-time comparison
  const codeMatches =
    result && constantTimeCompare(result.code, normalizedCode);

  if (!result || !codeMatches) {
    // Record failed attempt
    const { locked } = await recordFailedAttempt(GIT_STATS_DB, normalizedEmail);

    if (locked) {
      return json(
        {
          error: `Too many failed attempts. Please try again in 15 minutes.`,
        },
        { status: 429 },
      );
    }

    return json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Mark code as used and clear failed attempts
  try {
    const updateResult = await GIT_STATS_DB.prepare(
      "UPDATE magic_codes SET used = 1 WHERE id = ? AND used = 0",
    )
      .bind(result.id)
      .run();

    if (!updateResult.meta?.changes || updateResult.meta.changes === 0) {
      // Code was already used (race condition)
      return json({ error: "Code has already been used" }, { status: 400 });
    }

    // Clear failed attempts on successful verification
    await clearFailedAttempts(GIT_STATS_DB, normalizedEmail);
  } catch (error) {
    console.error("Database error:", error);
    return json({ error: "Verification failed" }, { status: 500 });
  }

  // Create session
  const user = { email: normalizedEmail };
  const token = await createSession(user, SESSION_SECRET);

  // Determine if production
  const isProduction =
    url.hostname !== "localhost" && !url.hostname.includes("127.0.0.1");
  const cookie = createSessionCookie(token, isProduction);

  return json(
    { success: true, redirect: "/admin" },
    {
      headers: {
        "Set-Cookie": cookie,
      },
    },
  );
}
