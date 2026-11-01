#!/usr/bin/env bash
# يبني حزمة «منجز على الكمبيوتر»: dist/munjiz-desktop.zip
# تحتوي ملفات منجز وحدها (الجذر و en و assets و data) مع ملفات التشغيل من pc/
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist/munjiz-desktop; rm -rf dist; mkdir -p "$OUT/site" "$OUT/tools"
cp ./*.html manifest.webmanifest crm.webmanifest sw.js "$OUT/site/"
cp -r en assets data "$OUT/site/"
cp pc/server.ps1 "$OUT/tools/"
cp pc/Start-Munjiz-Windows.bat pc/Start-Munjiz-Mac.command pc/Start-Munjiz-Linux.sh pc/README.txt "$OUT/"
chmod +x "$OUT"/*.command "$OUT"/*.sh
date -u +"%Y-%m-%d %H:%M UTC" > "$OUT/site/version.txt"
(cd dist && zip -qr -X munjiz-desktop.zip munjiz-desktop)
ls -la dist/munjiz-desktop.zip
