/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				is_admin: boolean;
			} | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
				SITE_NAME: string;
				SITE_URL: string;
				RESEND_API_KEY: string;
				ADMIN_EMAILS: string;
				ANTHROPIC_API_KEY?: string;
				DOMAIN_WORKER_URL?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
