/* براق · محرر المحتوى: تطبيق المحتوى المنشور من لوحة الإدارة على الصفحة.
   سكربت عادي مستقل لا يعتمد على Firebase: يقرأ آخر نسخة محفوظة في المتصفح ويطبّقها فوراً،
   ثم يطبّق hook.js النسخة الأحدث من Firestore. إن تعذّر كل ذلك تبقى الصفحة كما هي في ملف HTML. */
(function () {
  "use strict";
  if (window.BQCMS) return;
  var KEY = "bq.cms.v1";
  var PREVIEW = /[?&]cmspv=1(&|$)/.test(location.search);
  var SKIP = "script,style,svg,select,option,textarea,noscript,[data-u],[data-cur-name],.bqm";
  var SLOT = "h1,h2,h3,h4,h5,p,li,summary,figcaption,th,td,dt,dd,.eyebrow,a.btn";
  var INLINE = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, BDI: 1, BDO: 1, SMALL: 1, CODE: 1, SPAN: 1, BR: 1, U: 1, MARK: 1, SUP: 1, SUB: 1, ABBR: 1 };
  var LABELS = { footer: "تذييل الصفحة", prices: "قائمة الأسعار", model: "النموذج التفاعلي", convert: "مخطط التحويل" };

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function snip(s) { return norm(s).slice(0, 80); }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^(#[\w\-؀-ۿ]*|https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+\d\s\-]+|\.\/[^\s"'<>]*|[\w\-\/]+\.html(#[^\s"'<>]*)?|[\w\-\/]+\.(pdf|xlsx|glb|md|zip)|files\/[^\s"'<>]+)$/.test(u)) return u;
    return null;
  }
  // صيغة مبسطة للنص: [نص](رابط) و **غامق** وسطر جديد
  function inline(s) {
    var out = "", re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g, last = 0, m;
    s = String(s || "");
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      if (m[1] != null) {
        var u = safeUrl(m[2]);
        out += u ? '<a href="' + esc(u) + '"' + (/^https:/.test(u) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(m[1]) + "</a>" : esc(m[0]);
      } else out += "<b>" + esc(m[3]) + "</b>";
      last = re.lastIndex;
    }
    out += esc(s.slice(last));
    return out.replace(/\n/g, "<br>");
  }
  function toMd(n) {
    var s = "";
    n.childNodes.forEach(function (c) {
      if (c.nodeType === 3) s += c.nodeValue.replace(/\s+/g, " ");
      else if (c.nodeType === 1) {
        var t = c.tagName;
        if (t === "A") { var h = c.getAttribute("href") || ""; s += safeUrl(h) ? "[" + toMd(c).trim() + "](" + h + ")" : toMd(c); }
        else if (t === "B" || t === "STRONG") s += "**" + toMd(c).trim() + "**";
        else if (t === "BR") s += "\n";
        else s += toMd(c);
      }
    });
    return s;
  }
  function bodyHtml(s) {
    var blocks = String(s || "").replace(/\r/g, "").split(/\n\s*\n/), out = "";
    blocks.forEach(function (b) {
      var lines = b.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      if (lines.every(function (l) { return /^[-•]\s+/.test(l); })) out += "<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^[-•]\s+/, "")) + "</li>"; }).join("") + "</ul>";
      else out += "<p>" + inline(lines.join("\n")) + "</p>";
    });
    return out;
  }

  // ===== استخراج الأقسام والنصوص والصور القابلة للتحرير (يعمل على أي مستند، ومنه نسخة index.html في لوحة الإدارة) =====
  function eligible(el) {
    if (el.closest(SKIP) || el.id) return false;
    if (el.querySelector("[id]")) return false;
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (!INLINE[c.tagName] || c.querySelector("svg,img,button,input") || c.matches(SKIP)) return false;
    }
    return norm(el.textContent).length >= 2;
  }
  function sectionRoots(root) {
    var all = [].slice.call(root.querySelectorAll("section[id]")).filter(function (s) { return !s.parentNode.closest("section[id]"); });
    var f = root.querySelector("footer");
    if (f) all.push(f);
    return all;
  }
  function secId(el) { return el.tagName === "FOOTER" ? "footer" : el.id; }
  function secLabel(el) {
    var id = secId(el);
    if (LABELS[id]) return LABELS[id];
    var h = el.querySelector("h2,h1");
    return h ? norm(h.textContent).slice(0, 60) : id;
  }
  function slotsOf(sec) {
    var seen = {}, out = [];
    [].forEach.call(sec.querySelectorAll(SLOT), function (el) {
      if (!eligible(el)) return;
      var sn = snip(el.textContent), n = seen[sn] = (seen[sn] || 0) + 1;
      out.push({ el: el, tag: el.tagName.toLowerCase(), snip: sn, n: n, md: toMd(el).replace(/[ \t]+\n/g, "\n").trim() });
    });
    return out;
  }
  function imgsOf(sec) {
    var seen = {}, out = [];
    [].forEach.call(sec.querySelectorAll("img[src]"), function (el) {
      var src = el.getAttribute("src"), n = seen[src] = (seen[src] || 0) + 1;
      out.push({ el: el, src: src, n: n, alt: el.getAttribute("alt") || "" });
    });
    return out;
  }
  function enumerate(root) {
    return sectionRoots(root).map(function (el) { return { id: secId(el), el: el, label: secLabel(el), slots: null, imgs: null }; });
  }

  // ===== التطبيق مع إمكانية التراجع الكامل (idempotent) =====
  var T = { html: new Map(), cls: [], attrs: [], nodes: new Map(), origSeq: null, added: [], ld: null, title: null, desc: null, styleEl: null };

  function mark(el) { if (!T.html.has(el)) T.html.set(el, el.innerHTML); }
  function hide(el) { if (!el.classList.contains("bq-cms-hide")) { el.classList.add("bq-cms-hide"); T.cls.push(el); } }
  function setAttr(el, k, v) { T.attrs.push([el, k, el.getAttribute(k)]); el.setAttribute(k, v); }

  function managed() {
    var c = document.getElementById("contact"), p = c ? c.parentNode : document.querySelector("main");
    if (!p) return [];
    return [].filter.call(p.children, function (n) { return n.tagName === "SECTION" && n.id; });
  }
  function arrange(target) {
    var cur = managed().filter(function (n) { return target.indexOf(n) > -1; });
    var ph = cur.map(function (n) { var c = document.createComment("bqcms"); n.parentNode.insertBefore(c, n); return c; });
    cur.forEach(function (n) { n.remove(); });
    ph.forEach(function (c, i) { c.parentNode.insertBefore(target[i], c); c.remove(); });
  }

  function revert() {
    T.html.forEach(function (h, el) { el.innerHTML = h; });
    T.html.clear();
    T.cls.forEach(function (el) { el.classList.remove("bq-cms-hide"); });
    T.cls = [];
    T.attrs.forEach(function (a) { if (a[2] == null) a[0].removeAttribute(a[1]); else a[0].setAttribute(a[1], a[2]); });
    T.attrs = [];
    T.nodes.forEach(function (v, n) { n.nodeValue = v; });
    T.nodes.clear();
    T.added.forEach(function (n) { n.remove(); });
    T.added = [];
    if (T.origSeq) { var seq = T.origSeq.filter(function (n) { return n.isConnected; }); if (seq.length) arrange(seq); }
    if (T.ld) { T.ld[0].textContent = T.ld[1]; T.ld = null; }
    if (T.title != null) { document.title = T.title; T.title = null; }
    if (T.desc) { T.desc[0].setAttribute("content", T.desc[1]); T.desc = null; }
  }

  function css(cfg) {
    var hid = (cfg.hide || []).filter(function (id) { return /^[\w\-]+$/.test(id); });
    var rules = ".bq-cms-hide{display:none!important}" +
      hid.map(function (id) { return 'header.top a[href="#' + id + '"],.drawer a[href="#' + id + '"],footer a[href="#' + id + '"]{display:none!important}'; }).join("") +
      ".bq-cs .bq-cs-body{max-width:78ch;display:flex;flex-direction:column;gap:14px}.bq-cs .bq-cs-body p{margin:0}.bq-cs .bq-cs-body ul{margin:0;padding-inline-start:22px}.bq-cs .bq-cs-body li{margin-bottom:6px}" +
      ".bq-cs figure{margin:0 0 18px}.bq-cs figure img{width:100%;max-width:880px;height:auto;border-radius:14px;border:1px solid var(--line);display:block}.bq-cs figcaption{color:var(--muted);font-size:.85rem;margin-top:6px}" +
      ".bq-cs .bq-cs-btn{display:inline-flex;margin-top:18px}";
    if (!T.styleEl) { T.styleEl = document.createElement("style"); T.styleEl.id = "bqCmsCss"; document.head.appendChild(T.styleEl); }
    T.styleEl.textContent = rules;
  }

  function customSection(c) {
    var s = document.createElement("section");
    s.id = c.id; s.className = "bq-cs";
    var fig = "";
    if (c.img) { var iu = c.img.indexOf("img:") === 0 ? (cfgImgs[c.img.slice(4)] || "") : (safeUrl(c.img) || ""); if (iu) fig = '<figure><img src="' + esc(iu) + '" alt="' + esc(c.imgAlt || "") + '" loading="lazy">' + (c.imgAlt ? "<figcaption>" + esc(c.imgAlt) + "</figcaption>" : "") + "</figure>"; }
    var bu = c.btn && safeUrl(c.url);
    s.innerHTML = '<div class="wrap"><div class="sec-head">' + (c.eyebrow ? '<div class="eyebrow">' + esc(c.eyebrow) + "</div>" : "") +
      "<h2>" + esc(c.title || "") + "</h2>" + (c.lead ? '<p class="lead">' + inline(c.lead) + "</p>" : "") + "</div>" +
      fig + '<div class="bq-cs-body">' + bodyHtml(c.body) + "</div>" +
      (bu ? '<a class="btn bq-cs-btn" href="' + esc(bu) + '"' + (/^https:/.test(bu) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(c.btn) + "</a>" : "") + "</div>";
    return s;
  }

  var cfgImgs = {};
  function apply(cfg, opts) {
    if (!cfg || typeof cfg !== "object") return;
    cfgImgs = cfg.imgData || {};
    revert();
    var man = managed();
    if (!T.origSeq) T.origSeq = man.slice();
    css(cfg);

    // أقسام مضافة
    var contact = document.getElementById("contact");
    (cfg.custom || []).forEach(function (c) {
      if (!c || !c.id || c.on === false || document.getElementById(c.id)) return;
      var s = customSection(c);
      (contact && contact.parentNode ? contact.parentNode : document.querySelector("main") || document.body).insertBefore(s, contact || null);
      T.added.push(s);
      if (c.nav && c.navLabel) {
        var nav = document.querySelector("header.top nav"), cl = nav && nav.querySelector('a[href="#contact"]');
        if (nav) { var a = document.createElement("a"); a.href = "#" + c.id; a.textContent = c.navLabel; cl ? cl.before(a) : nav.append(a); T.added.push(a); }
        var d = document.querySelector(".drawer .panel-d .d-acts");
        if (d) { var b = document.createElement("a"); b.href = "#" + c.id; b.textContent = c.navLabel; d.before(b); T.added.push(b); }
      }
    });

    // الترتيب
    var seq = managed();
    var byId = {}; seq.forEach(function (n) { byId[n.id] = n; });
    var listed = []; (cfg.order || []).forEach(function (id) { if (byId[id] && listed.indexOf(id) < 0) listed.push(id); });
    if (listed.length > 1) {
      var idx = []; seq.forEach(function (n, i) { if (listed.indexOf(n.id) > -1) idx.push(i); });
      var ns = seq.slice(); idx.forEach(function (p, j) { ns[p] = byId[listed[j]]; });
      arrange(ns);
    }

    // إخفاء الأقسام
    (cfg.hide || []).forEach(function (id) { var el = id === "footer" ? document.querySelector("footer") : document.getElementById(id); if (el) hide(el); });

    // النصوص
    var cache = {};
    function secSlots(id) {
      if (cache[id]) return cache[id];
      var el = id === "footer" ? document.querySelector("footer") : document.getElementById(id);
      return (cache[id] = el ? { slots: slotsOf(el), imgs: imgsOf(el) } : { slots: [], imgs: [] });
    }
    (cfg.texts || []).forEach(function (t) {
      if (!t || !t.s) return;
      var f = secSlots(t.s).slots.filter(function (x) { return x.snip === t.o && x.n === (t.n || 1); })[0];
      if (!f) return;
      if (t.h) { hide(f.el); return; }
      if (typeof t.t === "string") { mark(f.el); f.el.innerHTML = inline(t.t); }
    });
    // الصور
    (cfg.imgs || []).forEach(function (t) {
      if (!t || !t.s) return;
      var f = secSlots(t.s).imgs.filter(function (x) { return x.src === t.o && x.n === (t.n || 1); })[0];
      if (!f) return;
      if (t.h) { hide(f.el.closest("figure") || f.el); return; }
      var u = t.src ? (t.src.indexOf("img:") === 0 ? cfgImgs[t.src.slice(4)] : safeUrl(t.src)) : null;
      if (u) { setAttr(f.el, "src", u); f.el.removeAttribute("srcset"); }
      if (typeof t.alt === "string") setAttr(f.el, "alt", t.alt);
    });

    // الأسئلة الشائعة
    var fq = cfg.faq && Array.isArray(cfg.faq.items) ? cfg.faq : null;
    var box = document.querySelector("#faq .faq");
    if (fq && box) {
      mark(box);
      box.innerHTML = fq.items.filter(function (i) { return i && i.q && i.a && i.on !== false; }).map(function (i) { return "<details><summary>" + esc(i.q) + "</summary><p>" + inline(i.a) + "</p></details>"; }).join("");
      var ld = [].slice.call(document.querySelectorAll('script[type="application/ld+json"]')).filter(function (s) { return s.textContent.indexOf("FAQPage") > -1; })[0];
      if (ld) {
        try {
          var j = JSON.parse(ld.textContent), arr = Array.isArray(j) ? j : [j];
          arr.forEach(function (o) { if (o["@type"] === "FAQPage") o.mainEntity = fq.items.filter(function (i) { return i && i.q && i.a && i.on !== false; }).map(function (i) { return { "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: norm(i.a.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "")) } }; }); });
          T.ld = [ld, ld.textContent]; ld.textContent = JSON.stringify(Array.isArray(j) ? arr : arr[0]);
        } catch (e) {}
      }
    }

    // استبدال شامل في كل نصوص الصفحة وروابطها
    var reps = (cfg.repl || []).filter(function (r) { return r && r.f; }), extra = [];
    // أرقام الهواتف تظهر في الروابط بلا مسافات أو علامة +، فنضيف صيغها تلقائياً
    reps.forEach(function (r) {
      if (/^[+\d\s\-]{6,}$/.test(r.f)) {
        var a = r.f.replace(/[\s\-]/g, ""), b = String(r.t || "").replace(/[\s\-]/g, "");
        extra.push({ f: a, t: b }); if (a[0] === "+") extra.push({ f: a.slice(1), t: b.replace(/^\+/, "") });
      }
    });
    reps = reps.concat(extra);
    if (reps.length) {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentElement; return p && !p.closest(SKIP + ",#bqCmsCss") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
      var nodes = [], n; while ((n = w.nextNode())) nodes.push(n);
      nodes.forEach(function (n) {
        var v = n.nodeValue, o = v;
        reps.forEach(function (r) { if (v.indexOf(r.f) > -1) v = v.split(r.f).join(r.t || ""); });
        if (v !== o) { T.nodes.set(n, o); n.nodeValue = v; }
      });
      [].forEach.call(document.querySelectorAll("a[href],[aria-label],img[alt]"), function (el) {
        if (el.closest(SKIP)) return;
        ["href", "aria-label", "alt"].forEach(function (k) {
          var v = el.getAttribute(k); if (v == null) return;
          var o = v, vd = v; try { vd = decodeURIComponent(v); } catch (e) {}
          reps.forEach(function (r) {
            if (v.indexOf(r.f) > -1) v = v.split(r.f).join(r.t || "");
            else if (k === "href" && vd.indexOf(r.f) > -1) v = encodeURI(vd.split(r.f).join(r.t || ""));
          });
          if (v !== o && (k !== "href" || safeUrl(v) || /^https:\/\/wa\.me\//.test(v))) setAttr(el, k, v);
        });
      });
    }

    // برمجة مخصصة من لوحة الإدارة (CSS وHTML وJS): للصفحة الرئيسية فقط، ولا تعمل في صفحتي الحساب والإدارة.
    // أضف ?safe=1 إلى الرابط لتعطيلها فوراً. كود JS يُنفَّذ مرة واحدة لكل تحميل صفحة.
    var code = cfg.code;
    if (code && code.on !== false && document.getElementById("contact") && !/[?&]safe=1(&|$)/.test(location.search)) {
      if (code.css) { var st = document.createElement("style"); st.id = "bqUserCss"; st.textContent = String(code.css); document.head.appendChild(st); T.added.push(st); }
      if (code.html) { var dv = document.createElement("div"); dv.id = "bqUserHtml"; dv.innerHTML = String(code.html); document.body.appendChild(dv); T.added.push(dv); }
      if (code.js && !window.__bqUserJs) { window.__bqUserJs = 1; try { (new Function(String(code.js)))(); } catch (e) { try { console.warn("BQ custom JS:", e); } catch (x) {} } }
    }

    // عنوان الصفحة ووصفها
    if (cfg.title) { T.title = document.title; document.title = cfg.title; }
    if (cfg.desc) { var m = document.querySelector('meta[name="description"]'); if (m) { T.desc = [m, m.getAttribute("content")]; m.setAttribute("content", cfg.desc); } }
    document.documentElement.setAttribute("data-cms", String(cfg.rev || 1));
    if (opts && opts.done) opts.done();
  }

  // ===== الإقلاع: آخر نسخة محفوظة في المتصفح، أو المعاينة من لوحة الإدارة =====
  function save(cfg) { try { var c = Object.assign({}, cfg); delete c.imgData; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  function cached() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function boot() {
    if (PREVIEW) {
      window.addEventListener("message", function (e) { if (e.origin === location.origin && e.data && e.data.bqCmsPreview) { apply(e.data.bqCmsPreview); if (e.data.go) setTimeout(function () { var t = document.getElementById(e.data.go); if (t) t.scrollIntoView(); }, 60); } });
      try { parent.postMessage({ bqCmsReady: 1 }, location.origin); } catch (e) {}
      return;
    }
    if (!document.getElementById("contact")) return;
    var c = cached(); if (c) { try { apply(c); } catch (e) {} }
  }
  window.BQCMS = { apply: apply, save: save, cached: cached, enumerate: enumerate, slotsOf: slotsOf, imgsOf: imgsOf, inline: inline, bodyHtml: bodyHtml, toMd: toMd, safeUrl: safeUrl, snip: snip, secId: secId, preview: PREVIEW, managed: managed, KEY: KEY };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
