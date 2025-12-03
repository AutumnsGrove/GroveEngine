import { marked } from "marked";
import matter from "gray-matter";
import mermaid from "mermaid";
import { sanitizeSVG, sanitizeMarkdown } from './sanitize.js';

// Configure Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
});

// Configure marked renderer for GitHub-style code blocks
const renderer = new marked.Renderer();
renderer.code = function (token) {
  // Handle both old (code, language) and new (token) API signatures
  const code = typeof token === "string" ? token : token.text;
  const language = typeof token === "string" ? arguments[1] : token.lang;

  const lang = language || "text";

  // Render markdown/md code blocks as formatted HTML (like GitHub)
  if (lang === "markdown" || lang === "md") {
    // Parse the markdown content and render it
    const renderedContent = marked.parse(code);
    // Escape the raw markdown for the copy button
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return `<div class="rendered-markdown-block">
  <div class="rendered-markdown-header">
    <span class="rendered-markdown-label">Markdown</span>
    <button class="code-block-copy" aria-label="Copy markdown to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <div class="rendered-markdown-content">
    ${renderedContent}
  </div>
</div>`;
  }

  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-block-language">${lang}</span>
    <button class="code-block-copy" aria-label="Copy code to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre><code class="language-${lang}">${escapedCode}</code></pre>
</div>`;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: false,
});

/**
 * Validates if a string is a valid URL
 * @param {string} urlString - The string to validate as a URL
 * @returns {boolean} True if the string is a valid URL, false otherwise
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract headers from markdown content for table of contents
 * @param {string} markdown - The raw markdown content
 * @returns {Array} Array of header objects with level, text, and id
 */
export function extractHeaders(markdown) {
  const headers = [];

  // Remove fenced code blocks before extracting headers
  // This prevents # comments inside code blocks from being treated as headers
  const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

  const headerRegex = /^(#{1,6})\s+(.+)$/gm;

  let match;
  while ((match = headerRegex.exec(markdownWithoutCodeBlocks)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Create a slug-style ID from the header text
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    headers.push({
      level,
      text,
      id,
    });
  }

  return headers;
}

/**
 * Process anchor tags in HTML content
 * Converts <!-- anchor:tagname --> comments to identifiable span elements
 * @param {string} html - The HTML content
 * @returns {string} HTML with anchor markers converted to spans
 */
export function processAnchorTags(html) {
  // Convert <!-- anchor:tagname --> to <span class="anchor-marker" data-anchor="tagname"></span>
  // Supports alphanumeric characters, underscores, and hyphens in tag names
  return html.replace(
    /<!--\s*anchor:([\w-]+)\s*-->/g,
    (match, tagname) =>
      `<span class="anchor-marker" data-anchor="${tagname}"></span>`,
  );
}

/**
 * Process Mermaid diagrams in markdown content
 * @param {string} markdown - The markdown content
 * @returns {string} Processed markdown with Mermaid diagrams
 */
export function processMermaidDiagrams(markdown) {
  // Replace Mermaid code blocks with special divs that will be processed later
  return markdown.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (match, diagramCode) => {
      const diagramId = "mermaid-" + Math.random().toString(36).substr(2, 9);
      return `<div class="mermaid-container" id="${diagramId}" data-diagram="${encodeURIComponent(diagramCode.trim())}"></div>`;
    },
  );
}

/**
 * Render Mermaid diagrams in the DOM
 * This should be called after the content is mounted
 */
export async function renderMermaidDiagrams() {
  const containers = document.querySelectorAll(".mermaid-container");

  for (const container of containers) {
    try {
      const diagramCode = decodeURIComponent(container.dataset.diagram);
      const { svg } = await mermaid.render(container.id, diagramCode);
      // Sanitize SVG output before injecting into DOM to prevent XSS
      container.innerHTML = sanitizeSVG(svg);
    } catch (error) {
      console.error("Error rendering Mermaid diagram:", error);
      container.innerHTML = '<p class="error">Error rendering diagram</p>';
    }
  }
}

/**
 * Parse markdown content and convert to HTML
 * @param {string} markdownContent - The raw markdown content (may include frontmatter)
 * @returns {Object} Object with data (frontmatter), content (HTML), headers, and raw markdown
 */
export function parseMarkdownContent(markdownContent) {
  const { data, content: markdown } = matter(markdownContent);

  // Process Mermaid diagrams in the content
  const processedContent = processMermaidDiagrams(markdown);
  let htmlContent = marked.parse(processedContent);

  // Process anchor tags in the HTML content
  htmlContent = processAnchorTags(htmlContent);

  // Extract headers for table of contents
  const headers = extractHeaders(markdown);

  return {
    data,
    content: htmlContent,
    headers,
    rawMarkdown: markdown,
  };
}

/**
 * Parse markdown content with sanitization (for user-facing pages like home, about, contact)
 * @param {string} markdownContent - The raw markdown content (may include frontmatter)
 * @returns {Object} Object with data (frontmatter), content (sanitized HTML), headers
 */
export function parseMarkdownContentSanitized(markdownContent) {
  const { data, content: markdown } = matter(markdownContent);
  const htmlContent = sanitizeMarkdown(marked.parse(markdown));
  const headers = extractHeaders(markdown);

  return {
    data,
    content: htmlContent,
    headers,
  };
}

/**
 * Get gutter content from provided modules
 * This is a utility function that processes gutter manifests, markdown, and images
 *
 * @param {string} slug - The page/post slug
 * @param {Object} manifestModules - The manifest modules (from import.meta.glob)
 * @param {Object} markdownModules - The markdown modules (from import.meta.glob)
 * @param {Object} imageModules - The image modules (from import.meta.glob)
 * @returns {Array} Array of gutter items with content and position info
 */
export function processGutterContent(
  slug,
  manifestModules,
  markdownModules,
  imageModules,
) {
  // Find the manifest file for this page/post
  const manifestEntry = Object.entries(manifestModules).find(([filepath]) => {
    const parts = filepath.split("/");
    const folder = parts[parts.length - 3]; // Get the folder name
    return folder === slug;
  });

  if (!manifestEntry) {
    return [];
  }

  const manifest = manifestEntry[1].default || manifestEntry[1];

  if (!manifest.items || !Array.isArray(manifest.items)) {
    return [];
  }

  // Process each gutter item
  return manifest.items
    .map((item) => {
      if (item.type === "comment" || item.type === "markdown") {
        // Find the markdown content file
        const mdEntry = Object.entries(markdownModules).find(([filepath]) => {
          return filepath.includes(`/${slug}/gutter/${item.file}`);
        });

        if (mdEntry) {
          const markdownContent = mdEntry[1];
          const htmlContent = marked.parse(markdownContent);

          return {
            ...item,
            content: htmlContent,
          };
        }
      } else if (item.type === "photo" || item.type === "image") {
        // Check if file is an external URL
        if (item.file && isValidUrl(item.file)) {
          return {
            ...item,
            src: item.file,
          };
        }

        // Find the local image file
        const imgEntry = Object.entries(imageModules).find(([filepath]) => {
          return filepath.includes(`/${slug}/gutter/${item.file}`);
        });

        if (imgEntry) {
          return {
            ...item,
            src: imgEntry[1],
          };
        }
      } else if (item.type === "emoji") {
        // Emoji items can use URLs (local or CDN) or local files
        if (item.url) {
          // Direct URL (local path like /icons/instruction/mix.webp or CDN URL)
          return {
            ...item,
            src: item.url,
          };
        } else if (item.file) {
          // Local file in gutter directory
          const imgEntry = Object.entries(imageModules).find(([filepath]) => {
            return filepath.includes(`/${slug}/gutter/${item.file}`);
          });

          if (imgEntry) {
            return {
              ...item,
              src: imgEntry[1],
            };
          }
        }
        return item;
      } else if (item.type === "gallery") {
        /**
         * Process gallery items containing multiple images
         *
         * Galleries can contain:
         * - External URLs (validated for http/https protocol)
         * - Local files (resolved from the gutter directory)
         *
         * Images that fail to resolve (invalid URLs or missing files) are filtered out.
         * If all images fail to resolve, the entire gallery item is excluded.
         */
        const originalImageCount = (item.images || []).length;
        const images = (item.images || [])
          .map((img) => {
            // Check if it's an external URL
            if (img.url) {
              // Validate URL format to prevent malformed URLs from failing silently
              if (!isValidUrl(img.url)) {
                console.warn(
                  `Invalid URL in gallery for "${slug}": ${img.url}`,
                );
                return null;
              }
              return {
                url: img.url,
                alt: img.alt || "",
                caption: img.caption || "",
              };
            }

            // Otherwise, look for local file
            if (img.file) {
              const imgEntry = Object.entries(imageModules).find(
                ([filepath]) => {
                  return filepath.includes(`/${slug}/gutter/${img.file}`);
                },
              );

              if (imgEntry) {
                return {
                  url: imgEntry[1],
                  alt: img.alt || "",
                  caption: img.caption || "",
                };
              } else {
                console.warn(
                  `Local file not found in gallery for "${slug}": ${img.file}`,
                );
              }
            }

            return null;
          })
          .filter(Boolean);

        if (images.length > 0) {
          return {
            ...item,
            images,
          };
        } else if (originalImageCount > 0) {
          // All images failed to resolve - log warning for debugging
          console.warn(
            `Gallery in "${slug}" has ${originalImageCount} image(s) defined but none could be resolved`,
          );
        }
      }

      return item;
    })
    .filter(
      (item) =>
        item.content || item.src || item.images || item.type === "emoji",
    ); // Filter out items that weren't found
}

/**
 * Process a list of markdown files into post/recipe objects
 *
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @returns {Array} Array of post/content objects with metadata and slug
 */
export function processMarkdownModules(modules) {
  try {
    const items = Object.entries(modules)
      .map(([filepath, content]) => {
        try {
          // Extract slug from filepath: /path/to/Posts/example.md -> example
          const slug = filepath.split("/").pop().replace(".md", "");
          const { data } = matter(content);

          return {
            slug,
            title: data.title || "Untitled",
            date: data.date || new Date().toISOString(),
            tags: data.tags || [],
            description: data.description || "",
          };
        } catch (err) {
          console.error(`Error processing file ${filepath}:`, err);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return items;
  } catch (err) {
    console.error("Error in processMarkdownModules:", err);
    return [];
  }
}

/**
 * Get a single item by slug from modules
 *
 * @param {string} slug - The item slug
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @param {Object} options - Optional configuration
 * @param {Object} options.gutterModules - Gutter modules { manifest, markdown, images }
 * @param {Object} options.sidecarModules - Sidecar/metadata modules (for recipes)
 * @returns {Object|null} Item object with content and metadata
 */
export function getItemBySlug(slug, modules, options = {}) {
  // Find the matching module by slug
  const entry = Object.entries(modules).find(([filepath]) => {
    const fileSlug = filepath.split("/").pop().replace(".md", "");
    return fileSlug === slug;
  });

  if (!entry) {
    return null;
  }

  const rawContent = entry[1];
  const { data, content, headers } = parseMarkdownContent(rawContent);

  // Build the result object
  const result = {
    slug,
    title: data.title || "Untitled",
    date: data.date || new Date().toISOString(),
    tags: data.tags || [],
    description: data.description || "",
    content,
    headers,
  };

  // Process gutter content if provided
  if (options.gutterModules) {
    const { manifest, markdown, images } = options.gutterModules;
    result.gutterContent = processGutterContent(slug, manifest, markdown, images);
  }

  // Process sidecar/metadata if provided (for recipes)
  if (options.sidecarModules) {
    const sidecarEntry = Object.entries(options.sidecarModules).find(([filepath]) => {
      const parts = filepath.split("/");
      const folder = parts[parts.length - 3]; // Get the folder name
      return folder === slug;
    });

    if (sidecarEntry) {
      result.sidecar = sidecarEntry[1].default || sidecarEntry[1];
    }
  }

  return result;
}

/**
 * Get a page (home, about, contact) by filename from modules
 * Uses sanitization for security
 *
 * @param {string} filename - The filename to look for (e.g., "home.md", "about.md")
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @param {Object} options - Optional configuration
 * @param {Object} options.gutterModules - Gutter modules { manifest, markdown, images }
 * @param {string} options.slug - Override slug (defaults to filename without .md)
 * @returns {Object|null} Page object with content and metadata
 */
export function getPageByFilename(filename, modules, options = {}) {
  try {
    // Find the matching file
    const entry = Object.entries(modules).find(([filepath]) => {
      return filepath.includes(filename);
    });

    if (!entry) {
      return null;
    }

    const rawContent = entry[1];
    const { data, content, headers } = parseMarkdownContentSanitized(rawContent);
    const slug = options.slug || filename.replace(".md", "");

    // Build the result object
    const result = {
      slug,
      title: data.title || slug.charAt(0).toUpperCase() + slug.slice(1),
      description: data.description || "",
      content,
      headers,
    };

    // Add optional fields from frontmatter
    if (data.date) result.date = data.date;
    if (data.hero) result.hero = data.hero;
    if (data.galleries) result.galleries = data.galleries;

    // Process gutter content if provided
    if (options.gutterModules) {
      const { manifest, markdown, images } = options.gutterModules;
      result.gutterContent = processGutterContent(slug, manifest, markdown, images);
    }

    return result;
  } catch (err) {
    console.error(`Error in getPageByFilename for ${filename}:`, err);
    return null;
  }
}

/**
 * Get site configuration from a config module
 *
 * @param {Object} configModule - The config module from import.meta.glob
 * @returns {Object} Site configuration object
 */
export function getSiteConfigFromModule(configModule) {
  const entry = Object.entries(configModule)[0];
  if (entry) {
    return entry[1].default || entry[1];
  }
  return {
    owner: { name: "Admin", email: "" },
    site: { title: "The Grove", description: "", copyright: "AutumnsGrove" },
    social: {},
  };
}

/**
 * Create a configured content loader with all functions bound to the provided modules
 * This is the main factory function for creating a content loader in the consuming app
 *
 * @param {Object} config - Configuration object with all required modules
 * @param {Object} config.posts - Post modules from import.meta.glob
 * @param {Object} config.recipes - Recipe modules from import.meta.glob
 * @param {Object} config.about - About page modules from import.meta.glob
 * @param {Object} config.home - Home page modules from import.meta.glob
 * @param {Object} config.contact - Contact page modules from import.meta.glob
 * @param {Object} config.siteConfig - Site config module from import.meta.glob
 * @param {Object} config.postGutter - Post gutter modules { manifest, markdown, images }
 * @param {Object} config.recipeGutter - Recipe gutter modules { manifest, markdown, images }
 * @param {Object} config.recipeMetadata - Recipe metadata modules from import.meta.glob
 * @param {Object} config.aboutGutter - About gutter modules { manifest, markdown, images }
 * @param {Object} config.homeGutter - Home gutter modules { manifest, markdown, images }
 * @param {Object} config.contactGutter - Contact gutter modules { manifest, markdown, images }
 * @returns {Object} Object with all content loader functions
 */
export function createContentLoader(config) {
  const {
    posts = {},
    recipes = {},
    about = {},
    home = {},
    contact = {},
    siteConfig = {},
    postGutter = {},
    recipeGutter = {},
    recipeMetadata = {},
    aboutGutter = {},
    homeGutter = {},
    contactGutter = {},
  } = config;

  return {
    /**
     * Get all posts with metadata
     */
    getAllPosts() {
      return processMarkdownModules(posts);
    },

    /**
     * Get all recipes with metadata
     */
    getAllRecipes() {
      return processMarkdownModules(recipes);
    },

    /**
     * Get the latest (most recent) post with full content
     */
    getLatestPost() {
      const allPosts = processMarkdownModules(posts);
      if (allPosts.length === 0) {
        return null;
      }
      return this.getPostBySlug(allPosts[0].slug);
    },

    /**
     * Get a single post by slug
     */
    getPostBySlug(slug) {
      return getItemBySlug(slug, posts, {
        gutterModules: postGutter.manifest ? postGutter : undefined,
      });
    },

    /**
     * Get a single recipe by slug
     */
    getRecipeBySlug(slug) {
      return getItemBySlug(slug, recipes, {
        gutterModules: recipeGutter.manifest ? recipeGutter : undefined,
        sidecarModules: recipeMetadata,
      });
    },

    /**
     * Get the home page content
     */
    getHomePage() {
      return getPageByFilename("home.md", home, {
        gutterModules: homeGutter.manifest ? homeGutter : undefined,
        slug: "home",
      });
    },

    /**
     * Get the about page content
     */
    getAboutPage() {
      return getPageByFilename("about.md", about, {
        gutterModules: aboutGutter.manifest ? aboutGutter : undefined,
        slug: "about",
      });
    },

    /**
     * Get the contact page content
     */
    getContactPage() {
      return getPageByFilename("contact.md", contact, {
        gutterModules: contactGutter.manifest ? contactGutter : undefined,
        slug: "contact",
      });
    },

    /**
     * Get the site configuration
     */
    getSiteConfig() {
      return getSiteConfigFromModule(siteConfig);
    },

    /**
     * Get gutter content for a post
     */
    getGutterContent(slug) {
      if (!postGutter.manifest) return [];
      return processGutterContent(
        slug,
        postGutter.manifest,
        postGutter.markdown || {},
        postGutter.images || {},
      );
    },

    /**
     * Get gutter content for a recipe
     */
    getRecipeGutterContent(slug) {
      if (!recipeGutter.manifest) return [];
      return processGutterContent(
        slug,
        recipeGutter.manifest,
        recipeGutter.markdown || {},
        recipeGutter.images || {},
      );
    },

    /**
     * Get gutter content for the home page
     */
    getHomeGutterContent(slug) {
      if (!homeGutter.manifest) return [];
      return processGutterContent(
        slug,
        homeGutter.manifest,
        homeGutter.markdown || {},
        homeGutter.images || {},
      );
    },

    /**
     * Get gutter content for the about page
     */
    getAboutGutterContent(slug) {
      if (!aboutGutter.manifest) return [];
      return processGutterContent(
        slug,
        aboutGutter.manifest,
        aboutGutter.markdown || {},
        aboutGutter.images || {},
      );
    },

    /**
     * Get gutter content for the contact page
     */
    getContactGutterContent(slug) {
      if (!contactGutter.manifest) return [];
      return processGutterContent(
        slug,
        contactGutter.manifest,
        contactGutter.markdown || {},
        contactGutter.images || {},
      );
    },

    /**
     * Get recipe sidecar/metadata by slug
     */
    getRecipeSidecar(slug) {
      const entry = Object.entries(recipeMetadata).find(([filepath]) => {
        const parts = filepath.split("/");
        const folder = parts[parts.length - 3];
        return folder === slug;
      });

      if (!entry) {
        return null;
      }

      return entry[1].default || entry[1];
    },
  };
}

/**
 * Registry for site-specific content loaders
 * Sites must register their content loaders using registerContentLoader()
 */
let contentLoader = null;

/**
 * Register a content loader for the site
 * This should be called by the consuming site to provide access to content
 * @param {Object} loader - Object with getAllPosts, getSiteConfig, getLatestPost functions
 */
export function registerContentLoader(loader) {
  contentLoader = loader;
}

/**
 * Get all blog posts
 * @returns {Array} Array of post objects
 */
export function getAllPosts() {
  if (!contentLoader || !contentLoader.getAllPosts) {
    console.warn('getAllPosts: No content loader registered. Call registerContentLoader() in your site.');
    return [];
  }
  return contentLoader.getAllPosts();
}

/**
 * Get site configuration
 * @returns {Object} Site config object
 */
export function getSiteConfig() {
  if (!contentLoader || !contentLoader.getSiteConfig) {
    console.warn('getSiteConfig: No content loader registered. Call registerContentLoader() in your site.');
    return {
      owner: { name: "Admin", email: "" },
      site: { title: "GroveEngine Site", description: "", copyright: "" },
      social: {},
    };
  }
  return contentLoader.getSiteConfig();
}

/**
 * Get the latest post
 * @returns {Object|null} Latest post or null
 */
export function getLatestPost() {
  if (!contentLoader || !contentLoader.getLatestPost) {
    console.warn('getLatestPost: No content loader registered. Call registerContentLoader() in your site.');
    return null;
  }
  return contentLoader.getLatestPost();
}

/**
 * Get home page content
 * @returns {Object|null} Home page data or null
 */
export function getHomePage() {
  if (!contentLoader || !contentLoader.getHomePage) {
    console.warn('getHomePage: No content loader registered. Call registerContentLoader() in your site.');
    return null;
  }
  return contentLoader.getHomePage();
}

/**
 * Get a post by its slug
 * @param {string} slug - The post slug
 * @returns {Object|null} Post object or null
 */
export function getPostBySlug(slug) {
  if (!contentLoader || !contentLoader.getPostBySlug) {
    console.warn('getPostBySlug: No content loader registered. Call registerContentLoader() in your site.');
    return null;
  }
  return contentLoader.getPostBySlug(slug);
}

/**
 * Get about page content
 * @returns {Object|null} About page data or null
 */
export function getAboutPage() {
  if (!contentLoader || !contentLoader.getAboutPage) {
    console.warn('getAboutPage: No content loader registered. Call registerContentLoader() in your site.');
    return null;
  }
  return contentLoader.getAboutPage();
}

/**
 * Get contact page content
 * @returns {Object|null} Contact page data or null
 */
export function getContactPage() {
  if (!contentLoader || !contentLoader.getContactPage) {
    console.warn('getContactPage: No content loader registered. Call registerContentLoader() in your site.');
    return null;
  }
  return contentLoader.getContactPage();
}
