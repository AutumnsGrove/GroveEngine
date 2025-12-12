# Pricing Discussions & Decisions

*Internal document tracking pricing evolution and rationale*

*Last updated: December 2025*

---

## Current Pricing Structure (December 2025)

### Subscription Tiers

| Feature | Seedling | Basic | Professional | Premium |
|---------|:--------:|:-----:|:------------:|:-------:|
| **Monthly** | **$8** | **$12** | **$25** | **$35** |
| **Yearly (15% off)** | $82 | $122 | $255 | $357 |
| Posts | 50 | 250 | Unlimited | Unlimited |
| Storage | 1 GB | 5 GB | 20 GB | 100 GB |
| Grove Social | ✓ | ✓ | ✓ | ✓ |
| Custom Domain | — | — | BYOD only | ✓ (incl. search) |
| @grove.place Email | — | Forward only | Full (send/receive) | Full (send/receive) |
| Domain Registration | — | — | — | Included (up to $100/yr) |
| Support | Community | Email | Priority email | 8hrs free + priority |
| Analytics | Basic | Basic | Full | Full |
| **Target User** | *Curious* | *Hobbyists* | *Serious* | *Professional* |

### Domain Search Service (Premium)

| Turnaround | Setup Fee | Credited As |
|:----------:|:---------:|:-----------:|
| Same Day | $200 | 4 months Premium |
| 3 Days | $100 | 2 months Premium |
| 1 Week | $50 | 1 month Premium |

**Note:** Domain registration cost (~$20/year for standard TLDs) included in Premium subscription up to $100/year. Premium domains over $100/year: user covers the difference.

### Bring Your Own Domain (BYOD)

Available at Professional tier and above. Users who already own a domain can connect it without using the domain search service. No setup fee, no domain registration cost to Grove.

### Support Pricing (Beyond Included Hours)

| Tier | Included Support | Additional Hours |
|------|------------------|------------------|
| Seedling | Community/docs only | $100/hour |
| Basic | Email support | $100/hour |
| Professional | Priority email | $100/hour |
| Premium | 8 hours free (first month) | $75/hour |

---

## Pricing Rationale

### Why Four Tiers?

**Seedling ($8):** Low-friction entry point for people who want to try blogging without commitment. 50 posts is enough to genuinely explore the platform. Creates upgrade path when they hit limits.

**Basic ($12):** For regular bloggers who know they'll stick around. 250 posts covers most hobbyist needs. Email forwarding gives a taste of professional features.

**Professional ($25):** The "serious blogger" tier. Unlimited posts, BYOD, full email capabilities. For people whose blog is part of their identity or side business.

**Premium ($35):** Full-service option. Domain search, registration included, priority support. For professionals who want Grove to handle everything.

### Why 15% Yearly Discount?

- Industry standard is 15-20%
- Reduces churn (committed users)
- Improves cash flow predictability
- Rewards commitment without being so steep it cannibalizes monthly

### Why $35 Instead of $50 for Premium?

Original thinking: $50 felt "premium" and covered support costs.

Revised thinking: The value delta between Professional ($25) and Premium ($50) wasn't justified. At $35:
- Only $10 more than Professional
- Domain search + registration included justifies the difference
- Support hours are genuinely valuable
- More accessible price point for serious users

### Why Post Limits?

**Seedling (50 posts):** Creates natural upgrade trigger. "You've been writing consistently—time to commit!"

**Basic (250 posts):** Generous for hobbyists, but serious bloggers will eventually need more. Natural ceiling for "hobby" vs "serious" distinction.

**Professional/Premium (Unlimited):** Once you're paying $25+, artificial limits feel punitive. Trust that storage limits provide natural constraints.

---

## Email Feature Decisions

### Implementation Plan

1. **Cloudflare Email Routing (Free):** Basic tier forwarding
   - API: `POST /zones/{zone_id}/email/routing/rules`
   - Automatic provisioning when user reaches Basic tier
   - Forward to user's personal email address

2. **Forward Email ($3/month total):** Professional+ full mailboxes
   - Full IMAP/SMTP access
   - Users can send AND receive from their @grove.place address
   - Unlimited aliases on one $3/month plan

### Why Tiered Email?

**Basic (forwarding only):**
- Costs Grove $0 (Cloudflare is free)
- Users get professional-looking contact address
- Creates upgrade incentive: "want to reply from this address? upgrade!"

**Professional+ (full mailbox):**
- Costs Grove ~$3/month total for all users
- Fully professional email experience
- Key differentiator from Basic tier

---

## Domain-Related Decisions

### Domain Registration Bundling

**Included in Premium:** Registration up to $100/year

**Rationale:**
- Most .com/.net/.org domains are $10-30/year
- Premium TLDs (.io, .co, etc.) are $30-60/year
- $100 covers 95%+ of domains users would want
- Exotic TLDs (premium .com resales, etc.) require user contribution

**If domain costs >$100/year:**
- User covers the difference
- Added to monthly subscription as pro-rated amount
- Example: $180/year domain = +$6.67/month

### Domain Search Service Value

**Why charge for faster turnaround?**

The domain search tool (Acorn) uses AI to reduce 2-week manual searches to 1-2 hours. This represents genuine labor savings.

**Setup fees credited to subscription:**
- Users don't "lose" the money
- Creates commitment to Premium tier
- Feels fair: pay for expedited service, get subscription credit

### BYOD (Bring Your Own Domain)

**Available at Professional+**

**Why not Basic?**
- Custom domains require more support (DNS issues, SSL)
- Users with their own domains are typically more serious
- Creates clear upgrade incentive

**Why no fee?**
- User already paid for their domain
- No domain search labor required
- DNS setup is minimal effort

---

## Revenue Projections (Updated)

**Expected tier distribution:** 40% Seedling, 35% Basic, 15% Professional, 10% Premium

| Users | Monthly Revenue | Annual Revenue |
|:-----:|:---------------:|:--------------:|
| 50 | $680 | $8,160 |
| 100 | $1,360 | $16,320 |
| 500 | $6,800 | $81,600 |
| 1,000 | $13,600 | $163,200 |

**Calculation basis:**
- 40 Seedling × $8 = $320
- 35 Basic × $12 = $420
- 15 Professional × $25 = $375
- 10 Premium × $35 = $350
- **Per 100 users = $1,465** (using $13.60 weighted average)

*Note: Actual revenue likely higher as yearly plans and domain fees are not included.*

---

## Open Questions

1. **Support time tracking:** How much time do Premium users actually need in month 1?
2. **Email adoption:** Will users actually use @grove.place emails or ignore them?
3. **Tier distribution:** Is 40% Seedling realistic or will more people skip to Basic?
4. **BYOD demand:** How many Professional users already have domains?
5. **Domain price threshold:** Is $100/year the right cutoff for included registration?

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Nov 2025 | Raised prices from $5-10 to $12-25 | Original pricing undervalued the product |
| Nov 2025 | Set support rate at $75/hour | Reflects actual value of time |
| Dec 2025 | Added Seedling tier at $8 | User feedback: $12 entry too high |
| Dec 2025 | Reduced Premium from $50 to $35 | Value delta not justified at $50 |
| Dec 2025 | Added @grove.place email feature | Low-cost high-value differentiator |
| Dec 2025 | Added BYOD option at Professional | Users with domains shouldn't need Premium |
| Dec 2025 | Set yearly discount at 15% | Industry standard, reduces churn |
| Dec 2025 | Set post limits (50/250/unlimited) | Creates natural upgrade triggers |
| Dec 2025 | Domain bundling up to $100/yr | Covers 95%+ of normal domains |

---

## Competitive Context

| Platform | Entry Price | Mid Tier | Top Tier |
|----------|-------------|----------|----------|
| Ghost | $9/mo (500 members) | $25/mo | $50/mo |
| Substack | Free (10% of paid) | N/A | N/A |
| WordPress.com | $4/mo (ads) | $8/mo | $25/mo |
| Squarespace | $16/mo | $23/mo | $27/mo |
| **Grove** | **$8/mo** | **$12-25/mo** | **$35/mo** |

**Grove's positioning:** More affordable than Squarespace, more personal than Ghost, not algorithm-driven like Substack.

---

## Custom/Enterprise Plans

For users with special needs beyond Premium:

> **Custom Plans** — Need something specific? Let's talk. Custom storage, multiple domains, white-label options, team collaboration, dedicated support. Contact autumn@grove.place.

No public pricing. Handle case-by-case based on actual requirements.

---

*This document is for internal planning. Refer to `/docs/grove-pricing.md` for the public-facing pricing page.*
