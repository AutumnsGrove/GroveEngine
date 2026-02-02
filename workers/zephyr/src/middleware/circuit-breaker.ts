/**
 * Circuit Breaker Implementation
 *
 * Prevents cascade failures by temporarily blocking requests
 * to unhealthy providers.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Too many failures, requests fail fast
 * - HALF_OPEN: Testing if provider has recovered
 */

import type { CircuitBreakerConfig, CircuitState, ZephyrError } from "../types";
import { DEFAULT_CIRCUIT_CONFIG } from "../types";
import { circuitOpen } from "../errors";

/**
 * In-memory circuit breaker state.
 *
 * Note: In a multi-instance deployment, consider using KV
 * for shared state. For now, per-isolate state is acceptable
 * as Cloudflare Workers typically route requests consistently.
 */
interface CircuitMemory {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
  openedAt: number;
  halfOpenSuccesses: number;
}

const circuits: Map<string, CircuitMemory> = new Map();

/**
 * Get or create circuit state for a provider.
 */
function getCircuit(provider: string): CircuitMemory {
  let circuit = circuits.get(provider);

  if (!circuit) {
    circuit = {
      state: "CLOSED",
      failures: 0,
      lastFailureAt: 0,
      openedAt: 0,
      halfOpenSuccesses: 0,
    };
    circuits.set(provider, circuit);
  }

  return circuit;
}

/**
 * Check if a request should be allowed through the circuit.
 *
 * @returns null if allowed, or a ZephyrError if circuit is open
 */
export function checkCircuit(
  provider: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
): ZephyrError | null {
  const circuit = getCircuit(provider);
  const now = Date.now();

  switch (circuit.state) {
    case "CLOSED":
      // Check if we should reset failure count (window expired)
      if (now - circuit.lastFailureAt > config.windowMs) {
        circuit.failures = 0;
      }
      return null;

    case "OPEN":
      // Check if cooldown has passed
      if (now - circuit.openedAt >= config.cooldownMs) {
        // Transition to half-open
        circuit.state = "HALF_OPEN";
        circuit.halfOpenSuccesses = 0;
        return null;
      }

      // Still in cooldown, reject request
      const opensAt = new Date(
        circuit.openedAt + config.cooldownMs,
      ).toISOString();
      return circuitOpen(provider, opensAt);

    case "HALF_OPEN":
      // Allow limited requests through for testing
      return null;
  }
}

/**
 * Record a successful request.
 */
export function recordSuccess(
  provider: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
): void {
  const circuit = getCircuit(provider);

  switch (circuit.state) {
    case "CLOSED":
      // Reset failure count on success
      circuit.failures = 0;
      break;

    case "HALF_OPEN":
      // Count successes to potentially close circuit
      circuit.halfOpenSuccesses++;

      if (circuit.halfOpenSuccesses >= config.halfOpenRequests) {
        // Provider recovered, close circuit
        circuit.state = "CLOSED";
        circuit.failures = 0;
        circuit.halfOpenSuccesses = 0;
      }
      break;

    case "OPEN":
      // Shouldn't happen, but reset if it does
      circuit.state = "CLOSED";
      circuit.failures = 0;
      break;
  }
}

/**
 * Record a failed request.
 */
export function recordFailure(
  provider: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
): void {
  const circuit = getCircuit(provider);
  const now = Date.now();

  switch (circuit.state) {
    case "CLOSED":
      // Check if we're in a new window
      if (now - circuit.lastFailureAt > config.windowMs) {
        circuit.failures = 0;
      }

      circuit.failures++;
      circuit.lastFailureAt = now;

      // Check if we should open the circuit
      if (circuit.failures >= config.failureThreshold) {
        circuit.state = "OPEN";
        circuit.openedAt = now;
      }
      break;

    case "HALF_OPEN":
      // Failure during testing, reopen circuit
      circuit.state = "OPEN";
      circuit.openedAt = now;
      circuit.halfOpenSuccesses = 0;
      break;

    case "OPEN":
      // Already open, just update timestamp
      circuit.lastFailureAt = now;
      break;
  }
}

/**
 * Get the current state of a circuit (for monitoring).
 */
export function getCircuitState(provider: string): CircuitState {
  return getCircuit(provider).state;
}

/**
 * Force reset a circuit (for admin/testing).
 */
export function resetCircuit(provider: string): void {
  circuits.delete(provider);
}

/**
 * Get all circuit states (for monitoring dashboard).
 */
export function getAllCircuitStates(): Record<string, CircuitState> {
  const states: Record<string, CircuitState> = {};

  for (const [provider, circuit] of circuits) {
    states[provider] = circuit.state;
  }

  return states;
}
