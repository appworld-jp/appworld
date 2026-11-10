(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "gymmemo.v1";
  const PRESETS = ["ベンチプレス", "スクワット", "デッドリフト", "ショルダープレス", "ラットプルダウン", "ベントオーバーロウ", "レッグプレス", "ダンベルカール", "トライセプスエクステンション", "懸垂", "腕立て伏せ", "ディップス"];
  const BODY = new Set(["懸垂", "腕立て伏せ", "ディップス"]);
  const RESTS = [60, 90, 120, 180];
  const STEPS = [2.5, 5, 1, 0.5];

  const pad = n => String(n).padStart(2, "0");
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const dayLabel = k => { const [y, m, d] = k.split("-").map(Number); return `${m}月${d}日（${"日月火水木金土"[new Date(y, m - 1, d).getDay()]}）`; };
  const num = v => String(Math.round(v * 100) / 100);
  const setText = s => (s.w > 0 ? `${num(s.w)}kg × ${s.r}回` : `自重 × ${s.r}回`);
  const short = s => (s.w > 0 ? `${num(s.w)}×${s.r}` : `自重×${s.r}`);

  function defaults() { return { sets: [], custom: [], rest: 90, step: 2.5, sound: true, ex: PRESETS[0] }; }
  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && Array.isArray(o.sets)) return Object.assign(defaults(), o); } catch (e) { /* ignore */ }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }
  const S = load();
  const cur = { w: 20, r: 10 };

  const exercises = () => PRESETS.concat(S.custom.filter(c => !PRESETS.includes(c)));
  const setsOf = ex => S.sets.filter(s => s.ex === ex).sort((a, b) => a.t - b.t);
  function sessions(ex) {
    const m = new Map();
    for (const s of setsOf(ex)) { const k = dayKey(s.t); if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }
  const better = (a, b) => !b || a.w > b.w || (a.w === b.w && a.r > b.r);
  function best(list) { let b = null; for (const s of list) if (better(s, b)) b = s; return b; }

  // ---------- record view ----------
  function renderChips() {
    const box = $("chips"); box.textContent = "";
    for (const ex of exercises()) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = ex;
      b.setAttribute("aria-pressed", String(ex === S.ex));
      b.addEventListener("click", () => selectEx(ex));
      box.appendChild(b);
    }
    const add = document.createElement("button");
    add.type = "button"; add.className = "chip add"; add.textContent = "＋ 種目を追加";
    add.setAttribute("aria-expanded", String(!$("addForm").hidden));
    add.addEventListener("click", () => { const f = $("addForm"); f.hidden = !f.hidden; add.setAttribute("aria-expanded", String(!f.hidden)); if (!f.hidden) $("addName").focus(); });
    box.appendChild(add);
    const on = box.querySelector("[aria-pressed=true]");
    if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function selectEx(ex) { S.ex = ex; save(); prefill(); renderChips(); renderLog(); }

  function todayAndPrev() {
    const ses = sessions(S.ex), today = dayKey(Date.now());
    const todays = ses.length && ses[0][0] === today ? ses[0][1] : [];
    const prev = ses.find(([k]) => k !== today) || null;
    return { todays, prev };
  }

  // Use the matching set from the previous session; otherwise repeat the latest set.
  function prefill() {
    const { todays, prev } = todayAndPrev(), n = todays.length;
    const src = (prev && prev[1][n]) || todays[n - 1] || (prev && prev[1][prev[1].length - 1]) || null;
    if (src) { cur.w = src.w; cur.r = src.r; } else { cur.w = BODY.has(S.ex) ? 0 : 20; cur.r = 10; }
  }

  function renderLog() {
    $("exName").textContent = S.ex;
    const { todays, prev } = todayAndPrev();
    const p = $("prev"); p.textContent = "";
    if (prev) {
      const b = document.createElement("b"); b.textContent = "前回 " + dayLabel(prev[0]);
      const s = document.createElement("span"); s.className = "sets"; s.textContent = prev[1].map(short).join("　");
      p.append(b, s);
      const bst = best(setsOf(S.ex));
      if (bst) { const e = document.createElement("span"); e.textContent = "ベスト " + setText(bst); p.append(e); }
    } else if (todays.length) {
      p.textContent = "今日が初めての記録です。次回は、今日のセットがここに出ます。";
    } else {
      p.textContent = "はじめての種目です。重さと回数を合わせて記録すると、次回はその数字が最初から入ります。";
    }
    const list = $("today"); list.textContent = "";
    let running = null;
    const before = S.sets.filter(s => s.ex === S.ex && dayKey(s.t) !== dayKey(Date.now()));
    running = best(before);
    todays.forEach((s, i) => {
      const li = document.createElement("li");
      const n = document.createElement("span"); n.className = "n"; n.textContent = i + 1;
      const v = document.createElement("span"); v.className = "v"; v.textContent = setText(s);
      if (before.length && better(s, running)) { const pb = document.createElement("span"); pb.className = "pb"; pb.textContent = "ベスト更新"; v.appendChild(pb); }
      if (better(s, running)) running = s;
      const del = document.createElement("button"); del.type = "button"; del.textContent = "取り消す";
      del.setAttribute("aria-label", `${i + 1}セット目（${setText(s)}）を取り消す`);
      del.addEventListener("click", () => {
        const at = S.sets.indexOf(s);
        S.sets = S.sets.filter(x => x.id !== s.id); save(); prefill(); renderLog();
        toast(`${i + 1}セット目を取り消しました`, () => { S.sets.splice(at, 0, s); save(); prefill(); renderLog(); toast("元に戻しました"); });
      });
      if (s.id === fresh) li.className = "fresh";
      li.append(n, v, del); list.appendChild(li);
    });
    fresh = null;
    $("lead").hidden = S.sets.length > 0;
    $("todayEmpty").hidden = todays.length > 0;
    renderNums();
  }

  function renderNums() {
    if (document.activeElement !== $("wIn")) $("wIn").value = num(cur.w);
    if (document.activeElement !== $("rIn")) $("rIn").value = cur.r;
    $("stepBtn").textContent = `刻み ${num(S.step)}kg・変更`;
    $("wHint").textContent = cur.w === 0 ? "0kgは自重として記録します。" : "";
    $("goSub").textContent = setText(cur);
  }

  const clampW = v => Math.min(999, Math.max(0, Math.round(v * 100) / 100));
  const clampR = v => Math.min(999, Math.max(1, Math.round(v)));
  $("wMinus").addEventListener("click", () => { cur.w = clampW(cur.w - S.step); renderNums(); });
  $("wPlus").addEventListener("click", () => { cur.w = clampW(cur.w + S.step); renderNums(); });
  $("rMinus").addEventListener("click", () => { cur.r = clampR(cur.r - 1); renderNums(); });
  $("rPlus").addEventListener("click", () => { cur.r = clampR(cur.r + 1); renderNums(); });
  $("wIn").addEventListener("input", () => { const v = parseFloat($("wIn").value); if (isFinite(v)) { cur.w = clampW(v); $("goSub").textContent = setText(cur); } });
  $("rIn").addEventListener("input", () => { const v = parseInt($("rIn").value, 10); if (isFinite(v)) { cur.r = clampR(v); $("goSub").textContent = setText(cur); } });
  ["wIn", "rIn"].forEach(id => $(id).addEventListener("blur", renderNums));
  $("stepBtn").addEventListener("click", () => { S.step = STEPS[(STEPS.indexOf(S.step) + 1) % STEPS.length]; save(); renderNums(); });

  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("addName").value.trim().replace(/\s+/g, " ").slice(0, 20);
    if (!name) { $("addName").focus(); return; }
    if (!exercises().includes(name)) S.custom.push(name);
    $("addName").value = ""; $("addForm").hidden = true;
    selectEx(name);
    toast(`「${name}」を追加しました`);
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
    const before = best(setsOf(S.ex));
    const s = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ex: S.ex, w: cur.w, r: cur.r, t: Date.now() };
    S.sets.push(s); save(); fresh = s.id;
    const pb = before && better(s, before);
    toast(pb ? `自己ベスト更新！${setText(s)}` : `記録しました：${setText(s)}`);
    const go = $("record"); go.classList.remove("hit", "pb"); void go.offsetWidth; go.classList.add(pb ? "pb" : "hit");
    prefill(); renderLog(); startRest();
  });

  // ---------- rest timer ----------
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
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]); } catch (e) { /* not supported */ }
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
    } catch (e) { /* audio unavailable */ }
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
      $("rest").classList.add("done"); $("restLbl").textContent = "休憩終わり。次のセットへ";
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
    for (const r of RESTS) {
      const b = document.createElement("button"); b.type = "button";
      b.textContent = r < 120 ? `${r}秒` : `${r / 60}分`;
      b.setAttribute("aria-pressed", String(S.rest === r));
      b.addEventListener("click", () => { S.rest = r; save(); renderSettings(); });
      seg.appendChild(b);
    }
    $("sound").checked = !!S.sound;
  }
  $("sound").addEventListener("change", () => { S.sound = $("sound").checked; save(); if (S.sound) audioInit(); });

  // ---------- history ----------
  function renderHist() {
    const box = $("hist"); box.textContent = "";
    const used = exercises().filter(ex => S.sets.some(s => s.ex === ex))
      .map(ex => ({ ex, last: Math.max(...setsOf(ex).map(s => s.t)) })).sort((a, b) => b.last - a.last);
    for (const { ex } of used) {
      const all = setsOf(ex), bst = best(all), ses = sessions(ex);
      const d = document.createElement("details"); d.className = "ex";
      const sm = document.createElement("summary");
      const t = document.createElement("span"); t.className = "t"; t.textContent = ex;
      const b = document.createElement("span"); b.className = "best"; b.textContent = "ベスト " + setText(bst);
      const m = document.createElement("span"); m.className = "meta";
      m.textContent = `${ses.length}日分の記録・最後は${dayLabel(ses[0][0])}` + (bst.w > 0 ? `・ベストは${dayLabel(dayKey(bst.t))}` : "");
      sm.append(t, b, m); d.appendChild(sm);
      const ul = document.createElement("ul");
      for (const [k, list] of ses.slice(0, 30)) {
        const li = document.createElement("li");
        const dd = document.createElement("span"); dd.className = "d";
        const a = document.createElement("span"); a.textContent = dayLabel(k);
        const vol = list.reduce((x, s) => x + s.w * s.r, 0);
        const v = document.createElement("span"); v.textContent = vol > 0 ? `${list.length}セット・合計${num(vol)}kg` : `${list.length}セット・計${list.reduce((x, s) => x + s.r, 0)}回`;
        dd.append(a, v);
        const ss = document.createElement("span"); ss.className = "s"; ss.textContent = list.map(short).join("　");
        li.append(dd, ss); ul.appendChild(li);
      }
      d.appendChild(ul); box.appendChild(d);
    }
    $("histEmpty").hidden = used.length > 0;
    $("wipe").hidden = used.length === 0;
  }
  $("wipe").addEventListener("click", () => {
    if (!confirm("すべての記録を消しますか？元に戻せません。")) return;
    S.sets = []; save(); renderHist(); prefill(); renderLog();
  });

  function show(view) {
    const log = view === "log";
    $("viewLog").hidden = !log; $("viewHist").hidden = log;
    $("tabLog").setAttribute("aria-pressed", String(log)); $("tabHist").setAttribute("aria-pressed", String(!log));
    document.querySelector(".app").classList.toggle("hist", !log);
    if (!log) renderHist(); else renderLog();
  }
  $("tabLog").addEventListener("click", () => show("log"));
  $("tabHist").addEventListener("click", () => show("hist"));

  if (!exercises().includes(S.ex)) S.ex = PRESETS[0];
  prefill(); renderChips(); renderLog(); renderSettings();
})();
