#!/bin/bash
# إضافات إصدار Raspberry Pi: النواة والبرمجيات الثابتة والإقلاع والعتاد
set -e
export DEBIAN_FRONTEND=noninteractive
sed -i "s/main universe/main restricted universe multiverse/" /etc/apt/sources.list
apt-get update
apt-get install -y systemd-sysv initramfs-tools kbd console-setup keyboard-configuration \
  linux-image-raspi linux-firmware-raspi flash-kernel u-boot-tools \
  xserver-xorg-core xserver-xorg-video-fbdev xserver-xorg-input-libinput xinit libgl1-mesa-dri \
  network-manager network-manager-gnome wpasupplicant wireless-regdb iw rfkill \
  bluez blueman alsa-utils pipewire pipewire-pulse wireplumber pavucontrol volumeicon-alsa \
  policykit-1 lxpolkit udisks2 ntfs-3g exfatprogs dosfstools e2fsprogs zram-tools earlyoom \
  falkon openssh-client cloud-guest-utils librsvg2-common
# البرمجيات الثابتة: الإبقاء على ما يحتاجه Raspberry Pi ومحولات USB فقط
cd /usr/lib/firmware && find . -mindepth 1 -maxdepth 1 ! -name brcm ! -name cypress ! -name 'regulatory.db*' ! -name rtlwifi \
  ! -name rtl_nic ! -name rtl_bt ! -name rtw88 ! -name mediatek ! -name ath9k_htc ! -name 'rt2870.bin*' ! -name 'mt7601u.bin*' ! -name 'htc_*' \
  -exec rm -rf {} + ; cd /
apt-get purge -y 'linux-raspi' 'linux-headers-raspi' 'linux-raspi-headers-*' 'linux-headers-*-raspi' >/dev/null 2>&1 || true
apt-get -y autoremove --purge
# لغات محرك المتصفح: العربية والإنجليزية فقط (يحافظ على الصورة أصغر من 500 ميجابايت)
find /usr/share/qt5/translations/qtwebengine_locales -type f ! -name ar.pak ! -name en-US.pak -delete 2>/dev/null || true
find /usr/share/doc -type f ! -name copyright -delete
apt-get clean; rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin
echo OK-PI
