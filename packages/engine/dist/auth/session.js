/**
 * Session management utilities
 */

import { signJwt, verifyJwt } from "./jwt.js";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a session token for a user
 * @param {Object} user - User data
 * @param {string} user.email - User email address
 * @param {string} secret - Session secret
 * @returns {Promise<string>} - Signed JWT token
 */
export async function createSession(user, secret) {
  const payload = {
    sub: user.email,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  return await signJwt(payload, secret);
}

/**
 * Verify a session token and return user data
 * @param {string} token - Session token
 * @param {string} secret - Session secret
 * @returns {Promise<Object|null>} - User data or null if invalid
 */
export async function verifySession(token, secret) {
  const payload = await verifyJwt(token, secret);

  if (!payload) {
    return null;
  }

  return {
    email: payload.email,
  };
}

/**
 * Create Set-Cookie header value for session
 * @param {string} token - Session token
 * @param {boolean} isProduction - Whether in production (for secure flag)
 * @returns {string} - Cookie header value
 */
export function createSessionCookie(token, isProduction = true) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Create Set-Cookie header value to clear session
 * @returns {string} - Cookie header value
 */
export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/**
 * Parse session token from cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {string|null} - Session token or null
 */
export function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Check if an email is in the allowed admin list
 * @param {string} email - Email address to check
 * @param {string} allowedList - Comma-separated list of allowed emails
 * @returns {boolean} - Whether the user is allowed
 */
export function isAllowedAdmin(email, allowedList) {
  const allowed = allowedList.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}
