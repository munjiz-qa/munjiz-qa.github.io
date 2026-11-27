/* أدوات مشتركة لمنصة منجز · سجل الطلاب */
(function () {
  const CFG = window.MM_CONFIG || {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mm." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("mm." + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("mm." + k); } catch {} },
  };
  async function api(fn, args = {}) {
    let res;
    try {
      res = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: CFG.key, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(args),
      });
    } catch (e) { throw new Error("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجدداً"); }
    const txt = await res.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) {
      const err = new Error((data && data.message) || "حدث خطأ غير متوقع، حاول مجدداً");
      err.code = data && data.code;
      throw err;
    }
    if (data && typeof data === "object" && data.error) throw new Error(data.error);
    return data;
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const digits = (s) => String(s || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const cleanName = (s) => String(s || "").replace(/ـ/g, "").replace(/[\s ​-‏]+/g, " ").trim();
  // نفس قاعدة الخادم: الرقم المصري يُحفظ ويُعرض بصيغة واحدة 01XXXXXXXXX
  function normPhone(s) {
    let t = digits(s).trim(); const plus = t.startsWith("+"); t = t.replace(/\D/g, "");
    if (t.startsWith("00")) t = t.slice(2);
    if (/^01[0125]\d{8}$/.test(t)) return t;
    if (/^1[0125]\d{8}$/.test(t)) return "0" + t;
    if (/^201[0125]\d{8}$/.test(t)) return "0" + t.slice(2);
    if ((plus || String(s).trim().startsWith("00")) && !t.startsWith("20") && t.length >= 8 && t.length <= 15) return "+" + t;
    return null;
  }
  function toast(msg, ms = 2600) {
    const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), ms);
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.textContent = label || "جارٍ الحفظ…"; }
    else { btn.disabled = false; if (btn.dataset.l) btn.textContent = btn.dataset.l; }
  }
  function showMsg(el, text, kind = "bad") { if (!el) return; el.className = "msg " + kind; el.textContent = text; el.hidden = !text; }
  const groupLabel = (g) => "المجموعة " + g.num + (g.title ? " · " + g.title : "");
  window.MM = { api, store, esc, digits, cleanName, normPhone, toast, busy, showMsg, groupLabel };
})();
