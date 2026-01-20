#!/usr/bin/env node
/**
 * Update: Midnight Bloom Posts with actual content
 *
 * Updates existing empty post records with content from the deprecated folder.
 *
 * Usage:
 *   node scripts/migrations/update-midnight-bloom-posts.js [--dry-run]
 */

import { execFileSync } from "child_process";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, dirname } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const DEST_DB = "grove-engine-db";
const TENANT_ID = "example-tenant-001";

const CONTENT_BASE =
  "_deprecated/example-site-deprecated-2025-12-31/UserContent";

// Post ID mapping (from database)
const POST_IDS = {
  "our-favorite-midnight-regulars": "example-post-regulars",
  "the-art-of-brewing-patience": "example-post-brewing",
  "why-we-dont-play-music": "example-post-music",
};

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
    throw error;
  }
}

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

  const data = {};
  let currentKey = null;
  let inArray = false;
  let arrayValues = [];

  for (const line of frontmatterLines) {
    if (inArray && line.match(/^\s+-\s+(.+)$/)) {
      const value = line.match(/^\s+-\s+(.+)$/)[1];
      arrayValues.push(value);
      continue;
    }

    if (inArray && !line.match(/^\s+-/)) {
      data[currentKey] = arrayValues;
      inArray = false;
      arrayValues = [];
    }

    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value === "") {
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        data[key] = value;
      }
    }
  }

  if (inArray && currentKey) {
    data[currentKey] = arrayValues;
  }

  return { data, content: contentLines.join("\n").trim() };
}

function dateToUnix(dateStr) {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1000);
}

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

function getReadingTime(wordCount) {
  return Math.ceil(wordCount / 200);
}

function sqlEscape(str) {
  if (str === null || str === undefined) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function getSlugFromFilename(filename) {
  return basename(filename, ".md");
}

function readGutterContent(postPath) {
  const gutterDir = join(
    dirname(postPath),
    basename(postPath, ".md"),
    "gutter",
  );

  if (!existsSync(gutterDir)) return [];

  const manifestPath = join(gutterDir, "manifest.json");
  if (!existsSync(manifestPath)) return [];

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const items = [];

    for (const item of manifest.items || []) {
      const gutterItem = {
        type: item.type || "comment",
        anchor: item.anchor,
      };

      if (item.file) {
        const filePath = join(gutterDir, item.file);
        if (existsSync(filePath)) {
          gutterItem.content = readFileSync(filePath, "utf-8").trim();
        }
      }

      items.push(gutterItem);
    }

    return items;
  } catch {
    return [];
  }
}

function markdownToHtml(markdown) {
  let html = markdown
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>',
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^---+$/gm, "<hr />")
    .replace(/<!--\s*anchor:(\w+)\s*-->/g, '<span id="anchor-$1"></span>')
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

async function main() {
  console.log("=".repeat(60));
  console.log("  Midnight Bloom Posts Content Update");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log("");

  const postsDir = join(CONTENT_BASE, "Posts");
  let updated = 0;
  let errors = 0;

  for (const [slug, postId] of Object.entries(POST_IDS)) {
    const postPath = join(postsDir, `${slug}.md`);

    if (!existsSync(postPath)) {
      console.log(`⚠️  File not found: ${postPath}`);
      continue;
    }

    try {
      const rawContent = readFileSync(postPath, "utf-8");
      const { data, content: markdownContent } = parseFrontmatter(rawContent);
      const gutterContent = readGutterContent(postPath);

      console.log(`📝 Updating "${data.title}"...`);

      const publishedAt = dateToUnix(data.date || new Date().toISOString());
      const wordCount = getWordCount(markdownContent);
      const readingTime = getReadingTime(wordCount);
      const now = Math.floor(Date.now() / 1000);
      const htmlContent = markdownToHtml(markdownContent);
      const tags = JSON.stringify(data.tags || []);
      const gutterJson = JSON.stringify(gutterContent);

      const updateSql = `
        UPDATE posts SET
          description = ${sqlEscape(data.description || "")},
          markdown_content = ${sqlEscape(markdownContent)},
          html_content = ${sqlEscape(htmlContent)},
          gutter_content = ${sqlEscape(gutterJson)},
          tags = ${sqlEscape(tags)},
          status = 'published',
          word_count = ${wordCount},
          reading_time = ${readingTime},
          published_at = ${publishedAt},
          updated_at = ${now}
        WHERE id = ${sqlEscape(postId)}
      `
        .replace(/\n/g, " ")
        .trim();

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would update post ${postId}`);
        console.log(
          `   - Words: ${wordCount}, Reading time: ${readingTime} min`,
        );
        console.log(`   - Gutter items: ${gutterContent.length}`);
        updated++;
      } else {
        d1Execute(DEST_DB, updateSql);
        console.log(
          `   ✅ Updated (${wordCount} words, ${readingTime} min, ${gutterContent.length} gutter items)`,
        );
        updated++;
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors++;
    }
  }

  // Now handle the recipe as a new INSERT
  console.log("");
  console.log("🍵 Adding Moonlight Jasmine Blend recipe...");
  console.log("-".repeat(40));

  const recipePath = join(
    CONTENT_BASE,
    "Recipes",
    "moonlight-jasmine-blend.md",
  );

  if (existsSync(recipePath)) {
    try {
      const rawContent = readFileSync(recipePath, "utf-8");
      const { data, content: markdownContent } = parseFrontmatter(rawContent);
      const gutterContent = readGutterContent(recipePath);

      const slug = "moonlight-jasmine-blend";
      const id = "example-recipe-jasmine";
      const publishedAt = dateToUnix(data.date || new Date().toISOString());
      const wordCount = getWordCount(markdownContent);
      const readingTime = getReadingTime(wordCount);
      const now = Math.floor(Date.now() / 1000);
      const htmlContent = markdownToHtml(markdownContent);

      const baseTags = data.tags || [];
      if (!baseTags.includes("recipe")) baseTags.push("recipe");
      const tags = JSON.stringify(baseTags);
      const gutterJson = JSON.stringify(gutterContent);

      const insertSql = `
        INSERT OR REPLACE INTO posts (
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
        console.log(`   [DRY RUN] Would insert recipe`);
        console.log(
          `   - Words: ${wordCount}, Reading time: ${readingTime} min`,
        );
        console.log(`   - Gutter items: ${gutterContent.length}`);
        updated++;
      } else {
        d1Execute(DEST_DB, insertSql);
        console.log(
          `   ✅ Added (${wordCount} words, ${readingTime} min, ${gutterContent.length} gutter items)`,
        );
        updated++;
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Errors:  ${errors}`);

  if (DRY_RUN) {
    console.log("\nRun without --dry-run to apply changes.");
  } else {
    console.log("\n🎉 Done! Verify at: https://example.grove.place");
  }
}

main().catch(console.error);
