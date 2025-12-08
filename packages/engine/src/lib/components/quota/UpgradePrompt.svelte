<script lang="ts">
  /**
   * UpgradePrompt - Modal/dialog for upgrade prompts
   *
   * Shows when user tries to create a post but is at/over limit.
   * Provides options to upgrade, delete posts, or cancel.
   */

  import type { SubscriptionStatus } from '../../groveauth/index.js';
  import { TIER_NAMES } from '../../groveauth/index.js';

  interface Props {
    open: boolean;
    status: SubscriptionStatus;
    upgradeUrl?: string;
    onClose: () => void;
    onProceed?: () => void; // If allowed during grace period
    oldestPostTitle?: string;
    oldestPostDate?: string;
  }

  let {
    open,
    status,
    upgradeUrl = '/upgrade',
    onClose,
    onProceed,
    oldestPostTitle,
    oldestPostDate,
  }: Props = $props();

  // Can proceed if in grace period and not expired
  const canProceed = $derived(
    status.is_in_grace_period &&
    status.grace_period_days_remaining !== null &&
    status.grace_period_days_remaining > 0
  );

  // Tier upgrade path
  const nextTier = $derived(
    status.tier === 'starter' ? 'professional' :
    status.tier === 'professional' ? 'business' :
    null
  );

  const nextTierName = $derived(nextTier ? TIER_NAMES[nextTier] : null);
  const currentTierName = $derived(TIER_NAMES[status.tier]);
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="button"
    tabindex="-1"
  >
    <!-- Modal -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>

        <h3 id="upgrade-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {#if status.upgrade_required}
            Upgrade Required
          {:else}
            You're at {status.post_count}/{status.post_limit} posts
          {/if}
        </h3>
      </div>

      <!-- Content -->
      <div class="space-y-4 mb-6">
        {#if status.upgrade_required}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            Your grace period has expired. To continue creating posts, please upgrade your plan or delete some existing posts.
          </p>
        {:else if status.is_in_grace_period}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            You're over your post limit. You have <strong class="text-yellow-600 dark:text-yellow-400">{status.grace_period_days_remaining} days</strong> remaining in your grace period.
          </p>

          {#if oldestPostTitle}
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
              <p class="text-gray-500 dark:text-gray-400">If you continue, new posts may need to replace older ones. Your oldest post:</p>
              <p class="mt-1 font-medium text-gray-900 dark:text-gray-100">"{oldestPostTitle}"</p>
              {#if oldestPostDate}
                <p class="text-xs text-gray-500 dark:text-gray-400">{oldestPostDate}</p>
              {/if}
            </div>
          {/if}
        {:else}
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
            You've reached your post limit on the <strong>{currentTierName}</strong> plan. Upgrade to get more posts.
          </p>
        {/if}

        <!-- Tier comparison -->
        {#if nextTierName}
          <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-blue-900 dark:text-blue-100">{nextTierName} Plan</p>
                <p class="text-sm text-blue-700 dark:text-blue-300">
                  {#if nextTier === 'professional'}
                    Up to 2,000 posts
                  {:else}
                    Unlimited posts
                  {/if}
                </p>
              </div>
              <a
                href={upgradeUrl}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade
              </a>
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        {#if canProceed && onProceed}
          <button
            onclick={onProceed}
            class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue Anyway
          </button>
        {/if}

        <div class="flex gap-3">
          <a
            href="/admin/posts"
            class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-center font-medium rounded-lg transition-colors"
          >
            Manage Posts
          </a>

          <button
            onclick={onClose}
            class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
