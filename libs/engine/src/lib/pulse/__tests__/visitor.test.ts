import { describe, it, expect } from "vitest";
import { hashVisitor } from "../visitor.js";

describe("hashVisitor", () => {
	const ip = "192.168.1.1";
	const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

	it("returns a 16-char hex string", async () => {
		const hash = await hashVisitor(ip, ua, "2026-05-16");
		expect(hash).toMatch(/^[0-9a-f]{16}$/);
	});

	it("same inputs on same day produce same hash", async () => {
		const a = await hashVisitor(ip, ua, "2026-05-16");
		const b = await hashVisitor(ip, ua, "2026-05-16");
		expect(a).toBe(b);
	});

	it("different days produce different hashes", async () => {
		const day1 = await hashVisitor(ip, ua, "2026-05-16");
		const day2 = await hashVisitor(ip, ua, "2026-05-17");
		expect(day1).not.toBe(day2);
	});

	it("different IPs produce different hashes", async () => {
		const a = await hashVisitor("10.0.0.1", ua, "2026-05-16");
		const b = await hashVisitor("10.0.0.2", ua, "2026-05-16");
		expect(a).not.toBe(b);
	});

	it("different user agents produce different hashes", async () => {
		const a = await hashVisitor(ip, "Chrome/120", "2026-05-16");
		const b = await hashVisitor(ip, "Firefox/121", "2026-05-16");
		expect(a).not.toBe(b);
	});

	it("uses today's date when date param is omitted", async () => {
		const hash = await hashVisitor(ip, ua);
		expect(hash).toMatch(/^[0-9a-f]{16}$/);
	});
});
