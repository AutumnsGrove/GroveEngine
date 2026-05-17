import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export const CURIO_ERRORS = {
	SECRETS_MANAGER_FAILED: {
		code: "CURIO-TL-001",
		category: "admin",
		userMessage: "Unable to load your API keys. Please try again.",
		adminMessage: "SecretsManager.get failed — falling back to legacy encryption",
	},
	TOKEN_UNREADABLE: {
		code: "CURIO-TL-002",
		category: "admin",
		userMessage: "Your saved token needs to be re-entered.",
		adminMessage:
			"Encrypted token found but TOKEN_ENCRYPTION_KEY is missing — token permanently unreadable",
	},
} as const satisfies Record<string, GroveErrorDef>;
