// بصيرة كولر — دليل الأرقام من المصادر النظامية (data/directory.json):
// أرقام الجهات والمنشآت المنشورة علناً مع مصدر كل رقم، وبلاغات الإزعاج الرسمية المفتوحة.
// يُدمج مع نتيجة الخادم إن لم يكن الخادم قد أعاد المصدر بنفسه، فيعمل الدليل في كل الأحوال.
(function () {
  let dir = null, rep = null, meta = null;
  const ready = fetch('data/directory.json?v=' + Math.floor(Date.now() / 36e5), { cache: 'default' })
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j) return null;
      meta = j; dir = new Map(j.directory.map(x => [x[0], x])); rep = new Map((j.reported.entries || []).map(x => [x[0], x]));
      return j;
    }).catch(() => null);
  const officialScore = n => n >= 5 ? Math.min(90, 25 + n * 7) : 0;
  function merge(c) {
    if (!c || !dir) return c;
    const d = dir.get(c.e164), r = rep.get(c.e164);
    if (d && !c.source) {
      const s = meta.sources[d[3]] || {};
      Object.assign(c, { name: d[1], category: d[2], verified: true, unknown: false, source: { name: s.title, url: s.url } });
    }
    if (r && c.official_reports == null && !c.verified) {
      const s = meta.reported.source || {};
      Object.assign(c, { official_reports: r[1], official_subject: r[3], official_last: r[4], unknown: false,
        spam_score: Math.max(c.spam_score || 0, officialScore(r[1])), category: r[2] >= 50 ? 'robocall' : 'telemarketing' });
      if (!c.source) c.source = { name: s.title, url: s.url };
    }
    return c;
  }
  BC.directory = { ready, merge, listed: e => !!(dir && dir.has(e)), count: () => (dir ? dir.size : 0) + (rep ? rep.size : 0), meta: () => meta };
})();
