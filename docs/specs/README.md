# Grove Project Specifications

> Complete index of all Grove platform specifications with links to repositories and project locations.

---

## Active Specifications

| Project | Description | Spec | Repository / Location |
|---------|-------------|------|----------------------|
| **Lattice (GroveEngine)** | Core blog engine powering all Grove sites | [engine-spec.md](./engine-spec.md) | [GroveEngine](https://github.com/AutumnsGrove/GroveEngine) / `packages/engine/` |
| **Grove Website** | Marketing site, signup, billing dashboard | [website-spec.md](./website-spec.md) | `landing/` |
| **Admin Panel** | Content management interface for blogs | [admin-panel-spec.md](./admin-panel-spec.md) | `packages/engine/` |
| **Meadow** | Community feed, voting, social discovery | [social-spec.md](./social-spec.md) | [Meadow](https://github.com/AutumnsGrove/Meadow) *(planned)* |
| **Rings** | Privacy-first analytics for writers | [analytics-spec.md](./analytics-spec.md) | `packages/engine/` |
| **Shade** | AI content protection system | [shade-spec.md](./shade-spec.md) | `packages/engine/` |
| **Trails** | Personal roadmaps for building in public | [trails-spec.md](./trails-spec.md) | `packages/engine/` *(planned)* |
| **Comments System** | Replies (private) & Comments (public) | [comments-spec.md](./comments-spec.md) | `packages/engine/` |
| **Theme System** | Visual customization & accent colors | [theme-system-spec.md](./theme-system-spec.md) | `packages/engine/` |
| **Help Center** | Integrated documentation & support | [help-center-spec.md](./help-center-spec.md) | `landing/` |
| **Status Page** | Platform health & incident communication | [status-page-spec.md](./status-page-spec.md) | [GroveMonitor](https://github.com/AutumnsGrove/GroveMonitor) |
| **Writing Assistant** | Ethical AI polish tool (grammar, tone) | [writing-assistant-unified-spec.md](./writing-assistant-unified-spec.md) | `packages/engine/` |
| **Content Moderation** | Automated AUP enforcement | [CONTENT-MODERATION.md](./CONTENT-MODERATION.md) | `packages/engine/` |
| **Tenant Onboarding** | Signup flow & interactive tour | [tenant-onboarding-spec.md](./tenant-onboarding-spec.md) | `landing/` |
| **Customer Repository** | Template structure for customer blogs | [customer-repo-spec.md](./customer-repo-spec.md) | Template for new sites |
| **Versioning** | Semantic versioning & update propagation | [versioning-spec.md](./versioning-spec.md) | `packages/engine/` |
| **Renovate** | Automated dependency updates | [renovate-spec.md](./renovate-spec.md) | All repositories |

---

## Completed Specifications

Projects that have been implemented or moved to production.

| Project | Description | Spec | Repository / Location |
|---------|-------------|------|----------------------|
| **Foliage** | Theme engine for Grove sites | [completed/foliage-project-spec.md](./completed/foliage-project-spec.md) | [Foliage](https://github.com/AutumnsGrove/Foliage) |
| **Ivy** | Mail client for @grove.place emails | [completed/ivy-mail-spec.md](./completed/ivy-mail-spec.md) | [Ivy](https://github.com/AutumnsGrove/Ivy) |
| **Amber** | Unified storage management | [completed/amber-spec.md](./completed/amber-spec.md) | [Amber](https://github.com/AutumnsGrove/Amber) |
| **Fiction House** | Mom's publishing house site | [completed/fiction-house-publishing-spec.md](./completed/fiction-house-publishing-spec.md) | [FictionHouseSite](https://github.com/AutumnsGrove/FictionHouseSite) |
| **Engine (v1)** | Original engine specification | [completed/engine-spec.md](./completed/engine-spec.md) | Superseded by current spec |
| **Versioning (v1)** | Original versioning strategy | [completed/versioning-spec.md](./completed/versioning-spec.md) | Superseded by current spec |

---

## Related Repositories

Other Grove ecosystem projects with their own repositories.

| Project | Description | Repository |
|---------|-------------|------------|
| **GroveAuth (Heartwood)** | Server-side auth worker | [GroveAuth](https://github.com/AutumnsGrove/GroveAuth) |
| **GroveBackups** | Automated Cloudflare backups | [GroveBackups](https://github.com/AutumnsGrove/GroveBackups) |
| **BaseProject** | Project template with best practices | [BaseProject](https://github.com/AutumnsGrove/BaseProject) |
| **Forage** | Fast domain discovery tool | [Forage](https://github.com/AutumnsGrove/Forage) |
| **AgenticNewspaper** | AI news aggregator with Claude Agent SDK | [AgenticNewspaper](https://github.com/AutumnsGrove/AgenticNewspaper) |
| **GroveMusic** | Playlist curation via agentic search | [GroveMusic](https://github.com/AutumnsGrove/GroveMusic) |
| **GroveSearch** | Agentic searching website | [GroveSearch](https://github.com/AutumnsGrove/GroveSearch) |
| **GroveScout** | Fast deal-searching application | [GroveScout](https://github.com/AutumnsGrove/GroveScout) |
| **GroveBloom** | Remote coding environment | [GroveBloom](https://github.com/AutumnsGrove/GroveBloom) |
| **Nook** | Video sharing for close friends | [Nook](https://github.com/AutumnsGrove/Nook) |
| **OmniParser** | Universal document parser | [OmniParser](https://github.com/AutumnsGrove/OmniParser) |
| **VisionBridge** | Visual content explanation tool | [VisionBridge](https://github.com/AutumnsGrove/VisionBridge) |
| **CDNUploader** | Upload files to CDN/R2 | [CDNUploader](https://github.com/AutumnsGrove/CDNUploader) |
| **ClaudeCodeSounds** | Audio library for Claude Code hooks | [ClaudeCodeSounds](https://github.com/AutumnsGrove/ClaudeCodeSounds) |

---

## Internal Monorepo Structure

Components integrated directly into this repository.

| Directory | Purpose |
|-----------|---------|
| `packages/engine/` | Core GroveEngine package (`@autumnsgrove/groveengine`) |
| `packages/grove-router/` | Subdomain routing logic |
| `packages/example-site/` | Example site for testing |
| `landing/` | Grove marketing website & dashboard |
| `plant/` | Development utilities |
| `domains/` | Domain management utilities |

---

*Last updated: December 2025*
