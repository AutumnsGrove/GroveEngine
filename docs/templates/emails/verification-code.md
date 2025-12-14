# Verification Code Email

**Trigger:** Login attempt (magic link authentication)
**Purpose:** Deliver 6-digit verification code
**Timing:** Immediate

---

## Subject Line

```
Your Grove login code: {{code}}
```

## Preview Text

```
This code expires in 10 minutes.
```

## Body

```markdown
# {{code}}

Enter this code to sign in to Grove.

This code expires in 10 minutes. If you didn't request this, you can safely ignore this email—no one can access your account without this code.

---

Signing in to: **{{blog_name}}**
{{blog_url}}/admin

—Grove
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{code}}` | 6-digit verification code | `847293` |
| `{{blog_name}}` | Name of the blog | `Autumn's Grove` |
| `{{blog_url}}` | Full blog URL | `https://autumnsgrove.com` |

## Design Notes

- The code should be the largest, most prominent element
- Keep the email extremely short—this is a utility email
- No marketing, no fluff, just the code
- Include the blog URL so users know which account they're signing into (helpful for people with multiple blogs)
