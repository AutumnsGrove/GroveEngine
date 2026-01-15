# Welcome Email

**Trigger:** Account created successfully
**Purpose:** Warm welcome, essential links, set expectations
**Timing:** Immediate after signup

---

## Subject Line

```
Welcome, Wanderer
```

## Preview Text

```
Your tree is planted. Time to take root.
```

## Body

```markdown
Welcome, Wanderer.

Your blog is live and waiting for you. You've planted your tree in the grove.

**Your blog:** {{blog_url}}
**Your admin panel:** {{blog_url}}/admin

That's really all you need to get started. To sign in, just enter your email and we'll send you a 6-digit code. No password to remember. (If you're on mobile and the code is finicky, there's also a magic link in each email.)

---

## A few things worth knowing

**Your content is yours.** Everything you write belongs to you. You can export it anytime, in formats that work anywhere. We don't lock you in.

**Your readers' privacy matters.** We don't track your visitors. No analytics scripts following people around the web. Just your words, their attention.

**We're here if you need us.** Reply to this email or visit {{support_url}}. Real person on the other end, usually within a day.

---

Over the next few weeks, I'll send a handful of emails with tips on getting the most out of Grove. Nothing salesy, just genuinely useful stuff. You can unsubscribe anytime.

For now, maybe write something. Doesn't have to be perfect. Doesn't have to be long. Just yours.

Welcome to the grove, Wanderer. Time to take root.

—Autumn
(The Wayfinder)
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name or first name | `Jordan` |
| `{{blog_url}}` | Full blog URL | `https://jordan.grove.place` |
| `{{support_url}}` | Help center URL | `https://grove.place/help` |

## Design Notes

- Warm but not overwhelming. Don't info-dump
- Lead with the practical (here's your blog, here's how to log in)
- Values woven in naturally, not as a manifesto
- Personal sign-off from Autumn (founder touch)
- Acknowledge the follow-up emails upfront so they don't feel spammy
- End with an invitation to write, not a demand
