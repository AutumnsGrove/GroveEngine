#!/usr/bin/env node
/**
 * Migration: autumnsgrove-posts → grove-engine-db (Lattice)
 *
 * Migrates blog posts from the old standalone autumnsgrove.com D1 database
 * to the Lattice multi-tenant grove-engine-db with proper tenant isolation.
 *
 * Usage:
 *   node scripts/migrations/migrate-autumnsgrove-posts.js [--dry-run]
 *
 * Source: autumnsgrove-posts (510badf3-457a-4892-bf2a-45d4bfd7a7bb)
 * Destination: grove-engine-db (a6394da2-b7a6-48ce-b7fe-b1eb3e730e68)
 * Tenant: autumn-primary (subdomain: autumn)
 */

import { execFileSync } from "child_process";
import { randomUUID } from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_DB = "autumnsgrove-posts";
const DEST_DB = "grove-engine-db";
const TENANT_ID = "autumn-primary";

/**
 * Execute a wrangler D1 command and return JSON results
 * Uses execFileSync to avoid shell injection vulnerabilities
 */
function d1Execute(database, sql) {
  const args = [
    "d1",
    "execute",
    database,
    "--command",
    sql,
    "--remote",
    "--json",
  ];

  try {
    const output = execFileSync("wrangler", args, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    // Parse JSON from the output (wrangler outputs JSON after the header)
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      return results[0]?.results || [];
    }
    return [];
  } catch (error) {
    console.error("D1 Execute Error:", error.message);
    console.error(
      "SQL:",
      sql.substring(0, 200) + (sql.length > 200 ? "..." : ""),
    );
    throw error;
  }
}

/**
 * Convert ISO date string to Unix timestamp (seconds)
 */
function dateToUnix(dateStr) {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Calculate word count from markdown content
 */
function getWordCount(markdown) {
  return markdown.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate reading time in minutes (~200 words per minute)
 */
function getReadingTime(wordCount) {
  return Math.ceil(wordCount / 200);
}

/**
 * Escape a string for SQL (single quotes)
 */
function sqlEscape(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function main() {
  console.log("=".repeat(60));
  console.log("  autumnsgrove.com → Lattice Post Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Source DB: ${SOURCE_DB}`);
  console.log(`Dest DB: ${DEST_DB}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log("");

  // Step 1: Fetch all posts from source database
  console.log("📥 Fetching posts from source database...");
  const posts = d1Execute(SOURCE_DB, "SELECT * FROM posts ORDER BY date DESC");
  console.log(`   Found ${posts.length} posts to migrate`);
  console.log("");

  if (posts.length === 0) {
    console.log("No posts to migrate. Exiting.");
    return;
  }

  // Step 2: Check destination for existing posts
  console.log("🔍 Checking destination for existing posts...");
  const existingPosts = d1Execute(
    DEST_DB,
    `SELECT slug FROM posts WHERE tenant_id = '${TENANT_ID}'`,
  );
  const existingSlugs = new Set(existingPosts.map((p) => p.slug));
  console.log(`   Found ${existingSlugs.size} existing posts in destination`);
  console.log("");

  // Step 3: Transform and migrate each post
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    const {
      slug,
      title,
      date,
      tags,
      description,
      markdown_content,
      html_content,
      gutter_content,
    } = post;

    // Skip if already exists
    if (existingSlugs.has(slug)) {
      console.log(`⏭️  Skipping "${title}" (already exists)`);
      skipped++;
      continue;
    }

    console.log(`📝 Migrating "${title}"...`);

    // Generate new ID and transform data
    const id = randomUUID();
    const publishedAt = dateToUnix(date);
    const wordCount = getWordCount(markdown_content);
    const readingTime = getReadingTime(wordCount);
    const now = Math.floor(Date.now() / 1000);

    // Ensure tags is valid JSON
    let tagsJson = tags || "[]";
    try {
      JSON.parse(tagsJson);
    } catch {
      tagsJson = "[]";
    }

    // Ensure gutter_content is valid JSON
    let gutterJson = gutter_content || "[]";
    try {
      JSON.parse(gutterJson);
    } catch {
      gutterJson = "[]";
    }

    // Build INSERT statement
    const insertSql = `
      INSERT INTO posts (
        id, tenant_id, slug, title, description, markdown_content, html_content,
        gutter_content, tags, status, word_count, reading_time, published_at,
        created_at, updated_at
      ) VALUES (
        ${sqlEscape(id)},
        ${sqlEscape(TENANT_ID)},
        ${sqlEscape(slug)},
        ${sqlEscape(title)},
        ${sqlEscape(description)},
        ${sqlEscape(markdown_content)},
        ${sqlEscape(html_content)},
        ${sqlEscape(gutterJson)},
        ${sqlEscape(tagsJson)},
        'published',
        ${wordCount},
        ${readingTime},
        ${publishedAt},
        ${now},
        ${now}
      )
    `
      .replace(/\n/g, " ")
      .trim();

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would insert post with:`);
      console.log(`   - ID: ${id}`);
      console.log(`   - Slug: ${slug}`);
      console.log(`   - Words: ${wordCount}, Reading time: ${readingTime} min`);
      console.log(
        `   - Published: ${new Date(publishedAt * 1000).toISOString()}`,
      );
      migrated++;
    } else {
      try {
        d1Execute(DEST_DB, insertSql);
        console.log(
          `   ✅ Migrated (${wordCount} words, ${readingTime} min read)`,
        );
        migrated++;
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        errors++;
      }
    }
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("  Migration Summary");
  console.log("=".repeat(60));
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log("");

  if (DRY_RUN) {
    console.log(
      "This was a dry run. Run without --dry-run to perform the migration.",
    );
  } else if (migrated > 0) {
    console.log("🎉 Migration complete! Verify at: https://autumn.grove.place");
  }
}

main().catch(console.error);
