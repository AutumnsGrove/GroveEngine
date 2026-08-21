# Writing Prompts — "Spark" Button in Flow

> Issue: [#1575](https://github.com/AutumnsGrove/Lattice/issues/1575)
> Status: Unblocked — see [Beta Environment Architecture](beta-environment-architecture.md), which shipped 2026-08-20 and gives us `<tenant>-beta.grove.place` as a safe place to test this before it touches production. The "parked" rationale in #1575 no longer applies.

## What this is

A curated bank of writing prompts (~100-300, tagged by mood/length/genre), surfaced via a "Spark" button inside **Flow** (Grove's Markdown editor — `MarkdownEditor.svelte`, wired into the new-post and edit-post routes in Aspen). No LLM involved for v1 — a hand-curated bank beats median AI output for this, and it skips Lumen cost/latency entirely. Not a visitor-facing widget like the rest of the Curios family; this one is for the person writing, not the person reading.

## Why this doc exists

Before touching code, we need to agree on **where the Spark button lives**. Below are four real candidate spots in Flow's actual layout, each with a rough mockup and the tradeoffs. Pick one (or tell me to blend two) and I'll build it against the beta environment.

---

## Candidate 1 — Toolbar icon, next to the photo picker

<details>
<summary><strong>Toolbar group in <code>FormattingToolbar.svelte</code></strong> — lives with Bold/Italic/Link, always visible while writing</summary>

Flow's toolbar already groups single-purpose action buttons this way — "Insert photo from gallery" is its own one-button group (`FormattingToolbar.svelte:69`). Spark would join it as a sibling group in the `formatGroups` array, wired through a new `onSpark` callback the same way `onShowPhotoPicker` is threaded from `MarkdownEditor.svelte`.

```
┌─────────────────────────────────────────────────────────────────┐
│ [B][I][code]  [link][footnote]  [🖼]  [✨]  [H1][H2][H3]  │ Source│Split│Preview  ⛶ 🧘 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**
- Zero new layout — reuses an existing pattern exactly (icon-btn + tooltip)
- Always reachable, in every editing session, not just new/empty posts
- Cheapest to implement and most consistent with Flow's existing visual language

**Cons**
- Toolbar is already dense; on mobile the toolbar-left row scrolls horizontally and Spark would be one more icon competing for thumb space
- Icon-only affordance — a first-time user has to hover to learn what "✨" does (mitigated by `title`/`aria-label`, same as every other toolbar button)
- Doesn't stand out for the specific moment it matters most: staring at a blank page

</details>

---

## Candidate 2 — Empty-state prompt, inline with the title

<details>
<summary><strong>Contextual CTA above/near <code>.inline-title</code></strong> — only appears when the post is blank</summary>

New Post (`+page.svelte:288-294`) starts with just a big borderless title input ("Untitled") and nothing else. A Spark affordance could appear only when `!title && !content`, right where the blank page's emptiness is most visible — then quietly disappear once the writer starts.

```
┌─────────────────────────────────────────────────────────────────┐
│  Untitled                                          [✨ Get a spark]│
│  ─────────────────────────────────────────────────────────────  │
│  › Add details                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Start typing to see your rendered markdown...                   │
```

**Pros**
- Shows up exactly when the "stuck, don't know what to write" problem is real — matches the issue's own framing ("get the flow started")
- Self-hiding: once you're writing, it's gone, so it never becomes toolbar clutter
- No competition with the dense toolbar row

**Cons**
- Needs new conditional state (`$derived` off `title`/`content`) rather than reusing an existing pattern
- Only reachable on a genuinely blank draft — someone who wants a *second* prompt mid-session (e.g. "give me a different angle") has no path back to it here
- Slightly more code than Candidate 1 (new positioned element + show/hide logic + responsive placement next to the title input)

</details>

---

## Candidate 3 — Header action, next to Save Draft / Publish

<details>
<summary><strong>Third button in <code>.header-actions</code></strong> — top-right, alongside Save Draft and Publish</summary>

The page header already has a `.header-actions` flex row (`+page.svelte:261-268`) holding Save Draft and Publish. Spark could sit to their left as a lower-emphasis third action.

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Garden                    [✨ Spark]  [Save Draft]  [Publish] │
│ New Bloom                                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**
- Highest visual prominence of the four — impossible to miss on page load
- Always available (not just empty-state), so it doubles as "give me another idea" mid-draft
- Structurally trivial — one more `<button>` in an existing flex row, no new state needed beyond a click handler

**Cons**
- Competes for attention with Save/Publish, which are the two actions that actually matter for shipping a post — a decorative writing aid sitting next to them risks looking like a third "important" action
- Header real estate is already tight on mobile (`.header-actions` wraps at narrow widths)
- Least contextual of the four — same weight whether the page is blank or three paragraphs deep

</details>

---

## Candidate 4 — Zen-group icon, next to full-preview / zen-mode

<details>
<summary><strong>Toolbar-right group in <code>FormattingToolbar.svelte</code></strong> — paired with the focus-mode controls</summary>

The toolbar's right side already holds mode-switch buttons plus a small "focus tools" group (full preview, zen mode) at `FormattingToolbar.svelte:145-169`. Spark fits the "help me focus and write" theme of that group better than the formatting-tools side.

```
┌─────────────────────────────────────────────────────────────────┐
│ [B][I][code]  [link][footnote]  [🖼]  [H1][H2][H3]  │ Source│Split│Preview │ ⛶  ✨  🧘 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**
- Groups Spark with its true siblings conceptually (zen mode, full preview) rather than with formatting mechanics (bold/italic/headings) — a writer reaching for "help me write," not "help me format"
- Same low implementation cost as Candidate 1 — one more icon button in an existing group
- Right side of the toolbar is less crowded than the left on mobile

**Cons**
- Same "always visible, easy to overlook" problem as Candidate 1 — no contextual boost for the blank-page moment
- Right-side icons (zen, full preview) currently use tinted colors (purple for zen, blue for full-preview) to stand out; Spark would need its own accent to avoid blending in, which is a small but real design decision this doc doesn't resolve

</details>

---

## My read

Candidate 2 (empty-state, self-hiding) is the closest match to the issue's actual framing — a nudge for "someone returning to writing after time away," not a permanent toolbar fixture. Candidate 1 is the cheapest to ship if we'd rather have something durable and low-risk for a v1. Candidates 3 and 4 are worth keeping in the lineup mainly as prominence/theming reference points.

## Open questions once a spot is picked

- **Data source for v1**: static JSON bundled with Flow, or a lightweight `/api/prompts/random` endpoint? (Affects whether "swap for another" needs a network round-trip.)
- **Insertion behavior**: does picking a prompt insert as the title, the opening line, or just float as a sidebar hint the writer can ignore?
- **Feature-flag gating**: `MarkdownEditor` already receives `flags={data?.flags ?? {}}` from the route (`+page.svelte:479`) — a new graft (e.g. `writing_prompts`) would gate Spark the same way other in-progress editor features are gated.
