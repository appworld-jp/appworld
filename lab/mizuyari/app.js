(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const NS = "http://www.w3.org/2000/svg";
  const sv = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const KEY = "mizuyari.v1";
  const DAY = 86400000;
  const pad = n => (n < 10 ? "0" : "") + n;
  const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return keyOf(d) === s ? d : null; };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = keyOf(today);
  const diff = (a, b) => Math.round((a - b) / DAY);
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const md = d => (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")";
  const isSS = d => { const m = d.getMonth() + 1; return m >= 4 && m <= 9; };
  const PRESET = {}; PLANTS.forEach(p => { PRESET[p.name] = p; });
  const guideOf = kind => PRESET[kind] || PLANT_GENERIC;
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- 保存 ----------
  const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
  function cleanPlant(p) {
    if (!p || typeof p !== "object") return null;
    const kind = FreeChips.tidy(p.kind).slice(0, 20);
    if (!kind) return null;
    const g = guideOf(kind);
    const dates = a => Array.isArray(a) ? a.filter(s => typeof s === "string" && parse(s)).filter((s, i, x) => x.indexOf(s) === i).sort().slice(-80) : [];
    return {
      id: String(p.id || rid()).slice(0, 24), kind, name: FreeChips.tidy(p.name).slice(0, 20), place: FreeChips.tidy(p.place).slice(0, 20),
      ss: int(p.ss, 1, 90, g.ss), aw: int(p.aw, 1, 90, g.aw), fs: int(p.fs, 0, 180, g.fs), fa: int(p.fa, 0, 180, g.fa),
      rp: int(p.rp, 1, 10, g.rp), repot: typeof p.repot === "string" && /^\d{4}-\d{2}$/.test(p.repot) ? p.repot : "",
      water: dates(p.water), fert: dates(p.fert), created: typeof p.created === "string" ? p.created.slice(0, 10) : todayKey
    };
  }
  function clean(d) {
    if (!d || !Array.isArray(d.plants)) return null;
    return { plants: d.plants.map(cleanPlant).filter(Boolean).slice(0, 300) };
  }
  let st = { plants: [] };
  try { const v = clean(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 空で始める */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("この端末に保存できませんでした。ブラウザの設定を確かめてください。"); } };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)) || { plants: [] }; save(); };

  const kinds = FreeChips.store(KEY + ".custom");
  const places = FreeChips.store(KEY + ".place.custom");
  const PLACES = ["リビング", "窓辺", "寝室", "玄関", "ベランダ", "キッチン"];

  // ---------- 計算 ----------
  const label = p => p.name || p.kind;
  function waterState(p) {
    const iv = isSS(today) ? p.ss : p.aw;
    const last = p.water.length ? parse(p.water[p.water.length - 1]) : null;
    if (!last) return { iv, last: null, due: today, left: 0, frac: 1 };
    const due = addD(last, iv);
    const left = diff(due, today);
    return { iv, last, due, left, frac: Math.max(0, Math.min(1, diff(today, last) / iv)) };
  }
  function fertState(p) {
    const iv = isSS(today) ? p.fs : p.fa;
    const last = p.fert.length ? parse(p.fert[p.fert.length - 1]) : null;
    if (!iv) return { iv: 0, last, due: null, left: null };
    if (!last) return { iv, last: null, due: null, left: null };
    const due = addD(last, iv);
    return { iv, last, due, left: diff(due, today) };
  }
  function repotState(p) {
    if (!p.repot) return null;
    const y = +p.repot.slice(0, 4), m = +p.repot.slice(5, 7);
    const next = new Date(y + p.rp, m - 1, 1);
    return { next, due: next <= today };
  }
  const leftText = w => !w.last ? "記録なし" : w.left > 0 ? "あと" + w.left + "日" : w.left === 0 ? "今日" : Math.abs(w.left) + "日過ぎ";

  // ---------- 植物の絵 ----------
  function art(kind) {
    const g = guideOf(kind), c = g.leaf, dark = "#2B5E2E";
    const s = sv("svg", { viewBox: "0 0 48 48", "aria-hidden": "true", class: "art" });
    const ell = (cx, cy, rx, ry, rot, fill) => sv("ellipse", { cx, cy, rx, ry, fill: fill || c, transform: "rotate(" + rot + " " + cx + " " + cy + ")" });
    const line = (d, w, col) => sv("path", { d, stroke: col || dark, "stroke-width": w || 2, fill: "none", "stroke-linecap": "round" });
    const id = PRESET[kind] ? PRESET[kind].id : "";
    const parts = [];
    if (id === "pothos") parts.push(line("M24 30C22 22 18 18 14 16M24 30c2-8 6-12 11-14M24 30V12", 1.6), ell(14, 17, 5, 3.6, -30), ell(34, 15, 5, 3.6, 30), ell(24, 11, 4, 5.4, 0), ell(18, 24, 4, 3, -20), ell(30, 23, 4, 3, 20));
    else if (id === "monstera") parts.push(line("M24 30V20", 2), sv("path", { d: "M24 6c9 0 14 6 13 13-1 6-7 9-13 9s-12-3-13-9C10 12 15 6 24 6z", fill: c }), line("M24 8v18M15 13l6 4M14 20l7 1M33 13l-6 4M34 20l-7 1", 1.6, "#FBF8EF"));
    else if (id === "cactus") parts.push(sv("rect", { x: 19, y: 6, width: 10, height: 26, rx: 5, fill: c }), sv("path", { d: "M19 20h-4a3 3 0 0 1-3-3v-5a2.5 2.5 0 0 1 5 0v4h2zM29 16h3v-3a2.5 2.5 0 0 1 5 0v4a3 3 0 0 1-3 3h-5z", fill: c }), sv("circle", { cx: 24, cy: 6, r: 2.2, fill: "#E8608A" }));
    else if (id === "succulent") { for (let i = 0; i < 8; i++) parts.push(ell(24 + 9 * Math.cos(i * Math.PI / 4), 22 + 6 * Math.sin(i * Math.PI / 4), 5, 3.2, i * 45, c)); parts.push(ell(24, 22, 4, 4, 0, "#9CCBA6"), ell(20, 20, 3, 2, -30, "#B7DCC0")); }
    else if (id === "pachira") { parts.push(line("M24 31V12", 2.6, "#8A6A3F")); for (let i = 0; i < 5; i++) { const a = -150 + i * 30; const r = a * Math.PI / 180; parts.push(ell(24 + 9 * Math.cos(r), 12 + 9 * Math.sin(r), 6, 2.6, a, c)); } }
    else if (id === "chlorophytum") parts.push(line("M24 30C20 18 10 14 6 22M24 30C22 16 18 8 14 6M24 30C26 16 30 8 34 6M24 30C28 18 38 14 42 22M24 30V8", 2.6, c), line("M24 30C20 18 10 14 6 22M24 30C28 18 38 14 42 22", 1, "#EEF5D9"));
    else if (id === "sansevieria") parts.push(sv("path", { d: "M17 31l2-22 4 22zM22 31l3-27 3 27zM27 31l5-20 1 20z", fill: c }), line("M19 28l1-14M25 28V10M30 28l1-12", 1, "#B9D58F"));
    else if (id === "gajumaru") parts.push(sv("path", { d: "M20 31c2-4 1-8 3-12h3c1 4 0 8 3 12z", fill: "#9C7A4C" }), sv("circle", { cx: 17, cy: 15, r: 6, fill: c }), sv("circle", { cx: 30, cy: 13, r: 7, fill: c }), sv("circle", { cx: 24, cy: 9, r: 6, fill: "#57A35A" }));
    else if (id === "ivy") { parts.push(line("M24 30C18 24 12 26 8 34M24 30c4-8 10-10 16-8M24 30V14", 1.4)); [[9, 31], [15, 25], [38, 22], [31, 23], [24, 13], [24, 21]].forEach(([x, y]) => parts.push(sv("path", { d: "M" + x + " " + (y - 4) + "l2 2.5 3-1-1.4 3 2.4 2.5h-4l-2 3-2-3h-4l2.4-2.5-1.4-3 3 1z", fill: c }))); }
    else if (id === "rubber") parts.push(line("M24 31V8", 2.4, "#6B4E2E"), ell(16, 18, 7, 4, -35), ell(32, 14, 7, 4, 35), ell(24, 8, 3.6, 6, 0, "#8C2F3A"), ell(17, 26, 5, 3, -15), ell(31, 24, 5, 3, 15));
    else parts.push(line("M24 31V16", 2.2), sv("path", { d: "M24 20c-8 0-12-5-12-11 8 0 12 5 12 11zM24 18c1-7 6-11 13-11 0 7-5 11-13 11z", fill: c }));
    parts.forEach(x => s.append(x));
    s.append(sv("rect", { x: 10, y: 29, width: 28, height: 6, rx: 2, fill: "#B25530" }), sv("path", { d: "M12 35h24l-3 11H15z", fill: "#C8683F" }));
    return s;
  }

  // ---------- 一覧 ----------
  function render() {
    const m = today.getMonth() + 1;
    $("season").textContent = (isSS(today) ? "いまは春夏（4〜9月）" : "いまは秋冬（10〜3月）") + "の目安で数えています";
    const ps = st.plants.map(p => ({ p, w: waterState(p), f: fertState(p), r: repotState(p) }));
    ps.sort((a, b) => a.w.left - b.w.left || label(a.p).localeCompare(label(b.p), "ja"));
    const need = ps.filter(x => x.w.left <= 0 && x.w.last && keyOf(x.w.last) !== todayKey || !x.w.last).length;
    const done = ps.filter(x => x.w.last && keyOf(x.w.last) === todayKey).length;
    $("empty").hidden = ps.length > 0;
    document.querySelector(".today").hidden = ps.length === 0;
    if (ps.length) {
      $("todayBig").replaceChildren();
      if (need) $("todayBig").append(el("span", "", "今日の水やり"), el("b", "", String(need)), el("span", "", "鉢"));
      else $("todayBig").append(el("span", "", "今日の水やりは"), el("b", "ok", "なし"));
      const next = ps.find(x => x.w.left > 0);
      $("todaySub").textContent = "全部で" + ps.length + "鉢" + (done ? "・今日やった" + done + "鉢" : "") + (!need && next ? "・次は" + md(next.w.due) + "の" + label(next.p) : "");
    }
    $("pots").replaceChildren(...ps.map(potItem));
    void m;
  }

  function potItem(x) {
    const { p, w, f, r } = x;
    const li = el("li", "pot");
    const wateredToday = w.last && keyOf(w.last) === todayKey;
    li.classList.add(wateredToday ? "s-done" : !w.last || w.left < 0 ? "s-late" : w.left === 0 ? "s-today" : "s-ok");
    const open = el("button", "pot-main"); open.type = "button";
    open.append(art(p.kind));
    const tx = el("span", "pot-tx");
    tx.append(el("span", "pot-n", label(p)), el("span", "pot-k", [p.name ? p.kind : "", p.place].filter(Boolean).join("・") || (isSS(today) ? p.ss : p.aw) + "日ごと"));
    const gauge = el("span", "gauge"); const fill = el("i"); fill.style.width = Math.round((wateredToday ? 0 : w.frac) * 100) + "%"; gauge.append(fill);
    tx.append(gauge);
    const tags = el("span", "tags");
    if (f.iv && f.left != null && f.left <= 0) tags.append(el("span", "tag t-fert", "肥料の日"));
    if (r && r.due) tags.append(el("span", "tag t-repot", "植え替えどき"));
    if (tags.children.length) tx.append(tags);
    open.append(tx);
    open.setAttribute("aria-label", label(p) + "、" + (wateredToday ? "今日やった" : "水やり" + leftText(w)) + "。くわしく見る");
    open.addEventListener("click", () => showInfo(p.id));
    const st2 = el("span", "pot-left", wateredToday ? "今日やった" : leftText(w));
    const btn = el("button", "water"); btn.type = "button";
    btn.setAttribute("aria-pressed", wateredToday ? "true" : "false");
    btn.setAttribute("aria-label", wateredToday ? label(p) + "の今日の水やりを取り消す" : label(p) + "に水やった");
    btn.append(sv("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }), el("span", "w-t", wateredToday ? "やった" : "水やった"));
    btn.firstChild.append(sv("path", { d: wateredToday ? "M5 12.5l4.5 4.5L19 7.5" : "M12 3c4 5.5 6 8.6 6 11.2A6 6 0 0 1 6 14.2C6 11.6 8 8.5 12 3z", fill: wateredToday ? "none" : "currentColor", stroke: "currentColor", "stroke-width": wateredToday ? 3 : 0, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    btn.addEventListener("click", () => water(p.id, btn));
    const side = el("div", "pot-side"); side.append(st2, btn);
    li.append(open, side);
    return li;
  }

  function water(id, btn) {
    const p = st.plants.find(z => z.id === id); if (!p) return;
    const snap = snapshot();
    if (p.water[p.water.length - 1] === todayKey) {
      p.water.pop(); save(); render();
      toast(label(p) + "の今日の水やりを取り消しました。", () => { restore(snap); render(); });
      return;
    }
    p.water.push(todayKey); p.water = p.water.slice(-80); save();
    if (btn && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      btn.classList.add("splash");
      setTimeout(() => { render(); focusWater(id); }, 380);
    } else { render(); focusWater(id); }
    const w = waterState(p);
    toast(label(p) + "に水をやりました。次は" + md(w.due) + "ごろです。", () => { restore(snap); render(); });
  }
  function focusWater(id) {
    const i = st.plants.findIndex(z => z.id === id); void i;
    const items = [...document.querySelectorAll(".pot")];
    const p = st.plants.find(z => z.id === id);
    const b = items.map(li => li.querySelector(".water")).find(b => b && b.getAttribute("aria-label").indexOf(label(p)) === 0);
    if (b) b.focus();
  }

  // ---------- くわしく ----------
  let infoId = null, repotUndo = null;
  function showInfo(id) {
    const p = st.plants.find(z => z.id === id); if (!p) return;
    if (infoId !== id) $("infoMsg").textContent = "";
    infoId = id;
    const g = guideOf(p.kind), w = waterState(p), f = fertState(p), r = repotState(p);
    $("infoH").textContent = label(p);
    const b = $("infoBody"); b.replaceChildren();
    const head = el("div", "info-head"); head.append(art(p.kind));
    const ht = el("div"); ht.append(el("p", "i-kind", p.kind + (p.place ? "・" + p.place : "")), el("p", "i-iv", "水やり　春夏 " + p.ss + "日ごと／秋冬 " + p.aw + "日ごと"));
    head.append(ht); b.append(head);

    const sec = (title, lines, act) => {
      const s = el("section", "i-sec"); s.append(el("h3", "", title));
      lines.forEach(t => s.append(el("p", "", t)));
      if (act) s.append(act);
      b.append(s);
    };
    sec("水やり", [w.last ? "最後は" + md(w.last) + "。次は" + md(w.due) + "ごろ（" + leftText(w) + "）。" : "まだ記録がありません。", "めやす：" + g.water]);
    const hist = el("ul", "hist");
    p.water.slice(-8).reverse().forEach(d => hist.append(el("li", "", md(parse(d)))));
    if (p.water.length) { const s = b.lastChild; s.append(el("p", "i-small", "これまでの水やり（新しい順）"), hist); }

    const fedToday = p.fert[p.fert.length - 1] === todayKey;
    const fb = el("button", "btn small ghost", fedToday ? "今日の肥料を取り消す" : "肥料やった"); fb.type = "button";
    fb.addEventListener("click", () => {
      if (fedToday) p.fert.pop(); else { p.fert.push(todayKey); p.fert = p.fert.slice(-80); }
      save(); render(); showInfo(p.id);
      $("infoMsg").textContent = fedToday ? "今日の肥料の記録を取り消しました。" : "肥料の記録をつけました。";
    });
    const fl = [];
    if (!f.iv) fl.push("いまの季節（" + (isSS(today) ? "春夏" : "秋冬") + "）は肥料を休みます。");
    else if (!f.last) fl.push((isSS(today) ? "春夏" : "秋冬") + "は" + f.iv + "日ごと。まだ記録がありません。");
    else fl.push("最後は" + md(f.last) + "。次は" + md(f.due) + "ごろ。");
    if (f.last && !f.iv) fl.push("最後は" + md(f.last) + "でした。");
    if (g.fert) fl.push("めやす：" + g.fert);
    sec("肥料", fl, fb);

    const thisMonth = todayKey.slice(0, 7);
    const undoable = repotUndo && repotUndo.id === p.id && p.repot === thisMonth;
    const rb = el("button", "btn small ghost", undoable ? "植え替えの記録を取り消す" : "今月植え替えた"); rb.type = "button";
    rb.hidden = p.repot === thisMonth && !undoable;
    rb.addEventListener("click", () => {
      if (undoable) { p.repot = repotUndo.prev; repotUndo = null; }
      else { repotUndo = { id: p.id, prev: p.repot }; p.repot = thisMonth; }
      save(); render(); showInfo(p.id);
      $("infoMsg").textContent = undoable ? "植え替えの記録を取り消しました。" : "植え替えの記録をつけました。";
    });
    const rl = [];
    if (r) rl.push("最後は" + p.repot.replace("-", "年").replace(/^(\d+年)0?(\d+)$/, "$1$2月") + "。" + (r.due ? "そろそろ植え替えどきです。" : "次は" + r.next.getFullYear() + "年" + (r.next.getMonth() + 1) + "月ごろ。"));
    else rl.push("最後に植え替えた月を入れると、次の時期がわかります。");
    rl.push("めやす：" + p.rp + "年に1回、" + g.rpm + "ごろ。根が鉢底から出てきたら合図です。");
    sec("植え替え", rl, rb);

    const tip = el("section", "i-tip"); tip.append(el("h3", "", PRESET[p.kind] ? p.kind + "の育て方のコツ" : "育て方"), el("p", "", g.tip));
    b.append(tip);
    if (!$("infoDlg").open) $("infoDlg").showModal();
  }
  $("infoClose").addEventListener("click", () => $("infoDlg").close());
  $("infoDlg").addEventListener("close", () => { infoId = null; });
  $("infoEdit").addEventListener("click", () => { const id = infoId; $("infoDlg").close(); openEdit(id); });
  $("infoDel").addEventListener("click", () => {
    const p = st.plants.find(z => z.id === infoId); if (!p) return;
    const snap = snapshot();
    st.plants = st.plants.filter(z => z !== p); save();
    $("infoDlg").close(); render();
    toast("「" + label(p) + "」を消しました。", () => { restore(snap); render(); });
  });

  // ---------- 足す・直す ----------
  let editId = null, fKind = "", fPlace = "";
  const kindAdder = FreeChips.adder({ placeholder: "シェフレラ", aria: "植物の名前を自分で入力", ok: "追加", submit: v => {
    if (PRESET[v]) { pickKind(v); return; }
    kinds.add(v); pickKind(v); return;
  } });
  const placeAdder = FreeChips.adder({ placeholder: "洗面所", aria: "置き場所を自分で入力", ok: "追加", submit: v => {
    if (PLACES.indexOf(v) < 0) places.add(v);
    fPlace = v; renderPlaces();
  } });
  function chipList(box, items, cur, onPick, store, adder, emptyMsg) {
    box.replaceChildren(...items.map(it => {
      const b = el("button", "chip", it.n); b.type = "button"; b.dataset.v = it.n;
      b.setAttribute("aria-pressed", it.n === cur ? "true" : "false");
      b.addEventListener("click", () => onPick(it.n === cur && emptyMsg ? "" : it.n));
      if (!it.mine) return b;
      const wrap = el("span", "fc-item");
      wrap.append(b, FreeChips.remover(it.n, () => {
        const pos = store.remove(it.n);
        onPick(cur === it.n ? (emptyMsg ? "" : cur) : cur, true);
        toast("「" + it.n + "」を候補から外しました。", () => { store.insert(it.n, pos); onPick(cur, true); });
      }));
      return wrap;
    }), adder.btn, adder.form);
  }
  function renderKinds() {
    const items = PLANTS.map(p => ({ n: p.name })).concat(kinds.all().map(n => ({ n, mine: true })));
    if (fKind && !items.some(i => i.n === fKind)) items.push({ n: fKind, mine: false });
    chipList($("kindChips"), items, fKind, (v, keep) => { if (keep) { renderKinds(); return; } pickKind(v); }, kinds, kindAdder);
    const g = guideOf(fKind);
    $("kindGuide").textContent = !fKind ? "植物を選ぶと、水やりの目安の日数が入ります。" : PRESET[fKind] ? "目安：" + g.water : "この植物の目安はないので、春夏5日・秋冬10日にしています。土の乾き方を見て変えてください。";
  }
  function pickKind(v) {
    const prev = fKind; fKind = v;
    if (v && v !== prev) {
      const g = guideOf(v);
      $("fSS").value = g.ss; $("fAW").value = g.aw; $("fFS").value = g.fs; $("fFA").value = g.fa; $("fRP").value = g.rp;
    }
    $("editErr").textContent = "";
    renderKinds();
  }
  function renderPlaces() {
    const items = PLACES.map(n => ({ n })).concat(places.all().map(n => ({ n, mine: true })));
    if (fPlace && !items.some(i => i.n === fPlace)) items.push({ n: fPlace });
    chipList($("placeChips"), items, fPlace, (v, keep) => { if (!keep) fPlace = v; renderPlaces(); }, places, placeAdder, true);
  }
  function openEdit(id) {
    editId = id || null;
    const p = id ? st.plants.find(z => z.id === id) : null;
    $("editH").textContent = p ? "「" + label(p) + "」を直す" : "鉢を足す";
    fKind = p ? p.kind : ""; fPlace = p ? p.place : "";
    $("fName").value = p ? p.name : "";
    const g = guideOf(fKind);
    $("fSS").value = p ? p.ss : ""; $("fAW").value = p ? p.aw : "";
    $("fFS").value = p ? p.fs : ""; $("fFA").value = p ? p.fa : "";
    $("fRP").value = p ? p.rp : g.rp; $("fRepot").value = p ? p.repot : "";
    $("fLast").value = p ? (p.water[p.water.length - 1] || "") : todayKey;
    $("fLast").max = todayKey;
    ["editErr", "numErr"].forEach(i => { $(i).textContent = ""; });
    document.querySelectorAll("#editDlg [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    kindAdder.close(false); placeAdder.close(false);
    renderKinds(); renderPlaces();
    $("editDlg").showModal();
    const first = $("kindChips").querySelector("button");
    if (first) first.focus();
  }
  $("addBtn").addEventListener("click", () => openEdit());
  $("firstAdd").addEventListener("click", () => openEdit());
  $("editClose").addEventListener("click", () => $("editDlg").close());
  $("editCancel").addEventListener("click", () => $("editDlg").close());
  $("editSave").addEventListener("click", () => {
    const err = (id, fieldEl, msg) => { $(id).textContent = msg; if (fieldEl) { fieldEl.setAttribute("aria-invalid", "true"); fieldEl.focus(); } };
    document.querySelectorAll("#editDlg [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    $("editErr").textContent = ""; $("numErr").textContent = "";
    if (!fKind) { err("editErr", null, "植物を選んでください。一覧にない植物は「＋ 自分で入力」から入れられます。"); $("kindChips").querySelector("button").focus(); return; }
    const ss = Number($("fSS").value), aw = Number($("fAW").value);
    if (!Number.isInteger(ss) || ss < 1 || ss > 90) return err("numErr", $("fSS"), "春夏の日数を1〜90で入れてください。");
    if (!Number.isInteger(aw) || aw < 1 || aw > 90) return err("numErr", $("fAW"), "秋冬の日数を1〜90で入れてください。");
    const last = $("fLast").value;
    if (last && (!parse(last) || last > todayKey)) return err("editErr", $("fLast"), "最後に水をやった日は、今日までの日付にしてください。");
    const fs = Number($("fFS").value || 0), fa = Number($("fFA").value || 0), rp = Number($("fRP").value || 2);
    if (!Number.isInteger(fs) || fs < 0 || fs > 180 || !Number.isInteger(fa) || fa < 0 || fa > 180) return err("editErr", $("fFS"), "肥料の日数は0〜180で入れてください。");
    if (!Number.isInteger(rp) || rp < 1 || rp > 10) return err("editErr", $("fRP"), "植え替えの間隔は1〜10年で入れてください。");
    const snap = snapshot();
    let p = editId ? st.plants.find(z => z.id === editId) : null;
    const isNew = !p;
    if (!p) { p = { id: rid(), water: [], fert: [], created: todayKey }; st.plants.push(p); }
    Object.assign(p, { kind: fKind, name: FreeChips.tidy($("fName").value).slice(0, 20), place: fPlace, ss, aw, fs, fa, rp, repot: $("fRepot").value || "" });
    if (last && p.water.indexOf(last) < 0) { p.water.push(last); p.water.sort(); }
    if (!last && isNew) p.water = [];
    Object.assign(p, cleanPlant(p));
    save(); $("editDlg").close(); render();
    toast(isNew ? "「" + label(p) + "」を足しました。" : "「" + label(p) + "」を直しました。", () => { restore(snap); render(); });
  });

  $("sample").addEventListener("click", () => {
    const snap = snapshot();
    const mk = (kind, name, place, ago) => { const g = guideOf(kind); return cleanPlant({ id: rid(), kind, name, place, ss: g.ss, aw: g.aw, fs: g.fs, fa: g.fa, rp: g.rp, water: [keyOf(addD(today, -ago))], fert: [] }); };
    st.plants.push(mk("ポトス", "棚のポトス", "リビング", 11), mk("モンステラ", "", "窓辺", 4), mk("サボテン", "", "窓辺", 30));
    save(); render();
    toast("例を3鉢入れました。いらなければ消してください。", () => { restore(snap); render(); });
  });

  // ---------- お知らせ ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "mizuyari", version: 1, exportedAt: new Date().toISOString(), data: st, custom: { kinds: kinds.all(), places: places.all() } }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = "mizuyari-" + todayKey + ".json";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, cus = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "mizuyari") { data = clean(j.data); cus = j.custom; } } catch (e) { data = null; }
    if (!data || !data.plants.length) { $("moveMsg").textContent = "読み込めませんでした。水やり帳で書き出したファイルを選んでください。"; return; }
    if (st.plants.length && !confirm("いまの" + st.plants.length + "鉢を、ファイルの" + data.plants.length + "鉢と置きかえますか？")) return;
    const snap = snapshot();
    st = data; save();
    if (cus && typeof cus === "object") {
      (Array.isArray(cus.kinds) ? cus.kinds : []).forEach(v => { if (typeof v === "string" && FreeChips.tidy(v)) kinds.add(FreeChips.tidy(v).slice(0, 20)); });
      (Array.isArray(cus.places) ? cus.places : []).forEach(v => { if (typeof v === "string" && FreeChips.tidy(v)) places.add(FreeChips.tidy(v).slice(0, 20)); });
    }
    render();
    $("moveMsg").textContent = data.plants.length + "鉢を読み込みました。";
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  render();
})();
