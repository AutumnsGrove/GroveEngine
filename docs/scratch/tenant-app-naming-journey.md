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
  │trellis│───→│living shelter│
  │frame  │    │that grows   │
  │work   │    │on the frame │
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

I see a SHELTER. A space that someone has MADE into their own.
Branches woven overhead, light filtering through, flowers climbing
the structure. Not wild forest — something tended, intentional,
alive. A place built from living things.

I see... a bower.

---

## Candidates

### 1. Bower

**A natural shelter formed by trees, vines, or flowering plants arching overhead.**

In gardens, a bower is a shaded retreat — a seat surrounded by climbing
plants, supported by a lattice or trellis. In literature, a bower is an
idyllic retreat. A bowerbird creates elaborate, decorated structures —
the ultimate expression of "someone lives here."

**The relationship is perfect:** A bower grows on a lattice. The framework
supports the shelter. The trellis holds up the living thing.

- `packages/bower` → clean
- `grove-bower` → clean script name
- "Lattice provides the components. Bower renders them." → clear distinction
- "Deploy Bower" / "Bower routes" / "Bower API" → makes sense

> "Bower is the living shelter that Lattice holds up."

Completing the sentence: "Bower is where your grove comes alive."

Vibe: Warm, sheltered, intentional, intimate. Like walking into a
garden alcove and finding a seat beneath climbing roses.

Potential issue: There was a defunct JS package manager called "bower"
(deprecated 2017). Probably irrelevant in 2026, but worth noting.


### 2. Glade

**An open space in a forest where sunlight reaches the ground.**

A glade is often the most beautiful, alive part of a forest — where
wildflowers bloom, butterflies gather, deer graze. It's a place of
ARRIVAL: you walk through dense trees and suddenly you're there.

- `packages/glade` → clean
- `grove-glade` → clean script name
- "Lattice builds the forest. Glade is the clearing where life happens."
- "Deploy Glade" / "Glade routes" → makes sense

> "Glade is the open heart of the grove."

Completing the sentence: "Glade is where the grove opens up."

Vibe: Open, sunlit, alive, a place of discovery and arrival.

Potential issue: A glade is an ABSENCE (clearing = removed trees),
not a structure. The app IS a structure. Also, no direct relationship
to "lattice" as a metaphor — glades don't grow on lattices.


### 3. Stand

**A contiguous community of trees, uniform enough to be a forestry unit.**

In forestry, "this stand of oaks" = "this group of trees functioning
as one." The deployment IS the stand — all tenants growing together,
served by the same runtime.

- `packages/stand` → clean but could be confused
- `grove-stand` → ok script name

> "Stand is where every tree in the grove takes root."

Completing the sentence: "Stand is the living community of trees."

Vibe: Solid, communal, grounded.

Potential issue: "Stand" has many non-forest meanings (take a stand,
a market stand, etc.). Less poetic than Bower or Glade.

---

## The Verdict

**Bower** wins.

The lattice-bower relationship is too perfect:
- Lattice = the framework, the trellis, the invisible support
- Bower = the living shelter that grows on the lattice

Every other candidate has a weaker connection to "Lattice" as a
concept. Bower is SPECIFICALLY the thing that grows on a lattice.
That's not a coincidence — it's the name that was always there.

```
                    🌸 🌿 🌸
                 🌿    BOWER   🌿
              🌸   (the living    🌸
           🌿    shelter where     🌿
        🌸    Wanderers create,     🌸
     🌿    read, visit, and live     🌿
  ═══╪════╪════╪════╪════╪════╪════╪═══
     │    │    │    │    │    │    │
     │    │  LATTICE (the trellis) │
     │    │    │    │    │    │    │
  ───┴────┴────┴────┴────┴────┴────┴───
              infrastructure
```

---

## The Entry (Draft)

### Bower

**The Living Grove** · `*.grove.place`
**Internal Name:** GroveBower
**Standard:** Application Server
**Waystone:** The deployment that serves every Grove blog — the routes,
pages, APIs, admin panel, and safety systems that bring your grove to life.

A bower is a shelter woven from living things — branches arching overhead,
vines climbing a trellis, flowers tumbling through the frame. In gardens,
a bower is where you sit and the world is beautiful around you. Where a
lattice is the structure you build on, a bower is what grows on it: the
shade, the color, the life.

Bower is the SvelteKit deployment that renders every `*.grove.place` site.
When someone visits your grove, Bower serves the page. When you open Arbor,
Bower runs the admin panel. When a curio sparkles in the sidebar, Bower
handles the API call. Lattice provides the components. Bower weaves them
into the living, breathing space that Wanderers experience.

The framework is invisible. The bower is what you see.

*A shelter woven from the lattice.*
