#!/bin/bash
# واجهة الرازي على طراز ويندوز، وأدوات الأداء وتثبيت البرامج (مشترك بين الإصدارين)
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y tint2 jgmenu xcape xdotool mtpaint xfce4-screenshooter gdebi flatpak \
  plymouth plymouth-label falkon zram-tools earlyoom arandr lxappearance libnotify-bin xdg-user-dirs libfuse2t64 \
  fonts-liberation2 fonts-crosextra-carlito fonts-crosextra-caladea
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-DESKTOP
