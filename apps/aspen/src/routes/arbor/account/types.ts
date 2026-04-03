/**
 * Type definitions for Account page components.
 */

export interface BillingData {
	plan: string;
	status: string;
	hasSubscription: boolean;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	paymentMethod: {
		last4: string;
		brand: string | null;
	} | null;
	customerId: string | null;
}

export interface UsageData {
	storageUsed: number;
	storageLimit: number;
	postCount: number;
	postLimit: number | null;
	accountAge: number;
}

export interface TierConfig {
	name: string;
	tagline: string;
	icon: string;
	features: string[];
	support: string;
}

export interface AccountPageData {
	billing: BillingData | null;
	billingError: boolean;
	usage: UsageData | null;
	usageError: boolean;
	currentPlan: string;
	tierConfig: TierConfig | null;
}
