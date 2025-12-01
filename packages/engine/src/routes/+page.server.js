import { getHomePage, getLatestPost, processAnchorTags } from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import { marked } from "marked";
import { sanitizeMarkdown } from "$lib/utils/sanitize.js";

// Disable prerendering - latest post is fetched from D1 at runtime
export const prerender = false;

export async function load({ platform }) {
  let page = null;

  // Try D1 first for the home page
  if (platform?.env?.POSTS_DB) {
    try {
      const pageData = await platform.env.POSTS_DB.prepare(
        `SELECT slug, title, description, markdown_content, html_content, hero, gutter_content, font
         FROM pages
         WHERE slug = ?`
      ).bind('home').first();

      if (pageData) {
        // Parse hero JSON
        let hero = null;
        if (pageData.hero) {
          try {
            hero = JSON.parse(pageData.hero);
          } catch (e) {
            console.warn('Failed to parse hero for home page:', e);
            hero = null;
          }
        }

        // Generate HTML from markdown if not stored
        let htmlContent = pageData.html_content;
        if (!htmlContent && pageData.markdown_content) {
          htmlContent = sanitizeMarkdown(marked.parse(pageData.markdown_content));
        }

        // Extract headers from HTML for table of contents
        const headers = extractHeadersFromHtml(htmlContent || '');

        // Safe JSON parsing for gutter content
        let gutterContent = [];
        if (pageData.gutter_content) {
          try {
            gutterContent = JSON.parse(pageData.gutter_content);
            // Process gutter items: convert markdown to HTML for comment/markdown items
            gutterContent = gutterContent.map(item => {
              if ((item.type === 'comment' || item.type === 'markdown') && item.content) {
                return {
                  ...item,
                  content: sanitizeMarkdown(marked.parse(item.content))
                };
              }
              return item;
            });
          } catch (e) {
            console.warn('Failed to parse gutter_content for home page:', e);
            gutterContent = [];
          }
        }

        page = {
          slug: pageData.slug,
          title: pageData.title,
          description: pageData.description || '',
          hero,
          content: htmlContent,
          headers,
          gutterContent,
          font: pageData.font || 'default'
        };
      }
    } catch (err) {
      console.error('D1 fetch error for home page:', err);
      // Fall through to filesystem fallback
    }
  }

  // If no D1 page, fall back to filesystem (for local dev or if D1 is empty)
  if (!page) {
    page = getHomePage();
  }

  if (!page) {
    throw error(404, "Home page not found");
  }

  let latestPost = null;

  // Try D1 first for the latest post
  if (platform?.env?.POSTS_DB) {
    try {
      const post = await platform.env.POSTS_DB.prepare(
        `SELECT slug, title, date, tags, description, html_content, gutter_content, font
         FROM posts
         ORDER BY date DESC
         LIMIT 1`
      ).first();

      if (post) {
        // Process anchor tags in HTML content (same as individual post pages)
        const processedHtml = processAnchorTags(post.html_content || '');

        // Extract headers from HTML for table of contents
        const headers = extractHeadersFromHtml(processedHtml);

        // Safe JSON parsing for tags
        let tags = [];
        if (post.tags) {
          try {
            tags = JSON.parse(post.tags);
          } catch (e) {
            console.warn('Failed to parse tags for latest post:', e);
            tags = [];
          }
        }

        // Safe JSON parsing for gutter content
        let gutterContent = [];
        if (post.gutter_content) {
          try {
            gutterContent = JSON.parse(post.gutter_content);
            // Process gutter items: convert markdown to HTML for comment/markdown items
            gutterContent = gutterContent.map(item => {
              if ((item.type === 'comment' || item.type === 'markdown') && item.content) {
                return {
                  ...item,
                  content: sanitizeMarkdown(marked.parse(item.content))
                };
              }
              return item;
            });
          } catch (e) {
            console.warn('Failed to parse gutter_content for latest post:', e);
            gutterContent = [];
          }
        }

        latestPost = {
          slug: post.slug,
          title: post.title,
          date: post.date,
          tags,
          description: post.description || '',
          content: processedHtml,
          headers,
          gutterContent,
          font: post.font || 'default'
        };
      }
    } catch (err) {
      console.error('D1 fetch error for latest post:', err);
      // Fall through to filesystem fallback
    }
  }

  // If no D1 post, fall back to filesystem (for local dev or if D1 is empty)
  if (!latestPost) {
    latestPost = getLatestPost();
  }

  return {
    title: page.title,
    description: page.description,
    hero: page.hero,
    content: page.content,
    headers: page.headers,
    gutterContent: page.gutterContent,
    latestPost,
  };
}

/**
 * Extract headers from HTML content for table of contents
 * Used for D1 posts where raw markdown isn't stored
 * @param {string} html - The HTML content
 * @returns {Array} Array of header objects with level, text, and id
 */
function extractHeadersFromHtml(html) {
  const headers = [];
  const headerRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[1-6]>/gi;

  let match;
  while ((match = headerRegex.exec(html)) !== null) {
    headers.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim()
    });
  }

  return headers;
}
