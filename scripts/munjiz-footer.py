#!/usr/bin/env python3
"""منجز: تذييل موحّد لكل صفحات منجز (عربي وإنجليزي). شغّله بعد تعديل الروابط هنا:
   python3 scripts/munjiz-footer.py
يستبدل وسم <footer>…</footer> في كل صفحة من صفحات منجز فقط، ولا يلمس مجلدات المنصات الأخرى."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html','about.html','articles.html','article-menu-prices.html','article-renewals.html','call.html',
         'checklist.html','contract.html','desktop.html','legal.html','login.html','management.html','partners.html',
         'portal.html','privacy.html','restaurants.html','standards.html']
LOGO = ('<svg width="34" height="34" viewBox="0 0 80 80" aria-hidden="true"><rect x="5" y="5" width="70" height="70" rx="18" '
        'fill="none" stroke="#b8923a" stroke-width="5"/><path d="M22 42l12 12 24-28" fill="none" stroke="currentColor" '
        'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>')
T = {
 'ar': dict(name='منجز لخدمات الأعمال', legal='منجز لخدمات الأعمال ذ.م.م', city='لوسيل، قطر', tag='معاملاتك أسهل، أسرع، أقل.',
   lead='نتولّى معاملاتك الحكومية اليومية إلكترونياً، بأتعاب معلنة ومتابعة حتى تتسلّم الإيصال.',
   wa='واتساب', cols=[
    ('الخدمات', [('الخدمات والأسعار','#prices'),('الباقات الشهرية','#packages'),('احسب التكلفة','#estimate'),('مُجهِّز المستندات','checklist.html'),('تابع معاملتك','#track'),('اطلب خدمة','#request')]),
    ('حلول الأعمال', [('للمطاعم والمقاهي','restaurants.html'),('المتابعة الشهرية','management.html'),('الشركاء والإحالات','partners.html'),('مزادات قطر','#auctions'),('أعلن معنا','#ent=AD')]),
    ('منجز', [('تعرّف إلى منجز','about.html'),('كيف نعمل','#how'),('معايير خدمتنا','standards.html'),('مقالات وأدلة','articles.html'),('الأسئلة الشائعة','#faq'),('احجز مكالمة','call.html')]),
    ('الدخول', [('حسابي (العملاء)','portal.html'),('الإدارة والموظفون','@crm'),('منجز على الكمبيوتر','desktop.html'),('ثبّت التطبيق على جوالك','@install')]),
   ], privacy='سياسة الخصوصية', legaldocs='المستندات القانونية', other='English', note='الأسعار سارية لعام 2026 وقد تُحدَّث. القرار النهائي ومدة المعاملة يعودان إلى الجهة الحكومية المختصة.',
   rights='جميع الحقوق محفوظة', aria='روابط الموقع'),
 'en': dict(name='Munjiz Business Services', legal='Munjiz Business Services LLC', city='Lusail, Qatar', tag='Easier, faster, lower-cost transactions.',
   lead='We handle your everyday government transactions online, with published fees and follow-up until you receive the receipt.',
   wa='WhatsApp', cols=[
    ('Services', [('Services and prices','#prices'),('Monthly packages','#packages'),('Cost calculator','#estimate'),('Document checklist','checklist.html'),('Track a transaction','#track'),('Request a service','#request')]),
    ('Business solutions', [('Restaurants &amp; cafés','restaurants.html'),('Monthly follow-up','management.html'),('Partners and referrals','partners.html'),('Qatar auctions','#auctions'),('Advertise with us','#ent=AD')]),
    ('Munjiz', [('About Munjiz','about.html'),('How we work','#how'),('Our service standards','standards.html'),('Articles','articles.html'),('FAQ','#faq'),('Book a call','call.html')]),
    ('Sign in', [('My account (clients)','portal.html'),('Management and staff','@crm'),('Munjiz on your computer','desktop.html'),('Install the app on your phone','@install')]),
   ], privacy='Privacy policy', legaldocs='Legal documents', other='العربية', note='Prices apply for 2026 and may be updated. Final decisions and processing times rest with the government authority.',
   rights='All rights reserved', aria='Site links'),
}
def build(lang, page, exists_other):
    t = T[lang]; home = page == 'index.html'; pre = '' if lang == 'ar' else '../'
    def href(h):
        if h == '@crm': return pre + 'crm.html'
        if h == '@install': return 'desktop.html#h-app'
        if h.startswith('#'): return h if home else 'index.html' + h
        return h
    def a(label, h):
        extra = ' rel="nofollow"' if h == '@crm' else (' data-pwi-open' if h == '@install' else '')
        return f'<li><a href="{href(h)}"{extra}>{label}</a></li>'
    cols = ''.join(f'<div class="mf-col"><b>{title}</b><ul>{"".join(a(l, h) for l, h in links)}</ul></div>' for title, links in t['cols'])
    other = ''
    if exists_other:
        other = (f' · <a href="en/{page}" lang="en" hreflang="en">{t["other"]}</a>' if lang == 'ar'
                 else f' · <a href="../{page}" lang="ar" hreflang="ar">{t["other"]}</a>')
    return (f'<footer class="mf"><div class="wrap mf-top">'
            f'<div class="mf-brand"><a class="mf-logo" href="{"#home" if home else "index.html"}">{LOGO}<span>{t["name"]}</span></a>'
            f'<p class="mf-tag">{t["tag"]}</p><p class="mf-lead">{t["lead"]}</p>'
            f'<div class="fc"><a href="tel:+97451600498" dir="ltr">☎ +974 5160 0498</a><a href="https://wa.me/97451600498" target="_blank" rel="noopener">{t["wa"]}</a>'
            f'<a href="mailto:munijizqa@gmail.com" dir="ltr">✉ munijizqa@gmail.com</a></div></div>'
            f'<nav class="mf-cols" aria-label="{t["aria"]}">{cols}</nav></div>'
            f'<div class="wrap mf-bot"><span>© 2026 {t["legal"]} · {t["city"]} · {t["rights"]}</span>'
            f'<span><a href="privacy.html">{t["privacy"]}</a> · <a href="legal.html">{t["legaldocs"]}</a>{other}</span>'
            f'<small>{t["note"]}</small></div></footer>')
n = 0
for lang in ('ar', 'en'):
    for page in PAGES:
        p = ROOT / (page if lang == 'ar' else 'en/' + page)
        if not p.exists(): continue
        other = (ROOT / ('en/' + page if lang == 'ar' else page)).exists()
        s = p.read_text(encoding='utf-8')
        new, k = re.subn(r'<footer\b.*?</footer>', lambda m: build(lang, page, other), s, count=1, flags=re.S)
        if k and new != s: p.write_text(new, encoding='utf-8'); n += 1
print('updated', n, 'pages')
