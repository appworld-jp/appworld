// ジムメモ — 種目を選んで、重さと回数（または回数・時間）を記録する。記録はこの端末の localStorage だけに置く。
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const C = window.GymCatalog;
  const KEY = "gymmemo.v1";
  const LIST = C.parse(window.EXERCISES_TXT);
  const BY_NAME = new Map(LIST.map(e => [e.name, e]));
  const KEYMAP = new Map();
  LIST.forEach(e => C.keys(e).forEach(k => { if (!KEYMAP.has(k.k)) KEYMAP.set(k.k, e.name); }));
  const PART_OF = new Map();
  Object.keys(C.PART_WORDS).forEach(p => C.PART_WORDS[p].forEach(w => PART_OF.set(C.loose(w), p)));
  const MINE = "マイ種目";
  const CLASSICS = ["ベンチプレス", "スクワット", "デッドリフト", "ラットプルダウン", "ショルダープレス", "懸垂"];
  const KINDS = [["w", "重さと回数"], ["r", "回数だけ"], ["s", "時間（秒）"], ["m", "時間と距離"]];
  const KIND_LABEL = { w: "重さと回数", r: "回数", s: "時間", m: "時間と距離" };
  const KIND_DEF = { w: 20, r: 10, s: 30, m: 20 };
  const RESTS = [60, 90, 120, 180];
  const STEPS = [2.5, 5, 1, 0.5];

  const pad = n => String(n).padStart(2, "0");
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const dayLabel = k => { const [y, m, d] = k.split("-").map(Number); return `${m}月${d}日（${"日月火水木金土"[new Date(y, m - 1, d).getDay()]}）`; };
  const num = v => String(Math.round(v * 100) / 100);
  const fmtSec = sec => { sec = Math.round(sec || 0); const m = Math.floor(sec / 60), s = sec % 60; return m ? (s ? `${m}分${s}秒` : `${m}分`) : `${s}秒`; };
  const fmtMin = sec => num(Math.round((sec || 0) / 6) / 10) + "分";
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------- 保存 ----------
  function defaults() { return { sets: [], custom: [], gone: [], myRests: [], ctype: {}, rest: 90, step: 2.5, sound: true, ex: CLASSICS[0] }; }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || "null");
      if (o && Array.isArray(o.sets)) {
        const s = Object.assign(defaults(), o);
        s.sets = s.sets.filter(x => x && typeof x.ex === "string" && typeof x.t === "number");
        s.custom = Array.isArray(s.custom) ? s.custom.filter(x => typeof x === "string" && x.trim()) : [];
        s.ctype = s.ctype && typeof s.ctype === "object" ? s.ctype : {};
        s.gone = Array.isArray(s.gone) ? s.gone.filter(x => typeof x === "string") : [];
        s.myRests = Array.isArray(s.myRests) ? s.myRests.filter(x => Number.isInteger(x) && x >= 10 && x <= 600 && !RESTS.includes(x)).slice(0, 6) : [];
        if (!RESTS.includes(s.rest) && !s.myRests.includes(s.rest)) s.rest = 90;
        if (!STEPS.includes(s.step)) s.step = 2.5;
        return s;
      }
    } catch (e) { /* 読めないときは初期状態で始める */ }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 容量不足やブロック */ } }
  const S = load();

  // 以前の版のデータを、今の種目一覧に合わせる。
  // ・自分で追加した種目が一覧に入ったら、一覧のほうを使う（呼び方が違うだけなら記録もまとめる）
  // ・どこにもない名前の記録は、マイ種目として残す
  function migrate() {
    const rename = {};
    S.custom = [...new Set(S.custom.map(c => c.trim()))].filter(c => {
      if (BY_NAME.has(c)) return false;
      const hit = KEYMAP.get(C.loose(c));
      if (hit && !S.ctype[c] && "wr".includes(BY_NAME.get(hit).type)) { rename[c] = hit; return false; }
      return true;
    });
    S.sets.forEach(s => { if (rename[s.ex]) s.ex = rename[s.ex]; });
    S.sets.forEach(s => { if (!BY_NAME.has(s.ex) && !S.custom.includes(s.ex) && !S.gone.includes(s.ex)) S.custom.push(s.ex); });
    if (rename[S.ex]) S.ex = rename[S.ex];
    if (!BY_NAME.has(S.ex) && !S.custom.includes(S.ex)) S.ex = CLASSICS[0];
    S.v = 2;
  }
  migrate(); save();

  function customOf(name) {
    const t = S.ctype[name] || "w";
    return { name, yomi: "", syn: [], part: MINE, type: t, def: KIND_DEF[t], i: 1000 + S.custom.indexOf(name), custom: true };
  }
  const info = name => BY_NAME.get(name) || customOf(name);
  const customs = () => S.custom.map(customOf);
  const keyCache = new Map();
  const keysOf = ex => { let k = keyCache.get(ex.name); if (!k) { k = C.keys(ex); keyCache.set(ex.name, k); } return k; };

  // ---------- 記録のまとめ ----------
  const setsOf = ex => S.sets.filter(s => s.ex === ex).sort((a, b) => a.t - b.t);
  function sessions(ex) {
    const m = new Map();
    for (const s of setsOf(ex)) { const k = dayKey(s.t); if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }
  function setText(s, t) {
    if (s.sec != null) return t === "m" ? fmtMin(s.sec) + (s.km ? `・${num(s.km)}km` : "") : fmtSec(s.sec);
    if (s.w > 0) return `${num(s.w)}kg × ${s.r || 0}回`;
    return t === "w" ? `自重 × ${s.r || 0}回` : `${s.r || 0}回`;
  }
  function short(s, t) {
    if (s.sec != null) return t === "m" ? fmtMin(s.sec) + (s.km ? ` ${num(s.km)}km` : "") : fmtSec(s.sec);
    if (s.w > 0) return `${num(s.w)}×${s.r || 0}`;
    return t === "w" ? `自重×${s.r || 0}` : `${s.r || 0}回`;
  }
  // ベストの比べ方：重さの種目は重さ→回数、自重は回数→重さ、時間は長さ（有酸素は同じ長さなら距離）
  function rank(s, t) {
    if (t === "s") return [s.sec || 0];
    if (t === "m") return [s.sec || 0, s.km || 0];
    if (t === "r") return [s.r || 0, s.w || 0];
    return [s.w || 0, s.r || 0];
  }
  function better(a, b, t) {
    if (!b) return true;
    const x = rank(a, t), y = rank(b, t);
    for (let i = 0; i < x.length; i++) { if (x[i] !== y[i]) return x[i] > y[i]; }
    return false;
  }
  function best(list, t) { let b = null; for (const s of list) if (better(s, b, t)) b = s; return b; }

  // よく使う種目：最近よく記録した日が多い順
  function usage() {
    const days = new Map(), now = Date.now();
    for (const s of S.sets) { if (!days.has(s.ex)) days.set(s.ex, new Set()); days.get(s.ex).add(dayKey(s.t)); }
    const score = new Map();
    days.forEach((set, ex) => {
      let v = 0;
      set.forEach(k => { const [y, m, d] = k.split("-").map(Number); v += Math.pow(0.5, Math.max(0, now - new Date(y, m - 1, d).getTime()) / 864e5 / 30); });
      score.set(ex, v);
    });
    return score;
  }
  function favs() {
    const sc = usage();
    const out = [...sc.keys()].filter(n => !S.gone.includes(n)).sort((a, b) => sc.get(b) - sc.get(a)).slice(0, 6);
    for (const c of CLASSICS) if (out.length < 6 && !out.includes(c)) out.push(c);
    if (!out.includes(S.ex)) out.unshift(S.ex);
    return out.slice(0, 7);
  }

  // ---------- 検索 ----------
  function search(q) {
    const toks = q.split(/[\s　]+/).map(C.loose).filter(Boolean);
    if (!toks.length) return [];
    const sc = usage(), res = [];
    for (const ex of LIST.concat(customs())) {
      let total = 0, via = null, ok = true;
      for (const t of toks) {
        let top = 0, lab = null;
        for (const k of keysOf(ex)) {
          let v = k.k === t ? 100 : k.k.startsWith(t) ? 60 : k.k.includes(t) ? 30 : 0;
          if (v && k.main) v += 5;
          if (v > top) { top = v; lab = k; }
        }
        if (!top && PART_OF.get(t) === ex.part) { top = 20; lab = null; }
        if (!top) { ok = false; break; }
        total += top;
        if (lab && !lab.main && toks.length === 1) via = lab.label;
      }
      if (ok) res.push({ ex, score: total + Math.min(sc.get(ex.name) || 0, 5), via });
    }
    res.sort((a, b) => b.score - a.score || a.ex.i - b.ex.i);
    return res;
  }
  // 名前・よみ・ほかの呼び方がぴったり同じ種目
  function exact(name) {
    const l = C.loose(name);
    if (!l) return null;
    if (KEYMAP.has(l)) return KEYMAP.get(l);
    return S.custom.find(c => C.loose(c) === l) || null;
  }

  const q = $("q"), sugg = $("sugg");
  let opts = [], active = -1;
  function renderSugg() {
    const text = q.value.trim();
    sugg.textContent = ""; opts = []; active = -1;
    q.removeAttribute("aria-activedescendant");
    $("app").classList.toggle("searching", !!text);
    if (!text) { sugg.hidden = true; q.setAttribute("aria-expanded", "false"); $("suggStatus").textContent = ""; return; }
    const res = search(text).slice(0, 10);
    for (const r of res) {
      const li = el("li", "opt"); li.setAttribute("role", "option"); li.id = "sg" + opts.length;
      li.append(el("span", "on", r.ex.name));
      const meta = el("span", "om", r.ex.part + (r.ex.type !== "w" ? "・" + KIND_LABEL[r.ex.type] : ""));
      if (r.via) meta.append(el("span", "via", "「" + r.via + "」"));
      li.append(meta);
      li.addEventListener("click", () => choose(r.ex.name));
      sugg.append(li); opts.push(li);
    }
    if (!res.length) sugg.append(el("li", "none", "当てはまる種目がありません。"));
    if (!exact(text)) {
      const li = el("li", "opt addopt"); li.setAttribute("role", "option"); li.id = "sg" + opts.length;
      li.append(el("span", "on", `＋「${text.slice(0, 20)}」を新しい種目にする`));
      li.addEventListener("click", () => openAdd(text));
      sugg.append(li); opts.push(li);
    }
    sugg.hidden = false; q.setAttribute("aria-expanded", "true");
    $("suggStatus").textContent = res.length ? `候補${res.length}件` : "当てはまる種目がありません";
  }
  function setActive(i) {
    if (!opts.length) return;
    active = (i + opts.length) % opts.length;
    opts.forEach((o, j) => o.setAttribute("aria-selected", String(j === active)));
    q.setAttribute("aria-activedescendant", opts[active].id);
    opts[active].scrollIntoView({ block: "nearest" });
  }
  q.addEventListener("input", () => { if (q.value.trim()) closeBrowse(); renderSugg(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); const o = opts[active >= 0 ? active : 0]; if (o) o.click(); }
    else if (e.key === "Escape") { q.value = ""; renderSugg(); }
  });
  q.addEventListener("search", () => { if (!q.value) renderSugg(); });

  // ---------- 部位から選ぶ ----------
  let bPart = null;
  function closeBrowse() { $("browse").hidden = true; $("browseBtn").setAttribute("aria-expanded", "false"); }
  $("browseBtn").addEventListener("click", () => {
    const open = $("browse").hidden;
    if (open) { q.value = ""; renderSugg(); bPart = bPart || info(S.ex).part; renderBrowse(); }
    $("browse").hidden = !open; $("browseBtn").setAttribute("aria-expanded", String(open));
  });
  function renderBrowse() {
    const parts = C.PARTS.concat([MINE]);
    const box = $("parts"); box.textContent = "";
    for (const p of parts) {
      const b = el("button", "part", p); b.type = "button";
      b.setAttribute("aria-pressed", String(p === bPart));
      b.addEventListener("click", () => { bPart = p; renderBrowse(); });
      box.append(b);
    }
    const ul = $("plist"); ul.textContent = "";
    const items = bPart === MINE ? customs() : LIST.filter(e => e.part === bPart);
    for (const ex of items) {
      const li = el("li"), b = el("button", "prow"); b.type = "button";
      b.append(el("span", "on", ex.name));
      if (ex.type !== "w") b.append(el("span", "tag", KIND_LABEL[ex.type]));
      if (ex.name === S.ex) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => choose(ex.name));
      li.append(b);
      if (ex.custom) {
        li.className = "mine";
        li.append(window.FreeChips.remover(ex.name, () => {
          S.custom = S.custom.filter(c => c !== ex.name);
          if (!S.gone.includes(ex.name)) S.gone.push(ex.name);
          save(); renderBrowse(); renderFav();
          toast(`「${ex.name}」をマイ種目から外しました。履歴は残っています`);
        }));
      }
      ul.append(li);
    }
    if (bPart === MINE) {
      if (!items.length) ul.append(el("li", "none", "一覧にない種目を、自分で追加できます。"));
      const li = el("li"), b = el("button", "prow addrow", "＋ 種目を追加"); b.type = "button";
      b.addEventListener("click", () => openAdd(""));
      li.append(b); ul.append(li);
    }
  }

  // ---------- よく使う ----------
  function renderFav() {
    const box = $("fav"); box.textContent = "";
    for (const name of favs()) {
      const b = el("button", "chip", name); b.type = "button";
      b.setAttribute("aria-pressed", String(name === S.ex));
      b.addEventListener("click", () => choose(name));
      box.append(b);
    }
  }

  // ---------- 種目を追加 ----------
  let addKind = "w";
  function renderKinds() {
    const box = $("addType"); box.textContent = "";
    for (const [k, label] of KINDS) {
      const b = el("button", null, label); b.type = "button";
      b.setAttribute("aria-pressed", String(k === addKind));
      b.addEventListener("click", () => { addKind = k; renderKinds(); });
      box.append(b);
    }
  }
  function openAdd(name) {
    q.value = ""; renderSugg(); closeBrowse();
    addKind = "w"; renderKinds();
    $("addName").value = name.trim().slice(0, 20); $("addErr").textContent = "";
    $("addForm").hidden = false; $("addName").focus();
  }
  $("addCancel").addEventListener("click", () => { $("addForm").hidden = true; q.focus(); });
  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("addName").value.trim().replace(/\s+/g, " ").slice(0, 20);
    if (!name) { $("addErr").textContent = "種目の名前を入れてください。"; $("addName").focus(); return; }
    const hit = exact(name);
    $("addForm").hidden = true;
    if (hit) { choose(hit); toast(hit === name ? `「${hit}」を選びました` : `一覧にある「${hit}」を選びました`); return; }
    S.custom.push(name); S.ctype[name] = addKind; keyCache.delete(name);
    S.gone = S.gone.filter(c => c !== name);
    choose(name);
    toast(`「${name}」を追加しました`);
  });
  $("addName").addEventListener("input", () => { $("addErr").textContent = ""; });

  function choose(name) {
    stopWatch(false);
    S.ex = name; save();
    q.value = ""; renderSugg(); closeBrowse(); $("addForm").hidden = true;
    prefill(); renderFav(); renderLog();
    if (bPart && bPart !== MINE && !info(name).custom) bPart = info(name).part;
    const h = $("exName");
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (h.getBoundingClientRect().top < 0) h.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  // ---------- 記録画面 ----------
  const cur = { w: 20, r: 10, sec: 30, min: 20, km: 0, loaded: false };
  const type = () => info(S.ex).type;

  function todayAndPrev() {
    const ses = sessions(S.ex), today = dayKey(Date.now());
    const todays = ses.length && ses[0][0] === today ? ses[0][1] : [];
    const prev = ses.find(([k]) => k !== today) || null;
    return { todays, prev };
  }
  // 前回の同じセット目を使う。なければ今日の直前のセット、それもなければ前回の最後のセット。
  function prefill() {
    const ex = info(S.ex), t = ex.type, def = ex.def;
    const { todays, prev } = todayAndPrev(), n = todays.length;
    const src = (prev && prev[1][n]) || todays[n - 1] || (prev && prev[1][prev[1].length - 1]) || null;
    if (t === "w") { cur.w = src && src.sec == null ? src.w || 0 : def; cur.r = src && src.r ? src.r : 10; }
    else if (t === "r") { cur.r = src && src.r ? src.r : def || 10; cur.w = src && src.w > 0 ? src.w : 0; cur.loaded = cur.w > 0; }
    else if (t === "s") { cur.sec = src && src.sec ? Math.round(src.sec) : def || 30; }
    else { cur.min = src && src.sec ? Math.max(1, Math.round(src.sec / 60)) : def || 20; cur.km = src && src.km ? src.km : 0; }
  }
  function curSet() {
    const t = type();
    if (t === "w") return { w: cur.w, r: cur.r };
    if (t === "r") return { w: cur.loaded ? cur.w : 0, r: cur.r };
    if (t === "s") return { sec: cur.sec };
    const s = { sec: cur.min * 60 }; if (cur.km > 0) s.km = cur.km; return s;
  }

  function renderLog() {
    const ex = info(S.ex), t = ex.type;
    $("exName").textContent = S.ex;
    $("exMeta").textContent = `${ex.part}・${KIND_LABEL[t]}で記録`;
    const { todays, prev } = todayAndPrev();
    const p = $("prev"); p.textContent = "";
    if (prev) {
      p.append(el("b", null, "前回 " + dayLabel(prev[0])), el("span", "sets", prev[1].map(s => short(s, t)).join("　")));
      const bst = best(setsOf(S.ex), t);
      if (bst) p.append(el("span", null, "ベスト " + setText(bst, t)));
    } else if (todays.length) {
      p.textContent = t === "m" ? "今日が初めての記録です。次回は、今日の記録がここに出ます。" : "今日が初めての記録です。次回は、今日のセットがここに出ます。";
    } else {
      p.textContent = t === "w" ? "初めての種目です。重さと回数を合わせて記録すると、次回はその数字が最初から入ります。"
        : t === "r" ? "初めての種目です。回数を合わせて記録すると、次回はその回数が最初から入ります。"
        : t === "s" ? "初めての種目です。秒数を合わせるか「計る」で時間を計って記録すると、次回はその時間が最初から入ります。"
        : "初めての種目です。時間（と距離）を合わせて記録すると、次回はその数字が最初から入ります。";
    }
    const list = $("today"); list.textContent = "";
    const before = S.sets.filter(s => s.ex === S.ex && dayKey(s.t) !== dayKey(Date.now()));
    let running = best(before, t);
    todays.forEach((s, i) => {
      const li = el("li");
      const v = el("span", "v", setText(s, t));
      if (before.length && better(s, running, t)) v.append(el("span", "pb", "ベスト更新"));
      if (better(s, running, t)) running = s;
      const del = el("button", null, "取り消す"); del.type = "button";
      del.setAttribute("aria-label", `${i + 1}セット目（${setText(s, t)}）を取り消す`);
      del.addEventListener("click", () => {
        const at = S.sets.indexOf(s);
        S.sets = S.sets.filter(x => x.id !== s.id); save(); prefill(); renderLog(); renderFav();
        toast(`${i + 1}セット目を取り消しました`, () => { S.sets.splice(at, 0, s); save(); prefill(); renderLog(); renderFav(); toast("元に戻しました"); });
      });
      if (s.id === fresh) li.className = "fresh";
      li.append(el("span", "n", String(i + 1)), v, del); list.append(li);
    });
    fresh = null;
    $("lead").hidden = S.sets.length > 0;
    $("todayEmpty").hidden = todays.length > 0;
    $("todayEmpty").textContent = t === "m" ? "終わったら、下の「記録する」を押してください。" : "1セット終えたら、下の「セットを記録」を押してください。";
    $("record").querySelector(".go-l").textContent = t === "m" ? "記録する" : "セットを記録";
    renderNums();
  }

  function renderNums() {
    const t = type(), showW = t === "w" || (t === "r" && cur.loaded);
    $("stW").hidden = !showW; $("stR").hidden = !(t === "w" || t === "r");
    $("stS").hidden = t !== "s"; $("stM").hidden = t !== "m"; $("stK").hidden = t !== "m";
    $("load").hidden = !(t === "r" && !cur.loaded); $("unload").hidden = !(t === "r" && cur.loaded);
    $("wLbl").textContent = t === "r" ? "おもり（kg）" : "重さ（kg）";
    $("steppers").className = "steppers k-" + t + (showW ? " two" : "");
    const keep = id => document.activeElement !== $(id);
    if (keep("wIn")) $("wIn").value = num(cur.w);
    if (keep("rIn")) $("rIn").value = cur.r;
    if (keep("sIn") && !watchT) $("sIn").value = cur.sec;
    if (keep("mIn")) $("mIn").value = cur.min;
    if (keep("kIn")) $("kIn").value = num(cur.km);
    $("stepBtn").textContent = `刻み ${num(S.step)}kg・変更`;
    $("wHint").textContent = t === "w" && cur.w === 0 ? "0kgは自重として記録します。" : "";
    $("sHint").textContent = cur.sec >= 60 && !watchT ? fmtSec(cur.sec) : "";
    $("goSub").textContent = setText(curSet(), t);
  }

  const clampW = v => Math.min(999, Math.max(0, Math.round(v * 100) / 100));
  const clampR = v => Math.min(999, Math.max(1, Math.round(v)));
  const clampS = v => Math.min(3600, Math.max(1, Math.round(v)));
  const clampM = v => Math.min(600, Math.max(1, Math.round(v)));
  const clampK = v => Math.min(999, Math.max(0, Math.round(v * 100) / 100));
  const bump = (id, fn) => $(id).addEventListener("click", () => { fn(); renderNums(); });
  bump("wMinus", () => { cur.w = clampW(cur.w - S.step); });
  bump("wPlus", () => { cur.w = clampW(cur.w + S.step); });
  bump("rMinus", () => { cur.r = clampR(cur.r - 1); });
  bump("rPlus", () => { cur.r = clampR(cur.r + 1); });
  bump("sMinus", () => { stopWatch(false); cur.sec = clampS(cur.sec - 5); });
  bump("sPlus", () => { stopWatch(false); cur.sec = clampS(cur.sec + 5); });
  bump("mMinus", () => { cur.min = clampM(cur.min - 1); });
  bump("mPlus", () => { cur.min = clampM(cur.min + 1); });
  bump("kMinus", () => { cur.km = clampK(cur.km - 0.1); });
  bump("kPlus", () => { cur.km = clampK(cur.km + 0.1); });
  const typed = (id, parse, fn) => {
    $(id).addEventListener("input", () => { const v = parse($(id).value); if (isFinite(v)) { fn(v); $("goSub").textContent = setText(curSet(), type()); } });
    $(id).addEventListener("blur", renderNums);
  };
  typed("wIn", parseFloat, v => { cur.w = clampW(v); });
  typed("rIn", v => parseInt(v, 10), v => { cur.r = clampR(v); });
  typed("sIn", v => parseInt(v, 10), v => { stopWatch(false); cur.sec = clampS(v); });
  typed("mIn", v => parseInt(v, 10), v => { cur.min = clampM(v); });
  typed("kIn", parseFloat, v => { cur.km = clampK(v); });
  $("stepBtn").addEventListener("click", () => { S.step = STEPS[(STEPS.indexOf(S.step) + 1) % STEPS.length]; save(); renderNums(); });
  $("load").addEventListener("click", () => { cur.loaded = true; if (!cur.w) cur.w = 5; renderNums(); $("wIn").focus(); });
  $("unload").addEventListener("click", () => { cur.loaded = false; renderNums(); $("load").focus(); });

  // ストップウォッチ（時間の種目）
  let watchT = null, watchI = 0;
  function stopWatch(keep) {
    if (!watchT) return;
    clearInterval(watchI);
    if (keep) cur.sec = clampS((Date.now() - watchT) / 1000);
    watchT = null;
    $("watch").textContent = "計る"; $("watch").setAttribute("aria-pressed", "false"); $("watch").classList.remove("on");
    renderNums();
  }
  $("watch").addEventListener("click", () => {
    if (watchT) { stopWatch(true); toast(`${fmtSec(cur.sec)}を計測しました。「セットを記録」で保存できます`); return; }
    watchT = Date.now();
    $("watch").textContent = "止める"; $("watch").setAttribute("aria-pressed", "true"); $("watch").classList.add("on");
    const tickW = () => { const s = Math.floor((Date.now() - watchT) / 1000); $("sIn").value = s; $("goSub").textContent = fmtSec(s); $("sHint").textContent = "計測中"; };
    clearInterval(watchI); watchI = setInterval(tickW, 200); tickW();
  });

  let toastT = 0, toastFn = null, fresh = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; toastFn = undo || null;
    $("toastAct").hidden = !undo; $("toast").classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => { $("toast").classList.remove("show"); $("toastMsg").textContent = ""; $("toastAct").hidden = true; toastFn = null; }, undo ? 5000 : 2600);
  }
  $("toastAct").addEventListener("click", () => { const f = toastFn; toastFn = null; if (f) f(); });

  $("record").addEventListener("click", () => {
    audioInit();
    if (watchT) stopWatch(true);
    const t = type();
    const before = best(S.sets.filter(x => x.ex === S.ex && dayKey(x.t) !== dayKey(Date.now())), t);
    const s = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ex: S.ex }, curSet(), { t: Date.now() });
    S.sets.push(s); save(); fresh = s.id;
    const pb = before && better(s, before, t);
    toast(pb ? `自己ベスト更新！${setText(s, t)}` : `記録しました：${setText(s, t)}`);
    const go = $("record"); go.classList.remove("hit", "pb"); void go.offsetWidth; go.classList.add(pb ? "pb" : "hit");
    prefill(); renderLog(); renderFav();
    if (t !== "m") startRest();
  });

  // ---------- 休憩タイマー ----------
  let ac = null, timer = null, tickI = 0;
  function audioInit() {
    if (!S.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ac && AC) ac = new AC();
      if (ac && ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
  }
  function alarm() {
    if (!S.sound) return;
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]); } catch (e) { /* 非対応 */ }
    if (!ac) return;
    try {
      const t0 = ac.currentTime;
      [0, 0.28, 0.56].forEach((d, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "square"; o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.2, t0 + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (i === 2 ? 0.4 : 0.18));
        o.connect(g); g.connect(ac.destination); o.start(t0 + d); o.stop(t0 + d + 0.45);
      });
    } catch (e) { /* 音が出せない */ }
  }
  const CIRC = 2 * Math.PI * 52;
  function startRest() {
    timer = { end: Date.now() + S.rest * 1000, total: S.rest * 1000, done: false };
    $("rest").hidden = false; $("rest").classList.remove("done"); $("restLbl").textContent = "休憩中";
    clearInterval(tickI); tickI = setInterval(tick, 250); tick();
  }
  function stopRest() { clearInterval(tickI); timer = null; $("rest").hidden = true; }
  function tick() {
    if (!timer) return;
    const left = Math.max(0, timer.end - Date.now());
    const sec = Math.ceil(left / 1000);
    $("restTime").textContent = `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
    $("arc").style.strokeDashoffset = String(CIRC * (1 - left / timer.total));
    if (left === 0 && !timer.done) {
      timer.done = true; alarm();
      $("rest").classList.add("done"); $("restLbl").textContent = "休憩終了。次のセットへ";
      clearInterval(tickI);
      setTimeout(() => { if (timer && timer.done) stopRest(); }, 6000);
    }
  }
  $("restAdd").addEventListener("click", () => {
    if (!timer) return;
    if (timer.done) { timer = { end: Date.now() + 30000, total: 30000, done: false }; $("rest").classList.remove("done"); $("restLbl").textContent = "休憩中"; clearInterval(tickI); tickI = setInterval(tick, 250); }
    else { timer.end += 30000; timer.total += 30000; }
    tick();
  });
  $("restSkip").addEventListener("click", stopRest);
  $("arc").style.strokeDasharray = String(CIRC);

  function renderSettings() {
    const seg = $("restSeg"); seg.textContent = "";
    const restBtn = r => {
      const b = el("button", null, r < 120 ? `${r}秒` : fmtSec(r)); b.type = "button";
      b.setAttribute("aria-pressed", String(S.rest === r));
      b.addEventListener("click", () => { S.rest = r; save(); renderSettings(); });
      return b;
    };
    for (const r of RESTS) seg.append(restBtn(r));
    for (const r of S.myRests) {
      const w = el("span", "fc-item"); w.append(restBtn(r), window.FreeChips.remover(r < 120 ? `${r}秒` : fmtSec(r), () => {
        S.myRests = S.myRests.filter(x => x !== r); if (S.rest === r) S.rest = 90; save(); renderSettings();
      }));
      seg.append(w);
    }
    const a = window.FreeChips.adder({ label: "＋ 自分で", aria: "休憩の長さ（秒）", placeholder: "45、2分30秒", max: 10, ok: "決定",
      empty: "休憩の長さを入れてから「決定」を押してください。",
      submit: v => {
        const t = v.normalize("NFKC").replace(/\s/g, "");
        const m = /^(?:(\d+)分)?(?:(\d+)秒?)?$/.exec(t);
        const sec = m && (m[1] || m[2]) ? (+m[1] || 0) * 60 + (+m[2] || 0) : NaN;
        if (!(sec >= 10 && sec <= 600)) return "10秒〜10分の範囲で入れてください。例：45、2分30秒";
        if (!RESTS.includes(sec) && !S.myRests.includes(sec)) { S.myRests.push(sec); if (S.myRests.length > 6) S.myRests.shift(); }
        S.rest = sec; save(); renderSettings();
        const f = $("restSeg").querySelector(".fc-add"); if (f) f.focus();
      } });
    seg.append(a.btn, a.form);
    $("sound").checked = !!S.sound;
  }
  $("sound").addEventListener("change", () => { S.sound = $("sound").checked; save(); if (S.sound) audioInit(); });

  // ---------- 履歴 ----------
  function summary(list, t) {
    if (t === "m") { const sec = list.reduce((x, s) => x + (s.sec || 0), 0), km = list.reduce((x, s) => x + (s.km || 0), 0); return `${list.length}回・計${fmtMin(sec)}` + (km ? `・${num(km)}km` : ""); }
    if (t === "s") return `${list.length}セット・計${fmtSec(list.reduce((x, s) => x + (s.sec || 0), 0))}`;
    const vol = list.reduce((x, s) => x + (s.w || 0) * (s.r || 0), 0);
    return t === "w" && vol > 0 ? `${list.length}セット・合計${num(vol)}kg` : `${list.length}セット・計${list.reduce((x, s) => x + (s.r || 0), 0)}回`;
  }
  function renderHist() {
    const box = $("hist"); box.textContent = "";
    const last = new Map();
    for (const s of S.sets) last.set(s.ex, Math.max(last.get(s.ex) || 0, s.t));
    const used = [...last.keys()].sort((a, b) => last.get(b) - last.get(a));
    for (const name of used) {
      const ex = info(name), t = ex.type, all = setsOf(name), bst = best(all, t), ses = sessions(name);
      const d = el("details", "ex");
      const sm = el("summary");
      sm.append(el("span", "t", name), el("span", "best", (t === "m" ? "最長 " : "ベスト ") + setText(bst, t)));
      sm.append(el("span", "meta", `${ex.part}・${ses.length}日分の記録・最後は${dayLabel(ses[0][0])}` + (ses.length > 1 ? `・ベストは${dayLabel(dayKey(bst.t))}` : "")));
      d.append(sm);
      const ul = el("ul");
      for (const [k, list] of ses.slice(0, 30)) {
        const li = el("li"), dd = el("span", "d");
        dd.append(el("span", null, dayLabel(k)), el("span", null, summary(list, t)));
        li.append(dd, el("span", "s", list.map(s => short(s, t)).join("　"))); ul.append(li);
      }
      if (ses.length > 30) ul.append(el("li", "more", `ほか${ses.length - 30}日分`));
      d.append(ul);
      const go = el("button", "mini again", "この種目を記録する"); go.type = "button";
      go.addEventListener("click", () => { show("log"); choose(name); window.scrollTo(0, 0); });
      d.append(go);
      box.append(d);
    }
    $("histEmpty").hidden = used.length > 0;
    $("wipe").hidden = used.length === 0;
  }
  $("wipe").addEventListener("click", () => {
    if (!confirm("すべての記録を削除しますか？元に戻せません。")) return;
    S.sets = []; save(); renderHist(); prefill(); renderLog(); renderFav();
  });

  function show(view) {
    const log = view === "log";
    $("viewLog").hidden = !log; $("viewHist").hidden = log;
    $("tabLog").setAttribute("aria-pressed", String(log)); $("tabHist").setAttribute("aria-pressed", String(!log));
    $("app").classList.toggle("hist", !log);
    if (!log) { stopWatch(true); renderHist(); } else renderLog();
  }
  $("tabLog").addEventListener("click", () => show("log"));
  $("tabHist").addEventListener("click", () => show("hist"));

  prefill(); renderFav(); renderLog(); renderSettings(); renderKinds();
})();
