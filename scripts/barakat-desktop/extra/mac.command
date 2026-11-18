#!/bin/bash
# Barakat - offline desktop launcher (macOS)
DIR="$(cd "$(dirname "$0")" && pwd)"
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
if [ "$(uname -m)" = "arm64" ]; then B="$DIR/bin/barakat-mac-arm64"; else B="$DIR/bin/barakat-mac-intel"; fi
chmod +x "$B" 2>/dev/null
nohup "$B" >/dev/null 2>&1 &
echo "Barakat is running. You can close this window."
exit 0
