import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, isEncryptedToken, safeDecryptToken } from "./encryption";

const TEST_KEY_HEX = "a".repeat(64);
const WRONG_KEY_HEX = "b".repeat(64);

describe("encryptToken + decryptToken", () => {
	it("round-trips plaintext correctly", async () => {
		const plaintext = "ghp_secret_token_12345";
		const encrypted = await encryptToken(plaintext, TEST_KEY_HEX);
		const decrypted = await decryptToken(encrypted, TEST_KEY_HEX);
		expect(decrypted).toBe(plaintext);
	});

	it("produces v1 format output", async () => {
		const encrypted = await encryptToken("test", TEST_KEY_HEX);
		expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
	});

	it("produces different ciphertext each time (random IV)", async () => {
		const a = await encryptToken("same", TEST_KEY_HEX);
		const b = await encryptToken("same", TEST_KEY_HEX);
		expect(a).not.toBe(b);
	});

	it("fails with wrong key", async () => {
		const encrypted = await encryptToken("secret", TEST_KEY_HEX);
		await expect(decryptToken(encrypted, WRONG_KEY_HEX)).rejects.toThrow();
	});

	it("handles empty string", async () => {
		const encrypted = await encryptToken("", TEST_KEY_HEX);
		const decrypted = await decryptToken(encrypted, TEST_KEY_HEX);
		expect(decrypted).toBe("");
	});

	it("handles unicode", async () => {
		const plaintext = "🌲 grove token café";
		const encrypted = await encryptToken(plaintext, TEST_KEY_HEX);
		const decrypted = await decryptToken(encrypted, TEST_KEY_HEX);
		expect(decrypted).toBe(plaintext);
	});

	it("rejects invalid key length", async () => {
		await expect(encryptToken("test", "tooshort")).rejects.toThrow();
	});
});

describe("isEncryptedToken", () => {
	it("detects v1 format", async () => {
		const encrypted = await encryptToken("test", TEST_KEY_HEX);
		expect(isEncryptedToken(encrypted)).toBe(true);
	});

	it("rejects plaintext", () => {
		expect(isEncryptedToken("ghp_abc123")).toBe(false);
		expect(isEncryptedToken("just a normal string")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isEncryptedToken("")).toBe(false);
	});
});

describe("safeDecryptToken", () => {
	it("returns decrypted value on success", async () => {
		const encrypted = await encryptToken("secret", TEST_KEY_HEX);
		const result = await safeDecryptToken(encrypted, TEST_KEY_HEX);
		expect(result).toBe("secret");
	});

	it("returns null for null input", async () => {
		expect(await safeDecryptToken(null, TEST_KEY_HEX)).toBeNull();
	});

	it("returns null for undefined key", async () => {
		const encrypted = await encryptToken("test", TEST_KEY_HEX);
		expect(await safeDecryptToken(encrypted, undefined)).toBeNull();
	});

	it("returns plaintext if not encrypted format (migration)", async () => {
		expect(await safeDecryptToken("ghp_plaintext_token", TEST_KEY_HEX)).toBe("ghp_plaintext_token");
	});

	it("returns null on decryption failure", async () => {
		const encrypted = await encryptToken("test", TEST_KEY_HEX);
		expect(await safeDecryptToken(encrypted, WRONG_KEY_HEX)).toBeNull();
	});
});
