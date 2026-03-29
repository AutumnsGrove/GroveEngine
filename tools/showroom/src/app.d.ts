// Showroom maps $lib → engine/src/lib, which references App types
// that the engine's app.d.ts augments. Mirror the relevant types here.

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
			category?: string;
		}
	}
}

export {};
