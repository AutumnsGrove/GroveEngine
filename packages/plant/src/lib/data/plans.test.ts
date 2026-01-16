import { describe, it, expect } from 'vitest';
import {
	plans,
	validPlanIds,
	availablePlans,
	getPlanById,
	isValidPlanId,
	isPlanAvailable,
	getPlanPreviews
} from './plans';

describe('plans data', () => {
	it('has 4 plans defined', () => {
		expect(plans).toHaveLength(4);
	});

	it('has all expected plan IDs', () => {
		const ids = plans.map((p) => p.id);
		expect(ids).toEqual(['seedling', 'sapling', 'oak', 'evergreen']);
	});

	it('each plan has required fields', () => {
		for (const plan of plans) {
			expect(plan).toHaveProperty('id');
			expect(plan).toHaveProperty('name');
			expect(plan).toHaveProperty('tagline');
			expect(plan).toHaveProperty('description');
			expect(plan).toHaveProperty('monthlyPrice');
			expect(plan).toHaveProperty('features');
			expect(plan).toHaveProperty('status');
			expect(plan).toHaveProperty('icon');
			expect(Array.isArray(plan.features)).toBe(true);
			expect(plan.features.length).toBeGreaterThan(0);
		}
	});

	it('has correct prices for each tier', () => {
		const seedling = plans.find((p) => p.id === 'seedling');
		const sapling = plans.find((p) => p.id === 'sapling');
		const oak = plans.find((p) => p.id === 'oak');
		const evergreen = plans.find((p) => p.id === 'evergreen');

		expect(seedling?.monthlyPrice).toBe(8);
		expect(sapling?.monthlyPrice).toBe(12);
		expect(oak?.monthlyPrice).toBe(25);
		expect(evergreen?.monthlyPrice).toBe(35);
	});

	it('has correct tier statuses', () => {
		const seedling = plans.find((p) => p.id === 'seedling');
		const sapling = plans.find((p) => p.id === 'sapling');
		const oak = plans.find((p) => p.id === 'oak');
		const evergreen = plans.find((p) => p.id === 'evergreen');

		expect(seedling?.status).toBe('available');
		expect(sapling?.status).toBe('coming_soon');
		expect(oak?.status).toBe('future');
		expect(evergreen?.status).toBe('future');
	});
});

describe('validPlanIds', () => {
	it('contains all plan IDs', () => {
		expect(validPlanIds).toEqual(['seedling', 'sapling', 'oak', 'evergreen']);
	});
});

describe('availablePlans', () => {
	it('only includes plans with available status', () => {
		expect(availablePlans).toHaveLength(1);
		expect(availablePlans[0].id).toBe('seedling');
	});
});

describe('getPlanById', () => {
	it('returns plan when ID exists', () => {
		const plan = getPlanById('seedling');
		expect(plan).toBeDefined();
		expect(plan?.name).toBe('Seedling');
	});

	it('returns undefined for invalid ID', () => {
		expect(getPlanById('invalid')).toBeUndefined();
		expect(getPlanById('')).toBeUndefined();
	});

	it('returns correct plan for each valid ID', () => {
		expect(getPlanById('seedling')?.name).toBe('Seedling');
		expect(getPlanById('sapling')?.name).toBe('Sapling');
		expect(getPlanById('oak')?.name).toBe('Oak');
		expect(getPlanById('evergreen')?.name).toBe('Evergreen');
	});
});

describe('isValidPlanId', () => {
	it('returns true for valid plan IDs', () => {
		expect(isValidPlanId('seedling')).toBe(true);
		expect(isValidPlanId('sapling')).toBe(true);
		expect(isValidPlanId('oak')).toBe(true);
		expect(isValidPlanId('evergreen')).toBe(true);
	});

	it('returns false for invalid IDs', () => {
		expect(isValidPlanId('invalid')).toBe(false);
		expect(isValidPlanId('')).toBe(false);
		expect(isValidPlanId('SEEDLING')).toBe(false); // case sensitive
		expect(isValidPlanId('seed')).toBe(false);
	});
});

describe('isPlanAvailable', () => {
	it('returns true for available plans', () => {
		expect(isPlanAvailable('seedling')).toBe(true);
	});

	it('returns false for coming_soon plans', () => {
		expect(isPlanAvailable('sapling')).toBe(false);
	});

	it('returns false for future plans', () => {
		expect(isPlanAvailable('oak')).toBe(false);
		expect(isPlanAvailable('evergreen')).toBe(false);
	});

	it('returns false for invalid plan IDs', () => {
		expect(isPlanAvailable('invalid')).toBe(false);
		expect(isPlanAvailable('')).toBe(false);
	});
});

describe('getPlanPreviews', () => {
	it('returns previews for all plans', () => {
		const previews = getPlanPreviews();
		expect(previews).toHaveLength(4);
	});

	it('includes required preview fields', () => {
		const previews = getPlanPreviews();
		for (const preview of previews) {
			expect(preview).toHaveProperty('id');
			expect(preview).toHaveProperty('name');
			expect(preview).toHaveProperty('tagline');
			expect(preview).toHaveProperty('monthlyPrice');
			expect(preview).toHaveProperty('highlights');
			expect(preview).toHaveProperty('status');
		}
	});

	it('limits highlights to 3 items by default', () => {
		const previews = getPlanPreviews();
		for (const preview of previews) {
			expect(preview.highlights.length).toBeLessThanOrEqual(3);
		}
	});

	it('accepts custom highlight count', () => {
		const previews = getPlanPreviews(2);
		for (const preview of previews) {
			expect(preview.highlights.length).toBeLessThanOrEqual(2);
		}
	});

	it('preserves plan order', () => {
		const previews = getPlanPreviews();
		expect(previews.map((p) => p.id)).toEqual(['seedling', 'sapling', 'oak', 'evergreen']);
	});
});
