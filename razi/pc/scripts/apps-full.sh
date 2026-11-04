#!/bin/bash
# حزم البرامج الجاهزة لإصدار «الرازي الكامل»
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  falkon claws-mail transmission-gtk \
  libreoffice-writer libreoffice-calc libreoffice-impress libreoffice-draw libreoffice-gtk3 libreoffice-l10n-ar hunspell-ar \
  atril simple-scan \
  gimp xfce4-screenshooter \
  vlc vlc-l10n audacious gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  gcompris-qt \
  geany python3 python3-tk git \
  synaptic gnome-disk-utility gparted hardinfo \
  calamares calamares-settings-ubuntu-common rsync
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-APPS
