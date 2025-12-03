# GroveEngine v0.3.0 Migration - Current Status

## Overview
Migrating GroveEngine to use @groveengine/ui for generic UI components, fixing integration issues, and preparing for npm publish.

## What's Been Done

### GroveUI Fixes
- [x] Fixed wrapper component imports (`$lib/components/ui/*` → `$lib/components/primitives/*`)
- [x] Fixed Tailwind preset type annotation
- [x] Fixed Tabs.svelte destructuring order (tabs before value)
- [x] Added Spinner component
- [x] Added onclick prop to Badge component
- [x] Added "default", "outline" variants and "icon" size to Button
- [x] Removed MarkdownEditor (stays in GroveEngine - has engine-specific deps)
- [x] Fixed broken relative imports (Icons, ScoreBar, StatusBadge)
- [x] Created theme store for ThemeToggle
- [x] Fixed select-separator to use bits-ui directly

### GroveEngine Fixes
- [x] Added @groveengine/ui dependency to package.json files
- [x] Deleted generic UI components (Button, Card, Badge, Input, Textarea, Skeleton, Separator)
- [x] Updated most imports to use @groveengine/ui
- [x] Fixed blog/[slug] import (was using old $lib/components/ui)
- [x] Fixed payments import paths (.js → no extension)
- [x] Added stub functions for site-specific content (getAllPosts, getSiteConfig, etc.)
- [x] Created InternalsPostViewer component
- [x] Created registerContentLoader() pattern for site-specific imports

## Current Blockers

### Missing Export: getContactPage
The build is failing because `getContactPage` is not exported from markdown.js.
Need to add stub function like the others:

```javascript
export function getContactPage() {
  if (!contentLoader || !contentLoader.getContactPage) {
    console.warn('getContactPage: No content loader registered.');
    return null;
  }
  return contentLoader.getContactPage();
}
```

### Pattern for Site-Specific Functions
The following functions require `import.meta.glob` which can't be in a library:
- `getAllPosts()`
- `getSiteConfig()`
- `getLatestPost()`
- `getHomePage()`
- `getPostBySlug(slug)`
- `getAboutPage()`
- `getContactPage()` ← NEED TO ADD

These are now stubs that call `contentLoader.functionName()`.
Sites must call `registerContentLoader()` with their implementations.

## Files That May Need More Fixes

Check for more missing exports:
```bash
npm run build 2>&1 | grep "is not exported by"
```

## Next Steps (After Context Resume)

1. **Add getContactPage stub** to markdown.js
2. **Run build again** to find any remaining missing exports
3. **Verify build succeeds**
4. **Commit GroveUI changes** (many fixes made)
5. **Commit GroveEngine changes** (migration + fixes)
6. **Tag both as v0.3.0**
7. **Push to GitHub**
8. **Publish to npm** (GroveUI first, then GroveEngine)
9. **Verify published packages work**

## Commands Reference

```bash
# GroveUI
cd /Users/mini/Documents/Projects/GroveUI
npm run package    # Rebuild dist with types
npm run build      # Test build

# GroveEngine
cd /Users/mini/Documents/Projects/GroveEngine/packages/engine
npm run build      # Test build
npm run check      # Type check

# Re-link after GroveUI changes
cd /Users/mini/Documents/Projects/GroveUI && npm run package
cd /Users/mini/Documents/Projects/GroveEngine && npm link @groveengine/ui
```

## Key Files Modified

### GroveUI
- `src/lib/components/ui/*.svelte` - All wrapper imports fixed
- `src/lib/components/ui/index.ts` - Added Spinner export
- `src/lib/components/ui/Spinner.svelte` - NEW
- `src/lib/stores/theme.ts` - NEW
- `src/lib/tailwind.preset.js` - Fixed type annotation
- `src/lib/index.ts` - Removed editor export
- `src/lib/components/primitives/select/select-separator.svelte` - Uses bits-ui directly
- Various components - Fixed relative imports for Icons, StatusBadge, ScoreBar

### GroveEngine
- `packages/engine/package.json` - Added @groveengine/ui dep, version 0.3.0
- `packages/engine/src/lib/utils/markdown.js` - Added stub functions + registerContentLoader
- `packages/engine/src/lib/components/ui/index.ts` - Removed deleted component exports
- `packages/engine/src/lib/components/custom/InternalsPostViewer.svelte` - NEW
- 15+ route files - Updated imports to @groveengine/ui
- Deleted: `src/lib/components/ui/{button,card,badge,input,textarea,skeleton,separator}/`
- Deleted: `src/lib/components/ui/{Button,Card,Badge,Input,Textarea,Skeleton}.svelte`

## Plan File Location
`/Users/mini/.claude/plans/streamed-soaring-valley.md`

---
*Last updated: 2025-12-03 during migration*
