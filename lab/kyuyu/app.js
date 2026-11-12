// 給油ノート — 給油の記録から、満タン〜満タンの燃費、月のガソリン代、1kmあたりの費用、整備の時期を出す。車は何台でも。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-kyuyu-v1";
  const CK = KEY + ".custom";
  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const today = ymd(new Date());
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const full = s => { const d = parseYmd(s); return (d.getFullYear() !== parseYmd(today).getFullYear() ? `${d.getFullYear()}年` : "") + md(s); };
  const days = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const addMonths = (s, n) => { const d = parseYmd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return ymd(d); };
  const str = (v, max) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  // 全角の数字、カンマ、単位つきでも読む
  function num(s) {
    const t = String(s == null ? "" : s).normalize("NFKC").replace(/[,，、\s]/g, "").replace(/(km|ｋｍ|l|ℓ|リットル|円|¥|￥)$/i, "").replace(/^[¥￥]/, "");
    return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
  }
  const okNum = (v, lo, hi) => typeof v === "number" && isFinite(v) && v > lo && v <= hi;
  const yen = n => `${Math.round(n).toLocaleString("ja-JP")}円`;
  const km = n => `${Math.round(n).toLocaleString("ja-JP")}km`;
  const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
  const f2 = n => (Math.round(n * 100) / 100).toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const MAINT = [
    { k: "オイル交換", km: 5000, mon: 6 },
    { k: "オイルフィルター", km: 10000, mon: 12 },
    { k: "タイヤのローテーション", km: 5000, mon: 0 },
    { k: "ワイパーゴム", km: 0, mon: 12 },
    { k: "バッテリー", km: 0, mon: 36 },
    { k: "車検", km: 0, mon: 24 }
  ];
  const MK = Object.fromEntries(MAINT.map(m => [m.k, m]));

  // ---------- 保存 ----------
  function clean(raw) {
    if (!raw || !Array.isArray(raw.cars)) return null;
    const cars = raw.cars.slice(0, 20).map(c => c && str(c.name, 16) ? { id: str(c.id, 24) || uid(), name: str(c.name, 16), mode: c.mode === "trip" ? "trip" : "odo", sample: c.sample === true } : null).filter(Boolean);
    const ids = new Set(cars.map(c => c.id));
    const fills = (Array.isArray(raw.fills) ? raw.fills : []).slice(0, 5000).map(f => {
      if (!f || !ids.has(f.car) || !isYmd(f.date) || !okNum(f.liters, 0, 300)) return null;
      const ppl = okNum(f.ppl, 0, 1000) ? f.ppl : null, total = okNum(f.total, 0, 1e6) ? f.total : null;
      if (ppl == null && total == null) return null;
      return { id: str(f.id, 24) || uid(), car: f.car, date: f.date, odo: okNum(f.odo, 0, 3e6) ? f.odo : null, trip: okNum(f.trip, 0, 1e4) ? f.trip : null,
        liters: f.liters, ppl, total, full: f.full !== false, note: str(f.note, 40), seq: Number.isInteger(f.seq) ? f.seq : 0 };
    }).filter(Boolean);
    const maint = (Array.isArray(raw.maint) ? raw.maint : []).slice(0, 200).map(m => m && ids.has(m.car) && str(m.k, 20) ? {
      id: str(m.id, 24) || uid(), car: m.car, k: str(m.k, 20), last: isYmd(m.last) ? m.last : "", lastOdo: okNum(m.lastOdo, -1, 3e6) ? m.lastOdo : null,
      km: Number.isInteger(m.km) && m.km > 0 && m.km <= 1e6 ? m.km : 0, mon: Number.isInteger(m.mon) && m.mon > 0 && m.mon <= 240 ? m.mon : 0
    } : null).filter(Boolean);
    return { v: 1, cars, fills, maint, cur: ids.has(raw.cur) ? raw.cur : cars[0] ? cars[0].id : "" };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, cars: [], fills: [], maint: [], cur: "" };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };
  const car = () => st.cars.find(c => c.id === st.cur);
  const nextSeq = () => st.fills.reduce((a, f) => Math.max(a, f.seq), 0) + 1;

  // ---------- 計算 ----------
  const cost = f => f.total != null ? f.total : f.liters * f.ppl;
  const unitPrice = f => f.ppl != null ? f.ppl : f.total / f.liters;
  function ordered(carId) {
    return st.fills.filter(f => f.car === carId).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.odo != null && b.odo != null && a.odo !== b.odo ? a.odo - b.odo : a.seq - b.seq));
  }
  // 各給油の「前回からの距離」と「メーターの位置」、満タン〜満タンの燃費
  function compute(carId) {
    const fs = ordered(carId);
    let pos = null, lastFull = -1;
    const rows = fs.map(f => ({ f, seg: null, pos: null, econ: null, win: null }));
    rows.forEach((r, i) => {
      const f = r.f;
      if (f.trip != null) r.seg = f.trip;
      else if (f.odo != null && pos != null && i > 0) r.seg = f.odo - pos;
      if (r.seg != null && r.seg <= 0) r.seg = null;
      r.pos = f.odo != null ? f.odo : pos != null && f.trip != null ? pos + f.trip : null;
      pos = r.pos;
      if (f.full) {
        if (lastFull >= 0) {
          const span = rows.slice(lastFull + 1, i + 1);
          const dist = span.every(x => x.seg != null) ? span.reduce((a, x) => a + x.seg, 0) : null;
          const lit = span.reduce((a, x) => a + x.f.liters, 0);
          const yenSum = span.reduce((a, x) => a + cost(x.f), 0);
          if (dist && lit > 0) { r.econ = dist / lit; r.win = { dist, lit, yen: yenSum, from: rows[lastFull].f.date, n: span.length }; }
        }
        lastFull = i;
      }
    });
    const wins = rows.filter(r => r.econ != null);
    const dist = wins.reduce((a, r) => a + r.win.dist, 0), lit = wins.reduce((a, r) => a + r.win.lit, 0), ys = wins.reduce((a, r) => a + r.win.yen, 0);
    const curPos = rows.reduce((a, r) => r.pos != null && (a == null || r.pos > a) ? r.pos : a, null);
    return {
      rows, wins, avg: lit ? dist / lit : null, perKm: dist ? ys / dist : null,
      best: wins.length ? wins.reduce((a, r) => r.econ > a.econ ? r : a) : null,
      worst: wins.length ? wins.reduce((a, r) => r.econ < a.econ ? r : a) : null,
      curPos, last: rows[rows.length - 1] || null
    };
  }
  function monthly(carId) {
    const m = new Map();
    st.fills.filter(f => f.car === carId).forEach(f => { const k = f.date.slice(0, 7); m.set(k, (m.get(k) || 0) + cost(f)); });
    return m;
  }

  // ---------- 整備の計算 ----------
  function mStatus(m, c) {
    let kmLeft = null, dateDue = null, dLeft = null;
    if (m.km) {
      let since = null;
      if (m.lastOdo != null && c.curPos != null) since = c.curPos - m.lastOdo;
      else if (m.last) { const after = c.rows.filter(r => r.f.date > m.last); if (after.every(r => r.seg != null)) since = after.reduce((a, r) => a + r.seg, 0); }
      if (since != null) kmLeft = m.km - since;
    }
    if (m.mon && m.last) { dateDue = addMonths(m.last, m.mon); dLeft = days(today, dateDue); }
    const parts = [];
    if (kmLeft != null) parts.push(kmLeft < 0 ? `${km(-kmLeft)}過ぎ` : `あと${km(kmLeft)}`);
    if (dateDue) parts.push(dLeft < 0 ? `${full(dateDue)}を過ぎました` : `${full(dateDue)}まで`);
    let cls = "ok", rank = 2;
    if ((kmLeft != null && kmLeft < 0) || (dLeft != null && dLeft < 0)) { cls = "over"; rank = 0; }
    else if ((kmLeft != null && kmLeft <= Math.max(500, m.km * 0.1)) || (dLeft != null && dLeft <= 30)) { cls = "soon"; rank = 1; }
    if (!parts.length) { cls = "unset"; rank = 3; parts.push(!m.last && m.lastOdo == null ? "前回の日かメーターを入れてください" : m.km && !m.mon ? "メーターの数字がそろうと残りの距離が出ます" : "間隔を入れてください"); }
    return { cls, rank, text: parts.join("・"), sortKey: Math.min(kmLeft != null ? kmLeft / Math.max(m.km, 1) * 365 : 1e9, dLeft != null ? dLeft : 1e9) };
  }

  // ---------- 表示 ----------
  let tab = "log", flashId = null;
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  function renderCars() {
    const nodes = st.cars.map(c => {
      const b = el("button", "car-btn", c.name); b.type = "button";
      b.setAttribute("aria-pressed", String(c.id === st.cur));
      b.addEventListener("click", () => { st.cur = c.id; save(); render(); });
      return b;
    });
    const add = el("button", "car-btn add", "＋ 車を追加"); add.type = "button";
    add.addEventListener("click", () => openCar());
    $("cars").replaceChildren(...nodes, add);
    $("cars").hidden = !st.cars.length;
  }
  function renderGauge(c) {
    const ym = today.slice(0, 7);
    const mm = monthly(st.cur);
    $("gMonth").textContent = mm.has(ym) ? yen(mm.get(ym)) : "0円";
    $("gPerKm").textContent = c.perKm != null ? `${f1(c.perKm)}円` : "--";
    $("gBest").textContent = c.best ? `${f1(c.best.econ)} km/L` : "--";
    $("gWorst").textContent = c.worst ? `${f1(c.worst.econ)} km/L` : "--";
    const lastWin = c.wins[c.wins.length - 1];
    $("gEcon").textContent = c.avg != null ? f1(c.avg) : "--";
    const fullN = c.rows.filter(r => r.f.full).length;
    $("gNote").textContent = lastWin ? `前回の満タンから ${f1(lastWin.econ)} km/L（${km(lastWin.win.dist)}・${f1(lastWin.win.lit)}L）` :
      !c.rows.length ? "給油を記録すると、ここに燃費が出ます。" :
      fullN < 2 ? `満タンの記録があと${2 - fullN}回で、燃費が出ます。` : "距離が抜けている記録があるため、燃費を出せません。履歴を確認してください。";
  }
  function renderFills(c) {
    const rows = c.rows.slice().reverse();
    $("fillNone").hidden = !!rows.length;
    $("fills").replaceChildren(...rows.map(r => {
      const f = r.f;
      const li = el("li");
      const b = el("button", "fill"); b.type = "button";
      if (f.id === flashId) b.classList.add("flash");
      const left = el("div", "f-left");
      left.append(el("b", "f-date", full(f.date)));
      const sub = [];
      if (f.odo != null) sub.push(`メーター ${km(f.odo)}`);
      if (r.seg != null) sub.push(`前回から ${km(r.seg)}`);
      left.append(el("small", null, sub.join("・") || "距離なし"));
      left.append(el("small", null, `${f2(f.liters)}L・${f1(unitPrice(f))}円/L・${yen(cost(f))}`));
      if (f.note) left.append(el("small", "f-note", f.note));
      const right = el("div", "f-right");
      right.append(el("span", f.full ? "tag full" : "tag part", f.full ? "満タン" : "少しだけ"));
      if (r.econ != null) {
        const e = el("span", "econ"); e.append(el("b", null, f1(r.econ)), " km/L");
        if (c.best && r === c.best && c.wins.length > 1) e.classList.add("best");
        if (c.worst && r === c.worst && c.wins.length > 1) e.classList.add("worst");
        right.append(e);
      }
      b.append(left, right);
      b.setAttribute("aria-label", `${full(f.date)}の給油、${f2(f.liters)}リットル、${yen(cost(f))}${r.econ != null ? `、燃費${f1(r.econ)}キロメートル毎リットル` : ""}。押すと編集できます`);
      b.addEventListener("click", () => openFill(f.id));
      li.append(b); return li;
    }));
  }
  function axisText(svg, x, y, t, anchor) { const e = sv("text", { x, y, class: "ax", "text-anchor": anchor || "middle" }); e.textContent = t; svg.append(e); }
  function renderCharts(c) {
    // 燃費
    const svg = $("econChart"); svg.replaceChildren();
    const W = 340, H = 190, L = 36, R = 12, T = 14, B = 28;
    const pts = c.wins.slice(-24);
    $("econNone").hidden = pts.length >= 2; svg.parentNode.hidden = pts.length < 2;
    if (pts.length >= 2) {
      let lo = Math.min(...pts.map(r => r.econ)), hi = Math.max(...pts.map(r => r.econ));
      const p = Math.max((hi - lo) * 0.2, 0.5); lo = Math.max(0, lo - p); hi += p;
      const X = i => L + i / (pts.length - 1) * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
      for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3; svg.append(sv("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: "grid" })); axisText(svg, L - 5, Y(v) + 4, f1(v), "end"); }
      if (c.avg != null) { svg.append(sv("line", { x1: L, x2: W - R, y1: Y(c.avg), y2: Y(c.avg), class: "avg" })); axisText(svg, W - R, Y(c.avg) - 5, `平均 ${f1(c.avg)}`, "end"); }
      svg.append(sv("path", { d: "M" + pts.map((r, i) => `${X(i).toFixed(1)},${Y(r.econ).toFixed(1)}`).join(" L"), class: "line" }));
      pts.forEach((r, i) => svg.append(sv("circle", { cx: X(i), cy: Y(r.econ), r: r === c.best ? 5 : r === c.worst ? 5 : 3, class: r === c.best ? "pt best" : r === c.worst ? "pt worst" : "pt" })));
      axisText(svg, L, H - 8, md(pts[0].f.date).replace("月", "/").replace("日", ""), "start");
      axisText(svg, W - R, H - 8, md(pts[pts.length - 1].f.date).replace("月", "/").replace("日", ""), "end");
      svg.setAttribute("aria-label", `燃費のグラフ。${pts.map(r => `${full(r.f.date)} ${f1(r.econ)}`).join("、")} km/L`);
    }
    // 月ごと
    const cs = $("costChart"); cs.replaceChildren();
    const mm = monthly(st.cur);
    const months = [];
    for (let i = 11; i >= 0; i--) { const k = addMonths(today.slice(0, 7) + "-01", -i).slice(0, 7); months.push([k, mm.get(k) || 0]); }
    const max = Math.max(...months.map(m => m[1]), 1);
    const nice = max <= 10000 ? 10000 : Math.ceil(max / 10000) * 10000;
    const bw = (W - L - R) / 12;
    for (let i = 0; i <= 2; i++) { const v = nice * i / 2, y = T + (1 - v / nice) * (H - T - B); cs.append(sv("line", { x1: L, x2: W - R, y1: y, y2: y, class: "grid" })); axisText(cs, L - 5, y + 4, v >= 10000 ? `${v / 10000}万` : String(v), "end"); }
    months.forEach(([k, v], i) => {
      const h = v / nice * (H - T - B);
      if (v) cs.append(sv("rect", { x: L + i * bw + bw * 0.18, y: H - B - h, width: bw * 0.64, height: Math.max(h, 1), rx: 2, class: k === today.slice(0, 7) ? "bar now" : "bar" }));
      if (i % 2 === 1 || i === 11) axisText(cs, L + i * bw + bw / 2, H - 8, `${Number(k.slice(5))}月`);
    });
    cs.setAttribute("aria-label", `月ごとのガソリン代。${months.filter(m => m[1]).map(([k, v]) => `${Number(k.slice(5))}月 ${yen(v)}`).join("、") || "記録なし"}`);
    const list = [...mm].sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 24);
    $("months").replaceChildren(...list.map(([k, v]) => { const li = el("li"); li.append(el("span", null, `${k.slice(0, 4)}年${Number(k.slice(5))}月`), el("b", null, yen(v))); return li; }));
  }
  function renderMaint(c, onlyAlerts) {
    const ms = st.maint.filter(m => m.car === st.cur).map(m => ({ m, s: mStatus(m, c) })).sort((a, b) => a.s.rank - b.s.rank || a.s.sortKey - b.s.sortKey);
    const al = ms.filter(x => x.s.rank <= 1);
    $("mtAlerts").replaceChildren(...al.map(({ m, s }) => {
      const d = el("div", "mt " + s.cls);
      d.append(el("span", null, `${m.k}：${s.text}`));
      const b = el("button", "btn small", "済み"); b.type = "button"; b.addEventListener("click", () => maintDone(m, c)); d.append(b); return d;
    }));
    if (onlyAlerts) return;
    $("mNone").hidden = !!ms.length;
    $("mlist").replaceChildren(...ms.map(({ m, s }) => {
      const li = el("li", "m " + s.cls);
      const info = el("button", "m-info"); info.type = "button";
      const ev = [m.km ? km(m.km) : "", m.mon ? (m.mon % 12 === 0 ? `${m.mon / 12}年` : `${m.mon}か月`) : ""].filter(Boolean).join("か");
      info.append(el("b", null, m.k), el("span", "m-st", s.text));
      const meta = [];
      if (m.last) meta.push(`前回 ${full(m.last)}`);
      if (m.lastOdo != null) meta.push(km(m.lastOdo));
      meta.push(ev ? `${ev}ごと（目安）` : "間隔なし");
      info.append(el("small", null, meta.join("・")));
      info.addEventListener("click", () => openMaint(m.id));
      const b = el("button", "btn small", "済み"); b.type = "button"; b.setAttribute("aria-label", `${m.k}を今日済みにする`);
      b.addEventListener("click", () => maintDone(m, c));
      li.append(info, b); return li;
    }));
  }
  function maintDone(m, c) {
    const snap = snapshot();
    m.last = today; m.lastOdo = c.curPos; save(); render();
    toast(c.curPos != null ? `${m.k}：今日、${km(c.curPos)}で済みにしました。` : `${m.k}：今日済みにしました。`, () => { restore(snap); render(); });
  }
  function render() {
    const cr = car();
    $("empty").hidden = !!cr; $("main").hidden = !cr;
    $("sampleBar").hidden = !st.cars.some(c => c.sample);
    renderCars();
    if (!cr) return;
    const c = compute(cr.id);
    renderGauge(c);
    $("logView").hidden = tab !== "log"; $("chartView").hidden = tab !== "chart"; $("maintView").hidden = tab !== "maint";
    renderMaint(c, tab !== "maint");
    if (tab === "log") renderFills(c); else if (tab === "chart") renderCharts(c);
    flashId = null;
  }

  // ---------- 給油の記録 ----------
  let fEdit = null;
  const dm = () => document.querySelector("input[name=dm]:checked").value;
  const pm = () => document.querySelector("input[name=pm]:checked").value;
  function prevOf(date, exceptId) {
    // その日付より前（同じ日なら先に入れたもの）で、メーターの位置がわかる最後の給油
    const c = compute(st.cur);
    const before = c.rows.filter(r => r.f.id !== exceptId && r.f.date <= date);
    return { before, last: before[before.length - 1] || null, pos: before.length ? before[before.length - 1].pos : null };
  }
  function syncFill() {
    const odo = dm() === "odo";
    $("distL").textContent = odo ? "メーターの総距離（km）" : "前回の給油から走った距離（km）";
    $("fDist").placeholder = odo ? "45210" : "412.5";
    $("priceL").firstChild.data = pm() === "ppl" ? "1Lあたりの値段（円）" : "合計金額（円）";
    $("fPrice").placeholder = pm() === "ppl" ? "172" : "6054";
    const date = isYmd($("fDate").value) ? $("fDate").value : today;
    const p = prevOf(date, fEdit);
    $("distHint").textContent = odo ? (p.pos != null ? `前回は ${km(p.pos)}（${full(p.last.f.date)}）でした。` : "今のメーターの数字を入れます。") :
      p.last ? "トリップメーターの数字を入れます（給油のたびに0に戻すと楽です）。" : "最初の給油は空でかまいません。";
    // 見込み
    const lit = num($("fLit").value), pr = num($("fPrice").value);
    const out = [];
    if (okNum(lit, 0, 300) && okNum(pr, 0, 1e6)) out.push(pm() === "ppl" ? `合計 ${yen(lit * pr)}` : `1Lあたり ${f1(pr / lit)}円`);
    const dv = num($("fDist").value);
    const fullTank = document.querySelector("input[name=full]:checked").value === "1";
    if (fullTank && okNum(lit, 0, 300) && dv != null) {
      // 前回の満タンからの燃費を見込む
      const rows = p.before; let i = rows.length - 1; let dist = 0, litSum = lit, okD = true;
      const seg = odo ? (p.pos != null ? dv - p.pos : null) : dv;
      if (seg == null || seg <= 0) okD = false; else dist = seg;
      while (okD && i >= 0 && !rows[i].f.full) { if (rows[i].seg == null) okD = false; else { dist += rows[i].seg; litSum += rows[i].f.liters; } i--; }
      if (okD && i >= 0) out.push(`燃費 ${f1(dist / litSum)} km/L（${km(dist)}）`);
    }
    $("preview").textContent = out.join("・");
  }
  ["fDate", "fDist", "fLit", "fPrice"].forEach(k => $(k).addEventListener("input", () => { clearErr(); syncFill(); }));
  document.querySelectorAll("input[name=dm],input[name=pm],input[name=full]").forEach(r => r.addEventListener("change", () => { clearErr(); syncFill(); }));
  function clearErr() { $("fErr").textContent = ""; ["fDist", "fLit", "fPrice", "fDate"].forEach(k => $(k).removeAttribute("aria-invalid")); }
  function openFill(id) {
    fEdit = id || null;
    const f = id ? st.fills.find(x => x.id === id) : null;
    const cr = car();
    $("fH").textContent = f ? "給油の記録を編集" : `給油を記録（${cr.name}）`;
    $("fDate").value = f ? f.date : today; $("fDate").max = today;
    const mode = f ? (f.trip != null ? "trip" : f.odo != null ? "odo" : cr.mode) : cr.mode;
    document.querySelector(`input[name=dm][value=${mode}]`).checked = true;
    $("fDist").value = f ? (mode === "trip" ? (f.trip != null ? String(f.trip) : "") : (f.odo != null ? String(f.odo) : "")) : "";
    $("fLit").value = f ? String(f.liters) : "";
    const pmode = f && f.ppl == null ? "total" : "ppl";
    document.querySelector(`input[name=pm][value=${pmode}]`).checked = true;
    $("fPrice").value = f ? String(pmode === "total" ? f.total : f.ppl) : "";
    document.querySelector(`input[name=full][value="${f && !f.full ? 0 : 1}"]`).checked = true;
    $("fNote").value = f ? f.note : "";
    $("fDel").hidden = !f;
    clearErr(); syncFill();
    $("fillDlg").showModal();
    if (!f) $("fDist").focus();
  }
  $("fillBtn").addEventListener("click", () => openFill());
  $("fCancel").addEventListener("click", () => $("fillDlg").close());
  function fail(id, msg) { $("fErr").textContent = msg; $(id).setAttribute("aria-invalid", "true"); $(id).focus(); }
  $("fillForm").addEventListener("submit", e => {
    e.preventDefault();
    const date = $("fDate").value;
    if (!isYmd(date) || date > today) return fail("fDate", "給油した日を、今日以前の日付で入れてください。");
    const mode = dm(), dRaw = $("fDist").value.trim(), dv = num(dRaw);
    const p = prevOf(date, fEdit);
    let odo = null, trip = null;
    if (mode === "odo") {
      if (dv == null || !okNum(dv, 0, 3e6)) return fail("fDist", "メーターの総距離を数字で入れてください（例：45210）。");
      if (p.pos != null && dv <= p.pos) return fail("fDist", `前回（${full(p.last.f.date)}）の ${km(p.pos)} より大きい数字を入れてください。`);
      const later = compute(st.cur).rows.filter(r => r.f.id !== fEdit && r.f.date > date && r.f.odo != null)[0];
      if (later && dv >= later.f.odo) return fail("fDist", `${full(later.f.date)}の ${km(later.f.odo)} より小さい数字のはずです。日付を確認してください。`);
      odo = dv;
    } else {
      if (dRaw && (dv == null || !okNum(dv, 0, 1e4))) return fail("fDist", "前回から走った距離を数字で入れてください（例：412.5）。");
      if (!dRaw && p.last) return fail("fDist", "前回の給油から走った距離を入れてください。分からないときは「メーターの総距離」で入れてください。");
      trip = dRaw ? dv : null;
    }
    const lit = num($("fLit").value);
    if (!okNum(lit, 0, 300)) return fail("fLit", "入れた量をリットルで入れてください（例：35.2）。");
    const pr = num($("fPrice").value);
    if (pm() === "ppl" && !okNum(pr, 0, 1000)) return fail("fPrice", "1Lあたりの値段を入れてください（例：172）。");
    if (pm() === "total" && !okNum(pr, 0, 1e6)) return fail("fPrice", "合計金額を入れてください（例：6054）。");
    const snap = snapshot();
    const old = fEdit ? st.fills.find(x => x.id === fEdit) : null;
    const rec = { id: old ? old.id : uid(), car: st.cur, date, odo, trip, liters: lit, ppl: pm() === "ppl" ? pr : null, total: pm() === "total" ? pr : null,
      full: document.querySelector("input[name=full]:checked").value === "1", note: str($("fNote").value, 40), seq: old ? old.seq : nextSeq() };
    if (old) Object.assign(old, rec); else st.fills.push(rec);
    const cr = car(); if (!old) cr.mode = mode;
    save(); flashId = rec.id; $("fillDlg").close();
    tab = "log"; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tab === "log")));
    render();
    const r = compute(st.cur).rows.find(x => x.f.id === rec.id);
    toast(r && r.econ != null ? `記録しました。今回の燃費は ${f1(r.econ)} km/L です。` : old ? "更新しました。" : rec.full ? "記録しました。次の満タンで燃費が出ます。" : "記録しました。", () => { restore(snap); render(); });
  });
  $("fDel").addEventListener("click", () => {
    const f = st.fills.find(x => x.id === fEdit); if (!f) return;
    const snap = snapshot(); st.fills = st.fills.filter(x => x !== f); save(); $("fillDlg").close(); render();
    toast(`${full(f.date)}の給油を消しました。`, () => { restore(snap); render(); });
  });

  // ---------- 車 ----------
  let cEdit = null;
  function openCar(id) {
    cEdit = id || null;
    const c = id ? st.cars.find(x => x.id === id) : null;
    $("cH").textContent = c ? "車の設定" : "車を登録";
    $("cName").value = c ? c.name : "";
    document.querySelector(`input[name=cm][value=${c ? c.mode : "odo"}]`).checked = true;
    $("cDel").hidden = !c; $("cErr").textContent = ""; $("cName").removeAttribute("aria-invalid");
    $("carDlg").showModal(); $("cName").focus();
  }
  $("cName").addEventListener("input", () => { $("cErr").textContent = ""; $("cName").removeAttribute("aria-invalid"); });
  $("firstCar").addEventListener("click", () => openCar());
  $("carEdit").addEventListener("click", () => openCar(st.cur));
  $("cCancel").addEventListener("click", () => $("carDlg").close());
  $("carForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = str($("cName").value, 16);
    if (!name) { $("cErr").textContent = "車の名前を入れてください（例：フィット、家の車）。"; $("cName").setAttribute("aria-invalid", "true"); $("cName").focus(); return; }
    const mode = document.querySelector("input[name=cm]:checked").value;
    const snap = snapshot();
    if (cEdit) Object.assign(st.cars.find(x => x.id === cEdit), { name, mode });
    else {
      const c = { id: uid(), name, mode, sample: false };
      st.cars.push(c); st.cur = c.id;
      ["オイル交換", "車検"].forEach(k => st.maint.push({ id: uid(), car: c.id, k, last: "", lastOdo: null, km: MK[k].km, mon: MK[k].mon }));
    }
    save(); $("carDlg").close(); render();
    toast(cEdit ? "設定を保存しました。" : `${name}を登録しました。給油したら「給油を記録」を押してください。`, () => { restore(snap); render(); });
  });
  $("cDel").addEventListener("click", () => {
    const c = st.cars.find(x => x.id === cEdit); if (!c) return;
    if (!confirm(`${c.name}と、その給油・整備の記録をすべて消しますか？`)) return;
    const snap = snapshot();
    st.cars = st.cars.filter(x => x !== c); st.fills = st.fills.filter(f => f.car !== c.id); st.maint = st.maint.filter(m => m.car !== c.id);
    st.cur = st.cars[0] ? st.cars[0].id : ""; save(); $("carDlg").close(); render();
    toast(`${c.name}を消しました。`, () => { restore(snap); render(); });
  });

  // ---------- 整備 ----------
  let mEdit = null, mKind = "";
  const mFc = window.FreeChoice({
    key: CK, set: "maint", label: "整備の名前", max: 20, placeholder: "ブレーキフルード、エアコンフィルター",
    builtins: () => MAINT.map(m => ({ value: m.k, label: m.k })),
    onChange: () => renderMChips(),
    onPick: v => { mKind = v; renderMChips(); applyMDefault(); }
  });
  function renderMChips() {
    const chip = v => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "mk"; r.value = v; r.checked = v === mKind; r.addEventListener("change", () => { mKind = v; applyMDefault(); $("mErr").textContent = ""; }); l.append(r, el("span", null, v)); return l; };
    const own = mFc.values();
    const nodes = MAINT.map(m => chip(m.k));
    own.forEach(v => nodes.push(mFc.wrap(chip(v), v)));
    if (mKind && !MK[mKind] && !own.includes(mKind)) nodes.push(chip(mKind));
    $("mChips").replaceChildren(...nodes, mFc.root);
  }
  function applyMDefault() {
    const d = MK[mKind];
    $("mKm").value = d && d.km ? String(d.km) : ""; $("mMon").value = d && d.mon ? String(d.mon) : "";
    syncMHint();
  }
  function syncMHint() {
    $("mErr").textContent = "";
    $("mHint").textContent = mKind === "車検" ? "自家用の乗用車は2年ごと。新車の最初の車検だけは3年後です。" :
      mKind === "オイル交換" ? "距離と期間の、どちらか早い方で知らせます。乗り方や車種で目安は変わります。" :
      "距離と期間の、どちらか早い方で知らせます。片方だけでもかまいません。";
  }
  function openMaint(id) {
    mEdit = id || null;
    const m = id ? st.maint.find(x => x.id === id) : null;
    $("mH").textContent = m ? m.k : "整備を追加";
    $("mKindF").hidden = !!m;
    mKind = m ? m.k : ""; mFc.close(); renderMChips();
    $("mLast").value = m ? m.last : ""; $("mLast").max = today;
    $("mOdo").value = m && m.lastOdo != null ? String(m.lastOdo) : "";
    $("mKm").value = m && m.km ? String(m.km) : ""; $("mMon").value = m && m.mon ? String(m.mon) : "";
    $("mDel").hidden = !m;
    syncMHint();
    $("mDlg").showModal();
  }
  $("mAdd").addEventListener("click", () => openMaint());
  $("mCancel").addEventListener("click", () => $("mDlg").close());
  $("mDel").addEventListener("click", () => {
    const m = st.maint.find(x => x.id === mEdit); if (!m) return;
    const snap = snapshot(); st.maint = st.maint.filter(x => x !== m); save(); $("mDlg").close(); render();
    toast(`「${m.k}」を消しました。`, () => { restore(snap); render(); });
  });
  $("mForm").addEventListener("submit", e => {
    e.preventDefault();
    const err = (id, msg) => { $("mErr").textContent = msg; if (id) $(id).focus(); };
    if (!mKind) return err(null, "何の整備かを選ぶか、「＋ 自分で入力」で入れてください。");
    if (!mEdit && st.maint.some(m => m.car === st.cur && m.k === mKind)) return err(null, `「${mKind}」はもうあります。一覧から選んで編集してください。`);
    const opt = (id, hi) => { const raw = $(id).value.trim(); if (!raw) return 0; const v = num(raw); return Number.isInteger(v) && v > 0 && v <= hi ? v : NaN; };
    const kmv = opt("mKm", 1e6), mon = opt("mMon", 240);
    if (isNaN(kmv)) return err("mKm", "何kmごとかを、数字で入れてください（例：5000）。");
    if (isNaN(mon)) return err("mMon", "何か月ごとかを、数字で入れてください（例：6）。");
    const oRaw = $("mOdo").value.trim(), ov = oRaw ? num(oRaw) : null;
    if (oRaw && !okNum(ov, -1, 3e6)) return err("mOdo", "前回のメーターを数字で入れてください（例：40210）。");
    const last = $("mLast").value;
    if (last && last > today) return err("mLast", "前回の日は、今日以前の日付にしてください。");
    const snap = snapshot();
    const data = { k: mKind, last: isYmd(last) ? last : "", lastOdo: oRaw ? ov : null, km: kmv, mon };
    if (mEdit) Object.assign(st.maint.find(x => x.id === mEdit), data); else st.maint.push({ id: uid(), car: st.cur, ...data });
    save(); $("mDlg").close(); render();
    toast(mEdit ? "整備の予定を更新しました。" : `「${mKind}」を追加しました。`, () => { restore(snap); render(); });
  });

  // ---------- 例 ----------
  $("sampleBtn").addEventListener("click", () => {
    const snap = snapshot();
    const c = { id: uid(), name: "フィット", mode: "odo", sample: true };
    st.cars.push(c); st.cur = c.id;
    const back = n => addDays(today, -n);
    let odo = 38200, seq = nextSeq();
    const plan = [[175, 0, 33.1, 168, true], [158, 452, 30.2, 170, true], [140, 418, 29.5, 171, true], [126, 210, 12.0, 173, false], [118, 236, 18.6, 173, true],
      [100, 488, 31.0, 175, true], [82, 470, 33.8, 176, true], [66, 395, 27.9, 174, true], [48, 512, 32.2, 172, true], [31, 461, 30.4, 171, true], [14, 420, 29.0, 170, true], [3, 433, 30.6, 169, true]];
    plan.forEach(([d, dist, lit, ppl, fl]) => { odo += dist; st.fills.push({ id: uid(), car: c.id, date: back(d), odo, trip: null, liters: lit, ppl, total: null, full: fl, note: d === 82 ? "高速で帰省" : "", seq: seq++ }); });
    st.maint.push({ id: uid(), car: c.id, k: "オイル交換", last: back(160), lastOdo: 38700, km: 5000, mon: 6 });
    st.maint.push({ id: uid(), car: c.id, k: "車検", last: back(500), lastOdo: null, km: 0, mon: 24 });
    st.maint.push({ id: uid(), car: c.id, k: "タイヤのローテーション", last: back(90), lastOdo: 41300, km: 5000, mon: 0 });
    tab = "log"; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tab === "log")));
    save(); render();
    toast("例を追加しました。満タンから次の満タンまでで燃費を計算しています。", () => { restore(snap); render(); });
  });
  $("clearSample").addEventListener("click", () => {
    const snap = snapshot();
    const ids = new Set(st.cars.filter(c => c.sample).map(c => c.id));
    st.cars = st.cars.filter(c => !ids.has(c.id)); st.fills = st.fills.filter(f => !ids.has(f.car)); st.maint = st.maint.filter(m => !ids.has(m.car));
    if (!st.cars.some(c => c.id === st.cur)) st.cur = st.cars[0] ? st.cars[0].id : "";
    save(); render();
    toast("例を消しました。", () => { restore(snap); render(); });
  });

  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const readCustom = () => { try { const o = JSON.parse(localStorage.getItem(CK) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "kyuyu", version: 1, exportedAt: new Date().toISOString(), data: st, custom: readCustom() }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `kyuyu-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, custom = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "kyuyu") { data = clean(j.data); custom = j.custom; } } catch (e) { data = null; }
    if (!data || !data.cars.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.cars.length && !confirm(`今の記録を、ファイルの車${data.cars.length}台・給油${data.fills.length}回と置き換えますか？`)) return;
    const snap = snapshot(), csnap = JSON.stringify(readCustom());
    st = data; save();
    if (custom && Array.isArray(custom.maint)) { try { localStorage.setItem(CK, JSON.stringify({ maint: custom.maint.filter(v => typeof v === "string").slice(0, 60) })); } catch (e) {} }
    render();
    $("moveMsg").textContent = `車${data.cars.length}台、給油${data.fills.length}回を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); try { localStorage.setItem(CK, csnap); } catch (e) {} render(); });
  });

  render();
})();
