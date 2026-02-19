# App Distribution Exploration

> How do we get Grove into app stores without maintaining separate codebases?

**Date:** 2026-02-19
**Status:** Exploration / Decision pending
**Context:** Grove is a SvelteKit web app deployed on Cloudflare Pages/Workers. We want presence in the iOS App Store and Google Play Store while remaining a one-person operation with a single codebase.

---

## The Problem

Grove lives on the web. That works for people who live in browsers, but a lot of people expect apps. "Install it as a PWA" is technically possible but confusing for most people — the steps are buried in browser menus and the concept is unfamiliar. The simplest distribution path for most users is the App Store.

We don't need native features for their own sake. Grove is deliberately anti-notification-spam, anti-engagement-bait. This isn't about push notifications or sensor access. It's about **distribution** — being where people look for software.

### What We're Working With

- **Framework:** SvelteKit 2.50+ with Svelte 5
- **Deployment:** Cloudflare Pages + Workers (adapter-cloudflare)
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE) via service bindings
- **Architecture:** Multi-tenant with subdomain routing through grove-router
- **Existing PWA setup:** Web manifests, icons (192/512px), apple-touch-icon, standalone display mode — but **no service workers** and no offline support
- **Monorepo:** 10 apps, 10 services, 7 workers, shared engine library

---

## Options Evaluated

### 1. Capacitor (Ionic) — Bundled Static Build

**What it is:** A framework-agnostic tool that wraps a web app in a native WebView container. You build your SvelteKit app with `adapter-static` (SPA mode), and Capacitor copies it into native iOS/Android project shells.

**How it works with SvelteKit:**

1. Add a second SvelteKit config that uses `adapter-static` with SSR disabled
2. Build to static output (HTML/CSS/JS bundle)
3. `npx cap sync` copies the build into native Xcode/Android Studio projects
4. The app talks to your live Cloudflare API for data
5. Submit to stores via Xcode and Android Studio

**Pros:**

- First-class SvelteKit support, well-documented by multiple developers
- Large, mature plugin ecosystem (push notifications, biometrics, haptics, share sheet, etc.)
- JavaScript-only — no Rust or other toolchain needed
- Same codebase, two build targets (web: adapter-cloudflare, mobile: adapter-static)
- Capgo ($12/mo) enables over-the-air updates without store re-submission

**Cons:**

- Requires maintaining a dual adapter setup
- iOS builds require a Mac and Xcode
- API routes (`+server.ts`) don't work in static builds — mobile app must call hosted API
- Apple's Guideline 4.2 means we can't ship a bare wrapper (see below)

**Verdict:** Best overall option for iOS + Android. The plugin ecosystem solves the Apple review problem.

### 2. Tauri v2

**What it is:** A Rust-based alternative to Electron with mobile support added in v2 (stable October 2024).

**How it works with SvelteKit:** Similar to Capacitor — disable SSR, build to static, bundle into native shell. Official SvelteKit docs exist. Uses system WebView.

**Pros:**

- Smaller binary sizes than Capacitor
- Rust backend allows on-device computation if needed later
- Active development, growing community

**Cons:**

- Requires the Rust toolchain (added build complexity for a wrapper use case)
- Mobile plugin ecosystem is smaller and less mature
- The Tauri team has acknowledged they "overpromised mobile as a first-class citizen"
- Documentation has gaps for mobile-specific workflows
- More maintenance burden for what's essentially a branded WebView

**Verdict:** Overkill for our use case. Tauri shines when you need on-device Rust logic. For a web wrapper with some native polish, the Rust toolchain is unnecessary complexity.

### 3. PWA + TWA (Trusted Web Activity)

**PWA on iOS:** Users can install to Home Screen via Safari's Share menu. iOS PWA support has improved (web push since iOS 16.4, iOS 26 defaults sites to web app mode), but there's no install prompt, no App Store listing possible, and many users won't go through the manual flow.

**TWA on Android:** A Trusted Web Activity uses Chrome's engine (not a WebView) to render your site without browser UI, packaged as a Play Store app. It auto-updates when your website updates — zero maintenance after initial setup.

**Pros (TWA for Android):**

- Zero maintenance after setup — app updates when the website updates
- $25 one-time Google Play fee
- Uses real Chrome engine, not a degraded WebView
- Bubblewrap CLI or PWABuilder makes setup straightforward

**Cons:**

- Android-only — no iOS equivalent exists
- PWA alone cannot get into the iOS App Store
- Requires Lighthouse score 80+ and Digital Asset Links

**Verdict:** TWA is the ideal Android solution. For iOS, we still need Capacitor.

### 4. Capacitor with Remote URL

**What it is:** Point Capacitor's WebView at your live URL instead of bundling files.

```json
{
  "server": {
    "url": "https://grove.place"
  }
}
```

**Why not:**

- `server.url` was designed for development live-reload, not production
- Capacitor plugins break (fall back to web implementations)
- Platform detection (`Capacitor.getPlatform()`) may report "web" instead of native
- Apple will almost certainly reject it under Guideline 4.2
- No offline fallback (network drops = white screen)

**Verdict:** Not viable for production or store approval.

---

## The Apple Problem: Guideline 4.2

Apple's App Store Review Guideline 4.2 (Minimum Functionality) rejects apps that are "just a website wrapped in a WebView." The reviewer's question: **"Why does this need to be an app instead of a bookmark?"**

### What Gets Rejected

- A WebView loading a URL with no native integration
- Browser-like loading bars visible in the app
- Web-only navigation (hamburger menus, no native patterns)
- No offline handling
- No device capabilities used

### What Gets Approved

Apps that use WebViews for content but wrap them in a native experience. Amazon, Instagram, and Basecamp all use WebViews extensively — the technology isn't the problem.

### Minimum Viable Native Features

Based on multiple sources and real-world approval stories, aim for 3-4 clearly visible native features. Ranked by impact-to-effort for our use case:

**High impact, low effort:**

1. **Offline fallback screen** — Branded "you're offline, here's what you last saw" instead of a white page. A basic service worker handles this.
2. **Biometric login** — Face ID / Touch ID via `@capacitor-community/biometric-auth`. Visible immediately on launch.
3. **Native share sheet** — `@capacitor/share` for sharing posts through the OS share menu.
4. **Status bar integration** — `@capacitor/status-bar` for proper iOS appearance.

**Medium impact, medium effort:**

5. **Haptic feedback** — `@capacitor/haptics` for tactile responses.
6. **Native preferences** — `@capacitor/preferences` for persisting settings.

**Deliberately excluded:**

- **Push notifications** — While this is the strongest signal to Apple reviewers, Grove's philosophy is anti-notification-spam. We'd only add these if we find a use case that's genuinely helpful (like "someone replied to your comment") rather than engagement-driven.

### Review Submission Tips

- In App Review Notes, explicitly list every native feature
- Provide a demo account with credentials
- Apple reviewers spend ~2 minutes on an app — features must be immediately visible
- Apple has been raising the bar over time

---

## Recommended Strategy

### Two-Track Approach

**Android: TWA via Bubblewrap**

- Package the existing PWA as a Trusted Web Activity
- One-time setup, auto-updates when the website updates
- $25 one-time Google Play Console fee
- Near-zero ongoing maintenance
- Gets us into the Play Store with minimal effort

**iOS: Capacitor with bundled static build**

- Add a second SvelteKit build config using `adapter-static`
- Add biometric login, offline fallback, share sheet, and status bar integration
- Bundle the static build inside the app shell
- Consider Capgo ($12/mo) for OTA updates without re-submission
- $99/year Apple Developer Program

### Why Two Tracks Instead of Capacitor for Both?

For Android, TWA is genuinely zero-maintenance — the app updates when the website does. Capacitor Android still needs `cap sync` + rebuild cycles. The TWA advantage is real for a solo developer. That said, if maintaining a single native toolchain matters more, Capacitor for both is reasonable.

### Prerequisites Before Starting

1. **Add service workers** — We have none currently. Both tracks benefit from offline caching.
2. **Add `adapter-static` build config** — The iOS track needs this. Create a separate SvelteKit config or a build-time flag.
3. **Decouple API calls** — Mobile app can't use `+server.ts` routes in a static build. API calls need to go to the hosted Cloudflare API directly.
4. **Get a Mac** — iOS builds require Xcode, which only runs on macOS. Cloud Mac services (MacStadium) are an alternative at ~$50-80/mo.

---

## Cost Summary

| Approach | Year 1 | Ongoing/Year |
|---|---|---|
| PWA only (status quo) | $0 | $0 |
| + TWA for Android | $25 | $0 |
| + Capacitor for iOS | $124 ($99 + $25) | $99 |
| + Capgo OTA updates | $268 ($124 + $144) | $243 |
| Managed service (MobiLoud) | $2,500+ | $2,500+ |

The managed service option (MobiLoud, Median.co) handles wrapper building, native features, and Apple review for you. It trades money for time — potentially worth it if dealing with Xcode and Apple reviewers would pull focus from building the actual product. MobiLoud guarantees App Store approval.

---

## What This Means for Our Architecture

The good news: **we don't need to rewrite anything.** SvelteKit was the right choice. The path forward is:

1. Our existing web app stays exactly as-is on Cloudflare
2. We add a static build target alongside the existing adapter-cloudflare build
3. Capacitor wraps that static build with native chrome
4. The mobile app calls our existing Cloudflare API for all data
5. Bubblewrap packages our existing PWA for Android

The core architecture doesn't change. We're adding a distribution layer, not rebuilding.

---

## Next Steps (When Ready to Implement)

1. Implement service workers for offline support (benefits both web and mobile)
2. Create `adapter-static` build configuration for mobile builds
3. Set up Bubblewrap TWA for Android (quickest win)
4. Initialize Capacitor project for iOS
5. Add native plugins (biometrics, share, status bar, offline fallback)
6. Register for Apple Developer Program ($99)
7. Build and submit to both stores

---

## References

- [Ionic: Cross-Platform SvelteKit & Capacitor](https://ionic.io/blog/cross-platform-sveltekit-capacitor-application-yes-its-possible)
- [Stanislav Khromov: SvelteKit + Capacitor App](https://khromov.se/how-i-published-a-gratitude-journaling-app-for-ios-and-android-using-sveltekit-and-capacitor/)
- [Bryan Hogan: Web to Native with SvelteKit & Capacitor](https://bryanhogan.com/blog/web-to-app-sveltekit-capacitor)
- [Capgo: SvelteKit + Capacitor Tutorial](https://capgo.app/blog/creating-mobile-apps-with-sveltekit-and-capacitor/)
- [Tauri v2 SvelteKit Frontend Guide](https://v2.tauri.app/start/frontend/sveltekit/)
- [Google: Adding Your PWA to Google Play](https://developers.google.com/codelabs/pwa-in-play)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [Apple Developer Forums: Guideline 4.2](https://developer.apple.com/forums/thread/806726)
- [MobiLoud: WebView App Store Guidelines](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Median: Will Apple Approve My WebView App?](https://median.co/blog/will-apple-approve-my-webview-app)
