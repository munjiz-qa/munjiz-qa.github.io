#!/bin/bash
# بناء «نواة الرازي»: لينكس 6.8 من مصدر أوبونتو المفتوح، باسم الرازي وشعار إقلاعه وإعداداته
# الاستخدام (على Ubuntu 24.04):  sudo ./build-kernel.sh
# الناتج: حزم linux-image-6.8.12-razi و linux-headers في مجلد kernel/out
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
apt-get install -y linux-source-6.8.0 build-essential bc bison flex libssl-dev libelf-dev dwarves zstd cpio kmod debhelper rsync
mkdir -p $HERE/work $HERE/out; cd $HERE/work
[ -d linux-source-6.8.0 ] || tar xjf /usr/src/linux-source-6.8.0/linux-source-6.8.0.tar.bz2
cd linux-source-6.8.0
cp $HERE/config-6.8.12-razi .config                                   # الإعدادات: LOCALVERSION=-razi و DEFAULT_HOSTNAME=razi
cp $HERE/logo_linux_clut224.ppm drivers/video/logo/logo_linux_clut224.ppm   # شعار الرازي عند الإقلاع
make olddefconfig
make -j"$(nproc)" bindeb-pkg KDEB_PKGVERSION=1.2-razi KBUILD_BUILD_USER=munjiz KBUILD_BUILD_HOST=razi-os
mv ../linux-image-6.8.12-razi_*.deb ../linux-headers-6.8.12-razi_*.deb $HERE/out/
ls -lh $HERE/out
