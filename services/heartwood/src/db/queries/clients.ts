import { safeParseJson } from "@autumnsgrove/lattice/utils";
import type { Client, D1DatabaseOrSession } from "../../types.js";

const WILDCARD_CLIENTS: Record<string, { pattern: RegExp; baseDomain: string }> = {
	// NOTE: "groveengine" is a legacy client_id baked into D1 production data,
	// OAuth flows, CORS lists, domain blocklists, and seed SQL. Renaming to
	// "lattice" was considered (#1153) but the blast radius isn't worth it
	// for an opaque identifier users never see. — 2026-03-10
	groveengine: {
		pattern: /^https:\/\/([a-z0-9-]+)\.grove\.place\/auth\/callback$/i,
		baseDomain: "grove.place",
	},
};

export function extractSubdomainFromRedirectUri(
	clientId: string,
	redirectUri: string,
): string | null {
	const config = WILDCARD_CLIENTS[clientId];
	if (!config) return null;

	const match = redirectUri.match(config.pattern);
	return match ? match[1].toLowerCase() : null;
}

export async function isActiveTenant(engineDb: D1Database, subdomain: string): Promise<boolean> {
	const result = await engineDb
		.prepare("SELECT 1 FROM tenants WHERE subdomain = ? AND active = 1")
		.bind(subdomain.toLowerCase())
		.first<{ 1: number }>();
	return result !== null;
}

export async function getTenantByEmail(
	engineDb: D1Database,
	email: string,
): Promise<{ tenantId: string; subdomain: string } | null> {
	try {
		const row = await engineDb
			.prepare("SELECT id, subdomain FROM tenants WHERE email = ? AND active = 1 LIMIT 1")
			.bind(email.toLowerCase())
			.first<{ id: string; subdomain: string }>();

		if (!row) return null;
		return { tenantId: row.id, subdomain: row.subdomain };
	} catch {
		return null;
	}
}

export async function getClientByClientId(
	db: D1DatabaseOrSession,
	clientId: string,
): Promise<Client | null> {
	const result = await db
		.prepare("SELECT * FROM clients WHERE client_id = ?")
		.bind(clientId)
		.first<Client>();
	return result;
}

export async function validateRedirectUriForClient(
	client: Client,
	redirectUri: string,
	engineDb?: D1Database,
): Promise<boolean> {
	const allowedUris = safeParseJson<string[]>(client.redirect_uris, []);
	if (allowedUris.includes(redirectUri)) {
		return true;
	}

	const subdomain = extractSubdomainFromRedirectUri(client.client_id, redirectUri);
	if (subdomain && engineDb) {
		return isActiveTenant(engineDb, subdomain);
	}

	return false;
}

export async function validateClientRedirectUri(
	db: D1DatabaseOrSession,
	clientId: string,
	redirectUri: string,
	engineDb?: D1Database,
): Promise<boolean> {
	const client = await getClientByClientId(db, clientId);
	if (!client) return false;

	return validateRedirectUriForClient(client, redirectUri, engineDb);
}

export async function validateClientOrigin(
	db: D1DatabaseOrSession,
	clientId: string,
	origin: string,
): Promise<boolean> {
	const client = await getClientByClientId(db, clientId);
	if (!client) return false;

	const allowedOrigins = safeParseJson<string[]>(client.allowed_origins, []);
	return allowedOrigins.includes(origin);
}

export async function getClientByDomain(
	db: D1DatabaseOrSession,
	domain: string,
): Promise<Client | null> {
	return db.prepare(`SELECT * FROM clients WHERE domain = ?`).bind(domain).first<Client>();
}

export async function getAllClients(db: D1DatabaseOrSession): Promise<Client[]> {
	const result = await db.prepare(`SELECT * FROM clients ORDER BY name`).all<Client>();
	return result.results || [];
}
