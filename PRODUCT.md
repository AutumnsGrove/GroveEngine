# Product

## Register

product

## Users

Grove serves friends, queer creators, independent writers, and indie web enthusiasts who want their own space online, away from big tech algorithms and extractive platforms. They arrive seeking refuge: a cozy, authentic place to write, share, and belong. They value ownership, community, and spaces that feel genuinely theirs, not templated.

## Product Purpose

Grove is a blogging platform: sign up, claim a subdomain, write, and own the result. This file's primary lens is the app surfaces that serve that purpose, most immediately Plant (the signup/onboarding flow) and Arbor (the blog admin panel), plus Aspen (the reader-facing blog itself). Success looks like someone finishing signup with a real, working blog, not a half-configured shell, and feeling like the app got out of their way to let them write.

## Brand Personality

Warm, introspective, queer. Grove speaks like a trusted friend who runs a midnight tea shop: never performative, always sincere.

- Welcoming: every visitor should feel they've found somewhere safe
- Grounded: confident without being loud, capable without being corporate
- Authentic: this is your space; the product helps you speak, not perform

Reference feel: Studio Ghibli's lived-in warmth meets a well-organized indie bookshop.

## Anti-references

Corporate SaaS sterility, social media engagement-bait, generic website builders (Squarespace/Wix template energy), anything that reads as a dashboard for dashboards' sake.

## Design Principles

1. Content-first, decoration-second: nature elements and glass surfaces enhance readability and hierarchy, never obstruct it.
2. Alive but not distracting: subtle animation and seasonal variation build a living world; everything respects `prefers-reduced-motion`.
3. Organic over rigid: soft corners, natural color progressions, nothing sharp or corporate.
4. Warm in dark mode too: dark mode is "nature at night" with maintained warmth, not just inverted colors.
5. One canonical token system: every surface routes color/spacing through Prism (`@autumnsgrove/prism`), never a local reinvention. A component that hardcodes its own palette is a bug, not a style choice.

## Accessibility & Inclusion

WCAG AA minimum. Reduced motion is a first-class path, not an afterthought (all animation must be optional). Touch targets 44×44px minimum. Screen reader excellence and low-vision support are explicit goals, not just compliance checkboxes.
