import { describe, it, expect } from "vitest";
import { isRequestFromTrustedOrigin } from "./csrf.js";

const EXPECTED_ORIGIN = "https://heartwood.grove.place";

function requestWith(headers: Record<string, string>): Request {
	return new Request("https://heartwood.grove.place/user/avatar", { headers });
}

describe("isRequestFromTrustedOrigin", () => {
	it("allows a matching Origin header", () => {
		expect(
			isRequestFromTrustedOrigin(
				requestWith({ Origin: "https://heartwood.grove.place" }),
				EXPECTED_ORIGIN,
			),
		).toBe(true);
	});

	it("rejects a mismatched Origin header", () => {
		expect(
			isRequestFromTrustedOrigin(requestWith({ Origin: "https://evil.com" }), EXPECTED_ORIGIN),
		).toBe(false);
	});

	it("rejects a tenant subdomain Origin (same-site, cross-origin)", () => {
		expect(
			isRequestFromTrustedOrigin(
				requestWith({ Origin: "https://some-robin.grove.place" }),
				EXPECTED_ORIGIN,
			),
		).toBe(false);
	});

	it("falls back to Referer when Origin is absent, with exact-origin matching", () => {
		expect(
			isRequestFromTrustedOrigin(
				requestWith({ Referer: "https://heartwood.grove.place/settings" }),
				EXPECTED_ORIGIN,
			),
		).toBe(true);
	});

	it("rejects a Referer that merely starts with the expected origin", () => {
		expect(
			isRequestFromTrustedOrigin(
				requestWith({ Referer: "https://heartwood.grove.place.evil.com/" }),
				EXPECTED_ORIGIN,
			),
		).toBe(false);
	});

	it("rejects a malformed Referer instead of throwing", () => {
		expect(isRequestFromTrustedOrigin(requestWith({ Referer: "not a url" }), EXPECTED_ORIGIN)).toBe(
			false,
		);
	});

	it("fails closed when both Origin and Referer are missing", () => {
		expect(isRequestFromTrustedOrigin(requestWith({}), EXPECTED_ORIGIN)).toBe(false);
	});
});
