/**
 * Vista Observability — Threshold API Input Validation Tests
 *
 * Tests the validation logic used by POST /api/admin/observability/thresholds.
 *
 * The validation rules are extracted here from the route handler and tested
 * as a pure function. This documents the contract and guards against regressions
 * if the validation logic is ever moved or refactored.
 *
 * See: libs/engine/src/routes/api/admin/observability/thresholds/+server.ts
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Extracted validation logic (mirrors the POST handler exactly)
// =============================================================================

const VALID_OPERATORS = ["gt", "lt", "gte", "lte", "eq"] as const;
const VALID_SEVERITIES = ["info", "warning", "critical"] as const;

type ValidationError =
	| { code: "MISSING_FIELDS" }
	| { code: "INVALID_SERVICE_NAME"; reason: string }
	| { code: "INVALID_METRIC_TYPE"; reason: string }
	| { code: "INVALID_OPERATOR"; reason: string }
	| { code: "INVALID_THRESHOLD_VALUE"; reason: string }
	| { code: "INVALID_SEVERITY"; reason: string };

type ValidationResult =
	| {
			ok: true;
			serviceName: string;
			metricType: string;
			operator: string;
			thresholdValue: number;
			severity: string;
	  }
	| { ok: false; error: ValidationError; status: 400 };

function validateThresholdPayload(body: unknown): ValidationResult {
	if (
		typeof body !== "object" ||
		body === null ||
		!("serviceName" in body) ||
		!("metricType" in body) ||
		!("operator" in body) ||
		!("thresholdValue" in body) ||
		!("severity" in body)
	) {
		return { ok: false, error: { code: "MISSING_FIELDS" }, status: 400 };
	}

	const { serviceName, metricType, operator, thresholdValue, severity } = body as Record<
		string,
		unknown
	>;

	if (typeof serviceName !== "string" || !serviceName.trim()) {
		return {
			ok: false,
			error: { code: "INVALID_SERVICE_NAME", reason: "serviceName must be a non-empty string." },
			status: 400,
		};
	}
	if (serviceName.length > 100) {
		return {
			ok: false,
			error: {
				code: "INVALID_SERVICE_NAME",
				reason: "serviceName must not exceed 100 characters.",
			},
			status: 400,
		};
	}
	if (typeof metricType !== "string" || !metricType.trim()) {
		return {
			ok: false,
			error: { code: "INVALID_METRIC_TYPE", reason: "metricType must be a non-empty string." },
			status: 400,
		};
	}
	if (metricType.length > 100) {
		return {
			ok: false,
			error: { code: "INVALID_METRIC_TYPE", reason: "metricType must not exceed 100 characters." },
			status: 400,
		};
	}
	if (
		typeof operator !== "string" ||
		!VALID_OPERATORS.includes(operator as (typeof VALID_OPERATORS)[number])
	) {
		return {
			ok: false,
			error: {
				code: "INVALID_OPERATOR",
				reason: `operator must be one of: ${VALID_OPERATORS.join(", ")}.`,
			},
			status: 400,
		};
	}
	if (typeof thresholdValue !== "number" || isNaN(thresholdValue) || !isFinite(thresholdValue)) {
		return {
			ok: false,
			error: { code: "INVALID_THRESHOLD_VALUE", reason: "thresholdValue must be a finite number." },
			status: 400,
		};
	}
	if (
		typeof severity !== "string" ||
		!VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])
	) {
		return {
			ok: false,
			error: {
				code: "INVALID_SEVERITY",
				reason: `severity must be one of: ${VALID_SEVERITIES.join(", ")}.`,
			},
			status: 400,
		};
	}

	return {
		ok: true,
		serviceName,
		metricType,
		operator,
		thresholdValue,
		severity,
	};
}

// =============================================================================
// Helper: valid payload
// =============================================================================

function validPayload(overrides: Record<string, unknown> = {}) {
	return {
		serviceName: "grove-engine",
		metricType: "error_rate",
		operator: "gt",
		thresholdValue: 0.05,
		severity: "warning",
		...overrides,
	};
}

// =============================================================================
// Narrowing helpers (avoids no-conditional-expect lint violations)
// =============================================================================

/** Assert result is an error and return the narrowed type for further assertions */
function expectError(result: ValidationResult) {
	expect(result.ok).toBe(false);
	if (!result.ok) return result;
	throw new Error("unreachable");
}

/** Assert result is success and return the narrowed type */
function expectOk(result: ValidationResult) {
	expect(result.ok).toBe(true);
	if (result.ok) return result;
	throw new Error("unreachable");
}

// =============================================================================
// Tests: missing required fields
// =============================================================================

describe("threshold validation — missing fields", () => {
	it("rejects null body", () => {
		const result = validateThresholdPayload(null);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects non-object body (string)", () => {
		const result = validateThresholdPayload("not-an-object");
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects empty object", () => {
		const result = validateThresholdPayload({});
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects when serviceName is missing", () => {
		const { serviceName: _, ...payload } = validPayload();
		const result = validateThresholdPayload(payload);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects when metricType is missing", () => {
		const { metricType: _, ...payload } = validPayload();
		const result = validateThresholdPayload(payload);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects when operator is missing", () => {
		const { operator: _, ...payload } = validPayload();
		const result = validateThresholdPayload(payload);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects when thresholdValue is missing", () => {
		const { thresholdValue: _, ...payload } = validPayload();
		const result = validateThresholdPayload(payload);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("rejects when severity is missing", () => {
		const { severity: _, ...payload } = validPayload();
		const result = validateThresholdPayload(payload);
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});
});

// =============================================================================
// Tests: serviceName validation
// =============================================================================

describe("threshold validation — serviceName", () => {
	it("rejects empty string serviceName", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: "" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});

	it("rejects whitespace-only serviceName", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: "   " }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});

	it("rejects serviceName exceeding 100 characters", () => {
		const longName = "a".repeat(101);
		const result = validateThresholdPayload(validPayload({ serviceName: longName }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});

	it("accepts serviceName of exactly 100 characters", () => {
		const maxName = "a".repeat(100);
		const result = validateThresholdPayload(validPayload({ serviceName: maxName }));
		expect(result.ok).toBe(true);
	});

	it("rejects numeric serviceName", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: 123 }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});

	it("rejects null serviceName", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: null }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});

	it("accepts a normal service name", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: "grove-heartwood" }));
		const ok = expectOk(result);
		expect(ok.serviceName).toBe("grove-heartwood");
	});
});

// =============================================================================
// Tests: metricType validation
// =============================================================================

describe("threshold validation — metricType", () => {
	it("rejects empty string metricType", () => {
		const result = validateThresholdPayload(validPayload({ metricType: "" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_METRIC_TYPE");
	});

	it("rejects whitespace-only metricType", () => {
		const result = validateThresholdPayload(validPayload({ metricType: "  " }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_METRIC_TYPE");
	});

	it("rejects metricType exceeding 100 characters", () => {
		const longType = "x".repeat(101);
		const result = validateThresholdPayload(validPayload({ metricType: longType }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_METRIC_TYPE");
	});

	it("accepts metricType of exactly 100 characters", () => {
		const maxType = "m".repeat(100);
		const result = validateThresholdPayload(validPayload({ metricType: maxType }));
		expect(result.ok).toBe(true);
	});

	it("accepts typical metric type names", () => {
		for (const metricType of ["error_rate", "p99_latency_ms", "requests_per_second", "cost_usd"]) {
			const result = validateThresholdPayload(validPayload({ metricType }));
			expect(result.ok).toBe(true);
		}
	});
});

// =============================================================================
// Tests: operator validation
// =============================================================================

describe("threshold validation — operator", () => {
	it("accepts all valid operators", () => {
		for (const operator of ["gt", "lt", "gte", "lte", "eq"]) {
			const result = validateThresholdPayload(validPayload({ operator }));
			const ok = expectOk(result);
			expect(ok.operator).toBe(operator);
		}
	});

	it("rejects unknown operator", () => {
		const result = validateThresholdPayload(validPayload({ operator: "ne" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_OPERATOR");
	});

	it("rejects empty string operator", () => {
		const result = validateThresholdPayload(validPayload({ operator: "" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_OPERATOR");
	});

	it("rejects operator with wrong case (GT instead of gt)", () => {
		const result = validateThresholdPayload(validPayload({ operator: "GT" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_OPERATOR");
	});

	it("rejects numeric operator", () => {
		const result = validateThresholdPayload(validPayload({ operator: 1 }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_OPERATOR");
	});

	it("rejects operator with extra spaces", () => {
		const result = validateThresholdPayload(validPayload({ operator: " gt" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_OPERATOR");
	});
});

// =============================================================================
// Tests: thresholdValue validation
// =============================================================================

describe("threshold validation — thresholdValue", () => {
	it("rejects NaN thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: NaN }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_THRESHOLD_VALUE");
	});

	it("rejects Infinity thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: Infinity }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_THRESHOLD_VALUE");
	});

	it("rejects -Infinity thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: -Infinity }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_THRESHOLD_VALUE");
	});

	it("rejects string thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: "0.5" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_THRESHOLD_VALUE");
	});

	it("rejects null thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: null }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_THRESHOLD_VALUE");
	});

	it("accepts zero thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: 0 }));
		const ok = expectOk(result);
		expect(ok.thresholdValue).toBe(0);
	});

	it("accepts negative thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: -100 }));
		const ok = expectOk(result);
		expect(ok.thresholdValue).toBe(-100);
	});

	it("accepts float thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: 0.0001 }));
		const ok = expectOk(result);
		expect(ok.thresholdValue).toBeCloseTo(0.0001);
	});

	it("accepts large thresholdValue", () => {
		const result = validateThresholdPayload(validPayload({ thresholdValue: 1_000_000_000 }));
		const ok = expectOk(result);
		expect(ok.thresholdValue).toBe(1_000_000_000);
	});
});

// =============================================================================
// Tests: severity validation
// =============================================================================

describe("threshold validation — severity", () => {
	it("accepts 'info' severity", () => {
		const result = validateThresholdPayload(validPayload({ severity: "info" }));
		const ok = expectOk(result);
		expect(ok.severity).toBe("info");
	});

	it("accepts 'warning' severity", () => {
		const result = validateThresholdPayload(validPayload({ severity: "warning" }));
		const ok = expectOk(result);
		expect(ok.severity).toBe("warning");
	});

	it("accepts 'critical' severity", () => {
		const result = validateThresholdPayload(validPayload({ severity: "critical" }));
		const ok = expectOk(result);
		expect(ok.severity).toBe("critical");
	});

	it("rejects 'error' severity (not in enum)", () => {
		const result = validateThresholdPayload(validPayload({ severity: "error" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SEVERITY");
	});

	it("rejects 'high' severity (not in enum)", () => {
		const result = validateThresholdPayload(validPayload({ severity: "high" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SEVERITY");
	});

	it("rejects empty string severity", () => {
		const result = validateThresholdPayload(validPayload({ severity: "" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SEVERITY");
	});

	it("rejects severity with wrong case", () => {
		const result = validateThresholdPayload(validPayload({ severity: "Warning" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SEVERITY");
	});

	it("rejects numeric severity", () => {
		const result = validateThresholdPayload(validPayload({ severity: 1 }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SEVERITY");
	});
});

// =============================================================================
// Tests: valid complete payloads
// =============================================================================

describe("threshold validation — valid payloads", () => {
	it("accepts a fully valid payload", () => {
		const payload = {
			serviceName: "grove-engine",
			metricType: "error_rate",
			operator: "gt",
			thresholdValue: 0.05,
			severity: "warning",
		};
		const result = validateThresholdPayload(payload);
		const ok = expectOk(result);
		expect(ok.serviceName).toBe("grove-engine");
		expect(ok.metricType).toBe("error_rate");
		expect(ok.operator).toBe("gt");
		expect(ok.thresholdValue).toBe(0.05);
		expect(ok.severity).toBe("warning");
	});

	it("ignores extra fields beyond the required 5", () => {
		const payload = {
			serviceName: "grove-heartwood",
			metricType: "auth_failure_rate",
			operator: "gte",
			thresholdValue: 0.1,
			severity: "critical",
			extra: "ignored",
			id: 42,
		};
		const result = validateThresholdPayload(payload);
		expect(result.ok).toBe(true);
	});

	it("accepts all operator + severity combinations", () => {
		const operators = ["gt", "lt", "gte", "lte", "eq"];
		const severities = ["info", "warning", "critical"];

		for (const operator of operators) {
			for (const severity of severities) {
				const result = validateThresholdPayload(validPayload({ operator, severity }));
				expect(result.ok).toBe(true);
			}
		}
	});
});

// =============================================================================
// Tests: validation ordering (first failing field wins)
// =============================================================================

describe("threshold validation — error priority ordering", () => {
	it("reports MISSING_FIELDS before INVALID_SERVICE_NAME when multiple issues exist", () => {
		// Missing metricType AND bad serviceName — should report MISSING_FIELDS first
		const result = validateThresholdPayload({
			serviceName: "",
			operator: "gt",
			thresholdValue: 5,
			severity: "info",
			// metricType omitted
		});
		const err = expectError(result);
		expect(err.error.code).toBe("MISSING_FIELDS");
	});

	it("reports INVALID_SERVICE_NAME before INVALID_OPERATOR when serviceName invalid", () => {
		const result = validateThresholdPayload(validPayload({ serviceName: "", operator: "invalid" }));
		const err = expectError(result);
		expect(err.error.code).toBe("INVALID_SERVICE_NAME");
	});
});
