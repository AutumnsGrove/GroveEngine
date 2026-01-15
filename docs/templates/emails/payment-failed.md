# Payment Failed Email

**Trigger:** `invoice.payment_failed` webhook
**Purpose:** Alert user, provide clear next steps, no panic
**Timing:** Immediately after failed charge

---

## Subject Line

```
Issue with your Grove payment
```

## Preview Text

```
Your card didn't go through—here's how to fix it.
```

## Body

```markdown
Hey {{name}},

We tried to charge your card for your Grove subscription, but it didn't go through. These things happen: expired cards, bank holds, cosmic rays.

**Your tree is still standing.** Nothing's been taken down. You have time to sort this out.

---

## What to do

Update your payment method here:

{{update_payment_url}}

Once updated, we'll retry the charge automatically. If you run into any trouble, just reply to this email.

---

## What happens if not fixed

If we can't process payment after a few attempts over the next {{grace_period_days}} days, your subscription will be paused. Your blog will still exist—your content isn't going anywhere—but it won't be publicly visible until the billing is sorted.

You can always reactivate by updating your payment info. No penalty, no "restart fee," no drama.

---

## Need to cancel instead?

If you'd rather not continue, you can cancel here: {{manage_subscription_url}}

No hard feelings. Your content is always exportable.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{update_payment_url}}` | Direct link to update card | `https://plant.grove.place/billing/update` |
| `{{grace_period_days}}` | Days before suspension | `7` |
| `{{manage_subscription_url}}` | Billing management link | `https://plant.grove.place/billing` |

## Design Notes

- Lead with reassurance—blog is still live
- "cosmic rays" keeps it light without being flippant
- Clear action: one link to fix it
- Honest about consequences but not threatening
- Emphasize: content is never deleted, just paused
- Easy cancel path—don't trap people
- No guilt-tripping ("we're so sad to see you go")
