<script>
  import { untrack } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  let email = $state('');
  let code = $state('');
  let step = $state('email'); // 'email' or 'code'
  let loading = $state(false);
  let error = $state('');
  let message = $state('');

  const errorMessages = {
    'invalid_code': 'Invalid or expired code. Please try again.',
    'send_failed': 'Failed to send code. Please try again.',
    'server_error': 'Server error. Please try again.'
  };

  $effect(() => {
    untrack(() => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error') || '';
      error = errorMessages[urlError] || (urlError ? 'An error occurred.' : '');
    });
  });

  async function handleSendCode(event) {
    event.preventDefault();
    if (!email.trim()) return;

    loading = true;
    error = '';
    message = '';

    try {
      const response = await fetch('/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Failed to send code';
        return;
      }

      message = 'Code sent! Check your email.';
      step = 'code';
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    const cleanCode = code.replace(/\s/g, '');
    if (!cleanCode) return;

    loading = true;
    error = '';

    try {
      const response = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: cleanCode })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Invalid code';
        return;
      }

      // Redirect to admin
      window.location.href = data.redirect || '/admin';
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    step = 'email';
    code = '';
    error = '';
    message = '';
  }
</script>

<svelte:head>
  <title>Admin Login - Autumns Grove</title>
</svelte:head>

<div class="login-container">
  <div class="login-box">
    <h1>Admin Panel</h1>
    <p class="subtitle">
      {#if step === 'email'}
        Enter your email to receive a login code
      {:else}
        Enter the 6-digit code sent to your email
      {/if}
    </p>

    {#if error}
      <div class="error">
        {error}
      </div>
    {/if}

    {#if message}
      <div class="success">
        {message}
      </div>
    {/if}

    {#if step === 'email'}
      <form onsubmit={handleSendCode}>
        <Input
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          required
          disabled={loading}
          autocomplete="email"
          autocorrect="on"
        />
        <Button type="submit" variant="default" size="lg" class="login-btn" disabled={loading}>
          {#if loading}
            Sending...
          {:else}
            Send Login Code
          {/if}
        </Button>
      </form>
    {:else}
      <form onsubmit={handleVerifyCode}>
        <Input
          type="text"
          bind:value={code}
          placeholder="123456"
          required
          disabled={loading}
          autocomplete="one-time-code"
          inputmode="numeric"
          maxlength="6"
        />
        <Button type="submit" variant="default" size="lg" class="login-btn" disabled={loading}>
          {#if loading}
            Verifying...
          {:else}
            Verify Code
          {/if}
        </Button>
        <Button type="button" variant="ghost" class="back-btn" onclick={handleBack} disabled={loading}>
          Use a different email
        </Button>
      </form>
    {/if}

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
    background: #f5f5f5;
    padding: 1rem;
  }

  .login-box {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    color: #24292e;
  }

  .subtitle {
    color: #586069;
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
  }

  .error {
    background: #ffeef0;
    border: 1px solid #f97583;
    color: #d73a49;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .success {
    background: #dcffe4;
    border: 1px solid #34d058;
    color: #22863a;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input {
    padding: 0.875rem 1rem;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }

  input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
  }

  input::placeholder {
    color: #959da5;
  }

  input[type="text"] {
    font-size: 1.5rem;
    letter-spacing: 0.5rem;
    font-weight: 500;
  }

  .login-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #24292e;
    color: white;
    padding: 0.875rem 1.5rem;
    border-radius: 6px;
    border: none;
    font-weight: 500;
    font-size: 1rem;
    width: 100%;
    cursor: pointer;
    transition: background 0.2s;
  }

  .login-btn:hover:not(:disabled) {
    background: #2f363d;
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .back-btn {
    background: transparent;
    color: #586069;
    border: none;
    padding: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .back-btn:hover:not(:disabled) {
    color: #24292e;
  }

  .back-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .footer-text {
    margin: 1.5rem 0 0 0;
    color: #6a737d;
    font-size: 0.8rem;
  }
</style>
