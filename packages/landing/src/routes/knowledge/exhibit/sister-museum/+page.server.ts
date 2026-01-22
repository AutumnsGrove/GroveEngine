import { marked, Renderer } from "marked";
import type { PageServerLoad } from "./$types";

// Prerender at build time - fetch from GitHub during build
export const prerender = true;

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/AutumnsGrove/AutumnsGrove/main/MUSEUM.md";

/**
 * Strip HTML tags from text to get plain text content.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Generate a URL-safe ID from text.
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Extract headers from markdown content for table of contents
 */
function extractHeaders(
  markdown: string
): { level: number; text: string; id: string }[] {
  const headers: { level: number; text: string; id: string }[] = [];

  // Remove fenced code blocks before extracting headers
  const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

  const headerRegex = /^(#{1,6})\s+(.+)$/gm;

  let match;
  while ((match = headerRegex.exec(markdownWithoutCodeBlocks)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateHeadingId(text);

    headers.push({ level, text, id });
  }

  return headers;
}

// Custom renderer that adds IDs to headings
const renderer = new Renderer();

renderer.heading = function ({ text, depth }) {
  const plainText = stripHtmlTags(text);
  const id = generateHeadingId(plainText);
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

// Rewrite relative links to point to the GitHub repo
renderer.link = function ({ href, title, text }) {
  // Convert relative paths to GitHub URLs
  if (href && !href.startsWith("http") && !href.startsWith("#")) {
    href = `https://github.com/AutumnsGrove/AutumnsGrove/blob/main${href.startsWith("/") ? "" : "/"}${href}`;
  }
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.use({ renderer });

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const response = await fetch(GITHUB_RAW_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const markdown = await response.text();
    const headers = extractHeaders(markdown);
    const html = marked(markdown) as string;

    return {
      doc: {
        slug: "sister-museum",
        title: "The Original AutumnsGrove Museum",
        description:
          "A living archive of the original AutumnsGrove website, preserved for learning",
        excerpt:
          "Walk through the source code of what was once a fully functional personal website. See how a real website gets built—not a tutorial's sanitized example, but actual working code.",
        category: "exhibit" as const,
        exhibitWing: "entrance" as const,
        icon: "github",
        lastUpdated: new Date().toISOString().split("T")[0],
        readingTime: Math.ceil(markdown.split(/\s+/).length / 200),
        content: markdown,
        html,
        headers,
      },
      sourceUrl: "https://github.com/AutumnsGrove/AutumnsGrove/blob/main/MUSEUM.md",
    };
  } catch (error) {
    console.error("Failed to fetch sister museum content:", error);

    // Return fallback content
    return {
      doc: {
        slug: "sister-museum",
        title: "The Original AutumnsGrove Museum",
        description: "A living archive of the original AutumnsGrove website",
        excerpt: "The sister museum content could not be loaded.",
        category: "exhibit" as const,
        exhibitWing: "entrance" as const,
        icon: "github",
        lastUpdated: new Date().toISOString().split("T")[0],
        readingTime: 1,
        content: "# Content Unavailable\n\nThe sister museum content could not be loaded from GitHub.",
        html: "<h1>Content Unavailable</h1><p>The sister museum content could not be loaded from GitHub.</p>",
        headers: [],
      },
      sourceUrl: "https://github.com/AutumnsGrove/AutumnsGrove/blob/main/MUSEUM.md",
    };
  }
};
