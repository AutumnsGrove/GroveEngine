import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { marked } from "marked";

export interface Doc {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category: "specs" | "help" | "legal";
  lastUpdated?: string;
  readingTime: number;
  content?: string;
  html?: string;
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function generateExcerpt(content: string): string {
  // Remove markdown headers and take first paragraph
  const cleanContent = content
    .replace(/^#+\s+.*$/gm, "") // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
    .trim();

  const firstParagraph = cleanContent.split("\n\n")[0];
  const excerpt = firstParagraph.substring(0, 200).trim();

  return excerpt + (firstParagraph.length > 200 ? "..." : "");
}

function parseDoc(filePath: string, category: "specs" | "help" | "legal"): Doc {
  const content = readFileSync(filePath, "utf-8");
  const { data, content: markdownContent } = matter(content);

  const slug = filePath.split("/").pop()?.replace(".md", "") || "";
  const title =
    data.title ||
    slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("And", "and");

  return {
    slug,
    title,
    description: data.description,
    excerpt: data.description || generateExcerpt(markdownContent),
    category,
    lastUpdated: data.lastUpdated || new Date().toISOString().split("T")[0],
    readingTime: calculateReadingTime(markdownContent),
  };
}

function loadDocsFromDir(
  dirPath: string,
  category: "specs" | "help" | "legal",
): Doc[] {
  const docs: Doc[] = [];

  function readDirRecursive(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && item !== "completed") {
        readDirRecursive(fullPath);
      } else if (stat.isFile() && item.endsWith(".md")) {
        try {
          docs.push(parseDoc(fullPath, category));
        } catch (error) {
          console.error(`Error parsing ${fullPath}:`, error);
        }
      }
    }
  }

  try {
    readDirRecursive(dirPath);
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

export function loadAllDocs(): {
  specs: Doc[];
  helpArticles: Doc[];
  legalDocs: Doc[];
} {
  const specs = loadDocsFromDir("docs/specs", "specs");
  const helpArticles = loadDocsFromDir("docs/help-center/articles", "help");
  const legalDocs = loadDocsFromDir("docs/legal", "legal");

  return { specs, helpArticles, legalDocs };
}

export function loadDocBySlug(
  slug: string,
  category: "specs" | "help" | "legal",
): Doc | null {
  const docs = loadDocsFromDir(
    category === "specs"
      ? "docs/specs"
      : category === "help"
        ? "docs/help-center/articles"
        : "docs/legal",
    category,
  );

  const doc = docs.find((d) => d.slug === slug);
  if (!doc) return null;

  // Load full content for individual pages
  const filePath =
    category === "specs"
      ? `docs/specs/${slug}.md`
      : category === "help"
        ? `docs/help-center/articles/${slug}.md`
        : `docs/legal/${slug}.md`;

  try {
    const content = readFileSync(filePath, "utf-8");
    const { content: markdownContent } = matter(content);

    return {
      ...doc,
      content: markdownContent,
      html: marked(markdownContent),
    };
  } catch (error) {
    console.error(`Error loading full content for ${slug}:`, error);
    return doc;
  }
}
