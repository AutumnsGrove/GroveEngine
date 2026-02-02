# Bower: Malleable Software for the Grove

> *Found, selected, arranged.*

---

## Inspiration

This exploration is inspired by [Ink & Switch's essay on Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)—a vision for computing where "anyone can adapt their tools to their needs with minimal friction."

The essay identifies a fundamental problem: modern software treats users as passive consumers of locked-down applications. When computerized systems replaced physical tools, we gained power but lost agency. The development team becomes a bottleneck; the long tail of niche requirements goes unserved.

**Their key insight:** This isn't just about AI generating code. AI-assisted coding "resembles bringing a talented sous chef to a food court—useful only if the underlying system supports open creation."

The underlying system must be designed for malleability.

---

## Why Grove Is Positioned for This

Ink & Switch says further research is needed. But they're thinking about *general* software—any application, any domain. That's hard.

Grove is different. We have:

### 1. A Bounded Domain
We're not making all software malleable. We're making *one kind of space* (personal sites) customizable through *one vocabulary* (the Grove nature aesthetic) with *guardrails* (tier limits, performance budgets, curated components).

### 2. An Existing Component Library
60+ Svelte components already exist:
- Trees: TreePine, TreeBirch, TreeCherry, TreeAspen
- Creatures: Butterfly, Firefly, Bee, Bird, Deer, Owl, Rabbit
- Botanical: Vine, Leaf, Acorn, Fern, FallingLeavesLayer
- Ground: Mushroom, Rock, Bush, GrassTuft, Flowers
- Sky: Cloud, Moon, Star, Sun, Rainbow
- Structural: Lattice, Birdhouse, Bridge, Lantern
- Water: Pond, Stream, LilyPad
- Weather: Snowflake, SnowfallLayer

Each with typed props, consistent patterns, and a shared design language.

### 3. A Composition System (Terrarium)
Terrarium already lets users drag-drop components onto a canvas, configure props, and export decorations. The building blocks exist.

### 4. Curios with Real Functionality
Beyond decorations, we have interactive elements: guestbooks, shrines, hit counters, link gardens. These have configuration options, display styles, and tier-gated features.

### 5. Design Tokens (Foliage + Palette)
A semantic color system (`flowers.wildflower.purple`, `bark.darkBark`) that components reference. Theming already works.

### What's Missing: The Bridge

The gap is between:
- **Level 2**: Drag-drop in Terrarium (what exists)
- **Level 4**: Write custom Svelte code (requires developer skills)

There's a cliff. No gentle slope.

**Bower is the bridge.**

---

## What Is Bower?

Bower is the composition layer that makes Grove malleable. It has three parts:

### 1. The Manifest
A machine-readable catalog of all components with semantic metadata:
- Name, category, description
- Props schema (what can be configured)
- Semantic tags (`flying`, `glowing`, `seasonal:winter`, `interactive`)
- Composition hints (what it pairs well with, what to avoid)
- Constraints (tier requirements, performance cost)

### 2. The DSL
A composition language simpler than Svelte but richer than drag-and-drop:
```yaml
name: Firefly Garden
description: "Glowing fireflies dancing around flowers"
elements:
  - component: firefly
    count: 5-8
    placement: scattered
    layer: foreground
    props:
      animate: true
  - component: wildflower
    count: 3-5
    placement: ground-level
    props:
      color: vary(palette.flowers.*)
```

Humans can read and edit this. Agents can generate it.

### 3. The Agent Interface
How AI agents interact with Bower:
- **Query**: "Find components that fly and glow"
- **Compose**: "Arrange fireflies around a guestbook"
- **Constrain**: "Must work in sidebar, respect Oak tier limits"
- **Preview**: Generate a visual preview before committing

---

## How It Maps to Ink & Switch's Patterns

### Pattern 1: A Gentle Slope from User to Creator

| Level | What It Is | Skill Required |
|-------|------------|----------------|
| 1 | Pick a theme (Foliage) | None |
| 2 | Drag-drop in Terrarium | Minimal |
| **3** | **Describe intent → Agent composes via Bower** | **Natural language** |
| **3.5** | **Edit Bower DSL directly** | **Reading YAML** |
| 4 | Write custom Svelte | Developer skills |

Bower creates **Level 3 and 3.5**—the missing middle ground.

### Pattern 2: Tools, Not Apps

Grove components are already tools, not monolithic apps:
- They share data through stores (seasonStore, themeStore)
- They use CSS variables for theming
- They have typed interfaces

Bower makes them *discoverable* and *composable* without code.

### Pattern 3: Communal Creation

**Phase 1 (Personal):** Wanderers create compositions for their own sites.
**Phase 2 (Templates):** Wanderers publish compositions as templates others can use.

Not full collaboration—that's overkill. But sharing what you've created? That's the Grove way.

---

## The Bowerbird Metaphor

A bowerbird creates an architectural display from found objects:
1. **DISCOVERS** objects in the environment
2. **SELECTS** based on criteria (color, shininess)
3. **ARRANGES** them into a coherent structure
4. **PRESENTS** the result

Bower does the same:
1. Manifest enables **discovery**
2. Semantic tags enable **selection**
3. DSL enables **arrangement**
4. Output is a **composition** (scene, decoration, curio template)

*The bird's selection process is invisible. What you see is the bower itself—the arranged beauty.*

---

## Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTENT                          │
│              "Add fireflies around my guestbook"            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          BOWER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Manifest   │  │    DSL      │  │  Agent Interface    │  │
│  │  (catalog)  │→ │ (compose)   │→ │  (query/generate)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         OUTPUT                              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐   │
│  │   Terrarium   │  │    Foliage    │  │     Curios     │   │
│  │   (scenes)    │  │   (themes)    │  │  (templates)   │   │
│  └───────────────┘  └───────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Bower doesn't replace anything.** It's a layer that makes existing systems more accessible:
- Terrarium consumes Bower compositions as importable scenes
- Foliage consumes Bower compositions as decoration presets
- Curios could consume Bower compositions as configurable curio templates

---

## Tier Considerations

Composition power should scale with tier:

| Tier | What They Can Do |
|------|------------------|
| **Seedling** | Use pre-made templates, basic customization |
| **Sapling** | Full agent composition, save personal templates |
| **Oak** | Share templates publicly, advanced composition features |
| **Evergreen** | Everything, priority agent access |

Complexity budgets (like Terrarium's 200 points) should apply to Bower compositions too.

---

## Open Questions

### Technical
1. **Manifest generation**: Auto-generate from TypeScript types? Or hand-curated? Probably hybrid—auto-generate props, hand-curate semantic tags.

2. **DSL format**: YAML? JSON? Something custom? YAML is human-readable and well-understood.

3. **Preview rendering**: How do we show a preview before committing? Probably a headless Terrarium render.

4. **Validation**: How do we ensure compositions are valid, accessible, performant? Lint rules? Runtime checks?

5. **Storage**: Where do compositions live? User's site? Central catalog? Probably both—personal storage + shareable catalog.

### Product
1. **Entry point**: Where does the user access this? Chat with Wisp? A "Compose" button in Terrarium? Mycelium integration?

2. **Failure modes**: What happens when the agent can't find matching components? Graceful fallbacks? Suggestions?

3. **Template curation**: If templates can be shared, who curates? Quality control?

4. **Naming templates**: Do users name their compositions? Grove-style names?

### Philosophical
1. **How much magic?** Should the user see the Bower DSL at all, or is it purely internal?

2. **Ownership**: When you create a composition, is it "yours"? What does sharing mean?

3. **Evolution**: As we add components, how do compositions stay compatible?

---

## Implementation Phases (Rough)

### Phase 0: Research & Design (Now)
- Define manifest schema
- Define DSL schema
- Prototype agent interface
- Identify integration points

### Phase 1: Manifest
- Auto-generate manifest from existing components
- Add semantic tags to key components
- Create manifest validation tooling

### Phase 2: DSL
- Define composition format
- Build parser/validator
- Create manual compositions for testing

### Phase 3: Agent Interface
- Integrate with Mycelium (MCP)
- Build query/composition endpoints
- Test with Claude Code

### Phase 4: Integration
- Export to Terrarium scenes
- Export to Foliage decorations
- Preview rendering

### Phase 5: Polish
- Template sharing (if demand exists)
- Performance optimization
- Documentation

---

## Success Criteria

**We'll know Bower works when:**

1. A user can say "make my site feel cozy with glowing things" and get a composed scene without touching code
2. The agent can discover components matching fuzzy criteria
3. The output is valid, accessible, and performs well
4. A technically-curious user can read and tweak the DSL
5. Templates can be shared and reused

---

## References

- [Ink & Switch: Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
- Grove Terrarium spec (`docs/specs/terrarium-spec.md`)
- Grove Curios spec (`docs/specs/curios-spec.md`)
- Grove Naming (`docs/philosophy/grove-naming.md`)
- Naming journey (`docs/scratch/malleable-bridge-naming-journey.md`)

---

*This is an exploration, not a commitment. We're asking: could Grove become malleable? What would that take? Bower is the hypothesis.*
