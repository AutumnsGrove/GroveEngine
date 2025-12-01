# @groveplace/ui

> A calm, organic design system for the Grove blogging platform.
> *"a place to Be"*

Grove UI is a comprehensive component library built with Svelte 5 and Tailwind CSS, designed to create warm, inviting interfaces that feel like a quiet corner of the internet.

## Installation

```bash
npm install @groveplace/ui
```

## Setup

### 1. Configure Tailwind

Add the Grove preset to your `tailwind.config.js`:

```js
import grovePreset from '@groveplace/ui/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@groveplace/ui/**/*.{html,js,svelte,ts}'
  ],
};
```

### 2. Import Styles

In your main CSS file (e.g., `app.css`):

```css
@import '@groveplace/ui/styles';
```

Or just import the CSS tokens for non-Tailwind projects:

```css
@import '@groveplace/ui/styles/tokens';
```

### 3. Use Components

```svelte
<script>
  import { Button, Input, Card, Alert } from '@groveplace/ui';
</script>

<Card>
  <Alert variant="sprout" title="Welcome!">
    You're all set up and ready to grow.
  </Alert>

  <Input label="Email" placeholder="your@email.com" />

  <Button>Get Started</Button>
</Card>
```

## Components

### Buttons & Actions

- **Button** - Primary actions with multiple variants (primary, secondary, ghost, outline)

### Form Elements

- **Input** - Text input fields with labels, errors, and icons
- **Textarea** - Multi-line text input with auto-resize option

### Layout & Containers

- **Card** - Content containers with header/footer slots
- **Divider** - Horizontal separators with optional leaf motif

### Labels & Badges

- **Badge** - Status indicators and labels
- **Tag** - Removable tags for categories

### Feedback

- **Alert** - Nature-themed notifications (sprout, sunlight, frost, rain)
- **Spinner** - Loading indicators (circle, leaf, dots)
- **Progress** - Progress bars with growth animation

### Overlays

- **Modal** - Dialog windows
- **Tooltip** - Helpful hover hints

### Media

- **Avatar** - User profile images with status indicators
- **Icon** - Built-in icon set

### Navigation

- **Header** - Site header with responsive mobile menu
- **Footer** - Site footer with multiple layout options
- **NavLink** - Navigation links with active states

## Design Tokens

Access design tokens programmatically:

```ts
import { colors, typography, spacing } from '@groveplace/ui/tokens';

console.log(colors.grove[600]); // '#16a34a'
console.log(typography.fontFamily.serif); // ['Georgia', ...]
```

## Color Palette

### Grove Green (Primary)
- `grove-50` to `grove-950`
- Primary: `grove-600` (#16a34a)

### Cream (Background)
- `cream` (#fefdfb)
- `cream-100` to `cream-500`

### Bark (Text)
- `bark` (#3d2914)
- `bark-50` to `bark-950`

## CSS Custom Properties

All design tokens are available as CSS variables:

```css
:root {
  --grove-600: #16a34a;
  --cream: #fefdfb;
  --bark: #3d2914;
  --radius-grove: 0.75rem;
  --shadow-grove: /* ... */;
}
```

## Dark Mode

Grove supports a dark theme. Enable it by adding `data-theme="dark"` to your root element or using the `.dark` class:

```html
<html data-theme="dark">
  <!-- or -->
<body class="dark">
```

## Accessibility

All components are designed with accessibility in mind:
- WCAG 2.1 AA compliant color contrast
- Keyboard navigable
- Screen reader friendly
- Visible focus states
- Respects `prefers-reduced-motion`

## License

MIT

---

Made with care for [Grove](https://grove.place) - a place to Be.
