/* مشوار من منجز — تطبيق الملاحة */
(() => {
  'use strict';
  const CFG = Object.assign({ API: '', SITE: 'https://munjiz-qa.github.io/mishwar/' }, window.MISHWAR_CONFIG || {});
  const MZ = Object.assign({ WHATSAPP: '97451600498', PHONE: '+974 5160 0498', EMAIL: 'munijizqa@gmail.com' }, window.MUNJIZ_CONFIG || {});
  const D = 'data/';
  const ON_SITE = /munjiz-qa\.github\.io$/.test(location.hostname);
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const PLUG = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const FEED = ON_SITE || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !NATIVE ? 'feed.json' : CFG.SITE + 'feed.json';

  // جهات حكومية: الاسم، المنطقة، بداية الدوام، نهاية الدوام، خط العرض، خط الطول، الهاتف
  const GOV = [
    ['وزارة التجارة والصناعة', 'لوسيل', '07:00', '14:00', 25.3960942, 51.5186259, '+974 4042 2222'],
    ['غرفة قطر', 'لوسيل', '07:00', '14:00', 25.4178875, 51.5028906, '+974 4455 9111'],
    ['مركز قطر للمال', 'لوسيل', '08:00', '16:00', 25.416274, 51.5019306, '+974 4496 7777'],
    ['الهيئة العامة للضرائب', 'الكورنيش', '08:00', '13:00', 25.3171288, 51.5218026, '+974 4406 9941'],
    ['وزارة العمل', 'الدفنة', '08:00', '12:30', 25.3267458, 51.5331358, '+974 4406 8979'],
    ['وزارة البلدية', 'الدفنة', '07:00', '14:00', 25.3263208, 51.5337348, ''],
    ['وزارة العدل', 'الدفنة', '07:00', '14:00', 25.3217107, 51.5281311, '+974 4021 5555'],
    ['وزارة الصحة العامة', 'الرميلة', '07:30', '13:30', 25.2968816, 51.5089229, '+974 4407 0000'],
    ['الإدارة العامة للدفاع المدني', 'الدوحة', '06:00', '13:00', 25.3086964, 51.4988572, ''],
    ['مركز خدمات الداخلية – سوق واقف', 'سوق واقف', '08:00', '13:00', 25.2868584, 51.5330837, ''],
    ['مركز خدمات الداخلية – مسيمير', 'مسيمير', '07:00', '12:30', 25.23495, 51.5093694, '+974 4489 0212'],
    ['مركز خدمات الداخلية – الوكرة', 'الوكرة', '07:00', '12:30', 25.1711309, 51.6032026, '+974 4464 0699']
  ];
  const DEFAULT_START = { lat: 25.294072, lon: 51.525661, label: 'كورنيش الدوحة' };

  // نوع البلاغ: الاسم، اللون، الأيقونة، أثره على السيارة بالثواني (Infinity = تجنّب)، أثره على المشي والدراجة، نصف القطر بالمتر
  const RT = {
    crash: ['حادث', '#d9473a', 'M12 3l9 16H3L12 3zm0 6v4m0 3v.01', 240, 0, 60],
    jam: ['زحام', '#e39a1d', 'M5 16h14M6 16l1.5-5h9L18 16M8 19v-3m8 3v-3', 300, 0, 80],
    closed: ['طريق مغلق', '#8a1f3d', 'M4 9h16v5H4zM7 14v6m10-6v6M8 9l3 5m2-5l3 5', Infinity, Infinity, 35],
    works: ['أعمال طرق', '#e0761f', 'M4 20h16M7 20l3-12h4l3 12M9 14h6M12 4v2', 150, 0, 60],
    flood: ['تجمّع مياه', '#2f7cf6', 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z', 400, 200, 60],
    stalled: ['مركبة متعطلة', '#7b5a3a', 'M5 13l2-5h10l2 5M4 13h16v4H4zM12 3v2', 60, 0, 40],
    hazard: ['خطر على الطريق', '#b8862a', 'M12 2l10 18H2L12 2zm0 7v5m0 3v.01', 60, 0, 40],
    police: ['دورية شرطة', '#3d5a99', 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z', 0, 0, 40],
    camera: ['كاميرا سرعة', '#0f2a3d', 'M4 8h11l3-2v10l-3-2H4zM8 16l-2 4', 0, 0, 30]
  };
  const I = {
    car: 'M5 13l2-5h10l2 5M4 13h16v4H4zM7 17v2m10-2v2',
    foot: 'M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M12 15l-1-5 4 1 2 3M11 10l-3 2-1 3',
    bike: 'M6 17a3 3 0 1 0 0 .01M18 17a3 3 0 1 0 0 .01M6 17l4-7h5l3 7M10 10l-1-3H7m8 3l-2 7',
    loc: 'M12 2v3m0 14v3M2 12h3m14 0h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
    street: 'M12 5a2 2 0 1 0 0 .01M9 21l1.5-7L8 12l2-4h4l2 4-2.5 2L15 21',
    report: 'M12 3l9 16H3L12 3zm0 6v4m0 3v.01',
    vol: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12', mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6l-5 6',
    close: 'M6 6l12 12M18 6L6 18', home: 'M3 11l9-7 9 7v9H3zM9 20v-6h6v6', work: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
    gov: 'M3 21h18M5 21V10m14 11V10M9 21V10m6 11V10M3 10l9-6 9 6z', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2',
    recent: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2', share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5', shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
    ok: 'M5 12l5 5 9-10', warn: 'M12 3l9 16H3L12 3zm0 6v4m0 3v.01', rain: 'M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4 4 0 0 1 17 16M8 19l-1 2m5-2l-1 2m5-2l-1 2',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6', phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', wa: 'M4 20l1.5-4A8 8 0 1 1 8 18.5zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8a5 5 0 0 1-2.3-2.3l.8-1-1-2z',
    info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    cloud: 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18z', fog: 'M4 10h16M3 14h18M5 18h14M7 6h10', wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
    storm: 'M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4 4 0 0 1 17 15M12 13l-2 4h3l-2 4'
  };
  const TURN = {
    straight: 'M12 20V5m-5 5l5-5 5 5', 'slight-right': 'M9 20v-7l6-6m-5 0h5v5', 'slight-left': 'M15 20v-7L9 7m5 0H9v5',
    right: 'M7 20v-8a3 3 0 0 1 3-3h9m-4-4l4 4-4 4', left: 'M17 20v-8a3 3 0 0 0-3-3H5m4-4L5 9l4 4',
    'sharp-right': 'M7 4v9l9 7m0-5v5h-5', 'sharp-left': 'M17 4v9l-9 7m0-5v5h5', uturn: 'M8 20V9a4 4 0 0 1 8 0v4m-4 0l4 4 4-4',
    roundabout: 'M12 21v-5M12 7a4 4 0 1 0 0 .01M15 6l3-3m0 4V3h-4', depart: 'M12 20V5m-5 5l5-5 5 5',
    arrive: 'M12 2a6 6 0 0 0-6 6c0 5 6 12 6 12s6-7 6-12a6 6 0 0 0-6-6zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z'
  };
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const RANKS = [[0, 'مستكشف'], [15, 'رفيق الطريق'], [50, 'دليل الحي'], [120, 'حارس الطريق'], [300, 'سفير مشوار']];

  const svg = (d, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/(^|\s)ال/g, '$1').trim();
  const $ = s => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('mishwar-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mishwar-' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const FC = f => ({ type: 'FeatureCollection', features: f });
  const qaNow = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Qatar', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date()); const g = t => (p.find(x => x.type === t) || {}).value; return { h: +g('hour') % 24, m: +g('minute'), wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')) }; };
  const fmtDate = t => { const d = new Date(t); return isNaN(d) ? '' : d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'الآن'; if (m < 60) return 'قبل ' + m + ' د'; const h = Math.floor(m / 60); return h < 24 ? 'قبل ' + h + ' س' : fmtDate(t); };
  const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const clock12 = mins => { const t = ((Math.round(mins) % 1440) + 1440) % 1440; let h = Math.floor(t / 60), m = String(t % 60).padStart(2, '0'); const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return h + ':' + m + ' ' + ap; };

  let map, G, PRO = {}, POI = [], STREETS = [], mode = LS.get('mode', 'car'), start, dest, R = null, ST = null, nav = null, voice = LS.get('voice', true);
  let reports = [], official = [], feed = null, markers = [], startMk, destMk, carMk, meMk, toastT, is3d = true, searchFor = 'dest', tab = LS.get('tab', 'road'), dockOpen = false, penKey = '';
  const me = Object.assign({ pts: 0, reports: 0, confirms: 0, km: 0 }, LS.get('me', {}));

  // ---------- helpers ----------
  function toast(t, action) {
    const el = $('#toast'); el.innerHTML = `<span>${E(t)}</span>` + (action ? `<button id="toastAct">${E(action[0])}</button>` : ''); el.hidden = false;
    if (action) $('#toastAct').onclick = () => { el.hidden = true; action[1](); };
    clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, action ? 5000 : 2800);
  }
  function say(t) {
    if (!voice) return;
    const tts = PLUG().TextToSpeech;
    if (tts) { try { tts.stop().catch(() => {}); tts.speak({ text: t, lang: 'ar-SA', rate: 1, pitch: 1, volume: 1, category: 'playback' }).catch(() => {}); } catch (e) {} return; }
    if (!('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'ar-SA'; const v = speechSynthesis.getVoices().find(v => /^ar/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
  }
  function award(n, why) {
    me.pts += n; LS.set('me', me);
    const r = rank(); toast(`+${n} نقاط ${why} · ${r.name}`);
  }
  function rank() { let i = 0; RANKS.forEach((r, k) => { if (me.pts >= r[0]) i = k; }); const nx = RANKS[i + 1]; return { name: RANKS[i][1], next: nx, p: nx ? Math.round((me.pts - RANKS[i][0]) / (nx[0] - RANKS[i][0]) * 100) : 100 }; }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (x) {} ta.remove(); toast(ok ? done : 'انسخ النص يدوياً'); return ok;
    }
  }
  async function share(title, text, url) {
    const sh = PLUG().Share; if (sh) { try { await sh.share({ title, text, url, dialogTitle: 'مشاركة' }); return; } catch (e) { if (/cancel/i.test(String(e && e.message))) return; } }
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copy(text + (url ? '\n' + url : ''), 'نُسخ النص، الصقه في واتساب أو أي محادثة');
  }

  // ---------- data ----------
  async function loadData(progress) {
    const files = ['graph.bin', 'names.json', 'poi.json', 'land.json', 'bld.json'], out = {}; let done = 0;
    await Promise.all(files.map(async f => { const r = await fetch(D + f); if (!r.ok) throw new Error(f); out[f] = f.endsWith('.bin') ? await r.arrayBuffer() : await r.json(); progress(++done / files.length); }));
    return out;
  }
  const profile = p => PRO[p] || (PRO[p] = MSR.build(G, p));

  const clean = t => String(t || '').replace(/[^\u0000-\u024F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u2000-\u206F\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  function geo(raw) {
    const roads = [], labels = new Map();
    G.ways.forEach(w => {
      const n = G.names[w.nm] || ['', ''];
      roads.push({ type: 'Feature', properties: { r: MSR.ROAD_RANK[w.cls], n: clean(n[0] || n[1]) }, geometry: { type: 'LineString', coordinates: Array.from(w.refs, r => [G.lon[r], G.lat[r]]) } });
      const nm = n[0] || n[1]; if (nm && !labels.has(nm)) { const m = w.refs[w.refs.length >> 1]; labels.set(nm, { name: nm, en: n[1], lat: G.lat[m], lon: G.lon[m] }); }
    });
    STREETS = [...labels.values()];
    const poly = (a, s) => { const r = []; for (let i = s; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
    const bld = raw['bld.json'].map(b => ({ type: 'Feature', properties: { h: b[0] }, geometry: { type: 'Polygon', coordinates: [poly(b, 1)] } }));
    const land = [], muni = [];
    raw['land.json'].land.forEach(m => {
      const rings = m.r.map(r => poly(r, 0)); rings.forEach(rg => land.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [rg] } }));
      const big = rings.sort((a, b) => b.length - a.length)[0];
      if (big) { let x = 0, y = 0; big.forEach(p => { x += p[0]; y += p[1]; }); muni.push({ type: 'Feature', properties: { n: m.n }, geometry: { type: 'Point', coordinates: [x / big.length, y / big.length] } }); }
    });
    const areas = raw['land.json'].areas.map(a => ({ type: 'Feature', properties: { k: a[0] }, geometry: { type: 'Polygon', coordinates: [poly(a, 1)] } }));
    POI = raw['poi.json'].map(p => ({ lat: p[0], lon: p[1], ar: p[2], en: p[3], type: p[4], imp: p[5] }));
    const poiF = POI.filter(p => p.type !== 'منطقة').map(p => ({ type: 'Feature', properties: { n: clean(p.ar || p.en), i: p.imp }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }));
    GOV.forEach(g => poiF.push({ type: 'Feature', properties: { n: g[0], i: 3, g: 1 }, geometry: { type: 'Point', coordinates: [g[5], g[4]] } }));
    const places = POI.filter(p => ['منطقة', 'حي', 'مدينة'].includes(p.type)).map(p => ({ type: 'Feature', properties: { n: (p.ar || p.en).replace(/\s*\(\d+\)/, '') }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }));
    return { roads, bld, land, muni, areas, poiF, places };
  }

  function style(gj) {
    const c = n => css(n) || '#888';
    const width = (b, add = 0) => ['interpolate', ['exponential', 1.5], ['zoom'], 10, ['+', ['*', b, 0.4], add * 0.6], 14, ['+', ['*', b, 1.6], add], 18, ['+', ['*', b, 9], add * 1.4]];
    const W = ['match', ['get', 'r'], 0, 3.2, 1, 2.8, 2, 2.4, 3, 2, 4, 1.7, 5, 1.3, 6, 1, 7, 0.8, 0.5];
    const T = (extra) => Object.assign({ 'text-font': ['m'] }, extra);
    const halo = { 'text-halo-color': c('--m-halo'), 'text-halo-width': 1.6 };
    return {
      version: 8, glyphs: 'mishwar://{fontstack}/{range}',
      sources: {
        land: { type: 'geojson', data: FC(gj.land) }, muni: { type: 'geojson', data: FC(gj.muni) }, areas: { type: 'geojson', data: FC(gj.areas) },
        roads: { type: 'geojson', data: FC(gj.roads), tolerance: 0.45 }, bld: { type: 'geojson', data: FC(gj.bld) }, poi: { type: 'geojson', data: FC(gj.poiF) },
        places: { type: 'geojson', data: FC(gj.places) }, route: { type: 'geojson', data: FC([]) }, done: { type: 'geojson', data: FC([]) }, alt: { type: 'geojson', data: FC([]) }
      },
      layers: [
        { id: 'sea', type: 'background', paint: { 'background-color': c('--m-sea') } },
        { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': c('--m-land') } },
        { id: 'park', type: 'fill', source: 'areas', filter: ['==', ['get', 'k'], 1], paint: { 'fill-color': c('--m-park') } },
        { id: 'water', type: 'fill', source: 'areas', filter: ['==', ['get', 'k'], 0], paint: { 'fill-color': c('--m-water') } },
        { id: 'road-case', type: 'line', source: 'roads', filter: ['<=', ['get', 'r'], 7], minzoom: 11, layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['-', 10, ['get', 'r']] }, paint: { 'line-color': c('--m-casing'), 'line-width': width(W, 1.5) } },
        { id: 'road-path', type: 'line', source: 'roads', filter: ['>', ['get', 'r'], 7], minzoom: 15, paint: { 'line-color': c('--m-casing'), 'line-width': 1.2, 'line-dasharray': [2, 1.5] } },
        { id: 'road', type: 'line', source: 'roads', filter: ['<=', ['get', 'r'], 7], layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['-', 10, ['get', 'r']] }, paint: { 'line-color': ['case', ['<=', ['get', 'r'], 2], c('--m-major'), c('--m-road')], 'line-width': width(W), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, ['case', ['<=', ['get', 'r'], 3], 1, 0], 12, 1] } },
        { id: 'bld', type: 'fill-extrusion', source: 'bld', minzoom: 13, paint: { 'fill-extrusion-color': c('--m-bld'), 'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['get', 'h']], 'fill-extrusion-opacity': 0.88 } },
        { id: 'alt', type: 'line', source: 'alt', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#8a96a6', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 7], 'line-dasharray': [1.5, 1.2], 'line-opacity': .8 } },
        { id: 'done', type: 'line', source: 'done', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#9aa3b5', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 10], 'line-opacity': 0.7 } },
        { id: 'route-case', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 15] } },
        { id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': c('--m-route'), 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4.5, 16, 10] } },
        { id: 'road-label', type: 'symbol', source: 'roads', minzoom: 13, filter: ['all', ['!=', ['get', 'n'], ''], ['<=', ['get', 'r'], 7]], layout: T({ 'symbol-placement': 'line', 'text-field': ['get', 'n'], 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 14], 'symbol-spacing': 320, 'text-max-angle': 30 }), paint: Object.assign({ 'text-color': c('--m-label') }, halo) },
        { id: 'poi', type: 'circle', source: 'poi', minzoom: 13, filter: ['any', ['>=', ['get', 'i'], 2], ['>=', ['zoom'], 16]], paint: { 'circle-radius': ['case', ['==', ['get', 'g'], 1], 6, 4], 'circle-color': ['case', ['==', ['get', 'g'], 1], '#0f2a3d', '#e2b259'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } },
        { id: 'poi-label', type: 'symbol', source: 'poi', minzoom: 13, filter: ['any', ['>=', ['get', 'i'], 2], ['>=', ['zoom'], 16]], layout: T({ 'text-field': ['get', 'n'], 'text-size': ['case', ['==', ['get', 'g'], 1], 13, 11], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true }), paint: Object.assign({ 'text-color': c('--m-label') }, halo) },
        { id: 'places', type: 'symbol', source: 'places', minzoom: 11, maxzoom: 15, layout: T({ 'text-field': ['get', 'n'], 'text-size': 13 }), paint: Object.assign({ 'text-color': c('--ink2') }, halo) },
        { id: 'muni', type: 'symbol', source: 'muni', maxzoom: 11, layout: T({ 'text-field': ['get', 'n'], 'text-size': 16 }), paint: Object.assign({ 'text-color': c('--night') }, halo) }
      ]
    };
  }
  function recolor() {
    if (!map || !map.isStyleLoaded()) return;
    const c = css, set = (l, p, v) => { try { map.setPaintProperty(l, p, v); } catch (e) {} };
    set('sea', 'background-color', c('--m-sea')); set('land', 'fill-color', c('--m-land')); set('park', 'fill-color', c('--m-park')); set('water', 'fill-color', c('--m-water'));
    set('road-case', 'line-color', c('--m-casing')); set('road-path', 'line-color', c('--m-casing')); set('road', 'line-color', ['case', ['<=', ['get', 'r'], 2], c('--m-major'), c('--m-road')]);
    set('bld', 'fill-extrusion-color', c('--m-bld')); set('route', 'line-color', c('--m-route'));
    ['road-label', 'poi-label', 'places', 'muni'].forEach(l => set(l, 'text-halo-color', c('--m-halo')));
    set('road-label', 'text-color', c('--m-label')); set('poi-label', 'text-color', c('--m-label')); set('places', 'text-color', c('--ink2')); set('muni', 'text-color', c('--night'));
  }

  // ---------- shell ----------
  const MARK = `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d5a83"/><stop offset="1" stop-color="#0f2a3d"/></linearGradient></defs><rect width="48" height="48" rx="15" fill="url(#mg)"/><path d="M12 36c4-10 10-4 14-12s10-6 10-12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.1 6.5"/><path d="M12 36c4-10 10-4 14-12s10-6 10-12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".25"/><circle cx="36" cy="12" r="4.6" fill="#e2b259"/><circle cx="12" cy="36" r="3.4" fill="#ef6a4c"/></svg>`;
  function shell() {
    document.body.insertAdjacentHTML('beforeend', `
<div id="map" role="region" aria-label="خريطة قطر"></div>
<div class="ui weather-fx" id="fx" hidden></div>
<div class="ui top" id="top">
  <div class="cap"><button class="mark" id="markBtn" aria-label="عن مشوار">${MARK}</button>
    <div class="qwrap"><input id="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="وين مشوارك اليوم؟" aria-label="ابحث عن وجهة"><button class="from" id="fromBtn">من: <b id="fromT"></b></button></div></div>
  <div class="modes" role="group" aria-label="وسيلة التنقل">
    <button data-mode="car" aria-pressed="false">${svg(I.car)}سيارة</button><button data-mode="foot" aria-pressed="false">${svg(I.foot)}مشي</button><button data-mode="bike" aria-pressed="false">${svg(I.bike)}دراجة</button></div>
  <div class="res" id="res" hidden></div>
</div>
<div class="ui rail" id="rail">
  <button class="fab hide-nav" id="b3d" aria-label="تبديل العرض ثلاثي الأبعاد">3D</button>
  <button class="fab" id="bLoc" aria-label="موقعي">${svg(I.loc)}</button>
  <a class="fab hide-nav" id="bStreet" target="_blank" rel="noopener" aria-label="عرض الشارع">${svg(I.street)}</a>
</div>
<button class="ui report" id="bRep" aria-label="أبلغ عن حدث على الطريق">${svg(I.report, 2.2)}<span class="badge" id="repN" hidden>0</span></button>
<section class="ui dock" id="dock" aria-label="لوحة مشوار"></section>
<div class="ui banner" id="banner" hidden></div>
<div class="ui ask" id="ask" hidden></div>
<button class="ui recenter" id="recenter" hidden>توسيط الخريطة</button>
<div class="ui navbar" id="navbar" hidden></div>
<div class="ui toast" id="toast" role="status" hidden></div>
<div class="ui attr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></div>
<div class="ui load" id="load"><div>${MARK.replace('<svg', '<svg width="72" height="72"')}<h1>مشوار</h1><p>من منجز · جارٍ تحميل خريطة قطر</p><div class="bar"><i id="barI"></i></div></div></div>`);
  }
  function sizeDock() {
    const d = $('#dock'); if (!d || d.hidden) { document.documentElement.style.setProperty('--dock-h', '0px'); return; }
    const wide = innerWidth >= 900; document.documentElement.style.setProperty('--dock-h', wide ? '0px' : Math.min(d.offsetHeight, innerHeight * .5) + 'px');
  }

  // ---------- dock (home) ----------
  function greeting() { const h = qaNow().h; return h < 5 ? 'مساء الخير' : h < 12 ? 'صباح الخير' : h < 17 ? 'نهارك سعيد' : 'مساء الخير'; }
  function activeReports() { const now = Date.now(); return reports.filter(r => now - r.t < 3 * 3600e3 && (r.down || 0) < (r.up || 0) + 2); }
  function wxIcon(c) { return { sun: I.sun, cloud: I.cloud, rain: I.rain, storm: I.storm, fog: I.fog, dust: I.wind, wind: I.wind }[c] || I.sun; }
  function home() {
    if (R || nav) return;
    const d = $('#dock'), act = activeReports(), w = feed && feed.weather;
    const near = start ? act.filter(r => MSR.hav(start.lat, start.lon, r.lat, r.lon) < 8000).length : act.length;
    const places = LS.get('places', {}), recent = LS.get('recent', []);
    const tile = (cls, ic, label, data) => `<button class="tile ${cls}" ${data}><span class="ti">${svg(ic)}</span><span>${E(label)}</span></button>`;
    let tiles = '';
    tiles += places.home ? tile('', I.home, 'البيت', `data-go="${places.home.lat},${places.home.lon}" data-n="البيت"`) : tile('empty', I.home, 'أضف البيت', 'data-set="home"');
    tiles += places.work ? tile('', I.work, 'العمل', `data-go="${places.work.lat},${places.work.lon}" data-n="العمل"`) : tile('empty', I.work, 'أضف العمل', 'data-set="work"');
    recent.slice(0, 3).forEach(r => tiles += tile('', I.recent, r.label, `data-go="${r.lat},${r.lon}" data-n="${E(r.label)}"`));
    GOV.slice(0, 6).forEach(g => tiles += tile('gov', I.gov, g[0].replace('مركز خدمات الداخلية – ', 'الداخلية – '), `data-go="${g[4]},${g[5]}" data-n="${E(g[0])}"`));
    d.innerHTML = `<button class="grip" id="grip" aria-label="${dockOpen ? 'تصغير اللوحة' : 'توسيع اللوحة'}" aria-expanded="${dockOpen}"><i></i></button>
<div class="hello"><h2>${greeting()}</h2>
${w ? `<button class="chip" data-tab="wx">${svg(wxIcon(w.icon))}<b>${Math.round(w.temp)}°</b>${E(w.cond)}</button>` : ''}
<button class="chip" data-tab="road"><i class="dot ${near ? 'hot' : ''}"></i>${near ? `<b>${near}</b> ${near === 1 ? 'بلاغ' : 'بلاغات'} حولك` : 'الطريق هادئ حولك'}</button></div>
<div class="tiles">${tiles}</div>
<div id="more" ${dockOpen ? '' : 'hidden'}>
<div class="tabs" role="tablist">${[['road', 'أحوال الطريق'], ['wx', 'الطقس'], ['me', 'مساهمتي'], ['about', 'عن مشوار']].map(([k, v]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}">${v}</button>`).join('')}</div>
<div class="pane" id="pane">${pane()}</div></div>`;
    d.hidden = false; requestAnimationFrame(sizeDock);
  }
  function pane() {
    const w = feed && feed.weather;
    if (tab === 'road') {
      const act = activeReports().sort((a, b) => b.t - a.t).slice(0, 6);
      const news = (feed && feed.news || []).slice(0, 8);
      const kind = { closure: ['#8a1f3d', I.warn], weather: ['#2f7cf6', I.rain], traffic: ['#e39a1d', I.car], safety: ['#1fa57a', I.shield] };
      let h = '';
      if (w && w.warning) h += `<div class="warn"><b>تنبيه الطقس:</b> ${E(w.warning)}</div>`;
      h += act.length ? act.map(r => `<button class="news" style="text-align:start;cursor:pointer" data-rep-id="${E(r.id)}"><span class="k" style="background:${RT[r.type][1]}">${svg(RT[r.type][2])}</span><span><b>${RT[r.type][0]}${r.street ? ' · ' + E(r.street) : ''}</b><small>${ago(r.t)} · تأكيد ${r.up || 0} · نفي ${r.down || 0}${r.mine ? ' · بلاغك' : ''}</small></span></button>`).join('')
        : `<div class="note">لا بلاغات نشطة الآن. إذا رأيت حادثاً أو إغلاقاً اضغط الزر البرتقالي لتنبيه الآخرين.</div>`;
      if (news.length) h += `<h4 style="margin:6px 0 0;font:600 13px var(--f-display);color:var(--ink2)">من الأخبار المحلية</h4>` + news.map(n => { const k = kind[n.kind] || kind.traffic; return `<a class="news" href="${E(n.link)}" target="_blank" rel="noopener"><span class="k" style="background:${k[0]}">${svg(k[1])}</span><span><b>${E(n.title)}</b><small>${E(n.source || '')}${n.date ? ' · ' + fmtDate(n.date) : ''}</small></span></a>`; }).join('');
      if (feed && feed.updated) h += `<div class="note">يتحدّث الطقس والأخبار تلقائياً كل 30 دقيقة · آخر تحديث ${ago(+new Date(feed.updated))}</div>`;
      return h;
    }
    if (tab === 'wx') {
      if (!w) return '<div class="note">جارٍ جلب حالة الطقس…</div>';
      return `<div class="wx"><div><div class="now">${Math.round(w.temp)}°</div><div class="cond">${E(w.cond)} · رياح ${Math.round(w.wind)} كم/س${w.vis != null ? ' · رؤية ' + (w.vis >= 10 ? '+10' : w.vis) + ' كم' : ''}</div></div>${svg(wxIcon(w.icon), 1.6)}
<div class="days">${(w.days || []).slice(0, 3).map(x => `<div>${E(x.day)}<b>${Math.round(x.hi)}° / ${Math.round(x.lo)}°</b>${E(x.cond)}${x.rain ? ' · مطر ' + x.rain + '%' : ''}</div>`).join('')}</div></div>
${w.warning ? `<div class="warn"><b>تنبيه:</b> ${E(w.warning)}</div>` : ''}
${w.advice && w.advice.length ? `<div class="warn" style="background:var(--card);border-color:var(--line)"><b style="color:var(--night)">نصائح القيادة</b><br>${w.advice.map(E).join('<br>')}</div>` : ''}
<div class="note">المصدر: ${E(w.source || 'Open-Meteo')}، بتوقيت قطر. ${w.impact && w.impact !== 'none' ? 'يضيف مشوار أثر الطقس إلى زمن الرحلة تلقائياً.' : ''}</div>`;
    }
    if (tab === 'me') {
      const r = rank(), b = [['أول بلاغ', me.reports >= 1], ['5 بلاغات', me.reports >= 5], ['10 تأكيدات', me.confirms >= 10], ['50 كم مع مشوار', me.km >= 50], ['حارس الطريق', me.pts >= 120]];
      return `<div class="me"><div class="lvl" style="--p:${r.p}"><span>${me.pts}</span></div><div><h3>${r.name}</h3><p>${r.next ? `باقي ${r.next[0] - me.pts} نقطة لرتبة «${r.next[1]}»` : 'أعلى رتبة في مشوار'}</p><p>بلاغات ${me.reports} · تأكيدات ${me.confirms} · ${Math.round(me.km)} كم</p></div></div>
<div class="badges">${b.map(x => `<span class="${x[1] ? 'on' : ''}">${x[0]}</span>`).join('')}</div>
<div class="note">البلاغ 5 نقاط، وتأكيد بلاغ غيرك نقطتان. نقاطك محفوظة على جهازك.</div>
<button class="btn ghost" data-act="invite">${svg(I.share)}ادعُ أصدقاءك إلى مشوار</button>`;
    }
    return `<p class="note" style="font-size:14px;color:var(--ink)">مشوار تطبيق ملاحة عربي لقطر من <b>منجز لخدمات الأعمال</b>: خريطة ثلاثية الأبعاد، ومسارات للسيارة والمشي والدراجة، وإرشاد صوتي، وبلاغات من السائقين، وطقس وأخبار الطريق.</p>
<div class="contact">
<a href="https://wa.me/${E(MZ.WHATSAPP)}" target="_blank" rel="noopener">${svg(I.wa)}<span>واتساب منجز</span><span class="v" style="margin-inline-start:auto">${E(MZ.PHONE)}</span></a>
<a href="mailto:${E(MZ.EMAIL)}">${svg(I.mail)}<span>البريد</span><span class="v" style="margin-inline-start:auto">${E(MZ.EMAIL)}</span></a>
<a href="tel:${E(MZ.PHONE.replace(/\s/g, ''))}">${svg(I.phone)}<span>اتصال</span><span class="v" style="margin-inline-start:auto">${E(MZ.PHONE)}</span></a>
<a href="${CFG.SITE}../" target="_blank" rel="noopener">${svg(I.gov)}<span>خدمات منجز للمعاملات الحكومية</span></a>
${NATIVE ? '' : `<a href="${CFG.SITE}download.html" ${ON_SITE ? '' : 'target="_blank" rel="noopener"'}>${svg(I.star)}<span>نزّل مشوار على جهازك</span><span class="v" style="margin-inline-start:auto">أندرويد · ويندوز · ماك</span></a>`}
<button data-act="invite">${svg(I.share)}<span>شارك مشوار</span></button></div>
<div class="note">بيانات الطرق والمباني من مساهمي OpenStreetMap للدوحة الكبرى من الوكرة إلى لوسيل. مواقع الجهات الحكومية وأوقات دوامها محدّثة 2026. الطقس من Open-Meteo، والأخبار من الصحافة المحلية عبر أخبار Google. عرض الشارع يفتح الصور الحقيقية في خرائط Google.</div>`;
  }

  // ---------- search ----------
  function results(q) {
    const box = $('#res'), nq = norm(q), dist = (la, lo) => start ? MSR.hav(start.lat, start.lon, la, lo) : 0;
    const row = (t, s, la, lo, ic) => `<button data-la="${la}" data-lo="${lo}" data-n="${E(t)}"><span class="ic">${svg(ic)}</span><span><span class="t">${E(t)}</span><span class="s">${E(s)}</span></span><span class="d">${MSR.fmtDist(dist(la, lo)).replace('الآن', 'قريب')}</span></button>`;
    let h = '';
    if (searchFor === 'start') h += `<button data-me="1"><span class="ic">${svg(I.loc)}</span><span><span class="t">موقعي الحالي</span><span class="s">من نظام تحديد المواقع في جهازك</span></span></button>`;
    if (!nq) {
      const rec = LS.get('recent', []);
      if (rec.length) h += '<h4>آخر وجهاتك</h4>' + rec.slice(0, 4).map(r => row(r.label, 'وجهة سابقة', r.lat, r.lon, I.recent)).join('');
      h += '<h4>جهات حكومية</h4>' + GOV.map(g => row(g[0], g[1] + ' · ' + clock12(hm(g[2])) + ' – ' + clock12(hm(g[3])), g[4], g[5], I.gov)).join('');
    } else {
      const hit = (a, b) => norm(a).includes(nq) || norm(b).includes(nq);
      const g = GOV.filter(x => hit(x[0], x[1])).map(x => row(x[0], x[1], x[4], x[5], I.gov));
      const p = POI.filter(x => hit(x.ar, x.en) || norm(x.type) === nq).sort((a, b) => b.imp - a.imp || dist(a.lat, a.lon) - dist(b.lat, b.lon)).slice(0, 12).map(x => row(x.ar || x.en, [x.type, x.ar && x.en ? x.en : ''].filter(Boolean).join(' · '), x.lat, x.lon, I.star));
      const s = STREETS.filter(x => hit(x.name, x.en)).slice(0, 8).map(x => row(x.name, 'شارع' + (x.en && x.en !== x.name ? ' · ' + x.en : ''), x.lat, x.lon, I.street));
      h += g.join('') + p.join('') + s.join('');
      if (!g.length && !p.length && !s.length) h += '<div class="empty">لا نتائج. جرّب اسماً أقصر، أو اضغط على الخريطة لاختيار النقطة.</div>';
    }
    box.innerHTML = h; box.hidden = false;
  }
  function pick(btn) {
    $('#res').hidden = true; $('#q').blur();
    if (btn.dataset.me) return locate(true);
    const p = { lat: +btn.dataset.la, lon: +btn.dataset.lo, label: btn.dataset.n };
    if (searchFor === 'start') { setFrom(p); searchFor = 'dest'; $('#q').placeholder = 'وين مشوارك اليوم؟'; dest ? plan() : map.flyTo({ center: [p.lon, p.lat], zoom: 15 }); }
    else { $('#q').value = p.label; setDest(p); }
  }
  function setFrom(s, save = true) { start = s; $('#fromT').textContent = s.label; if (save) LS.set('start', s); if (map && !nav) startMk.setLngLat([s.lon, s.lat]).addTo(map); }
  function setDest(p) {
    dest = p; destMk.setLngLat([p.lon, p.lat]).addTo(map);
    const rec = LS.get('recent', []).filter(r => r.label !== p.label); rec.unshift(p); LS.set('recent', rec.slice(0, 6));
    plan();
  }

  // ---------- penalties from reports and official closures ----------
  function penalties(A) {
    const pen = new Map(), cs = A.cs, items = activeReports().concat(official);
    const tags = [];
    items.forEach(r => {
      const t = RT[r.type]; if (!t) return;
      const cost = mode === 'car' ? t[3] : t[4]; if (!cost) return;
      const rad = r.radius || t[5], gi = Math.floor(r.lat / cs), gj = Math.floor(r.lon / cs);
      for (let i = gi - 1; i <= gi + 1; i++) for (let j = gj - 1; j <= gj + 1; j++) {
        const c = A.grid.get(i + ':' + j); if (!c) continue;
        for (const n of c) if (MSR.hav(r.lat, r.lon, G.lat[n], G.lon[n]) < rad) { pen.set(n, Math.max(pen.get(n) || 0, cost)); tags.push(n + ':' + r.id); }
      }
    });
    return { pen, key: mode + '|' + tags.sort().join(',') };
  }
  function weatherFactor() { const i = feed && feed.weather && feed.weather.impact; return mode !== 'car' ? (i === 'rain' || i === 'storm' ? 1.1 : 1) : ({ rain: 1.15, storm: 1.3, fog: 1.2, dust: 1.15 }[i] || 1); }

  // ---------- routing ----------
  function plan(keepNav) {
    if (!start || !dest) return;
    const A = profile(mode), s = MSR.nearest(G, A, start.lat, start.lon), t = MSR.nearest(G, A, dest.lat, dest.lon);
    if (!s || !t) return msgSheet('خارج نطاق الخريطة', 'الوجهة خارج نطاق الطرق المتوفرة حالياً.');
    const { pen, key } = penalties(A);
    let r = MSR.route(G, A, s.node, t.node, pen.size ? pen : null), base = null;
    if (!r) return msgSheet('تعذّر إيجاد مسار', 'لا يوجد طريق متصل بين النقطتين لهذه الوسيلة، أو أن الطرق المؤدية مغلقة الآن. جرّب وسيلة أخرى.');
    if (pen.size) { base = MSR.route(G, A, s.node, t.node); }
    // time on the chosen route including penalties it passes through
    let penT = 0; const hitIds = new Set();
    r.nodes.forEach(n => { const v = pen.get(n); if (v && v !== Infinity) penT += v; });
    activeReports().concat(official).forEach(x => { if (RT[x.type] && r.nodes.some(n => MSR.hav(x.lat, x.lon, G.lat[n], G.lon[n]) < (x.radius || RT[x.type][5]))) hitIds.add(x.id); });
    r.coords = [[start.lon, start.lat]].concat(r.nodes.map(n => [G.lon[n], G.lat[n]]), [[dest.lon, dest.lat]]);
    r.extra = s.dist + t.dist; r.total = r.dist + r.extra;
    const wf = weatherFactor();
    r.ttotal = (r.time - penT) * wf + penT + r.extra / 1.3;
    r.avoided = base && base.nodes.length && base.dist < r.dist - 50 ? activeReports().concat(official).filter(x => base.nodes.some(n => MSR.hav(x.lat, x.lon, G.lat[n], G.lon[n]) < (x.radius || RT[x.type][5]))) : [];
    r.onRoute = [...hitIds]; r.wf = wf;
    R = r; ST = MSR.steps(G, A, r); penKey = key;
    map.getSource('route').setData(FC([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.coords } }]));
    map.getSource('alt').setData(FC(r.avoided.length && base ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: base.nodes.map(n => [G.lon[n], G.lat[n]]) } }] : []));
    map.getSource('done').setData(FC([]));
    if (keepNav) return;
    const b = r.coords.reduce((bb, c) => [[Math.min(bb[0][0], c[0]), Math.min(bb[0][1], c[1])], [Math.max(bb[1][0], c[0]), Math.max(bb[1][1], c[1])]], [[180, 90], [-180, -90]]);
    const wide = innerWidth >= 900;
    map.fitBounds(b, { padding: wide ? { top: 140, bottom: 60, left: 480, right: 80 } : { top: 170, bottom: Math.round(innerHeight * .45), left: 40, right: 70 }, pitch: is3d ? 40 : 0, duration: 900 });
    routeSheet();
  }
  function govFor(p) { return GOV.find(g => Math.abs(g[4] - p.lat) < 1e-4 && Math.abs(g[5] - p.lon) < 1e-4); }
  function officeFact(arriveSec) {
    const g = dest && govFor(dest); if (!g) return '';
    const n = qaNow(), arr = n.h * 60 + n.m + arriveSec / 60, open = hm(g[2]), close = hm(g[3]);
    let day = n.wd, a = arr; if (a >= 1440) { a -= 1440; day = (day + 1) % 7; }
    if (day === 5 || day === 6) return `<div class="fact bad">${svg(I.clock)}الجهة مغلقة يومَي الجمعة والسبت. الدوام من الأحد إلى الخميس ${clock12(open)} – ${clock12(close)}.</div>`;
    if (a < open) return `<div class="fact w">${svg(I.clock)}تصل ${clock12(a)} قبل بدء الدوام بـ ${MSR.fmtDur((open - a) * 60)}. يبدأ الدوام ${clock12(open)}.</div>`;
    if (a > close) return `<div class="fact bad">${svg(I.clock)}تصل بعد انتهاء الدوام (${clock12(close)}). أقرب موعد: ${day === 4 ? 'الأحد' : 'غداً'} ${clock12(open)}.</div>`;
    const left = close - a, latest = close - 30 - arriveSec / 60;
    return `<div class="fact ${left > 45 ? 'ok' : 'w'}">${svg(I.clock)}تصل قبل انتهاء الدوام بـ ${MSR.fmtDur(left * 60)}. ${left > 45 ? `لتبقى لك نصف ساعة على الأقل، انطلق قبل ${clock12(latest)}.` : 'الوقت ضيق، يُفضّل الانطلاق فوراً.'}</div>`;
  }
  function routeSheet() {
    const d = $('#dock'), n = qaNow(), arr = n.h * 60 + n.m + R.ttotal / 60;
    const verb = { car: 'انطلق', foot: 'ابدأ المشي', bike: 'ابدأ الرحلة' }[mode];
    let facts = officeFact(R.ttotal);
    if (R.avoided.length) facts += `<div class="fact ok">${svg(I.shield)}اخترنا طريقاً بديلاً لتجنّب: ${R.avoided.map(x => RT[x.type][0]).filter((v, i, a) => a.indexOf(v) === i).join("، ")}.</div>`;
    const on = R.onRoute.map(id => activeReports().concat(official).find(x => x.id === id)).filter(Boolean);
    if (on.length) facts += `<div class="fact w">${svg(I.warn)}على مسارك: ${on.map(x => RT[x.type][0]).filter((v, i, a) => a.indexOf(v) === i).join('، ')}. احتسبنا التأخير.</div>`;
    if (R.wf > 1) facts += `<div class="fact w">${svg(I.rain)}${E(feed.weather.cond)}: أضفنا ${Math.round((R.wf - 1) * 100)}% إلى زمن الرحلة.</div>`;
    d.innerHTML = `<button class="grip" aria-hidden="true" tabindex="-1"><i></i></button><div class="sheet"><h3>${E(dest.label)}</h3><p class="sub">من ${E(start.label)} · ${{ car: 'بالسيارة', foot: 'مشياً', bike: 'بالدراجة' }[mode]}</p>
<div class="eta"><span class="big">${MSR.fmtDur(R.ttotal)}</span><span>${MSR.fmtDist(R.total)}</span><span>الوصول ${clock12(arr % 1440)}</span></div>
<div class="facts">${facts}</div>
<div class="row"><button class="btn go" data-act="go">${verb}</button>
<button class="btn ghost sm" data-act="steps">الاتجاهات</button><button class="btn ghost sm" data-act="shareEta">${svg(I.share)}شارك وصولي</button><a class="btn ghost sm" target="_blank" rel="noopener" href="${streetUrl(dest.lat, dest.lon)}">${svg(I.street)}عرض الشارع</a><button class="btn ghost sm" data-act="clear" aria-label="إلغاء المسار">${svg(I.close)}</button></div>
<ul class="steps" id="steps" hidden>${ST.list.map(s => `<li>${svg(TURN[s.type] || TURN.straight)}<span>${E(s.text)}</span><span class="d">${MSR.fmtDist(s.at).replace('الآن', '0 م')}</span></li>`).join('')}</ul></div>`;
    d.hidden = false; requestAnimationFrame(sizeDock);
  }
  function msgSheet(t, s) { const d = $('#dock'); d.innerHTML = `<button class="grip" aria-hidden="true" tabindex="-1"><i></i></button><div class="sheet"><h3>${E(t)}</h3><p class="sub" style="margin-bottom:12px">${E(s)}</p><button class="btn ghost" data-act="home">رجوع</button></div>`; d.hidden = false; requestAnimationFrame(sizeDock); }
  function clearRoute() { R = ST = null; dest = null; destMk.remove(); ['route', 'done', 'alt'].forEach(s => map.getSource(s).setData(FC([]))); $('#q').value = ''; home(); }
  function etaText() {
    const n = qaNow(), left = nav ? R.ttotal * Math.max(0, R.total - nav.d) / R.total : R.ttotal, arr = (n.h * 60 + n.m + left / 60) % 1440;
    const link = CFG.SITE + '#to=' + dest.lat.toFixed(5) + ',' + dest.lon.toFixed(5) + ',' + encodeURIComponent(dest.label);
    return { text: `أنا في الطريق إلى ${dest.label}، أصل تقريباً الساعة ${clock12(arr)} (بعد ${MSR.fmtDur(left)}). افتح الموقع على مشوار:`, link };
  }

  // ---------- navigation (live GPS first; preview only on request) ----------
  function along(dist) {
    const c = R.coords; let acc = 0;
    for (let i = 0; i + 1 < c.length; i++) {
      const d = MSR.hav(c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
      if (acc + d >= dist) { const f = d ? (dist - acc) / d : 0; return { lon: c[i][0] + (c[i + 1][0] - c[i][0]) * f, lat: c[i][1] + (c[i + 1][1] - c[i][1]) * f, seg: i, brg: MSR.bearing(c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]) }; }
      acc += d;
    }
    const l = c[c.length - 1]; return { lon: l[0], lat: l[1], seg: c.length - 2, brg: 0, end: 1 };
  }
  function segEdge(i) { const ei = i - 1; return ei >= 0 && ei < R.edges.length ? R.edges[ei] : -1; }
  function segSpeed(i) { const e = segEdge(i); if (e < 0) return mode === 'car' ? 4 : 1.4; const A = profile(mode); return A.len[e] / Math.max(A.cost[e], 0.1) / R.wf; }
  function segLimit(i) { if (mode !== 'car') return 0; const e = segEdge(i); if (e < 0) return 0; const w = G.ways[profile(mode).way[e]]; return w ? w.ms || 0 : 0; }
  // project a point on the route near the last known segment
  function project(la, lo, from) {
    const c = R.coords, kx = 111320 * Math.cos(la * Math.PI / 180), ky = 110540;
    let best = { d: Infinity, i: 0, t: 0 };
    const i0 = Math.max(0, (from || 0) - 4), i1 = Math.min(c.length - 1, (from || 0) + 60);
    const scan = (a, b) => { for (let i = a; i < b; i++) {
      const ax = (c[i][0] - lo) * kx, ay = (c[i][1] - la) * ky, bx = (c[i + 1][0] - lo) * kx, by = (c[i + 1][1] - la) * ky;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? -(ax * dx + ay * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx, py = ay + t * dy, d = Math.sqrt(px * px + py * py);
      if (d < best.d) best = { d, i, t };
    } };
    scan(i0, i1); if (best.d > 80) scan(0, c.length - 1);
    const seglen = R.cumc[best.i + 1] - R.cumc[best.i];
    best.along = R.cumc[best.i] + best.t * seglen;
    best.brg = MSR.bearing(c[best.i][1], c[best.i][0], c[best.i + 1][1], c[best.i + 1][0]);
    best.lon = c[best.i][0] + (c[best.i + 1][0] - c[best.i][0]) * best.t; best.lat = c[best.i][1] + (c[best.i + 1][1] - c[best.i][1]) * best.t;
    return best;
  }
  function camZoom(v) { const k = v * 3.6; return mode !== 'car' ? 18 : k < 30 ? 17.4 : k < 70 ? 16.6 : 15.8; }
  function follow(lon, lat, brg, v, dur) {
    if (!nav || !nav.follow) return;
    map.easeTo({ center: [lon, lat], bearing: brg, pitch: 60, zoom: camZoom(v || 0), duration: dur, offset: [0, Math.round(innerHeight * 0.18)], essential: true });
  }
  function firstLine() { let t = ST.list[0].text + (ST.list[1] ? '. ' + MSR.spoken(ST.list[1].at) + '، ' + ST.list[1].text : ''); const w = feed && feed.weather; if (w && w.warning && mode === 'car') t = 'تنبيه الطقس: ' + w.warning + '. ' + t; return t; }
  function startNav(resume, announce) {
    const keep = resume && nav ? { pace: nav.pace, asked: nav.asked, kind: nav.kind, km: nav.km, last: nav.lastFix } : null;
    if (nav && nav.watch != null) try { navigator.geolocation.clearWatch(nav.watch); } catch (e) {}
    if (nav) { cancelAnimationFrame(nav.raf); clearTimeout(nav.waitT); }
    nav = { d: 0, idx: 0, pace: keep ? keep.pace : 1, last: performance.now(), spoken: {}, kind: keep ? keep.kind : 'wait', asked: keep ? keep.asked : {}, off: 0, km: keep ? keep.km : 0, v: 0, follow: true, brg: 0, lastFix: keep ? keep.last : null };
    document.body.classList.add('nav'); $('#dock').hidden = true; sizeDock(); startMk.remove(); meMk.remove();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { if (nav) nav.lock = l; else l.release(); }).catch(() => {}); } catch (e) {}
    R.cumc = [0]; for (let i = 1; i < R.coords.length; i++) R.cumc.push(R.cumc[i - 1] + MSR.hav(R.coords[i - 1][1], R.coords[i - 1][0], R.coords[i][1], R.coords[i][0]));
    const c0 = R.coords[0], b0 = MSR.bearing(c0[1], c0[0], R.coords[1][1], R.coords[1][0]);
    carMk.setLngLat(c0).setRotation(b0).addTo(map); nav.brg = b0;
    map.easeTo({ center: c0, zoom: 17, pitch: 60, bearing: b0, duration: 700, offset: [0, Math.round(innerHeight * 0.18)] });
    $('#ask').hidden = true; navBar();
    if (announce === 'update') say('تم تحديث المسار'); else if (announce === 'first') say(firstLine());
    if (nav.kind === 'demo') { navUpdate(along(0)); nav.raf = requestAnimationFrame(tick); return; }
    if (nav.kind === 'gps' && keep && keep.last) { nav.kind = 'gps'; gpsUpdate(keep.last, true); }
    else { nav.kind = 'wait'; waitBanner('جارٍ تحديد موقعك…', 'تأكد أن خدمة الموقع مفعّلة'); }
    watchGps(!resume);
  }
  function waitBanner(t, sub) {
    const b = $('#banner'); b.innerHTML = `${svg(I.loc, 2.2)}<div style="min-width:0"><div class="txt" style="font-weight:700">${E(t)}</div><div class="next">${E(sub || '')}</div></div>`; b.hidden = false;
  }
  function gpsProblem(msg) {
    if (!nav || nav.kind === 'gps' || nav.kind === 'demo') return;
    waitBanner('لا يمكن تحديد موقعك', msg);
    const ask = $('#ask');
    ask.innerHTML = `<span class="rp" style="background:#2f7cf6">${svg(I.loc)}</span><p><b>الملاحة تحتاج موقعك</b>فعّل خدمة الموقع واسمح لمشوار باستخدامها، أو شاهد معاينة للمسار.</p><button class="btn sm" data-act="gpsRetry">إعادة المحاولة</button><button class="btn ghost sm" data-act="demo">معاينة</button>`;
    ask.hidden = false;
  }
  function watchGps(first) {
    if (!navigator.geolocation) return gpsProblem('هذا الجهاز لا يدعم تحديد الموقع.');
    const me0 = nav;
    try {
      nav.watch = navigator.geolocation.watchPosition(pos => {
        if (nav !== me0 || nav.kind === 'demo') return;
        if (nav.kind === 'wait') {
          nav.kind = 'gps'; $('#ask').hidden = true;
          // Waze-style: always drive from where you really are
          const s0 = R.coords[0];
          if (MSR.hav(pos.coords.latitude, pos.coords.longitude, s0[1], s0[0]) > 120) { nav.lastFix = pos; reroute({ lat: pos.coords.latitude, lon: pos.coords.longitude }, null, true); return; }
          if (first) say(firstLine());
        }
        gpsUpdate(pos);
      }, err => { if (nav === me0) gpsProblem(err && err.code === 1 ? 'لم يُسمح لمشوار باستخدام الموقع. اسمح به من إعدادات الجهاز أو المتصفح.' : 'إشارة الموقع ضعيفة. تأكد أن خدمة الموقع مفعّلة.'); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
    } catch (e) { gpsProblem('تعذّر تشغيل تحديد الموقع.'); }
    clearTimeout(nav.waitT); nav.waitT = setTimeout(() => { if (nav === me0 && nav.kind === 'wait') gpsProblem('لم تصل إشارة الموقع بعد. اخرج إلى مكان مفتوح أو تأكد أن الموقع مفعّل.'); }, 15000);
  }
  function startDemo() {
    if (!nav) return; if (nav.watch != null) try { navigator.geolocation.clearWatch(nav.watch); } catch (e) {}
    nav.watch = null; nav.kind = 'demo'; nav.d = 0; $('#ask').hidden = true; clearTimeout(nav.waitT);
    toast('معاينة المسار: السيارة تتحرك على الخريطة للتوضيح فقط');
    navBar(); navUpdate(along(0)); nav.last = performance.now(); nav.raf = requestAnimationFrame(tick);
  }
  function stopNav(arrived) {
    if (!nav) return; cancelAnimationFrame(nav.raf); cancelAnimationFrame(nav.anim); clearTimeout(nav.waitT); if (nav.watch != null) try { navigator.geolocation.clearWatch(nav.watch); } catch (e) {}
    try { nav.lock && nav.lock.release(); } catch (e) {}
    const was = nav.kind; if (was === 'gps') { me.km += nav.km / 1000; LS.set('me', me); }
    const lastFix = nav.lastFix; nav = null;
    carMk.remove(); ['banner', 'navbar', 'ask', 'recenter'].forEach(id => $('#' + id).hidden = true); document.body.classList.remove('nav');
    if (arrived) {
      say('وصلت إلى وجهتك'); const lbl = dest.label; setFrom({ lat: dest.lat, lon: dest.lon, label: lbl });
      ['route', 'done', 'alt'].forEach(s => map.getSource(s).setData(FC([]))); destMk.remove(); R = ST = null; dest = null; $('#q').value = '';
      home(); toast('وصلت إلى ' + lbl);
    } else {
      if (was === 'gps' && lastFix) setFrom({ lat: lastFix.coords.latitude, lon: lastFix.coords.longitude, label: 'موقعي الحالي' });
      startMk.addTo(map); if (was === 'gps' && lastFix) plan(); else routeSheet();
    }
    map.easeTo({ pitch: is3d ? 50 : 0, zoom: 14, bearing: 0, duration: 700, offset: [0, 0] });
  }
  function tick(now) {
    if (!nav || nav.kind !== 'demo') return;
    const dt = Math.min(0.25, (now - nav.last) / 1000); nav.last = now;
    const p0 = along(nav.d); nav.v = segSpeed(p0.seg); nav.d += nav.v * nav.pace * dt;
    const p = along(nav.d);
    carMk.setLngLat([p.lon, p.lat]); carMk.setRotation(p.brg);
    if (nav.follow && (!nav.cam || now - nav.cam > 120)) { nav.cam = now; map.jumpTo({ center: [p.lon, p.lat], bearing: p.brg, pitch: 60, zoom: camZoom(nav.v), offset: [0, Math.round(innerHeight * 0.18)] }); }
    if (!nav.tr || now - nav.tr > 500) { nav.tr = now; trail(p); navUpdate(p); }
    if (!nav) return;
    if (p.end || nav.d >= R.total) return stopNav(true);
    nav.raf = requestAnimationFrame(tick);
  }
  function animateCar(from, to, brg, ms) {
    cancelAnimationFrame(nav.anim); const t0 = performance.now();
    const step = now => { if (!nav) return; const f = Math.min(1, (now - t0) / ms);
      carMk.setLngLat([from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f]); if (f < 1) nav.anim = requestAnimationFrame(step); };
    carMk.setRotation(brg); nav.anim = requestAnimationFrame(step);
  }
  function gpsUpdate(pos, silent) {
    const la = pos.coords.latitude, lo = pos.coords.longitude, acc = pos.coords.accuracy || 20, t = pos.timestamp || Date.now();
    const prev = nav.lastFix; nav.lastFix = pos;
    if (acc > 120 && prev) return;                       // ignore very poor fixes
    const pr = project(la, lo, nav.idx);
    // speed: device speed, else distance over time between fixes
    let v = pos.coords.speed;
    if (v == null || isNaN(v) || v < 0) v = prev ? MSR.hav(prev.coords.latitude, prev.coords.longitude, la, lo) / Math.max(0.5, (t - (prev.timestamp || t)) / 1000) : 0;
    if (!(v < 70)) v = nav.v || 0;                        // ignore impossible jumps (> 250 km/h)
    v = nav.v ? nav.v * 0.4 + v * 0.6 : v;                // smooth the reading
    nav.v = v < 0.8 ? 0 : v;                              // standing still = 0
    const moving = nav.v > 1.5;
    // off route: several consecutive fixes far from the line while moving
    const tol = Math.max(40, acc * 1.5);
    if (pr.d > tol && moving) { if (++nav.off >= 3) { nav.off = 0; reroute({ lat: la, lon: lo }, 'خرجت عن المسار، جارٍ إعادة الحساب'); return; } } else if (pr.d <= tol) nav.off = 0;
    // progress only moves forward (small GPS jitter backwards is ignored)
    if (pr.along > nav.d || nav.d - pr.along > 60) { if (nav.kind === 'gps' && prev && pr.along > nav.d) nav.km += pr.along - nav.d; nav.d = pr.along; nav.idx = pr.i; }
    // snap the arrow to the road when close to it, keep heading when stopped
    const onRoad = pr.d <= tol, show = onRoad ? [pr.lon, pr.lat] : [lo, la];
    const hdg = pos.coords.heading;
    if (moving) nav.brg = onRoad ? pr.brg : (hdg != null && !isNaN(hdg) ? hdg : nav.brg);
    const cur = carMk.getLngLat(); animateCar([cur.lng, cur.lat], show, nav.brg, 900);
    follow(show[0], show[1], nav.brg, nav.v, 900);
    const p = { lat: show[1], lon: show[0], seg: pr.i + 1 };
    trail(p); if (!silent) navUpdate(p); else navUpdate(p);
    if (nav && (MSR.hav(la, lo, dest.lat, dest.lon) < 30 || R.total - nav.d < 20)) stopNav(true);
  }
  function reroute(pos, why, quiet) {
    start = { lat: pos.lat, lon: pos.lon, label: 'موقعي الحالي' }; $('#fromT').textContent = start.label;
    if (why) toast(why);
    plan(true); if (R) startNav(true, quiet ? 'first' : 'update');
  }
  function trail(p) { map.getSource('done').setData(FC([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: R.coords.slice(0, p.seg + 1).concat([[p.lon, p.lat]]) } }])); }
  function navUpdate(p) {
    if (!nav || nav.kind === 'wait') return;
    const off0 = R.extra ? MSR.hav(R.coords[0][1], R.coords[0][0], R.coords[1][1], R.coords[1][0]) : 0, rd = nav.d - off0;
    const i = ST.list.findIndex(s => s.at > rd + 5), s = ST.list[i < 0 ? ST.list.length - 1 : i], nx = ST.list[i + 1], to = Math.max(0, s.at - rd);
    const b = $('#banner');
    b.innerHTML = `${svg(TURN[s.type] || TURN.straight, 2.4)}<div style="min-width:0"><div class="dist">${MSR.fmtDist(to)}</div><div class="txt">${E(s.text)}</div>${nx && nx.type !== 'arrive' ? `<div class="next">ثم ${E(nx.text)}</div>` : ''}</div>${nav.kind === 'demo' ? '<span class="demo-tag">معاينة</span>' : ''}`;
    b.hidden = false;
    const key = s.i + ':' + s.type, th = mode === 'car' ? [600, 180, 40] : [120, 40, 12];
    th.forEach((t, k) => { if (to <= t && !nav.spoken[key + k] && (k ? true : to > th[1])) { nav.spoken[key + k] = 1; say((to > 50 ? MSR.spoken(to) + '، ' : '') + s.text); } });
    // speed limit of the current road
    nav.limit = segLimit(p.seg);
    if (nav.limit && nav.v * 3.6 > nav.limit + 5 && nav.kind === 'gps') { if (!nav.overSaid || performance.now() - nav.overSaid > 60000) { nav.overSaid = performance.now(); say('انتبه، تجاوزت السرعة المحددة ' + nav.limit); } }
    // new reports or closures that touch the remaining route → reroute once per change
    const A = profile(mode), pk = penalties(A).key;
    if (pk !== penKey && (!nav.rc || performance.now() - nav.rc > 8000)) {
      penKey = pk; nav.rc = performance.now();
      const { pen } = penalties(A), seg = Math.max(0, p.seg - 1);
      if (R.nodes.slice(seg).some(n => pen.has(n))) return reroute(p, 'بلاغ جديد على طريقك، اخترنا طريقاً أسرع');
    }
    // ask about a report ahead (one question each)
    const near = activeReports().concat(official).find(r => !nav.asked[r.id] && MSR.hav(p.lat, p.lon, r.lat, r.lon) < (mode === 'car' ? 300 : 90));
    if (near) {
      nav.asked[near.id] = 1; const t = RT[near.type], d = MSR.hav(p.lat, p.lon, near.lat, near.lon);
      say('انتبه، ' + t[0] + ' ' + MSR.spoken(d));
      const ask = $('#ask');
      ask.innerHTML = `<span class="rp" style="background:${t[1]}">${svg(t[2])}</span><p><b>${t[0]} بعد ${MSR.fmtDist(d)}</b>${near.official ? 'إعلان رسمي' : 'هل ما زال موجوداً؟'}</p>${near.official ? '' : `<button class="btn sm" data-vote="up" data-id="${E(near.id)}">نعم</button><button class="btn ghost sm" data-vote="down" data-id="${E(near.id)}">لا</button>`}`;
      ask.hidden = false; clearTimeout(nav.askT); nav.askT = setTimeout(() => ask.hidden = true, 12000);
    }
    navBar();
  }
  function navBar() {
    if (!nav) return;
    const left = Math.max(0, R.total - nav.d), frac = R.total ? left / R.total : 0, n = qaNow();
    // remaining time from the route model; while stopped the arrival clock moves on by itself
    const tleft = R.ttotal * frac, kmh = Math.round((nav.v || 0) * 3.6), lim = nav.limit || 0, over = lim && kmh > lim + 5;
    $('#navbar').innerHTML = `<div class="spd${over ? ' over' : ''}" aria-label="السرعة">${nav.kind === 'wait' ? '–' : kmh}<small>كم/س</small></div>${lim ? `<div class="lim" aria-label="السرعة المحددة">${lim}</div>` : ''}
<div class="eta2"><b>${nav.kind === 'wait' ? '—' : clock12(n.h * 60 + n.m + tleft / 60)}</b><span>${MSR.fmtDur(tleft)} · ${MSR.fmtDist(left).replace('الآن', '0 م')}</span></div>
<div class="end">${nav.kind === 'demo' ? `<div class="pace" role="group" aria-label="سرعة المعاينة">${[1, 4, 12].map(x => `<button data-pace="${x}" aria-pressed="${nav.pace === x}">×${x}</button>`).join('')}</div>` : ''}
<button class="fab" data-act="shareEta" aria-label="شارك وقت وصولي">${svg(I.share)}</button>
<button class="fab" data-act="voice" aria-label="${voice ? 'كتم الصوت' : 'تشغيل الصوت'}">${svg(voice ? I.vol : I.mute)}</button>
<button class="btn coral sm" data-act="stop">إنهاء</button></div>`;
    $('#navbar').hidden = false;
  }

  // ---------- reports ----------
  function streetAt(lat, lon) {
    const A = profile('car'), nn = MSR.nearest(G, A, lat, lon); if (!nn || nn.dist > 120) return '';
    for (let k = A.off[nn.node]; k < A.off[nn.node + 1]; k++) { const s = MSR.roadName(G, A.way[k]); if (s) return s; } return '';
  }
  function draw() {
    markers.forEach(m => m.remove()); markers = [];
    activeReports().concat(official).forEach(r => {
      const t = RT[r.type]; if (!t) return;
      const el = document.createElement('div'); el.className = 'pin' + (r.official ? ' official' : ''); el.style.background = t[1]; el.style.color = t[1];
      el.innerHTML = svg(t[2], 2.2); el.title = t[0]; el.setAttribute('role', 'button'); el.setAttribute('aria-label', t[0]);
      el.addEventListener('click', e => { e.stopPropagation(); repSheet(r); });
      markers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([r.lon, r.lat]).addTo(map));
    });
    const n = activeReports().length, b = $('#repN'); b.textContent = n; b.hidden = !n;
    if (!R && !nav) { const p = $('#pane'); if (p && tab === 'road') p.innerHTML = pane(); }
  }
  const api = async body => { const r = await fetch(CFG.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }); const j = await r.json(); if (!j.ok) throw new Error(j.error || 'خطأ'); return j; };
  async function syncReports() {
    const local = LS.get('reports', []).filter(r => Date.now() - r.t < 3 * 3600e3);
    if (!CFG.API) { reports = local; draw(); return; }
    try { const j = await api({ action: 'mishwarList' }); const ids = new Set(j.reports.map(r => r.id)); reports = j.reports.map(r => Object.assign(r, { mine: local.some(l => l.id === r.id) })).concat(local.filter(l => !ids.has(l.id) && !l.sent)); }
    catch (e) { reports = local; }
    draw();
  }
  let repAt = null;
  async function addReport(type, at) {
    at = at || repAt; repAt = null;
    const c = at ? { lat: at.lat, lng: at.lon } : nav ? carMk.getLngLat() : (R || !start ? map.getCenter() : { lat: start.lat, lng: start.lon });
    const r = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, lat: +c.lat.toFixed(6), lon: +c.lng.toFixed(6), t: Date.now(), up: 1, down: 0, mine: true };
    r.street = streetAt(r.lat, r.lon);
    const local = LS.get('reports', []); local.push(r); LS.set('reports', local); reports.push(r); draw();
    me.reports++; award(5, 'لبلاغك');
    if (nav) { $('#dock').hidden = true; } else if (R) routeSheet(); else home();
    toast(RT[type][0] + ' سُجّل' + (r.street ? ' على ' + r.street : ''), ['تراجع', () => removeReport(r.id)]);
    if (CFG.API) { try { await api({ action: 'mishwarAdd', id: r.id, type, lat: r.lat, lon: r.lon, street: r.street }); r.sent = 1; LS.set('reports', local); } catch (e) {} }
    if (R && !nav) plan(); else if (nav) penKey = '';
  }
  function removeReport(id) {
    reports = reports.filter(r => r.id !== id); LS.set('reports', LS.get('reports', []).filter(r => r.id !== id));
    me.reports = Math.max(0, me.reports - 1); me.pts = Math.max(0, me.pts - 5); LS.set('me', me); draw();
    if (CFG.API) api({ action: 'mishwarVote', id, v: -9 }).catch(() => {});
    if (R && !nav) plan();
  }
  async function vote(id, up) {
    const r = reports.find(x => x.id === id); if (!r) return;
    const voted = LS.get('voted', {}); if (voted[id]) { toast('سجّلنا رأيك في هذا البلاغ من قبل'); return; }
    voted[id] = 1; LS.set('voted', voted);
    if (up) { r.up = (r.up || 0) + 1; r.t = Date.now(); } else r.down = (r.down || 0) + 1;
    const local = LS.get('reports', []), l = local.find(x => x.id === id); if (l) { Object.assign(l, { up: r.up, down: r.down, t: r.t }); LS.set('reports', local); }
    me.confirms++; award(2, up ? 'للتأكيد' : 'للتحديث');
    $('#ask').hidden = true; draw();
    if (CFG.API) api({ action: 'mishwarVote', id, v: up ? 1 : -1 }).catch(() => {});
    if (R && !nav) plan();
  }
  function reportSheet(at) {
    repAt = at || null; const d = $('#dock');
    d.innerHTML = `<button class="grip" aria-hidden="true" tabindex="-1"><i></i></button><div class="sheet"><h3>ماذا ترى على الطريق؟</h3><p class="sub">ضغطة واحدة تكفي. يُسجَّل البلاغ عند ${repAt ? 'النقطة التي اخترتها' : nav ? 'موقعك الآن' : R ? 'منتصف الخريطة' : 'نقطة انطلاقك'} ويظهر للجميع 3 ساعات، ويتجدد كلما أكّده سائق آخر.</p>
<div class="rgrid">${Object.entries(RT).map(([k, v]) => `<button data-rep="${k}"><span class="rp" style="background:${v[1]}">${svg(v[2])}</span>${v[0]}</button>`).join('')}</div>
<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="${nav ? 'closeDock' : R ? 'back' : 'home'}">رجوع</button></div></div>`;
    d.hidden = false; requestAnimationFrame(sizeDock);
  }
  function repSheet(r) {
    if (nav) return;
    const t = RT[r.type], d = $('#dock'), voted = LS.get('voted', {})[r.id];
    d.innerHTML = `<button class="grip" aria-hidden="true" tabindex="-1"><i></i></button><div class="sheet"><h3>${t[0]}${r.street ? ' · ' + E(r.street) : ''}</h3>
<p class="sub">${r.official ? `إعلان رسمي${r.until ? ' حتى ' + fmtDate(r.until) : ''}${r.source ? ' · ' + E(r.source) : ''}` : `${ago(r.t)} · تأكيد ${r.up || 0} · نفي ${r.down || 0}`}</p>
${r.note ? `<p style="margin:8px 0 0">${E(r.note)}</p>` : ''}
<div class="row" style="margin-top:12px">${r.official ? (r.link ? `<a class="btn ghost" href="${E(r.link)}" target="_blank" rel="noopener">${svg(I.news)}قراءة الإعلان</a>` : '') : r.mine ? `<button class="btn ghost" data-del="${E(r.id)}">حذف بلاغي</button>` : voted ? '<span class="note">شكراً، سجّلنا رأيك.</span>' : `<button class="btn" data-vote="up" data-id="${E(r.id)}">ما زال موجوداً</button><button class="btn ghost" data-vote="down" data-id="${E(r.id)}">لم يعد موجوداً</button>`}
<button class="btn ghost" data-act="${R ? 'back' : 'home'}">رجوع</button></div></div>`;
    d.hidden = false; requestAnimationFrame(sizeDock);
  }

  // ---------- feed (weather + news + official closures) ----------
  async function loadFeed() {
    try {
      let r; try { r = await fetch(FEED + '?t=' + Math.floor(Date.now() / 300000), { cache: 'no-cache' }); } catch (e) {} if ((!r || !r.ok) && FEED !== 'feed.json') r = await fetch('feed.json'); if (!r || !r.ok) return;
      feed = await r.json();
      official = (feed.closures || []).filter(c => c.lat && c.lon && (!c.until || +new Date(c.until) > Date.now())).map((c, i) => Object.assign({ id: 'o' + i, type: c.type || 'closed', official: true, t: +new Date(c.from || feed.updated) }, c));
      const fx = $('#fx'), imp = feed.weather && feed.weather.impact;
      fx.className = 'ui weather-fx ' + (imp === 'storm' ? 'rain' : imp || ''); fx.hidden = !imp || imp === 'none';
      draw(); if (!R && !nav) home();
    } catch (e) {}
  }

  // ---------- misc ----------
  function streetUrl(la, lo, h) { return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${la.toFixed(6)},${lo.toFixed(6)}${h != null ? '&heading=' + Math.round(h) : ''}`; }
  function updStreet() { const c = map.getCenter(); $('#bStreet').href = streetUrl(c.lat, c.lng, map.getBearing()); }
  function autoLocate() {
    if (!navigator.geolocation) return;
    const go = () => navigator.geolocation.getCurrentPosition(p => {
      const s = { lat: p.coords.latitude, lon: p.coords.longitude, label: 'موقعي الحالي' };
      if (s.lat < 24.4 || s.lat > 26.3 || s.lon < 50.6 || s.lon > 52) return;   // outside Qatar: keep the default start
      if (nav) return; setFrom(s); startMk.remove(); meMk.setLngLat([s.lon, s.lat]).addTo(map);
      if (!R) map.easeTo({ center: [s.lon, s.lat], zoom: 15, duration: 800 }); else if (dest) plan();
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    try { navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state !== 'denied') go(); }).catch(go); } catch (e) { go(); }
  }
  function locate(asStart) {
    if (!navigator.geolocation) return toast('تحديد الموقع غير متاح في هذا المتصفح');
    navigator.geolocation.getCurrentPosition(p => {
      const s = { lat: p.coords.latitude, lon: p.coords.longitude, label: 'موقعي الحالي' };
      setFrom(s); meMk.setLngLat([s.lon, s.lat]).addTo(map); map.flyTo({ center: [s.lon, s.lat], zoom: 16 }); if (dest) plan(); else home();
    }, () => { toast('لم يُسمح بتحديد الموقع. اضغط على الخريطة واختر «انطلق من هنا»'); if (asStart) map.flyTo({ center: [start.lon, start.lat], zoom: 15 }); }, { enableHighAccuracy: true, timeout: 8000 });
  }
  function pointSheet(ll) {
    let near = null, nd = Infinity; POI.forEach(p => { const d = MSR.hav(ll.lat, ll.lng, p.lat, p.lon); if (d < nd) { nd = d; near = p; } });
    const st = streetAt(ll.lat, ll.lng), label = nd < 60 && near ? (near.ar || near.en) : (st ? 'قرب ' + st : 'نقطة على الخريطة');
    const a = `data-la="${ll.lat}" data-lo="${ll.lng}" data-n="${E(label)}"`, d = $('#dock');
    d.innerHTML = `<button class="grip" aria-hidden="true" tabindex="-1"><i></i></button><div class="sheet"><h3>${E(label)}</h3><p class="sub">${ll.lat.toFixed(5)}، ${ll.lng.toFixed(5)}</p>
<div class="row" style="margin-top:12px"><button class="btn" data-act="to" ${a}>اذهب إلى هنا</button><button class="btn ghost" data-act="from" ${a}>انطلق من هنا</button>
<button class="btn ghost sm" data-act="save" data-k="home" ${a}>${svg(I.home)}حفظ كالبيت</button><button class="btn ghost sm" data-act="save" data-k="work" ${a}>${svg(I.work)}حفظ كالعمل</button>
<button class="btn ghost sm" data-act="repHere" ${a}>${svg(I.report)}أبلغ هنا</button><a class="btn ghost sm" target="_blank" rel="noopener" href="${streetUrl(ll.lat, ll.lng)}">${svg(I.street)}عرض الشارع</a><button class="btn ghost sm" data-act="${R ? 'back' : 'home'}">إغلاق</button></div></div>`;
    d.hidden = false; requestAnimationFrame(sizeDock);
  }
  function invite() { share('مشوار', 'مشوار: ملاحة عربية لقطر بخريطة ثلاثية الأبعاد، وبلاغات السائقين لحظة بلحظة، وطقس وأخبار الطريق. جرّبه:', CFG.SITE); }

  function wire() {
    const q = $('#q');
    q.addEventListener('focus', () => results(q.value)); q.addEventListener('input', () => results(q.value));
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('#res button[data-la]'); if (b) pick(b); } if (e.key === 'Escape') $('#res').hidden = true; });
    $('#fromBtn').addEventListener('click', () => { searchFor = 'start'; q.value = ''; q.placeholder = 'من أين تنطلق؟'; q.focus(); results(''); });
    $('#res').addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b); });
    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; LS.set('mode', mode); markModes(); if (dest && !nav) setTimeout(() => plan(), 20); }));
    $('#b3d').addEventListener('click', () => { is3d = !is3d; $('#b3d').textContent = is3d ? '3D' : '2D'; map.easeTo({ pitch: is3d ? 55 : 0, duration: 600 }); });
    $('#bLoc').addEventListener('click', () => locate(false));
    $('#bRep').addEventListener('click', () => reportSheet());
    $('#markBtn').addEventListener('click', () => { if (R || nav) return; dockOpen = true; tab = 'about'; home(); });
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-act],[data-rep],[data-pace],[data-vote],[data-tab],[data-go],[data-set],[data-del],[data-rep-id],#grip'); if (!a) return;
      if (a.id === 'grip') { dockOpen = !dockOpen; return home(); }
      if (a.dataset.rep) return addReport(a.dataset.rep);
      if (a.dataset.repId) { const r = reports.find(x => x.id === a.dataset.repId); if (r) { map.flyTo({ center: [r.lon, r.lat], zoom: 16 }); repSheet(r); } return; }
      if (a.dataset.vote) return vote(a.dataset.id, a.dataset.vote === 'up');
      if (a.dataset.del) { removeReport(a.dataset.del); return home(); }
      if (a.dataset.pace) { nav.pace = +a.dataset.pace; return navBar(); }
      if (a.dataset.tab) { tab = a.dataset.tab; LS.set('tab', tab); dockOpen = true; return home(); }
      if (a.dataset.go) { const [la, lo] = a.dataset.go.split(',').map(Number); $('#q').value = a.dataset.n; return setDest({ lat: la, lon: lo, label: a.dataset.n }); }
      if (a.dataset.set) { toast('اضغط على مكان ' + (a.dataset.set === 'home' ? 'البيت' : 'العمل') + ' في الخريطة ثم اختر الحفظ'); return; }
      const act = a.dataset.act;
      if (act === 'go') startNav(false);
      else if (act === 'stop') stopNav(false);
      else if (act === 'demo') startDemo();
      else if (act === 'gpsRetry') { $('#ask').hidden = true; waitBanner('جارٍ تحديد موقعك…', 'تأكد أن خدمة الموقع مفعّلة'); if (nav.watch != null) try { navigator.geolocation.clearWatch(nav.watch); } catch (e) {} watchGps(true); }
      else if (act === 'steps') { const s = $('#steps'); s.hidden = !s.hidden; requestAnimationFrame(sizeDock); }
      else if (act === 'clear') clearRoute();
      else if (act === 'home') home();
      else if (act === 'back') R ? routeSheet() : home();
      else if (act === 'closeDock') $('#dock').hidden = true;
      else if (act === 'voice') { voice = !voice; LS.set('voice', voice); if (!voice && 'speechSynthesis' in window) speechSynthesis.cancel(); navBar(); }
      else if (act === 'shareEta') { const t = etaText(); share('مشوار', t.text, t.link); }
      else if (act === 'invite') invite();
      else if (act === 'repHere') reportSheet({ lat: +a.dataset.la, lon: +a.dataset.lo });
      else if (act === 'to') { $('#q').value = a.dataset.n; setDest({ lat: +a.dataset.la, lon: +a.dataset.lo, label: a.dataset.n }); }
      else if (act === 'from') { setFrom({ lat: +a.dataset.la, lon: +a.dataset.lo, label: a.dataset.n }); dest ? plan() : home(); }
      else if (act === 'save') { const pl = LS.get('places', {}); pl[a.dataset.k] = { lat: +a.dataset.la, lon: +a.dataset.lo }; LS.set('places', pl); toast('حُفظ مكان ' + (a.dataset.k === 'home' ? 'البيت' : 'العمل')); R ? routeSheet() : home(); }
    });
    map.on('click', e => { if (nav) return; $('#res').hidden = true; pointSheet(e.lngLat); });
    map.on('moveend', updStreet);
    const free = e => { if (nav && e.originalEvent) { nav.follow = false; $('#recenter').hidden = false; } };
    map.on('dragstart', free); map.on('zoomstart', free); map.on('rotatestart', free);
    $('#recenter').addEventListener('click', () => { if (!nav) return; nav.follow = true; $('#recenter').hidden = true; const c = carMk.getLngLat(); follow(c.lng, c.lat, nav.brg, nav.v, 500); });
    addEventListener('resize', sizeDock);
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', recolor);
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('hashchange', deepLink);
  }
  function markModes() { document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mode === mode)); }
  function deepLink() {
    const m = location.hash.match(/^#to=([\d.]+),([\d.]+),?(.*)$/); if (!m) return;
    const p = { lat: +m[1], lon: +m[2], label: decodeURIComponent(m[3] || '') || 'الوجهة المشتركة' };
    if (p.lat > 24 && p.lat < 27 && p.lon > 50 && p.lon < 52.5) { $('#q').value = p.label; setDest(p); }
  }

  async function boot() {
    shell(); markModes();
    const bar = $('#barI');
    try {
      const raw = await loadData(f => bar.style.width = Math.round(f * 85) + '%');
      G = MSR.parse(raw['graph.bin'], raw['names.json']);
      const gj = geo(raw);
      const HAVE = new Set(['0-255', '1536-1791', '1792-2047', '2048-2303', '8192-8447', '64256-64511', '64512-64767', '64768-65023', '65024-65279']);
      const EMPTY = new Uint8Array([10, 7, 10, 1, 109, 18, 2, 48, 48]).buffer; // valid empty glyph set
      maplibregl.addProtocol('mishwar', async params => { const range = params.url.split('/').pop(); if (!HAVE.has(range)) return { data: EMPTY.slice(0) }; try { const r = await fetch(D + 'glyphs/' + range + '.pbf'); if (r.ok) return { data: await r.arrayBuffer() }; } catch (e) {} return { data: EMPTY.slice(0) }; });
      try { const pr = maplibregl.setRTLTextPlugin(new URL('vendor/rtl-text.js', location.href).href, false); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
      map = new maplibregl.Map({ container: 'map', style: style(gj), center: [51.522, 25.305], zoom: 12.4, pitch: 50, bearing: -12, maxBounds: [[50.6, 24.4], [52.0, 26.3]], attributionControl: false, maxPitch: 70 });
      const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
      startMk = new maplibregl.Marker({ element: el('me-dot', '') }); meMk = new maplibregl.Marker({ element: el('me-dot', '') });
      destMk = new maplibregl.Marker({ element: el('', '<svg viewBox="0 0 30 40" width="32" height="42"><path d="M15 39s13-14 13-24A13 13 0 0 0 2 15c0 10 13 24 13 24z" fill="#ef6a4c" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>'), anchor: 'bottom' });
      carMk = new maplibregl.Marker({ element: el('', '<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="22" fill="rgba(47,124,246,.18)"/><path d="M24 7l12 32-12-7-12 7z" fill="#0f2a3d" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>'), rotationAlignment: 'map', pitchAlignment: 'map' });
      map.on('load', () => {
        bar.style.width = '100%'; setTimeout(() => $('#load').hidden = true, 200);
        const sv = LS.get('start', null); setFrom(sv && sv.label !== 'موقعي الحالي' ? sv : DEFAULT_START, false);
        autoLocate();
        wire(); updStreet(); home(); syncReports(); loadFeed(); deepLink();
        setInterval(syncReports, 60000); setInterval(loadFeed, 10 * 60000); setInterval(() => { if (!R && !nav) home(); }, 60000);
        setTimeout(() => profile(mode), 300);
        window.__mishwarReady = true;
      });
      map.on('error', e => { window.__mishwarErr = (window.__mishwarErr || []).concat(String(e && e.error && e.error.message || e)); });
    } catch (e) {
      $('#load').innerHTML = '<div><h1>تعذّر تحميل الخريطة</h1><p>تحقّق من الاتصال بالإنترنت ثم أعد فتح الصفحة.</p></div>';
      window.__mishwarErr = [String(e)];
    }
  }
  window.MISHWAR = { state: () => ({ R, ST, nav, mode, start, dest, reports, official, feed, me }), setDest: p => setDest(p), plan: () => plan(), addReport: (t, at) => addReport(t, at), get map() { return map; } };
  boot();
})();
