//ENGINE_START
/* مسار منجز: محرك الخريطة والمسارات (بدون أي خدمة خارجية) */
const MSR = (() => {
  const CLS = ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','pedestrian','footway','path','cycleway','steps','track','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','road'];
  const CAR_KMH = [100,80,60,50,40,35,25,15,15,0,0,0,0,0,15,60,50,40,35,30,30];
  const ROAD_RANK = [0,1,2,3,4,5,6,6,7,8,8,8,8,8,7,1,1,2,3,4,6];
  const R = 6371008.8, D2R = Math.PI / 180;

  function hav(la1, lo1, la2, lo2) {
    const a = Math.sin((la2 - la1) * D2R / 2) ** 2 + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.sin((lo2 - lo1) * D2R / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function bearing(la1, lo1, la2, lo2) {
    const y = Math.sin((lo2 - lo1) * D2R) * Math.cos(la2 * D2R);
    const x = Math.cos(la1 * D2R) * Math.sin(la2 * D2R) - Math.sin(la1 * D2R) * Math.cos(la2 * D2R) * Math.cos((lo2 - lo1) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }

  function parse(buf, names) {
    const dv = new DataView(buf);
    const nN = dv.getUint32(4, true), nW = dv.getUint32(8, true);
    const lat = new Float64Array(nN), lon = new Float64Array(nN);
    let o = 12;
    for (let i = 0; i < nN; i++) { lat[i] = dv.getInt32(o, true) / 1e6; lon[i] = dv.getInt32(o + 4, true) / 1e6; o += 8; }
    const ways = new Array(nW);
    for (let w = 0; w < nW; w++) {
      const cls = dv.getUint8(o), one = dv.getUint8(o + 1), ms = dv.getUint8(o + 2), fl = dv.getUint8(o + 3);
      const nm = dv.getUint16(o + 4, true), n = dv.getUint16(o + 6, true); o += 8;
      const refs = new Uint32Array(buf.slice(o, o + n * 4)); o += n * 4;
      ways[w] = { cls, one, ms, fl, nm, refs };
    }
    return { lat, lon, ways, names: [['', '']].concat(names) };
  }

  // profile: 'car' | 'foot' | 'bike'
  function allowed(p, w) {
    if (w.fl & 8) return false;
    const c = CLS[w.cls];
    if (p === 'car') return CAR_KMH[w.cls] > 0;
    if (p === 'foot') return !['motorway','motorway_link','trunk','trunk_link'].includes(c);
    return !['motorway','motorway_link','steps'].includes(c);
  }
  function speed(p, w) {
    if (p === 'foot') return w.cls === 13 ? 3 : 5;
    if (p === 'bike') return w.cls === 12 ? 18 : (w.cls >= 9 && w.cls <= 11 ? 10 : 15);
    const base = CAR_KMH[w.cls];
    return w.ms ? Math.min(base * 1.15, w.ms * 0.85) : base;
  }

  // CSR adjacency per profile
  function build(G, p) {
    const nN = G.lat.length, deg = new Uint32Array(nN + 1);
    const list = [];
    G.ways.forEach((w, wi) => {
      if (!allowed(p, w)) return;
      const ignoreOne = p === 'foot' || (p === 'bike' && w.cls === 12);
      const fwd = ignoreOne || w.one !== 2, bwd = ignoreOne || w.one === 0;
      const v = speed(p, w) / 3.6;
      for (let i = 0; i + 1 < w.refs.length; i++) {
        const a = w.refs[i], b = w.refs[i + 1];
        const d = hav(G.lat[a], G.lon[a], G.lat[b], G.lon[b]);
        if (fwd) { list.push(a, b, d, d / v, wi); deg[a]++; }
        if (bwd) { list.push(b, a, d, d / v, wi); deg[b]++; }
      }
    });
    const off = new Uint32Array(nN + 1);
    for (let i = 0; i < nN; i++) off[i + 1] = off[i] + deg[i];
    const m = list.length / 5, to = new Uint32Array(m), len = new Float32Array(m), cost = new Float32Array(m), way = new Uint32Array(m);
    const fill = off.slice(0, nN);
    for (let k = 0; k < list.length; k += 5) {
      const a = list[k], j = fill[a]++;
      to[j] = list[k + 1]; len[j] = list[k + 2]; cost[j] = list[k + 3]; way[j] = list[k + 4];
    }
    let vmax = 0; G.ways.forEach(w => { if (allowed(p, w)) vmax = Math.max(vmax, speed(p, w)); });
    // keep only the main connected network (undirected), so isolated fragments never trap a route
    const par = new Int32Array(nN); for (let i = 0; i < nN; i++) par[i] = i;
    const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let a = 0; a < nN; a++) for (let j = off[a]; j < off[a + 1]; j++) { const x = find(a), y = find(to[j]); if (x !== y) par[x] = y; }
    const sz = new Map(); for (let i = 0; i < nN; i++) if (off[i + 1] > off[i]) { const r = find(i); sz.set(r, (sz.get(r) || 0) + 1); }
    let mainRoot = -1, ms = 0; sz.forEach((v, k) => { if (v > ms) { ms = v; mainRoot = k; } });
    // spatial grid of routable nodes
    const grid = new Map(), cs = 0.004;
    for (let i = 0; i < nN; i++) if (off[i + 1] > off[i] && find(i) === mainRoot) {
      const k = Math.floor(G.lat[i] / cs) + ':' + Math.floor(G.lon[i] / cs);
      let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(i);
    }
    return { p, off, to, len, cost, way, vmax: vmax / 3.6, grid, cs };
  }

  function nearest(G, A, la, lo) {
    let best = -1, bd = Infinity;
    const gi = Math.floor(la / A.cs), gj = Math.floor(lo / A.cs);
    for (let r = 0; r < 25 && (best < 0 || r < 3); r++) {
      for (let i = gi - r; i <= gi + r; i++) for (let j = gj - r; j <= gj + r; j++) {
        if (Math.max(Math.abs(i - gi), Math.abs(j - gj)) !== r) continue;
        const c = A.grid.get(i + ':' + j); if (!c) continue;
        for (const n of c) { const d = hav(la, lo, G.lat[n], G.lon[n]); if (d < bd) { bd = d; best = n; } }
      }
    }
    return best < 0 ? null : { node: best, dist: bd };
  }

  // o: { shortest: true } to minimise distance, { avoidHwy, avoidDirt } to steer away from motorways or unpaved tracks
  function route(G, A, s, t, pen, o) {
    o = o || {}; const byLen = !!o.shortest, HW = o.avoidHwy, DIRT = o.avoidDirt;
    const nN = G.lat.length;
    const g = new Float64Array(nN).fill(Infinity), prev = new Int32Array(nN).fill(-1), pe = new Int32Array(nN).fill(-1);
    const closed = new Uint8Array(nN);
    const heap = [], hk = [];
    const push = (n, k) => { heap.push(n); hk.push(k); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hk[p], hk[i]] = [hk[i], hk[p]]; i = p; } };
    const pop = () => { const n = heap[0], last = heap.pop(), lk = hk.pop(); if (heap.length) { heap[0] = last; hk[0] = lk; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [hk[m], hk[i]] = [hk[i], hk[m]]; i = m; } } return n; };
    const tl = G.lat[t], to2 = G.lon[t];
    g[s] = 0; push(s, 0);
    let iters = 0;
    while (heap.length) {
      const u = pop(); if (closed[u]) continue; closed[u] = 1; iters++;
      if (u === t) break;
      for (let j = A.off[u]; j < A.off[u + 1]; j++) {
        const v = A.to[j]; let add = 0; if (pen && v !== t) { add = pen.get(v) || 0; if (add === Infinity) continue; }
        let c = byLen ? A.len[j] : A.cost[j];
        if (HW || DIRT) { const k = G.ways[A.way[j]].cls; if (HW && (k <= 1 || k === 15 || k === 16)) c *= 4; if (DIRT && k === 14) c *= 6; }
        const nd = g[u] + c + (byLen ? add * 10 : add);
        if (nd < g[v]) { g[v] = nd; prev[v] = u; pe[v] = j; push(v, nd + (byLen ? hav(G.lat[v], G.lon[v], tl, to2) : hav(G.lat[v], G.lon[v], tl, to2) / A.vmax)); }
      }
    }
    if (!isFinite(g[t])) return null;
    const edges = [];
    for (let v = t; v !== s; v = prev[v]) edges.push(pe[v]);
    edges.reverse();
    const nodes = [s]; let dist = 0;
    let time = 0;
    edges.forEach(e => { const v = A.to[e]; nodes.push(v); dist += A.len[e]; time += A.cost[e]; if (pen && v !== t) { const x = pen.get(v); if (x && x !== Infinity) time += x; } });
    return { nodes, edges, dist, time, iters };
  }

  // ---------- Arabic turn-by-turn ----------
  function roadName(G, wi) { const n = G.names[G.ways[wi].nm]; return n ? (n[0] || n[1] || '') : ''; }
  function turnWord(delta) {
    const a = Math.abs(delta), side = delta > 0 ? 'يميناً' : 'يساراً';
    if (a < 25) return { t: 'straight', w: 'تابع مستقيماً' };
    if (a < 50) return { t: delta > 0 ? 'slight-right' : 'slight-left', w: 'انحرف قليلاً ' + side };
    if (a < 130) return { t: delta > 0 ? 'right' : 'left', w: 'انعطف ' + side };
    if (a < 165) return { t: delta > 0 ? 'sharp-right' : 'sharp-left', w: 'انعطف بحدة ' + side };
    return { t: 'uturn', w: 'استدر للخلف' };
  }
  const ORD = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن'];

  function steps(G, A, r) {
    const { nodes, edges } = r, out = [];
    const cum = [0];
    for (let i = 0; i < edges.length; i++) cum.push(cum[i] + A.len[edges[i]]);
    const way = i => A.way[edges[i]];
    const brg = (i) => bearing(G.lat[nodes[i]], G.lon[nodes[i]], G.lat[nodes[i + 1]], G.lon[nodes[i + 1]]);
    out.push({ i: 0, type: 'depart', text: 'انطلق' + (roadName(G, way(0)) ? ' على ' + roadName(G, way(0)) : ''), name: roadName(G, way(0)), at: 0 });
    let i = 1;
    while (i < edges.length) {
      const w0 = way(i - 1), w1 = way(i);
      const rb0 = G.ways[w0].fl & 1, rb1 = G.ways[w1].fl & 1;
      if (!rb0 && rb1) { // entering roundabout: count exits until leaving
        let j = i, exits = 0;
        while (j < edges.length && (G.ways[way(j)].fl & 1)) {
          const n = nodes[j + 1];
          if (j + 1 < edges.length && !(G.ways[way(j + 1)].fl & 1)) { exits++; break; }
          if (A.off[n + 1] - A.off[n] > 1) {
            for (let k = A.off[n]; k < A.off[n + 1]; k++) if (!(G.ways[A.way[k]].fl & 1)) { exits++; break; }
          }
          j++;
        }
        const nm = j + 1 < edges.length ? roadName(G, way(j + 1)) : '';
        out.push({ i, type: 'roundabout', exit: exits, text: 'ادخل الدوّار واخرج من المخرج ' + (ORD[Math.max(0, exits - 1)] || exits) + (nm ? ' إلى ' + nm : ''), name: nm, at: cum[i] });
        i = j + 1; continue;
      }
      if (rb1) { i++; continue; }
      let delta = brg(i) - brg(i - 1); if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
      const n0 = G.ways[w0].nm, n1 = G.ways[w1].nm;
      const node = nodes[i], branches = A.off[node + 1] - A.off[node];
      const nameChange = n0 !== n1 && (n1 !== 0 || Math.abs(delta) > 35);
      if ((Math.abs(delta) > 35 && branches > 2) || (nameChange && branches > 1 && Math.abs(delta) > 20) || Math.abs(delta) > 120) {
        const tw = turnWord(delta), nm = roadName(G, w1);
        out.push({ i, type: tw.t, text: tw.w + (nm ? ' إلى ' + nm : ''), name: nm, at: cum[i] });
      } else if (nameChange && n1 !== 0 && Math.abs(delta) <= 20 && roadName(G, w1)) {
        out.push({ i, type: 'straight', text: 'تابع مستقيماً على ' + roadName(G, w1), name: roadName(G, w1), at: cum[i], soft: 1 });
      }
      i++;
    }
    out.push({ i: edges.length, type: 'arrive', text: 'وصلت إلى وجهتك', name: '', at: cum[edges.length] });
    // merge very close soft steps
    const res = [];
    out.forEach(s => { const p = res[res.length - 1]; if (p && s.soft && (s.at - p.at < 60 || s.name === p.name)) return; res.push(s); });
    return { list: res, cum };
  }

  function fmtDist(m) {
    if (m < 50) return 'الآن';
    if (m < 1000) return Math.round(m / 10) * 10 + ' م';
    return (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' كم';
  }
  function fmtDur(s) {
    const m = Math.max(1, Math.round(s / 60));
    if (m < 60) return m + ' د';
    return Math.floor(m / 60) + ' س ' + (m % 60 ? (m % 60) + ' د' : '');
  }
  function fmtClock(d) {
    let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); const ap = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12; return h + ':' + m + ' ' + ap;
  }
  function spoken(m) {
    if (m < 1000) return 'بعد ' + (Math.round(m / 50) * 50) + ' متر';
    return 'بعد ' + (m / 1000).toFixed(1).replace('.0', '') + ' كيلومتر';
  }
  return { CLS, ROAD_RANK, hav, bearing, parse, build, nearest, route, steps, speed, allowed, fmtDist, fmtDur, fmtClock, spoken, roadName };
})();
if (typeof module !== 'undefined') module.exports = MSR;
//ENGINE_END
