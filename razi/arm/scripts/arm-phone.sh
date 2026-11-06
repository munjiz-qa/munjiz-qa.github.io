#!/bin/bash
# إضافات إصدار الهاتف: خادم عرض افتراضي يُفتح من متصفح الهاتف
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y tigervnc-standalone-server tigervnc-tools websockify librsvg2-common
apt-get clean; rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin
# لا توجد خدمات نظام داخل الهاتف
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
dpkg-divert --local --rename --add /usr/bin/systemctl >/dev/null 2>&1 || true
printf '#!/bin/sh\nexit 0\n' > /usr/bin/systemctl; chmod +x /usr/bin/systemctl
echo OK-PHONE
