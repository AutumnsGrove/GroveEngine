/**
 * Loam - Offensive Content Blocklist
 *
 * Part of the Loam name protection system.
 * This file contains terms blocked for violating the Acceptable Use Policy.
 * Data externalized to libs/engine/src/lib/data/offensive-blocklist.json
 *
 * Sources:
 * - LDNOOBW (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
 * - dsojevic/profanity-list (categorized with severity ratings)
 * - GLAAD Anti-LGBTQ Hate Speech Guide
 * - Autistic Hoya's Ableist Language List
 * - ADL Hate Symbols Database
 * - SPLC Extremist Files
 *
 * @see docs/specs/loam-spec.md
 * @module offensive-blocklist
 * @private
 */

import blocklistData from "../../data/offensive-blocklist.json";

// =============================================================================
// Types
// =============================================================================

interface OffensiveBlocklistData {
	slurs_racial: string[];
	slurs_lgbtq: string[];
	slurs_gender: string[];
	slurs_ableist: string[];
	violence: string[];
	hate_groups: string[];
	terrorist_groups: string[];
	self_harm: string[];
	exploitation: string[];
	explicit_sexual: string[];
	incel: string[];
	slur_substrings: string[];
	boundary_check_terms: string[];
	requires_review: string[];
}

const data: OffensiveBlocklistData = blocklistData as OffensiveBlocklistData;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Leetspeak/obfuscation variants
 * Common character substitutions to evade filters
 */
function generateLeetVariants(term: string): string[] {
	const substitutions: Record<string, string[]> = {
		a: ["4", "@"],
		e: ["3"],
		i: ["1", "!"],
		o: ["0"],
		s: ["5", "$"],
		t: ["7"],
		l: ["1"],
		g: ["9"],
	};

	const variants: string[] = [term];

	// Generate single-substitution variants
	for (const [char, replacements] of Object.entries(substitutions)) {
		if (term.includes(char)) {
			for (const replacement of replacements) {
				variants.push(term.replace(new RegExp(char, "g"), replacement));
			}
		}
	}

	return variants;
}

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

/**
 * All offensive terms combined
 * Includes base terms and generated variants
 */
export const OFFENSIVE_TERMS: string[] = [
	...data.slurs_racial,
	...data.slurs_lgbtq,
	...data.slurs_gender,
	...data.slurs_ableist,
	...data.violence,
	...data.hate_groups,
	...data.terrorist_groups,
	...data.self_harm,
	...data.exploitation,
	...data.explicit_sexual,
	...data.incel,
].flatMap((term) => generateLeetVariants(term));

/**
 * Fast lookup Set
 */
export const OFFENSIVE_SET: Set<string> = new Set(OFFENSIVE_TERMS);

/**
 * Terms requiring substring matching (hate groups, violence)
 */
const DANGEROUS_SUBSTRINGS = [...data.hate_groups, ...data.violence, ...data.terrorist_groups];

/**
 * Severe slurs that should be caught even as substrings.
 * These are carefully selected to minimize false positives.
 * Excludes short terms (3 chars or less) that might appear in legitimate words.
 */
const SLUR_SUBSTRINGS: string[] = data.slur_substrings;

/**
 * Terms that need word boundary checking to avoid false positives.
 * Example: "retard" could match "fire-retardant-blog"
 */
const BOUNDARY_CHECK_TERMS: string[] = data.boundary_check_terms;

/**
 * Check if a term appears as a word (not embedded in another word)
 * Uses simple boundary detection: term is at start/end or surrounded by non-letters
 */
function hasWordBoundary(text: string, term: string): boolean {
	const index = text.indexOf(term);
	if (index === -1) return false;

	const beforeChar = index > 0 ? text[index - 1] : "";
	const afterChar = index + term.length < text.length ? text[index + term.length] : "";

	// Check if bounded by non-letter characters or string boundaries
	const beforeOk = !beforeChar || !/[a-z]/.test(beforeChar);
	const afterOk = !afterChar || !/[a-z]/.test(afterChar);

	return beforeOk && afterOk;
}

/**
 * Check if a username contains offensive content
 * Uses exact matching and substring matching for dangerous/severe terms
 *
 * @param username - The username to check
 * @returns true if offensive content detected
 */
export function containsOffensiveContent(username: string): boolean {
	const normalized = username.toLowerCase().replace(/-/g, "");

	// Exact match
	if (OFFENSIVE_SET.has(normalized)) {
		return true;
	}

	// Also check with hyphens preserved
	if (OFFENSIVE_SET.has(username.toLowerCase())) {
		return true;
	}

	// Substring match for dangerous terms (hate groups, violence, terrorist)
	for (const term of DANGEROUS_SUBSTRINGS) {
		const normalizedTerm = term.replace(/-/g, "");
		if (normalized.includes(normalizedTerm)) {
			return true;
		}
	}

	// Substring match for severe slurs (catches "badword123" patterns)
	for (const slur of SLUR_SUBSTRINGS) {
		if (normalized.includes(slur)) {
			return true;
		}
	}

	// Word boundary check for terms prone to false positives
	// Use lowercase with hyphens preserved since hyphens ARE word boundaries
	const withHyphens = username.toLowerCase();
	for (const term of BOUNDARY_CHECK_TERMS) {
		if (hasWordBoundary(withHyphens, term) || hasWordBoundary(normalized, term)) {
			return true;
		}
	}

	return false;
}

/**
 * Terms that may be reclaimed/identity terms
 * These require manual review rather than automatic blocking
 */
export const REQUIRES_REVIEW: string[] = data.requires_review;

/**
 * Check if a term requires manual review
 */
export function requiresReview(username: string): boolean {
	const normalized = username.toLowerCase();
	return REQUIRES_REVIEW.some((term) => normalized.includes(term));
}
