# Payment Received Email

**Trigger:** `invoice.paid` webhook (successful recurring payment)
**Purpose:** Confirm payment, provide receipt, reinforce value
**Timing:** Immediately after successful charge

---

## Subject Line

```
Receipt for your Grove subscription
```

## Preview Text

```
Thanks for being part of Grove.
```

## Body

```markdown
Hi {{name}},

Just confirming we received your payment. Thanks for sticking with us.

---

## Receipt

**Amount:** ${{amount}}
**Date:** {{payment_date}}
**Plan:** {{plan_name}} ({{interval}}ly)
**Next payment:** {{next_payment_date}}

**Invoice ID:** {{invoice_id}}

---

## Your blog

**{{blog_url}}**

Still there, still yours. Keep writing when you feel like it.

---

If you need a formal receipt for taxes or expenses, you can download one from your billing page:

{{manage_subscription_url}}

Questions? Just reply.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{amount}}` | Formatted amount | `8.00` |
| `{{payment_date}}` | Date of charge | `January 15, 2025` |
| `{{plan_name}}` | Their plan tier | `Seedling` |
| `{{interval}}` | `month` or `year` | `month` |
| `{{next_payment_date}}` | Next billing date | `February 15, 2025` |
| `{{invoice_id}}` | Stripe invoice ID | `in_1abc123...` |
| `{{blog_url}}` | Their blog URL | `https://jordan.grove.place` |
| `{{manage_subscription_url}}` | Billing management link | `https://plant.grove.place/billing` |

## Design Notes

- Short and transactional—people just want confirmation
- Receipt info clearly formatted for quick scanning
- "Still there, still yours" is a quiet value reminder
- Link to downloadable receipt for business users
- No upselling, no "check out these features!"
- Warmth in brevity
