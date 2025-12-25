# Trial Ending Soon Email

**Trigger:** `customer.subscription.trial_will_end` webhook (3 days before trial ends)
**Purpose:** Friendly heads-up, set expectations, offer easy out
**Timing:** 3 days before trial end

---

## Subject Line

```
Your trial ends {{trial_end_day}}
```

## Preview Text

```
Just a heads-up about your Grove subscription.
```

## Body

```markdown
Hi {{name}},

Quick heads-up: your Grove trial ends on **{{trial_end_date}}**.

After that, your **{{plan_name}}** subscription will begin at **${{amount}}/{{interval}}**. Your card on file will be charged automatically.

---

## What stays the same

Everything. Your blog stays live, your posts stay published, your readers don't notice a thing. No interruption, no migration, no extra steps.

---

## If you'd rather not continue

No hard feelings—really. You can cancel anytime before {{trial_end_date}} and you won't be charged.

**To cancel:** {{manage_subscription_url}}

If you cancel, your blog will remain accessible through the end of your trial period, and you can export all your content anytime.

---

## Questions?

Just reply to this email. Happy to help with anything.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{trial_end_day}}` | Day of week | `Thursday` |
| `{{trial_end_date}}` | Full formatted date | `Thursday, January 15, 2025` |
| `{{plan_name}}` | Their plan tier | `Seedling` |
| `{{amount}}` | Price without cents if whole | `8` |
| `{{interval}}` | Billing frequency | `month` |
| `{{manage_subscription_url}}` | Link to subscription management | `https://plant.grove.place/billing` |

## Design Notes

- Lead with the practical info (when, how much)
- Reassurance that nothing breaks—continuity is the point
- Make cancellation genuinely easy and guilt-free
- No manipulation, no "last chance!" urgency
- Short and scannable—this is a utility email
- Personal sign-off maintains warmth without overselling
