#!/bin/bash
# منجز على الكمبيوتر (ماك ولينكس): يشغّل منجز من هذا الجهاز على http://localhost:8765
# Munjiz desktop launcher for Mac and Linux. Keep this window open while you use Munjiz.
cd "$(dirname "$0")" || exit 1
SITE="$(pwd)/site"; PORT=8765; URL="http://localhost:$PORT/desktop.html"
openurl(){ if command -v open >/dev/null 2>&1 && [ "$(uname)" = "Darwin" ]; then open "$1"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 & else echo "Open in your browser: $1"; fi; }
if [ ! -f "$SITE/index.html" ]; then echo "Munjiz files were not found in $SITE"; read -r -p "Press Enter to close" _; exit 1; fi
if (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then echo "Munjiz is already running."; openurl "$URL"; exit 0; fi
PY=""
for c in python3 python; do
  p="$(command -v $c 2>/dev/null)" || continue
  # on a Mac without developer tools, /usr/bin/python3 is only an installer stub
  if [ "$(uname)" = "Darwin" ] && [ "$p" = "/usr/bin/$c" ] && ! xcode-select -p >/dev/null 2>&1; then continue; fi
  if "$p" -c 'import sys; sys.exit(0 if sys.version_info[0]==3 else 1)' >/dev/null 2>&1; then PY="$p"; break; fi
done
echo ""; echo "  Munjiz Business Services - desktop"; echo "  Running at http://localhost:$PORT"; echo "  Keep this window open while you use Munjiz. Close it to stop."; echo ""
if [ -n "$PY" ]; then
  "$PY" -m http.server "$PORT" --bind 127.0.0.1 --directory "$SITE" >/dev/null 2>&1 & SRV=$!
elif command -v ruby >/dev/null 2>&1; then
  (cd "$SITE" && exec ruby -run -e httpd . -p "$PORT" -b 127.0.0.1 >/dev/null 2>&1) & SRV=$!
elif command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -File "$(pwd)/tools/server.ps1" -Root "$SITE" -NoBrowser & SRV=$!
else
  echo "No built-in web server was found on this computer."
  echo "Use the app install instead: https://munjiz-qa.github.io/desktop.html"
  openurl "https://munjiz-qa.github.io/desktop.html"; exit 1
fi
trap 'kill $SRV 2>/dev/null' EXIT INT TERM
for _ in $(seq 1 40); do (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null && break; sleep 0.25; done
openurl "$URL"
wait $SRV
