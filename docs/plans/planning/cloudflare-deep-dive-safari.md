# Cloudflare Deep Dive Safari — Research vs Reality

> *The research painted a map. The codebase told the truth. This journal records where they agree, where they diverge, and what actually matters.*
>
> **Aesthetic principle**: Honest observation before architectural ambition
> **Scope**: 9 service proposals from `cloudflare-infrastructure-deep-dive.md` cross-referenced against the living codebase

-----

## Ecosystem Overview

**9 stops** across the Grove × Cloudflare research document, each evaluated for:
- What the research claims about current state
- What actually exists in the codebase
- Whether the proposed integration makes sense given reality

### The Critical Finding

The research document is **directionally correct** on its core thesis — CF Queues and Workflows are genuinely the missing primitives in Grove's Cloudflare stack. But it has **significant accuracy gaps** about the current state of several services, which changes the implementation strategy.

### Items by Category

**Thriving** 🟢: Loom SDK, Forage
**Growing** 🟡: Amber, Ivy, Meadow
**Wilting** 🟠: Thorn & Petal, Firefly SDK
**Barren** 🔴: Wander
**Critical gap**: CF Queues & Workflows (zero usage across the entire codebase)

-----

## 1. Loom SDK — The Foundation 🟢

**Character**: The coordination layer that turned 9 copy-paste DOs into a consistent, tested framework.

### Research claim
> "Loom already abstracts the hard parts of the DO pattern. The natural evolution: queue integration, Workflow integration."

### Codebase reality

The Loom SDK at `libs/engine/src/lib/loom/` is **complete and in production**:

- [x] `LoomDO` abstract base class — full lifecycle management (`base.ts`, 302 lines)
- [x] `LoomLogger` — structured logging per DO instance
- [x] `AlarmScheduler` — deduped alarm scheduling
- [x] `WebSocketManager` — hibernation-aware WebSocket management
- [x] `SqlHelper` + `JsonStore` — SQL helpers and JSON key-value persistence
- [x] `matchRoute` + `buildRequestContext` — declarative route matching
- [x] `PromiseLockMap` — promise dedup locks
- [x] `getLoomStub`, `loomFetch`, `loomFetchJson` — factory helpers
- [x] `LOOM_ERRORS` + `LoomResponse` — error system
- [x] SvelteKit adapter (`adapters/sveltekit.ts`)
- [x] Worker adapter (`adapters/worker.ts`)
- [x] Test utilities (`test-utils.ts`)
- [x] **9 production DOs using it**: TenantDO, PostMetaDO, PostContentDO, SentinelDO, ExportDO, TriageDO, ThresholdDO, ExportJobV2, SearchJobDO

**Accuracy verdict**: Research undersells this. Loom is done — not "emerging." The SDK is the right place for queue/workflow integration.

### Design spec (safari-approved)

Loom is ready for the next layer — event emission and workflow triggering:

- [ ] Add `this.emit(event, payload)` to LoomDO base class → routes to CF Queue when available, no-op otherwise
- [ ] Add `this.workflow(name, params)` to LoomDO → triggers CF Workflow from DO state changes
- [ ] Keep backward compatible — new methods are optional, existing DOs unchanged
- [ ] Add `loom/queue.ts` adapter with queue producer helpers

-----

## 2. Forage — The Proven Pattern 🟢

**Character**: The pioneer. First Loom-style service. Living proof the DO + LLM + alarm-based batch chaining pattern works.

### Research claim
> "The Forage pattern generalizes: Request → Worker → LLM generates task list → push N tasks to queue → N consumer Workers execute in parallel → aggregate results."

### Codebase reality

Forage at `services/forage/` is **fully built and on Loom SDK**:

- [x] `SearchJobDO extends LoomDO` with SQLite state (`durable-object.ts`)
- [x] `agents/driver.ts` — LLM generates domain candidates
- [x] `agents/swarm.ts` — LLM evaluates and filters candidates
- [x] `rdap.ts` + `cerebras-rdap.ts` — domain availability checking
- [x] `providers/` — OpenRouter, DeepSeek provider abstraction
- [x] `pricing.ts` — domain pricing lookup
- [x] `email.ts` — result delivery via Zephyr
- [x] Alarm-based batch chaining for multi-step searches

**Accuracy verdict**: The pattern description is accurate. The gap: Forage uses alarm-based sequential batching within one DO, not queue-based parallel fan-out. True parallelism would require queues.

### Design spec (safari-approved)

- [ ] Extract "LLM generates candidates → batch check → aggregate" into a reusable agentic pattern
- [ ] When CF Queues land in Grove, Forage is the first migration candidate for true parallel fan-out
- [ ] DO stays as coordinator/memory; queue handles parallelism
- [ ] Keep alarm-based chaining as fallback for environments without queues

-----

## 3. Amber — File Storage 🟡

**Character**: The amber-resin keeper — file uploads, R2 storage, export zips.

### Research claim
> "File processing likely happens synchronously... no guaranteed retry if processing fails." Proposes `amber-processing-queue`.

### Codebase reality

- [x] `apps/amber/` — SvelteKit frontend (FileGrid, StorageMeter, UsageBreakdown, TrashBin)
- [x] `services/amber/` — Worker backend with ExportJobV2 on Loom SDK (alarm-based durable export jobs)
- [x] R2 bucket (`grove-storage`) for media
- [x] Cron triggers (`*/5 * * * *`, `0 3 * * *`) for periodic cleanup
- [x] Heartwood auth via service binding
- [ ] **No image processing pipeline** — no compression, no WebP, no thumbnails
- [ ] **No queue** — cron-based cleanup only

**Accuracy verdict**: Partially correct. Export jobs DO have durable state via Loom DO. But there's no media processing pipeline at all — it's not "synchronous and hopeful," it doesn't exist yet.

### Design spec (safari-approved)

- [ ] When media processing is built, start with CF Queue: upload → R2 (instant) → queue → process
- [ ] Consumer: WebP conversion, thumbnail generation (100px, 400px), EXIF stripping
- [ ] ExportJobV2 demonstrates the DO + alarm pattern; image processing could follow similar model
- [ ] CF Queue would be better than alarm chaining for parallel thumbnail generation across multiple sizes

-----

## 4. Ivy — Email 🟡

**Character**: The most complex service in the ecosystem. Full email client, triage, AI classification, digest scheduling.

### Research claim
> "Email sending inline with request handlers means one slow/failed Resend API call affects the user-facing response."

### Codebase reality

- [x] `apps/ivy/` — Full SvelteKit email client (compose, thread list, email view, search)
- [x] `services/zephyr/` — Centralized email gateway (Hono Worker) with auth, rate limiting, unsubscribe, D1 logging
- [x] `services/email-render/` — Email template rendering service
- [x] `TriageDO` on Loom SDK — alarm-based email classification (~10 emails per alarm)
- [x] AI classification via Lumen (Workers AI + OpenRouter)
- [x] Digest scheduling (8am/1pm/6pm configurable)
- [x] `workers/email-catchup/` — email catchup worker
- [x] Webhook handler for inbound email processing
- [ ] **Queue handler is a STUB**: `throw new Error("Not implemented")` (`apps/ivy/src/workers/queue/handler.ts`)
- [ ] **Cron polling** (`* * * * *`) instead of event-driven queue
- [ ] **No CF Queue** integration
- [ ] **No drip onboarding Workflow**

**Accuracy verdict**: Directionally correct but mischaracterizes architecture. Email sending isn't "inline" — Zephyr is already a separate Worker. TriageDO already does async processing via alarms. The real gaps: stub queue, no drip Workflows, no spike absorption.

### Design spec (safari-approved)

**Ivy is the #1 candidate for CF Queues:**

- [ ] Replace stub queue handler with real CF Queue consumer
- [ ] `ivy-transactional-queue` (high priority): welcome, password reset, verification
- [ ] `ivy-digest-queue` (batch priority): weekly digests, notification rollups
- [ ] TriageDO becomes queue producer: classified email → appropriate queue → Zephyr delivery
- [ ] Drip onboarding as CF Workflow: Day 0 welcome → sleep 24h → Day 1 nudge → sleep 6d → Week 1 tips
- [ ] Zephyr service binding pattern already solid — queues sit between callers and Zephyr

-----

## 5. Meadow — Social Feed 🟡

**Character**: The open sky — RSS-based community feed with dedicated poll and sync workers.

### Research claim
> "Publishing a post likely triggers synchronous feed updates — a fan-out problem." Proposes `meadow-fanout-queue`.

### Codebase reality

- [x] `apps/meadow/` — SvelteKit feed (posts, bookmarks, reactions, notes, compose)
- [x] `workers/meadow-poller/` — RSS fetcher, cron every 15 min, KV for poll state
- [x] `workers/timeline-sync/` — Nightly AI timeline summaries (1 AM UTC), per-tenant API keys
- [x] KV caching for feed pages (2-min TTL)
- [x] ThresholdDO for rate limiting
- [x] D1 for posts, reactions, bookmarks, follows, votes
- [x] Server modules: `feed.ts`, `follows.ts`, `reactions.ts`, `bookmarks.ts`, `notes.ts`, `votes.ts`
- [ ] **No queue-based fan-out** — RSS pull model, not push
- [ ] **No push notifications**
- [ ] **No scheduled posts**

**Accuracy verdict**: Misleading. Meadow uses an RSS pull model, not push. The bottleneck isn't fan-out; it's polling frequency and D1 write throughput. The research assumes a push architecture that doesn't exist.

### Design spec (safari-approved)

**Meadow's actual needs differ from the research proposal:**

- [ ] Queue between `meadow-poller` and D1 writes — batch RSS results for efficient D1 upsert
- [ ] Scheduled posts via Workflow: future timestamp → sleep → publish pipeline (RSS + Meadow + Zephyr)
- [ ] `timeline-sync` as queue consumer: push one message per tenant → parallel summary generation
- [ ] The "fan-out" problem becomes real only if/when Meadow transitions from RSS pull to push-based real-time feed

-----

## 6. Thorn & Petal — Content Moderation 🟠

**Character**: Protective brambles. Extensive specs and config. No production pipeline.

### Research claim
> "Current state: Worker sequence — Workers calling Workers, hoping they scale."

### Codebase reality

- [x] **Petal config** (`libs/engine/src/lib/config/petal.ts`, 375 lines) — provider cascade, categories, thresholds, rate limits, circuit breaker, PhotoDNA config, classification prompts
- [x] **Petal spec** (`docs/specs/petal-spec.md`) — full specification
- [x] **Thorn → Resin** — renamed in naming journey
- [ ] **No production moderation Worker** — no `services/thorn/`, `services/petal/`, or `services/resin/`
- [ ] **No Worker chain** — the "Worker sequence" described doesn't exist
- [ ] **No human review UI**

**Accuracy verdict**: Significantly off. There IS no current moderation pipeline. No Workers calling Workers. No "hoping they scale." The config and specs exist — the infrastructure does not.

### Design spec (safari-approved)

**Better situation than the research assumes — build queue-first from day one:**

- [ ] Petal config is ready: providers, categories, thresholds all defined
- [ ] Build moderation service with CF Queues from the start (no migration needed):
  - `petal-scan-queue` (images) → consumer runs Workers AI classification
  - `resin-scan-queue` (text) → consumer runs text moderation
  - `moderation-review-queue` (flagged content) → human review via Workflow
- [ ] `ModerationWorkflow` from research doc is solid — should be the INITIAL architecture, not a migration target

-----

## 7. Wander — Discovery 🔴

**Character**: A mirage.

### Research claim
> "Exploration and discovery mode." Proposes queues for preference signals and agentic Workflows.

### Codebase reality

- **"Wanderer" is a user identity term** — means "everyone who enters Grove" (AGENT.md)
- **No `apps/wander/`**, **no `services/wander/`**, **no `workers/wander-*/`**
- **No discovery/recommendation code of any kind**

**Accuracy verdict**: The research treats Wander as an existing service. It does not exist. This is a greenfield feature proposal mislabeled as an infrastructure upgrade.

### Design spec (safari-approved)

- [ ] If/when Wander is built, the research's DO + Workflow + agentic architecture is sound
- [ ] This is a Phase 6+ feature, not an infrastructure upgrade to existing code
- [ ] Building blocks are ready: Loom SDK for DOs, Meadow signals for data, Forage pattern for agentic fan-out
- [ ] Research document should flag this as "future service" not "current service needing queues"

-----

## 8. Firefly SDK — Server Provisioning 🟠

**Character**: Ephemeral light. Fully designed, not built.

### Research claim
> "This is the most natural Workflow candidate in the entire Grove ecosystem."

### Codebase reality

- [x] Full SDK spec: `docs/specs/firefly-sdk-spec.md` — provider-agnostic with ignite/illuminate/fade lifecycle
- [x] Queen coordinator spec: `docs/specs/queen-firefly-coordinator-spec.md` — DO coordinator for runner pools
- [x] Pattern doc: `docs/patterns/firefly-pattern.md` — design philosophy
- [ ] **No production code** — no `services/firefly/`, no SDK implementation
- [ ] **No Queen DO** — spec only
- [ ] **No Hetzner provider** — spec only

**Accuracy verdict**: Correct that Firefly is a natural Workflow candidate. But there's nothing to migrate — it would be built Workflow-first from scratch.

### Design spec (safari-approved)

- [ ] Build Firefly Workflow-first: `FireflyProvisionWorkflow` from research doc is solid
- [ ] Queen DO on Loom SDK coordinates pools; Workflow handles multi-step lifecycle
- [ ] Queue for CI job submission — fan-out across available runners
- [ ] Provider-agnostic SDK as spec describes

-----

## 9. CF Queues & Workflows — The Missing Layer ⚠️

**Character**: The infrastructure gap. Zero Cloudflare Queues. Zero Cloudflare Workflows. Anywhere.

### What Grove uses instead

| Pattern needed | Current workaround | Where |
|---|---|---|
| Async job queue | Cron triggers (polling) | Amber `*/5 * * * *`, Ivy `* * * * *`, Meadow `*/15 * * * *` |
| Durable multi-step | Alarm-based DO chaining | Forage SearchJobDO, Amber ExportDO, Ivy TriageDO |
| Background processing | Dedicated Workers | meadow-poller, timeline-sync, email-catchup, warden |
| Event routing | Service bindings | AUTH, ZEPHYR throughout |

### What's NOT happening because of the gap

- No retry-on-failure for email sending (Zephyr → Resend is inline)
- No spike absorption (mass notifications = mass synchronous sends)
- No parallel fan-out (Forage batches sequentially in DO alarms)
- No durable lifecycle processes (onboarding drip, server provisioning, moderation review)

**Accuracy verdict**: This is the strongest claim in the research. Queues and Workflows genuinely ARE the missing primitives.

### Design spec (safari-approved) — The Adoption Roadmap

**Phase 1: First CF Queue — Ivy transactional email**
- [ ] Add `[[queues.producers]]` and `[[queues.consumers]]` to wrangler config
- [ ] Replace cron-based send queue with CF Queue consumer
- [ ] Immediate benefit: retry on Resend failure, spike absorption, decoupled send path

**Phase 2: Meadow poller → queue**
- [ ] meadow-poller pushes per-tenant RSS results to queue
- [ ] Consumer batches D1 upserts efficiently

**Phase 3: First CF Workflow — Ivy onboarding drip**
- [ ] Day 0 welcome → sleep 24h → nudge → sleep 6d → tips
- [ ] Replaces need for scheduled DB polling

**Phase 4: Loom integration**
- [ ] Add `this.emit()` to LoomDO base → routes to CF Queue
- [ ] Any DO state change can trigger background work without direct service calls

**Phase 5: Future greenfield services**
- [ ] Petal/Resin moderation — build queue-first
- [ ] Firefly provisioning — build Workflow-first
- [ ] Wander discovery — build with full stack (DO + Queue + Workflow)

-----

## Expedition Summary

### By the Numbers

| Metric | Count |
|--------|-------|
| Total stops | 9 |
| Thriving 🟢 | 2 (Loom SDK, Forage) |
| Growing 🟡 | 3 (Amber, Ivy, Meadow) |
| Wilting 🟠 | 2 (Thorn/Petal, Firefly) |
| Barren 🔴 | 1 (Wander) |
| Critical gap | 1 (Queues/Workflows) |
| Total fix items | 31 |

### Research Document Accuracy Scorecard

| Service | Current State Accuracy | Proposal Quality |
|---------|----------------------|-----------------|
| Loom SDK | ⚠️ Undersold — it's fully built, not emerging | ✅ Right next step (add emit/workflow) |
| Forage | ✅ Pattern description accurate | ✅ Queue migration makes sense |
| Amber | ⚠️ No processing pipeline exists to fix | ✅ Queue-first when building |
| Ivy | ⚠️ Architecture mischaracterized (Zephyr exists) | ✅ Best queue candidate |
| Meadow | ❌ Assumes push model; reality is RSS pull | ⚠️ Different problems than proposed |
| Thorn/Petal | ❌ "Worker chain" doesn't exist | ✅ Build queue-first from scratch |
| Wander | ❌ Service doesn't exist at all | ✅ Solid greenfield design |
| Firefly | ⚠️ Nothing to "migrate from" | ✅ Workflow-first makes sense |
| Queues/Workflows | ✅ Accurately identifies the gap | ✅ Adoption roadmap is sound |

### Recommended Trek Order

1. **Ivy + Queues** — highest ROI. Replace the stub queue handler with a real CF Queue. Most mature service with the clearest gap.
2. **Loom SDK + emit()** — small surface area, high leverage. Every DO becomes a queue producer.
3. **Meadow + Queues** — decouple poller from D1 writes. Immediate throughput improvement.
4. **Ivy + Workflow** — onboarding drip sequence. First Workflow in production.
5. **Petal/Resin** — when moderation is built, build queue-first using the extensive config that already exists.
6. **Firefly** — when server provisioning is built, build Workflow-first using the comprehensive specs.
7. **Forage** — migrate from alarm-based to queue-based parallel fan-out.
8. **Wander** — greenfield, full stack, Phase 6+.

### Cross-Cutting Themes

1. **The research oversells the current problem.** Several services described as "needing migration" either don't exist or don't have the problems described. The real wins are: (a) adding queues to Ivy/Meadow's existing cron patterns, and (b) building new services queue-first/Workflow-first.

2. **Loom SDK is the linchpin.** Every queue and workflow integration should flow through Loom. The `emit()` and `workflow()` additions to LoomDO would make the entire DO fleet event-capable in one change.

3. **Cron → Queue is the migration pattern.** Three services (Amber, Ivy, Meadow) all use cron triggers as a poor substitute for event-driven queues. The migration path is consistent: replace cron polling with CF Queue consumers.

4. **Alarm chaining → Workflows is the other migration.** Forage, ExportDO, and TriageDO all use alarm-based multi-step execution. For truly complex multi-step processes (Firefly, onboarding), CF Workflows would be more appropriate.

5. **Build new services on the full stack from day one.** Petal/Resin, Firefly, and Wander should all be built with DOs + Queues + Workflows from the start. No legacy to migrate. The research's designs for these services are solid starting architectures.

-----

### Corrections the Research Document Needs

| Section | Issue | Correction |
|---------|-------|------------|
| Loom SDK | Described as early/emerging | Loom SDK is fully built with 9 production DOs |
| Thorn & Petal | "Worker chain hoping they scale" | No production moderation pipeline exists |
| Wander | Treated as existing service | Wander does not exist; "Wanderer" is user identity term |
| Meadow | "Synchronous fan-out problem" | Uses RSS pull model, not push fan-out |
| Ivy | "Email sending inline with request handlers" | Zephyr is already a separate gateway Worker |
| Amber | "Synchronous processing" | No media processing pipeline exists to be synchronous |
| Firefly | Implies migration from Workers | Nothing built to migrate from |

-----

*The fire dies to embers. The journal is full — 9 stops, 31 fixes sketched, the whole landscape mapped. The research is good thinking about what could be. The codebase is the truth about what is. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious.*

-----

*Safari completed February 2026. For the forest.*
