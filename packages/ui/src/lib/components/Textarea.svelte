<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    /** Error state */
    error?: boolean;
    /** Error message to display */
    errorMessage?: string;
    /** Help text to display below textarea */
    helpText?: string;
    /** Label text */
    label?: string;
    /** Mark field as required */
    required?: boolean;
    /** Auto-resize based on content */
    autoResize?: boolean;
    /** Minimum height in rows */
    minRows?: number;
    /** Maximum height in rows */
    maxRows?: number;
  }

  let {
    error = false,
    errorMessage = '',
    helpText = '',
    label = '',
    required = false,
    disabled = false,
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    id,
    class: className = '',
    value = $bindable(''),
    ...restProps
  }: Props = $props();

  // Generate unique ID if not provided
  const textareaId = id || `grove-textarea-${Math.random().toString(36).slice(2, 9)}`;

  // Calculate line height for auto-resize (approx 24px per line)
  const lineHeight = 24;
  const minHeight = minRows * lineHeight;
  const maxHeight = maxRows * lineHeight;

  let textareaElement: HTMLTextAreaElement;

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    value = target.value;

    if (autoResize && textareaElement) {
      // Reset height to auto to get the correct scrollHeight
      textareaElement.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaElement.scrollHeight, minHeight), maxHeight);
      textareaElement.style.height = `${newHeight}px`;
    }
  }
</script>

<div class="w-full">
  {#if label}
    <label
      for={textareaId}
      class="block mb-1.5 text-sm font-medium text-bark {required ? 'after:content-[\'_*\'] after:text-red-600' : ''}"
    >
      {label}
    </label>
  {/if}

  <textarea
    bind:this={textareaElement}
    id={textareaId}
    {disabled}
    {required}
    aria-invalid={error}
    aria-describedby={errorMessage ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined}
    style="min-height: {minHeight}px; {autoResize ? `max-height: ${maxHeight}px;` : ''} {autoResize ? 'overflow-y: auto;' : ''}"
    class="
      w-full p-3 rounded-grove border bg-cream resize-y
      font-sans text-bark placeholder:text-bark-500 leading-relaxed
      transition-all duration-200 ease-grove
      focus:outline-none focus:border-grove-500 focus:ring-[3px] focus:ring-grove-500/15
      hover:border-cream-400
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:resize-none
      {error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-cream-200'}
      {autoResize ? 'resize-none' : ''}
      {className}
    "
    oninput={handleInput}
    {value}
    {...restProps}
  ></textarea>

  {#if errorMessage && error}
    <p id="{textareaId}-error" class="mt-1.5 text-xs text-red-600" role="alert">
      {errorMessage}
    </p>
  {:else if helpText}
    <p id="{textareaId}-help" class="mt-1.5 text-xs text-bark-600">
      {helpText}
    </p>
  {/if}
</div>
