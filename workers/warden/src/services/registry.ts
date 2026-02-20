/**
 * Service Registry
 *
 * Defines external services that Warden can proxy requests to.
 * Each service declares its base URL, auth injection method,
 * and a set of actions with Zod-validated parameters.
 */

import { z } from "zod";
import type { WardenService } from "../types";

export type AuthInjection =
	| { type: "bearer" }
	| { type: "header"; name: string }
	| { type: "query"; param: string }
	| { type: "body"; field: string };

export interface ServiceAction {
	/** Zod schema for params validation */
	schema: z.ZodType;
	/** Build the HTTP request from validated params + credential */
	buildRequest: (
		params: Record<string, unknown>,
		credential: string,
	) => {
		url: string;
		method: string;
		headers: Record<string, string>;
		body?: string;
	};
}

export interface ServiceDefinition {
	name: WardenService;
	baseUrl: string;
	auth: AuthInjection;
	actions: Record<string, ServiceAction>;
}

/** Global service registry */
const registry = new Map<WardenService, ServiceDefinition>();

export function registerService(service: ServiceDefinition): void {
	registry.set(service.name, service);
}

export function getService(name: string): ServiceDefinition | undefined {
	return registry.get(name as WardenService);
}

export function listServices(): WardenService[] {
	return Array.from(registry.keys());
}
