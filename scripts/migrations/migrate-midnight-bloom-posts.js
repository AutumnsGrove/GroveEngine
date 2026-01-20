#!/usr/bin/env node
/**
 * Migration: Midnight Bloom Posts from _deprecated folder → Lattice
 *
 * Migrates blog posts and recipes from the deprecated example-site folder
 * to the Lattice multi-tenant grove-engine-db.
 *
 * Usage:
 *   node scripts/migrations/migrate-midnight-bloom-posts.js [--dry-run]
 *
 * Source: _deprecated/example-site-deprecated-2025-12-31/UserContent/
 * Destination: grove-engine-db (a6394da2-b7a6-48ce-b7fe-b1eb3e730e68)
 * Tenant: example-tenant-001 (subdomain: example, display: "The Midnight Bloom")
 */

import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, dirname } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const DEST_DB = "grove-engine-db";
const TENANT_ID = "example-tenant-001";

// Path to deprecated content
const CONTENT_BASE =
  "_deprecated/example-site-deprecated-2025-12-31/UserContent";

/**
 * Execute a wrangler D1 command and return JSON results
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
 * Simple frontmatter parser (no external dependencies)
 */
function parseFrontmatter(content) {
  const lines = content.split("\n");
  let inFrontmatter = false;
  let frontmatterLines = [];
  let contentLines = [];
  let foundEnd = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    }

    if (inFrontmatter && line.trim() === "---") {
      inFrontmatter = false;
      foundEnd = true;
      continue;
    }

    if (inFrontmatter) {
      frontmatterLines.push(line);
    } else if (foundEnd) {
      contentLines.push(line);
    }
  }

  // Parse YAML-like frontmatter
  const data = {};
  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  for (const line of frontmatterLines) {
    // Check for array item
    if (inArray && line.match(/^\s+-\s+(.+)$/)) {
      const value = line.match(/^\s+-\s+(.+)$/)[1];
      arrayValues.push(value);
      continue;
    }

    // If we were in an array and hit a new key, save the array
    if (inArray && !line.match(/^\s+-/)) {
      data[currentKey] = arrayValues;
      inArray = false;
      arrayValues = [];
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value === "") {
        // Start of array or empty value
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        data[key] = value;
      }
    }
  }

  // Don't forget the last array
  if (inArray && currentKey) {
    data[currentKey] = arrayValues;
  }

  return { data, content: contentLines.join("\n").trim() };
}

/**
 * Convert date string to Unix timestamp (seconds)
 */
function dateToUnix(dateStr) {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Calculate word count from markdown content
 */
function getWordCount(markdown) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/<!--.*?-->/g, "");

  return plainText.split(/\s+/).filter(Boolean).length;
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

/**
 * Generate slug from filename
 */
function getSlugFromFilename(filename) {
  return basename(filename, ".md");
}

/**
 * Read gutter content from manifest and associated files
 */
function readGutterContent(postPath) {
  const gutterDir = join(
    dirname(postPath),
    basename(postPath, ".md"),
    "gutter",
  );

  if (!existsSync(gutterDir)) {
    return [];
  }

  const manifestPath = join(gutterDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return [];
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const items = [];

    for (const item of manifest.items || []) {
      const gutterItem = {
        type: item.type || "comment",
        anchor: item.anchor,
      };

      // Read content from file if specified
      if (item.file) {
        const filePath = join(gutterDir, item.file);
        if (existsSync(filePath)) {
          gutterItem.content = readFileSync(filePath, "utf-8").trim();
        }
      }

      items.push(gutterItem);
    }

    return items;
  } catch (error) {
    console.warn(`  ⚠️  Failed to read gutter manifest: ${error.message}`);
    return [];
  }
}

/**
 * Basic markdown to HTML conversion (minimal, for migration purposes)
 */
function markdownToHtml(markdown) {
  let html = markdown
    // Code blocks first (to protect their content)
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>',
    )
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // Unordered lists
    .replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---+$/gm, "<hr />")
    // HTML comments (anchors) - preserve them
    .replace(/<!--\s*anchor:(\w+)\s*-->/g, '<span id="anchor-$1"></span>')
    // Paragraphs (basic)
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

/**
 * Scan directory for markdown files
 */
function scanMarkdownFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  The Midnight Bloom → Lattice Post Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Content Base: ${CONTENT_BASE}`);
  console.log(`Dest DB: ${DEST_DB}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log("");

  // Discover content files
  const postsDir = join(CONTENT_BASE, "Posts");
  const recipesDir = join(CONTENT_BASE, "Recipes");

  const postFiles = scanMarkdownFiles(postsDir);
  const recipeFiles = scanMarkdownFiles(recipesDir);

  console.log(
    `📂 Found ${postFiles.length} posts and ${recipeFiles.length} recipes`,
  );
  console.log("");

  // Check for existing posts
  console.log("🔍 Checking destination for existing posts...");
  const existingPosts = d1Execute(
    DEST_DB,
    `SELECT slug FROM posts WHERE tenant_id = '${TENANT_ID}'`,
  );
  const existingSlugs = new Set(existingPosts.map((p) => p.slug));
  console.log(`   Found ${existingSlugs.size} existing posts in destination`);
  console.log("");

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  // Migrate Posts
  console.log("📝 Migrating Posts...");
  console.log("-".repeat(40));

  for (const postPath of postFiles) {
    const slug = getSlugFromFilename(postPath);

    if (existingSlugs.has(slug)) {
      console.log(`⏭️  Skipping "${slug}" (already exists)`);
      skipped++;
      continue;
    }

    try {
      const rawContent = readFileSync(postPath, "utf-8");
      const { data, content: markdownContent } = parseFrontmatter(rawContent);
      const gutterContent = readGutterContent(postPath);

      console.log(`📝 Migrating "${data.title || slug}"...`);

      const id = randomUUID();
      const publishedAt = dateToUnix(data.date || new Date().toISOString());
      const wordCount = getWordCount(markdownContent);
      const readingTime = getReadingTime(wordCount);
      const now = Math.floor(Date.now() / 1000);
      const htmlContent = markdownToHtml(markdownContent);
      const tags = JSON.stringify(data.tags || []);
      const gutterJson = JSON.stringify(gutterContent);

      const insertSql = `
        INSERT INTO posts (
          id, tenant_id, slug, title, description, markdown_content, html_content,
          gutter_content, tags, status, word_count, reading_time, published_at,
          created_at, updated_at
        ) VALUES (
          ${sqlEscape(id)},
          ${sqlEscape(TENANT_ID)},
          ${sqlEscape(slug)},
          ${sqlEscape(data.title || slug)},
          ${sqlEscape(data.description || "")},
          ${sqlEscape(markdownContent)},
          ${sqlEscape(htmlContent)},
          ${sqlEscape(gutterJson)},
          ${sqlEscape(tags)},
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
        console.log(`   [DRY RUN] Would insert:`);
        console.log(`   - Slug: ${slug}`);
        console.log(
          `   - Words: ${wordCount}, Reading time: ${readingTime} min`,
        );
        console.log(`   - Gutter items: ${gutterContent.length}`);
        migrated++;
      } else {
        d1Execute(DEST_DB, insertSql);
        console.log(
          `   ✅ Migrated (${wordCount} words, ${readingTime} min, ${gutterContent.length} gutter items)`,
        );
        migrated++;
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors++;
    }
  }

  // Migrate Recipes (also as posts, with recipe tag)
  console.log("");
  console.log("🍵 Migrating Recipes...");
  console.log("-".repeat(40));

  for (const recipePath of recipeFiles) {
    const slug = getSlugFromFilename(recipePath);

    if (existingSlugs.has(slug)) {
      console.log(`⏭️  Skipping "${slug}" (already exists)`);
      skipped++;
      continue;
    }

    try {
      const rawContent = readFileSync(recipePath, "utf-8");
      const { data, content: markdownContent } = parseFrontmatter(rawContent);
      const gutterContent = readGutterContent(recipePath);

      console.log(`🍵 Migrating "${data.title || slug}"...`);

      const id = randomUUID();
      const publishedAt = dateToUnix(data.date || new Date().toISOString());
      const wordCount = getWordCount(markdownContent);
      const readingTime = getReadingTime(wordCount);
      const now = Math.floor(Date.now() / 1000);
      const htmlContent = markdownToHtml(markdownContent);

      // Ensure recipe tag is included
      const baseTags = data.tags || [];
      if (!baseTags.includes("recipe")) {
        baseTags.push("recipe");
      }
      const tags = JSON.stringify(baseTags);
      const gutterJson = JSON.stringify(gutterContent);

      const insertSql = `
        INSERT INTO posts (
          id, tenant_id, slug, title, description, markdown_content, html_content,
          gutter_content, tags, status, word_count, reading_time, published_at,
          created_at, updated_at
        ) VALUES (
          ${sqlEscape(id)},
          ${sqlEscape(TENANT_ID)},
          ${sqlEscape(slug)},
          ${sqlEscape(data.title || slug)},
          ${sqlEscape(data.description || "")},
          ${sqlEscape(markdownContent)},
          ${sqlEscape(htmlContent)},
          ${sqlEscape(gutterJson)},
          ${sqlEscape(tags)},
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
        console.log(`   [DRY RUN] Would insert:`);
        console.log(`   - Slug: ${slug}`);
        console.log(
          `   - Words: ${wordCount}, Reading time: ${readingTime} min`,
        );
        console.log(`   - Gutter items: ${gutterContent.length}`);
        migrated++;
      } else {
        d1Execute(DEST_DB, insertSql);
        console.log(
          `   ✅ Migrated (${wordCount} words, ${readingTime} min, ${gutterContent.length} gutter items)`,
        );
        migrated++;
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors++;
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
    console.log(
      "🎉 Migration complete! Verify at: https://example.grove.place",
    );
  }
}

main().catch(console.error);
