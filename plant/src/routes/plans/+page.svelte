<script lang="ts">
	// Use centralized icon registry for consistent icons across Grove
	import {
		Check,
		Clock,
		Lock,
		ArrowRight,
		Sprout,
		TreeDeciduous,
		Trees,
		Crown
	} from '@autumnsgrove/groveengine/ui/icons';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';

	let { data } = $props();

	// Billing cycle toggle
	let billingCycle = $state<'monthly' | 'yearly'>('monthly');

	// Selected plan
	let selectedPlan = $state<string | null>(null);

	// Tier availability states
	type TierStatus = 'available' | 'coming_soon' | 'future';

	// Tier icon mapping
	const tierIcons = {
		seedling: Sprout,
		sapling: TreeDeciduous,
		oak: Trees,
		evergreen: Crown
	};

	// Plan definitions with availability status
	const plans = [
		{
			id: 'seedling',
			name: 'Seedling',
			tagline: 'Just planted',
			description: 'Perfect for getting started. A quiet corner to call your own.',
			monthlyPrice: 8,
			yearlyPrice: 81.60,
			features: [
				'50 posts',
				'1 GB storage',
				'3 curated themes',
				'Meadow access',
				'RSS feed',
				'No ads ever'
			],
			status: 'available' as TierStatus,
			icon: 'seedling' as keyof typeof tierIcons
		},
		{
			id: 'sapling',
			name: 'Sapling',
			tagline: 'Growing strong',
			description: 'For blogs finding their voice. Room to stretch and grow.',
			monthlyPrice: 12,
			yearlyPrice: 122.40,
			features: [
				'250 posts',
				'5 GB storage',
				'10 themes',
				'Email forwarding',
				'Centennial eligible',
				'Everything in Seedling'
			],
			status: 'coming_soon' as TierStatus,
			icon: 'sapling' as keyof typeof tierIcons
		},
		{
			id: 'oak',
			name: 'Oak',
			tagline: 'Deep roots',
			description: 'Full creative control. Your blog, your rules.',
			monthlyPrice: 25,
			yearlyPrice: 255,
			features: [
				'Unlimited posts',
				'20 GB storage',
				'Theme customizer',
				'Bring your own domain',
				'Centennial eligible',
				'Priority support'
			],
			status: 'future' as TierStatus,
			icon: 'oak' as keyof typeof tierIcons
		},
		{
			id: 'evergreen',
			name: 'Evergreen',
			tagline: 'Always flourishing',
			description: 'The complete package. Everything Grove has to offer.',
			monthlyPrice: 35,
			yearlyPrice: 357,
			features: [
				'Unlimited everything',
				'100 GB storage',
				'Custom fonts',
				'Domain included',
				'Centennial eligible',
				'8 hrs/mo dedicated support'
			],
			status: 'future' as TierStatus,
			icon: 'evergreen' as keyof typeof tierIcons
		}
	];

	// Calculate displayed price
	function getPrice(plan: (typeof plans)[0]) {
		if (billingCycle === 'yearly') {
			return (plan.yearlyPrice / 12).toFixed(2);
		}
		return plan.monthlyPrice;
	}

	// Calculate savings for yearly
	function getYearlySavings(plan: (typeof plans)[0]) {
		const monthlyCost = plan.monthlyPrice * 12;
		const savings = monthlyCost - plan.yearlyPrice;
		return savings.toFixed(0);
	}

	// Check if a plan can be selected
	function canSelect(plan: (typeof plans)[0]) {
		return plan.status === 'available';
	}

	// Handle plan selection
	function selectPlan(plan: (typeof plans)[0]) {
		if (canSelect(plan)) {
			selectedPlan = plan.id;
		}
	}

	// Get status-specific styling classes
	function getStatusClasses(plan: (typeof plans)[0]) {
		switch (plan.status) {
			case 'available':
				return selectedPlan === plan.id
					? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
					: 'hover:ring-1 hover:ring-primary/30';
			case 'coming_soon':
				return 'opacity-90';
			case 'future':
				return 'opacity-50 grayscale';
		}
	}

	// Get overlay content based on status
	function getOverlayStyle(status: TierStatus) {
		switch (status) {
			case 'coming_soon':
				return 'bg-amber-500/10 dark:bg-amber-500/5';
			case 'future':
				return 'bg-slate-500/10 dark:bg-slate-500/10';
			default:
				return '';
		}
	}
</script>

<div class="animate-fade-in space-y-8">
	<!-- Header -->
	<header class="text-center space-y-3">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground">
			Choose how you'd like to grow
		</h1>
		<p class="text-foreground-muted max-w-md mx-auto">
			Every plan includes a 14-day free trial. Your words are always yours.
		</p>
	</header>

	<!-- Billing toggle -->
	<div class="flex justify-center">
		<div
			class="inline-flex items-center gap-1 p-1.5 rounded-xl
				bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md
				border border-white/40 dark:border-emerald-800/25"
		>
			<button
				onclick={() => (billingCycle = 'monthly')}
				class="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
				class:bg-white={billingCycle === 'monthly'}
				class:dark:bg-slate-800={billingCycle === 'monthly'}
				class:shadow-sm={billingCycle === 'monthly'}
				class:text-foreground={billingCycle === 'monthly'}
				class:text-foreground-muted={billingCycle !== 'monthly'}
				class:hover:text-foreground={billingCycle !== 'monthly'}
			>
				Monthly
			</button>
			<button
				onclick={() => (billingCycle = 'yearly')}
				class="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
				class:bg-white={billingCycle === 'yearly'}
				class:dark:bg-slate-800={billingCycle === 'yearly'}
				class:shadow-sm={billingCycle === 'yearly'}
				class:text-foreground={billingCycle === 'yearly'}
				class:text-foreground-muted={billingCycle !== 'yearly'}
				class:hover:text-foreground={billingCycle !== 'yearly'}
			>
				Yearly
				<span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
					Save 15%
				</span>
			</button>
		</div>
	</div>

	<!-- Plans grid -->
	<div class="space-y-4">
		{#each plans as plan (plan.id)}
			{@const TierIcon = tierIcons[plan.icon]}
			{@const isAvailable = plan.status === 'available'}
			{@const isComingSoon = plan.status === 'coming_soon'}
			{@const isFuture = plan.status === 'future'}
			{@const isSelected = selectedPlan === plan.id}

			<div class="relative">
				<!-- Status badge positioned above card -->
				{#if isComingSoon}
					<div class="absolute -top-3 left-6 z-20">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-amber-500 text-white shadow-lg shadow-amber-500/25"
						>
							<Clock class="w-3 h-3" />
							Coming Soon
						</span>
					</div>
				{:else if isFuture}
					<div class="absolute -top-3 left-6 z-20">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-slate-400 dark:bg-slate-600 text-white shadow-lg"
						>
							<Lock class="w-3 h-3" />
							Future
						</span>
					</div>
				{/if}

				<button
					onclick={() => selectPlan(plan)}
					disabled={!isAvailable}
					class="w-full text-left transition-all duration-200 {getStatusClasses(plan)}
						{isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}"
					type="button"
				>
					<GlassCard
						variant={isAvailable ? (isSelected ? 'accent' : 'default') : 'muted'}
						class="relative overflow-hidden {isComingSoon || isFuture ? 'pt-6' : ''}"
					>
						<!-- Subtle overlay for unavailable tiers -->
						{#if !isAvailable}
							<div
								class="absolute inset-0 pointer-events-none {getOverlayStyle(plan.status)}"
							></div>
						{/if}

						<div class="relative z-10 p-6">
							<!-- Plan header: icon, name, price -->
							<div class="flex items-start justify-between gap-4 mb-4">
								<div class="flex items-start gap-4">
									<!-- Tier icon -->
									<div
										class="flex-shrink-0 p-3 rounded-xl transition-colors
											{isAvailable
											? 'bg-emerald-100/60 dark:bg-emerald-900/40'
											: isComingSoon
												? 'bg-amber-100/60 dark:bg-amber-900/30'
												: 'bg-slate-100/60 dark:bg-slate-800/40'}"
									>
										<TierIcon
											class="w-6 h-6 {isAvailable
												? 'text-emerald-600 dark:text-emerald-400'
												: isComingSoon
													? 'text-amber-600 dark:text-amber-400'
													: 'text-slate-400 dark:text-slate-500'}"
										/>
									</div>

									<!-- Name and tagline -->
									<div>
										<h3 class="text-lg font-medium text-foreground">{plan.name}</h3>
										<p
											class="text-sm {isAvailable
												? 'text-emerald-600 dark:text-emerald-400'
												: isComingSoon
													? 'text-amber-600 dark:text-amber-400'
													: 'text-foreground-subtle'}"
										>
											{plan.tagline}
										</p>
									</div>
								</div>

								<!-- Price -->
								<div class="text-right flex-shrink-0">
									<div class="flex items-baseline gap-1">
										<span class="text-2xl font-semibold text-foreground">${getPrice(plan)}</span>
										<span class="text-sm text-foreground-muted">/mo</span>
									</div>
									{#if billingCycle === 'yearly'}
										<p class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
											Save ${getYearlySavings(plan)}/year
										</p>
									{/if}
								</div>
							</div>

							<!-- Description -->
							<p class="text-sm text-foreground-muted mb-4">{plan.description}</p>

							<!-- Features grid -->
							<div class="grid grid-cols-2 gap-x-4 gap-y-2">
								{#each plan.features as feature}
									<div class="flex items-center gap-2">
										<Check
											class="w-4 h-4 flex-shrink-0 {isAvailable
												? 'text-emerald-500'
												: isComingSoon
													? 'text-amber-500'
													: 'text-slate-400'}"
										/>
										<span class="text-sm text-foreground-muted">{feature}</span>
									</div>
								{/each}
							</div>

							<!-- Selection indicator for available plans -->
							{#if isAvailable}
								<div class="mt-4 pt-4 border-t border-white/20 dark:border-slate-700/30">
									<div class="flex items-center justify-between">
										<span class="text-sm text-foreground-muted">
											{isSelected ? 'Selected' : 'Click to select'}
										</span>
										<div
											class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
												{isSelected
												? 'border-emerald-500 bg-emerald-500'
												: 'border-slate-300 dark:border-slate-600'}"
										>
											{#if isSelected}
												<Check class="w-3 h-3 text-white" />
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</GlassCard>
				</button>
			</div>
		{/each}
	</div>

	<!-- Free tier note -->
	<div class="text-center py-2">
		<p class="text-sm text-foreground-subtle">
			Just want to hang out in Meadow?
			<span class="text-foreground-muted">Free social-only tier coming with Meadow launch.</span>
		</p>
	</div>

	<!-- Continue button -->
	<form method="POST" class="space-y-4">
		<input type="hidden" name="plan" value={selectedPlan || ''} />
		<input type="hidden" name="billingCycle" value={billingCycle} />
		<button
			type="submit"
			disabled={!selectedPlan}
			class="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if selectedPlan}
				Continue with {plans.find((p) => p.id === selectedPlan)?.name}
			{:else}
				Select a plan to continue
			{/if}
		</button>
		<p class="text-xs text-foreground-subtle text-center">
			You won't be charged until after your 14-day trial. Cancel anytime.
		</p>
	</form>

	<!-- Full comparison link -->
	<div class="text-center pb-4">
		<a
			href="https://grove.place/pricing"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
		>
			View full plan comparison
			<ArrowRight class="w-4 h-4" />
		</a>
	</div>
</div>
