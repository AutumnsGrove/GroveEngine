/**
 * Circuit Breaker Tests
 *
 * Tests the circuit breaker state machine that prevents cascade failures.
 *
 * State Machine:
 *   CLOSED → (failures >= threshold) → OPEN
 *   OPEN → (cooldown passes) → HALF_OPEN
 *   HALF_OPEN → (successes >= required) → CLOSED
 *   HALF_OPEN → (failure) → OPEN
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkCircuit,
  recordSuccess,
  recordFailure,
  getCircuitState,
  resetCircuit,
  getAllCircuitStates,
} from "./circuit-breaker";
import type { CircuitBreakerConfig } from "../types";

// =============================================================================
// Test Configuration
// =============================================================================

const testConfig: CircuitBreakerConfig = {
  failureThreshold: 3,
  windowMs: 10000,
  cooldownMs: 5000,
  halfOpenRequests: 2,
};

const provider = "test-provider";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  resetCircuit(provider);
  vi.useFakeTimers();
});

// =============================================================================
// Initial State
// =============================================================================

describe("circuit breaker: initial state", () => {
  it("should start in CLOSED state", () => {
    const state = getCircuitState(provider);
    expect(state).toBe("CLOSED");
  });

  it("should allow requests when CLOSED", () => {
    const error = checkCircuit(provider, testConfig);
    expect(error).toBeNull();
  });
});

// =============================================================================
// CLOSED → OPEN Transition
// =============================================================================

describe("circuit breaker: CLOSED → OPEN", () => {
  it("should open circuit after reaching failure threshold", () => {
    // Record failures up to threshold
    recordFailure(provider, testConfig);
    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("CLOSED");

    // Third failure triggers OPEN
    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("OPEN");
  });

  it("should reject requests when OPEN", () => {
    // Trigger circuit open
    for (let i = 0; i < 3; i++) {
      recordFailure(provider, testConfig);
    }

    const error = checkCircuit(provider, testConfig);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("CIRCUIT_OPEN");
    expect(error?.retryable).toBe(true);
  });

  it("should reset failure count on success", () => {
    recordFailure(provider, testConfig);
    recordFailure(provider, testConfig);
    recordSuccess(provider, testConfig); // Reset!

    // Need full threshold again to open
    recordFailure(provider, testConfig);
    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("CLOSED");

    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("OPEN");
  });

  it("should reset failure count when window expires", () => {
    recordFailure(provider, testConfig);
    recordFailure(provider, testConfig);

    // Advance past window
    vi.advanceTimersByTime(testConfig.windowMs + 1);

    // This failure starts a new window
    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("CLOSED"); // Only 1 failure in new window

    recordFailure(provider, testConfig);
    recordFailure(provider, testConfig);
    expect(getCircuitState(provider)).toBe("OPEN");
  });
});

// =============================================================================
// OPEN → HALF_OPEN Transition
// =============================================================================

describe("circuit breaker: OPEN → HALF_OPEN", () => {
  beforeEach(() => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      recordFailure(provider, testConfig);
    }
    expect(getCircuitState(provider)).toBe("OPEN");
  });

  it("should transition to HALF_OPEN after cooldown", () => {
    // Still OPEN during cooldown
    vi.advanceTimersByTime(testConfig.cooldownMs - 1);
    checkCircuit(provider, testConfig); // Check doesn't transition, just returns error

    // Advance past cooldown and check
    vi.advanceTimersByTime(2);
    const error = checkCircuit(provider, testConfig);

    expect(error).toBeNull(); // Request allowed
    expect(getCircuitState(provider)).toBe("HALF_OPEN");
  });

  it("should allow requests in HALF_OPEN state", () => {
    vi.advanceTimersByTime(testConfig.cooldownMs);
    checkCircuit(provider, testConfig); // Trigger transition

    const error = checkCircuit(provider, testConfig);
    expect(error).toBeNull();
  });
});

// =============================================================================
// HALF_OPEN → CLOSED Transition
// =============================================================================

describe("circuit breaker: HALF_OPEN → CLOSED", () => {
  beforeEach(() => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      recordFailure(provider, testConfig);
    }
    // Transition to HALF_OPEN
    vi.advanceTimersByTime(testConfig.cooldownMs);
    checkCircuit(provider, testConfig);
    expect(getCircuitState(provider)).toBe("HALF_OPEN");
  });

  it("should close circuit after required successes", () => {
    recordSuccess(provider, testConfig);
    expect(getCircuitState(provider)).toBe("HALF_OPEN"); // Not yet

    recordSuccess(provider, testConfig);
    expect(getCircuitState(provider)).toBe("CLOSED"); // Now closed!
  });

  it("should allow normal operation after closing", () => {
    // Close the circuit
    recordSuccess(provider, testConfig);
    recordSuccess(provider, testConfig);

    // Should accept requests normally
    const error = checkCircuit(provider, testConfig);
    expect(error).toBeNull();
  });
});

// =============================================================================
// HALF_OPEN → OPEN Transition (Failure During Testing)
// =============================================================================

describe("circuit breaker: HALF_OPEN → OPEN (failure)", () => {
  beforeEach(() => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      recordFailure(provider, testConfig);
    }
    // Transition to HALF_OPEN
    vi.advanceTimersByTime(testConfig.cooldownMs);
    checkCircuit(provider, testConfig);
    expect(getCircuitState(provider)).toBe("HALF_OPEN");
  });

  it("should reopen circuit on failure during HALF_OPEN", () => {
    recordFailure(provider, testConfig);

    expect(getCircuitState(provider)).toBe("OPEN");
  });

  it("should require full cooldown after reopening", () => {
    recordFailure(provider, testConfig);

    // Should reject requests
    const error = checkCircuit(provider, testConfig);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("CIRCUIT_OPEN");
  });
});

// =============================================================================
// Monitoring
// =============================================================================

describe("circuit breaker: monitoring", () => {
  it("should return all circuit states", () => {
    // Create multiple circuits
    checkCircuit("provider-a", testConfig);
    checkCircuit("provider-b", testConfig);

    // Open one
    for (let i = 0; i < 3; i++) {
      recordFailure("provider-a", testConfig);
    }

    const states = getAllCircuitStates();

    expect(states["provider-a"]).toBe("OPEN");
    expect(states["provider-b"]).toBe("CLOSED");
  });

  it("should reset circuit to CLOSED", () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      recordFailure(provider, testConfig);
    }
    expect(getCircuitState(provider)).toBe("OPEN");

    resetCircuit(provider);

    expect(getCircuitState(provider)).toBe("CLOSED");
  });
});
