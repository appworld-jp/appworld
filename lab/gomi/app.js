// ごみの日カレンダー — 収集日のルールから、今日・明日・月のカレンダーを出す。データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "gomi.v1";
  const COLORS = 10;
  const WD = "日月火水木金土";
  const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const KIND_PRESETS = [
    { name: "燃えるごみ", ch: "燃", color: 0 }, { name: "燃えないごみ", ch: "不", color: 1 },
    { name: "資源ごみ", ch: "資", color: 2 }, { name: "プラスチック", ch: "プ", color: 3 },
    { name: "びん・缶", ch: "缶", color: 4 }, { name: "ペットボトル", ch: "ペ", color: 5 },
    { name: "古紙・布", ch: "紙", color: 6 }, { name: "粗大ごみ", ch: "粗", color: 7 },
    { name: "有害ごみ", ch: "有", color: 8 }
  ];
  const STARTER = [
    ["燃えるごみ", [{ t: "w", days: [1, 4] }]],
    ["プラスチック", [{ t: "w", days: [3] }]],
    ["びん・缶", [{ t: "n", nths: [1, 3], days: [5] }]],
    ["ペットボトル", [{ t: "n", nths: [2, 4], days: [5] }]],
    ["古紙・布", [{ t: "n", nths: [2, 4], days: [2] }]],
    ["燃えないごみ", [{ t: "n", nths: [1, 3], days: [2] }]],
    ["粗大ごみ", [{ t: "d", dates: [] }]]
  ];
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parse(s)) === s;
  const md = d => `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const midnight = d => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  let st = null; // { area, time, kinds: [...], skips: [...] }
  let view = "cal", shown = null, pickDay = null;

  // ---- 読みこみ・検証 ----
  const nums = (a, lo, hi) => Array.isArray(a) ? [...new Set(a.map(Number).filter(n => Number.isInteger(n) && n >= lo && n <= hi))].sort((x, y) => x - y) : [];
  function valid(v) {
    if (!v || !Array.isArray(v.kinds)) return null;
    const kinds = [];
    for (const k of v.kinds.slice(0, 30)) {
      if (!k || typeof k.name !== "string" || !k.name.trim()) continue;
      const rules = [];
      for (const r of Array.isArray(k.rules) ? k.rules.slice(0, 10) : []) {
        if (!r) continue;
        if (r.t === "w") rules.push({ t: "w", days: nums(r.days, 0, 6) });
        else if (r.t === "n") rules.push({ t: "n", nths: nums(r.nths, 1, 5), days: nums(r.days, 0, 6) });
        else if (r.t === "d") rules.push({ t: "d", dates: Array.isArray(r.dates) ? [...new Set(r.dates.filter(isYmd))].sort().slice(0, 200) : [] });
      }
      const name = k.name.trim().slice(0, 16);
      kinds.push({ id: typeof k.id === "string" && k.id ? k.id.slice(0, 40) : uid(), name, ch: (typeof k.ch === "string" && k.ch.trim() ? k.ch.trim() : name).slice(0, 1), color: Number.isInteger(k.color) && k.color >= 0 && k.color < COLORS ? k.color : 0, rules });
    }
    const skips = Array.isArray(v.skips) ? [...new Set(v.skips.filter(isYmd))].sort() : [];
    const str = s => (typeof s === "string" ? s.slice(0, 24) : "");
    return { area: str(v.area), time: str(v.time), kinds, skips };
  }
  try { st = valid(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); }
    catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。"); }
  }
  const snapshot = () => JSON.stringify(st);

  // ---- 収集日の計算 ----
  function hits(rule, d) {
    if (rule.t === "w") return rule.days.includes(d.getDay());
    if (rule.t === "n") return rule.days.includes(d.getDay()) && rule.nths.includes(Math.ceil(d.getDate() / 7));
    if (rule.t === "d") return rule.dates.includes(ymd(d));
    return false;
  }
  function kindsOn(d) {
    if (st.skips.includes(ymd(d))) return [];
    return st.kinds.filter(k => k.rules.some(r => hits(r, d)));
  }
  function nextDate(k, from) {
    for (let i = 0; i < 400; i++) { const d = addDays(from, i); if (!st.skips.includes(ymd(d)) && k.rules.some(r => hits(r, d))) return d; }
    return null;
  }
  const join = a => a.join("・");
  function ruleText(r) {
    const days = WD_ORDER.filter(x => r.days && r.days.includes(x)).map(x => WD[x]);
    if (r.t === "w") return days.length ? `毎週 ${join(days)}` : "毎週（曜日を選んでください）";
    if (r.t === "n") return r.nths.length && days.length ? `第${join(r.nths)} ${join(days)}曜` : "毎月 第◯（選んでください）";
    return r.dates.length ? `日付指定 ${r.dates.length}日` : "日付指定（まだありません）";
  }
  const kindText = k => k.rules.length ? k.rules.map(ruleText).join("、") : "収集日が決まっていません";

  function badge(k, size) {
    const b = el("span", "bdg c" + k.color + (size ? " " + size : ""), k.ch);
    b.setAttribute("aria-hidden", "true"); return b;
  }

  // ---- 画面 ----
  function render() {
    const first = !st;
    $("start").hidden = !first; $("tabs").hidden = first;
    $("view-cal").hidden = first || view !== "cal";
    $("view-rules").hidden = first || view !== "rules";
    $("tab-cal").setAttribute("aria-current", view === "cal" ? "page" : "false");
    $("tab-rules").setAttribute("aria-current", view === "rules" ? "page" : "false");
    $("area-label").hidden = first || !st.area;
    if (!first) $("area-label").textContent = st.area;
    if (first) return;
    if (view === "cal") renderCal(); else renderRules();
  }

  function fillDay(ul, d) {
    ul.textContent = "";
    const ks = kindsOn(d);
    if (st.skips.includes(ymd(d))) { ul.append(el("li", "none", "収集はお休みです")); return ks; }
    if (!ks.length) { ul.append(el("li", "none", "収集はありません")); return ks; }
    ks.forEach(k => { const li = el("li", "kind"); li.append(badge(k, "lg"), el("span", null, k.name)); ul.append(li); });
    return ks;
  }
  function renderCal() {
    const today = midnight(new Date()), tmr = addDays(today, 1);
    $("today-date").textContent = md(today); $("tmr-date").textContent = md(tmr);
    const tk = fillDay($("today-kinds"), today);
    fillDay($("tmr-kinds"), tmr);
    $("time-note").hidden = !st.time;
    $("time-note").textContent = st.time ? `出す時間：${st.time}` : "";
    document.querySelector(".day.today").classList.toggle("has", tk.length > 0);

    // 次の収集日
    const nl = $("next-list"); nl.textContent = "";
    if (!st.kinds.length) {
      const li = el("li", "none"); li.append("まだ種類がありません。");
      const b = el("button", "link", "収集日を設定する"); b.type = "button"; b.addEventListener("click", () => go("rules")); li.append(b); nl.append(li);
    }
    st.kinds.map(k => ({ k, d: nextDate(k, today) })).sort((a, b) => (a.d ? a.d.getTime() : Infinity) - (b.d ? b.d.getTime() : Infinity))
      .forEach(({ k, d }) => {
        const li = el("li"); li.append(badge(k), el("span", "nk", k.name));
        if (d) {
          const n = Math.round((d - today) / 864e5);
          li.append(el("span", "nd", md(d)), el("span", "nn" + (n <= 1 ? " soon" : ""), n === 0 ? "今日" : n === 1 ? "明日" : `あと${n}日`));
        } else li.append(el("span", "nd muted", k.rules.some(r => r.t === "d") ? "申し込んだ日を登録してください" : "予定がありません"));
        nl.append(li);
      });

    // 月のカレンダー
    if (!shown) shown = new Date(today.getFullYear(), today.getMonth(), 1);
    $("h-month").textContent = `${shown.getFullYear()}年${shown.getMonth() + 1}月`;
    const cal = $("cal"); cal.textContent = "";
    const head = el("div", "cal-row head"); head.setAttribute("role", "row");
    for (let i = 0; i < 7; i++) { const h = el("span", "wd w" + i, WD[i]); h.setAttribute("role", "columnheader"); head.append(h); }
    cal.append(head);
    const start = addDays(shown, -shown.getDay());
    let row;
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      if (i % 7 === 0) { if (i >= 35 && d.getMonth() !== shown.getMonth()) break; row = el("div", "cal-row"); row.setAttribute("role", "row"); cal.append(row); }
      const inMonth = d.getMonth() === shown.getMonth();
      const ks = kindsOn(d), skip = st.skips.includes(ymd(d));
      const c = el("button", "cell w" + d.getDay() + (inMonth ? "" : " out") + (+d === +today ? " is-today" : "") + (skip ? " skip" : ""));
      c.type = "button"; c.setAttribute("role", "gridcell");
      c.setAttribute("aria-label", `${md(d)}、${skip ? "収集お休み" : ks.length ? ks.map(k => k.name).join("、") : "収集なし"}`);
      if (pickDay && ymd(pickDay) === ymd(d)) c.setAttribute("aria-pressed", "true");
      c.append(el("span", "dn", String(d.getDate())));
      const bs = el("span", "bs");
      if (skip) bs.append(el("span", "bdg rest", "休"));
      ks.slice(0, 3).forEach(k => bs.append(badge(k, "sm")));
      if (ks.length > 3) bs.append(el("span", "more", "+" + (ks.length - 3)));
      c.append(bs);
      c.addEventListener("click", () => { pickDay = d; renderCal(); });
      row.append(c);
    }
    const pk = $("pick"); pk.textContent = "";
    if (pickDay) {
      const ks = kindsOn(pickDay);
      pk.append(el("b", null, md(pickDay) + "　"), st.skips.includes(ymd(pickDay)) ? "収集はお休みです" : ks.length ? ks.map(k => k.name).join("、") : "収集はありません");
    } else pk.textContent = "日付を押すと、その日のごみが出ます。";
    const lg = $("legend"); lg.textContent = "";
    st.kinds.forEach(k => { const li = el("li"); li.append(badge(k, "sm"), k.name); lg.append(li); });
  }

  // ---- 設定 ----
  function renderRules() {
    const box = $("kinds"); box.textContent = "";
    if (!st.kinds.length) box.append(el("p", "empty", "まだ種類がありません。下の「種類を追加」から選んでください。"));
    st.kinds.forEach((k, ki) => box.append(kindCard(k, ki)));
    const kp = $("kind-presets"); kp.textContent = "";
    const have = new Set(st.kinds.map(k => k.name));
    KIND_PRESETS.filter(p => !have.has(p.name)).forEach(p => {
      const b = el("button", "kp"); b.type = "button"; b.append(badge(p, "sm"), p.name);
      b.addEventListener("click", () => addKind(p.name, p.ch, p.color));
      kp.append(b);
    });
    const ny = nyRange();
    $("skip-ny").textContent = `＋ 年末年始（${ny[0].getMonth() + 1}/${ny[0].getDate()}〜${ny[ny.length - 1].getMonth() + 1}/${ny[ny.length - 1].getDate()}）を休みにする`;
    const sk = $("skips"); sk.textContent = "";
    const todayS = ymd(new Date());
    st.skips.filter(s => s >= todayS).forEach(s => {
      const li = el("li", "chip"); li.append(el("span", null, md(parse(s))));
      const x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", `${md(parse(s))}を休みの日から外す`);
      x.addEventListener("click", () => { const snap = snapshot(); st.skips = st.skips.filter(v => v !== s); save(); renderRules(); toast(`${md(parse(s))}を休みの日から外しました。`, snap); });
      li.append(x); sk.append(li);
    });
    $("opt-area").value = st.area; $("opt-time").value = st.time;
  }

  // 押しても画面を作り直さない（フォーカスが動かないように）
  function toggleGroup(labels, values, selected, onChange, label, cls) {
    const g = el("div", "tg " + cls); g.setAttribute("role", "group"); g.setAttribute("aria-label", label);
    let cur = selected.slice();
    values.forEach((v, i) => {
      const b = el("button", "t" + (cls === "wk" ? " w" + v : ""), labels[i]); b.type = "button";
      b.setAttribute("aria-pressed", cur.includes(v) ? "true" : "false");
      b.addEventListener("click", () => {
        const on = !cur.includes(v);
        cur = on ? [...cur, v].sort((a, c) => a - c) : cur.filter(x => x !== v);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        onChange(cur);
      });
      g.append(b);
    });
    return g;
  }

  function kindCard(k, ki) {
    const card = el("article", "kcard c" + k.color); card.dataset.id = k.id; card.dataset.name = k.name;
    const top = el("div", "ktop");
    top.append(badge(k, "lg"));
    const nmL = el("label", "kname"); nmL.append(el("span", "vh", "種類の名前"));
    const nm = el("input"); nm.value = k.name; nm.maxLength = 16; nm.autocomplete = "off";
    nm.addEventListener("change", () => {
      const v = nm.value.trim();
      if (!v) { nm.value = k.name; return; }
      k.name = v; save(); renderRules();
    });
    nmL.append(nm);
    const chL = el("label", "kch"); chL.append(el("span", null, "1文字"));
    const ch = el("input"); ch.value = k.ch; ch.maxLength = 1; ch.autocomplete = "off";
    ch.addEventListener("change", () => { const v = ch.value.trim(); if (v) { k.ch = v.slice(0, 1); save(); } renderRules(); });
    chL.append(ch);
    top.append(nmL, chL);
    card.append(top);

    const sw = el("div", "swatches"); sw.setAttribute("role", "group"); sw.setAttribute("aria-label", `${k.name}の色`);
    for (let i = 0; i < COLORS; i++) {
      const b = el("button", "sw c" + i); b.type = "button"; b.setAttribute("aria-label", `色${i + 1}`);
      b.setAttribute("aria-pressed", k.color === i ? "true" : "false");
      b.addEventListener("click", () => { k.color = i; save(); renderRules(); });
      sw.append(b);
    }
    card.append(sw);
    const sum = el("p", "ksum", kindText(k)); sum.setAttribute("aria-live", "polite");
    card.append(sum);

    k.rules.forEach((r, ri) => {
      const rb = el("div", "rule");
      const sel = el("select"); sel.setAttribute("aria-label", "決まりの種類");
      [["w", "毎週"], ["n", "毎月 第◯"], ["d", "日付を指定"]].forEach(([v, t]) => { const o = el("option", null, t); o.value = v; sel.append(o); });
      sel.value = r.t;
      sel.addEventListener("change", () => {
        const days = r.days && r.days.length ? r.days : [];
        k.rules[ri] = sel.value === "w" ? { t: "w", days } : sel.value === "n" ? { t: "n", nths: [], days } : { t: "d", dates: [] };
        save(); renderRules(); focusRule(k.id, ri);
      });
      const rm = el("button", "rm", "×"); rm.type = "button"; rm.setAttribute("aria-label", "この決まりを削除");
      rm.addEventListener("click", () => { const snap = snapshot(); k.rules.splice(ri, 1); save(); renderRules(); toast("決まりを削除しました。", snap); });
      const rh = el("div", "rhead"); rh.append(sel, rm); rb.append(rh);
      if (r.t === "n") rb.append(toggleGroup(["第1", "第2", "第3", "第4", "第5"], [1, 2, 3, 4, 5], r.nths, v => { r.nths = v; save(); sum.textContent = kindText(k); }, "何週目", "nth"));
      if (r.t === "w" || r.t === "n") rb.append(toggleGroup(WD_ORDER.map(x => WD[x]), WD_ORDER, r.days, v => { r.days = v; save(); sum.textContent = kindText(k); }, "曜日", "wk"));
      if (r.t === "d") {
        const f = el("form", "row"); f.noValidate = true;
        const di = el("input"); di.type = "date"; di.setAttribute("aria-label", "収集日");
        const ad = el("button", "btn sm", "追加"); ad.type = "submit";
        const er = el("p", "ferr");
        f.append(di, ad);
        f.addEventListener("submit", e => {
          e.preventDefault(); er.textContent = "";
          if (!isYmd(di.value)) { er.textContent = "日付を選んでください。"; return; }
          if (r.dates.includes(di.value)) { er.textContent = "その日は、もう入っています。"; return; }
          r.dates = [...r.dates, di.value].sort(); save(); renderRules();
        });
        rb.append(f, er);
        const ul = el("ul", "chips");
        const todayS = ymd(new Date());
        r.dates.filter(s => s >= todayS).forEach(s => {
          const li = el("li", "chip"); li.append(el("span", null, md(parse(s))));
          const x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", `${md(parse(s))}を外す`);
          x.addEventListener("click", () => { r.dates = r.dates.filter(v => v !== s); save(); renderRules(); });
          li.append(x); ul.append(li);
        });
        if (ul.children.length) rb.append(ul);
      }
      card.append(rb);
    });
    const foot = el("div", "kfoot");
    const addR = el("button", "link", "＋ 決まりを追加"); addR.type = "button";
    addR.addEventListener("click", () => { k.rules.push({ t: "w", days: [] }); save(); renderRules(); focusRule(k.id, k.rules.length - 1); });
    const del = el("button", "link danger", "この種類を削除"); del.type = "button";
    del.addEventListener("click", () => { const snap = snapshot(); st.kinds.splice(ki, 1); save(); renderRules(); toast(`「${k.name}」を削除しました。`, snap); });
    foot.append(addR, del);
    card.append(foot);
    return card;
  }
  function focusRule(id, ri) {
    const c = document.querySelector(`.kcard[data-id="${CSS.escape(id)}"]`);
    const r = c && c.querySelectorAll(".rule")[ri];
    const f = r && r.querySelector("select"); if (f) f.focus();
  }
  function addKind(name, ch, color) {
    if (st.kinds.some(k => k.name === name)) { $("kind-err").textContent = "同じ名前の種類があります。"; return false; }
    if (st.kinds.length >= 30) { $("kind-err").textContent = "種類は30までです。"; return false; }
    const used = new Set(st.kinds.map(k => k.color));
    if (color == null) { color = 0; for (let i = 0; i < COLORS; i++) if (!used.has(i)) { color = i; break; } }
    st.kinds.push({ id: uid(), name, ch: ch || name.slice(0, 1), color, rules: [name === "粗大ごみ" ? { t: "d", dates: [] } : { t: "w", days: [] }] });
    save(); renderRules();
    const cards = document.querySelectorAll(".kcard"); const last = cards[cards.length - 1];
    if (last) { last.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" }); const s = last.querySelector(".rule select") || last.querySelector("input"); if (s) s.focus({ preventScroll: true }); }
    return true;
  }
  $("kind-form").addEventListener("submit", e => {
    e.preventDefault(); $("kind-err").textContent = "";
    const v = $("kind-name").value.trim();
    if (!v) { $("kind-err").textContent = "種類の名前を入れてください。"; $("kind-name").focus(); return; }
    if (addKind(v)) $("kind-name").value = "";
  });
  // 1/1〜1/3なら今の年末年始、それ以外は次の年末年始
  function nyRange() {
    const now = new Date(); const y = now.getMonth() === 0 && now.getDate() <= 3 ? now.getFullYear() - 1 : now.getFullYear();
    return [new Date(y, 11, 31), new Date(y + 1, 0, 1), new Date(y + 1, 0, 2), new Date(y + 1, 0, 3)];
  }
  $("skip-ny").addEventListener("click", () => {
    const snap = snapshot();
    st.skips = [...new Set([...st.skips, ...nyRange().map(ymd)])].sort(); save(); renderRules();
    toast("年末年始を休みの日にしました。自治体の予定と違うときは、日付を直してください。", snap);
  });
  $("skip-form").addEventListener("submit", e => {
    e.preventDefault(); const v = $("skip-date").value; $("skip-err").textContent = "";
    if (!isYmd(v)) { $("skip-err").textContent = "日付を選んでください。"; return; }
    if (st.skips.includes(v)) { $("skip-err").textContent = "その日は、もう入っています。"; return; }
    st.skips = [...st.skips, v].sort(); save(); $("skip-date").value = ""; renderRules();
  });
  $("opt-area").addEventListener("change", () => { st.area = $("opt-area").value.trim().slice(0, 24); save(); render(); });
  $("opt-time").addEventListener("change", () => { st.time = $("opt-time").value.trim().slice(0, 24); save(); });

  // ---- はじめて ----
  $("start-preset").addEventListener("click", () => {
    st = { area: "", time: "", skips: [], kinds: STARTER.map(([name, rules]) => { const p = KIND_PRESETS.find(x => x.name === name); return { id: uid(), name, ch: p.ch, color: p.color, rules: JSON.parse(JSON.stringify(rules)) }; }) };
    save(); go("rules");
    toast("よくある分け方を入れました。曜日をお住まいの地域に合わせてください。");
  });
  $("start-blank").addEventListener("click", () => { st = { area: "", time: "", skips: [], kinds: [] }; save(); go("rules"); });

  function go(v) {
    view = v; render();
    window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
  }
  $("tab-cal").addEventListener("click", () => go("cal"));
  $("tab-rules").addEventListener("click", () => go("rules"));
  $("to-cal").addEventListener("click", () => go("cal"));
  $("prev").addEventListener("click", () => { shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1); pickDay = null; renderCal(); });
  $("next").addEventListener("click", () => { shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1); pickDay = null; renderCal(); });

  // ---- 書き出し・読みこみ ----
  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(Object.assign({ app: "gomi", version: 1, exported: new Date().toISOString() }, st), null, 1)], { type: "application/json" });
    const a = el("a"); a.href = URL.createObjectURL(blob); a.download = `gomi-${ymd(new Date())}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("ファイルに書き出しました。新しい端末で「ファイルを読み込む」から開いてください。");
  });
  $("import").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; $("move-err").textContent = "";
    if (!f) return;
    try {
      if (f.size > 2e6) throw 0;
      const raw = JSON.parse(await f.text());
      if (raw.app && raw.app !== "gomi") throw 0;
      const v = valid(raw); if (!v) throw 0;
      const snap = snapshot(); st = v; save(); render();
      toast(`${v.kinds.length}種類の設定を読み込みました。`, snap);
    } catch (x) { $("move-err").textContent = "読み込めませんでした。このアプリで書き出したファイル（.json）を選んでください。"; }
  });

  // ---- トースト ----
  let tT = null, undoSnap = null;
  function toast(msg, snap) {
    $("toast-t").textContent = msg; undoSnap = snap || null;
    $("toast-undo").hidden = !snap; $("toast").classList.add("on");
    clearTimeout(tT); tT = setTimeout(() => { $("toast").classList.remove("on"); undoSnap = null; }, snap ? 6000 : 4000);
  }
  $("toast-undo").addEventListener("click", () => {
    if (!undoSnap) return; st = JSON.parse(undoSnap); undoSnap = null; save(); render();
    $("toast").classList.remove("on"); setTimeout(() => toast("元に戻しました。"), 50);
  });

  render();
  let lastDay = ymd(new Date());
  setInterval(() => { const d = ymd(new Date()); if (d !== lastDay) { lastDay = d; if (view === "cal" && st) renderCal(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && st && view === "cal") renderCal(); });
})();
