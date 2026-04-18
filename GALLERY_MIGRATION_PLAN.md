# Gallery Database Consolidation - Deployment Plan

## Problem
Gallery tables exist in `grove-curios-db`, but the upload pipeline writes to `grove-engine-db`. This causes uploads to succeed (R2) but photos never appear in galleries because the display code queries curio DB.

## Solution
Consolidate all gallery tables into `grove-engine-db` where uploads already write.

## Files Changed

### 1. Migration
- **libs/engine/migrations/110_gallery_to_engine_db.sql** (NEW)
  - Creates 6 gallery tables in engine DB
  - Includes all columns from original 031 migration + later additions (thumbnails, aspect_ratio, dominant_color)

### 2. Data Migration Script
- **scripts/migrations/migrate-gallery-to-engine-db.ts** (NEW)
  - Copies all existing gallery data from curio DB → engine DB
  - Supports dry-run mode
  - Safe to run multiple times (INSERT OR REPLACE)

### 3. Code Updates
- **apps/aspen/src/routes/(site)/gallery/+page.server.ts**
  - Changed from `CURIO_DB` → `DB`
  - All queries now target engine DB

- **apps/aspen/src/routes/api/curios/gallery/+server.ts**
  - Changed from `CURIO_DB` → `DB`

- **apps/aspen/src/routes/api/curios/gallery/sync/+server.ts**
  - Changed from `CURIO_DB` → `DB`
  - Sync now pulls R2 → engine DB (not curio DB)

## Deployment Steps

### 1. Apply Schema Migration
```bash
# Apply migration 110 to engine DB
wrangler d1 migrations apply grove-engine-db --remote
```

### 2. Migrate Existing Data
```bash
# Dry run first to verify
bun run scripts/migrations/migrate-gallery-to-engine-db.ts --dry-run

# Apply migration
bun run scripts/migrations/migrate-gallery-to-engine-db.ts
```

### 3. Deploy Code Changes
```bash
# Commit and push
git add -A
git commit -m "fix(gallery): consolidate gallery tables to engine DB

- Add migration 110 to create gallery tables in engine DB
- Migrate existing data from curio DB to engine DB  
- Update all gallery code to query engine DB
- Fixes empty gallery bug for users like Dante"

git push origin worktree-debug+dante-gallery-empty

# Deploy to production
# (via GitHub Actions or manual deploy)
```

### 4. Verify
- Visit Dante's gallery: https://dantedino.grove.place/gallery
- Should now show his 12+ photos
- Test upload flow: new photos should appear immediately

### 5. Cleanup (Optional)
```bash
# After verifying everything works, drop gallery tables from curio DB
# (Keep for a week in case rollback is needed)
```

## Rollback Plan
If issues arise:
1. Revert code changes (gallery queries back to CURIO_DB)
2. Keep migration 110 applied (no harm in having tables in both DBs)
3. Data still exists in curio DB as backup

## Testing Checklist
- [ ] Migration 110 applies cleanly
- [ ] Data migration completes without errors
- [ ] Dante's gallery shows photos
- [ ] New uploads appear in gallery
- [ ] Gallery sync endpoint works
- [ ] Gallery API returns correct data
- [ ] No console errors in browser
