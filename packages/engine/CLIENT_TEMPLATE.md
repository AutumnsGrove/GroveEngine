# Grove Client Site Template

This guide documents how to create a site powered by `@autumnsgrove/groveengine`.

## Directory Structure

A Grove-powered site should have this minimal structure:

```
my-site/
├── src/
│   ├── routes/                  # Your site's pages
│   │   ├── +layout.svelte       # Uses engine components
│   │   ├── +layout.server.js    # Uses engine auth hooks
│   │   ├── +page.svelte         # Homepage
│   │   ├── blog/
│   │   │   ├── +page.svelte
│   │   │   └── [slug]/
│   │   ├── admin/
│   │   └── ...
│   ├── lib/
│   │   └── components/          # Site-specific components ONLY
│   │       └── custom/          # Your unique components
│   ├── app.html
│   ├── app.css                  # Imports engine styles
│   └── hooks.server.js          # Uses engine auth hooks
├── content/                     # Your markdown content
├── static/                      # Site-specific assets ONLY
│   └── images/                  # Your images
├── migrations/                  # Your D1 migrations
├── wrangler.toml               # Your Cloudflare config
├── package.json
├── svelte.config.js
├── tailwind.config.js          # Extends engine's preset
└── vite.config.js
```

## package.json

```json
{
  "name": "my-grove-site",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@autumnsgrove/groveengine": "^0.4.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-cloudflare": "^7.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.4.0"
  }
}
```

## Importing from the Engine

### UI Components

```javascript
// Main UI components
import { Button, Card, Dialog, Input, Badge } from '@autumnsgrove/groveengine/ui';

// Gallery components
import { ImageGallery, Lightbox, ZoomableImage } from '@autumnsgrove/groveengine/ui/gallery';

// Chart components
import { BarChart, LineChart } from '@autumnsgrove/groveengine/ui/charts';

// Content components
import { MarkdownRenderer, CodeBlock } from '@autumnsgrove/groveengine/ui/content';

// Form components
import { SearchInput, FormField } from '@autumnsgrove/groveengine/ui/forms';

// Indicator components
import { LoadingSpinner, ProgressBar, StatusBadge } from '@autumnsgrove/groveengine/ui/indicators';

// Icon components
import { Icon } from '@autumnsgrove/groveengine/ui/icons';

// State components
import { EmptyState, ErrorState } from '@autumnsgrove/groveengine/ui/states';
```

### Auth Utilities

```javascript
// Session management
import { validateSession, createSession, destroySession } from '@autumnsgrove/groveengine/auth';

// Auth helpers
import { hashPassword, verifyPassword } from '@autumnsgrove/groveengine/auth';
```

### Server Utilities

```javascript
// Logging
import { logger, createLogger } from '@autumnsgrove/groveengine/server';

// Server helpers
import { json, error, redirect } from '@autumnsgrove/groveengine/server';
```

### General Utilities

```javascript
// Common utilities
import { cn, debounce, throttle } from '@autumnsgrove/groveengine/utils';

// Validation
import {
  validateEmail,
  validateURL,
  validateSlug,
  sanitizeFilename,
  sanitizeObject
} from '@autumnsgrove/groveengine/utils/validation';

// Sanitization (XSS prevention)
import {
  sanitizeHTML,
  sanitizeSVG,
  sanitizeMarkdown,
  sanitizeURL
} from '@autumnsgrove/groveengine/utils/sanitize';
```

### Config

```javascript
// AI model configuration
import { AI_MODELS, getModelConfig } from '@autumnsgrove/groveengine/config';
```

### Payments (Stripe)

```javascript
// Payment utilities
import { createCheckoutSession, handleWebhook } from '@autumnsgrove/groveengine/payments';
```

## Styles

### In CSS/app.css

```css
/* Import the main Grove styles */
@import '@autumnsgrove/groveengine/ui/styles/grove.css';

/* Or import specific token files */
@import '@autumnsgrove/groveengine/ui/styles/tokens.css';
@import '@autumnsgrove/groveengine/ui/styles/components.css';
```

### In Svelte Components

```svelte
<style>
  @import '@autumnsgrove/groveengine/ui/styles/grove.css';
</style>
```

## tailwind.config.js

```javascript
import grovePreset from '@autumnsgrove/groveengine/ui/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // Include engine components for Tailwind to scan
    './node_modules/@autumnsgrove/groveengine/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      // Your site-specific theme extensions
    }
  }
};
```

## hooks.server.js Example

```javascript
import { validateSession } from '@autumnsgrove/groveengine/auth';
import { logger } from '@autumnsgrove/groveengine/server';

export async function handle({ event, resolve }) {
  // Validate session on protected routes
  if (event.url.pathname.startsWith('/admin')) {
    const session = await validateSession(event);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    event.locals.user = session.user;
  }

  logger.info(`${event.request.method} ${event.url.pathname}`);
  return resolve(event);
}
```

## +layout.svelte Example

```svelte
<script>
  import { Button, Card } from '@autumnsgrove/groveengine/ui';
  import '@autumnsgrove/groveengine/ui/styles/grove.css';

  let { children } = $props();
</script>

<div class="app-layout">
  <header>
    <Button variant="ghost">Menu</Button>
  </header>

  <main>
    {@render children()}
  </main>
</div>
```

## What NOT to Duplicate

Do NOT copy these from the engine into your site:

- **UI Components** - Use from `@autumnsgrove/groveengine/ui`
- **Auth utilities** - Use from `@autumnsgrove/groveengine/auth`
- **Server utilities** - Use from `@autumnsgrove/groveengine/server`
- **Validation/Sanitization** - Use from `@autumnsgrove/groveengine/utils`
- **Fonts** - Use from engine's static assets
- **Icons** - Use from engine's icon components
- **CSS tokens** - Import from engine's styles

## What IS Site-Specific

Your site should only contain:

- **Routes** (`src/routes/`) - Your page structure
- **Custom components** (`src/lib/components/custom/`) - Unique to your site
- **Content** (`content/` or `UserContent/`) - Your blog posts, articles
- **Site images** (`static/images/`) - Your photos, logos
- **Migrations** (`migrations/`) - Your database schema
- **Config files** - wrangler.toml, svelte.config.js, etc.

## Reference Implementation

See [AutumnsGrove](https://github.com/AutumnsGrove/AutumnsGrove) for a complete example of a Grove-powered site.
