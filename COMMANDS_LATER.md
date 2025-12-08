# GroveEngine Commands to Run Later

> **Note:** These commands require local machine access with wrangler CLI.
> Run these after GroveAuth is fully deployed and configured.

---

## GroveAuth Integration Setup

### 1. Set GroveAuth Client Credentials

For each GroveEngine site (landing, domains, etc.), set the GroveAuth client credentials:

```bash
# For the domains site
cd domains
wrangler secret put GROVEAUTH_CLIENT_ID    # Enter: domains
wrangler secret put GROVEAUTH_CLIENT_SECRET # Enter: your-client-secret

# For the landing site (if using auth)
cd ../landing
wrangler secret put GROVEAUTH_CLIENT_ID
wrangler secret put GROVEAUTH_CLIENT_SECRET
```

### 2. Update wrangler.toml Variables

Add these to each site's `wrangler.toml`:

```toml
[vars]
GROVEAUTH_URL = "https://auth.grove.place"
GROVEAUTH_REDIRECT_URI = "https://domains.grove.place/auth/callback"
```

---

## Database Migrations

### Run Post Limit Migration (After GroveAuth Integration)

If you need to sync post counts from GroveEngine to GroveAuth:

```bash
# Get current post counts per tenant
wrangler d1 execute grove-engine-db --remote --command="
SELECT t.id as tenant_id, t.email, COUNT(p.id) as post_count
FROM tenants t
LEFT JOIN posts p ON p.tenant_id = t.id AND p.status = 'published'
GROUP BY t.id;
"
```

---

## Verify GroveAuth Integration

### Test Login Flow

1. Navigate to `https://domains.grove.place/auth/login`
2. Should redirect to `https://auth.grove.place/login`
3. After authentication, should redirect back to `/auth/callback`
4. Should create session and redirect to `/admin`

### Test Subscription API

```bash
# Check if subscription endpoint works
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://auth.grove.place/subscription

# Check if user can create post
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://auth.grove.place/subscription/USER_ID/can-post
```

---

## Rollback Instructions

If GroveAuth integration causes issues, you can temporarily disable it:

1. Keep the existing magic code auth routes (`/api/auth/*`)
2. Update login page to use magic code flow instead of GroveAuth redirect
3. The hooks.server.ts still checks for local sessions, so existing sessions will work

---

## Client Registration in GroveAuth

Make sure these clients are registered in GroveAuth:

```bash
# Domain Finder
wrangler d1 execute groveauth --remote --command="
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'domains-grove-place',
  'Domain Finder',
  'domains',
  -- Generate: echo -n 'your-secret' | openssl dgst -sha256
  'YOUR_HASHED_SECRET',
  '[\"https://domains.grove.place/auth/callback\", \"http://localhost:5174/auth/callback\"]',
  '[\"https://domains.grove.place\", \"http://localhost:5174\"]'
)
ON CONFLICT(client_id) DO UPDATE SET
  redirect_uris = excluded.redirect_uris,
  allowed_origins = excluded.allowed_origins;
"
```

---

*Last updated: 2025-12-08*
