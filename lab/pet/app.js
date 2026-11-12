// ペット手帳 — 何匹でも。お世話をワンタップで記録、今日のチェック、体重のグラフ、予防・通院の次の日（目安）。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-pet-v1";
  const CK = KEY + ".custom";
  const SVGNS = "http://www.w3.org/2000/svg";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const isStamp = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && isYmd(s.slice(0, 10));
  const nowStamp = () => { const d = new Date(); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  let today = ymd(new Date());
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const full = s => { const d = parseYmd(s); return (d.getFullYear() !== parseYmd(today).getFullYear() ? `${d.getFullYear()}年` : "") + md(s); };
  const wd = s => "日月火水木金土"[parseYmd(s).getDay()];
  const days = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const addMonths = (s, n) => { const d = parseYmd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return ymd(d); };
  const str = (v, max) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const num = s => { const t = String(s || "").normalize("NFKC").replace(/[,\s]/g, "").replace(/(kg|g|キロ|グラム)$/i, ""); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };

  const SPECIES = ["犬", "猫", "うさぎ", "ハムスター", "鳥"];
  const CARES = ["ごはん", "散歩", "トイレ", "薬", "水の交換", "歯みがき"];
  const HEALTH = [
    { k: "混合ワクチン", n: 12, u: "m" },
    { k: "狂犬病の予防注射", n: 12, u: "m" },
    { k: "フィラリア予防", n: 1, u: "m" },
    { k: "ノミ・マダニ予防", n: 1, u: "m" },
    { k: "健康診断", n: 12, u: "m" },
    { k: "通院", n: 0, u: "" }
  ];
  const HK = Object.fromEntries(HEALTH.map(h => [h.k, h]));
  const DEFAULTS = {
    "犬": { unit: "kg", care: [["ごはん", 2], ["散歩", 2], ["トイレ", 0], ["薬", 0]], health: ["混合ワクチン", "狂犬病の予防注射", "フィラリア予防", "ノミ・マダニ予防", "健康診断"] },
    "猫": { unit: "kg", care: [["ごはん", 2], ["トイレ", 1], ["水の交換", 1], ["薬", 0]], health: ["混合ワクチン", "ノミ・マダニ予防", "健康診断"] },
    "うさぎ": { unit: "kg", care: [["ごはん", 2], ["トイレ", 1], ["水の交換", 1]], health: ["健康診断"] },
    "ハムスター": { unit: "g", care: [["ごはん", 1], ["水の交換", 1]], health: ["健康診断"] },
    "鳥": { unit: "g", care: [["ごはん", 1], ["水の交換", 1]], health: ["健康診断"] }
  };
  const defFor = sp => DEFAULTS[sp] || { unit: "kg", care: [["ごはん", 1], ["水の交換", 0]], health: [] };
  // お世話の小さな絵（自分で入れたお世話はチェックの印）
  const ICONS = {
    "ごはん": [["path", { d: "M3 11h18a9 7 0 0 1-18 0Z" }], ["path", { d: "M8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4", fill: "none", "stroke-width": "2", "stroke-linecap": "round" }]],
    "散歩": [["ellipse", { cx: 12, cy: 16, rx: 5, ry: 4.3 }], ["ellipse", { cx: 5.5, cy: 10.5, rx: 2, ry: 2.6 }], ["ellipse", { cx: 9.3, cy: 6.5, rx: 2, ry: 2.6 }], ["ellipse", { cx: 14.7, cy: 6.5, rx: 2, ry: 2.6 }], ["ellipse", { cx: 18.5, cy: 10.5, rx: 2, ry: 2.6 }]],
    "トイレ": [["path", { d: "M3 11h18v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z" }], ["path", { d: "M7 8h2M11 6h2M15 8h2", fill: "none", "stroke-width": "2", "stroke-linecap": "round" }]],
    "薬": [["rect", { x: 2, y: 8, width: 20, height: 8, rx: 4, transform: "rotate(-35 12 12)" }], ["path", { d: "M9.7 7.3l4.6 9.4", fill: "none", "stroke-width": "2", class: "cut" }]],
    "水の交換": [["path", { d: "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z" }]],
    "歯みがき": [["path", { d: "M7 4c-3 0-4 3-3 6 1 2 1 4 2 8 1 3 3 3 3 0l1-4h4l1 4c0 3 2 3 3 0 1-4 1-6 2-8 1-3 0-6-3-6-2 0-3 1-5 1S9 4 7 4Z" }]],
    "体重": [["rect", { x: 3, y: 5, width: 18, height: 15, rx: 4 }], ["path", { d: "M8 10a4 4 0 0 1 8 0M12 10l2-2", fill: "none", "stroke-width": "2", "stroke-linecap": "round", class: "cut" }]],
    "": [["path", { d: "M5 12.5l4.5 4.5L19 7.5", fill: "none", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }]]
  };
  function icon(k) {
    const svg = sv("svg", { viewBox: "0 0 24 24", width: 28, height: 28, "aria-hidden": "true", class: "ic" });
    (ICONS[k] || ICONS[""]).forEach(([t, a]) => svg.append(sv(t, { fill: "currentColor", stroke: "currentColor", ...a })));
    return svg;
  }
  const COLORS = ["#F27A5E", "#3E8E74", "#E0A42B", "#6C7FD8", "#C2659B", "#3E9BC2"];

  // ---------- 保存 ----------
  function cleanPet(p, i) {
    if (!p || typeof p !== "object" || !str(p.name, 16)) return null;
    const care = (Array.isArray(p.care) ? p.care : []).map(c => c && str(c.k, 20) ? { k: str(c.k, 20), n: Number.isInteger(c.n) && c.n >= 0 && c.n <= 9 ? c.n : 0 } : null).filter(Boolean).slice(0, 20);
    const seen = new Set();
    const health = (Array.isArray(p.health) ? p.health : []).map(h => h && str(h.k, 20) ? {
      id: str(h.id, 24) || uid(), k: str(h.k, 20), last: isYmd(h.last) ? h.last : "",
      n: Number.isInteger(h.n) && h.n > 0 && h.n <= 999 ? h.n : 0, u: h.u === "m" || h.u === "d" ? h.u : "",
      next: isYmd(h.next) ? h.next : "", note: str(h.note, 40), hist: (Array.isArray(h.hist) ? h.hist : []).filter(isYmd).slice(-50)
    } : null).filter(Boolean).slice(0, 30);
    health.forEach(h => { if (!h.n) h.u = ""; if (!h.u) h.n = 0; });
    return {
      id: str(p.id, 24) || uid(), name: str(p.name, 16), sp: str(p.sp, 20), birth: isYmd(p.birth) ? p.birth : "",
      unit: p.unit === "g" ? "g" : "kg", color: Number.isInteger(p.color) ? Math.abs(p.color) % COLORS.length : i % COLORS.length,
      care: care.filter(c => !seen.has(c.k) && seen.add(c.k)), health, sample: p.sample === true
    };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.pets)) return null;
    const pets = raw.pets.slice(0, 30).map(cleanPet).filter(Boolean);
    const ids = new Set(pets.map(p => p.id));
    const logs = (Array.isArray(raw.logs) ? raw.logs : []).slice(-20000).map(l => l && ids.has(l.pet) && str(l.k, 20) && isStamp(l.t) ? {
      id: str(l.id, 24) || uid(), pet: l.pet, k: str(l.k, 20), t: l.t, v: typeof l.v === "number" && isFinite(l.v) && l.v > 0 && l.v < 100000 ? l.v : undefined
    } : null).filter(l => l && (l.k !== "体重" || l.v));
    return { v: 1, pets, logs, cur: ids.has(raw.cur) ? raw.cur : pets[0] ? pets[0].id : "" };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, pets: [], logs: [], cur: "" };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };
  const pet = () => st.pets.find(p => p.id === st.cur);

  function age(b) {
    if (!b) return "";
    const a = parseYmd(b), t = parseYmd(today);
    let m = (t.getFullYear() - a.getFullYear()) * 12 + t.getMonth() - a.getMonth();
    if (t.getDate() < a.getDate()) m--;
    if (m < 0) return "";
    if (m < 1) return `生まれて${days(b, today)}日`;
    return m < 12 ? `${m}か月` : `${Math.floor(m / 12)}歳` + (m % 12 ? `${m % 12}か月` : "");
  }
  const fmtW = (v, u) => u === "g" ? `${Math.round(v * 10) / 10}g` : `${Math.round(v * 100) / 100}kg`;

  // ---------- 予定の計算 ----------
  function due(h) {
    if (h.next) return h.next;
    if (h.last && h.n && h.u) return h.u === "m" ? addMonths(h.last, h.n) : addDays(h.last, h.n);
    return "";
  }
  function hStatus(h) {
    const d = due(h);
    if (!d) return { cls: "unset", text: h.last ? `前回 ${full(h.last)}` : "日付が未入力", rank: 3, d };
    const n = days(today, d);
    if (n < 0) return { cls: "over", text: `予定の日を${-n}日過ぎています`, rank: 0, d, n };
    if (n === 0) return { cls: "soon", text: "今日です", rank: 1, d, n };
    if (n <= 7) return { cls: "soon", text: `あと${n}日`, rank: 1, d, n };
    return { cls: "ok", text: `${full(d)}（あと${n}日）`, rank: 2, d, n };
  }

  // ---------- ペットの切りかえ ----------
  function renderPets() {
    const nodes = st.pets.map(p => {
      const b = el("button", "pet-btn"); b.type = "button";
      b.setAttribute("aria-pressed", String(p.id === st.cur));
      const av = el("span", "av", p.name.slice(0, 1)); av.style.background = COLORS[p.color];
      const dueN = p.health.filter(h => hStatus(h).rank <= 1).length;
      b.append(av, el("span", "pn", p.name));
      if (dueN) { const dot = el("span", "dot", String(dueN)); dot.setAttribute("aria-label", `予定${dueN}件`); b.append(dot); }
      b.addEventListener("click", () => { st.cur = p.id; save(); wOpen = false; render(); });
      return b;
    });
    const add = el("button", "pet-btn add"); add.type = "button";
    add.append(el("span", "av", "＋"), el("span", "pn", "追加"));
    add.setAttribute("aria-label", "ペットを追加");
    add.addEventListener("click", () => openPet());
    $("pets").replaceChildren(...nodes, add);
    $("pets").hidden = !st.pets.length;
  }

  // ---------- 今日 ----------
  let tab = "today", wOpen = false;
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  const todayLogs = p => st.logs.filter(l => l.pet === p.id && l.t.slice(0, 10) === today);
  function renderToday(p) {
    const logs = todayLogs(p);
    // 期限の近い予定
    const al = p.health.map(h => ({ h, s: hStatus(h) })).filter(x => x.s.rank <= 1).sort((a, b) => a.s.n - b.s.n);
    $("alerts").replaceChildren(...al.map(({ h, s }) => {
      const d = el("div", "alert " + s.cls);
      d.append(el("span", null, `${h.k}：${s.text}`));
      const b = el("button", "btn small", "済み"); b.type = "button";
      b.addEventListener("click", () => markDone(p, h));
      d.append(b); return d;
    }));
    let goal = 0, met = 0;
    const tiles = p.care.map(c => {
      const mine = logs.filter(l => l.k === c.k);
      const b = el("button", "tile"); b.type = "button";
      const full = c.n > 0 && mine.length >= c.n;
      if (c.n > 0) { goal++; if (full) met++; }
      if (full) b.classList.add("met");
      b.append(icon(c.k));
      b.append(el("b", null, c.k));
      b.append(el("span", "cnt", c.n > 0 ? `${mine.length}/${c.n}回` : mine.length ? `${mine.length}回` : "記録だけ"));
      if (c.n > 0) {
        const pips = el("span", "pips"); pips.setAttribute("aria-hidden", "true");
        for (let i = 0; i < c.n; i++) pips.append(el("i", i < mine.length ? "on" : null));
        b.append(pips);
      }
      const last = mine[mine.length - 1];
      b.append(el("small", null, last ? `最後 ${last.t.slice(11)}` : "まだ"));
      b.setAttribute("aria-label", `${c.k}を記録（今日${mine.length}回${c.n ? `、目標${c.n}回` : ""}）`);
      b.addEventListener("click", () => logCare(p, c.k, b));
      return b;
    });
    const wt = el("button", "tile weight"); wt.type = "button";
    const lastW = st.logs.filter(l => l.pet === p.id && l.k === "体重").slice(-1)[0];
    wt.append(icon("体重"), el("b", null, "体重"), el("span", "cnt", lastW ? fmtW(lastW.v, p.unit) : "未記録"), el("small", null, lastW ? `${full(lastW.t.slice(0, 10))}` : "量ったら入れる"));
    wt.setAttribute("aria-label", "体重を記録");
    wt.addEventListener("click", () => { wOpen = true; renderToday(p); $("wIn").focus(); });
    $("care").replaceChildren(...tiles, wt);
    $("wForm").hidden = !wOpen; $("wUnit").textContent = p.unit; $("wIn").placeholder = p.unit === "g" ? "120" : "4.2";
    $("doneMsg").textContent = !goal ? "" : met === goal ? `${p.name}の今日のお世話は、すべて済みました。` : `今日のチェック：${goal}つのうち${met}つ済み`;
    $("doneMsg").classList.toggle("all", goal > 0 && met === goal);
    const tl = logs.slice().sort((a, b) => a.t < b.t ? 1 : a.t > b.t ? -1 : 0);
    $("timeline").replaceChildren(...tl.map(l => {
      const li = el("li");
      li.append(el("time", null, l.t.slice(11)), el("span", null, l.k === "体重" ? `体重 ${fmtW(l.v, p.unit)}` : l.k));
      const x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", `${l.t.slice(11)}の${l.k}の記録を消す`);
      x.addEventListener("click", () => delLog(l));
      li.append(x); return li;
    }));
    $("tlNone").hidden = !!tl.length;
  }
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function logCare(p, k, btn) {
    const snap = snapshot();
    st.logs.push({ id: uid(), pet: p.id, k, t: nowStamp() }); save();
    renderToday(p); renderPets();
    const again = [...$("care").children].find(b => b.querySelector("b") && b.querySelector("b").textContent === k);
    if (again && !reduce()) { again.classList.add("pop"); }
    if (again) again.focus();
    toast(`${p.name}：${k}を記録しました（${nowStamp().slice(11)}）。`, () => { restore(snap); render(); });
  }
  function delLog(l) {
    const snap = snapshot();
    st.logs = st.logs.filter(x => x !== l); save(); render();
    toast(`${l.t.slice(11)}の${l.k}を消しました。`, () => { restore(snap); render(); });
  }
  $("wForm").addEventListener("submit", e => {
    e.preventDefault();
    const p = pet(); const v = num($("wIn").value);
    const max = p.unit === "g" ? 50000 : 150;
    if (v == null || v <= 0 || v > max) { $("wErr").textContent = `体重を数字で入れてください（例：${p.unit === "g" ? "120" : "4.2"}）。`; $("wIn").setAttribute("aria-invalid", "true"); $("wIn").focus(); return; }
    const snap = snapshot();
    st.logs.push({ id: uid(), pet: p.id, k: "体重", t: nowStamp(), v }); save();
    $("wIn").value = ""; $("wErr").textContent = ""; $("wIn").removeAttribute("aria-invalid"); wOpen = false; render();
    toast(`${p.name}の体重 ${fmtW(v, p.unit)} を記録しました。`, () => { restore(snap); render(); });
  });
  $("wIn").addEventListener("input", () => { $("wErr").textContent = ""; $("wIn").removeAttribute("aria-invalid"); });
  $("wCancel").addEventListener("click", () => { wOpen = false; $("wErr").textContent = ""; renderToday(pet()); });

  // ---------- 今日のチェックを変える ----------
  const careFc = window.FreeChoice({
    key: CK, set: "care", label: "お世話", max: 20, placeholder: "ブラッシング、爪切り",
    builtins: () => CARES.map(c => ({ value: c, label: c })),
    onChange: () => renderCareDlg(),
    onPick: v => { const p = pet(); if (!p.care.some(c => c.k === v)) { p.care.push({ k: v, n: 1 }); save(); } renderCareDlg(); render(); }
  });
  function renderCareDlg() {
    const p = pet(); if (!p) return;
    $("clist").replaceChildren(...p.care.map((c, i) => {
      const li = el("li");
      li.append(icon(c.k), el("b", null, c.k));
      const sel = el("select"); sel.setAttribute("aria-label", `${c.k}の1日の回数`);
      [0, 1, 2, 3, 4, 5].forEach(n => { const o = el("option", null, n ? `1日${n}回` : "記録だけ"); o.value = String(n); sel.append(o); });
      sel.value = String(c.n);
      sel.addEventListener("change", () => { c.n = Number(sel.value); save(); render(); });
      const up = el("button", "mini", "↑"); up.type = "button"; up.setAttribute("aria-label", `${c.k}を上へ`); up.disabled = i === 0;
      up.addEventListener("click", () => { p.care.splice(i - 1, 0, p.care.splice(i, 1)[0]); save(); renderCareDlg(); render(); });
      const x = el("button", "mini", "×"); x.type = "button"; x.setAttribute("aria-label", `${c.k}を外す`);
      x.addEventListener("click", () => {
        const snap = snapshot(); p.care.splice(i, 1); save(); renderCareDlg(); render();
        toast(`「${c.k}」をボタンから外しました。これまでの記録は残ります。`, () => { restore(snap); renderCareDlg(); render(); });
      });
      li.append(sel, up, x); return li;
    }));
    const has = new Set(p.care.map(c => c.k));
    const chip = v => { const b = el("button", "add-chip", "＋ " + v); b.type = "button"; b.addEventListener("click", () => { p.care.push({ k: v, n: 1 }); save(); renderCareDlg(); render(); }); return b; };
    const own = careFc.values();
    $("careChips").replaceChildren(...CARES.filter(c => !has.has(c)).map(chip), ...own.filter(c => !has.has(c)).map(v => careFc.wrap(chip(v), v)), careFc.root);
  }
  $("careEdit").addEventListener("click", () => { careFc.close(); renderCareDlg(); $("careDlg").showModal(); });
  $("cDone").addEventListener("click", () => $("careDlg").close());

  // ---------- 予防・通院 ----------
  function renderHealth(p) {
    const list = p.health.map(h => ({ h, s: hStatus(h) })).sort((a, b) => a.s.rank - b.s.rank || (a.s.d < b.s.d ? -1 : a.s.d > b.s.d ? 1 : 0));
    $("hNone").hidden = !!list.length;
    $("hlist").replaceChildren(...list.map(({ h, s }) => {
      const li = el("li", "h " + s.cls);
      const info = el("button", "h-info"); info.type = "button";
      info.append(el("b", null, h.k), el("span", "h-due", s.d && s.cls !== "over" ? `次は ${s.text}` : s.text));
      const meta = [];
      if (h.last) meta.push(`前回 ${full(h.last)}`);
      meta.push(h.next ? "次の日を指定" : h.n ? `${h.u === "m" && h.n % 12 === 0 ? h.n / 12 + "年" : h.n + (h.u === "m" ? "か月" : "日")}ごと（目安）` : "間隔なし");
      if (h.note) meta.push(h.note);
      info.append(el("small", null, meta.join("・")));
      info.setAttribute("aria-label", `${h.k}、${s.text}。押すと編集できます`);
      info.addEventListener("click", () => openHealth(h.id));
      const b = el("button", "btn small", "済み"); b.type = "button";
      b.setAttribute("aria-label", `${h.k}を今日済みにする`);
      b.addEventListener("click", () => markDone(p, h));
      li.append(info, b); return li;
    }));
  }
  function markDone(p, h) {
    const snap = snapshot();
    if (h.last && h.last !== today) h.hist.push(h.last);
    h.last = today; h.next = ""; save(); render();
    const d = due(h);
    toast(d ? `${h.k}：済み。次は${full(d)}ごろです。` : `${h.k}：今日済みにしました。`, () => { restore(snap); render(); });
  }
  let hEdit = null, hKind = "";
  const hFc = window.FreeChoice({
    key: CK, set: "health", label: "予定の名前", max: 20, placeholder: "爪切り、トリミング",
    builtins: () => HEALTH.map(h => ({ value: h.k, label: h.k })),
    onChange: () => renderHChips(),
    onPick: v => { hKind = v; renderHChips(); applyKindDefault(); }
  });
  function renderHChips() {
    const chip = v => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "hk"; r.value = v; r.checked = v === hKind; r.addEventListener("change", () => { hKind = v; applyKindDefault(); $("hErr").textContent = ""; }); l.append(r, el("span", null, v)); return l; };
    const own = hFc.values();
    const nodes = HEALTH.map(h => chip(h.k));
    own.forEach(v => nodes.push(hFc.wrap(chip(v), v)));
    if (hKind && !HK[hKind] && !own.includes(hKind)) nodes.push(chip(hKind));
    $("hChips").replaceChildren(...nodes, hFc.root);
  }
  function applyKindDefault() {
    const d = HK[hKind];
    if (d) { $("hN").value = d.n ? String(d.n) : ""; $("hU").value = d.u; }
    else { $("hN").value = ""; if (!$("hU").value) $("hU").value = "m"; }
    syncHint();
  }
  function syncHint() {
    const h = { last: $("hLast").value, n: Number(num($("hN").value)) || 0, u: $("hU").value, next: $("hNext").value };
    if (!h.u) h.n = 0;
    $("hN").disabled = !$("hU").value;
    const d = due(h);
    let t = d ? `次は ${full(d)}ごろです。` : "前回の日か次の日を入れると、次の予定日が分かります。";
    if (hKind === "フィラリア予防") t += " フィラリア予防は、蚊のいる季節（地域によりおよそ5〜12月）に毎月飲ませるのが一般的です。";
    if (hKind === "狂犬病の予防注射") t += " 犬の狂犬病の予防注射は、法律で年1回と決められています。";
    $("hHint").textContent = t;
  }
  ["hLast", "hN", "hU", "hNext"].forEach(k => $(k).addEventListener(k === "hN" ? "input" : "change", () => { $("hErr").textContent = ""; syncHint(); }));
  function openHealth(id) {
    const p = pet(); hEdit = id || null;
    const h = id ? p.health.find(x => x.id === id) : null;
    $("hH").textContent = h ? h.k : "予定を追加";
    $("hKindF").hidden = !!h;
    hKind = h ? h.k : ""; hFc.close(); renderHChips();
    $("hLast").value = h ? h.last : ""; $("hLast").max = today;
    $("hN").value = h && h.n ? String(h.n) : ""; $("hU").value = h ? h.u : "m";
    $("hNext").value = h ? h.next : ""; $("hNote").value = h ? h.note : "";
    $("hDel").hidden = !h; $("hErr").textContent = "";
    syncHint();
    $("hDlg").showModal();
  }
  $("hAdd").addEventListener("click", () => openHealth());
  $("hCancel").addEventListener("click", () => $("hDlg").close());
  $("hDel").addEventListener("click", () => {
    const p = pet(); const h = p.health.find(x => x.id === hEdit); if (!h) return;
    const snap = snapshot(); p.health = p.health.filter(x => x !== h); save(); $("hDlg").close(); render();
    toast(`「${h.k}」の予定を消しました。`, () => { restore(snap); render(); });
  });
  $("hForm").addEventListener("submit", e => {
    e.preventDefault();
    const p = pet();
    if (!hKind) { $("hErr").textContent = "何の予定かを選ぶか、「＋ 自分で入力」で入れてください。"; return; }
    if (!hEdit && p.health.some(h => h.k === hKind)) { $("hErr").textContent = `「${hKind}」はもうあります。一覧から選んで編集してください。`; return; }
    const u = $("hU").value; let n = 0;
    if (u && $("hN").value.trim()) { n = num($("hN").value); if (!Number.isInteger(n) || n < 1 || n > 999) { $("hErr").textContent = "間隔を1以上の数字で入れるか、「決めない」を選んでください。"; $("hN").focus(); return; } }
    const last = $("hLast").value;
    if (last && last > today) { $("hErr").textContent = "前回の日は、今日以前の日付にしてください。"; $("hLast").focus(); return; }
    const snap = snapshot();
    const data = { k: hKind, last: isYmd(last) ? last : "", n, u: n ? u : "", next: isYmd($("hNext").value) ? $("hNext").value : "", note: str($("hNote").value, 40) };
    if (hEdit) Object.assign(p.health.find(x => x.id === hEdit), data);
    else p.health.push({ id: uid(), hist: [], ...data });
    save(); $("hDlg").close(); render();
    toast(hEdit ? "予定を更新しました。" : `「${hKind}」を追加しました。`, () => { restore(snap); render(); });
  });

  // ---------- 体重 ----------
  function renderWeight(p) {
    const ws = st.logs.filter(l => l.pet === p.id && l.k === "体重").slice().sort((a, b) => a.t < b.t ? -1 : 1);
    $("wNone").hidden = !!ws.length; $("chartBox").hidden = ws.length < 1;
    const sum = $("wSum"); sum.replaceChildren();
    $("wList").replaceChildren(...ws.slice().reverse().slice(0, 60).map(l => {
      const li = el("li"); li.append(el("time", null, `${full(l.t.slice(0, 10))}`), el("b", null, fmtW(l.v, p.unit)));
      const x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", `${full(l.t.slice(0, 10))}の体重の記録を消す`);
      x.addEventListener("click", () => delLog(l)); li.append(x); return li;
    }));
    if (!ws.length) return;
    const last = ws[ws.length - 1], prev = ws[ws.length - 2];
    const box = (k, v, cls) => { const d = el("div", "ws " + (cls || "")); d.append(el("small", null, k), el("b", null, v)); return d; };
    sum.append(box("今", fmtW(last.v, p.unit)));
    if (prev) { const diff = last.v - prev.v; sum.append(box("前回から", (diff > 0 ? "+" : diff < 0 ? "−" : "±") + fmtW(Math.abs(diff), p.unit), diff > 0 ? "up" : diff < 0 ? "down" : "")); }
    const old = ws.find(l => days(l.t.slice(0, 10), last.t.slice(0, 10)) <= 183) || ws[0];
    if (old !== last) { const d = last.v - old.v; sum.append(box(`${full(old.t.slice(0, 10))}から`, (d > 0 ? "+" : d < 0 ? "−" : "±") + fmtW(Math.abs(d), p.unit))); }
    drawChart(ws, p);
  }
  function drawChart(ws, p) {
    const svg = $("chart"); svg.replaceChildren();
    const W = 340, H = 200, L = 44, R = 12, T = 14, B = 30;
    const pts = ws.slice(-60);
    const t0 = parseYmd(pts[0].t.slice(0, 10)).getTime(), t1 = parseYmd(pts[pts.length - 1].t.slice(0, 10)).getTime();
    let lo = Math.min(...pts.map(x => x.v)), hi = Math.max(...pts.map(x => x.v));
    const padV = Math.max((hi - lo) * 0.2, hi * 0.03, p.unit === "g" ? 2 : 0.1); lo -= padV; hi += padV; if (lo < 0) lo = 0;
    const X = t => t1 === t0 ? (L + W - R) / 2 : L + (t - t0) / (t1 - t0) * (W - L - R);
    const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    for (let i = 0; i <= 3; i++) {
      const v = lo + (hi - lo) * i / 3, y = Y(v);
      svg.append(sv("line", { x1: L, x2: W - R, y1: y, y2: y, class: "grid" }));
      const tx = sv("text", { x: L - 6, y: y + 4, class: "ax", "text-anchor": "end" }); tx.textContent = p.unit === "g" ? String(Math.round(v)) : v.toFixed(1); svg.append(tx);
    }
    const lab = (s, x, anchor) => { const t = sv("text", { x, y: H - 8, class: "ax", "text-anchor": anchor }); t.textContent = md(s).replace("月", "/").replace("日", ""); svg.append(t); };
    lab(pts[0].t.slice(0, 10), L, "start"); if (pts.length > 1) lab(pts[pts.length - 1].t.slice(0, 10), W - R, "end");
    const xy = pts.map(x => [X(parseYmd(x.t.slice(0, 10)).getTime()), Y(x.v)]);
    if (xy.length > 1) {
      svg.append(sv("path", { d: `M${xy[0][0]},${H - B} ` + xy.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${xy[xy.length - 1][0]},${H - B} Z`, class: "area" }));
      svg.append(sv("path", { d: "M" + xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L"), class: "line" }));
    }
    xy.forEach(([x, y], i) => svg.append(sv("circle", { cx: x, cy: y, r: i === xy.length - 1 ? 5 : 3, class: i === xy.length - 1 ? "pt last" : "pt" })));
    $("chartCap").textContent = `体重：${pts.map(x => `${full(x.t.slice(0, 10))} ${fmtW(x.v, p.unit)}`).join("、")}`;
    svg.setAttribute("aria-label", `体重の変化。${full(pts[0].t.slice(0, 10))}の${fmtW(pts[0].v, p.unit)}から、${full(pts[pts.length - 1].t.slice(0, 10))}の${fmtW(pts[pts.length - 1].v, p.unit)}まで`);
  }

  // ---------- 記録 ----------
  function renderLog(p) {
    const logs = st.logs.filter(l => l.pet === p.id && days(l.t.slice(0, 10), today) < 14).sort((a, b) => a.t < b.t ? 1 : -1);
    $("logNone").hidden = !!logs.length;
    const byDay = new Map();
    logs.forEach(l => { const d = l.t.slice(0, 10); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(l); });
    $("logDays").replaceChildren(...[...byDay].map(([d, ls]) => {
      const s = el("section", "day");
      const n = days(d, today);
      s.append(el("h3", null, `${n === 0 ? "今日" : n === 1 ? "昨日" : full(d)}（${wd(d)}）`));
      const counts = new Map(); ls.forEach(l => counts.set(l.k, (counts.get(l.k) || 0) + 1));
      s.append(el("p", "day-sum", [...counts].map(([k, c]) => k === "体重" ? `体重 ${fmtW(ls.find(l => l.k === "体重").v, p.unit)}` : `${k}${c}回`).join("・")));
      const ol = el("ol", "timeline");
      ls.forEach(l => { const li = el("li"); li.append(el("time", null, l.t.slice(11)), el("span", null, l.k === "体重" ? `体重 ${fmtW(l.v, p.unit)}` : l.k)); ol.append(li); });
      s.append(ol); return s;
    }));
  }

  // ---------- ペットの登録 ----------
  let pEdit = null, spSel = "";
  const spFc = window.FreeChoice({
    key: CK, set: "species", label: "種類", max: 20, placeholder: "フェレット、カメ",
    builtins: () => SPECIES.map(s => ({ value: s, label: s })),
    onChange: () => renderSp(),
    onPick: v => { spSel = v; renderSp(); syncSp(); }
  });
  function renderSp() {
    const chip = v => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "sp"; r.value = v; r.checked = v === spSel; r.addEventListener("change", () => { spSel = v; syncSp(); }); l.append(r, el("span", null, v)); return l; };
    const own = spFc.values();
    const nodes = SPECIES.map(chip);
    own.forEach(v => nodes.push(spFc.wrap(chip(v), v)));
    if (spSel && !SPECIES.includes(spSel) && !own.includes(spSel)) nodes.push(chip(spSel));
    $("spChips").replaceChildren(...nodes, spFc.root);
  }
  function syncSp() {
    if (!pEdit) $("pUnit").value = defFor(spSel).unit;
    if (pEdit) { $("pHint").textContent = ""; return; }
    const d = defFor(spSel);
    $("pHint").textContent = spSel ? `今日のチェック：${d.care.filter(c => c[1]).map(c => `${c[0]}${c[1]}回`).join("、") || "ごはん"}。` + (d.health.length ? `予定：${d.health.join("、")}。後で変えられます。` : "後で変えられます。") : "";
    $("pErr").textContent = "";
  }
  function openPet(id) {
    pEdit = id || null;
    const p = id ? st.pets.find(x => x.id === id) : null;
    $("pH").textContent = p ? "ペットの設定" : "ペットを登録";
    $("pName").value = p ? p.name : ""; $("pBirth").value = p ? p.birth : ""; $("pBirth").max = today;
    spSel = p ? p.sp : ""; spFc.close(); renderSp();
    $("pUnit").value = p ? p.unit : "kg";
    $("pDel").hidden = !p; $("pErr").textContent = ""; $("pName").removeAttribute("aria-invalid");
    syncSp();
    $("petDlg").showModal(); $("pName").focus();
  }
  $("pName").addEventListener("input", () => { $("pErr").textContent = ""; $("pName").removeAttribute("aria-invalid"); });
  $("pCancel").addEventListener("click", () => $("petDlg").close());
  $("petEdit").addEventListener("click", () => openPet(st.cur));
  $("firstPet").addEventListener("click", () => openPet());
  $("petForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = str($("pName").value, 16);
    if (!name) { $("pErr").textContent = "名前を入れてください（例：こむぎ）。"; $("pName").setAttribute("aria-invalid", "true"); $("pName").focus(); return; }
    const birth = $("pBirth").value;
    if (birth && birth > today) { $("pErr").textContent = "誕生日は今日以前の日付にしてください。"; $("pBirth").focus(); return; }
    const snap = snapshot();
    if (pEdit) {
      const p = st.pets.find(x => x.id === pEdit);
      Object.assign(p, { name, sp: spSel, birth: isYmd(birth) ? birth : "", unit: $("pUnit").value === "g" ? "g" : "kg" });
    } else {
      const d = defFor(spSel);
      const used = new Set(st.pets.map(p => p.color));
      const color = [0, 1, 2, 3, 4, 5].find(i => !used.has(i)) ?? st.pets.length % COLORS.length;
      const p = cleanPet({ id: uid(), name, sp: spSel, birth, unit: $("pUnit").value, color, care: d.care.map(([k, n]) => ({ k, n })), health: d.health.map(k => ({ id: uid(), k, n: HK[k].n, u: HK[k].u, last: "" })) }, 0);
      st.pets.push(p); st.cur = p.id;
      tab = "today"; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tab === "today")));
    }
    save(); $("petDlg").close(); render();
    toast(pEdit ? "設定を保存しました。" : `${name}を登録しました。前回のワクチンなどの日は「予防・通院」で入れられます。`, () => { restore(snap); render(); });
  });
  $("pDel").addEventListener("click", () => {
    const p = st.pets.find(x => x.id === pEdit); if (!p) return;
    if (!confirm(`${p.name}と、${p.name}の記録をすべて消しますか？`)) return;
    const snap = snapshot();
    st.pets = st.pets.filter(x => x !== p); st.logs = st.logs.filter(l => l.pet !== p.id);
    st.cur = st.pets[0] ? st.pets[0].id : ""; save(); $("petDlg").close(); render();
    toast(`${p.name}を消しました。`, () => { restore(snap); render(); });
  });

  // ---------- 例 ----------
  $("sampleBtn").addEventListener("click", () => {
    const snap = snapshot();
    const back = n => addDays(today, -n);
    const dog = cleanPet({ id: uid(), name: "こむぎ", sp: "犬", birth: addMonths(today, -40), unit: "kg", color: 0, sample: true,
      care: DEFAULTS["犬"].care.map(([k, n]) => ({ k, n })),
      health: [
        { id: uid(), k: "混合ワクチン", last: back(350), n: 12, u: "m" },
        { id: uid(), k: "狂犬病の予防注射", last: back(190), n: 12, u: "m" },
        { id: uid(), k: "フィラリア予防", last: back(33), n: 1, u: "m" },
        { id: uid(), k: "ノミ・マダニ予防", last: back(10), n: 1, u: "m" },
        { id: uid(), k: "健康診断", last: back(200), n: 12, u: "m" }
      ] }, 0);
    const cat = cleanPet({ id: uid(), name: "たま", sp: "猫", birth: addMonths(today, -98), unit: "kg", color: 1, sample: true,
      care: DEFAULTS["猫"].care.map(([k, n]) => ({ k, n })),
      health: [{ id: uid(), k: "混合ワクチン", last: back(120), n: 12, u: "m" }, { id: uid(), k: "健康診断", last: back(300), n: 12, u: "m" }] }, 1);
    st.pets.push(dog, cat); st.cur = dog.id;
    const at = (d, hm) => `${back(d)}T${hm}`;
    const w = [[180, 6.1], [150, 6.3], [120, 6.2], [90, 6.5], [60, 6.6], [30, 6.4], [7, 6.5]];
    w.forEach(([d, v]) => st.logs.push({ id: uid(), pet: dog.id, k: "体重", t: at(d, "08:00"), v }));
    [[4.3, 90], [4.4, 30], [4.2, 3]].forEach(([v, d]) => st.logs.push({ id: uid(), pet: cat.id, k: "体重", t: at(d, "20:00"), v }));
    for (let d = 1; d <= 6; d++) ["07:10", "18:30"].forEach(t => { st.logs.push({ id: uid(), pet: dog.id, k: "ごはん", t: at(d, t) }); st.logs.push({ id: uid(), pet: dog.id, k: "散歩", t: at(d, t === "07:10" ? "06:40" : "17:50") }); });
    st.logs.push({ id: uid(), pet: dog.id, k: "ごはん", t: `${today}T07:10` }, { id: uid(), pet: dog.id, k: "散歩", t: `${today}T06:40` });
    st.logs.sort((a, b) => a.t < b.t ? -1 : 1);
    tab = "today"; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tab === "today")));
    save(); render();
    toast("例を追加しました。ボタンを押すと、その時刻で記録されます。", () => { restore(snap); render(); });
  });
  $("clearSample").addEventListener("click", () => {
    const snap = snapshot();
    const ids = new Set(st.pets.filter(p => p.sample).map(p => p.id));
    st.pets = st.pets.filter(p => !ids.has(p.id)); st.logs = st.logs.filter(l => !ids.has(l.pet));
    if (!st.pets.some(p => p.id === st.cur)) st.cur = st.pets[0] ? st.pets[0].id : "";
    save(); render();
    toast("例を消しました。", () => { restore(snap); render(); });
  });

  // ---------- 表示 ----------
  function render() {
    today = ymd(new Date());
    const p = pet();
    $("empty").hidden = !!p; $("main").hidden = !p;
    $("sampleBar").hidden = !st.pets.some(x => x.sample);
    renderPets();
    if (!p) return;
    $("petName").textContent = p.name;
    $("petSub").textContent = [p.sp, age(p.birth)].filter(Boolean).join("・") || "種類と誕生日は「ペットの設定」で入れられます";
    $("todayView").hidden = tab !== "today"; $("healthView").hidden = tab !== "health"; $("weightView").hidden = tab !== "weight"; $("logView").hidden = tab !== "log";
    if (tab === "today") renderToday(p); else if (tab === "health") renderHealth(p); else if (tab === "weight") renderWeight(p); else renderLog(p);
  }

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
    const blob = new Blob([JSON.stringify({ app: "pet", version: 1, exportedAt: new Date().toISOString(), data: st, custom: readCustom() }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `pet-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, custom = null;
    try { if (f.size > 8e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "pet") { data = clean(j.data); custom = j.custom; } } catch (e) { data = null; }
    if (!data || !data.pets.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.pets.length && !confirm(`今の記録を、ファイルの${data.pets.length}匹分と置き換えますか？`)) return;
    const snap = snapshot(), csnap = JSON.stringify(readCustom());
    st = data; save();
    if (custom && typeof custom === "object" && !Array.isArray(custom)) { const c = {}; ["species", "care", "health"].forEach(k => { if (Array.isArray(custom[k])) c[k] = custom[k].filter(v => typeof v === "string").slice(0, 60); }); try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) {} }
    render();
    $("moveMsg").textContent = `${data.pets.length}匹分（記録${data.logs.length}件）を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); try { localStorage.setItem(CK, csnap); } catch (e) {} render(); });
  });

  render();
})();
