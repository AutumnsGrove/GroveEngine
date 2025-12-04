<script lang="ts">
	import { Textarea as ShadcnTextarea } from "$lib/components/primitives/textarea";
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	/**
	 * Textarea component wrapper with label, error handling, and validation
	 *
	 * @prop {string} [label] - Textarea label text (renders above textarea)
	 * @prop {string} [error] - Error message to display (turns border red)
	 * @prop {string} [value] - Textarea value (bindable for two-way binding)
	 * @prop {string} [placeholder] - Placeholder text
	 * @prop {number} [rows] - Number of visible text rows
	 * @prop {boolean} [required=false] - Whether textarea is required (shows asterisk)
	 * @prop {boolean} [disabled=false] - Whether textarea is disabled
	 * @prop {string} [class] - Additional CSS classes to apply
	 *
	 * @example
	 * <Textarea label="Description" bind:value={description} required />
	 *
	 * @example
	 * <Textarea label="Notes" bind:value={notes} rows={5} error={notesError} />
	 *
	 * @example
	 * <Textarea placeholder="Enter your message..." bind:value={message} />
	 */
	interface Props extends Omit<HTMLTextareaAttributes, "class"> {
		label?: string;
		error?: string;
		value?: string;
		placeholder?: string;
		rows?: number;
		required?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		label,
		error,
		value = $bindable(""),
		placeholder,
		rows,
		required = false,
		disabled = false,
		class: className,
		...restProps
	}: Props = $props();

	const textareaClass = $derived(
		cn(
			error && "border-destructive focus-visible:ring-destructive/20",
			className
		)
	);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
			{label}
			{#if required}
				<span class="text-destructive">*</span>
			{/if}
		</label>
	{/if}

	<ShadcnTextarea
		bind:value
		{placeholder}
		{rows}
		{required}
		{disabled}
		class={textareaClass}
		{...restProps}
	/>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
