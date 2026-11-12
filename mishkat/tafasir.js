/* ركن «تفاسير القرآن وأسباب النزول»: يُحمَّل عند أول فتحه. التفاسير هي نفسها المضمّنة في مشكاة، وأسباب النزول مقتطفات من نصوص المفسرين أنفسهم. */
(() => {
const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const TAS = /[ً-ٰٟۖ-ۭـ]/g;
const norm = s => String(s).replace(TAS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
const BK = ['baghawi', 'qurtubi', 'tabari', 'ibnkathir', 'jalalayn'];
const ORDER = ['muyassar', 'jalalayn', 'saadi', 'baghawi', 'qurtubi', 'tabari', 'ibnkathir', 'gharib'];
const FAMOUS = [[2,189,'الأهلة'],[2,219,'الخمر والميسر'],[2,222,'المحيض'],[4,43,'الصلاة وأنتم سكارى'],[6,52,'طرد الفقراء'],[17,85,'سؤال الروح'],[18,83,'ذو القرنين'],[24,11,'حديث الإفك'],[24,6,'اللعان'],[49,6,'نبأ الفاسق'],[58,1,'المجادِلة'],[60,1,'حاطب بن أبي بلتعة'],[80,1,'عبس وتولّى'],[93,1,'الضحى'],[111,1,'تبّت يدا أبي لهب'],[112,1,'سورة الإخلاص'],[2,142,'تحويل القبلة'],[3,121,'غزوة أحد'],[9,118,'الثلاثة الذين خُلِّفوا'],[33,37,'زيد وزينب']];
let AS = null, CORP = null;
const load = async () => AS || (AS = await gz('data/asbab.txt').catch(e => { AS = null; throw e; }));
const BOOKT = k => (TF.find(b => b.key === k) || { title: k }).title;
const BOOKA = k => (TF.find(b => b.key === k) || { author: '' }).author;

const KIND = { muyassar: 'إجمالي', jalalayn: 'إجمالي', tabari: 'مأثور', ibnkathir: 'مأثور', baghawi: 'مأثور', qurtubi: 'فقهي', saadi: 'تربوي', gharib: 'لغوي' };
const KSHORT = { muyassar: 'الميسر', jalalayn: 'الجلالين', tabari: 'الطبري', ibnkathir: 'ابن كثير', baghawi: 'البغوي', qurtubi: 'القرطبي', saadi: 'السعدي', gharib: 'غريب القرآن' };
const brief = t => { const ss = String(t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/(?<=[.؟!])\s+/).filter(Boolean); let o = ''; for (const x of ss) { if (o && (o + ' ' + x).length > 260) break; o += (o ? ' ' : '') + x; if (o.length > 120) break; } return o.length > 300 ? o.slice(0, 297) + '…' : o; };
const BT = { muyassar: 'إجمالي ميسّر', jalalayn: 'وجيز (إجمالي)', saadi: 'بالمأثور مع استنباط الهدايات', baghawi: 'بالمأثور', qurtubi: 'فقهي (أحكام القرآن)', tabari: 'بالمأثور مع الترجيح', ibnkathir: 'بالمأثور', gharib: 'لغوي' };
const TYPES = [
  ['التفسير بالمأثور', 'تفسير القرآن بالقرآن، ثم بصحيح السنة، ثم بأقوال الصحابة والتابعين. هو أوثق الطرق وأولاها بالتقديم، ويُحذر فيه من الروايات الضعيفة والإسرائيليات.', 'الطبري، البغوي، ابن كثير', ['tabari', 'baghawi', 'ibnkathir']],
  ['التفسير بالرأي المحمود', 'اجتهاد المفسّر بعد علمه باللغة وأصول الدين وأقوال السلف ومقاصد الشرع، دون مخالفة نص ولا إجماع. أما الرأي المذموم فما كان بغير علم، أو تأييداً لهوى أو بدعة.', 'الرازي «مفاتيح الغيب»، البيضاوي «أنوار التنزيل»', []],
  ['التفسير الفقهي (أحكام القرآن)', 'يُعنى باستخراج الأحكام الشرعية من الآيات وبيان خلاف الفقهاء وأدلتهم.', 'القرطبي «الجامع لأحكام القرآن»، الجصاص، ابن العربي', ['qurtubi']],
  ['التفسير اللغوي والبلاغي', 'يفسّر الألفاظ والتراكيب ووجوه الإعراب والبيان، ويشرح غريب القرآن.', 'أبو حيان «البحر المحيط»، الزمخشري «الكشاف» (وفيه مآخذ اعتزالية يُنتبه لها)، ومعجم الغريب المضمّن في مشكاة', ['gharib']],
  ['التفسير الإجمالي (الوجيز والميسّر)', 'بيان معنى الآيات بعبارة مختصرة واضحة دون تفصيل الخلاف ولا الاستطراد، وهو أنسب للقراءة السريعة والتعليم.', 'تفسير الجلالين، التفسير الميسر', ['jalalayn', 'muyassar']],
  ['التفسير التحليلي (آيةً آية)', 'يمضي مع الآيات بترتيب المصحف، فيتناول كل آية بألفاظها وسبب نزولها ومعناها وأحكامها وهداياتها. وأكثر كتب التفسير المشهورة على هذا النحو.', 'السعدي «تيسير الكريم الرحمن»، وغيره من الكتب المضمّنة', ['saadi']],
  ['التفسير الموضوعي', 'يجمع الآيات المتفرقة في موضوع واحد، ويستخلص منها رؤية القرآن فيه.', 'الموسوعة الموضوعية في مشكاة', []],
  ['التفسير الإشاري', 'ما يُستنبط من الآية من معانٍ ولطائف وراء ظاهرها. يُقبل بشروط: ألا يناقض الظاهر، وأن يشهد له أصل شرعي، وألا يُدّعى أنه المراد وحده.', '', []],
  ['التفسير العلمي', 'ربط الآيات بما ثبت من حقائق العلم الكوني. يُحتاط فيه: لا تُحمَّل الآية على نظرية متغيرة، ولا يُجزم بالمراد.', '', []],
  ['التفسير الحديث والاجتماعي', 'يعالج قضايا العصر ومقاصد الهداية في المجتمع والحياة.', 'المنار، التحرير والتنوير، في ظلال القرآن', []],
];
const typesHTML = () => `<section class="panel tf-types"><h3>أنواع التفاسير</h3><p class="muted small">تتنوع كتب التفسير بحسب المنهج. هذه أشهر الأنواع، وتُعلَّم هنا الكتب المضمّنة في مشكاة.</p>${TYPES.map(([t, d, ex, ks]) => `<details><summary>${esc(t)}${ks.length ? ` <span class="chip acc">في مشكاة</span>` : ''}</summary><p>${esc(d)}</p>${ex ? `<p class="muted small"><b>من أمثلته:</b> ${esc(ex)}</p>` : ''}${ks.length ? `<p class="pill-row">${ks.map(k => `<span class="chip">${esc(BOOKT(k))}</span>`).join('')}</p>` : ''}</details>`).join('')}</section>`;
const para = t => esc(t).split(/\n+/).filter(Boolean).map(p => `<p>${p}</p>`).join('');
const cnt = D => Object.fromEntries(Object.keys(D).map(s => [s, Object.keys(D[s]).length]));

function head(sel) {
  const so = Q.surahs.map(s => `<option value="${s.n}"${s.n === sel ? ' selected' : ''}>${AR(s.n)}. ${s.name}</option>`).join('');
  return `<div><div class="eyebrow">اقرأ وتدبّر</div><h1>تفاسير القرآن وأسباب النزول</h1>
  <p class="muted">اختر السورة والآية فتجد لها أسباب النزول وتفاسير ${AR(TF.length)} كتب. أسباب النزول هنا مقتطفات من نصوص المفسرين أنفسهم (البغوي والقرطبي والطبري وابن كثير والجلالين) منسوبة إلى كتبها.</p></div>
  <section class="panel tf-pick"><div class="tf-row"><label>السورة<select id="tfS" aria-label="السورة">${so}</select></label>
  <label>الآية<input id="tfA" type="number" inputmode="numeric" min="1" placeholder="اختياري" aria-label="رقم الآية"></label>
  <button class="btn pri" id="tfGo">اذهب</button></div>
  <div class="tf-row"><input id="tfQ" type="search" placeholder="ابحث في أسباب النزول: مثل «عائشة» أو «الخمر» أو «أبو لهب»" aria-label="بحث في أسباب النزول" autocomplete="off"><button class="btn" id="tfQb">ابحث</button></div></section><div id="tfRes"></div>`;
}
function wire(sel) {
  const go = () => { const s = +$('#tfS').value, a = +$('#tfA').value; location.hash = a > 0 ? `#tf${s}-${a}` : `#tf${s}`; };
  $('#tfGo').onclick = go; $('#tfA').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#tfS').onchange = () => { $('#tfA').value = ''; go(); };
  const doQ = () => search($('#tfQ').value); $('#tfQb').onclick = doQ; $('#tfQ').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); doQ(); } };
}
async function search(q) {
  const box = $('#tfRes'), nq = norm(q);
  if (nq.length < 2) { box.innerHTML = `<p class="muted">اكتب كلمتين على الأقل من حرفين.</p>`; return; }
  box.innerHTML = `<p class="loading">جارٍ البحث…</p>`;
  const D = await load();
  if (!CORP) { CORP = []; for (const s in D) for (const a in D[s]) for (const b in D[s][a]) for (const t of D[s][a][b]) CORP.push([+s, +a, b, t, norm(t)]); }
  const ws = nq.split(/\s+/), seen = new Set(), out = [];
  for (const r of CORP) { if (ws.every(w => r[4].includes(w))) { const k = r[0] + ':' + r[1]; if (seen.has(k + r[2])) continue; seen.add(k + r[2]); out.push(r); if (out.length >= 60) break; } }
  const snip = (t, nt) => { const w = ws[0], i = nt.indexOf(w); if (i < 0 || t.length <= 260) return t.slice(0, 260); const st = Math.max(0, Math.min(t.length - 260, i - 90)); return (st ? '… ' : '') + t.slice(st, st + 260) + ' …'; };
  box.innerHTML = out.length ? `<section class="panel"><h3>${AR(out.length)}${out.length >= 60 ? '+' : ''} نتيجة</h3>${out.map(r => `<a class="tf-hit" href="#tf${r[0]}-${r[1]}"><b>${esc(Q.surahs[r[0] - 1].name)} ${AR(r[1])}</b><small>${esc(BOOKT(r[2]))}</small><span>${esc(snip(r[3], r[4]))}</span></a>`).join('')}</section>` : `<p class="muted">لا نتائج. جرّب كلمة أخرى.</p>`;
}

/* فهرس كتب التفسير: قائمة مختارة وليست حصراً، مرتبة بحسب المنهج. سنوات الوفاة بالهجري لمن تحقق منه، وما لم يُضبط كُتب فيه «معاصر» أو «غير محرّر». */
const BGR = [["mathur","التفسير بالمأثور"],["ray","التفسير بالرأي المحمود"],["fiqh","الفقهي (أحكام القرآن)"],["lugha","اللغوي والبلاغي والإعرابي"],["maysar","الميسّر والوجيز"],["tarbawi","الحديث والاجتماعي والتربوي"],["mawdui","التفسير الموضوعي"],["ishari","الإشاري والصوفي"],["ilmi","التفسير العلمي"],["madhahib","تفاسير المذاهب (للاطلاع على مناهجها)"],["ulum","علوم القرآن المساندة"]];
const BOOKS = [["mathur","جامع البيان عن تأويل آي القرآن","محمد بن جرير الطبري","ت ٣١٠هـ","مأثور","أمّ كتب التفسير بالمأثور؛ يسوق أقوال السلف بأسانيدها ثم يرجّح.","tabari"],["mathur","تفسير القرآن العظيم (ابن أبي حاتم)","عبد الرحمن بن أبي حاتم الرازي","ت ٣٢٧هـ","مأثور","يجمع مرويات الصحابة والتابعين في التفسير بأسانيدها.",""],["mathur","معالم التنزيل","الحسين بن مسعود البغوي","ت ٥١٦هـ","مأثور","تفسير مأثور موجز العبارة، يعتني بالقراءات وأسباب النزول.","baghawi"],["mathur","تفسير القرآن العظيم (ابن كثير)","إسماعيل بن عمر ابن كثير","ت ٧٧٤هـ","مأثور","يفسّر القرآن بالقرآن ثم بالسنة وأقوال السلف، ويتعقّب الروايات الواهية.","ibnkathir"],["mathur","الدر المنثور في التفسير بالمأثور","جلال الدين السيوطي","ت ٩١١هـ","مأثور","جامع للمرويات في التفسير مختصرة الأسانيد؛ يحتاج إلى تمييز صحيحها من ضعيفها.",""],["mathur","أضواء البيان في إيضاح القرآن بالقرآن","محمد الأمين الشنقيطي","ت ١٣٩٣هـ","مأثور","يعتمد تفسير القرآن بالقرآن، مع عناية بالأحكام والمسائل الأصولية.",""],["ray","مفاتيح الغيب (التفسير الكبير)","فخر الدين الرازي","ت ٦٠٦هـ","رأي محمود","تفسير موسّع بالنظر العقلي والكلامي والمناسبات بين الآيات.",""],["ray","أنوار التنزيل وأسرار التأويل","ناصر الدين البيضاوي","ت ٦٨٥هـ (وقيل ٦٩١هـ)","رأي محمود","تفسير مختصر متداول يجمع مسائل اللغة والكلام والقراءات.",""],["ray","التسهيل لعلوم التنزيل","محمد بن أحمد ابن جزي الكلبي","ت ٧٤١هـ","رأي محمود","تفسير وجيز جامع، يمهّد لتفسيره بمقدمات في علوم القرآن.",""],["ray","البحر المحيط","أبو حيان الأندلسي","ت ٧٤٥هـ","رأي محمود","موسوعة نحوية في التفسير، تعنى بالإعراب وتوجيه القراءات.",""],["ray","تفسير الجلالين","جلال الدين المحلي وجلال الدين السيوطي","ت ٨٦٤هـ و٩١١هـ","رأي محمود","تفسير وجيز بعبارة مركّزة، بدأه المحلي وأتمّه السيوطي.","jalalayn"],["ray","روح المعاني","شهاب الدين الآلوسي","ت ١٢٧٠هـ","رأي محمود","تفسير جامع لأقوال السلف والخلف، يجمع الرواية والدراية.",""],["fiqh","الجامع لأحكام القرآن","محمد بن أحمد القرطبي","ت ٦٧١هـ","فقهي","يتوسع في الأحكام وخلاف الفقهاء مع شرح الآيات.","qurtubi"],["fiqh","أحكام القرآن (الجصاص)","أبو بكر الجصاص","ت ٣٧٠هـ","فقهي","من أمهات كتب أحكام القرآن على مذهب الحنفية.",""],["fiqh","أحكام القرآن (ابن العربي)","أبو بكر ابن العربي المالكي","ت ٥٤٣هـ","فقهي","من أمهات كتب أحكام القرآن على مذهب المالكية.",""],["fiqh","أحكام القرآن (الكيا الهراسي)","الكيا الهراسي","ت ٥٠٤هـ","فقهي","كتاب في أحكام القرآن على مذهب الشافعية.",""],["fiqh","أحكام القرآن (الشافعي)","الإمام الشافعي، وجمعه البيهقي","ت ٢٠٤هـ (وجمعه البيهقي ٤٥٨هـ)","فقهي","جمع البيهقي فيه نصوص الشافعي في تفسير آيات الأحكام.",""],["lugha","معاني القرآن (الفراء)","يحيى بن زياد الفراء","ت ٢٠٧هـ","لغوي","من أقدم كتب معاني القرآن وإعرابه على طريقة الكوفيين.",""],["lugha","معاني القرآن وإعرابه (الزجاج)","إبراهيم بن السري الزجاج","ت ٣١١هـ","لغوي","يعنى بالمعنى والإعراب والاحتجاج للقراءات.",""],["lugha","إعراب القرآن (النحاس)","أبو جعفر النحاس","ت ٣٣٨هـ","لغوي","كتاب في إعراب القرآن ومعانيه.",""],["lugha","الكشاف عن حقائق غوامض التنزيل","محمود بن عمر الزمخشري","ت ٥٣٨هـ","لغوي","عمدة في البلاغة والبيان، وفيه مآخذ اعتزالية يُنتبه لها.",""],["lugha","المفردات في غريب القرآن","الراغب الأصفهاني","ت نحو ٥٠٢هـ","لغوي","معجم لألفاظ القرآن وفروق دلالاتها.",""],["lugha","الدر المصون في علوم الكتاب المكنون","السمين الحلبي","ت ٧٥٦هـ","لغوي","تفسير يُعنى بإعراب القرآن وتوجيه القراءات.",""],["lugha","التفسير البياني للقرآن الكريم","عائشة عبد الرحمن (بنت الشاطئ)","ت ١٤١٩هـ","لغوي","تفسير بياني يتناول ألفاظ القرآن وسياقاتها في سور قصيرة.",""],["lugha","الميسر في غريب القرآن","غير محرّر","غير محرّر","لغوي","كتاب في بيان الألفاظ الغريبة، وهو من الكتب المضمّنة في مشكاة.","gharib"],["maysar","التفسير الميسر","نخبة من العلماء، مجمع الملك فهد","معاصر","ميسّر","تفسير موجز بعبارة واضحة يناسب القراءة السريعة.","muyassar"],["maysar","تيسير الكريم الرحمن","عبد الرحمن بن ناصر السعدي","ت ١٣٧٦هـ","ميسّر","تفسير سهل العبارة يستنبط الهدايات والفوائد.","saadi"],["maysar","أيسر التفاسير لكلام العلي الكبير","أبو بكر الجزائري","ت ١٤٣٩هـ","ميسّر","تفسير ميسّر لعموم القرّاء.",""],["maysar","صفوة التفاسير","محمد علي الصابوني","ت ١٤٤٢هـ","ميسّر","تفسير مختصر يجمع بين الإيضاح اللغوي والمعنى والأحكام.",""],["maysar","التفسير المنير","وهبة الزحيلي","ت ١٤٣٦هـ","ميسّر","تفسير معاصر في العقيدة والشريعة والمنهج.",""],["tarbawi","تفسير المنار","محمد رشيد رضا (عن دروس محمد عبده)","ت ١٣٥٤هـ","تربوي","تفسير إصلاحي يعالج قضايا المجتمع ويربط الآيات بالواقع.",""],["tarbawi","محاسن التأويل","جمال الدين القاسمي","ت ١٣٣٢هـ","تربوي","تفسير جامع في الفوائد واللطائف مع عناية بالسنة.",""],["tarbawi","تفسير المراغي","أحمد مصطفى المراغي","ت ١٣٧١هـ","تربوي","تفسير معاصر سهل الأسلوب يربط الآيات بحاجات العصر.",""],["tarbawi","في ظلال القرآن","سيد قطب","ت ١٣٨٧هـ","تربوي","تفسير أدبي تربوي يعيش مع الآيات ومقاصدها.",""],["tarbawi","التحرير والتنوير","محمد الطاهر ابن عاشور","ت ١٣٩٣هـ","تربوي","تفسير عميق في اللغة والبلاغة ومقاصد الشريعة.",""],["tarbawi","خواطر حول القرآن (تفسير الشعراوي)","محمد متولي الشعراوي","ت ١٤١٨هـ","تربوي","خواطر وتأملات مأخوذة من دروسه في تفسير القرآن.",""],["mawdui","التفسير الموضوعي للقرآن الكريم","عبد الستار فتح الله سعيد","معاصر","موضوعي","يتناول موضوعات القرآن بجمع آياتها وبيان هداياتها.",""],["mawdui","المدخل إلى التفسير الموضوعي","عبد الستار فتح الله سعيد","معاصر","موضوعي","مدخل إلى منهج التفسير الموضوعي وأصوله.",""],["mawdui","البداية في التفسير الموضوعي","عبد الحي الفرماوي","غير محرّر","موضوعي","مرجع تأسيسي في منهج التفسير الموضوعي وخطواته.",""],["mawdui","مباحث في التفسير الموضوعي","مصطفى مسلم","معاصر","موضوعي","دراسة في منهج التفسير الموضوعي وأنواعه.",""],["mawdui","نحو تفسير موضوعي لسور القرآن الكريم","محمد الغزالي","ت ١٤١٦هـ","موضوعي","يتناول كل سورة بوصفها وحدة موضوعية متكاملة.",""],["mawdui","موسوعة جامعة الشارقة للتفسير الموضوعي","جامعة الشارقة","معاصر","موضوعي","عمل جماعي أكاديمي في التفسير الموضوعي لسور القرآن.",""],["mawdui","التبيان في أقسام القرآن","ابن قيّم الجوزية","ت ٧٥١هـ","موضوعي","يدرس الأقسام الواردة في القرآن وأغراضها.",""],["ishari","تفسير التستري","سهل بن عبد الله التستري","ت ٢٨٣هـ","إشاري","من أقدم ما نُسب إلى التفسير الإشاري؛ يُقرأ بميزان الشرع.",""],["ishari","حقائق التفسير","أبو عبد الرحمن السلمي","ت ٤١٢هـ","إشاري","جمع لإشارات الصوفية في التفسير؛ يُنظر في أسانيدها ومعانيها.",""],["ishari","لطائف الإشارات","أبو القاسم القشيري","ت ٤٦٥هـ","إشاري","تفسير إشاري صوفي معتدل العبارة.",""],["ishari","عرائس البيان في حقائق القرآن","روزبهان البقلي","ت ٦٠٦هـ","إشاري","تفسير إشاري صوفي.",""],["ishari","روح البيان","إسماعيل حقي","ت ١١٢٧هـ","إشاري","تفسير يجمع بين الظاهر والإشارة.",""],["ishari","البحر المديد في تفسير القرآن المجيد","أحمد بن عجيبة","ت ١٢٢٤هـ","إشاري","يجمع بين التفسير الظاهر والإشاري.",""],["ilmi","الجواهر في تفسير القرآن الكريم","طنطاوي جوهري","ت ١٣٥٨هـ","علمي","يربط الآيات بمعارف العلوم الكونية؛ يُحتاط في ما يُحمَّل على الآيات من نظريات متغيرة.",""],["madhahib","التبيان في تفسير القرآن","أبو جعفر الطوسي (الإمامية)","ت ٤٦٠هـ","مذاهب","من تفاسير الإمامية، للاطلاع على منهجها.",""],["madhahib","مجمع البيان في تفسير القرآن","الفضل بن الحسن الطبرسي (الإمامية)","ت ٥٤٨هـ","مذاهب","من تفاسير الإمامية، للاطلاع على منهجها.",""],["madhahib","الميزان في تفسير القرآن","محمد حسين الطباطبائي (الإمامية)","ت ١٤٠٢هـ","مذاهب","تفسير معاصر للإمامية يعتمد تفسير القرآن بالقرآن، للاطلاع على منهجه.",""],["madhahib","تيسير التفسير","محمد بن يوسف اطفيّش (الإباضية)","ت ١٣٣٢هـ","مذاهب","من تفاسير الإباضية، للاطلاع على منهجها.",""],["madhahib","تنزيه القرآن عن المطاعن","القاضي عبد الجبار (المعتزلة)","ت ٤١٥هـ","مذاهب","من مصنفات المعتزلة المتصلة بالقرآن، للاطلاع على منهجها.",""],["ulum","أسباب النزول","علي بن أحمد الواحدي","ت ٤٦٨هـ","علوم مساندة","من أشهر ما صُنّف في أسباب النزول.",""],["ulum","لباب النقول في أسباب النزول","جلال الدين السيوطي","ت ٩١١هـ","علوم مساندة","استدراك واختصار في أسباب النزول.",""],["ulum","الإتقان في علوم القرآن","جلال الدين السيوطي","ت ٩١١هـ","علوم مساندة","موسوعة جامعة في علوم القرآن وأنواعها.",""],["ulum","البرهان في علوم القرآن","بدر الدين الزركشي","ت ٧٩٤هـ","علوم مساندة","من أمهات كتب علوم القرآن.",""]];
const BKINDS = ["مأثور","رأي محمود","فقهي","لغوي","ميسّر","تربوي","موضوعي","إشاري","علمي","مذاهب","علوم مساندة"];
const booksView = () => {
  const own = BOOKS.filter(b => b[6]).length;
  V(`<div class="stack"><div><div class="eyebrow">ركن التفاسير</div><h1>فهرس كتب التفسير</h1>
  <p class="muted">${AR(BOOKS.length)} كتاباً مختاراً مرتبةً بحسب المنهج، مع المؤلف وسنة وفاته وبيان نوع كل كتاب. المتاح نصه داخل مشكاة ${AR(own)} كتب، وما سواها للاطلاع فقط. القائمة مختارة وليست حصراً.</p>
  <div class="toolbar"><a class="btn" href="#tafasir">← ركن التفاسير</a></div></div>
  <section class="panel tf-bx"><div class="tf-row"><input id="bxQ" type="search" placeholder="ابحث باسم الكتاب أو المؤلف" aria-label="بحث في الفهرس" autocomplete="off"></div>
  <div class="pill-row" id="bxK" role="group" aria-label="التصفية بالنوع"><button class="chip acc" data-k="" aria-pressed="true">الكل</button>${BKINDS.map(k => `<button class="chip" data-k="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}</div>
  <div class="pill-row" id="bxA" role="group" aria-label="التصفية بالتوفر"><button class="chip acc" data-a="" aria-pressed="true">الكل</button><button class="chip" data-a="1" aria-pressed="false">متاح نصه في مشكاة</button><button class="chip" data-a="0" aria-pressed="false">للاطلاع فقط</button></div>
  <p class="muted small" id="bxN"></p></section><div id="bxL"></div></div>`);
  let K = '', A = '', Qs = '';
  const draw = () => {
    const q = norm(Qs); let n = 0;
    const html = BGR.map(([g, gt]) => {
      const rs = BOOKS.filter(b => b[0] === g && (!K || b[4] === K) && (A === '' || (A === '1') === !!b[6]) && (!q || norm(b[1] + ' ' + b[2]).includes(q)));
      n += rs.length;
      return rs.length ? `<section class="panel tf-bx"><h3>${esc(gt)} <span class="chip">${LANG === 'ar' ? AR(rs.length) : rs.length}</span></h3>${rs.map(b => `<article class="tf-bkx${b[6] ? ' own' : ''}"><h4>${esc(b[1])}</h4><p class="muted small">${esc(b[2])} · <b>${esc(b[3])}</b></p><p class="pill-row"><span class="chip">${esc(b[4])}</span>${b[6] ? `<a class="chip acc" href="#tf1-1">متاح نصه داخل مشكاة</a>` : `<span class="chip">للاطلاع فقط</span>`}</p><p>${esc(b[5])}</p></article>`).join('')}</section>` : '';
    }).join('');
    $('#bxL').innerHTML = html || '<p class="muted">لا كتب مطابقة. غيّر التصفية أو كلمة البحث.</p>';
    $('#bxN').textContent = AR(n) + ' من ' + AR(BOOKS.length) + ' كتاباً';
  };
  const seg = (id, set) => $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; $$(id + ' button').forEach(x => { const on = x === b; x.classList.toggle('acc', on); x.setAttribute('aria-pressed', on); }); set(b); draw(); };
  seg('#bxK', b => K = b.dataset.k); seg('#bxA', b => A = b.dataset.a);
  $('#bxQ').oninput = e => { Qs = e.target.value; draw(); };
  draw();
};
async function home() {
  V(`<div class="stack">${head(0)}<div id="tfHome"><p class="loading">جارٍ التحميل…</p></div></div>`); wire(0);
  const D = await load(), c = cnt(D), tot = Object.values(c).reduce((a, b) => a + b, 0);
  const fam = FAMOUS.filter(([s, a]) => D[s] && D[s][a]);
  $('#tfHome').innerHTML = `<section class="panel"><h3>فهرس كتب التفسير</h3><p class="muted small">${AR(BOOKS.length)} كتاباً مرتبةً بحسب المنهج، مع المؤلف وسنة الوفاة، وبيان ما هو متاح نصه في مشكاة.</p><a class="btn pri" href="#tfbooks">افتح فهرس الكتب</a></section><section class="panel"><h3>من أشهر أسباب النزول</h3><div class="pill-row" style="margin-top:8px">${fam.map(([s, a, t]) => `<a class="chip acc" href="#tf${s}-${a}">${esc(t)} · ${esc(Q.surahs[s - 1].name)} ${AR(a)}</a>`).join('')}</div></section>
  <section class="panel"><h3>السور وعدد الآيات التي ورد لها سبب نزول</h3><p class="muted small">${AR(tot)} آية في ${AR(Object.keys(c).length)} سورة.</p><div class="pill-row" style="margin-top:8px">${Q.surahs.filter(s => c[s.n]).map(s => `<a class="chip" href="#tf${s.n}">${esc(s.name)} · ${AR(c[s.n])}</a>`).join('')}</div></section>${typesHTML()}`;
}
async function surahView(sn) {
  const su = Q.surahs[sn - 1]; if (!su) return home();
  V(`<div class="stack">${head(sn)}<div id="tfHome"><p class="loading">جارٍ التحميل…</p></div></div>`); wire(sn); $('#tfA').max = su.ayas;
  const D = await load(), m = D[sn] || {}, keys = Object.keys(m).map(Number).sort((a, b) => a - b);
  $('#tfHome').innerHTML = `<section class="panel"><h2>سورة ${esc(su.name)}</h2><div class="toolbar">${sn > 1 ? `<a class="btn" href="#tf${sn - 1}">→ ${esc(Q.surahs[sn - 2].name)}</a>` : ''}${sn < 114 ? `<a class="btn" href="#tf${sn + 1}">${esc(Q.surahs[sn].name)} ←</a>` : ''}<a class="btn" href="#tf${sn}-1">تفسير الآية الأولى</a><a class="btn" href="#ps${sn}">اقرأها في المصحف</a></div></section>
  <section class="panel"><h3>الآيات التي ورد لها سبب نزول (${AR(keys.length)})</h3>${keys.length ? keys.map(a => { const i = idxOf(sn, a), bs = Object.keys(m[a]); return `<a class="tf-hit" href="#tf${sn}-${a}"><b>آية ${AR(a)}</b><small>${bs.map(BOOKT).map(esc).join(' · ')}</small><span>${esc(ayahText(i).slice(0, 140))}</span></a>`; }).join('') : `<p class="muted">لم يرد في كتب التفسير المضمّنة سبب نزول مخصوص لآيات هذه السورة. يمكنك فتح أي آية بإدخال رقمها أعلاه لقراءة تفاسيرها.</p>`}</section>`;
}
const LVL = ['b', 'm', 'x'], LVN = { b: 'مبتدئ', m: 'متوسط', x: 'متخصص' };
const getLvl = () => { const v = ST.prefs && ST.prefs.tfLevel; return LVL.includes(v) ? v : 'm'; };
async function getTxt(k, sn, an) {
  const t = await tafsir(k, sn); let txt = t[an], from = an;
  if (!txt) for (let q = an - 1; q >= Math.max(1, an - 60) && !txt; q--) if (t[q]) { txt = t[q]; from = q; }
  return { txt, from };
}
const bookHTML = (k, r, an) => r.txt ? (r.from !== an ? `<p class="muted small">جاء تفسير هذه الآية ضمن تفسير الآية ${AR(r.from)} وما يليها.</p>` : '') + `<div class="tf-txt">${para(r.txt)}</div>` : '<p class="muted">لا يوجد نص لهذه الآية في هذا الكتاب.</p>';
function topicsFor(i) {
  const out = []; const a = Q.ayat[i];
  for (const c of T) for (const it of c.items) {
    const hit = (it.a && it.a.includes(i)) || (it.r && it.r.some(([s, x, y]) => s === a[0] && a[1] >= x && a[1] <= (y || x)));
    if (hit) { out.push([c, it]); if (out.length >= 10) return out; }
  }
  return out;
}
async function ayahView(sn, an) {
  const su = Q.surahs[sn - 1]; if (!su) return home(); an = Math.max(1, Math.min(su.ayas, an)); const i = idxOf(sn, an);
  V(`<div class="stack">${head(sn)}<div id="tfHome"><p class="loading">جارٍ التحميل…</p></div></div>`); wire(sn); $('#tfA').value = an; $('#tfA').max = su.ayas;
  const D = await load(), as = (D[sn] || {})[an] || {}, lv = getLvl(), L = LVL.indexOf(lv);
  const bt = k => `<summary><span class="tg"><b>${KIND[k]}</b> · <span>${KSHORT[k]}</span></span> ${esc(BOOKT(k))} <small class="muted">${esc(BOOKA(k))}${BT[k] ? ' · ' + esc(BT[k]) : ''}</small></summary>`;
  const bk = (k, open) => `<details class="tf-bk" data-k="${k}"${open ? ' open' : ''}>${bt(k)}<div class="tf-load"><p class="loading">جارٍ التحميل…</p></div></details>`;
  const sec = (title, badge, body, note) => `<section class="panel tf-layer"><h3>${title} <span class="chip acc">${badge}</span></h3>${note ? `<p class="muted small">${note}</p>` : ''}${body}</section>`;
  const parts = [];
  // ١ المعنى الموجز
  parts.push(sec('المعنى الموجز', 'إجمالي', bk('muyassar', true) + (L >= 1 ? bk('jalalayn', false) : '')));
  // ٢ سبب النزول والسياق
  if (L >= 1) parts.push(sec('سبب النزول والسياق', 'علوم القرآن', Object.keys(as).length ? BK.filter(b => as[b]).map(b => `<details class="tf-bk"${b === 'baghawi' || !as.baghawi ? ' open' : ''}><summary>${esc(BOOKT(b))} <small class="muted">${BT[b] ? esc(BT[b]) : ''}</small></summary>${as[b].map(para).join('<hr class="tf-hr">')}<a class="btn tf-full" href="#tf${sn}-${an}" data-open="${b}">اقرأ التفسير كاملًا في الطبقات أدناه</a></details>`).join('') : `<p class="muted">لم يرد في كتب التفسير المضمّنة سبب نزول مخصوص لهذه الآية، وقد تكون مما نزل ابتداءً. السورة ${su.type}.</p>`, 'مقتطفات من نصوص المفسرين نفسها، وليست حكمًا بصحة الرواية؛ يُرجع إلى الأسانيد للتحقق.'));
  // ٣ الشرح بالنقل
  if (L >= 1) parts.push(sec('الشرح بالنقل عن السلف', 'مأثور', bk('baghawi', false) + bk('ibnkathir', false) + (L >= 2 ? bk('tabari', false) : ''), 'قد يرد في المأثور ما لا يصح من الروايات والإسرائيليات؛ فاقرأه بميزان الكتاب والسنة.'));
  // ٤ اللغة والإعراب
  if (L >= 1) {
    const lem = new Map(); if (L >= 2) { const a = Q.ayat[i]; for (let k = 0; k < a[3]; k++) { const l = W.w[a[2] + k][1]; if (W.lemmas[l][2] !== 'P') lem.set(l, 1); } }
    parts.push(sec('اللغة والغريب', 'لغوي', bk('gharib', true) + (lem.size ? `<p class="muted small" style="margin-top:8px">ألفاظ الآية ومواضعها في القرآن:</p><div class="pill-row">${[...lem.keys()].map(l => `<a class="chip acc" data-lem="${l}">${esc(W.lemmas[l][0])}</a>`).join('')}</div>` : '')));
  }
  // ٥ الأحكام
  if (L >= 1) parts.push(sec('الأحكام الفقهية', 'فقهي', bk('qurtubi', false), 'يتوسع القرطبي في الأحكام وخلاف الفقهاء حيث تكون للآية أحكام.'));
  if (L >= 2) parts.push(`<section class="panel tf-layer tf-soon"><h3>التعمّق بالرأي واللطائف <span class="chip">قريبًا</span></h3><p class="muted small">سيُضاف التفسير بالرأي المحمود (الرازي والبيضاوي) والمناسبات والتفسير الإشاري والعلمي بوسم تنبيه، متى توفرت نصوصها بترخيص مناسب.</p><p class="muted small">وكل ما يُعرض فيهما من الإشارات والعلميات اجتهاد لا يُجزم به.</p></section>`);
  // ٦ الهدايات
  parts.push(sec('الهدايات والتدبّر', 'تربوي', bk('saadi', L === 0), 'السعدي يستنبط الهدايات والفوائد بعبارة قريبة.'));
  // ٧ الموضوع
  if (L >= 1) { const tp = topicsFor(i); parts.push(sec('الموضوع', 'موضوعي', tp.length ? `<div class="pill-row">${tp.map(([c, it]) => `<a class="chip acc" href="#t-${c.id}">${esc(it.n)} · ${esc(c.title)}</a>`).join('')}</div><p class="muted small" style="margin-top:6px">افتح الموضوع لترى بقية الآيات التي تعالجه في القرآن.</p>` : `<p class="muted">لا يندرج هذا الموضع تحت مدخل موضوعي في الموسوعة. تصفّح <a href="#topics">الموسوعة الموضوعية</a>.</p>`)); }
  // ٨ مقارنة
  if (L >= 2) parts.push(sec('مقارنة سريعة بين المفسرين', 'مقارنة', `<div id="tfCmp"><button class="btn pri" id="tfCmpB">اعرض مطلع كل تفسير جنبًا إلى جنب</button></div>`, 'يُعرض مطلع كلام كل مفسّر على الآية؛ لقراءة الكلام كاملًا افتح كتابه في الطبقات أعلاه.'));
  const lvBtn = LVL.map(x => `<button data-l="${x}" aria-pressed="${x === lv}">${LVN[x]}</button>`).join('');
  const nav = `<div class="toolbar">${an > 1 ? `<a class="btn" href="#tf${sn}-${an - 1}">→ السابقة</a>` : ''}${an < su.ayas ? `<a class="btn" href="#tf${sn}-${an + 1}">التالية ←</a>` : ''}<a class="btn" href="#tf${sn}">آيات السورة</a><a class="btn" href="#pa${i}">في المصحف</a></div>`;
  $('#tfHome').innerHTML = `<section class="panel"><div class="eyebrow">${esc(su.name)} · آية ${AR(an)} · ${su.type}</div><div class="ayah tf-ay">${ayahHTML(i, null, false)}</div>${nav}</section>
  <section class="panel tf-sum"><b class="muted small">خلاصة الآية</b><p id="tfSum" class="tf-s">جارٍ التحميل…</p></section>
  <div class="tf-lvl"><span>مستوى القراءة:</span><div class="seg" id="tfL" role="group" aria-label="مستوى القراءة">${lvBtn}</div></div>
  ${parts.join('')}`;
  getTxt('muyassar', sn, an).then(r => { const e = $('#tfSum'); if (e) e.textContent = r.txt ? brief(r.txt) : 'لا خلاصة لهذه الآية.'; }).catch(() => { const e = $('#tfSum'); if (e) e.textContent = 'تعذّر تحميل الخلاصة.'; });
  const loadBk = async d => { if (d.dataset.ok) return; d.dataset.ok = 1; const k = d.dataset.k, box = d.querySelector('.tf-load'); try { box.innerHTML = bookHTML(k, await getTxt(k, sn, an), an); } catch (e) { d.dataset.ok = ''; box.innerHTML = '<p class="muted">تعذّر تحميل التفسير، تحقق من الاتصال.</p>'; } };
  $$('#tfHome details.tf-bk[data-k]').forEach(d => { d.addEventListener('toggle', () => { if (d.open) loadBk(d); }); if (d.open) loadBk(d); });
  $('#tfL').onclick = e => { const b = e.target.closest('button'); if (!b) return; ST.prefs = ST.prefs || {}; ST.prefs.tfLevel = b.dataset.l; try { save(); } catch (er) {} ayahView(sn, an); };
  const cb = $('#tfCmpB'); if (cb) cb.onclick = async () => {
    cb.disabled = true; const ks = ['muyassar', 'jalalayn', 'saadi', 'baghawi', 'qurtubi', 'tabari', 'ibnkathir'];
    const rs = await Promise.all(ks.map(k => getTxt(k, sn, an).then(r => [k, r]).catch(() => [k, { txt: '' }])));
    $('#tfCmp').innerHTML = rs.filter(([, r]) => r.txt).map(([k, r]) => { const t = r.txt.replace(/\s+/g, ' ').trim(); return `<article class="tf-cmp"><h4>${esc(BOOKT(k))} <span class="chip">${esc(BT[k] || '')}</span></h4><p>${esc(t.length > 380 ? t.slice(0, 380).replace(/\S*$/, '') + ' …' : t)}</p></article>`; }).join('');
  };
  $$('#tfHome a[data-open]').forEach(a => a.onclick = e => { e.preventDefault(); const k = a.dataset.open, d = $(`#tfHome details.tf-bk[data-k="${k}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } });
}
window.tafasirOpen = (sn, an) => (sn === -1 ? Promise.resolve(booksView()) : sn ? (an ? ayahView(sn, an) : surahView(sn)) : home()).catch(e => V(`<p class="loading">تعذّر فتح الركن: ${esc(e.message)}</p>`));
})();
