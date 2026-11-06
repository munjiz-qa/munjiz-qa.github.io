#!/bin/bash
# دعم العتاد الموسع: البرمجيات الثابتة، معالجات Intel/AMD، كل مشغلات الرسوميات والإدخال، الشبكات اللاسلكية، البلوتوث، الصوت الحديث، الطابعات
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y linux-firmware intel-microcode amd64-microcode iucode-tool \
  xserver-xorg-video-all xserver-xorg-input-all xserver-xorg-input-wacom libgl1-mesa-dri mesa-vulkan-drivers \
  wpasupplicant wireless-regdb iw rfkill modemmanager usb-modeswitch \
  bluez blueman pipewire pipewire-pulse pipewire-alsa wireplumber pavucontrol \
  cups cups-filters system-config-printer printer-driver-gutenprint printer-driver-hpcups hplip-data \
  sane-utils libsane1 pciutils usbutils lshw dmidecode smartmontools \
  mtp-tools gvfs-backends gvfs-fuse btrfs-progs xfsprogs hfsprogs
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-HARDWARE
# حذف برمجيات الخوادم وARM (مستبعدة أيضًا من التحديثات عبر /etc/dpkg/dpkg.cfg.d/razi-slim)
cd /usr/lib/firmware && rm -rf mellanox mrvl/prestera netronome qed dpaa2 cxgb4 liquidio qcom
