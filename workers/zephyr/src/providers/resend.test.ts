/**
 * Resend Provider Tests
 *
 * Tests the email sending logic with retries and exponential backoff.
 * Uses mocked fetch to simulate Resend API responses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ResendProvider, createResendProvider } from "./resend";
import type { ProviderRequest, RetryConfig } from "../types";

// =============================================================================
// Test Configuration
// =============================================================================

const testRequest: ProviderRequest = {
  from: "test@grove.place",
  to: "user@example.com",
  subject: "Test Email",
  html: "<p>Hello</p>",
};

const quickRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 10, // Fast retries for tests
  maxDelayMs: 100,
  backoffMultiplier: 2,
};

// =============================================================================
// Mock Helpers
// =============================================================================

function mockFetch(
  responses: Array<{
    ok: boolean;
    status: number;
    json: () => Promise<Record<string, unknown>>;
  }>,
) {
  let callIndex = 0;

  return vi.fn(async () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return response;
  });
}

function successResponse(messageId = "msg_123") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ id: messageId }),
  };
}

function errorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// =============================================================================
// Successful Send
// =============================================================================

describe("ResendProvider: successful send", () => {
  it("should send email and return message ID", async () => {
    const fetchMock = mockFetch([successResponse("msg_abc123")]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key");
    const result = await provider.send(testRequest);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_abc123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should include all request fields in API call", async () => {
    const fetchMock = mockFetch([successResponse()]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key");
    await provider.send({
      ...testRequest,
      text: "Plain text version",
      replyTo: "reply@example.com",
      scheduledAt: "2026-01-15T10:00:00Z",
      tags: ["transactional", "test"],
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(url).toBe("https://api.resend.com/emails");
    expect(body.from).toBe("test@grove.place");
    expect(body.to).toBe("user@example.com");
    expect(body.text).toBe("Plain text version");
    expect(body.reply_to).toBe("reply@example.com");
    expect(body.scheduled_at).toBe("2026-01-15T10:00:00Z");
    expect(body.tags).toEqual([{ name: "transactional" }, { name: "test" }]);
  });

  it("should include authorization header", async () => {
    const fetchMock = mockFetch([successResponse()]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("my-secret-api-key");
    await provider.send(testRequest);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBe(
      "Bearer my-secret-api-key",
    );
  });
});

// =============================================================================
// Non-Retryable Errors (4xx)
// =============================================================================

describe("ResendProvider: non-retryable errors", () => {
  it("should not retry 400 Bad Request", async () => {
    const fetchMock = mockFetch([errorResponse(400, "Invalid email address")]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const result = await provider.send(testRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email address");
    expect(result.statusCode).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
  });

  it("should not retry 401 Unauthorized", async () => {
    const fetchMock = mockFetch([errorResponse(401, "Invalid API key")]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("bad-api-key", quickRetryConfig);
    const result = await provider.send(testRequest);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should not retry 422 Unprocessable Entity", async () => {
    const fetchMock = mockFetch([
      errorResponse(422, "Missing required field: to"),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const result = await provider.send(testRequest);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(422);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should not retry 429 Rate Limit (treated as client error)", async () => {
    // Note: In a real implementation, 429 might be retryable with backoff
    // This test documents current behavior
    const fetchMock = mockFetch([errorResponse(429, "Rate limit exceeded")]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const result = await provider.send(testRequest);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Retryable Errors (5xx)
// =============================================================================

describe("ResendProvider: retryable errors", () => {
  it("should retry 500 Internal Server Error", async () => {
    const fetchMock = mockFetch([
      errorResponse(500, "Internal error"),
      errorResponse(500, "Still broken"),
      successResponse("msg_recovered"),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);

    // Start the send (will wait on first retry delay)
    const resultPromise = provider.send(testRequest);

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);
    await vi.advanceTimersByTimeAsync(
      quickRetryConfig.baseDelayMs * quickRetryConfig.backoffMultiplier,
    );

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_recovered");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should retry 502 Bad Gateway", async () => {
    const fetchMock = mockFetch([
      errorResponse(502, "Bad Gateway"),
      successResponse(),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should retry 503 Service Unavailable", async () => {
    const fetchMock = mockFetch([
      errorResponse(503, "Service Unavailable"),
      successResponse(),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should fail after max retries exhausted", async () => {
    const fetchMock = mockFetch([
      errorResponse(500, "Error 1"),
      errorResponse(500, "Error 2"),
      errorResponse(500, "Error 3"),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);
    await vi.advanceTimersByTimeAsync(
      quickRetryConfig.baseDelayMs * quickRetryConfig.backoffMultiplier,
    );

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error 3"); // Last error message
    expect(result.statusCode).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should return 'Max retries exceeded' if no error message", async () => {
    const fetchMock = mockFetch([
      { ok: false, status: 500, json: async () => ({}) },
      { ok: false, status: 500, json: async () => ({}) },
      { ok: false, status: 500, json: async () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);
    await vi.advanceTimersByTimeAsync(
      quickRetryConfig.baseDelayMs * quickRetryConfig.backoffMultiplier,
    );

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 500");
  });
});

// =============================================================================
// Network Errors
// =============================================================================

describe("ResendProvider: network errors", () => {
  it("should retry on fetch failure", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Network error");
      }
      return successResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    await vi.advanceTimersByTimeAsync(quickRetryConfig.baseDelayMs);
    await vi.advanceTimersByTimeAsync(
      quickRetryConfig.baseDelayMs * quickRetryConfig.backoffMultiplier,
    );

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should fail after network errors exceed retries", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("Connection refused");
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResendProvider("test-api-key", quickRetryConfig);
    const resultPromise = provider.send(testRequest);

    // Run all timers to completion (handles all retry delays)
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection refused");
  });
});

// =============================================================================
// Exponential Backoff
// =============================================================================

describe("ResendProvider: exponential backoff", () => {
  it("should increase delay exponentially", async () => {
    const fetchMock = mockFetch([
      errorResponse(500, "Error"),
      errorResponse(500, "Error"),
      successResponse(),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const config: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    };

    const provider = createResendProvider("test-api-key", config);

    const sendPromise = provider.send(testRequest);

    // First call happens immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // After first delay (100ms base)
    await vi.advanceTimersByTimeAsync(120); // Slightly more for jitter
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // After second delay (200ms = 100 * 2^1)
    await vi.advanceTimersByTimeAsync(220);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const result = await sendPromise;
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Provider Factory
// =============================================================================

describe("createResendProvider", () => {
  it("should create provider with API key", () => {
    const provider = createResendProvider("my-api-key");

    expect(provider).toBeInstanceOf(ResendProvider);
    expect(provider.name).toBe("resend");
  });

  it("should accept custom retry config", () => {
    const customConfig: Partial<RetryConfig> = {
      maxAttempts: 5,
      baseDelayMs: 500,
    };

    const provider = createResendProvider("my-api-key", customConfig);

    expect(provider).toBeInstanceOf(ResendProvider);
  });
});

// =============================================================================
// Health Check
// =============================================================================

describe("ResendProvider: health check", () => {
  it("should return true when API is reachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 401 })), // 401 is expected, but connection worked
    );

    const provider = createResendProvider("test-api-key");
    const healthy = await provider.isHealthy();

    expect(healthy).toBe(true);
  });

  it("should return false when API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network error");
      }),
    );

    const provider = createResendProvider("test-api-key");
    const healthy = await provider.isHealthy();

    expect(healthy).toBe(false);
  });
});
