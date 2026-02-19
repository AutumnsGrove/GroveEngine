# Naming Journey: The Tenant App Split

> The engine is two things. The library stays Lattice. What do we call the living,
> breathing deployment where every Wanderer's grove actually exists?

---

## What IS This Thing?

The thing we're naming:
- The live SvelteKit deployment serving `*.grove.place`
- 262 route files, 127 API handlers, 80+ curio endpoints
- Contains Arbor (admin panel), Sentinel (safety), all public pages
- Where Wanderers write, read, visit, and live
- Currently fused into `packages/engine`, needs its own identity

**What it is, fundamentally:** A place. A living, running, serving place.

**What it does in a Wanderer's life:** It IS the grove they experience. When someone
visits `autumn.grove.place`, this thing renders the page. When they open Arbor, this
thing serves the admin panel. When they interact with a curio, this thing handles
the API call. It's the medium through which every part of the grove becomes real.

**What emotion should it evoke:** Home. Warmth. A living, inhabited space. Not
infrastructure — that's Lattice's job. This is the LIFE that grows on the infrastructure.

---

## The Key Relationship

This is the critical insight:

```
  Lattice          ???
  ┌──────┐    ┌─────────────┐
  │trellis│───→│living thing │
  │frame  │    │that grew on │
  │work   │    │the frame    │
  └──────┘    └─────────────┘
  (library)    (deployment)
```

The naming doc defines Lattice as:

> "A lattice is the framework that supports growth. Vines climb it.
>  Gardens are built around it. It's not the thing you see, it's the
>  thing that holds everything else up."

So the app is: **the thing you see. The thing that grew on the lattice.**

---

## Walking Through...

I enter the grove. The path opens before me.

I walk past the Meadow where others gather.
I pass the Clearing where the sky is visible and status is known.
I see Heartwood at the center, the core identity.
Passage carried me here through the subdomain routing.

Now I arrive at... a blog. Someone's blog. Autumn's grove.

What do I see?

Not the framework — that's invisible, like a trellis behind a wall of green.
I see the LIVING thing. The rendered page. The garden. The curios.
The admin panel behind the door. The safety systems watching from the shadows.

I see something DENSE. Something that grew thick and tangled and alive.
Branches woven into branches. Paths that fork and reconnect.
127 API handlers. 80+ curio endpoints. Admin panels and auth flows
and blog routes and RSS feeds — all growing into each other,
all part of one living whole.

Not manicured. Not sterile. Beautifully complex. Intentionally dense.

I see... a thicket.

---

## The Walk: Bower → Rejection → Thicket

### Round 1: Bower (Rejected)

Bower had a perfect metaphorical relationship to Lattice — a bower grows on
a trellis. But the word doesn't *roll* in the grove. Too archaic. Catches in
the throat. Doesn't have the simple warmth of Meadow, Clearing, Vista.

The Wayfinder's verdict: "Bower is explicitly not allowed. I dislike the name
greatly and it doesn't roll well for the grove."

Lesson: the metaphor must serve the feeling, not the other way around.

### Round 2: Three Candidates

**Glade** — Open, sunlit, alive. Where light reaches the forest floor.
Beautiful word. But a glade is an *absence* — an opening, a clearing.
The app isn't an opening. It's dense. It's full. It's bursting with routes.

**Hollow** — Sheltered, storied, fairy-tale energy.
But "hollow" means empty. The opposite of what this app is.

**Thicket** — Dense, living, beautifully tangled.
"Step into the thicket." Has energy. Has texture.
Implies richness, complexity, the vibrant tangle of a real blog
with curios and routes and admin panels all woven together.

**The Wayfinder chose Thicket.**

---

## Why Thicket Fits

A thicket is a dense group of bushes, small trees, and undergrowth growing
closely together. In nature:

- Thickets are full of LIFE — birds nest in them, animals shelter in them
- They have texture, depth, complexity
- They're not manicured — they're beautifully wild, but not random
- You push through the branches and discover things inside
- A thicket provides SHELTER through density — not a single wall, but
  a thousand interwoven branches

The tenant app IS a thicket:
- 262 route files woven together
- 127 API handlers branching in every direction
- 80+ curio endpoints — guestbooks, galleries, badges, timelines
- Arbor (admin) growing alongside public pages
- Sentinel (safety) watching from the shadows
- Auth flows, billing routes, RSS feeds, blog posts — all dense, all alive

The relationship to Lattice:
- A lattice provides structure. A thicket is what grows when that
  structure disappears beneath abundant, intertwined life.
- You can't see the lattice anymore — the thicket has covered it entirely.
  But it's still there, holding everything up.

```
     🌿🌸🍃🌿🌸🍃🌿🌸🍃🌿
    🍃  T H I C K E T  🍃
   🌿  routes, APIs, curios  🌿
  🌸   admin, safety, blogs   🌸
 🍃    all dense and alive     🍃
  🌿     woven together      🌿
   🌸      262 routes       🌸
    🍃     127 handlers    🍃
     🌿🌸🍃🌿🌸🍃🌿🌸🍃🌿
  ════╪════╪════╪════╪════╪════
      │    │    │    │    │
      │  L A T T I C E   │
      │  (still there,   │
      │   beneath it all) │
  ────┴────┴────┴────┴────┴────
```

### The Sound Test

"Heartwood, Passage, Meadow, Clearing, Vista, **Thicket**."

It fits. Two syllables. The "th" is soft (like the forest), the "ick" has
energy (like the life inside), the "et" is crisp (like a twig snapping
underfoot). It rolls.

"Deploy Thicket." — clean
"Thicket routes." — clean
"Thicket API." — clean
"Lattice provides components. Thicket renders them." — clear distinction

### The Tagline Test

> "Thicket is where the grove grows dense and alive."
> "Thicket is the living tangle of every grove."
> "Step into the thicket."

All work. "Step into the thicket" is the best — an invitation, not a description.

---

## The Entry

### Thicket

**The Living Grove** · `*.grove.place`
**Internal Name:** GroveThicket
**Standard:** Application Server
**Waystone:** The deployment that serves every Grove blog — routes, pages, APIs,
the admin panel, and safety systems, all woven dense and alive.

A thicket is where the forest grows most dense — branches into branches,
leaves overlapping, paths that fork and reconnect. Birds nest in it.
Animals shelter in it. Push through the outer edge and you find a world
inside: more life per square foot than anywhere else in the forest.

Thicket is the SvelteKit deployment that renders every `*.grove.place` site.
262 routes, 127 API handlers, 80+ curio endpoints — guestbooks, galleries,
timelines, badges — all growing into each other, all part of one living whole.
When someone visits your grove, Thicket serves the page. When you open Arbor,
Thicket runs the admin panel. When Sentinel watches for harm, it watches from
inside the thicket. Lattice provides the components. Thicket weaves them dense.

The framework is invisible. The thicket is what grew.

*Step into the thicket.*

### Conflict Check

- `thicket` — not used anywhere in the codebase as a service/feature name
- No tech products called "Thicket" in our space
- Not in the domain blocklist yet (will need to add `thicket` to reserve it)
- `packages/thicket` — clean, available
- `grove-thicket` — clean script name
- `thicket.grove.place` — available (could host Vineyard page)
