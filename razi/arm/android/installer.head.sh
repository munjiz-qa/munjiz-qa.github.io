#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════
#  الرازي للهاتف — مُثبِّت بأمر واحد داخل تطبيق Termux
#  يعمل جنبًا إلى جنب مع أندرويد دون مسح أي شيء ودون صلاحيات الجذر (root)
#  الترخيص: GPL-3.0
# ═══════════════════════════════════════════════════════════════
set -e
RAZI_VER="1.2"
PREFIX=${PREFIX:-/data/data/com.termux/files/usr}
QHOME=${RAZI_HOME:-$HOME/.razi}
ROOT=$QHOME/rootfs
BASE_URL="https://cdimage.ubuntu.com/ubuntu-base/releases/24.04/release"
BASE_VER="24.04.5"
RAZI_PKGS="sudo locales tzdata dbus dbus-x11 xdg-utils xdg-user-dirs x11-xserver-utils x11-xkb-utils x11-utils icewm tint2 jgmenu xcape xdotool pcmanfm lxterminal mousepad galculator xarchiver lxtask yad gpicview mtpaint libnotify-bin lxappearance xfce4-screenshooter libfm-modules gvfs fonts-dejavu-core fonts-hosny-amiri fonts-liberation2 language-pack-ar-base language-pack-gnome-ar-base humanity-icon-theme adwaita-icon-theme gnome-themes-extra nano less wget curl ca-certificates iproute2 iputils-ping unzip zip xz-utils procps tigervnc-standalone-server tigervnc-tools websockify librsvg2-common"

c_t='\033[1;38;5;43m'; c_o='\033[1;32m'; c_e='\033[1;31m'; c_n='\033[0m'
say()  { printf "${c_t}◆${c_n} %s\n" "$*"; }
ok()   { printf "${c_o}✔${c_n} %s\n" "$*"; }
die()  { printf "${c_e}✖ %s${c_n}\n" "$*"; exit 1; }

banner() {
  printf "${c_t}"
  cat <<'B'

         ╭────╮
        ╱     │          الرازي
       ╱    ╭─┴─╮        علمٌ يُحيي كل جهاز
      ●     │▒▒▒│        الإصدار 1.2 — للهاتف
            ╰───╯

B
  printf "${c_n}"
}

detect_arch() {
  [ -n "$RAZI_ARCH" ] && { ARCH=$RAZI_ARCH; return; }
  case "$(uname -m)" in
    aarch64|arm64) ARCH=arm64 ;;
    armv7l|armv8l|arm*) ARCH=armhf ;;
    x86_64) ARCH=amd64 ;;
    *) die "معالج هذا الجهاز ($(uname -m)) غير مدعوم." ;;
  esac
}

termux_deps() {
  [ -n "$RAZI_TEST" ] && return 0
  [ -d /data/data/com.termux ] || die "شغّل هذا الملف من داخل تطبيق Termux."
  say "تجهيز الأدوات اللازمة (مرة واحدة)…"
  yes | pkg update -y >/dev/null 2>&1 || true
  pkg install -y proot tar xz-utils curl >/dev/null 2>&1 || pkg install -y proot tar xz-utils curl
  [ -d "$HOME/storage" ] || termux-setup-storage 2>/dev/null || true
  ok "الأدوات جاهزة"
}

# تشغيل أمر داخل نظام الرازي
qrun() {
  local binds=() f
  for f in loadavg stat uptime version vmstat; do
    [ -r /proc/$f ] || binds+=(-b "$QHOME/proc/$f:/proc/$f")
  done
  [ -d /sdcard ] && binds+=(-b "/sdcard:/root/ذاكرة الهاتف")
  [ -d "$PREFIX/tmp/.X11-unix" ] && binds+=(-b "$PREFIX/tmp/.X11-unix:/tmp/.X11-unix")
  unset LD_PRELOAD
  proot --link2symlink --kill-on-exit --sysvipc -L -0 -r "$ROOT" \
    -b /dev -b /proc -b /sys -b /dev/urandom:/dev/random -b "$ROOT/tmp:/dev/shm" "${binds[@]}" \
    -w /root /usr/bin/env -i HOME=/root USER=root TERM="${TERM:-xterm-256color}" \
    LANG=ar_EG.UTF-8 PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    TMPDIR=/tmp DEBIAN_FRONTEND=noninteractive "$@"
}

fake_proc() {
  mkdir -p "$QHOME/proc"
  echo "0.12 0.07 0.02 2/165 765" > "$QHOME/proc/loadavg"
  printf 'cpu  1957 0 2877 93280 262 342 254 87 0 0\ncpu0 31 0 226 12027 82 10 4 9 0 0\nintr 0\nctxt 0\nbtime 0\nprocesses 0\nprocs_running 1\nprocs_blocked 0\n' > "$QHOME/proc/stat"
  echo "284684.56 513853.46" > "$QHOME/proc/uptime"
  echo "Linux version 6.8.0-razi (razi@razi) #1 SMP PREEMPT_DYNAMIC" > "$QHOME/proc/version"
  printf 'nr_free_pages 136970\nnr_inactive_anon 0\nnr_active_anon 0\n' > "$QHOME/proc/vmstat"
}

install_rootfs() {
  mkdir -p "$ROOT" "$QHOME/cache"
  local local_img=""
  for d in /sdcard/Download "$HOME/storage/downloads" "$(dirname "$0")"; do
    for f in "$d"/razi-*-phone-$ARCH.tar.xz; do [ -f "$f" ] && local_img="$f"; done
  done
  if [ -n "$local_img" ]; then
    say "وُجدت نسخة الرازي الجاهزة: $(basename "$local_img")"
    say "فكّ النظام (دقائق قليلة)…"
    proot --link2symlink -0 tar -xJf "$local_img" -C "$ROOT" --exclude='dev/*' 2>/dev/null || true
    [ -x "$ROOT/usr/bin/icewm" ] || die "تعذّر فكّ الملف. نزّله مرة أخرى ثم أعد المحاولة."
    PREBUILT=1
  else
    local tb="ubuntu-base-$BASE_VER-base-$ARCH.tar.gz"
    say "تنزيل النظام الأساسي (نحو 30 ميجابايت)…"
    curl -fL --retry 3 -o "$QHOME/cache/$tb" "$BASE_URL/$tb" || die "تعذّر التنزيل. تحقق من الإنترنت ثم أعد المحاولة."
    say "فكّ النظام الأساسي…"
    proot --link2symlink -0 tar -xzf "$QHOME/cache/$tb" -C "$ROOT" --exclude='dev/*' 2>/dev/null || true
    [ -x "$ROOT/bin/bash" ] || die "تعذّر فكّ النظام الأساسي."
    rm -f "$QHOME/cache/$tb"
    PREBUILT=0
  fi
  mkdir -p "$ROOT/tmp" "$ROOT/root/ذاكرة الهاتف" "$ROOT/dev"; chmod 1777 "$ROOT/tmp"
  rm -f "$ROOT/etc/resolv.conf"
  printf 'nameserver 1.1.1.1\nnameserver 8.8.8.8\n' > "$ROOT/etc/resolv.conf"
  printf '127.0.0.1 localhost razi\n::1 localhost ip6-localhost\n' > "$ROOT/etc/hosts"
  echo razi > "$ROOT/etc/hostname"
  # مجموعات أندرويد كي لا تظهر تحذيرات
  for g in $(id -G 2>/dev/null); do
    grep -q ":$g:" "$ROOT/etc/group" || echo "aid_$g:x:$g:root" >> "$ROOT/etc/group"
  done
}

install_packages() {
  [ "$PREBUILT" = 1 ] && return 0
  say "تنزيل برامج الرازي وتثبيتها (10 إلى 20 دقيقة حسب سرعة الإنترنت)…"
  cat > "$ROOT/tmp/razi-setup.sh" <<'SETUP'
set -e
export DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8
case "$(dpkg --print-architecture)" in amd64) M=http://archive.ubuntu.com/ubuntu ;; *) M=http://ports.ubuntu.com/ubuntu-ports ;; esac
rm -f /etc/apt/sources.list.d/ubuntu.sources
# لا توجد خدمات نظام داخل الهاتف: نمنع محاولات تشغيلها أثناء التثبيت
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
dpkg-divert --local --rename --add /usr/bin/systemctl >/dev/null 2>&1 || true
printf '#!/bin/sh\nexit 0\n' > /usr/bin/systemctl; chmod +x /usr/bin/systemctl
printf 'deb %s noble main universe\ndeb %s noble-updates main universe\ndeb %s noble-security main universe\n' $M $M $M > /etc/apt/sources.list
printf 'APT::Install-Recommends "false";\nAPT::Install-Suggests "false";\nAPT::Sandbox::User "root";\n' > /etc/apt/apt.conf.d/99razi
# الترجمات العربية فقط، بلا صفحات دليل ولا توثيق
printf 'path-exclude=/usr/share/man/*\npath-exclude=/usr/share/doc/*\npath-include=/usr/share/doc/*/copyright\npath-exclude=/usr/share/locale/*/LC_MESSAGES/*.mo\npath-include=/usr/share/locale/ar/LC_MESSAGES/*.mo\n' > /etc/dpkg/dpkg.cfg.d/excludes
apt-get update
apt-get -y upgrade
apt-get install -y PKGLIST
locale-gen ar_EG.UTF-8 en_US.UTF-8
update-locale LANG=ar_EG.UTF-8 LANGUAGE=ar:en
ln -sf /usr/share/zoneinfo/Africa/Cairo /etc/localtime; echo Africa/Cairo > /etc/timezone
apt-get clean; rm -rf /var/lib/apt/lists/*
echo OK-SETUP
SETUP
  sed -i "s|PKGLIST|$RAZI_PKGS|" "$ROOT/tmp/razi-setup.sh"
  qrun /bin/bash /tmp/razi-setup.sh || die "توقف التثبيت. أعد تشغيل الأمر نفسه وسيكمل من حيث توقف."
  ok "تم تثبيت البرامج"
}

apply_identity() {
  [ "$PREBUILT" = 1 ] && return 0
  say "تطبيق هوية الرازي وواجهته العربية…"
  sed -n '/^__RAZI_OVERLAY__$/,$p' "$SELF" | tail -n +2 | base64 -d | tar -xz -C "$ROOT" 2>/dev/null \
    || die "ملف التثبيت ناقص. نزّله مرة أخرى."
  qrun /bin/bash -c 'bash /usr/share/razi/finalize.sh >/dev/null 2>&1; cp -rn /etc/skel/. /root/; mkdir -p "/root/ذاكرة الهاتف"; chmod +x /usr/local/bin/*; echo ok' >/dev/null
  ok "تم تطبيق الهوية"
}

install_launcher() {
  cp "$SELF" "$PREFIX/bin/razi"; chmod +x "$PREFIX/bin/razi"
  ok "أُنشئ الأمر: razi"
}

# ─────────────── أوامر التشغيل اليومية ───────────────
need_installed() { [ -x "$ROOT/usr/bin/icewm" ] || die "الرازي غير مثبّت بعد. شغّل ملف التثبيت أولًا."; }

cmd_stop() {
  pkill -f 'Xtigervnc :1' 2>/dev/null || true
  pkill -f 'websockify.*6080' 2>/dev/null || true
  pkill -f 'icewm-session' 2>/dev/null || true
  pkill -f 'termux-x11 :0' 2>/dev/null || true
  command -v termux-wake-unlock >/dev/null && termux-wake-unlock 2>/dev/null || true
  ok "أُوقف الرازي"
}

cmd_start() {
  need_installed
  local geom=${1:-$(cat "$QHOME/screen" 2>/dev/null || echo 1560x720)}
  echo "$geom" > "$QHOME/screen"
  cmd_stop >/dev/null 2>&1 || true
  command -v termux-wake-lock >/dev/null && termux-wake-lock 2>/dev/null || true
  say "تشغيل الرازي بدقة $geom …"
  qrun /usr/local/bin/razi-session browser "$geom" &
  local pid=$!
  for i in $(seq 1 60); do
    curl -s -o /dev/null http://127.0.0.1:6080/razi.html && break; sleep 0.5
  done
  ok "سطح المكتب جاهز على: http://127.0.0.1:6080/razi.html"
  command -v termux-open-url >/dev/null && termux-open-url "http://127.0.0.1:6080/razi.html" || true
  echo
  echo "  • يفتح سطح المكتب في متصفح الهاتف تلقائيًا (أدِر الهاتف أفقيًا)."
  echo "  • اترك Termux يعمل في الخلفية. للإيقاف: اضغط Ctrl+C أو اكتب: razi stop"
  wait $pid 2>/dev/null || true
}

cmd_x11() {
  need_installed
  command -v termux-x11 >/dev/null || { say "تثبيت دعم Termux:X11…"; pkg install -y x11-repo >/dev/null 2>&1; pkg install -y termux-x11-nightly >/dev/null 2>&1 || die "تعذّر تثبيت termux-x11."; }
  cmd_stop >/dev/null 2>&1 || true
  command -v termux-wake-lock >/dev/null && termux-wake-lock 2>/dev/null || true
  termux-x11 :0 >/dev/null 2>&1 &
  sleep 2
  am start -n com.termux.x11/com.termux.x11.MainActivity >/dev/null 2>&1 || say "افتح تطبيق Termux:X11 يدويًا."
  ok "يعمل الرازي الآن في تطبيق Termux:X11. للإيقاف: razi stop"
  qrun /usr/local/bin/razi-session x11
}

cmd_help() {
  banner
  cat <<'H'
  الأوامر:
    razi               تشغيل سطح المكتب في متصفح الهاتف
    razi 1920x1080     التشغيل بدقة أخرى (تُحفظ للمرات القادمة)
    razi x11           التشغيل في تطبيق Termux:X11 (أسرع وأدق)
    razi stop          الإيقاف
    razi shell         طرفية داخل الرازي (لتثبيت البرامج بـ apt)
    razi update        تحديث النظام والبرامج
    razi remove        حذف الرازي من الهاتف
H
}

cmd_remove() {
  printf "سيُحذف الرازي وكل ملفاته داخل Termux (ملفات ذاكرة الهاتف لن تُمس). اكتب نعم للتأكيد: "
  read -r a; [ "$a" = "نعم" ] || [ "$a" = "yes" ] || { echo "أُلغي الحذف."; exit 0; }
  cmd_stop >/dev/null 2>&1 || true
  chmod -R u+w "$QHOME" 2>/dev/null; rm -rf "$QHOME" "$PREFIX/bin/razi"
  ok "حُذف الرازي."
}

cmd_install() {
  banner
  detect_arch
  termux_deps
  fake_proc
  if [ -x "$ROOT/usr/bin/icewm" ] && [ -z "$RAZI_FORCE" ]; then
    ok "الرازي مثبّت بالفعل."
  else
    install_rootfs
    install_packages
    apply_identity
  fi
  install_launcher
  echo
  ok "اكتمل التثبيت. لتشغيل الرازي اكتب:  razi"
  echo
}

SELF=$(readlink -f "$0")
fake_proc 2>/dev/null || true
case "$(basename "$0")" in
  razi)
    case "$1" in
      ""|start) [ $# -gt 0 ] && shift; cmd_start "$@" ;;
      [0-9]*x[0-9]*) cmd_start "$1" ;;
      x11) cmd_x11 ;;
      stop) cmd_stop ;;
      shell) need_installed; qrun /bin/bash -l ;;
      update) need_installed; qrun /bin/bash -c 'apt-get update && apt-get -y upgrade && apt-get clean' ;;
      remove|uninstall) cmd_remove ;;
      install) cmd_install ;;
      *) cmd_help ;;
    esac ;;
  *) cmd_install ;;
esac
exit 0
