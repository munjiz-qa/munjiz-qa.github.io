#!/bin/bash
# يُنفَّذ داخل النظام بعد نسخ الطبقات: يبني قائمة ابدأ ولوحة التحكم من البرامج الموجودة فعلًا، ويضبط الخدمات
set -e
have(){ local c="$1"; c="${c#sudo -E }"; command -v "${c%% *}" >/dev/null 2>&1; }
S=/usr/share/razi/start
: > $S/menu.csv
while IFS= read -r line; do
  case "$line" in ''|'^'*) echo "$line" >> $S/menu.csv; continue;; esac
  cmd=$(echo "$line" | cut -d, -f2)
  case "$cmd" in ^*|systemctl*) echo "$line" >> $S/menu.csv; continue;; esac
  have "$cmd" && echo "$line" >> $S/menu.csv
done < $S/menu.all.csv
# حذف الأقسام الفارغة (مثل «برامج ويندوز» في الإصدار الخفيف)
for t in $(grep -o '\^checkout([a-z]*)' $S/menu.csv | sed 's/.*(\(.*\))/\1/'); do
  n=$(awk -v t="^tag($t)" '$0==t{f=1;next} f&&/^$/{exit} f{n++} END{print n+0}' $S/menu.csv)
  [ "$n" -gt 0 ] || sed -i "/\^checkout($t)/d" $S/menu.csv
done
# علامة اتجاه في أول كل عنوان لتُحاذى النصوص العربية يمينًا في القائمة
sed -i -e 's/^\([^^,][^,]*\),/\xe2\x80\x8e\1,/' -e 's/^\^sep(\(..*\))/^sep(\xe2\x80\x8e\1)/' $S/menu.csv
for f in /usr/share/razi/control-panel/*.desktop /etc/skel/سطح\ المكتب/*.desktop /usr/share/razi/start/pin-*.desktop; do
  [ -f "$f" ] || continue
  cmd=$(sed -n 's/^Exec=//p' "$f")
  have "$cmd" || rm -f "$f"
done
# أزرار الشريط المثبّتة غير الموجودة تُزال من إعداد الشريط
for f in browser writer; do [ -f $S/pin-$f.desktop ] || sed -i "/pin-$f.desktop/d" /etc/xdg/tint2/razi.tint2rc; done
# هوية الرازي: حماية ملفات التعريف من الاستبدال عند تحديث النظام
for f in /etc/os-release /usr/lib/os-release /etc/lsb-release /etc/issue /etc/issue.net; do
  dpkg-divert --local --no-rename --divert "$f.distrib" --add "$f" >/dev/null 2>&1 || true
done
[ -L /etc/os-release ] || cp /etc/os-release /usr/lib/os-release
# شاشة الإقلاع
if [ -f /usr/share/plymouth/themes/razi/razi.plymouth ]; then
  update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth /usr/share/plymouth/themes/razi/razi.plymouth 300 >/dev/null
  update-alternatives --set default.plymouth /usr/share/plymouth/themes/razi/razi.plymouth >/dev/null
fi
fc-cache -f >/dev/null
systemctl enable zramswap.service earlyoom.service >/dev/null 2>&1 || true
systemctl mask systemd-networkd-wait-online.service NetworkManager-wait-online.service e2scrub_reap.service >/dev/null 2>&1 || true
update-desktop-database -q /usr/share/applications || true
echo OK-FINALIZE
