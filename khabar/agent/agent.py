#!/usr/bin/env python3
"""«خبر»: الوكيل المحرر المستقل.

يكتب خلاصة الصباح والمساء ويرصد العاجل بنفسه، دون تدخل بشري، على Claude API.

  python3 khabar/agent/agent.py brief      # خلاصة جديدة (الصباح قبل 12:00 بتوقيت الدوحة، والمساء بعدها)
  python3 khabar/agent/agent.py breaking   # رصد العاجل (كل 20 دقيقة من GitHub Actions)

خط الإنتاج في وضع الخلاصة:
  1. الكشّاف: عناوين آخر ساعات من data/headlines.json تُعطى للمراسلين خيوطاً أولى.
  2. أربعة مراسلين متوازين (قطر، الخليج، مصر، العالم): يبحثون ويفتحون المقالات بأنفسهم
     (web_search و web_fetch)، ويسلّمون الأخبار عبر أداة submit_zone ومعها اقتباس حرفي من كل مصدر.
  3. بوّابة المصدر (برمجية، لا ذكاء فيها): يُرفض كل رابط لم يظهر فعلاً في نتائج البحث أو الجلب،
     وكل رابط تحويل، وكل مصدر أقدم من 7 أيام، وكل اقتباس لا يوجد في نص الصفحة المجلوبة.
     الخبر الذي لا يبقى له مصدر يُحذف.
  4. المدقق (نموذج مستقل): يقارن كل خبر باقتباسات مصادره، ويحذف ما لا تسنده.
  5. رئيس التحرير: يكتب «خيط اليوم» من الأخبار التي نجت فقط.
  6. التجميع والفحص النهائي (verify.py) والكتابة إلى data/ مع سجل الشفافية.
"""
import concurrent.futures as cf, datetime as dt, json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify as V  # noqa: E402

DATA = V.DATA
MODEL = os.environ.get('KHABAR_MODEL') or 'claude-opus-5-5'
CHECK_MODEL = os.environ.get('KHABAR_CHECK_MODEL') or 'claude-haiku-5-5'
EFFORT = os.environ.get('KHABAR_EFFORT') or 'high'
# USD per million tokens (input, output, cache read); web search is billed per call
PRICES = {'claude-opus-5-5': (4, 20, 0.20), 'claude-sonnet-5-5': (2, 10, 0.20), 'claude-haiku-5-5': (0.10, 0.50, 0.01)}
SEARCH_USD = 0.01
FALLBACK = {'betas': ['server-side-fallback-2026-07-01'], 'fallbacks': 'default'}
ZONES = {
    'qatar': {'ar': 'قطر', 'en': 'Qatar', 'k': 'q',
              'focus': 'الشأن الحكومي والأميري، الاقتصاد وبورصة قطر وقطر للطاقة، المجتمع والتعليم والصحة، الرياضة، الخدمات والقرارات التي تمس المقيمين'},
    'gulf': {'ar': 'الخليج', 'en': 'The Gulf', 'k': 'g',
             'focus': 'السعودية، الإمارات، الكويت، عُمان، البحرين، مجلس التعاون، الطاقة وأوبك+، الاستثمار والمشروعات الكبرى'},
    'egypt': {'ar': 'مصر', 'en': 'Egypt', 'k': 'e',
              'focus': 'الحكومة والقرارات، الجنيه والفائدة والتضخم والذهب، الطاقة وقناة السويس، المجتمع، الرياضة'},
    'world': {'ar': 'العالم', 'en': 'The World', 'k': 'w',
              'focus': 'السياسة الدولية والنزاعات والدبلوماسية، الاقتصاد والأسواق والبنوك المركزية، التقنية والذكاء الاصطناعي، المناخ والصحة'},
}
MARKETS = {'qatar': 'مؤشر بورصة قطر', 'egypt': 'سعر الدولار مقابل الجنيه المصري وسعر الذهب عيار 21 في مصر', 'world': 'خام برنت وأونصة الذهب عالمياً'}

client = anthropic.Anthropic(max_retries=4)
USAGE = {'input': 0, 'output': 0, 'cache_read': 0, 'cache_write': 0, 'searches': 0, 'fetches': 0, 'usd': 0.0}


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def account(model, usage):
    pi, po, pc = PRICES.get(model, PRICES['claude-opus-5-5'])
    get = lambda k: getattr(usage, k, 0) or 0
    stu = getattr(usage, 'server_tool_use', None)
    searches = (getattr(stu, 'web_search_requests', 0) or 0) if stu else 0
    fetches = (getattr(stu, 'web_fetch_requests', 0) or 0) if stu else 0
    USAGE['input'] += get('input_tokens'); USAGE['output'] += get('output_tokens')
    USAGE['cache_read'] += get('cache_read_input_tokens'); USAGE['cache_write'] += get('cache_creation_input_tokens')
    USAGE['searches'] += searches; USAGE['fetches'] += fetches
    USAGE['usd'] += (get('input_tokens') * pi + get('cache_creation_input_tokens') * pi * 1.25
                     + get('cache_read_input_tokens') * pc + get('output_tokens') * po) / 1e6 + searches * SEARCH_USD


def norm_url(u):
    s = urllib.parse.urlsplit((u or '').strip())
    return urllib.parse.urlunsplit((s.scheme.lower(), (s.hostname or '').lower(), s.path.rstrip('/'), s.query, ''))


def squash(t):
    return re.sub(r'\s+', ' ', (t or '').translate(V.AR_DIGITS)).strip().lower()


# ---------------------------------------------------------------- schemas
BI = {'type': 'object', 'additionalProperties': False, 'required': ['ar', 'en'],
      'properties': {'ar': {'type': 'string'}, 'en': {'type': 'string'}}}
SOURCE = {'type': 'object', 'additionalProperties': False, 'required': ['name_ar', 'name_en', 'date', 'url', 'quote'],
          'properties': {
              'name_ar': {'type': 'string', 'description': 'اسم الجهة الناشرة بالعربية'},
              'name_en': {'type': 'string', 'description': 'Publisher name in English'},
              'date': {'type': 'string', 'description': 'تاريخ نشر المقال YYYY-MM-DD'},
              'url': {'type': 'string', 'description': 'الرابط الأصلي للمقال نفسه كما ظهر في نتيجة البحث أو الجلب'},
              'quote': {'type': 'string', 'description': 'جملة أو جملتان منقولتان حرفياً من نص المقال تسندان الخبر، بلغة المقال'}}}
WITH_SRC = lambda desc: {'type': 'object', 'additionalProperties': False, 'required': ['ar', 'en', 'src'], 'description': desc,
                         'properties': {'ar': {'type': 'string'}, 'en': {'type': 'string'},
                                        'src': {'type': 'array', 'items': {'type': 'integer'}, 'description': 'أرقام الأخبار (من 1) التي بُني عليها'}}}
SUBMIT_ZONE = {
    'name': 'submit_zone',
    'description': 'سلّم أخبار الدائرة النهائية بعد أن تقرأ المقالات بنفسك. استدعها مرة واحدة في النهاية.',
    'strict': True,
    'input_schema': {
        'type': 'object', 'additionalProperties': False,
        'required': ['items', 'analysis', 'technical', 'outlook', 'markets', 'roadmap'],
        'properties': {
            'items': {'type': 'array', 'description': 'من 5 إلى 9 أخبار، الأهم أولاً', 'items': {
                'type': 'object', 'additionalProperties': False, 'required': ['cat', 'ar', 'en', 'sources'],
                'properties': {'cat': BI, 'ar': {'type': 'string'}, 'en': {'type': 'string'},
                               'sources': {'type': 'array', 'items': SOURCE}}}},
            'analysis': WITH_SRC('قراءة تحليلية للدائرة، رأي تحريري مبني على الأخبار المذكورة'),
            'technical': WITH_SRC('قراءة فنية مبسطة لأرقام السوق إن وُجدت، وإلا فاترك ar و en فارغين و src فارغة'),
            'outlook': {'type': 'array', 'description': 'نقطتان أو ثلاث: ما يُتوقع أن يترتب على أخبار اليوم', 'items': WITH_SRC('توقع')},
            'markets': {'type': 'array', 'description': 'أرقام السوق الموثقة فقط، وقد تكون فارغة', 'items': {
                'type': 'object', 'additionalProperties': False, 'required': ['ar', 'en', 'value', 'unit', 'chg', 'dir', 'note', 'source'],
                'properties': {'ar': {'type': 'string'}, 'en': {'type': 'string'}, 'value': {'type': 'string'}, 'unit': BI,
                               'chg': {'type': 'string', 'description': 'التغير مثل +0.4% أو فارغ'},
                               'dir': {'type': 'string', 'enum': ['up', 'down', 'flat']}, 'note': BI, 'source': SOURCE}}},
            'roadmap': {'type': 'array', 'description': 'مواعيد مقررة قادمة لها مصدر', 'items': {
                'type': 'object', 'additionalProperties': False, 'required': ['date', 'ar', 'en', 'scn_ar', 'scn_en', 'source'],
                'properties': {'date': {'type': 'string', 'description': 'YYYY-MM-DD'}, 'ar': {'type': 'string'}, 'en': {'type': 'string'},
                               'scn_ar': {'type': 'string', 'description': 'سيناريو متوقع أو فارغ'}, 'scn_en': {'type': 'string'}, 'source': SOURCE}}},
        },
    },
}

REPORTER_SYSTEM = """أنت مراسل في «خبر»، خلاصة أخبار يومية للقارئ في قطر. تكتب دائرة واحدة من دوائر الخلاصة.

قاعدة «خبر» التي لا استثناء لها: لا خبر ولا عنوان ولا رقم ولا معلومة دون مصدر موثّق ورابطه الأصلي. ما لم تقرأه بنفسك في مقال فتحته لا يُكتب.

طريقة العمل:
- ابحث بالعربية والإنجليزية عن أخبار آخر 12 إلى 24 ساعة، وافتح المقالات نفسها بأداة web_fetch قبل أن تكتب عنها. نتيجة البحث وحدها لا تكفي لرقم أو تفصيل.
- فضّل المصادر الرسمية (وكالات الأنباء الرسمية، المواقع الحكومية، البنوك المركزية) والصحف المعتمدة. اجمع للخبر الواحد كل مصادره المستقلة التي قرأتها.
- الرابط هو رابط المقال نفسه كما ظهر لك، لا رابط تحويل (news.google.com وغيره) ولا صفحة رئيسية ولا رابط تخمّنه.
- quote جملة منقولة حرفياً من نص المقال (بلغته) تحمل جوهر الخبر وأرقامه. سيُقارن آلياً بنص الصفحة، وكل اقتباس لا يطابق يُسقط مصدره.
- كل رقم في نصك يجب أن يظهر في اقتباس أو نص مصدر الخبر نفسه، بالأرقام اللاتينية.
- الصياغة عربية رصينة موجزة بأسلوبك لا بنقل حرفي، وفقرة الخبر من جملتين إلى أربع، مع ترجمة إنجليزية دقيقة. التواريخ بصيغة «25 أكتوبر 2026».
- افصل الخبر عن الرأي: analysis رأي تحريري، وoutlook توقع صريح، وكلاهما يحيل إلى أرقام الأخبار التي بُني عليها.
- لا تكرر خبراً نُشر في الخلاصة السابقة إلا إن جدّ فيه جديد، وحينها اكتب الجديد.
- إن لم تجد مصدراً لمعلومة فاحذفها. خمسة أخبار موثّقة خير من تسعة فيها خبر واحد بلا سند.

حين تنتهي، استدعِ أداة submit_zone مرة واحدة بالنتيجة كاملة."""

CHECK_SYSTEM = """أنت مدقق حقائق مستقل في «خبر». لكل خبر تُعطى نصه واقتباسات حرفية من مصادره.
احكم: supported إن كانت الاقتباسات تسند كل ادعاء ورقم في النص، partial إن أسندت جوهره وفيه تفصيل ثانوي غير مسنود، unsupported إن كان الجوهر أو أي رقم غير مسنود أو مخالف.
اكتب السبب بالعربية في جملة قصيرة. لا تستعمل معرفتك الخاصة، احكم بالاقتباسات وحدها."""


# ---------------------------------------------------------------- reporter
def collect_evidence(content, seen, docs):
    """يسجّل كل رابط ظهر في نتائج البحث أو الجلب، ونص كل صفحة جُلبت."""
    for b in content:
        d = b.model_dump() if hasattr(b, 'model_dump') else b
        t = d.get('type')
        if t == 'web_search_tool_result':
            c = d.get('content')
            for r in c if isinstance(c, list) else []:
                if r.get('url'):
                    seen.add(norm_url(r['url']))
        elif t == 'web_fetch_tool_result':
            c = d.get('content') or {}
            if c.get('type') == 'web_fetch_result' and c.get('url'):
                seen.add(norm_url(c['url']))
                doc = (c.get('content') or {}).get('source') or {}
                data = doc.get('data') if isinstance(doc.get('data'), str) else ''
                docs[norm_url(c['url'])] = V.strip_html(data) if '<' in data[:200] else data
        elif t == 'server_tool_use' and d.get('name') == 'web_fetch':
            pass


def reporter(zone, ctx):
    Z = ZONES[zone]
    leads = '\n'.join(f"- {h['title']} ({h['source']}، {h['date']})" for lang in ('ar', 'en')
                      for h in (ctx['headlines'].get(zone, {}).get(lang) or [])[:8])
    prev = '\n'.join(f"- {i['ar'][:140]}" for z in ctx['prev'].get('zones', []) if z['id'] == zone for i in z['items'])
    market = f"\nأرقام السوق المطلوبة في هذه الدائرة: {MARKETS[zone]}، بآخر قيمة منشورة موثقة ومصدرها." if zone in MARKETS else '\nلا أرقام سوق مطلوبة في هذه الدائرة (اترك markets فارغة).'
    prompt = (f"الدائرة: {Z['ar']}. المحاور: {Z['focus']}.\n"
              f"الوقت الآن: {ctx['now']:%Y-%m-%d %H:%M} بتوقيت الدوحة، والخلاصة: {ctx['edition_ar']}.{market}\n\n"
              f"خيوط أولى من عناوين آلية (للاسترشاد فقط، لا تُنقل دون فتح المقال الأصلي):\n{leads or '- لا شيء'}\n\n"
              f"أخبار الخلاصة السابقة في هذه الدائرة (لا تكررها إلا بجديد):\n{prev or '- لا شيء'}\n\n"
              "اكتب 5 إلى 9 أخبار، ثم التحليل والاستقراء، والمواعيد القادمة المقررة التي صادفتها بمصادرها.")
    tools = [
        {'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': 10,
         'user_location': {'type': 'approximate', 'city': 'Doha', 'country': 'QA', 'timezone': 'Asia/Qatar'}},
        {'type': 'web_fetch_20260209', 'name': 'web_fetch', 'max_uses': 14, 'max_content_tokens': 9000},
        SUBMIT_ZONE,
    ]
    messages = [{'role': 'user', 'content': prompt}]
    seen, docs = set(), {}
    for turn in range(10):
        with client.beta.messages.stream(
            model=MODEL, max_tokens=64000, system=REPORTER_SYSTEM, tools=tools, messages=messages,
            thinking={'type': 'adaptive'}, output_config={'effort': EFFORT},
            cache_control={'type': 'ephemeral'}, **FALLBACK,
        ) as s:
            resp = s.get_final_message()
        account(resp.model or MODEL, resp.usage)
        collect_evidence(resp.content, seen, docs)
        sub = next((b for b in resp.content if b.type == 'tool_use' and b.name == 'submit_zone'), None)
        if sub:
            log(zone, f'سلّم بعد {turn + 1} دورة، روابط رآها: {len(seen)}، صفحات قرأها: {len(docs)}')
            return {'zone': zone, 'data': sub.input, 'seen': seen, 'docs': docs}
        if resp.stop_reason == 'refusal':
            raise RuntimeError(f'{zone}: refusal')
        messages.append({'role': 'assistant', 'content': resp.content})
        if resp.stop_reason == 'pause_turn':
            continue
        # the model stopped without submitting: ask once more, explicitly
        messages.append({'role': 'user', 'content': 'سلّم النتيجة الآن عبر أداة submit_zone بما تحقق منه فقط.'})
    raise RuntimeError(f'{zone}: لم يسلّم المراسل نتيجة')


# ---------------------------------------------------------------- gates
def quote_ok(quote, doc):
    if not doc:
        return None  # page not fetched in this run: cannot compare
    q, d = squash(quote), squash(doc)
    if len(q) < 12:
        return False
    if q[:60] in d:
        return True
    words = [w for w in re.findall(r'\w+', q) if len(w) > 2]
    hit = sum(w in d for w in words) / max(1, len(words))
    return hit >= 0.8 and all(n in V.page_numbers(doc) for n in V.numbers(quote))


def source_gate(src, seen, docs, today):
    url = norm_url(src.get('url'))
    if not url.startswith('https://'):
        return 'الرابط ليس https'
    if any(r in url for r in V.REDIRECTORS):
        return 'رابط تحويل وليس الرابط الأصلي'
    if url not in seen:
        return 'رابط لم يظهر في نتائج البحث أو الجلب (يُحتمل أنه مُخمَّن)'
    d = src.get('date', '')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', d):
        return 'تاريخ نشر غير صالح'
    if d > today.isoformat() or (today - dt.date.fromisoformat(d)).days > 7:
        return 'تاريخ النشر خارج نافذة الأسبوع'
    if quote_ok(src.get('quote', ''), docs.get(url)) is False:
        return 'الاقتباس غير موجود في نص الصفحة المجلوبة'
    return None


def gate_zone(r, today, dropped):
    out = []
    for n, it in enumerate(r['data']['items'], 1):
        good, reasons = [], []
        for s in it['sources']:
            why = source_gate(s, r['seen'], r['docs'], today)
            (reasons.append(f"{s.get('name_ar')}: {why}") if why else good.append(s))
        if not good:
            dropped.append({'zone': r['zone'], 'stage': 'بوابة المصدر', 'text': it['ar'][:180], 'reason': '؛ '.join(reasons) or 'بلا مصدر'})
            continue
        evidence = ' '.join([s['quote'] for s in good] + [r['docs'].get(norm_url(s['url']), '') for s in good])
        pool = V.page_numbers(evidence)
        unseen = [x for x in V.numbers(it['ar']) if x not in pool and x.rstrip('0').rstrip('.') not in pool]
        out.append({'n': n, 'item': it, 'sources': good, 'unseen': unseen, 'rejected': reasons})
    return out


def fact_check(cands, dropped):
    """مدقق مستقل بنموذج آخر، يحكم بالاقتباسات وحدها."""
    if not cands:
        return cands
    payload = [{'id': i, 'text': c['item']['ar'], 'numbers_not_found_in_sources': c['unseen'],
                'quotes': [f"{s['name_ar']}: {s['quote']}" for s in c['sources']]} for i, c in enumerate(cands)]
    schema = {'type': 'object', 'additionalProperties': False, 'required': ['verdicts'], 'properties': {'verdicts': {
        'type': 'array', 'items': {'type': 'object', 'additionalProperties': False, 'required': ['id', 'verdict', 'reason'],
                                   'properties': {'id': {'type': 'integer'}, 'verdict': {'type': 'string', 'enum': ['supported', 'partial', 'unsupported']},
                                                  'reason': {'type': 'string'}}}}}}
    resp = client.messages.create(
        model=CHECK_MODEL, max_tokens=16000, system=CHECK_SYSTEM,
        messages=[{'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}],
        output_config={'format': {'type': 'json_schema', 'schema': schema}, 'effort': 'high'},
    )
    account(resp.model or CHECK_MODEL, resp.usage)
    if resp.stop_reason == 'refusal':
        log('المدقق امتنع؛ تُحذف الأخبار ذات الأرقام غير المطابقة احتياطاً')
        verdicts = {i: ('unsupported' if c['unseen'] else 'partial', 'لم يكتمل التدقيق') for i, c in enumerate(cands)}
    else:
        text = next(b.text for b in resp.content if b.type == 'text')
        verdicts = {v['id']: (v['verdict'], v['reason']) for v in json.loads(text)['verdicts']}
    kept = []
    for i, c in enumerate(cands):
        verdict, reason = verdicts.get(i, ('unsupported', 'لم يصدر فيه حكم'))
        if verdict == 'unsupported':
            dropped.append({'zone': c['zone'], 'stage': 'المدقق', 'text': c['item']['ar'][:180], 'reason': reason})
            continue
        c['check'] = {'verdict': verdict, 'reason': reason}
        kept.append(c)
    return kept


# ---------------------------------------------------------------- editor
def write_thread(brief):
    lines = [f"[{z['id']}:{i['id']}] {i['ar']}" for z in brief['zones'] for i in z['items']]
    schema = {'type': 'object', 'additionalProperties': False, 'required': ['ar', 'en', 'ids'],
              'properties': {'ar': {'type': 'string'}, 'en': {'type': 'string'}, 'ids': {'type': 'array', 'items': {'type': 'string'}}}}
    resp = client.beta.messages.create(
        model=MODEL, max_tokens=16000,
        system='أنت رئيس تحرير «خبر». اكتب «خيط اليوم»: فقرة واحدة من 3 إلى 5 جمل تربط أهم ما في الخلاصة من قطر إلى العالم، مبنية على الأخبار المعطاة وحدها دون أي معلومة أو رقم من خارجها، مع ترجمتها الإنجليزية، وأرقام الأخبار التي استندت إليها (مثل q1).',
        messages=[{'role': 'user', 'content': '\n'.join(lines)}],
        output_config={'format': {'type': 'json_schema', 'schema': schema}, 'effort': 'medium'}, **FALLBACK,
    )
    account(resp.model or MODEL, resp.usage)
    t = json.loads(next(b.text for b in resp.content if b.type == 'text'))
    by_id = {i['id']: i for z in brief['zones'] for i in z['items']}
    src = list(dict.fromkeys(s for x in t['ids'] if x in by_id for s in by_id[x]['src']))
    return {'ar': t['ar'], 'en': t['en'], 'src': src or [s for z in brief['zones'][:1] for i in z['items'][:2] for s in i['src']]}


# ---------------------------------------------------------------- assemble
def assemble(ctx, results, kept, dropped):
    now, today = ctx['now'], ctx['now'].date()
    sources, zones, markets, roadmap = {}, [], [], []

    def add_source(s, key):
        url = s['url'].strip()
        for k, v in sources.items():
            if norm_url(v['url']) == norm_url(url):
                return k
        sources[key] = {'ar': s['name_ar'].strip(), 'en': s['name_en'].strip(), 'date': s['date'], 'url': url}
        return key

    for zone in ZONES:
        r = results.get(zone)
        Z = ZONES[zone]
        z = {'id': zone, 'name': {'ar': Z['ar'], 'en': Z['en']}, 'items': []}
        num_to_id = {}
        for c in [c for c in kept if c['zone'] == zone]:
            iid = f"{Z['k']}{len(z['items']) + 1}"
            num_to_id[c['n']] = iid
            src = [add_source(s, f"{iid}-{j + 1}") for j, s in enumerate(c['sources'])]
            z['items'].append({'id': iid, 'cat': c['item']['cat'], 'ar': c['item']['ar'].strip(), 'en': c['item']['en'].strip(),
                               'src': list(dict.fromkeys(src)), 'check': c['check']['verdict']})
        if r and z['items']:
            d = r['data']
            ref = lambda nums: list(dict.fromkeys(s for n in nums if n in num_to_id for i in z['items'] if i['id'] == num_to_id[n] for s in i['src']))
            a = d['analysis']
            if a['ar'] and ref(a['src']):
                z['analysis'] = {'ar': a['ar'], 'en': a['en'], 'src': ref(a['src'])}
            tch = d['technical']
            if tch['ar'] and ref(tch['src']):
                z['technical'] = {'ar': tch['ar'], 'en': tch['en'], 'src': ref(tch['src'])}
            z['outlook'] = [{'ar': o['ar'], 'en': o['en'], 'src': ref(o['src'])} for o in d['outlook'] if ref(o['src'])]
            for m in d['markets']:
                why = source_gate(m['source'], r['seen'], r['docs'], today)
                if why:
                    dropped.append({'zone': zone, 'stage': 'بوابة المصدر', 'text': f"{m['ar']} {m['value']}", 'reason': why})
                    continue
                pool = V.page_numbers(m['source']['quote'] + ' ' + r['docs'].get(norm_url(m['source']['url']), ''))
                if not V.numbers(m['value']) or any(x not in pool for x in V.numbers(m['value'])):
                    dropped.append({'zone': zone, 'stage': 'مطابقة الأرقام', 'text': f"{m['ar']} {m['value']}", 'reason': 'القيمة لا تظهر في المصدر'})
                    continue
                k = add_source(m['source'], f"m{len(markets) + 1}")
                markets.append({'ar': m['ar'], 'en': m['en'], 'value': m['value'], 'unit': m['unit'], 'chg': m['chg'],
                                'dir': m['dir'], 'note': m['note'], 'src': [k]})
            for e in d['roadmap']:
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', e['date']) or e['date'] < today.isoformat():
                    continue
                if source_gate(e['source'], r['seen'], r['docs'], today):
                    continue
                k = add_source(e['source'], f"r-{zone}-{len(roadmap) + 1}")
                ev = {'date': e['date'], 'zone': zone, 'ar': e['ar'], 'en': e['en'], 'src': [k]}
                if e['scn_ar']:
                    ev['scn'] = {'ar': e['scn_ar'], 'en': e['scn_en']}
                roadmap.append(ev)
        zones.append(z)

    # carry forward upcoming roadmap events (and their sources) from the previous brief
    prev = ctx['prev']
    for e in prev.get('roadmap', []):
        when = e.get('date') or e.get('month', '')
        if when and when < today.isoformat()[:len(when)]:
            continue
        if any(x['date'] == e.get('date') and x['zone'] == e.get('zone') for x in roadmap):
            continue
        e = dict(e)
        e['src'] = [add_source({'name_ar': prev['sources'][s]['ar'], 'name_en': prev['sources'][s]['en'], 'date': prev['sources'][s]['date'],
                                'url': prev['sources'][s]['url']}, f"r-prev-{s}") for s in e.get('src', []) if s in prev.get('sources', {})]
        if e['src']:
            roadmap.append(e)

    edition = ctx['edition']
    brief = {'id': f"{today.isoformat()}-{edition}", 'edition': edition, 'date': today.isoformat(),
             'published': now.isoformat(timespec='seconds'),
             'title': {'ar': ctx['edition_ar'], 'en': 'Morning Brief' if edition == 'am' else 'Evening Brief'},
             'thread': {'ar': '', 'en': '', 'src': []}, 'markets': markets, 'zones': zones,
             'roadmap': sorted(roadmap, key=lambda x: x.get('date') or x.get('month') or '9999'), 'sources': sources,
             'agent': {'model': MODEL, 'checker': CHECK_MODEL}}
    brief['thread'] = write_thread(brief)
    return brief


def publish(brief, run):
    rep = V.verify(brief, offline=True)
    if rep['dropped']:
        brief = V.enforce(brief, rep)
    n = sum(len(z['items']) for z in brief['zones'])
    if n < 8:
        raise RuntimeError(f'نجا {n} خبراً فقط من بوابات التحقق؛ لن تُنشر خلاصة ناقصة وتبقى السابقة.')
    body = json.dumps(brief, ensure_ascii=False, indent=1) + '\n'
    (DATA / 'brief.json').write_text(body, encoding='utf-8')
    (DATA / 'archive' / f"{brief['id']}.json").write_text(body, encoding='utf-8')
    idx_p = DATA / 'archive' / 'index.json'
    idx = json.loads(idx_p.read_text(encoding='utf-8')) if idx_p.exists() else {'briefs': []}
    idx['briefs'] = [b for b in idx['briefs'] if b['id'] != brief['id']] + [{'id': brief['id'], 'date': brief['date'], 'edition': brief['edition'], 'items': n}]
    idx_p.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    rep = V.verify(brief, offline=False)
    V.write_ledger(brief, rep, run)
    log(f"نُشرت {brief['id']}: {n} خبراً، {len(brief['sources'])} مصدراً.")


def run_brief():
    t0 = time.time()
    now = V.now_doha()
    edition = 'am' if now.hour < 12 else 'pm'
    ctx = {'now': now, 'edition': edition, 'edition_ar': 'خلاصة الصباح' if edition == 'am' else 'خلاصة المساء',
           'headlines': json.loads((DATA / 'headlines.json').read_text(encoding='utf-8')),
           'prev': json.loads((DATA / 'brief.json').read_text(encoding='utf-8'))}
    if ctx['prev'].get('id') == f"{now.date().isoformat()}-{edition}" and not os.environ.get('KHABAR_FORCE'):
        log('خلاصة هذه الفترة منشورة بالفعل؛ لا شيء يُفعل.')
        return
    results, dropped = {}, []
    with cf.ThreadPoolExecutor(4) as ex:
        futs = {ex.submit(reporter, z, ctx): z for z in ZONES}
        for f in cf.as_completed(futs):
            try:
                results[futs[f]] = f.result()
            except Exception as e:
                log('تعذّر على مراسل', futs[f], e)
    cands = []
    for zone, r in results.items():
        for c in gate_zone(r, now.date(), dropped):
            c['zone'] = zone
            cands.append(c)
    kept = fact_check(cands, dropped)
    brief = assemble(ctx, results, kept, dropped)
    run = {'at': now.isoformat(timespec='seconds'), 'mode': 'brief', 'brief': brief['id'], 'model': MODEL, 'checker': CHECK_MODEL,
           'seconds': round(time.time() - t0), 'zones_ok': sorted(results), 'proposed': sum(len(r['data']['items']) for r in results.values()),
           'published': sum(len(z['items']) for z in brief['zones']), 'dropped': len(dropped),
           'searches': USAGE['searches'], 'fetches': USAGE['fetches'],
           'tokens': {k: USAGE[k] for k in ('input', 'output', 'cache_read', 'cache_write')}, 'usd': round(USAGE['usd'], 3),
           'dropped_items': dropped}
    publish(brief, run)
    log(f"الكلفة التقديرية: {USAGE['usd']:.2f} دولار، بحث {USAGE['searches']}، جلب {USAGE['fetches']}.")


# ---------------------------------------------------------------- breaking
RSS = [('ar', 'hl=ar&gl=QA&ceid=QA:ar', 'عاجل OR قطر OR الخليج OR مصر when:1h'),
       ('en', 'hl=en-QA&gl=QA&ceid=QA:en', '(breaking OR Qatar OR Gulf OR Egypt OR "Middle East") when:1h')]


def recent_headlines():
    out = []
    for lang, loc, q in RSS:
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(q)}&{loc}"
        try:
            xml = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': V.UA}), timeout=20).read().decode('utf-8', 'replace')
        except Exception as e:
            log('RSS', lang, e)
            continue
        for it in xml.split('<item>')[1:40]:
            g = lambda t: V.html.unescape(re.sub(r'<!\[CDATA\[|\]\]>', '', (re.search(f'<{t}[^>]*>(.*?)</{t}>', it, re.S) or [None, ''])[1])).strip()
            title, source = g('title'), g('source')
            if source and title.endswith(' - ' + source):
                title = title[:-(len(source) + 3)]
            if title and source:
                out.append({'title': title, 'source': source, 'date': g('pubDate')})
    return out


def run_breaking():
    t0 = time.time()
    now = V.now_doha()
    path = DATA / 'breaking.json'
    cur = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'on': False}
    if cur.get('on') and cur.get('until') and dt.datetime.fromisoformat(cur['until']) < now:
        cur = {'on': False, 'last': cur}
        path.write_text(json.dumps(cur, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        log('انتهت مدة العاجل السابق.')
    heads = recent_headlines()
    if len(heads) < 3:
        return
    # 1) cheap screen on headlines only
    schema = {'type': 'object', 'additionalProperties': False, 'required': ['found', 'event', 'indices'],
              'properties': {'found': {'type': 'boolean'}, 'event': {'type': 'string'}, 'indices': {'type': 'array', 'items': {'type': 'integer'}}}}
    listing = '\n'.join(f"{i}. {h['title']} — {h['source']}" for i, h in enumerate(heads))
    resp = client.messages.create(
        model=CHECK_MODEL, max_tokens=4000,
        system=('أنت راصد العاجل في «خبر» (قطر والخليج ومصر والعالم). من العناوين التالية، هل يوجد حدث واحد عاجل فعلاً '
                '(قرار سيادي، كارثة، تطور أمني كبير، إعلان اقتصادي مفصلي) تتناقله 3 جهات مختلفة على الأقل؟ '
                'لا تعدّ الأخبار العادية أو الرياضية أو التحليلات عاجلاً. أعد أرقام عناوينه. العاجل الحالي: ' + (cur.get('text_ar') or 'لا يوجد')
                + '. إن كان الحدث هو نفسه العاجل الحالي فأجب found=false.'),
        messages=[{'role': 'user', 'content': listing}],
        output_config={'format': {'type': 'json_schema', 'schema': schema}, 'effort': 'low'},
    )
    account(resp.model or CHECK_MODEL, resp.usage)
    s = json.loads(next(b.text for b in resp.content if b.type == 'text'))
    outlets = {heads[i]['source'] for i in s['indices'] if 0 <= i < len(heads)}
    if not s['found'] or len(outlets) < 3:
        log('لا عاجل.', f"{USAGE['usd']:.4f}$")
        return
    # 2) escalate: the main model confirms on the web and returns original links
    log('مرشح عاجل:', s['event'], '— تصعيد للتحقق')
    sch = {'type': 'object', 'additionalProperties': False, 'required': ['confirmed', 'ar', 'en', 'sources'], 'properties': {
        'confirmed': {'type': 'boolean'}, 'ar': {'type': 'string', 'description': 'نص العاجل بالعربية في سطر واحد لا يتجاوز 160 حرفاً'},
        'en': {'type': 'string'}, 'sources': {'type': 'array', 'items': SOURCE}}}
    messages = [{'role': 'user', 'content': f"تحقق من هذا الحدث العاجل بالبحث وفتح المقالات الأصلية: {s['event']}\nالعناوين:\n"
                 + '\n'.join(f"- {heads[i]['title']} ({heads[i]['source']})" for i in s['indices'] if 0 <= i < len(heads))
                 + '\nأكّده فقط إن وجدت مصدرين مستقلين على الأقل بروابطهما الأصلية واقتباس حرفي من كل منهما.'}]
    seen, docs = set(), {}
    for _ in range(4):
        resp = client.beta.messages.create(
            model=MODEL, max_tokens=16000, messages=messages,
            tools=[{'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': 4},
                   {'type': 'web_fetch_20260209', 'name': 'web_fetch', 'max_uses': 4, 'max_content_tokens': 6000}],
            output_config={'format': {'type': 'json_schema', 'schema': sch}, 'effort': 'medium'}, **FALLBACK,
        )
        account(resp.model or MODEL, resp.usage)
        collect_evidence(resp.content, seen, docs)
        if resp.stop_reason != 'pause_turn':
            break
        messages.append({'role': 'assistant', 'content': resp.content})
    txt = next((b.text for b in reversed(resp.content) if b.type == 'text'), '')
    try:
        c = json.loads(txt)
    except Exception:
        log('لم يُؤكَّد العاجل.')
        return
    good = [x for x in c['sources'] if not source_gate(x, seen, docs, now.date())]
    if not c['confirmed'] or len({V.outlet(x['url']) for x in good}) < 2:
        log('لم يجتز العاجل بوابة المصدرين المستقلين.')
        return
    data = {'on': True, 'auto': True, 'text_ar': c['ar'][:220], 'text_en': c['en'][:220],
            'sources': [{'ar': x['name_ar'], 'en': x['name_en'], 'date': x['date'], 'url': x['url']} for x in good[:4]],
            'at': now.isoformat(timespec='seconds'), 'until': (now + dt.timedelta(hours=6)).isoformat(timespec='seconds')}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    log('نُشر عاجل:', data['text_ar'], f"({round(time.time() - t0)} ث، {USAGE['usd']:.3f}$)")


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'brief'
    {'brief': run_brief, 'breaking': run_breaking}[mode]()
