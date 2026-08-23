<script lang="ts">
	import Input from "$lib/ui/components/ui/Input.svelte";
	import Button from "$lib/ui/components/ui/Button.svelte";
	import Dialog from "$lib/ui/components/ui/Dialog.svelte";
	import Select from "$lib/ui/components/ui/Select.svelte";
	import { toast } from "$lib/ui/components/ui/toast";
	import { featureIcons, actionIcons, navIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import { debounce } from "$lib/utils/debounce";
	import { clickOutside } from "$lib/actions/clickOutside";
	import CdnImagePicker from "./CdnImagePicker.svelte";
	import type {
		GutterItem,
		GalleryImage,
		ProcessedAnchor,
		ParagraphAnchor,
	} from "./gutter-manager.types.js";
	import {
		EMPTY_ANCHOR,
		createProcessedAnchor,
		generateAnchorName,
		getItemPreview,
	} from "./gutter-manager-utils.js";

	// Props
	let {
		gutterItems = $bindable<GutterItem[]>([]),
		onInsertAnchor = (_anchorName: string) => {},
		availableAnchors = [] as string[],
		availableParagraphs = [] as ParagraphAnchor[],
	} = $props();

	let processedAnchorsMap = $derived.by(() => {
		const map = new Map<string, ProcessedAnchor>();
		for (const anchor of availableAnchors) {
			const processed = createProcessedAnchor(anchor);
			map.set(anchor, processed);
		}
		for (const p of availableParagraphs) {
			const raw = `paragraph:${p.index}`;
			map.set(raw, {
				raw,
				isHeading: false,
				headingLevel: 0,
				isAnchorTag: false,
				isParagraph: true,
				paragraphIndex: p.index,
				displayText: p.preview ? `P${p.index} · ${p.preview}` : `Paragraph ${p.index}`,
				type: "paragraph",
			});
		}
		return map;
	});

	let processedAnchors = $derived(Array.from(processedAnchorsMap.values()));

	function getProcessedAnchor(anchor: string | undefined): ProcessedAnchor {
		if (!anchor) return EMPTY_ANCHOR;
		const cached = processedAnchorsMap.get(anchor);
		if (cached) return cached;
		return createProcessedAnchor(anchor);
	}

	// State
	let showAddModal = $state(false);
	let editingIndex: number | null = $state(null);

	// CDN image picker — one dialog, two callers (photo field, gallery list)
	let cdnPickerOpen = $state(false);
	let cdnPickerTarget: "photo" | "gallery" = $state("photo");

	// Form state for add/edit
	let itemType = $state("comment");
	let itemAnchor = $state("");
	let itemContent = $state("");
	let itemCaption = $state("");
	let itemUrl = $state("");
	let galleryImages: GalleryImage[] = $state([]);

	// Embed-specific form state
	let embedUrl = $state("");
	let embedProvider = $state("");
	let embedResolvedUrl = $state("");
	let embedHtml = $state("");
	let embedTitle = $state("");
	let embedThumbnail = $state("");
	let embedLoading = $state(false);
	let embedError = $state("");

	function resetForm() {
		itemType = "comment";
		itemAnchor = "";
		itemContent = "";
		itemCaption = "";
		itemUrl = "";
		galleryImages = [];
		embedUrl = "";
		embedProvider = "";
		embedResolvedUrl = "";
		embedHtml = "";
		embedTitle = "";
		embedThumbnail = "";
		embedLoading = false;
		embedError = "";
	}

	function openAddModal() {
		resetForm();
		editingIndex = null;
		showAddModal = true;
	}

	function openEditModal(index: number) {
		const item = gutterItems[index];
		itemType = item.type;
		itemAnchor = item.anchor || "";
		itemContent = item.content || "";
		itemCaption = item.caption || "";
		itemUrl = item.url || item.file || "";
		galleryImages = item.images ? [...item.images] : [];
		embedUrl = item.embedUrl || "";
		embedProvider = item.embedProvider || "";
		embedResolvedUrl = item.embedUrl || "";
		embedHtml = item.embedHtml || "";
		embedTitle = item.embedTitle || "";
		embedThumbnail = item.embedThumbnail || "";
		editingIndex = index;
		showAddModal = true;
	}

	function closeModal() {
		showAddModal = false;
		editingIndex = null;
		resetForm();
	}

	function saveItem() {
		const newItem: GutterItem = {
			type: itemType,
			anchor: itemAnchor,
		};

		if (itemType === "comment") {
			newItem.content = itemContent;
		} else if (itemType === "photo") {
			newItem.url = itemUrl;
			if (itemCaption) newItem.caption = itemCaption;
		} else if (itemType === "gallery") {
			newItem.images = galleryImages;
		} else if (itemType === "embed") {
			newItem.embedUrl = embedUrl;
			if (embedProvider) newItem.embedProvider = embedProvider;
			if (embedResolvedUrl) newItem.url = embedResolvedUrl;
			if (embedHtml) newItem.embedHtml = embedHtml;
			if (embedTitle) newItem.embedTitle = embedTitle;
			if (embedThumbnail) newItem.embedThumbnail = embedThumbnail;
		}

		if (editingIndex !== null) {
			gutterItems[editingIndex] = newItem;
			gutterItems = [...gutterItems]; // Trigger reactivity
		} else {
			gutterItems = [...gutterItems, newItem];
		}

		closeModal();
	}

	function deleteItem(index: number) {
		gutterItems = gutterItems.filter((_: GutterItem, i: number) => i !== index);
		toast.success("Vine removed");
	}

	function moveItem(index: number, direction: number) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= gutterItems.length) return;

		const items = [...gutterItems];
		const temp = items[index];
		items[index] = items[newIndex];
		items[newIndex] = temp;
		gutterItems = items;
	}

	function handleInsertAnchor() {
		const name = prompt("Enter anchor name (e.g., my-note):");
		if (name) {
			const safeName = generateAnchorName(name);
			onInsertAnchor(safeName);
			// Update the anchor field
			itemAnchor = `anchor:${safeName}`;
		}
	}

	// CDN image picker — the shared CdnImagePicker owns fetching and caching,
	// we only remember which form field asked for the image.
	function openPhotoPicker() {
		cdnPickerTarget = "photo";
		cdnPickerOpen = true;
	}

	function handleCdnSelect(url: string) {
		if (cdnPickerTarget === "gallery") {
			galleryImages = [...galleryImages, { url, alt: "", caption: "" }];
		} else {
			itemUrl = url;
		}
	}

	// Gallery helpers
	function addGalleryImage() {
		cdnPickerTarget = "gallery";
		cdnPickerOpen = true;
	}

	function removeGalleryImage(index: number) {
		galleryImages = galleryImages.filter((_: GalleryImage, i: number) => i !== index);
	}

	function updateGalleryImage(index: number, field: keyof GalleryImage, value: string) {
		galleryImages[index][field] = value;
		galleryImages = [...galleryImages];
	}

	/**
	 * Resolve embed URL against the oEmbed API
	 * Called when user pastes a URL in the embed field
	 */
	async function resolveEmbedUrl() {
		if (!embedUrl) return;

		// Basic URL validation
		try {
			new URL(embedUrl);
		} catch {
			embedError = "Please enter a valid URL";
			return;
		}

		embedLoading = true;
		embedError = "";
		embedProvider = "";
		embedResolvedUrl = "";
		embedHtml = "";
		embedTitle = "";
		embedThumbnail = "";

		try {
			const params = new URLSearchParams({ url: embedUrl });
			const response = await fetch(`/api/oembed?${params}`); // csrf-ok

			if (!response.ok) {
				throw new Error(`Failed to resolve: ${response.statusText}`);
			}

			const data: {
				type?: string;
				provider?: string;
				embedUrl?: string;
				embedHtml?: string;
				title?: string;
				thumbnail?: string;
				og?: { title?: string; image?: string };
			} = await response.json();

			if (data.type === "embed") {
				embedProvider = data.provider || "";
				embedResolvedUrl = data.embedUrl || "";
				embedHtml = data.embedHtml || "";
				embedTitle = data.title || "";
				embedThumbnail = data.thumbnail || "";
				toast.success(`Detected: ${data.provider} embed`);
			} else if (data.type === "preview") {
				// Not a known provider — will show as OG preview
				embedProvider = "";
				if (data.og) {
					embedTitle = data.og.title || "";
					embedThumbnail = data.og.image || "";
					toast.success("Link preview ready (not an embeddable provider)");
				} else {
					toast.success("URL saved — will show as a link");
				}
			}
		} catch (err) {
			embedError = err instanceof Error ? err.message : "Failed to resolve embed";
			toast.error("Failed to resolve embed URL");
		} finally {
			embedLoading = false;
		}
	}

	// Debounced embed resolution
	const debouncedResolveEmbed = debounce(resolveEmbedUrl, 600);

	// ------------------------------------------------------------------
	// The living vine
	//
	// Vines are drawn as leaves growing off a stem instead of a flat list.
	// Node placement is index-proportional, not pixel-synced to the editor
	// scroll position — the panel has no way to know where a paragraph
	// actually sits on screen, so we space leaves evenly and let the anchor
	// label in the popover carry the precise meaning.
	// ------------------------------------------------------------------

	interface VineNode {
		item: GutterItem;
		index: number;
		top: number;
		left: number;
	}

	const TYPE_LABELS: Record<string, string> = {
		comment: "Comment",
		photo: "Photo",
		gallery: "Gallery",
		embed: "Embed",
	};

	function typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? "Vine";
	}

	/**
	 * Horizontal position of the stem at vertical position t (0..1), in the
	 * SVG's 0-100 user units. Leaves are placed with this same function so
	 * every node sits exactly on the drawn path.
	 *
	 * The stem rides far right so a popover opening leftward still fits
	 * inside the panel.
	 */
	function stemX(t: number): number {
		return 82 + 3 * Math.sin(t * Math.PI * 3);
	}

	const stemPath = (() => {
		const points: string[] = [];
		for (let i = 0; i <= 48; i += 1) {
			const t = i / 48;
			points.push(`${stemX(t).toFixed(2)},${(t * 100).toFixed(2)}`);
		}
		return `M${points.join(" L")}`;
	})();

	const rootedNodes = $derived.by<VineNode[]>(() => {
		const rooted = gutterItems
			.map((item: GutterItem, index: number) => ({ item, index }))
			.filter((entry: { item: GutterItem }) => Boolean(entry.item.anchor));
		const span = Math.max(rooted.length - 1, 1);
		return rooted.map((entry: { item: GutterItem; index: number }, position: number) => {
			const t = rooted.length === 1 ? 0.5 : 0.07 + (position / span) * 0.86;
			return { item: entry.item, index: entry.index, top: t * 100, left: stemX(t) };
		});
	});

	const unrootedNodes = $derived(
		gutterItems
			.map((item: GutterItem, index: number) => ({ item, index }))
			.filter((entry: { item: GutterItem }) => !entry.item.anchor),
	);

	const vineCanvasHeight = $derived(Math.max(180, rootedNodes.length * 64 + 48));

	let openPopover: number | null = $state(null);

	function togglePopover(index: number) {
		openPopover = openPopover === index ? null : index;
	}

	function closePopover() {
		openPopover = null;
	}

	function handleVineKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && openPopover !== null) {
			openPopover = null;
		}
	}

	// The popover holds live indices, so any action that reshuffles or
	// shortens gutterItems has to dismiss it first.
	function popoverEdit(index: number) {
		closePopover();
		openEditModal(index);
	}

	function popoverDelete(index: number) {
		closePopover();
		deleteItem(index);
	}

	function popoverMove(index: number, direction: number) {
		closePopover();
		moveItem(index, direction);
	}
</script>

<svelte:window onkeydown={handleVineKeydown} />

<!-- The glyph shown inside a leaf, and again in its popover header -->
{#snippet typeGlyph(type: string)}
	{#if type === "comment"}
		<featureIcons.messageSquare class="type-icon" />
	{:else if type === "photo"}
		<actionIcons.imageIcon class="type-icon" />
	{:else if type === "gallery"}
		<featureIcons.images class="type-icon" />
	{:else if type === "embed"}
		<actionIcons.link2 class="type-icon" />
	{:else}
		<actionIcons.pin class="type-icon" />
	{/if}
{/snippet}

{#snippet anchorBadge(anchor: ProcessedAnchor)}
	{#if anchor.isHeading}
		<span class="anchor-badge heading-badge" aria-hidden="true">H{anchor.headingLevel}</span>
	{:else if anchor.isAnchorTag}
		<span class="anchor-badge tag-badge" aria-hidden="true"><actionIcons.anchor size={12} /></span>
	{:else}
		<span class="anchor-badge para-badge" aria-hidden="true"><actionIcons.pilcrow size={12} /></span
		>
	{/if}
{/snippet}

<!-- Shared popover body for both rooted leaves and the unrooted tray -->
{#snippet popoverBody(item: GutterItem, index: number)}
	{@const anchor = getProcessedAnchor(item.anchor)}
	<div class="popover-head">
		<span class="popover-type">
			<span class="popover-type-icon" aria-hidden="true">{@render typeGlyph(item.type)}</span>
			<span>{typeLabel(item.type)}</span>
		</span>
		<button class="action-btn" onclick={closePopover} title="Close" aria-label="Close vine details">
			<stateIcons.x class="action-icon" />
		</button>
	</div>

	<div class="popover-anchor">
		{#if item.anchor}
			{@render anchorBadge(anchor)}
			<span class="item-anchor-text" title={item.anchor}>{anchor.displayText}</span>
			<span class="visually-hidden">Anchored to {anchor.type}: {anchor.displayText}</span>
		{:else}
			<span class="no-anchor-warning" role="alert">⚠ No anchor set</span>
		{/if}
	</div>

	<p class="popover-preview">{getItemPreview(item)}</p>

	<div class="popover-actions">
		<button
			class="action-btn"
			onclick={() => popoverMove(index, -1)}
			disabled={index === 0}
			title="Move up"
			aria-label="Move item up"
		>
			<navIcons.chevronUp class="action-icon" />
		</button>
		<button
			class="action-btn"
			onclick={() => popoverMove(index, 1)}
			disabled={index === gutterItems.length - 1}
			title="Move down"
			aria-label="Move item down"
		>
			<navIcons.chevronDown class="action-icon" />
		</button>
		<span class="popover-actions-gap"></span>
		<button
			class="action-btn"
			onclick={() => popoverEdit(index)}
			title="Edit"
			aria-label="Edit item"
		>
			<actionIcons.edit class="action-icon" />
		</button>
		<button
			class="action-btn delete"
			onclick={() => popoverDelete(index)}
			title="Delete"
			aria-label="Delete item"
		>
			<stateIcons.x class="action-icon" />
		</button>
	</div>
{/snippet}

<div class="vines-manager">
	<div class="vines-header">
		<h3>Vines</h3>
		<button class="add-btn" onclick={openAddModal}>
			<actionIcons.plus class="btn-icon" />
			<span>Add Item</span>
		</button>
	</div>

	{#if gutterItems.length === 0}
		<div class="empty-state">
			<p>No vines yet.</p>
			<p class="hint">Add comments, images, or galleries that appear alongside your content.</p>
		</div>
	{:else}
		<div class="vines-growth">
			{#if rootedNodes.length > 0}
				<div class="vine-canvas" style="height: {vineCanvasHeight}px">
					<svg
						class="vine-svg"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						aria-hidden="true"
						focusable="false"
					>
						<path class="vine-stem" d={stemPath} fill="none" />
						<g class="vine-sprigs">
							<path
								class="sprig"
								d="M0,0 q7,-3 9,4 q-7,3 -9,-4 Z"
								transform="translate(74 14) rotate(200)"
							/>
							<path
								class="sprig"
								d="M0,0 q7,-3 9,4 q-7,3 -9,-4 Z"
								transform="translate(87 40) rotate(-20)"
							/>
							<path
								class="sprig"
								d="M0,0 q7,-3 9,4 q-7,3 -9,-4 Z"
								transform="translate(74 66) rotate(190)"
							/>
							<path
								class="sprig"
								d="M0,0 q7,-3 9,4 q-7,3 -9,-4 Z"
								transform="translate(86 90) rotate(-15)"
							/>
						</g>
					</svg>

					{#each rootedNodes as node, order (node.index)}
						{@const anchor = getProcessedAnchor(node.item.anchor)}
						<div
							class="vine-node"
							style="--node-top: {node.top}%; --node-left: {node.left}%; --leaf-order: {order}"
						>
							<button
								class="leaf-btn"
								class:active={openPopover === node.index}
								type="button"
								aria-expanded={openPopover === node.index}
								aria-label="{typeLabel(node.item.type)} vine at {anchor.displayText}"
								title={anchor.displayText}
								onclick={() => togglePopover(node.index)}
							>
								<span class="leaf-glyph">{@render typeGlyph(node.item.type)}</span>
							</button>

							{#if openPopover === node.index}
								<div
									class="vine-popover"
									role="dialog"
									aria-label="Vine details"
									use:clickOutside={() => {
										if (openPopover === node.index) openPopover = null;
									}}
								>
									{@render popoverBody(node.item, node.index)}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if unrootedNodes.length > 0}
				<div class="unrooted">
					<p class="unrooted-title">
						<span aria-hidden="true">⚠</span> Not rooted yet
					</p>
					<p class="unrooted-hint">
						These have no anchor, so readers will not see them beside anything.
					</p>
					<div class="unrooted-row">
						{#each unrootedNodes as node (node.index)}
							<button
								class="leaf-btn leaf-unrooted"
								class:active={openPopover === node.index}
								type="button"
								aria-expanded={openPopover === node.index}
								aria-label="{typeLabel(node.item.type)} vine, no anchor set"
								title="{typeLabel(node.item.type)}, no anchor set"
								onclick={() => togglePopover(node.index)}
							>
								<span class="leaf-glyph">{@render typeGlyph(node.item.type)}</span>
							</button>
						{/each}
					</div>

					{#each unrootedNodes as node (node.index)}
						{#if openPopover === node.index}
							<div class="vine-popover popover-inline" role="dialog" aria-label="Vine details">
								{@render popoverBody(node.item, node.index)}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Add/Edit Modal -->
<Dialog bind:open={showAddModal} title={editingIndex !== null ? "Edit Vine" : "Add Vine"}>
	{#snippet children()}
		<div class="form-group">
			<label for="item-type">Type</label>
			<Select
				bind:value={itemType}
				options={[
					{ value: "comment", label: "Comment (Markdown)" },
					{ value: "photo", label: "Photo" },
					{ value: "gallery", label: "Image Gallery" },
					{ value: "embed", label: "Embed / Link Preview" },
				]}
			/>
		</div>

		<div class="form-group">
			<label for="item-anchor">Anchor</label>
			<div class="anchor-input-row">
				<Input
					type="text"
					id="item-anchor"
					bind:value={itemAnchor}
					placeholder="## Heading or anchor:name"
				/>
				<Button variant="outline" onclick={handleInsertAnchor} title="Insert new anchor in editor">
					+ Anchor
				</Button>
			</div>
			<span class="form-hint">
				Use <code>## Heading</code>, <code>paragraph:N</code>, or <code>anchor:name</code>
			</span>
		</div>

		{#if processedAnchors.length > 0}
			<div class="available-anchors-section">
				<span class="anchors-label" id="anchor-selection-label"
					>Click to select anchor location:</span
				>
				<div class="anchor-list" role="listbox" aria-labelledby="anchor-selection-label">
					{#each processedAnchors as anchor}
						<button
							type="button"
							class="anchor-option"
							class:selected={itemAnchor === anchor.raw}
							class:heading={anchor.isHeading}
							class:anchor-tag={anchor.isAnchorTag}
							role="option"
							aria-selected={itemAnchor === anchor.raw}
							aria-label="Select {anchor.type}: {anchor.displayText}"
							onclick={() => (itemAnchor = anchor.raw)}
						>
							{#if anchor.isHeading}
								<span class="anchor-icon heading-icon" aria-hidden="true"
									>H{anchor.headingLevel}</span
								>
							{:else if anchor.isAnchorTag}
								<span class="anchor-icon tag-icon" aria-hidden="true"
									><actionIcons.anchor size={12} /></span
								>
							{:else}
								<span class="anchor-icon para-icon" aria-hidden="true"
									><actionIcons.pilcrow size={12} /></span
								>
							{/if}
							<span class="anchor-text">{anchor.displayText}</span>
							{#if itemAnchor === anchor.raw}
								<span class="selected-check" aria-hidden="true"
									><stateIcons.check class="w-3 h-3" /></span
								>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="no-anchors-hint">
				<p>
					No anchors found. Add headings to your content or use "Add Anchor" to create custom anchor
					points.
				</p>
			</div>
		{/if}

		{#if itemType === "comment"}
			<div class="form-group">
				<label for="item-content">Content (Markdown)</label>
				<textarea
					id="item-content"
					bind:value={itemContent}
					placeholder="Write your note in markdown..."
					rows="6"
					class="form-input form-textarea"
				></textarea>
			</div>
		{/if}

		{#if itemType === "photo"}
			<div class="form-group">
				<label for="item-url">Image URL</label>
				<div class="url-input-row">
					<Input
						type="text"
						id="item-url"
						bind:value={itemUrl}
						placeholder="https://cdn.grove.place/..."
					/>
					<Button variant="outline" onclick={openPhotoPicker}>Browse Images</Button>
				</div>
			</div>

			<div class="form-group">
				<label for="item-caption">Caption (optional)</label>
				<Input type="text" id="item-caption" bind:value={itemCaption} placeholder="Photo caption" />
			</div>

			{#if itemUrl}
				<div class="image-preview">
					<img src={itemUrl} alt="Preview" />
				</div>
			{/if}
		{/if}

		{#if itemType === "gallery"}
			<div class="form-group">
				<div class="gallery-label">Gallery Images</div>
				<div class="gallery-list">
					{#each galleryImages as image, i (i)}
						<div class="gallery-image-item">
							<img src={image.url} alt={image.alt || "Gallery image"} class="gallery-thumb" />
							<div class="gallery-image-fields">
								<Input
									type="text"
									value={image.alt}
									oninput={(e) =>
										updateGalleryImage(i, "alt", (e.currentTarget as HTMLInputElement).value)}
									placeholder="Alt text"
									class="small"
								/>
								<Input
									type="text"
									value={image.caption}
									oninput={(e) =>
										updateGalleryImage(i, "caption", (e.currentTarget as HTMLInputElement).value)}
									placeholder="Caption"
									class="small"
								/>
							</div>
							<button type="button" class="remove-btn" onclick={() => removeGalleryImage(i)}
								><stateIcons.x class="w-3.5 h-3.5" /></button
							>
						</div>
					{/each}
				</div>
				<button type="button" class="add-image-btn" onclick={addGalleryImage}> + Add Image </button>
			</div>
		{/if}

		{#if itemType === "embed"}
			<div class="form-group">
				<label for="embed-url">URL to Embed</label>
				<div class="url-input-row">
					<Input
						type="text"
						id="embed-url"
						bind:value={embedUrl}
						placeholder="https://strawpoll.com/polls/... or any URL"
						oninput={() => debouncedResolveEmbed()}
					/>
					<Button variant="outline" onclick={resolveEmbedUrl} disabled={embedLoading || !embedUrl}>
						{#if embedLoading}
							<stateIcons.loader class="btn-icon animate-spin" />
						{:else}
							Resolve
						{/if}
					</Button>
				</div>
				<span class="form-hint">
					Paste a URL. Supported providers auto-embed; others show a link preview.
				</span>
			</div>

			{#if embedLoading}
				<div class="embed-resolving">
					<stateIcons.loader class="type-icon animate-spin" />
					<span>Resolving URL...</span>
				</div>
			{/if}

			{#if embedError}
				<div class="embed-error">{embedError}</div>
			{/if}

			{#if embedProvider}
				<div class="embed-resolved">
					<div class="embed-resolved-badge">
						<actionIcons.link2 class="type-icon" />
						<span class="embed-provider-name">{embedProvider}</span>
						<span class="embed-resolved-label">interactive embed</span>
					</div>
					{#if embedTitle}
						<div class="embed-resolved-title">{embedTitle}</div>
					{/if}
					{#if embedThumbnail}
						<div class="embed-thumbnail-preview">
							<img src={embedThumbnail} alt="Embed thumbnail" />
						</div>
					{/if}
				</div>
			{:else if embedTitle && !embedLoading && embedUrl}
				<div class="embed-resolved">
					<div class="embed-resolved-badge preview-badge">
						<actionIcons.link2 class="type-icon" />
						<span class="embed-resolved-label">link preview</span>
					</div>
					{#if embedTitle}
						<div class="embed-resolved-title">{embedTitle}</div>
					{/if}
					{#if embedThumbnail}
						<div class="embed-thumbnail-preview">
							<img src={embedThumbnail} alt="Preview thumbnail" />
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={closeModal}>Cancel</Button>
		<Button onclick={saveItem}>
			{editingIndex !== null ? "Update" : "Add"} Item
		</Button>
	{/snippet}
</Dialog>

<!-- Shared CDN image picker (photo field + gallery "Add Image") -->
<CdnImagePicker bind:open={cdnPickerOpen} onSelect={handleCdnSelect} />

<style>
	.vines-manager {
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		border: 1px solid var(--grove-overlay-15);
		border-radius: 12px;
		/*
		 * Visible, not hidden: leaf popovers open leftward out of the vine
		 * canvas and must not be clipped by the panel's own bounding box.
		 * The header carries its own top radius now that nothing clips it.
		 */
		overflow: visible;
		/* Lets the popover narrow itself when the panel is narrow. */
		container-type: inline-size;
	}

	.vines-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1rem;
		background: var(--grove-overlay-5);
		border-bottom: 1px solid var(--grove-border-subtle);
		border-radius: 11px 11px 0 0;
	}

	.vines-header h3 {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-primary);
		font-weight: 600;
	}

	:global(.dark) .vines-header h3 {
		color: var(--grove-accent);
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: var(--grove-overlay-10);
		color: var(--color-primary);
		border: 1px solid var(--grove-border);
		border-radius: var(--border-radius-button);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.dark) .add-btn {
		color: var(--grove-accent);
	}

	.add-btn:hover {
		background: var(--grove-overlay-18);
		border-color: var(--grove-border-strong);
	}

	:global(.btn-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	:global(.dark) .empty-state {
		color: var(--grove-text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-state .hint {
		font-size: 0.85rem;
		color: var(--color-text-subtle);
	}

	:global(.dark) .empty-state .hint {
		color: var(--grove-text-subtle);
	}

	:global(.type-icon) {
		width: 1rem;
		height: 1rem;
	}

	/* ---------- the living vine ---------- */

	.vines-growth {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.vine-canvas {
		position: relative;
		/* Popovers escape this box on purpose. */
		overflow: visible;
	}

	.vine-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.vine-stem {
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
		opacity: 0.35;
	}

	:global(.dark) .vine-stem {
		stroke: var(--grove-accent);
		opacity: 0.45;
	}

	.sprig {
		fill: var(--color-primary);
		opacity: 0.2;
	}

	:global(.dark) .sprig {
		fill: var(--grove-accent);
		opacity: 0.25;
	}

	.vine-node {
		position: absolute;
		top: var(--node-top);
		left: var(--node-left);
		transform: translate(-50%, -50%);
	}

	.leaf-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: 1.5px solid var(--grove-border-strong);
		/* leaf silhouette: pointed at two opposite corners */
		border-radius: 54% 8% 54% 8%;
		background: var(--glass-bg-medium);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: var(--color-primary);
		cursor: pointer;
		transform: rotate(-6deg);
		animation: leaf-unfurl 0.35s ease both;
		animation-delay: calc(var(--leaf-order, 0) * 45ms);
		transition:
			transform 0.15s ease,
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	:global(.dark) .leaf-btn {
		color: var(--grove-accent);
		background: rgba(33, 28, 23, 0.45);
	}

	.leaf-glyph {
		display: flex;
		transform: rotate(6deg);
	}

	.leaf-btn:hover {
		transform: rotate(-6deg) scale(1.1);
		background: var(--grove-accent-15);
		border-color: var(--grove-accent-40);
	}

	.leaf-btn.active {
		background: var(--grove-accent-15);
		border-color: var(--grove-accent-40);
	}

	.leaf-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	@keyframes leaf-unfurl {
		from {
			opacity: 0;
			transform: rotate(-6deg) scale(0.6);
		}
		to {
			opacity: 1;
			transform: rotate(-6deg) scale(1);
		}
	}

	/*
	 * Popover placement — the load-bearing fix.
	 *
	 * This panel docks to the right edge of the editor, so a popover opening
	 * rightward runs straight off the viewport. Everything anchors leftward
	 * from its leaf instead, and the stem is drawn far enough right that the
	 * popover still lands inside the panel.
	 */
	.vine-popover {
		position: absolute;
		top: 50%;
		right: calc(100% + 10px);
		left: auto;
		transform: translateY(-50%);
		/* Leaves sit around x:79-85% of the panel (see stemX()) — the popover
		   has to fit in that leftward gap without spilling past the panel's
		   own edge into the editor, so this stays modest even though the
		   panel itself is 340px wide. */
		width: 200px;
		max-width: min(200px, calc(100vw - 3rem));
		z-index: 40;
		padding: 0.75rem 0.85rem;
		background: var(--glass-bg);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border: 1px solid var(--grove-border);
		border-radius: 10px;
		box-shadow: 0 10px 28px var(--grove-overlay-15);
	}

	/* Narrow panels get a narrower popover so it still clears the left edge. */
	@container (max-width: 290px) {
		.vine-popover {
			width: 170px;
			max-width: 170px;
		}
	}

	@container (max-width: 240px) {
		.vine-popover {
			width: 145px;
			max-width: 145px;
		}
	}

	/* Unrooted popovers sit in normal flow inside the tray — nothing to clip. */
	.vine-popover.popover-inline {
		position: static;
		transform: none;
		width: auto;
		max-width: none;
		margin-top: 0.6rem;
	}

	.popover-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.35rem;
	}

	.popover-type {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	:global(.dark) .popover-type {
		color: var(--grove-accent);
	}

	.popover-type-icon {
		display: flex;
	}

	.popover-anchor {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		margin-top: 0.4rem;
	}

	.popover-preview {
		margin: 0.35rem 0 0.55rem;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--color-text-subtle);
		overflow-wrap: anywhere;
	}

	:global(.dark) .popover-preview {
		color: var(--grove-text-subtle);
	}

	.popover-actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.popover-actions-gap {
		flex: 1;
	}

	/* ---------- unrooted tray ---------- */

	.unrooted {
		padding: 0.7rem 0.8rem;
		background: var(--grove-overlay-5);
		border: 1px dashed var(--grove-border);
		border-radius: 10px;
	}

	.unrooted-title {
		margin: 0 0 0.2rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: hsl(var(--warning));
	}

	:global(.dark) .unrooted-title {
		color: hsl(var(--warning-muted));
	}

	.unrooted-hint {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		line-height: 1.45;
		color: var(--color-text-subtle);
	}

	:global(.dark) .unrooted-hint {
		color: var(--grove-text-subtle);
	}

	.unrooted-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.leaf-unrooted {
		border-style: dashed;
		border-color: hsl(var(--warning));
	}

	.leaf-unrooted:hover,
	.leaf-unrooted.active {
		border-color: hsl(var(--warning));
	}

	.anchor-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 16px;
		font-size: 0.6rem;
		font-weight: 700;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.heading-badge {
		background: rgba(124, 77, 171, 0.15);
		color: #7c4dab;
	}

	:global(.dark) .heading-badge {
		background: rgba(201, 160, 232, 0.15);
		color: #c9a0e8;
	}

	.tag-badge {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		font-size: 0.65rem;
	}

	:global(.dark) .tag-badge {
		background: rgba(96, 165, 250, 0.15);
		color: #60a5fa;
	}

	.para-badge {
		background: rgba(107, 114, 128, 0.15);
		color: var(--color-foreground-muted);
		font-size: 0.65rem;
	}

	.item-anchor-text {
		font-family: -apple-system, system-ui, sans-serif;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .item-anchor-text {
		color: var(--grove-text-strong);
	}

	.no-anchor-warning {
		font-size: 0.7rem;
		color: hsl(var(--warning));
		font-style: italic;
	}

	:global(.dark) .no-anchor-warning {
		color: hsl(var(--warning-muted));
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-text-subtle);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.dark) .action-btn {
		color: var(--grove-text-subtle);
	}

	:global(.action-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--grove-overlay-10);
		color: var(--color-primary);
	}

	:global(.dark) .action-btn:hover:not(:disabled) {
		background: var(--grove-overlay-15);
		color: var(--grove-accent);
	}

	.action-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.action-btn.delete:hover {
		background: var(--color-error-bg);
		color: var(--color-error);
	}

	:global(.dark) .action-btn.delete:hover {
		background: var(--color-error-bg);
		color: var(--color-error);
	}

	/* Form Styles - These appear in the Dialog component */
	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label,
	.gallery-label {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.form-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		color: var(--color-text);
		font-size: 0.9rem;
		font-family: inherit;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
		font-family: "JetBrains Mono", "Fira Code", monospace;
	}

	.form-hint {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-text-subtle);
	}

	.form-hint code {
		background: var(--color-bg-secondary);
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		color: var(--color-primary);
	}

	.anchor-input-row,
	.url-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.anchor-input-row .form-input,
	.url-input-row .form-input {
		flex: 1;
	}

	/* Improved anchor selection UI */
	.available-anchors-section {
		margin-bottom: 1rem;
		background: var(--grove-overlay-5);
		border: 1px solid var(--grove-border-subtle);
		border-radius: 10px;
		padding: 0.75rem;
	}

	.anchors-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-subtle);
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.anchor-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.anchor-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--glass-bg-medium, rgba(255, 255, 255, 0.5));
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid var(--grove-border-subtle);
		border-radius: 8px;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.anchor-option:hover {
		background: var(--grove-overlay-15);
		border-color: var(--grove-overlay-25);
		transform: translateX(4px);
	}

	.anchor-option.selected {
		background: var(--grove-accent-15);
		border-color: var(--grove-accent-40);
		color: var(--color-primary);
	}

	:global(.dark) .anchor-option {
		background: rgba(33, 28, 23, 0.35);
		border-color: var(--grove-accent-10);
	}

	:global(.dark) .anchor-option:hover {
		background: rgba(33, 28, 23, 0.5);
		border-color: var(--grove-accent-20);
	}

	:global(.dark) .anchor-option.selected {
		background: var(--grove-accent-15);
		border-color: var(--grove-accent-40);
		color: var(--grove-accent);
	}

	.anchor-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 20px;
		font-size: 0.65rem;
		font-weight: 700;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.heading-icon {
		background: rgba(124, 77, 171, 0.15);
		color: #7c4dab;
	}

	:global(.dark) .heading-icon {
		background: rgba(201, 160, 232, 0.15);
		color: #c9a0e8;
	}

	.tag-icon {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		font-size: 0.75rem;
	}

	:global(.dark) .tag-icon {
		background: rgba(96, 165, 250, 0.15);
		color: #60a5fa;
	}

	.para-icon {
		background: rgba(107, 114, 128, 0.15);
		color: var(--color-foreground-muted);
		font-size: 0.75rem;
	}

	.anchor-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selected-check {
		color: var(--color-primary);
		font-weight: 600;
		flex-shrink: 0;
	}

	:global(.dark) .selected-check {
		color: var(--grove-accent);
	}

	.no-anchors-hint {
		padding: 1rem;
		background: var(--grove-overlay-5);
		border: 1px dashed var(--grove-border);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.no-anchors-hint p {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		text-align: center;
	}

	.image-preview {
		margin-top: 0.5rem;
		max-height: 150px;
		overflow: hidden;
		border-radius: 8px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
	}

	.image-preview img {
		width: 100%;
		height: auto;
		object-fit: contain;
	}

	.gallery-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.gallery-image-item {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		background: var(--color-bg-secondary);
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
	}

	.gallery-thumb {
		width: 50px;
		height: 50px;
		object-fit: cover;
		border-radius: 4px;
	}

	.gallery-image-fields {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.remove-btn {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: none;
		color: var(--color-error);
		font-size: 1.2rem;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.remove-btn:hover {
		color: var(--color-error);
	}

	.add-image-btn {
		padding: 0.5rem;
		background: transparent;
		border: 1px dashed var(--grove-overlay-30);
		border-radius: 8px;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 0.85rem;
		width: 100%;
		transition: all 0.15s ease;
	}

	.add-image-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: var(--grove-overlay-5);
	}

	:global(.dark) .add-image-btn:hover {
		border-color: var(--grove-accent);
		color: var(--grove-accent);
	}

	/* Embed form styles */
	.embed-resolving {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--grove-overlay-5);
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.embed-error {
		padding: 0.5rem 0.75rem;
		background: var(--color-error-bg);
		border: 1px solid var(--color-error-border);
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.8rem;
		color: var(--color-error);
	}

	:global(.dark) .embed-error {
		background: var(--color-error-bg);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.embed-resolved {
		padding: 0.75rem;
		background: var(--grove-accent-6);
		border: 1px solid var(--grove-accent-20);
		border-radius: 10px;
		margin-bottom: 1rem;
	}

	:global(.dark) .embed-resolved {
		background: var(--grove-accent-6);
		border-color: var(--grove-accent-15);
	}

	.embed-resolved-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.embed-provider-name {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-primary);
	}

	:global(.dark) .embed-provider-name {
		color: var(--grove-accent);
	}

	.embed-resolved-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--grove-accent);
		background: var(--grove-accent-10);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-weight: 600;
	}

	.preview-badge .embed-resolved-label {
		color: hsl(var(--info));
		background: hsl(var(--info-bg));
	}

	:global(.dark) .preview-badge .embed-resolved-label {
		color: hsl(var(--info));
		background: hsl(var(--info-bg));
	}

	.embed-resolved-title {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-bottom: 0.4rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.embed-thumbnail-preview {
		max-height: 100px;
		overflow: hidden;
		border-radius: 6px;
		background: var(--color-bg-secondary);
	}

	.embed-thumbnail-preview img {
		width: 100%;
		height: auto;
		object-fit: cover;
	}

	:global(.animate-spin) {
		animation: gutter-spin 1s linear infinite;
	}

	@keyframes gutter-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Dark mode for form elements inside Dialog */
	:global(.dark) .form-group label,
	:global(.dark) .gallery-label {
		color: var(--color-foreground);
	}

	:global(.dark) .form-input {
		background: rgba(15, 23, 42, 0.6);
		border-color: var(--grove-accent-15);
		color: var(--color-foreground);
	}

	:global(.dark) .form-input:focus {
		border-color: var(--grove-accent);
	}

	:global(.dark) .form-hint {
		color: var(--color-foreground-muted);
	}

	:global(.dark) .form-hint code {
		background: rgba(15, 23, 42, 0.6);
		color: var(--grove-accent);
	}

	:global(.dark) .anchors-label {
		color: var(--color-foreground-muted);
	}

	:global(.dark) .no-anchors-hint {
		background: rgba(15, 23, 42, 0.3);
		border-color: var(--grove-accent-10);
	}

	:global(.dark) .no-anchors-hint p {
		color: var(--color-foreground-muted);
	}

	:global(.dark) .image-preview {
		background: rgba(15, 23, 42, 0.6);
		border-color: var(--grove-accent-15);
	}

	:global(.dark) .gallery-image-item {
		background: rgba(15, 23, 42, 0.6);
		border-color: var(--grove-accent-15);
	}

	:global(.dark) .embed-resolving {
		background: rgba(15, 23, 42, 0.4);
		color: var(--color-foreground);
	}

	:global(.dark) .embed-resolved-title {
		color: var(--color-foreground);
	}

	:global(.dark) .embed-thumbnail-preview {
		background: rgba(15, 23, 42, 0.6);
	}

	:global(.dark) .add-image-btn {
		color: var(--color-foreground-muted);
		border-color: var(--grove-accent-15);
	}

	@media (prefers-reduced-motion: reduce) {
		.leaf-btn {
			animation: none;
			transition: none;
		}

		.leaf-btn:hover {
			transform: rotate(-6deg);
		}
	}

	/* Screen reader only utility */
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
