#!/bin/bash
# تشغيل برامج ويندوز (‎.exe و‎.msi) في الإصدار الكامل
set -e
export DEBIAN_FRONTEND=noninteractive
dpkg --add-architecture i386
apt-get update
apt-get install -y wine wine64 wine32:i386
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-WINE
