# Grove Brand Guidelines

> *"a place to Be"*

Grove is a quiet corner of the internet for writers who want to escape algorithmic noise. This document outlines the design principles, visual language, and tone that make Grove feel like a peaceful garden at dawn.

---

## Brand Essence

Grove is:
- **Calm & organic** — like a peaceful garden at dawn
- **Warm & inviting** — welcoming, not sterile
- **Minimal but not cold** — simple with soul
- **Nature-inspired** — growth, leaves, trees, flourishing
- **Solarpunk-adjacent** — hopeful, sustainable, human-scale

Think: a well-loved journal under a tree, morning light through leaves, a quiet library nook.

---

## Design Principles

### 1. Breathe
Generous whitespace, never cramped. Give content room to exist. Margins should feel intentional, not arbitrary.

**Do:**
- Use ample padding between elements
- Let important content have space to stand alone
- Embrace emptiness as a design element

**Don't:**
- Cram elements together
- Fill every pixel with content
- Use tight margins that feel suffocating

### 2. Grow
Motion should feel organic (fade, bloom, unfurl). Animations mimic natural growth patterns.

**Do:**
- Use gentle fade-ins and scale transitions
- Animate elements appearing as if they're growing
- Keep animations subtle and purposeful

**Don't:**
- Use jarring, mechanical animations
- Add motion for motion's sake
- Use bounce effects excessively

### 3. Ground
Subtle textures, natural shadows, nothing floating. Elements should feel connected to the page.

**Do:**
- Use soft, natural shadows (our bark-tinted shadows)
- Ground elements with subtle borders
- Create visual hierarchy through depth

**Don't:**
- Use harsh drop shadows
- Let elements feel disconnected
- Use pure black shadows

### 4. Quiet
No loud gradients, no harsh contrasts, no shouting. The interface should whisper, not yell.

**Do:**
- Use muted, natural colors
- Maintain gentle contrast ratios
- Let content speak for itself

**Don't:**
- Use vibrant, attention-grabbing colors
- Create jarring color combinations
- Use flashy visual effects

### 5. Invite
Rounded corners (lg/xl), soft borders, welcoming shapes. Every element should feel approachable.

**Do:**
- Use our grove-radius (`0.75rem`) as the default
- Soften edges on interactive elements
- Create organic, flowing shapes

**Don't:**
- Use sharp, angular corners
- Create intimidating interfaces
- Make buttons feel aggressive

---

## Color Palette

### Primary: Grove Green

Our primary green represents growth, nature, and vitality. Use it for:
- Interactive elements (buttons, links)
- Success states
- Brand accents
- Highlights

| Token | Hex | Usage |
|-------|-----|-------|
| grove-50 | `#f0fdf4` | Light backgrounds, hover states |
| grove-100 | `#dcfce7` | Badges, subtle highlights |
| grove-200 | `#bbf7d0` | Borders, dividers |
| grove-300 | `#86efac` | Secondary accents |
| grove-400 | `#4ade80` | Hover states |
| grove-500 | `#22c55e` | Focus rings |
| **grove-600** | **`#16a34a`** | **Primary buttons, links** |
| grove-700 | `#15803d` | Hover on primary |
| grove-800 | `#166534` | Active states, dark accents |
| grove-900 | `#14532d` | Very dark accents |
| grove-950 | `#052e16` | Near-black green |

### Neutral: Cream (Background)

Cream is our canvas — warm, inviting, easy on the eyes.

| Token | Hex | Usage |
|-------|-----|-------|
| cream | `#fefdfb` | Main background |
| cream-100 | `#fdfcf8` | Subtle variation |
| cream-200 | `#faf8f3` | Input backgrounds |
| cream-300 | `#f5f2ea` | Card backgrounds, hover |
| cream-400 | `#ede9de` | Borders, dividers |
| cream-500 | `#e2ddd0` | Strong borders |

### Neutral: Bark (Text)

Bark grounds our content — warm brown instead of harsh black.

| Token | Hex | Usage |
|-------|-----|-------|
| bark | `#3d2914` | Primary text |
| bark-50 through bark-400 | Various | Never use (too light) |
| bark-500 | `#a57c5a` | Disabled states |
| bark-600 | `#8a6347` | Secondary text |
| bark-700 | `#6f4d39` | Muted text |
| bark-800 | `#5a3f30` | Dark accents |
| **bark-900** | **`#3d2914`** | **Primary text** |

### Color Usage Examples

```
✅ Do: Use grove-600 for primary buttons
✅ Do: Use bark for body text
✅ Do: Use cream for backgrounds
✅ Do: Use grove-100 for success badges

❌ Don't: Use pure white (#ffffff) for backgrounds
❌ Don't: Use pure black (#000000) for text
❌ Don't: Use grove-500+ as background colors
❌ Don't: Mix warm and cool neutrals
```

---

## Typography

### Font Families

**Headings: Serif**
```css
font-family: Georgia, Cambria, 'Times New Roman', serif;
```
Classic, literary, timeless. Used for h1-h6, taglines, and moments of emphasis.

**Body: System Sans**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
Modern, accessible, unobtrusive. Used for body text, UI elements, and forms.

**Code: Monospace**
```css
font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, monospace;
```
Clean and readable. Used for code blocks and technical content.

### Type Scale

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| display-lg | 3.5rem | 1.1 | Hero headlines |
| display | 2.5rem | 1.2 | Page titles |
| display-sm | 2rem | 1.25 | Section headers |
| heading-lg | 1.5rem | 1.35 | Card titles |
| heading | 1.25rem | 1.4 | Subsections |
| heading-sm | 1.125rem | 1.45 | Small headers |
| body-lg | 1.125rem | 1.75 | Lead paragraphs |
| body | 1rem | 1.75 | Body text |
| body-sm | 0.875rem | 1.65 | Secondary text |
| caption | 0.75rem | 1.5 | Labels, hints |

### Typography Guidelines

**Do:**
- Use serif fonts for headings to create warmth
- Maintain generous line heights for readability
- Let text breathe with appropriate margins

**Don't:**
- Use all-caps extensively (feels like shouting)
- Use thin font weights (hard to read)
- Cram too much text into small spaces

### Taglines & Poetic Moments

For the tagline "a place to Be" and similar poetic content:
- Use *italic serif*
- Keep it understated
- Let the words carry the weight

---

## Spacing

We use a consistent spacing scale based on 4px increments:

| Token | Size | Common Uses |
|-------|------|-------------|
| space-1 | 0.25rem (4px) | Tight gaps |
| space-2 | 0.5rem (8px) | Small gaps |
| space-3 | 0.75rem (12px) | Component padding |
| space-4 | 1rem (16px) | Default padding |
| space-6 | 1.5rem (24px) | Section gaps |
| space-8 | 2rem (32px) | Large gaps |
| space-12 | 3rem (48px) | Section margins |
| space-16 | 4rem (64px) | Major sections |

### Spacing Guidelines

- Use consistent spacing throughout
- Larger elements need more breathing room
- Group related items with tighter spacing
- Separate distinct sections with generous margins

---

## Borders & Shadows

### Border Radius

| Token | Size | Usage |
|-------|------|-------|
| radius-grove | 0.75rem | Default for most elements |
| radius-grove-lg | 1rem | Cards, modals |
| radius-grove-xl | 1.5rem | Large containers |
| radius-full | 9999px | Avatars, pills |

### Shadows

Our shadows use bark tones for warmth:

| Token | Usage |
|-------|-------|
| shadow-grove-sm | Subtle elevation (inputs) |
| shadow-grove | Default cards |
| shadow-grove-md | Hover states |
| shadow-grove-lg | Dropdowns, popovers |
| shadow-grove-xl | Modals |

---

## Animation

### Duration

| Token | Duration | Usage |
|-------|----------|-------|
| duration-fast | 150ms | Micro-interactions |
| duration | 200ms | Default transitions |
| duration-slow | 300ms | Enter animations |
| duration-slower | 500ms | Complex animations |

### Easing

| Token | Curve | Feel |
|-------|-------|------|
| ease-default | cubic-bezier(0.4, 0, 0.2, 1) | Smooth, natural |
| ease-soft | cubic-bezier(0.25, 0.1, 0.25, 1) | Gentle |
| ease-bounce | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Playful (use sparingly) |

### Animation Patterns

- **Fade In**: Elements appear gently
- **Grow**: Elements scale from 95% to 100%
- **Bloom**: Organic scale with slight overshoot
- **Leaf Sway**: Gentle rotation for decorative elements

---

## Iconography & Motifs

### Icon Style

- Rounded stroke caps
- 2px stroke width default
- Organic, flowing shapes preferred
- Avoid harsh geometric icons

### Nature Motifs

Use these motifs throughout Grove:
- **Leaves** — Single leaf, falling leaves, leaf patterns
- **Trees** — Stylized, simple silhouettes
- **Growth** — Seedlings, roots, branches
- **Organic shapes** — Circles, teardrops, not sharp geometric

### The Grove Logo

The Grove logo consists of layered teardrop/leaf shapes forming a tree silhouette:
- Three overlapping leaf shapes
- Gradient from dark to light green
- Simple stem detail
- Works at all sizes

---

## Tone of Voice

Grove's voice is:

### Warm
*"Welcome to your grove"* not *"Account created successfully"*

### Calm
*"Take your time"* not *"Act now!"*

### Encouraging
*"Your words matter"* not *"Publish to get views"*

### Human
*"Something went wrong, and we're looking into it"* not *"Error 500: Internal Server Error"*

### Poetic (when appropriate)
*"a place to Be"* — Sometimes less is more.

### Voice Guidelines

**Do:**
- Use first person plural (we) for the platform
- Address users directly (you)
- Keep messages brief and clear
- Add warmth without being saccharine

**Don't:**
- Use corporate jargon
- Create urgency artificially
- Use exclamation points excessively!!!
- Be overly formal or stiff

---

## Accessibility

Grove is committed to being accessible to everyone:

### Color Contrast
- All text meets WCAG 2.1 AA standards
- Interactive elements have visible focus states
- Don't rely on color alone to convey meaning

### Focus States
- All interactive elements have visible focus rings
- Focus rings use grove-500 for consistency
- Never hide focus outlines

### Motion
- Respect `prefers-reduced-motion`
- Provide alternatives to animated content
- Keep animations subtle and purposeful

### Screen Readers
- All images have alt text
- Interactive elements have accessible names
- Use semantic HTML elements

---

## Dark Mode (Nature at Night)

Grove supports a dark theme that maintains warmth:

- Background shifts to deep warm brown
- Text becomes cream-colored
- Green accents remain consistent
- Shadows become more pronounced

The dark theme should feel like a forest at twilight — peaceful, not harsh.

---

## Quick Reference

### Essential Values

```css
/* Primary brand color */
--grove-600: #16a34a;

/* Background */
--cream: #fefdfb;

/* Text */
--bark: #3d2914;

/* Default radius */
--radius-grove: 0.75rem;

/* Default transition */
transition: all 200ms ease;
```

### Component Checklist

When creating new components, ensure they:
- [ ] Use grove-radius for rounded corners
- [ ] Use bark for text color
- [ ] Use cream for backgrounds
- [ ] Have visible focus states
- [ ] Use smooth transitions (200ms)
- [ ] Feel warm and inviting
- [ ] Support dark mode
- [ ] Are accessible

---

*Remember: Grove is a place to Be. Every design decision should support that feeling of calm, growth, and belonging.*
