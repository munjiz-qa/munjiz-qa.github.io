#!/bin/bash
# يُنفَّذ داخل نظام ARM64: الحزم المشتركة بين إصدار الهاتف وإصدار Raspberry Pi
set -e
export DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8
cat > /etc/apt/sources.list <<SRC
deb http://ports.ubuntu.com/ubuntu-ports noble main universe
deb http://ports.ubuntu.com/ubuntu-ports noble-updates main universe
deb http://ports.ubuntu.com/ubuntu-ports noble-security main universe
SRC
rm -f /etc/apt/sources.list.d/ubuntu.sources
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
printf 'APT::Install-Recommends "false";\nAPT::Install-Suggests "false";\n' > /etc/apt/apt.conf.d/99razi
# الصور المصغّرة لا تحتاج التوثيق ولا صفحات الدليل
# الترجمات العربية فقط، بلا صفحات دليل ولا توثيق
printf 'path-exclude=/usr/share/man/*\npath-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/locale/*/LC_MESSAGES/*.mo\npath-include=/usr/share/locale/ar/LC_MESSAGES/*.mo\n' > /etc/dpkg/dpkg.cfg.d/excludes
apt-get update
apt-get -y upgrade
apt-get install -y sudo locales tzdata dbus dbus-x11 xdg-utils xdg-user-dirs x11-xserver-utils x11-xkb-utils x11-utils \
  icewm tint2 jgmenu xcape xdotool pcmanfm lxterminal mousepad galculator xarchiver lxtask yad gpicview mtpaint \
  libnotify-bin lxappearance xfce4-screenshooter libfm-modules gvfs \
  fonts-dejavu-core fonts-hosny-amiri fonts-liberation2 language-pack-ar-base language-pack-gnome-ar-base \
  humanity-icon-theme adwaita-icon-theme gnome-themes-extra \
  nano less wget curl ca-certificates iproute2 iputils-ping unzip zip xz-utils procps
locale-gen ar_EG.UTF-8 en_US.UTF-8
update-locale LANG=ar_EG.UTF-8 LANGUAGE=ar:en
ln -sf /usr/share/zoneinfo/Africa/Cairo /etc/localtime; echo Africa/Cairo > /etc/timezone
id razi >/dev/null 2>&1 || useradd -m -s /bin/bash -c Razi -G sudo razi
echo 'razi ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/razi; chmod 440 /etc/sudoers.d/razi
echo OK-COMMON
