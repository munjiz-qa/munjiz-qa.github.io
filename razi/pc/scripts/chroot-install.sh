#!/bin/bash
# يُنفَّذ داخل الـ chroot: تثبيت حزم نظام الرازي
set -e
export DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8
cat > /etc/apt/sources.list <<SRC
deb http://archive.ubuntu.com/ubuntu noble main universe
deb http://archive.ubuntu.com/ubuntu noble-updates main universe
deb http://archive.ubuntu.com/ubuntu noble-security main universe
SRC
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
cat > /etc/apt/apt.conf.d/99razi <<APT
APT::Install-Recommends "false";
APT::Install-Suggests "false";
APT
apt-get update
KVER=$(apt-cache depends linux-image-generic | awk '/Depends: linux-image-[0-9]/{print $2; exit}')
echo "KERNEL: $KVER"
apt-get install -y $KVER ${KVER/image/modules-extra} casper initramfs-tools \
  systemd-sysv dbus dbus-x11 sudo locales kbd console-setup keyboard-configuration tzdata \
  xserver-xorg-core xserver-xorg-video-fbdev xserver-xorg-video-vesa xserver-xorg-video-qxl \
  xserver-xorg-video-intel xserver-xorg-video-ati xserver-xorg-video-nouveau xserver-xorg-video-amdgpu \
  xserver-xorg-input-libinput xinit x11-xserver-utils x11-xkb-utils xdg-utils \
  icewm pcmanfm lxterminal mousepad galculator xarchiver lxtask yad gpicview \
  network-manager network-manager-gnome alsa-utils volumeicon-alsa \
  fonts-dejavu-core fonts-hosny-amiri language-pack-ar-base language-pack-gnome-ar-base \
  adwaita-icon-theme-full gnome-themes-extra nano less iproute2 iputils-ping wget ca-certificates \
  ntfs-3g dosfstools exfatprogs gvfs udisks2 policykit-1 lxpolkit
locale-gen ar_EG.UTF-8 en_US.UTF-8
update-locale LANG=ar_EG.UTF-8 LANGUAGE=ar:en
ln -sf /usr/share/zoneinfo/Africa/Cairo /etc/localtime; echo Africa/Cairo > /etc/timezone
apt-get clean; rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /var/cache/apt/*.bin
rm -f /usr/sbin/policy-rc.d
echo OK-INSTALL
# إزالة رسائل الترحيب الافتراضية لأوبونتو من الطرفية
chmod -x /etc/update-motd.d/* 2>/dev/null || true
