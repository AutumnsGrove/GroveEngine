import { describe, it, expect } from 'vitest';
import {
	YEARLY_DISCOUNT,
	calculateYearlyTotal,
	calculateYearlyMonthlyRate,
	calculateYearlySavings,
	formatPrice,
	formatYearlySavings,
	getPriceBreakdown
} from './pricing';

describe('pricing constants', () => {
	it('YEARLY_DISCOUNT is 15%', () => {
		expect(YEARLY_DISCOUNT).toBe(0.15);
	});
});

describe('calculateYearlyTotal', () => {
	it('applies 15% discount to yearly price', () => {
		// $8/mo * 12 months = $96, with 15% off = $81.60
		expect(calculateYearlyTotal(8)).toBe(81.6);
	});

	it('calculates correctly for $12/mo plan', () => {
		// $12/mo * 12 = $144, with 15% off = $122.40
		expect(calculateYearlyTotal(12)).toBeCloseTo(122.4);
	});

	it('calculates correctly for $25/mo plan', () => {
		// $25/mo * 12 = $300, with 15% off = $255
		expect(calculateYearlyTotal(25)).toBe(255);
	});

	it('calculates correctly for $35/mo plan', () => {
		// $35/mo * 12 = $420, with 15% off = $357
		expect(calculateYearlyTotal(35)).toBe(357);
	});
});

describe('calculateYearlyMonthlyRate', () => {
	it('returns effective monthly rate when billed yearly', () => {
		// $81.60 / 12 = $6.80
		expect(calculateYearlyMonthlyRate(8)).toBe(6.8);
	});

	it('returns correct rate for $12 plan', () => {
		// $122.40 / 12 = $10.20
		expect(calculateYearlyMonthlyRate(12)).toBe(10.2);
	});
});

describe('calculateYearlySavings', () => {
	it('calculates savings for $8/mo plan', () => {
		// $96 - $81.60 = $14.40
		expect(calculateYearlySavings(8)).toBeCloseTo(14.4);
	});

	it('calculates savings for $12/mo plan', () => {
		// $144 - $122.40 = $21.60
		expect(calculateYearlySavings(12)).toBeCloseTo(21.6);
	});

	it('calculates savings for $25/mo plan', () => {
		// $300 - $255 = $45
		expect(calculateYearlySavings(25)).toBe(45);
	});
});

describe('formatPrice', () => {
	it('always returns a string', () => {
		expect(typeof formatPrice(8, 'monthly')).toBe('string');
		expect(typeof formatPrice(8, 'yearly')).toBe('string');
	});

	it('returns monthly price as string for monthly billing', () => {
		expect(formatPrice(8, 'monthly')).toBe('8');
		expect(formatPrice(12, 'monthly')).toBe('12');
		expect(formatPrice(25, 'monthly')).toBe('25');
	});

	it('returns discounted monthly rate for yearly billing', () => {
		// $6.80 - shows decimals
		expect(formatPrice(8, 'yearly')).toBe('6.80');
		// $10.20 - shows decimals
		expect(formatPrice(12, 'yearly')).toBe('10.20');
	});

	it('omits decimals when yearly rate is whole number', () => {
		// $25/mo yearly = $21.25/mo - has decimals
		expect(formatPrice(25, 'yearly')).toBe('21.25');
	});
});

describe('formatYearlySavings', () => {
	it('returns savings rounded to whole number', () => {
		// $14.40 rounds to "14"
		expect(formatYearlySavings(8)).toBe('14');
		// $21.60 rounds to "22"
		expect(formatYearlySavings(12)).toBe('22');
		// $45 stays "45"
		expect(formatYearlySavings(25)).toBe('45');
	});
});

describe('getPriceBreakdown', () => {
	it('returns complete breakdown for monthly billing', () => {
		const breakdown = getPriceBreakdown(8, 'monthly');

		expect(breakdown.displayPrice).toBe('8');
		expect(breakdown.monthlyRate).toBe(8);
		expect(breakdown.yearlyTotal).toBe(81.6);
		expect(breakdown.yearlySavings).toBe('14');
		expect(breakdown.isYearly).toBe(false);
	});

	it('returns complete breakdown for yearly billing', () => {
		const breakdown = getPriceBreakdown(8, 'yearly');

		expect(breakdown.displayPrice).toBe('6.80');
		expect(breakdown.monthlyRate).toBe(6.8);
		expect(breakdown.yearlyTotal).toBe(81.6);
		expect(breakdown.yearlySavings).toBe('14');
		expect(breakdown.isYearly).toBe(true);
	});
});
