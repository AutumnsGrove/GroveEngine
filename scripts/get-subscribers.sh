#!/bin/bash

# Get Subscriber Emails Script
# Fetches all active email subscribers and copies them to clipboard
# Usage: ./scripts/get-subscribers.sh

echo "📧 Fetching subscriber emails from grove-engine-db..."
echo ""

# Query the database for active subscribers
RESULT=$(wrangler d1 execute grove-engine-db \
  --remote \
  --command "SELECT email FROM email_signups WHERE unsubscribed_at IS NULL ORDER BY created_at DESC" \
  2>/dev/null)

# Extract just the email addresses and join with commas
EMAILS=$(echo "$RESULT" | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | tr '\n' ', ' | sed 's/, $//')

if [ -z "$EMAILS" ]; then
  echo "❌ No subscribers found or error querying database"
  exit 1
fi

# Count subscribers
COUNT=$(echo "$EMAILS" | grep -o ',' | wc -l)
COUNT=$((COUNT + 1))

echo "✅ Found $COUNT active subscriber(s)!"
echo ""
echo "📋 Emails (comma-separated):"
echo "$EMAILS"
echo ""

# Copy to clipboard (works on macOS, Linux, and WSL)
if command -v pbcopy &> /dev/null; then
  # macOS
  echo "$EMAILS" | pbcopy
  echo "✨ Copied to clipboard! Ready to paste into your email BCC field."
elif command -v xclip &> /dev/null; then
  # Linux with xclip
  echo "$EMAILS" | xclip -selection clipboard
  echo "✨ Copied to clipboard! Ready to paste into your email BCC field."
elif command -v xsel &> /dev/null; then
  # Linux with xsel
  echo "$EMAILS" | xsel --clipboard
  echo "✨ Copied to clipboard! Ready to paste into your email BCC field."
elif [ -n "$WSL_DISTRO_NAME" ]; then
  # WSL (Windows Subsystem for Linux)
  echo "$EMAILS" | clip.exe
  echo "✨ Copied to clipboard! Ready to paste into your email BCC field."
else
  echo "⚠️  Could not detect clipboard tool. Please manually copy the emails above."
fi

echo ""
echo "🚀 Time to send that launch email!"
