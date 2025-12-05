# API Usage Guide

## Overview

This guide covers respectful and ethical usage of public and open APIs. Emphasis is on REST APIs using bash and Python, with proper authentication, rate limiting, and error handling.

**Core Principle:** Public APIs are shared resources. Use them politely, respect rate limits, and always authenticate securely.

**Quick Start:** Use `curl` for bash, `requests` for Python, and always store API keys in `secrets.json`.

---

## When to Use This Guide

- **Integrating external APIs** (GitHub, weather, public datasets)
- **Building API clients or wrappers**
- **Fetching data from third-party services**
- **Before making API requests in scripts**
- **When handling API authentication and secrets**

---

## Core Principles

### 1. Respectful Usage

**Rate Limiting:**
- Always respect API rate limits documented by the provider
- Implement exponential backoff for retries
- Cache responses when appropriate
- Monitor your usage regularly

**Best Practices:**
- Read the API's terms of service and acceptable use policy
- Use the least frequent polling interval that meets your needs
- Implement caching to reduce redundant requests
- Add delays between bulk operations

### 2. Secure Authentication

**DO:**
- Store API keys in `secrets.json` (never commit to git)
- Use environment variable fallbacks for CI/CD
- Rotate keys regularly
- Use read-only tokens when write access isn't needed

**DON'T:**
- Hardcode API keys in scripts
- Log API keys or tokens
- Share keys via email or chat
- Commit secrets to version control

---

## Authentication Patterns

### Setup secrets.json

```bash
# Create secrets file
cat > secrets.json << 'EOF'
{
  "github_token": "ghp_your_token_here",
  "openweather_api_key": "your_key_here",
  "api_ninjas_key": "your_key_here",
  "comment": "Add your API keys here. Never commit this file."
}
EOF

# Ensure it's in .gitignore
echo "secrets.json" >> .gitignore
```

### Loading Secrets (Bash)

```bash
#!/bin/bash

# Load API key from secrets.json
load_secret() {
  local key="$1"
  local secret_file="secrets.json"

  if [[ -f "$secret_file" ]]; then
    python3 -c "import json; print(json.load(open('$secret_file'))['$key'])" 2>/dev/null
  else
    echo ""
  fi
}

# Get API key with environment fallback
API_KEY=$(load_secret "github_token")
API_KEY=${API_KEY:-$GITHUB_TOKEN}

if [[ -z "$API_KEY" ]]; then
  echo "Error: No API key found in secrets.json or GITHUB_TOKEN env var"
  exit 1
fi
```

### Loading Secrets (Python)

```python
import os
import json
from pathlib import Path

def load_secrets():
    """Load API keys from secrets.json."""
    secrets_path = Path(__file__).parent / "secrets.json"
    try:
        with open(secrets_path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# Load secrets
secrets = load_secrets()

# Get API key with fallback
API_KEY = secrets.get("github_token", os.getenv("GITHUB_TOKEN", ""))

if not API_KEY:
    raise ValueError("No API key found in secrets.json or environment")
```

**See:** [secrets_management.md](secrets_management.md) for complete patterns.

---

## REST API Usage

### Basic GET Request (Bash)

```bash
#!/bin/bash

# Load API key
API_KEY=$(python3 -c "import json; print(json.load(open('secrets.json'))['github_token'])")

# Make request with authentication
curl -s -H "Authorization: Bearer $API_KEY" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user" | jq '.'
```

### POST Request (Bash)

```bash
#!/bin/bash

API_KEY=$(python3 -c "import json; print(json.load(open('secrets.json'))['api_key'])")

# POST with JSON payload
curl -s -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","description":"Test repo"}' \
  "https://api.example.com/repos" | jq '.'
```

### Rate Limiting and Retries (Bash)

```bash
#!/bin/bash

# Function to make API request with retry and rate limiting
api_request() {
  local url="$1"
  local max_retries=3
  local retry_count=0
  local wait_time=1

  while [[ $retry_count -lt $max_retries ]]; do
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $API_KEY" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    case $http_code in
      200)
        echo "$body"
        return 0
        ;;
      429)
        echo "Rate limited. Waiting ${wait_time}s..." >&2
        sleep $wait_time
        wait_time=$((wait_time * 2))
        retry_count=$((retry_count + 1))
        ;;
      *)
        echo "Error: HTTP $http_code" >&2
        return 1
        ;;
    esac
  done

  echo "Max retries exceeded" >&2
  return 1
}

# Usage
api_request "https://api.github.com/user/repos"
```

### Python Example with Requests

```python
import requests
import time
from typing import Optional

def load_api_key() -> str:
    """Load API key from secrets.json."""
    import json
    with open("secrets.json") as f:
        return json.load(f)["github_token"]

def api_request_with_retry(url: str, api_key: str, max_retries: int = 3) -> Optional[dict]:
    """Make API request with exponential backoff."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

    wait_time = 1
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
                wait_time *= 2
            else:
                print(f"Error: HTTP {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(wait_time)
                wait_time *= 2

    print("Max retries exceeded")
    return None

# Usage
api_key = load_api_key()
data = api_request_with_retry("https://api.github.com/user/repos", api_key)
if data:
    for repo in data:
        print(f"{repo['name']}: {repo['description']}")
```

---

## Quick API Examples

### 1. GitHub API (Public Repositories)

```bash
# No auth needed for public data
curl -s "https://api.github.com/users/github/repos" | jq '.[].name'

# With auth for higher rate limits
API_KEY=$(python3 -c "import json; print(json.load(open('secrets.json'))['github_token'])")
curl -s -H "Authorization: Bearer $API_KEY" \
  "https://api.github.com/user/repos" | jq '.[].full_name'
```

### 2. OpenWeatherMap API

```bash
# Get current weather
API_KEY=$(python3 -c "import json; print(json.load(open('secrets.json'))['openweather_api_key'])")
CITY="London"
curl -s "https://api.openweathermap.org/data/2.5/weather?q=$CITY&appid=$API_KEY&units=metric" \
  | jq '.main.temp, .weather[0].description'
```

### 3. Public REST API (No Auth)

```bash
# JSONPlaceholder - Free fake API for testing
curl -s "https://jsonplaceholder.typicode.com/posts/1" | jq '.title, .body'

# POST example
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Content","userId":1}' \
  "https://jsonplaceholder.typicode.com/posts" | jq '.'
```

---

## Rate Limiting Best Practices

### Check Rate Limit Status

Many APIs include rate limit info in response headers:

```bash
# GitHub example - check rate limit headers
curl -I -H "Authorization: Bearer $API_KEY" "https://api.github.com/user" | grep -i rate

# Output:
# x-ratelimit-limit: 5000
# x-ratelimit-remaining: 4999
# x-ratelimit-reset: 1234567890
```

### Implement Smart Delays

```bash
# Add delay between requests in loops
for repo in $(cat repos.txt); do
  curl -s "https://api.github.com/repos/$repo" | jq '.stars'
  sleep 1  # 1 second delay
done
```

### Use Conditional Requests

```bash
# ETags for caching - only fetch if changed
ETAG=$(curl -sI "https://api.github.com/users/github" | grep -i etag | cut -d' ' -f2)

# Next request with ETag
curl -s -H "If-None-Match: $ETAG" "https://api.github.com/users/github"
# Returns 304 Not Modified if unchanged
```

---

## Error Handling

### HTTP Status Codes

```bash
# Capture HTTP status code
response=$(curl -s -w "\n%{http_code}" "https://api.example.com/data")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

case $http_code in
  200) echo "Success: $body" ;;
  401) echo "Unauthorized - check API key" >&2 ;;
  403) echo "Forbidden - insufficient permissions" >&2 ;;
  404) echo "Not found" >&2 ;;
  429) echo "Rate limited - slow down" >&2 ;;
  5xx) echo "Server error - retry later" >&2 ;;
  *) echo "Unknown error: HTTP $http_code" >&2 ;;
esac
```

### Python Error Handling

```python
import requests

try:
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()  # Raises HTTPError for 4xx/5xx
    data = response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 429:
        print("Rate limited - waiting before retry")
    elif e.response.status_code == 401:
        print("Unauthorized - check API key")
    else:
        print(f"HTTP error: {e}")
except requests.exceptions.ConnectionError:
    print("Connection error - check network")
except requests.exceptions.Timeout:
    print("Request timeout - try again")
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
```

---

## Caching Strategies

### Simple File-Based Cache (Bash)

```bash
#!/bin/bash

# Cache API response to file with expiry
CACHE_FILE="/tmp/api_cache.json"
CACHE_TTL=3600  # 1 hour

fetch_with_cache() {
  local url="$1"

  # Check cache exists and is fresh
  if [[ -f "$CACHE_FILE" ]]; then
    local age=$(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE")))
    if [[ $age -lt $CACHE_TTL ]]; then
      cat "$CACHE_FILE"
      return 0
    fi
  fi

  # Fetch fresh data
  curl -s "$url" > "$CACHE_FILE"
  cat "$CACHE_FILE"
}

# Usage
fetch_with_cache "https://api.example.com/data"
```

---

## API Etiquette Checklist

### Before Making Requests

- [ ] Read the API documentation and terms of service
- [ ] Check rate limits and quotas
- [ ] Determine if authentication is required
- [ ] Identify required headers and parameters
- [ ] Plan caching strategy

### During Development

- [ ] Store API keys in `secrets.json`
- [ ] Implement rate limiting and backoff
- [ ] Add proper error handling
- [ ] Log requests for debugging (without sensitive data)
- [ ] Test with small datasets first

### In Production

- [ ] Monitor API usage and costs
- [ ] Set up alerts for rate limit warnings
- [ ] Implement circuit breakers for failed APIs
- [ ] Cache aggressively to reduce requests
- [ ] Respect retry-after headers
- [ ] Rotate API keys regularly

---

## Common Patterns

### Pagination

```bash
# Handle paginated responses
page=1
while true; do
  response=$(curl -s "https://api.example.com/items?page=$page&per_page=100")
  items=$(echo "$response" | jq '.items[]')

  [[ -z "$items" ]] && break

  echo "$items"
  ((page++))
  sleep 1  # Be respectful
done
```

### Bulk Operations with Rate Limiting

```bash
# Process items with rate limiting
RATE_LIMIT=10  # requests per minute
DELAY=$(echo "scale=2; 60 / $RATE_LIMIT" | bc)

cat items.txt | while read item; do
  curl -s "https://api.example.com/process/$item"
  sleep "$DELAY"
done
```

---

## Troubleshooting

### "401 Unauthorized"

- Verify API key is correct
- Check key hasn't expired
- Ensure proper header format: `Authorization: Bearer $TOKEN`
- Confirm key has required scopes/permissions

### "429 Too Many Requests"

- Implement exponential backoff
- Check rate limit headers
- Increase delays between requests
- Consider caching more aggressively

### "Connection Timeout"

- Increase timeout value
- Check network connectivity
- Verify API endpoint is reachable
- Consider retrying with exponential backoff

---

## Best Practices Summary

### DO ✅

1. **Read documentation first** - Understand limits and requirements
2. **Use secrets.json for keys** - Never hardcode credentials
3. **Implement retry logic** - Handle transient failures gracefully
4. **Cache responses** - Reduce redundant requests
5. **Monitor usage** - Track quotas and costs
6. **Respect rate limits** - Add delays and backoff
7. **Handle errors properly** - Check status codes and messages
8. **Use minimal scopes** - Request only needed permissions

### DON'T ❌

1. **Don't ignore rate limits** - You'll get blocked
2. **Don't hammer APIs** - Add reasonable delays
3. **Don't log API keys** - Security risk
4. **Don't skip error handling** - Leads to brittle scripts
5. **Don't use APIs without reading ToS** - Risk account suspension
6. **Don't make requests in tight loops** - Implement delays
7. **Don't ignore response headers** - They contain valuable info

---

## Related Guides

- **[secrets_management.md](secrets_management.md)** - Complete API key handling
- **[secrets_advanced.md](secrets_advanced.md)** - Advanced patterns and rotation
- **[cloudflare_guide.md](cloudflare_guide.md)** - Cloudflare API and Workers
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - API usage in CI/CD pipelines

---

## Resources

- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Public APIs Directory](https://github.com/public-apis/public-apis)
- [Rate Limiting Strategies](https://zuplo.com/blog/2025/01/06/10-best-practices-for-api-rate-limiting-in-2025)

---

*Last updated: 2025-11-24*
