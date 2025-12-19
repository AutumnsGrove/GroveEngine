<script>
  import { untrack } from 'svelte';
  import { Button } from '$lib/ui';

  let error = $state('');
  let loading = $state(false);

  $effect(() => {
    untrack(() => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      if (urlError) {
        error = urlError;
      }
    });
  });

  function handleLogin() {
    loading = true;
    // Redirect to OAuth login start route - it will handle the PKCE flow
    // Uses /start subroute to avoid SvelteKit routing conflict with this page
    window.location.href = '/auth/login/start';
  }
</script>

<svelte:head>
  <title>Admin Login - Grove</title>
</svelte:head>

<div class="login-container">
  <div class="login-box">
    <div class="logo">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="currentColor" opacity="0.2"/>
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 2.18l6 3v5.82c0 4.53-3.13 8.72-6 9.82-2.87-1.1-6-5.29-6-9.82V7.18l6-3z" fill="currentColor"/>
        <circle cx="12" cy="10" r="3" fill="currentColor"/>
      </svg>
    </div>

    <h1>Admin Panel</h1>
    <p class="subtitle">
      Sign in with your Grove account to access the admin panel
    </p>

    {#if error}
      <div class="error">
        {error}
      </div>
    {/if}

    <Button
      type="button"
      variant="default"
      size="lg"
      class="login-btn"
      disabled={loading}
      onclick={handleLogin}
    >
      {#if loading}
        <span class="spinner"></span>
        Redirecting...
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="btn-icon">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="10 17 15 12 10 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Sign in with Grove
      {/if}
    </Button>

    <p class="footer-text">
      Only authorized administrators can access this panel.
    </p>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: var(--background, #f5f5f5);
    padding: 1rem;
  }

  .login-box {
    background: var(--card, white);
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .logo {
    color: var(--primary, #22863a);
    margin-bottom: 1rem;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    color: var(--foreground, #24292e);
  }

  .subtitle {
    color: var(--muted-foreground, #586069);
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
  }

  .error {
    background: hsl(0 84% 60% / 0.1);
    border: 1px solid hsl(0 84% 60% / 0.3);
    color: hsl(0 84% 40%);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  :global(.login-btn) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.5rem !important;
    width: 100% !important;
    padding: 0.875rem 1.5rem !important;
  }

  .btn-icon {
    flex-shrink: 0;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .footer-text {
    margin: 1.5rem 0 0 0;
    color: var(--muted-foreground, #6a737d);
    font-size: 0.8rem;
  }
</style>
