# Follow-Up: The Great Grove Refactor

> Post-merge work remaining after `refactor/great-grove-refactor` lands on `main`.
> Created: 2026-05-19

---

## Rollback Safety

If production goes sideways, revert to this known-good state:

| Item | Value |
|------|-------|
| **Pre-merge main HEAD** | `9452ae579c8ab0251c5ad236dcf6584522b615e3` |
| **Pre-merge main commit** | `feat: add ::anchor[name]:: directive and fix vine positioning for all anchor types` |
| **Rollback command** | `git revert --no-commit HEAD..9452ae579 && git commit -m "revert: roll back great grove refactor"` |
| **CF Pages rollback** | Cloudflare Dashboard → Pages → grove-lattice → Deployments → roll back to last deploy before merge |
| **Workers rollback** | `wrangler rollback` per-worker (grove-durable-objects, grove-router, pulse-collector, etc.) |
| **D1 migrations** | Migration 113 (flag changes) is safe to leave — it only flips feature flags, no schema changes. Heartwood 0014 marks columns deprecated but doesn't drop them. |

---

## Priority 1 — Do Immediately After Merge

### Deploy PULSE_VISITOR_SECRET
Pulse visitor hashing won't work without this secret deployed to all apps.

```bash
# Generate the secret once
openssl rand -hex 32

# Deploy to all 8 apps + collector
gw secret apply --pages grove-lattice PULSE_VISITOR_SECRET
gw secret apply --worker pulse-collector PULSE_VISITOR_SECRET
gw secret apply --worker grove-durable-objects PULSE_VISITOR_SECRET
# ... repeat for each worker/pages project that runs Pulse hooks
```

### Fix Landing /knowledge Prerender
The Landing app's `/knowledge` route returns 500 during `svelte-kit build` prerender. Runtime is fine.

**Options (pick one):**
1. Audit doc frontmatter in `docs/` for missing/invalid required fields used by `scanAllDocs()`
2. Skip prerender for `/knowledge` in `apps/landing/svelte.config.js`:
   ```js
   prerender: { entries: ['*', '!/knowledge'] }
   ```

### Verify Promoted Features
Lantern and Reeds were promoted out of greenhouse (migration 113). Confirm they render correctly for non-greenhouse users on production.

---

## Priority 2 — This Week

### Phase 3: Local Dev Documentation (Step 8)
Write `docs/LOCAL_DEV.md` covering:
- Quick start (one command: `./scripts/dev-stack.sh`)
- Architecture diagram (which services run on which ports)
- .dev.vars setup per worker
- Troubleshooting common issues

### Phase 3: End-to-End Validation (Step 9)
Full local flow test:
1. Google OAuth login via localhost callback
2. Create a post in Aspen
3. View the post with Reeds comments enabled
4. Verify Lantern cross-grove navigation works
5. Confirm Pulse events are being captured

### Auth Recovery Path
Passkeys and magic links were removed. Users with passkey-only accounts need to:
- Use Google OAuth with the same email address
- Heartwood matches by email, links the account

Verify this recovery path works in production. Consider a one-time email to affected users if any exist.

---

## Priority 3 — Next Sprint

### Phase 8 Wave 2: Remaining Engine Extractions
The following subsystems are still in `libs/engine/` and candidates for extraction:
- **Email** — notification templates, send logic
- **Server** — API route utilities, middleware
- **UI** — shared Svelte components (careful: barrel import dependencies)

Goal: reduce engine from ~541 exports toward ~50 (core platform only).

### Full Codebase Audit
With Pulse data flowing from production, audit:
- Which of the 21 core features are actually used
- Error rates and patterns across all apps
- Signup funnel drop-off points
- Performance bottlenecks visible in real traffic

### Junk Drawer Review (Data-Informed)
After 2-4 weeks of Pulse data:
- Identify any junk-drawered features that users are still trying to access
- Decide: restore, redirect, or confirm removal
- Clean up `_junkdrawer/` entries that are confirmed dead

### Remaining TODOs in Core Code
| Location | TODO | Priority |
|----------|------|----------|
| `libs/engine/src/lib/platform/config/tiers.ts` | Theme/Foliage launcher gates (6x) | Blocked on Foliage launch |
| `libs/engine/src/lib/monitoring/sentinel/scheduler.ts` | Configurable thresholds, email alerts | Low — observability enhancement |
| `apps/aspen/src/routes/arbor/garden/edit/[slug]/+page.server.ts` | Load gutter from UserContent manifest | Low — UX polish |
| `apps/aspen/src/routes/api/stats/+server.ts` | Draft count implementation | Low — stats enhancement |

---

## What Was Completed in the Refactor

For posterity — the full scope of what shipped:

- **Phase 0**: Audit — 21 core features identified, 19+ junk drawer candidates mapped
- **Phase 1**: Junk Drawer — 5 workers, 3 apps, 14+ curios moved to `_junkdrawer/`
- **Phase 2**: Auth Simplification — Passkeys + magic links removed (~1,500 LOC), Google OAuth only
- **Phase 3**: Local Dev — Multi-config wrangler, dev-stack.sh, .dev.vars templates (94%)
- **Phase 4**: Observability — Grove Pulse event pipeline, Arbor dashboard, signup funnel
- **Phase 5**: Stability — svelte-check in pre-push, 62 new Plant tests (158 total)
- **Phase 6**: Dev Tooling — GW reduced 73% (27,738 → 7,460 lines)
- **Phase 7**: Engine Decoupling — grove-errors extracted, gossamer decoupled, clean DAG
- **Phase 8**: Engine Decomposition — loom, thorn, grove-crypto, curios, grove-markdown extracted

**Net result:** 63 services → 21 core features. Architecture cycles broken. Full observability added.
