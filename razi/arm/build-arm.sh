#!/bin/bash
# بناء الرازي لمعالجات ARM: حزمة الهاتف وصورة Raspberry Pi
#   sudo ./build-arm.sh common   النظام المشترك (يتطلب qemu-user-static على الأجهزة غير ARM)
#   sudo ./build-arm.sh phone    مُثبِّت الهاتف + نسخة الهاتف الجاهزة
#   sudo ./build-arm.sh pi       صورة بطاقة الذاكرة لـ Raspberry Pi
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HERE/work}; OUT=${OUT:-$HERE/out}; VER=1.2
BASE=ubuntu-base-24.04.5-base-arm64.tar.gz
mkdir -p $WORK $OUT
mounts()  { for m in proc sys dev dev/pts; do mountpoint -q $1/$m || mount --bind /$m $1/$m; done; }
umounts() { for m in dev/pts dev sys proc; do mountpoint -q $1/$m && umount -l $1/$m || true; done; }
inchroot(){ local C=$1; shift; mounts $C; rm -f $C/etc/resolv.conf; cp /etc/resolv.conf $C/etc/resolv.conf; cp "$1" $C/tmp/; chroot $C /bin/bash /tmp/$(basename "$1"); rm -f $C/tmp/$(basename "$1"); }
overlay() { local C=$1 ED=$2
  cp -r --remove-destination $HERE/overlay/. $C/
  cp -r --remove-destination $HERE/overlay-$ED/. $C/
  rm -rf $C/boot-firmware
  cp $HERE/scripts/finalize.sh $C/usr/share/razi/finalize.sh
  mounts $C; chroot $C /bin/bash /usr/share/razi/finalize.sh || true
}

stage_common() {
  C=$WORK/common
  [ -f $WORK/$BASE ] || curl -fL -o $WORK/$BASE https://cdimage.ubuntu.com/ubuntu-base/releases/24.04/release/$BASE
  [ -d $C/usr ] || { mkdir -p $C; tar -xzf $WORK/$BASE -C $C; }
  inchroot $C $HERE/scripts/arm-common.sh; umounts $C
}

stage_phone() {
  C=$WORK/phone; umounts $C; mountpoint -q $C/dev && exit 1
  [ -n "${RESUME:-}" ] || { rm -rf --one-file-system $C; cp -a $WORK/common $C; }
  inchroot $C $HERE/scripts/arm-phone.sh
  cp $HERE/scripts/ar-pkgs.txt $C/tmp/; inchroot $C $HERE/scripts/arm-locale.sh
  overlay $C phone
  chroot $C /bin/bash -c 'cp -rn /etc/skel/. /root/; mkdir -p "/root/ذاكرة الهاتف"; apt-get clean; rm -rf /var/lib/apt/lists/* /tmp/* /var/log/*.log'
  umounts $C
  rm -f $C/etc/resolv.conf
  # مُثبِّت الهاتف: سكربت واحد يحمل معه هوية الرازي
  T=$(mktemp -d); mkdir -p $T/usr/share/razi
  cp -r $HERE/overlay/. $HERE/overlay-phone/. $T/; rm -rf $T/boot-firmware
  cp $HERE/scripts/finalize.sh $T/usr/share/razi/finalize.sh
  { cat $HERE/android/installer.head.sh; echo "__RAZI_OVERLAY__"; tar -C $T -cz . | base64 -w 76; } > $OUT/razi-android.sh
  chmod +x $OUT/razi-android.sh; rm -rf $T
  # النسخة الجاهزة (للتثبيت دون إنترنت وأسرع بكثير)
  tar -C $C --exclude='./dev/*' --exclude='./proc/*' --exclude='./sys/*' -cf - . | xz -T0 -6 > $OUT/razi-$VER-phone-arm64.tar.xz
  ls -lh $OUT
}

stage_pi() {
  C=$WORK/pi; umounts $C; mountpoint -q $C/dev && exit 1
  [ -n "${RESUME:-}" ] || { rm -rf --one-file-system $C; cp -a $WORK/common $C; }
  mkdir -p $C/boot/firmware
  export FK_MACHINE="Raspberry Pi 4 Model B"
  inchroot $C $HERE/scripts/arm-pi.sh
  cp $HERE/scripts/ar-pkgs.txt $C/tmp/; inchroot $C $HERE/scripts/arm-locale.sh
  overlay $C pi
  chroot $C /bin/bash -c 'set -e
    echo "razi:razi" | chpasswd
    usermod -aG sudo,video,audio,netdev,plugdev,input,render razi 2>/dev/null || usermod -aG sudo,video,audio razi
    systemctl enable razi-firstboot.service zramswap.service earlyoom.service NetworkManager.service >/dev/null 2>&1 || true
    systemctl set-default multi-user.target
    echo razi > /etc/hostname; printf "127.0.0.1 localhost\n127.0.1.1 razi\n" > /etc/hosts
    # مجلد المستخدم بإعدادات الرازي (سطح المكتب العربي، التشغيل التلقائي للواجهة)
    cp -rT /etc/skel /home/razi; chown -R razi:razi /home/razi
    # إزالة رسائل الترحيب النصية الخاصة بالتوزيعة الأم
    rm -f /etc/update-motd.d/* /etc/legal
    sed -i "s|^اسم المستخدم في الوضع الحي:.*|اسم المستخدم: ‏razi‏ وكلمة المرور: ‏razi‏ (غيّرها بالأمر ‏passwd‏ في الطرفية)\$INSTALL_HINT\"|" /usr/local/bin/razi-welcome
    rm -rf /var/lib/apt/lists/* /tmp/* /var/log/*.log'
  # يكتب NetworkManager إعدادات DNS بنفسه
  umounts $C; rm -f $C/etc/resolv.conf; : > $C/etc/resolv.conf
  # قسم الإقلاع: البرمجيات الثابتة والنواة وشجرة الأجهزة
  B=$WORK/pi-boot; rm -rf $B; mkdir -p $B
  # تُنقل ملفات الإقلاع إلى قسم FAT (يُركَّب لاحقًا على /boot/firmware) فلا تتكرر في قسم النظام
  mv $C/boot/firmware/* $B/
  find $B -name '*.bak' -delete
  # نسخة initrd داخل قسم النظام مكررة (الإقلاع يستخدم نسخة قسم FAT)، وحذفها يبقي الصورة أصغر من 500 ميجابايت
  rm -f $C/boot/initrd.img-*
  cp $HERE/overlay-pi/boot-firmware/* $B/
  # صورة البطاقة: قسم إقلاع FAT32 (512MB) + قسم نظام ext4
  IMG=$OUT/razi-$VER-raspberrypi-arm64.img
  USED=$(du -sm --exclude=./boot/firmware $C | cut -f1); SIZE=$((USED * 125 / 100 + 600))
  rm -f $IMG; truncate -s ${SIZE}M $IMG
  parted -s $IMG mklabel msdos mkpart primary fat32 1MiB 513MiB set 1 boot on set 1 lba on mkpart primary ext4 513MiB 100%
  mkfs.vfat -F 32 -n system-boot --offset 2048 $IMG $((512*1024)) >/dev/null
  mcopy -s -i $IMG@@1M $B/* ::/
  P2=$((513*1024*1024)); truncate -s $((SIZE*1024*1024 - P2)) $WORK/root.ext4
  mkfs.ext4 -q -F -L writable -d $C $WORK/root.ext4
  dd if=$WORK/root.ext4 of=$IMG bs=1M seek=513 conv=notrunc status=none; rm -f $WORK/root.ext4
  xz -T0 -9e -k -f $IMG
  sha256sum $IMG.xz > $IMG.xz.sha256
  ls -lh $OUT
}

case ${1:-all} in
  common) stage_common;; phone) stage_phone;; pi) stage_pi;;
  all) stage_common; stage_phone; stage_pi;;
esac
