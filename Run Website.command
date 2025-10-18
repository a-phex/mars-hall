#!/bin/bash
# ─────────────────────────────────────────────
# Local web server launcher for Ash’s website
# ─────────────────────────────────────────────

PORT=5500

echo ""
echo "🌐 Starting local web server on port $PORT…"
echo "Press Ctrl+C in this window to stop."
echo ""

# Navigate to the folder where this script is located
cd "$(dirname "$0")"

# Open default browser automatically
open "http://localhost:$PORT"

# Start the built-in Python web server
python3 -m http.server $PORT
