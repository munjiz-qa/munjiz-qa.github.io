#!/bin/bash
# خط بناء نظام الرازي: يُنتج ملف ISO حيًّا قابلًا للإقلاع (BIOS + UEFI)
# الاستخدام: sudo EDITION=lite ./build.sh   أو   sudo EDITION=full ./build.sh
# (يتطلب Ubuntu 24.04 مع اتصال بالإنترنت)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$HERE/work}
# الإصدار: lite (خفيف) أو full (كامل بالبرامج والمثبّت)
EDITION=${EDITION:-lite}
if [ "$EDITION" = full ]; then C=$WORK/chroot-full; else C=$WORK/chroot; fi
ISO=$WORK/iso-$EDITION
OUT=${OUT:-$HERE/out/razi-1.2-$EDITION-amd64.iso}
MIRROR=${MIRROR:-http://archive.ubuntu.com/ubuntu}
STAGE=${1:-all}

host_deps() {
  apt-get install -y debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin grub-common mtools fonts-noto-core
}
mounts()   { for m in proc sys dev dev/pts; do mountpoint -q $C/$m || mount --bind /$m $C/$m; done; }
umounts()  { for m in dev/pts dev sys proc; do mountpoint -q $C/$m && umount -l $C/$m || true; done; }

stage_base() {
  [ -d $C/usr ] || debootstrap --variant=minbase --arch=amd64 noble $C $MIRROR
  mounts
  cp /etc/resolv.conf $C/etc/resolv.conf
  cp $HERE/scripts/*.sh $C/tmp/
  chroot $C /bin/bash /tmp/chroot-install.sh
  chroot $C /bin/bash /tmp/hardware.sh
  chroot $C /bin/bash /tmp/desktop.sh
  if [ "$EDITION" = full ]; then
    chroot $C /bin/bash /tmp/apps-full.sh
    chroot $C /bin/bash /tmp/wine.sh
    chroot $C /bin/bash -c "DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y lightdm lightdm-gtk-greeter grub-pc-bin grub-efi-amd64-bin grub-efi-amd64-signed shim-signed grub2-common efibootmgr os-prober && apt-get clean && rm -rf /var/lib/apt/lists/*"
  fi
  rm -f $C/tmp/*.sh
  stage_kernel
}

# «نواة الرازي»: تُبنى أولًا بـ kernel/build-kernel.sh ثم تُثبَّت هنا بجانب النواة الموقّعة
stage_kernel() {
  local K=$HERE/../kernel/out
  ls $K/linux-image-*-razi_*.deb >/dev/null 2>&1 || { echo "تنبيه: لم تُبنَ نواة الرازي بعد (kernel/build-kernel.sh)"; return 0; }
  mounts; cp $K/linux-image-*-razi_*.deb $C/tmp/
  chroot $C /bin/bash -c 'dpkg -i /tmp/linux-image-*-razi_*.deb && rm -f /tmp/linux-image-*.deb'
}

stage_overlay() {
  mounts
  cp -r --remove-destination $HERE/overlay/. $C/
  if [ "$EDITION" = full ]; then
    cp -r --remove-destination $HERE/overlay-full/. $C/
    rm -f $C/etc/systemd/system/getty@tty1.service.d/autologin.conf   # شاشة الدخول هنا LightDM
  fi
  cp $HERE/scripts/finalize.sh $C/tmp/ && chroot $C /bin/bash /tmp/finalize.sh && rm -f $C/tmp/finalize.sh
  rm -rf $C/etc/skel/.icewm/keys
  chroot $C /bin/bash -c '
    set -e
    systemctl enable getty@tty1.service >/dev/null 2>&1 || true
    systemctl mask systemd-networkd-wait-online.service >/dev/null 2>&1 || true
    update-initramfs -u -k all'
  umounts
}

# ISO هجين: BIOS عبر GRUB، و UEFI عبر shim و GRUB الموقّعين فيعمل مع الإقلاع الآمن (Secure Boot)
make_iso() {
  local W=$(mktemp -d) G=/usr/lib/grub/i386-pc
  mkdir -p $ISO/boot/grub/i386-pc $ISO/boot/grub/fonts $ISO/EFI/boot
  cp $G/*.mod $G/*.lst $ISO/boot/grub/i386-pc/
  cp /usr/share/grub/unicode.pf2 $ISO/boot/grub/fonts/
  printf 'search --no-floppy --set=root --file /.disk/info\nset prefix=($root)/boot/grub\n' > $W/early.cfg
  grub-mkimage -O i386-pc -p /boot/grub -c $W/early.cfg -o $W/core.img biosdisk iso9660 search normal configfile
  cat $G/cdboot.img $W/core.img > $ISO/boot/grub/i386-pc/eltorito.img
  cp $WORK/chroot-full/usr/lib/shim/shimx64.efi.signed.latest $ISO/EFI/boot/bootx64.efi
  cp $WORK/chroot-full/usr/lib/shim/mmx64.efi $ISO/EFI/boot/mmx64.efi
  cp $WORK/chroot-full/usr/lib/grub/x86_64-efi-signed/gcdx64.efi.signed $ISO/EFI/boot/grubx64.efi
  dd if=/dev/zero of=$W/efi.img bs=1M count=10 status=none
  mkfs.vfat -n RAZI_EFI $W/efi.img >/dev/null
  mmd -i $W/efi.img ::/EFI ::/EFI/boot
  mcopy -i $W/efi.img $ISO/EFI/boot/bootx64.efi $ISO/EFI/boot/mmx64.efi $ISO/EFI/boot/grubx64.efi ::/EFI/boot/
  xorriso -as mkisofs -r -V RAZI_1_2 -J -joliet-long -l -iso-level 3 \
    --grub2-mbr $G/boot_hybrid.img -partition_offset 16 --mbr-force-bootable \
    -append_partition 2 0xef $W/efi.img -appended_part_as_gpt \
    -c boot.catalog -b boot/grub/i386-pc/eltorito.img -no-emul-boot -boot-load-size 4 -boot-info-table --grub2-boot-info \
    -eltorito-alt-boot -e --interval:appended_partition_2:all:: -no-emul-boot \
    -o "$OUT" $ISO
  rm -rf "${W:?}"
}

stage_iso() {
  umounts
  rm -rf $ISO; mkdir -p $ISO/casper $ISO/boot/grub $ISO/.disk
  # نواة الرازي هي الافتراضية، والنواة الموقّعة احتياط للأجهزة التي تفعّل الإقلاع الآمن
  KQ=$(ls $C/boot/vmlinuz-*-razi | sort -V | tail -1); KG=$(ls $C/boot/vmlinuz-*-generic | sort -V | tail -1)
  cp $KQ $ISO/casper/vmlinuz; cp $C/boot/initrd.img-${KQ#*/vmlinuz-} $ISO/casper/initrd
  cp $KG $ISO/casper/vmlinuz-sb; cp $C/boot/initrd.img-${KG#*/vmlinuz-} $ISO/casper/initrd-sb
  echo "Razi OS 1.2 Inbiq - $EDITION amd64" > $ISO/.disk/info
  chroot $C dpkg-query -W --showformat='${Package} ${Version}\n' > $ISO/casper/filesystem.manifest
  rm -f $ISO/casper/filesystem.squashfs
  mksquashfs $C $ISO/casper/filesystem.squashfs -comp xz -b 1M -noappend \
    -e boot/initrd.img.old boot/vmlinuz.old
  printf $(du -sx --block-size=1 $C | cut -f1) > $ISO/casper/filesystem.size
  cp $HERE/branding/grub-bg.png $ISO/boot/grub/background.png
  cp $HERE/branding/grub.cfg $ISO/boot/grub/grub.cfg
  mkdir -p "$(dirname "$OUT")"
  make_iso
  sha256sum "$OUT" > "$OUT.sha256"
  ls -lh "$OUT"
}

case $STAGE in
  deps) host_deps;;
  base) stage_base;;
  kernel) stage_kernel;;
  overlay) stage_overlay;;
  iso) stage_iso;;
  all) stage_base; stage_overlay; stage_iso;;
esac
