#!/bin/bash
# Debug script to test Mail Service connectivity

echo "🔍 Testing Mail Service Endpoint..."
echo ""

MAIL_SERVICE_URL="https://mail-services-ten.vercel.app"
ENDPOINT="${MAIL_SERVICE_URL}/send-invite"

echo "Testing: $ENDPOINT"
echo ""

# Test if the endpoint exists and is reachable
curl -X OPTIONS "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -v 2>&1 | head -20

echo ""
echo "---"
echo ""

# Try a test POST request
echo "Sending test POST request..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "inviteLink": "https://example.com/accept-invite?token=test-token"
  }' \
  -v

echo ""
echo "✅ Test complete"
