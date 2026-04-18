#!/bin/bash
# Add issues: write permission to all deploy workflows

# Worker workflows
for file in \
  .github/workflows/deploy-amber-worker.yml \
  .github/workflows/deploy-aspen.yml \
  .github/workflows/deploy-billing-api.yml \
  .github/workflows/deploy-billing.yml \
  .github/workflows/deploy-clearing.yml \
  .github/workflows/deploy-durable-objects.yml \
  .github/workflows/deploy-email-catchup.yml \
  .github/workflows/deploy-email-render.yml \
  .github/workflows/deploy-engine.yml \
  .github/workflows/deploy-forage.yml \
  .github/workflows/deploy-heartwood.yml \
  .github/workflows/deploy-ivy.yml \
  .github/workflows/deploy-landing.yml \
  .github/workflows/deploy-lumen.yml \
  .github/workflows/deploy-meadow-poller.yml \
  .github/workflows/deploy-og-worker.yml \
  .github/workflows/deploy-onboarding.yml \
  .github/workflows/deploy-patina.yml \
  .github/workflows/deploy-plant.yml \
  .github/workflows/deploy-reverie-exec.yml \
  .github/workflows/deploy-reverie.yml \
  .github/workflows/deploy-router.yml \
  .github/workflows/deploy-subscription-digest.yml \
  .github/workflows/deploy-timeline-sync.yml \
  .github/workflows/deploy-vista-collector.yml \
  .github/workflows/deploy-warden.yml \
  .github/workflows/deploy-webhook-cleanup.yml \
  .github/workflows/deploy-zephyr.yml \
  .github/workflows/deploy-amber.yml \
  .github/workflows/deploy-domains.yml \
  .github/workflows/deploy-login.yml \
  .github/workflows/deploy-meadow.yml \
  .github/workflows/deploy-terrarium.yml
do
  if [ -f "$file" ]; then
    # Check if it already has issues: write
    if grep -q "issues: write" "$file"; then
      echo "✓ $file already has issues: write"
    else
      # Add issues: write after deployments: write
      sed -i '' '/deployments: write/a\
  issues: write
' "$file"
      echo "✓ Added issues: write to $file"
    fi
  fi
done

echo ""
echo "Done! Updated $(ls .github/workflows/deploy-*.yml | wc -l | tr -d ' ') deploy workflows"
