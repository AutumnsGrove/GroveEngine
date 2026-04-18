#!/usr/bin/env bun
/**
 * Data Migration: Gallery Tables from Curio DB → Engine DB
 *
 * Context: Gallery tables were created in curios DB (migration 031), but the
 * upload pipeline writes to engine DB. This script copies all existing gallery
 * data from grove-curios-db to grove-engine-db.
 *
 * Prerequisites:
 * 1. Run migration 110_gallery_to_engine_db.sql on grove-engine-db
 * 2. Ensure wrangler is authenticated (wrangler whoami)
 *
 * Usage:
 *   bun run scripts/migrations/migrate-gallery-to-engine-db.ts
 *   bun run scripts/migrations/migrate-gallery-to-engine-db.ts --dry-run
 */

import { execSync } from "child_process";

const DRY_RUN = process.argv.includes("--dry-run");

interface GalleryImage {
	id: string;
	tenant_id: string;
	r2_key: string;
	parsed_date: string | null;
	parsed_category: string | null;
	parsed_slug: string | null;
	custom_title: string | null;
	custom_description: string | null;
	custom_date: string | null;
	alt_text: string | null;
	file_size: number | null;
	uploaded_at: string | null;
	cdn_url: string | null;
	width: number | null;
	height: number | null;
	aspect_ratio: number | null;
	thumbnail_r2_key: string | null;
	dominant_color: string | null;
	sort_index: number;
	is_featured: number;
	created_at: number;
	updated_at: number;
}

interface GalleryConfig {
	tenant_id: string;
	enabled: number;
	r2_bucket: string | null;
	cdn_base_url: string | null;
	gallery_title: string | null;
	gallery_description: string | null;
	items_per_page: number;
	sort_order: string;
	show_descriptions: number;
	show_dates: number;
	show_tags: number;
	enable_lightbox: number;
	enable_search: number;
	enable_filters: number;
	grid_style: string;
	thumbnail_size: string;
	settings: string;
	custom_css: string | null;
	created_at: number;
	updated_at: number;
}

interface GalleryTag {
	id: string;
	tenant_id: string;
	name: string;
	slug: string;
	color: string;
	description: string | null;
	sort_order: number;
	created_at: number;
}

interface GalleryImageTag {
	image_id: string;
	tag_id: string;
	created_at: number;
}

interface GalleryCollection {
	id: string;
	tenant_id: string;
	name: string;
	slug: string;
	description: string | null;
	cover_image_id: string | null;
	display_order: number;
	is_public: number;
	created_at: number;
	updated_at: number;
}

interface GalleryCollectionImage {
	collection_id: string;
	image_id: string;
	display_order: number;
	created_at: number;
}

function wranglerQuery(db: string, sql: string): any {
	const escaped = sql.replace(/"/g, '\\"');
	const cmd = `wrangler d1 execute ${db} --remote --command "${escaped}"`;
	const output = execSync(cmd, { encoding: "utf-8" });

	try {
		const jsonMatch = output.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			console.error("No JSON found in output:", output);
			return { results: [] };
		}
		const parsed = JSON.parse(jsonMatch[0]);
		return parsed[0] || { results: [] };
	} catch (err) {
		console.error("Failed to parse wrangler output:", output);
		throw err;
	}
}

function escapeSQL(value: any): string {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "number") return value.toString();
	if (typeof value === "string") {
		return `'${value.replace(/'/g, "''")}'`;
	}
	return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
	console.log("🌲 Gallery Data Migration: Curio DB → Engine DB");
	console.log(DRY_RUN ? "🔍 DRY RUN MODE - No changes will be made\n" : "\n");

	// 1. Fetch all data from curio DB
	console.log("📥 Fetching data from grove-curios-db...");

	const configsResult = wranglerQuery("grove-curios-db", "SELECT * FROM gallery_curio_config");
	const configs = configsResult.results as GalleryConfig[];
	console.log(`   Found ${configs.length} gallery configs`);

	const imagesResult = wranglerQuery("grove-curios-db", "SELECT * FROM gallery_images");
	const images = imagesResult.results as GalleryImage[];
	console.log(`   Found ${images.length} gallery images`);

	const tagsResult = wranglerQuery("grove-curios-db", "SELECT * FROM gallery_tags");
	const tags = tagsResult.results as GalleryTag[];
	console.log(`   Found ${tags.length} gallery tags`);

	const imageTagsResult = wranglerQuery("grove-curios-db", "SELECT * FROM gallery_image_tags");
	const imageTags = imageTagsResult.results as GalleryImageTag[];
	console.log(`   Found ${imageTags.length} gallery image-tag associations`);

	const collectionsResult = wranglerQuery("grove-curios-db", "SELECT * FROM gallery_collections");
	const collections = collectionsResult.results as GalleryCollection[];
	console.log(`   Found ${collections.length} gallery collections`);

	const collectionImagesResult = wranglerQuery(
		"grove-curios-db",
		"SELECT * FROM gallery_collection_images",
	);
	const collectionImages = collectionImagesResult.results as GalleryCollectionImage[];
	console.log(`   Found ${collectionImages.length} gallery collection-image associations\n`);

	if (DRY_RUN) {
		console.log("🔍 Dry run complete. No data was migrated.");
		console.log("\nTo apply migration, run without --dry-run flag:");
		console.log("  bun run scripts/migrations/migrate-gallery-to-engine-db.ts\n");
		return;
	}

	// 2. Insert into engine DB
	console.log("📤 Migrating data to grove-engine-db...");

	// Migrate configs
	if (configs.length > 0) {
		console.log(`   Migrating ${configs.length} configs...`);
		for (const config of configs) {
			const sql = `INSERT OR REPLACE INTO gallery_curio_config (
        tenant_id, enabled, r2_bucket, cdn_base_url, gallery_title, gallery_description,
        items_per_page, sort_order, show_descriptions, show_dates, show_tags,
        enable_lightbox, enable_search, enable_filters, grid_style, thumbnail_size,
        settings, custom_css, created_at, updated_at
      ) VALUES (
        ${escapeSQL(config.tenant_id)}, ${escapeSQL(config.enabled)},
        ${escapeSQL(config.r2_bucket)}, ${escapeSQL(config.cdn_base_url)},
        ${escapeSQL(config.gallery_title)}, ${escapeSQL(config.gallery_description)},
        ${escapeSQL(config.items_per_page)}, ${escapeSQL(config.sort_order)},
        ${escapeSQL(config.show_descriptions)}, ${escapeSQL(config.show_dates)},
        ${escapeSQL(config.show_tags)}, ${escapeSQL(config.enable_lightbox)},
        ${escapeSQL(config.enable_search)}, ${escapeSQL(config.enable_filters)},
        ${escapeSQL(config.grid_style)}, ${escapeSQL(config.thumbnail_size)},
        ${escapeSQL(config.settings)}, ${escapeSQL(config.custom_css)},
        ${escapeSQL(config.created_at)}, ${escapeSQL(config.updated_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	// Migrate images
	if (images.length > 0) {
		console.log(`   Migrating ${images.length} images...`);
		for (const image of images) {
			const sql = `INSERT OR REPLACE INTO gallery_images (
        id, tenant_id, r2_key, parsed_date, parsed_category, parsed_slug,
        custom_title, custom_description, custom_date, alt_text,
        file_size, uploaded_at, cdn_url, width, height, aspect_ratio,
        thumbnail_r2_key, dominant_color, sort_index, is_featured,
        created_at, updated_at
      ) VALUES (
        ${escapeSQL(image.id)}, ${escapeSQL(image.tenant_id)}, ${escapeSQL(image.r2_key)},
        ${escapeSQL(image.parsed_date)}, ${escapeSQL(image.parsed_category)},
        ${escapeSQL(image.parsed_slug)}, ${escapeSQL(image.custom_title)},
        ${escapeSQL(image.custom_description)}, ${escapeSQL(image.custom_date)},
        ${escapeSQL(image.alt_text)}, ${escapeSQL(image.file_size)},
        ${escapeSQL(image.uploaded_at)}, ${escapeSQL(image.cdn_url)},
        ${escapeSQL(image.width)}, ${escapeSQL(image.height)},
        ${escapeSQL(image.aspect_ratio)}, ${escapeSQL(image.thumbnail_r2_key)},
        ${escapeSQL(image.dominant_color)}, ${escapeSQL(image.sort_index)},
        ${escapeSQL(image.is_featured)}, ${escapeSQL(image.created_at)},
        ${escapeSQL(image.updated_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	// Migrate tags
	if (tags.length > 0) {
		console.log(`   Migrating ${tags.length} tags...`);
		for (const tag of tags) {
			const sql = `INSERT OR REPLACE INTO gallery_tags (
        id, tenant_id, name, slug, color, description, sort_order, created_at
      ) VALUES (
        ${escapeSQL(tag.id)}, ${escapeSQL(tag.tenant_id)}, ${escapeSQL(tag.name)},
        ${escapeSQL(tag.slug)}, ${escapeSQL(tag.color)}, ${escapeSQL(tag.description)},
        ${escapeSQL(tag.sort_order)}, ${escapeSQL(tag.created_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	// Migrate image-tags
	if (imageTags.length > 0) {
		console.log(`   Migrating ${imageTags.length} image-tag associations...`);
		for (const imageTag of imageTags) {
			const sql = `INSERT OR REPLACE INTO gallery_image_tags (
        image_id, tag_id, created_at
      ) VALUES (
        ${escapeSQL(imageTag.image_id)}, ${escapeSQL(imageTag.tag_id)},
        ${escapeSQL(imageTag.created_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	// Migrate collections
	if (collections.length > 0) {
		console.log(`   Migrating ${collections.length} collections...`);
		for (const collection of collections) {
			const sql = `INSERT OR REPLACE INTO gallery_collections (
        id, tenant_id, name, slug, description, cover_image_id,
        display_order, is_public, created_at, updated_at
      ) VALUES (
        ${escapeSQL(collection.id)}, ${escapeSQL(collection.tenant_id)},
        ${escapeSQL(collection.name)}, ${escapeSQL(collection.slug)},
        ${escapeSQL(collection.description)}, ${escapeSQL(collection.cover_image_id)},
        ${escapeSQL(collection.display_order)}, ${escapeSQL(collection.is_public)},
        ${escapeSQL(collection.created_at)}, ${escapeSQL(collection.updated_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	// Migrate collection-images
	if (collectionImages.length > 0) {
		console.log(`   Migrating ${collectionImages.length} collection-image associations...`);
		for (const collectionImage of collectionImages) {
			const sql = `INSERT OR REPLACE INTO gallery_collection_images (
        collection_id, image_id, display_order, created_at
      ) VALUES (
        ${escapeSQL(collectionImage.collection_id)}, ${escapeSQL(collectionImage.image_id)},
        ${escapeSQL(collectionImage.display_order)}, ${escapeSQL(collectionImage.created_at)}
      )`;
			wranglerQuery("grove-engine-db", sql);
		}
	}

	console.log("\n✅ Migration complete!");
	console.log("\nNext steps:");
	console.log("1. Update gallery page to use engine DB (apps/aspen/.../gallery/+page.server.ts)");
	console.log("2. Update gallery API endpoints (apps/aspen/.../api/curios/gallery/*.ts)");
	console.log("3. Deploy changes to production");
	console.log("4. Verify galleries display correctly");
	console.log("5. Drop gallery tables from curios DB (optional cleanup)\n");
}

main().catch((err) => {
	console.error("❌ Migration failed:", err);
	process.exit(1);
});
