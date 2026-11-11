// 時差の時刻合わせ — 選んだ都市の時刻を1時間ごとに並べ、全員が仕事の時間に入る行を示す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-jisa-v1";
  const FC = window.FreeChips;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const CITIES = (window.JISA_CITIES || []).map(([id, name, country, tz, alias]) => ({ key: id, name, country, tz, alias }));
  const byKey = new Map(CITIES.map(c => [c.key, c]));
  const MAX = 8;
  const POPULAR = ["newyork", "london", "la", "singapore", "shanghai", "sydney", "paris", "bengaluru"];

  // ---------- 時刻の計算（Intl だけで、サマータイムも含めて） ----------
  const fmtCache = new Map();
  function fmtFor(tz) {
    if (!fmtCache.has(tz)) fmtCache.set(tz, new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" }));
    return fmtCache.get(tz);
  }
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const WDJ = ["日", "月", "火", "水", "木", "金", "土"];
  function partsAt(ms, tz) {
    const o = {};
    fmtFor(tz).formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, wd: WD[o.weekday] };
  }
  function offsetMin(ms, tz) {
    const p = partsAt(ms, tz);
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000) / 60000);
  }
  // その都市の y年m月d日 h時 は、いつ（ms）か
  function instantFor(y, m, d, h, tz) {
    const guess = Date.UTC(y, m - 1, d, h);
    let t = guess - offsetMin(guess, tz) * 60000;
    const o2 = offsetMin(t, tz);
    t = guess - o2 * 60000;
    return t;
  }
  const hm = p => `${p.h}:${String(p.mi).padStart(2, "0")}`;
  const utcLabel = min => { const s = min < 0 ? "−" : "+", a = Math.abs(min); return `UTC${s}${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`; };
  const dayNum = p => Date.UTC(p.y, p.m - 1, p.d) / 864e5;

  // ---------- 保存 ----------
  const custom = FC.store(KEY + ".custom", {
    limit: 30,
    valid: v => v && typeof v.name === "string" && v.name.trim() && typeof v.tz === "string" && validTz(v.tz),
    same: (a, b) => a.name === b.name
  });
  function validTz(tz) { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch (e) { return false; } }
  function placeOf(key) {
    if (key.startsWith("c:")) {
      const name = key.slice(2), c = custom.all().find(x => x.name === name);
      return c ? { key, name: c.name, country: cityNameForTz(c.tz), tz: c.tz, custom: true } : (st.keep[key] ? { key, name, country: cityNameForTz(st.keep[key]), tz: st.keep[key], custom: true } : null);
    }
    return byKey.get(key) || null;
  }
  function cityNameForTz(tz) { const c = CITIES.find(x => x.tz === tz); return c ? `${c.name}と同じ時刻` : tz; }

  let st = { sel: ["tokyo", "newyork", "london"], ws: 9, we: 18, dur: 60, fmtEnd: false, keep: {} };
  function cleanSt(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.sel)) return null;
    const o = { sel: [], ws: 9, we: 18, dur: 60, fmtEnd: !!d.fmtEnd, keep: {} };
    if (d.keep && typeof d.keep === "object") Object.keys(d.keep).forEach(k => { if (typeof k === "string" && k.startsWith("c:") && typeof d.keep[k] === "string" && validTz(d.keep[k])) o.keep[k.slice(0, 30)] = d.keep[k]; });
    d.sel.forEach(k => { if (typeof k === "string" && !o.sel.includes(k) && (byKey.has(k) || k.startsWith("c:"))) o.sel.push(k.slice(0, 30)); });
    o.sel = o.sel.slice(0, MAX);
    if (Number.isInteger(d.ws) && d.ws >= 0 && d.ws <= 23) o.ws = d.ws;
    if (Number.isInteger(d.we) && d.we >= 1 && d.we <= 24 && d.we > o.ws) o.we = d.we;
    if ([30, 60, 90, 120].includes(d.dur)) o.dur = d.dur;
    return o;
  }
  try { const v = cleanSt(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 初めて */ }
  function save() {
    // 自分で入れた呼び名は、候補から外しても表に残せるよう時刻の決まりも控えておく
    const keep = {};
    st.sel.forEach(k => { if (k.startsWith("c:")) { const p = placeOf(k); if (p) keep[k] = p.tz; } });
    st.keep = keep;
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できなくても使える */ }
  }
  const places = () => st.sel.map(placeOf).filter(Boolean);

  // ---------- 日にち ----------
  let date = null; // {y,m,d}（基準の都市の日にち）
  function today() { const b = places()[0]; const p = partsAt(Date.now(), b ? b.tz : "Asia/Tokyo"); return { y: p.y, m: p.m, d: p.d }; }
  const dateStr = d => `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  function shiftDay(n) { const t = new Date(Date.UTC(date.y, date.m - 1, date.d + n)); date = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }

  // ---------- 都市の一覧 ----------
  function renderCities() {
    const ul = $("cities"); ul.textContent = "";
    const ps = places(), now = Date.now();
    const baseOff = ps[0] ? offsetMin(now, ps[0].tz) : 0;
    ps.forEach((p, i) => {
      const li = el("li", "city" + (i === 0 ? " base" : ""));
      const pt = partsAt(now, p.tz), off = offsetMin(now, p.tz);
      const info = el("div", "c-info");
      const nm = el("span", "c-name", p.name);
      if (i === 0) nm.append(el("span", "c-badge", "基準"));
      info.append(nm, el("span", "c-sub", `${p.country}・${utcLabel(off)}`));
      const diff = (off - baseOff) / 60;
      const dTxt = i === 0 ? "" : diff === 0 ? "時差なし" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)}時間`;
      const tm = el("div", "c-time"); tm.append(el("b", null, hm(pt)), el("span", null, dTxt || "いま"));
      const btns = el("div", "c-btns");
      if (i > 0) {
        const up = el("button", "mini", "基準に"); up.type = "button";
        up.setAttribute("aria-label", `${p.name}を基準にする`);
        up.addEventListener("click", () => { st.sel.splice(i, 1); st.sel.unshift(p.key); save(); date = null; renderAll(); });
        btns.append(up);
      }
      if (ps.length > 1) {
        const rm = el("button", "mini x", "×"); rm.type = "button";
        rm.setAttribute("aria-label", `${p.name}を表から外す`);
        rm.addEventListener("click", () => {
          const snap = st.sel.slice();
          st.sel.splice(i, 1); save(); if (i === 0) date = null; renderAll();
          toast(`${p.name}を外しました。`, () => { st.sel = snap; save(); renderAll(); });
        });
        btns.append(rm);
      }
      li.append(info, tm, btns);
      ul.append(li);
    });
    $("nowLine").textContent = ps[0] ? `いまの時刻（${ps.length}都市）` : "";
  }

  // ---------- 探す ----------
  const norm = s => String(s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・.\-ー]/g, "");
  function addPlace(key) {
    if (st.sel.includes(key)) { $("qErr").textContent = "もう表に入っています。"; return false; }
    if (st.sel.length >= MAX) { $("qErr").textContent = `都市は${MAX}つまでです。どれかを外してから追加してください。`; return false; }
    st.sel.push(key); save(); $("q").value = ""; $("qErr").textContent = ""; renderAll();
    return true;
  }
  function renderHits() {
    const q = norm($("q").value);
    const ul = $("hits"); ul.textContent = "";
    const cs = custom.all().map(c => ({ key: "c:" + c.name, name: c.name, country: cityNameForTz(c.tz), tz: c.tz, custom: true }));
    let list;
    if (!q) list = cs.concat(POPULAR.map(k => byKey.get(k))).filter(p => !st.sel.includes(p.key)).slice(0, 10);
    else list = cs.concat(CITIES).filter(p => norm(p.name + p.country + (p.alias || "")).includes(q) || norm(p.tz).includes(q)).slice(0, 10);
    if (q && !list.length) { const li = el("li", "nohit", "見つかりません。英語の名前や国名でも探せます。ない場合は「＋ 自分で入力」から追加できます。"); ul.append(li); return; }
    list.forEach(p => {
      const li = el("li", "hit");
      const b = el("button", "hit-b"); b.type = "button";
      const on = st.sel.includes(p.key);
      b.append(el("span", "h-name", (on ? "✓ " : "＋ ") + p.name), el("span", "h-sub", `${p.country}・${hm(partsAt(Date.now(), p.tz))}`));
      b.setAttribute("aria-label", on ? `${p.name}（表に入っています）` : `${p.name}を追加`);
      b.addEventListener("click", () => { if (addPlace(p.key)) $("q").focus(); });
      li.append(b);
      if (p.custom) li.append(FC.remover(p.name, () => {
        const item = custom.all().find(c => c.name === p.name), i = custom.remove(item);
        save(); renderAll();
        toast(`「${p.name}」を候補から外しました。`, () => { custom.insert(item, i); save(); renderAll(); });
      }, "mini x"));
      ul.append(li);
    });
  }
  $("q").addEventListener("input", () => { $("qErr").textContent = ""; renderHits(); });
  $("q").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); const b = $("hits").querySelector(".hit-b"); if (b) b.click(); }
  });

  // 自分で入力：呼び名と、どの都市と同じ時刻か
  (function ownForm() {
    const box = $("own");
    const btn = el("button", "fc-add", "＋ 自分で入力"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
    const form = el("div", "fc-form"); form.hidden = true; form.setAttribute("role", "group"); form.setAttribute("aria-label", "自分で入力");
    const l1 = el("label", "own-f"); l1.append(el("span", null, "呼び名"));
    const name = el("input", "fc-in"); name.type = "text"; name.maxLength = 20; name.placeholder = "大阪支社"; name.autocomplete = "off";
    l1.append(name);
    const l2 = el("label", "own-f"); l2.append(el("span", null, "時刻は"));
    const sel = el("select", "own-sel");
    CITIES.slice().sort((a, b) => offsetMin(Date.now(), a.tz) - offsetMin(Date.now(), b.tz) || a.name.localeCompare(b.name, "ja")).forEach(c => {
      const o = el("option", null, `${c.name}と同じ（${utcLabel(offsetMin(Date.now(), c.tz))}）`); o.value = c.tz; sel.append(o);
    });
    sel.value = "Asia/Tokyo";
    l2.append(sel);
    const row = el("div", "fc-row");
    const ok = el("button", "fc-ok", "追加"); ok.type = "button";
    const no = el("button", "fc-no", "やめる"); no.type = "button";
    row.append(ok, no);
    const err = el("p", "fc-err"); err.setAttribute("role", "alert"); err.id = "ownErr"; name.setAttribute("aria-describedby", "ownErr");
    form.append(l1, l2, row, err);
    box.append(btn, form);
    let composing = false;
    const open = () => { form.hidden = false; btn.setAttribute("aria-expanded", "true"); err.textContent = ""; name.focus(); };
    const close = back => { form.hidden = true; btn.setAttribute("aria-expanded", "false"); name.value = ""; err.textContent = ""; name.removeAttribute("aria-invalid"); if (back) btn.focus(); };
    const go = () => {
      const v = FC.tidy(name.value).slice(0, 20);
      if (!v) { err.textContent = "呼び名を入れてください（例：大阪支社、田中さん）。"; name.setAttribute("aria-invalid", "true"); name.focus(); return; }
      const hit = CITIES.find(c => c.name === v);
      if (hit) { if (addPlace(hit.key)) close(false); else { err.textContent = $("qErr").textContent; $("qErr").textContent = ""; } return; }
      custom.remove({ name: v }); custom.add({ name: v, tz: sel.value });
      if (!st.sel.includes("c:" + v)) { if (addPlace("c:" + v)) close(false); else { err.textContent = $("qErr").textContent; $("qErr").textContent = ""; } }
      else { save(); renderAll(); close(false); }
    };
    btn.addEventListener("click", () => (form.hidden ? open() : close(true)));
    ok.addEventListener("click", go);
    no.addEventListener("click", () => close(true));
    name.addEventListener("compositionstart", () => { composing = true; });
    name.addEventListener("compositionend", () => { composing = false; });
    name.addEventListener("input", () => { err.textContent = ""; name.removeAttribute("aria-invalid"); });
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target === name) { if (composing || e.isComposing || e.keyCode === 229) return; e.preventDefault(); go(); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
    });
  })();

  // ---------- 表 ----------
  let picked = null; // 基準の都市の時（0〜23）
  function rowsData() {
    const ps = places(); if (!ps.length) return [];
    const base = ps[0];
    const baseDay = dayNum({ y: date.y, m: date.m, d: date.d });
    const out = [];
    for (let h = 0; h < 24; h++) {
      const t = instantFor(date.y, date.m, date.d, h, base.tz);
      const bp = partsAt(t, base.tz);
      if (bp.h !== h || dayNum(bp) !== baseDay) continue; // サマータイムで存在しない時刻
      const cells = ps.map(p => {
        const lp = partsAt(t, p.tz), le = partsAt(t + st.dur * 60000, p.tz);
        const startMin = lp.h * 60 + lp.mi;
        const endMin = dayNum(le) === dayNum(lp) ? le.h * 60 + le.mi : 24 * 60 + le.h * 60 + le.mi;
        const work = startMin >= st.ws * 60 && endMin <= st.we * 60;
        const awake = lp.h >= 7 && lp.h < 22;
        return { p, lp, le, work, awake, dd: dayNum(lp) - baseDay };
      });
      out.push({ h, t, cells, ok: cells.filter(c => c.work).length });
    }
    return out;
  }
  function renderGrid() {
    const ps = places();
    const rows = rowsData();
    const tb = $("grid"); tb.textContent = "";
    const thead = el("thead"), hr = el("tr");
    const th0 = el("th", "mark-h", "全員"); th0.scope = "col"; hr.append(th0);
    ps.forEach((p, i) => {
      const th = el("th", i === 0 ? "base" : null); th.scope = "col";
      th.append(el("span", "th-n", p.name), el("span", "th-s", utcLabel(offsetMin(rows[0] ? rows[0].t : Date.now(), p.tz))));
      hr.append(th);
    });
    thead.append(hr); tb.append(thead);
    const body = el("tbody");
    const nowMs = Date.now();
    rows.forEach(r => {
      const all = r.ok === ps.length, near = !all && ps.length > 2 && r.ok === ps.length - 1;
      const tr = el("tr", all ? "all" : near ? "near" : "");
      if (picked === r.h) tr.classList.add("picked");
      if (nowMs >= r.t && nowMs < r.t + 3600000) tr.classList.add("now");
      const mk = el("td", "mark");
      const b = el("button", "pick-b", all ? "◎" : near ? "△" : ""); b.type = "button";
      b.setAttribute("aria-pressed", String(picked === r.h));
      b.setAttribute("aria-label", r.cells.map(c => `${c.p.name} ${hm(c.lp)}`).join("、") + (all ? "。全員が仕事の時間" : "") + "。この時刻を選ぶ");
      b.addEventListener("click", () => pick(r.h));
      mk.append(b); tr.append(mk);
      r.cells.forEach(c => {
        const td = el("td", c.work ? "work" : c.awake ? "awake" : "night");
        td.append(el("span", "t", hm(c.lp)));
        if (c.dd) td.append(el("span", "dd", c.dd < 0 ? "前日" : "翌日"));
        tr.append(td);
      });
      tr.addEventListener("click", e => { if (!e.target.closest(".pick-b")) pick(r.h); });
      body.append(tr);
    });
    tb.append(body);

    // まとめ
    const okRows = rows.filter(r => r.ok === ps.length);
    const s = $("summary"); s.textContent = "";
    if (ps.length < 2) s.textContent = "比べる都市を1つ以上追加してください。";
    else if (okRows.length) {
      const ranges = [];
      okRows.forEach(r => { const lst = ranges[ranges.length - 1]; if (lst && lst.to === r.h - 1) lst.to = r.h; else ranges.push({ from: r.h, to: r.h }); });
      s.append(el("b", null, "◎ 全員が仕事の時間："));
      s.append(`${ps[0].name}で ` + ranges.map(x => x.from === x.to ? `${x.from}:00` : `${x.from}:00〜${x.to}:00`).join("、") + " に始めるとき");
    } else {
      s.append(el("b", null, "全員がそろう時間はありません。"));
      s.append(ps.length > 2 ? "△は、1都市だけ時間外の行です。" : "色の薄い時間なら、起きている時間です。");
    }
  }
  function pick(h) {
    picked = picked === h ? null : h;
    renderGrid(); renderOut();
    if (picked != null) { const tr = $("grid").querySelector("tr.picked .pick-b"); if (tr) tr.focus({ preventScroll: true }); }
  }
  function slotText() {
    const r = rowsData().find(x => x.h === picked); if (!r) return "";
    const b = r.cells[0];
    const tm = c => st.fmtEnd ? `${hm(c.lp)}〜${hm(c.le)}` : hm(c.lp);
    const head = `${b.lp.m}月${b.lp.d}日（${WDJ[b.lp.wd]}）${tm(b)}（${b.p.name}）`;
    const rest = r.cells.slice(1).map(c => `${tm(c)}（${c.p.name}${c.dd ? `、${c.lp.d}日` : ""}）`);
    return [head].concat(rest).join("／");
  }
  function renderOut() {
    $("out").hidden = picked == null;
    if (picked == null) return;
    $("outText").textContent = slotText();
    $("fmtBtn").setAttribute("aria-pressed", String(st.fmtEnd));
    $("copyMsg").textContent = "";
  }
  $("copyBtn").addEventListener("click", async () => {
    const t = slotText();
    try { await navigator.clipboard.writeText(t); $("copyMsg").textContent = "コピーしました。メールやチャットに貼り付けられます。"; }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($("outText"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      $("copyMsg").textContent = "コピーできませんでした。選んだ文を長押ししてコピーしてください。";
    }
  });
  $("fmtBtn").addEventListener("click", () => { st.fmtEnd = !st.fmtEnd; save(); renderOut(); });

  // ---------- 日にち・時間 ----------
  for (let h = 0; h <= 24; h++) {
    if (h < 24) { const o = el("option", null, `${h}時`); o.value = h; $("ws").append(o); }
    if (h > 0) { const o = el("option", null, `${h}時`); o.value = h; $("we").append(o); }
  }
  $("ws").addEventListener("change", () => { st.ws = +$("ws").value; if (st.we <= st.ws) st.we = Math.min(24, st.ws + 1); save(); renderAll(); });
  $("we").addEventListener("change", () => { st.we = +$("we").value; if (st.we <= st.ws) st.ws = Math.max(0, st.we - 1); save(); renderAll(); });
  $("dur").addEventListener("change", () => { st.dur = +$("dur").value; save(); renderAll(); });
  $("date").addEventListener("change", () => {
    const m = $("date").value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) { date = { y: +m[1], m: +m[2], d: +m[3] }; picked = null; renderAll(); }
  });
  $("prevDay").addEventListener("click", () => { shiftDay(-1); picked = null; renderAll(); });
  $("nextDay").addEventListener("click", () => { shiftDay(1); picked = null; renderAll(); });

  function renderAll() {
    if (!st.sel.length || !places().length) st.sel = ["tokyo"];
    if (!date) date = today();
    $("date").value = dateStr(date);
    $("ws").value = st.ws; $("we").value = st.we; $("dur").value = st.dur;
    renderCities(); renderHits(); renderGrid(); renderOut();
    if (!scrolled) { // はじめは朝7時あたりから見せる
      scrolled = true;
      const tr = $("grid").querySelectorAll("tbody tr")[7], head = $("grid").querySelector("thead");
      if (tr && head) $("gridWrap").scrollTop = tr.offsetTop - head.offsetHeight - 4;
    }
  }
  let scrolled = false;

  // ---------- トースト ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const pad = n => String(n).padStart(2, "0");
  $("expBtn").addEventListener("click", () => {
    const d = new Date();
    const out = { app: "jisa", version: 1, exportedAt: d.toISOString(), data: st, custom: custom.all() };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `jisa-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, cs = [];
    try {
      if (f.size > 1e6) throw 0;
      const j = JSON.parse(await f.text());
      if (j && j.app === "jisa") {
        data = cleanSt(j.data);
        if (Array.isArray(j.custom)) cs = j.custom.filter(c => c && typeof c.name === "string" && typeof c.tz === "string" && validTz(c.tz)).map(c => ({ name: FC.tidy(c.name).slice(0, 20), tz: c.tz })).filter(c => c.name);
      }
    } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    const snap = { st: JSON.stringify(st), custom: custom.all() };
    cs.forEach(c => { custom.remove(c); custom.add(c); });
    st = data; date = null; picked = null; save(); renderAll();
    $("moveMsg").textContent = `読み込みました（${st.sel.length}都市）。`;
    toast("読み込みました。", () => {
      st = JSON.parse(snap.st); custom.all().forEach(c => custom.remove(c)); snap.custom.forEach(c => custom.add(c));
      date = null; save(); renderAll();
    });
  });

  setInterval(() => { renderCities(); }, 30000);
  window.__jisa = { partsAt, offsetMin, instantFor, slotText: () => slotText(), pick, get st() { return st; }, setDate: (y, m, d) => { date = { y, m, d }; picked = null; renderAll(); } };
  renderAll();
})();
