#!/bin/bash
# ترجمات الواجهة العربية: الصورة الأساسية تحذف كل ملفات الترجمة، فنُبقي العربية والإنجليزية فقط ونعيد تثبيت ما يحملها
set -e
export DEBIAN_FRONTEND=noninteractive
cat > /etc/dpkg/dpkg.cfg.d/excludes <<'X'
# الرازي: بلا صفحات دليل ولا توثيق، والترجمات العربية فقط
path-exclude=/usr/share/man/*
path-exclude=/usr/share/doc/*
path-include=/usr/share/doc/*/copyright
path-exclude=/usr/share/locale/*/LC_MESSAGES/*.mo
path-include=/usr/share/locale/ar/LC_MESSAGES/*.mo
X
apt-get update
P=$(dpkg-query -W -f='${Package}\n' | grep -Fxf /tmp/ar-pkgs.txt || true)
[ -n "$P" ] && apt-get install -y --reinstall $P
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-LOCALE
