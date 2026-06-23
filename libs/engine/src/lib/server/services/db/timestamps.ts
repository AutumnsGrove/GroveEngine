export { generateId } from "../../../utils/id.js";

export function now(): string {
	return new Date().toISOString();
}

export function unixNow(): number {
	return Math.floor(Date.now() / 1000);
}

export function futureTimestamp(ms: number): string {
	return new Date(Date.now() + ms).toISOString();
}

export function isExpired(timestamp: string): boolean {
	return new Date(timestamp) < new Date();
}
