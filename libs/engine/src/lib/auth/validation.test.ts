/**
 * GroveAuth Validation Tests
 *
 * Tests for authentication validation utilities.
 */

import { describe, it, expect } from "vitest";
import { isValidTotpCode, getRequiredEnv, TOTP_CODE_LENGTH, TOTP_CODE_REGEX } from "./validation";

// ==========================================================================
// TOTP Validation
// ==========================================================================

describe("TOTP Constants", () => {
	it("should have correct code length", () => {
		expect(TOTP_CODE_LENGTH).toBe(6);
	});

	it("should have regex matching 6 digits", () => {
		expect(TOTP_CODE_REGEX.test("123456")).toBe(true);
		expect(TOTP_CODE_REGEX.test("12345")).toBe(false);
		expect(TOTP_CODE_REGEX.test("1234567")).toBe(false);
	});
});

describe("isValidTotpCode", () => {
	describe("valid codes", () => {
		it("should accept 6-digit numeric string", () => {
			expect(isValidTotpCode("123456")).toBe(true);
		});

		it("should accept all zeros", () => {
			expect(isValidTotpCode("000000")).toBe(true);
		});

		it("should accept all nines", () => {
			expect(isValidTotpCode("999999")).toBe(true);
		});

		it("should accept leading zeros", () => {
			expect(isValidTotpCode("012345")).toBe(true);
		});
	});

	describe("invalid codes", () => {
		it("should reject undefined", () => {
			expect(isValidTotpCode(undefined)).toBe(false);
		});

		it("should reject empty string", () => {
			expect(isValidTotpCode("")).toBe(false);
		});

		it("should reject too short (5 digits)", () => {
			expect(isValidTotpCode("12345")).toBe(false);
		});

		it("should reject too long (7 digits)", () => {
			expect(isValidTotpCode("1234567")).toBe(false);
		});

		it("should reject letters", () => {
			expect(isValidTotpCode("12345a")).toBe(false);
			expect(isValidTotpCode("abcdef")).toBe(false);
		});

		it("should reject special characters", () => {
			expect(isValidTotpCode("12345!")).toBe(false);
			expect(isValidTotpCode("123-56")).toBe(false);
		});

		it("should reject spaces", () => {
			expect(isValidTotpCode("123 56")).toBe(false);
			expect(isValidTotpCode(" 23456")).toBe(false);
			expect(isValidTotpCode("12345 ")).toBe(false);
		});

		it("should reject decimal points", () => {
			expect(isValidTotpCode("1234.5")).toBe(false);
		});

		it("should reject negative signs", () => {
			expect(isValidTotpCode("-12345")).toBe(false);
		});
	});

	describe("type narrowing", () => {
		it("should narrow type after validation", () => {
			const code: string | undefined = "123456";
			if (isValidTotpCode(code)) {
				// TypeScript should know code is string here
				const length: number = code.length;
				expect(length).toBe(6);
			}
		});
	});
});

// ==========================================================================
// Environment Variable Validation
// ==========================================================================

describe("getRequiredEnv", () => {
	describe("with environment variables", () => {
		it("should return value when present", () => {
			const env = { AUTH_BASE_URL: "https://auth.example.com" };
			expect(getRequiredEnv(env, "AUTH_BASE_URL")).toBe("https://auth.example.com");
		});

		it("should return value even when fallback provided", () => {
			const env = { AUTH_BASE_URL: "https://auth.example.com" };
			expect(getRequiredEnv(env, "AUTH_BASE_URL", "https://fallback.com")).toBe(
				"https://auth.example.com",
			);
		});
	});

	describe("with fallback", () => {
		it("should use fallback when env is undefined", () => {
			expect(getRequiredEnv(undefined, "AUTH_BASE_URL", "https://fallback.com")).toBe(
				"https://fallback.com",
			);
		});

		it("should use fallback when key not in env", () => {
			const env = { OTHER_VAR: "value" };
			expect(getRequiredEnv(env, "AUTH_BASE_URL", "https://fallback.com")).toBe(
				"https://fallback.com",
			);
		});
	});

	describe("missing required variable", () => {
		it("should throw when env is undefined and no fallback", () => {
			expect(() => getRequiredEnv(undefined, "AUTH_BASE_URL")).toThrow(
				"Missing required environment variable: AUTH_BASE_URL",
			);
		});

		it("should throw when key not in env and no fallback", () => {
			const env = { OTHER_VAR: "value" };
			expect(() => getRequiredEnv(env, "AUTH_BASE_URL")).toThrow(
				"Missing required environment variable: AUTH_BASE_URL",
			);
		});

		it("should throw when value is empty string and no fallback", () => {
			const env = { AUTH_BASE_URL: "" };
			expect(() => getRequiredEnv(env, "AUTH_BASE_URL")).toThrow(
				"Missing required environment variable: AUTH_BASE_URL",
			);
		});
	});

	describe("error messages", () => {
		it("should include variable name in error", () => {
			expect(() => getRequiredEnv(undefined, "MY_CUSTOM_VAR")).toThrow("MY_CUSTOM_VAR");
		});
	});
});
