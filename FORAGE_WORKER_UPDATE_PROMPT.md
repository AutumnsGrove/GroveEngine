# Forage Worker Update: DeepSeek v3.2 via OpenRouter Exclusively

## Context

The GroveEngine frontend for Forage has been updated to reflect that Forage now uses **DeepSeek v3.2 exclusively via OpenRouter** for zero-data-retention compliance. This aligns with Grove's AI usage policy: open source models on ZDR-provider hosted infrastructure only.

This document contains instructions for updating the Forage worker repository to match these changes.

## Critical Model Identifier

**IMPORTANT**: On OpenRouter, you MUST use the explicit model identifier:

```
deepseek/deepseek-v3.2
```

**DO NOT USE** `deepseek/deepseek-chat` - that defaults to DeepSeek v3 on OpenRouter, NOT v3.2.

When using the DeepSeek platform directly, `deepseek-chat` serves v3.2, but on OpenRouter it defaults to v3. We need the explicit version identifier.

## Changes Needed in Forage Worker

### 1. Model Configuration

Update any model configuration constants/files to:
- Remove all references to multiple providers (Claude, Anthropic, Kimi, Llama, etc.)
- Lock both DRIVER and SWARM models to `deepseek/deepseek-v3.2`
- Update provider to always be `openrouter`
- Remove any provider selection logic

**Example:**
```typescript
export const MODELS = {
  DRIVER: "deepseek/deepseek-v3.2",
  SWARM: "deepseek/deepseek-v3.2",
} as const;

export const PROVIDER = "openrouter" as const;
```

### 2. API Endpoints

Update the `/api/search` endpoint (or equivalent) to:
- Remove `driver_provider` and `swarm_provider` parameters (or hardcode to "openrouter")
- Remove validation for multiple providers
- Hardcode provider to OpenRouter
- Ensure model strings are `deepseek/deepseek-v3.2`

### 3. Inference Client / AI Calls

Update any inference client or AI calling code to:
- Remove provider switching logic
- Always use OpenRouter endpoint
- Always use `deepseek/deepseek-v3.2` model identifier
- Remove fallback provider logic
- Update error messages to reflect single provider

### 4. Documentation

Update README.md and any other docs to:
- Replace "multi-provider AI swarm" with "DeepSeek v3.2 via OpenRouter"
- Remove references to Claude, Anthropic, Kimi, Llama 4
- Add ZDR compliance messaging
- Update feature descriptions

### 5. Environment Variables

Update environment variable documentation:
- Remove multiple API key requirements (ANTHROPIC_API_KEY, etc.)
- Keep only OPENROUTER_API_KEY
- Mark old keys as deprecated/legacy
- Update example .env files

### 6. Pricing Calculations

Update token pricing to DeepSeek v3.2 via OpenRouter rates:
- Input: $0.28 per million tokens
- Output: $0.42 per million tokens

Remove pricing tables for other models.

### 7. Comments and Code Documentation

Search for and update:
- All comments mentioning multiple providers
- Code comments referencing other models
- Function docstrings
- Type definitions that reference provider options

### 8. Worker Response Format

Ensure worker responses don't expose:
- Provider selection options
- Model switching capabilities
- Multiple provider status

### 9. Error Handling

Update error messages to:
- Remove provider fallback messaging
- Reference DeepSeek v3.2 specifically
- Include ZDR compliance context where relevant

## Testing Checklist

After making changes, verify:

- [ ] Worker accepts requests with provider="openrouter"
- [ ] Worker uses `deepseek/deepseek-v3.2` model identifier
- [ ] Driver and swarm both use DeepSeek v3.2
- [ ] No requests are made to other providers
- [ ] Token usage tracking works correctly
- [ ] Cost estimation matches DeepSeek v3.2 pricing
- [ ] Error messages are accurate
- [ ] Documentation is consistent

## Deployment Coordination

This worker update must be deployed **before** or **at the same time as** the GroveEngine frontend changes to avoid:
- Frontend sending provider="openrouter" to a worker that doesn't support it
- Model identifier mismatch
- Breaking the Forage service

## Files to Update (Probable Locations)

Based on typical Cloudflare Worker structure:

- `src/config.ts` or `src/constants.ts` - Model configuration
- `src/api/search.ts` - Main search endpoint
- `src/lib/inference.ts` or `src/lib/ai-client.ts` - AI client
- `src/types.ts` - Type definitions
- `README.md` - Documentation
- `.env.example` - Environment variable examples
- `wrangler.toml` - Worker configuration comments
- `package.json` - Description field

## Search Patterns

Use these grep patterns to find references to update:

```bash
# Find provider-related code
grep -r "anthropic\|claude\|kimi\|llama" --include="*.ts" --include="*.js"

# Find model selection logic
grep -r "DRIVER_MODEL\|SWARM_MODEL\|model.*options" --include="*.ts"

# Find provider selection
grep -r "provider.*select\|choose.*provider\|validProviders" --include="*.ts"
```

## Expected Outcome

After this update:
- Forage worker exclusively uses DeepSeek v3.2 via OpenRouter
- No other providers are supported or referenced
- All documentation reflects single-model usage
- Code is simpler (no provider switching logic)
- Aligned with Grove's AI usage policy

---

**Generated:** 2026-01-01
**GroveEngine Commit:** 5ffa49a (fix: use correct OpenRouter model identifier for DeepSeek v3.2)
