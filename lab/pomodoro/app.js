// ポモドーロ箱 — kitchen-timer style focus timer. Everything is stored in localStorage on this device only.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "pomobox.v2";
  const SHORT = 5, LONG = 15, LONG_EVERY = 4;
  const NS = "http://www.w3.org/2000/svg";

  const pad = n => String(n).padStart(2, "0");
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`;

  // ---- state ----
  let st = { len: 25, log: [], run: null, streak: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      if (Number.isInteger(raw.len) && raw.len >= 1 && raw.len <= 180) st.len = raw.len;
      if (Array.isArray(raw.log)) st.log = raw.log.filter(e => e && typeof e.s === "number" && typeof e.m === "number").slice(-2000);
      if (raw.run && typeof raw.run === "object") st.run = raw.run;
      if (typeof raw.streak === "number") st.streak = raw.streak;
    }
  } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  let pendingId = null;   // log entry waiting for its note

  // ---- chime (WebAudio, no files) ----
  let ac = null;
  function audio() {
    try {
      if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
      if (ac && ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }
  function bell(t0, freq, vol) {
    const a = ac, out = a.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    out.connect(a.destination);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([mul, g]) => {
      const o = a.createOscillator(), og = a.createGain();
      o.type = "sine"; o.frequency.value = freq * mul; og.gain.value = g;
      o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 1.9);
    });
  }
  function chime(kind) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + 0.05;
    if (kind === "focus") { bell(t, 1046.5, 0.25); bell(t + 0.32, 1318.5, 0.25); bell(t + 0.64, 1568, 0.28); }
    else { bell(t, 784, 0.25); bell(t + 0.45, 784, 0.22); }
  }

  // ---- dial ----
  (function drawTicks() {
    const g = $("ticks");
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, major = i % 5 === 0;
      const r1 = 98, r2 = major ? 84 : 91;
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", 110 + r1 * Math.sin(a)); l.setAttribute("y1", 110 - r1 * Math.cos(a));
      l.setAttribute("x2", 110 + r2 * Math.sin(a)); l.setAttribute("y2", 110 - r2 * Math.cos(a));
      l.setAttribute("class", major ? "tick major" : "tick"); g.append(l);
      if (major) {
        const tx = document.createElementNS(NS, "text");
        tx.setAttribute("x", 110 + 74 * Math.sin(a)); tx.setAttribute("y", 110 - 74 * Math.cos(a));
        tx.textContent = String(i); g.append(tx);
      }
    }
  })();
  function wedge(minutesLeft) {
    const frac = Math.max(0, Math.min(60, minutesLeft)) / 60, r = 66;
    if (frac <= 0) return "";
    if (frac >= 0.9999) return `M110 ${110 - r}A${r} ${r} 0 1 1 109.99 ${110 - r}Z`;
    const a = frac * Math.PI * 2, x = 110 + r * Math.sin(a), y = 110 - r * Math.cos(a);
    return `M110 110L110 ${110 - r}A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
  }

  // ---- timer ----
  const modeName = m => m === "focus" ? "集中" : m === "short" ? "小休憩" : "長休憩";
  const remaining = () => {
    if (!st.run) return st.len * 60000;
    return st.run.paused != null ? st.run.paused : Math.max(0, st.run.end - Date.now());
  };
  function draw() {
    const run = st.run, ms = remaining(), sec = Math.ceil(ms / 1000);
    const mode = run ? run.mode : "focus";
    $("clock").textContent = `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
    $("mode").textContent = modeName(mode);
    const w = $("wedge"); w.setAttribute("d", wedge(ms / 60000)); w.classList.toggle("rest", mode !== "focus");
    $("knob").style.transform = `rotate(${(ms / 60000 / 60) * 360}deg)`;
    const done = st.streak % LONG_EVERY;
    $("cycle").textContent = "●".repeat(done) + "○".repeat(LONG_EVERY - done);
    $("cycle").setAttribute("aria-label", `長休憩まであと${LONG_EVERY - done}回`);
    const go = $("start");
    const ticking = run && run.paused == null;
    go.textContent = !run ? "スタート" : ticking ? "一時停止" : "再開";
    go.classList.toggle("running", !!ticking);
    document.querySelectorAll(".len").forEach(b => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.min) === st.len));
      b.disabled = !!run;
    });
    document.querySelectorAll(".lens .own-x, .lens .own-add").forEach(b => { b.disabled = !!run; });
    document.title = ticking ? `${$("clock").textContent} ${modeName(mode)}｜ポモドーロ箱` : "ポモドーロ箱";
  }
  const say = t => { $("status").textContent = t; };
  const idleMsg = () => `スタートを押すと、${st.len}分の集中が始まります。`;
  // a little shake of the whole box when the bell rings
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  function ring() {
    const b = $("box"); if (calm.matches) return;
    b.classList.remove("ring"); void b.offsetWidth; b.classList.add("ring");
  }

  function begin(mode, minutes) {
    audio();
    st.run = { mode, min: minutes, start: Date.now(), end: Date.now() + minutes * 60000, paused: null };
    save(); draw();
    say(mode === "focus" ? `${minutes}分の集中を始めました。終わるとベルが鳴ります。` : `${minutes}分の休憩です。立って体を伸ばすのがおすすめです。`);
  }
  function finish() {
    const run = st.run; if (!run) return;
    st.run = null;
    if (run.mode === "focus") {
      const entry = { id: run.start, s: run.start, e: run.end, m: run.min, note: "" };
      st.log.push(entry); st.streak++; pendingId = entry.id;
      save(); chime("focus"); ring(); draw(); renderLog();
      say(`${run.min}分の集中、お疲れさまでした。`);
      $("ask-h").textContent = `${run.min}分、お疲れさまでした`;
      $("ask").hidden = false; $("rest").hidden = true;
      $("what").value = ""; $("what").focus();
    } else {
      if (run.mode === "long") st.streak = 0;
      save(); chime("rest"); ring(); draw();
      say("休憩が終わりました。スタートで次の集中を始めます。");
      $("start").focus();
    }
  }
  function tick() { if (st.run && st.run.paused == null && Date.now() >= st.run.end) finish(); else draw(); }
  setInterval(tick, 250);
  document.addEventListener("visibilitychange", tick);

  $("start").addEventListener("click", () => {
    const run = st.run;
    if (!run) { $("rest").hidden = true; $("ask").hidden = true; begin("focus", st.len); return; }
    if (run.paused == null) { run.paused = Math.max(0, run.end - Date.now()); say("止めています。再開で続きから計ります。"); }
    else { run.end = Date.now() + run.paused; run.paused = null; audio(); say("続きから計っています。"); }
    save(); draw();
  });
  $("reset").addEventListener("click", () => {
    if (!st.run) { say(idleMsg()); return; }
    if (st.run.mode === "focus" && !confirm("この回の集中をやめますか？ 記録には残りません。")) return;
    st.run = null; save(); draw(); say("リセットしました。この回は記録していません。");
  });
  document.querySelectorAll(".len").forEach(b => b.addEventListener("click", () => {
    if (st.run) return;
    st.len = Number(b.dataset.min); save(); draw(); say(idleMsg());
  }));
  // 自分で決めた長さ（1〜180分）。この端末に覚えて、次から候補に並べる
  const pickLen = v => { if (st.run) return; st.len = Number(v); save(); draw(); say(idleMsg()); };
  window.OwnChoices({
    key: KEY + ".custom", name: "len", host: document.querySelector(".lens"), max: 3, inputMode: "numeric",
    builtins: [15, 25, 50].map(n => ({ value: String(n), label: `${n}分` })),
    addClass: "key", addLabel: "＋ 自分で", okLabel: "決定", placeholder: "40", inputLabel: "集中する長さ（分）",
    label: v => `${v}分`, emptyMsg: "分数を入れてから「決定」を押してください。",
    parse: t => {
      const n = Number(t.normalize("NFKC").replace(/分$/, ""));
      return Number.isInteger(n) && n >= 1 && n <= 180 ? { value: String(n) } : { error: "1〜180の数字で入れてください。" };
    },
    extra: () => [String(st.len)],
    chip: v => {
      const b = document.createElement("button"); b.type = "button"; b.className = "key len"; b.dataset.min = v;
      b.setAttribute("aria-pressed", String(Number(v) === st.len)); b.disabled = !!st.run;
      b.append(v, Object.assign(document.createElement("small"), { textContent: "分" }));
      b.addEventListener("click", () => pickLen(v));
      return b;
    },
    onPick: pickLen
  });

  // note after focus
  function showRest() {
    $("ask").hidden = true; $("rest").hidden = false;
    const longNext = st.streak > 0 && st.streak % LONG_EVERY === 0;
    $("short").classList.toggle("rec", !longNext); $("long").classList.toggle("rec", longNext);
    $("rest-hint").textContent = longNext ? `${LONG_EVERY}回続きました。今回は長めの休憩がおすすめです。` : `あと${LONG_EVERY - (st.streak % LONG_EVERY)}回集中すると、長休憩です。`;
    (longNext ? $("long") : $("short")).focus();
  }
  $("ask").addEventListener("submit", ev => {
    ev.preventDefault();
    const e = st.log.find(x => x.id === pendingId);
    if (e) e.note = $("what").value.trim().slice(0, 60);
    pendingId = null; save(); renderLog(); showRest();
  });
  $("skip-note").addEventListener("click", () => { pendingId = null; showRest(); });
  $("short").addEventListener("click", () => { $("rest").hidden = true; begin("short", SHORT); });
  $("long").addEventListener("click", () => { $("rest").hidden = true; begin("long", LONG); });
  $("norest").addEventListener("click", () => { $("rest").hidden = true; say("スタートで、次の集中を始めます。"); $("start").focus(); });

  // press feedback for keyboard users
  document.querySelectorAll(".key").forEach(k => {
    k.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") k.classList.add("pressed"); });
    k.addEventListener("keyup", () => k.classList.remove("pressed"));
    k.addEventListener("blur", () => k.classList.remove("pressed"));
  });

  // ---- log ----
  const todays = () => { const k = dayKey(Date.now()); return st.log.filter(e => dayKey(e.s) === k); };
  function renderLog() {
    const items = todays(), ol = $("log");
    ol.replaceChildren();
    items.forEach(e => {
      const li = document.createElement("li");
      const t = document.createElement("time"); t.textContent = `${hm(e.s)}〜${hm(e.e)}`;
      const n = document.createElement("span"); n.className = "note" + (e.note ? "" : " none");
      const m = document.createElement("span"); m.className = "mins"; m.textContent = `${e.m}分`;
      n.append(m, document.createTextNode(e.note || "（メモなし）"));
      const d = document.createElement("button"); d.type = "button"; d.className = "del"; d.textContent = "×";
      d.setAttribute("aria-label", `${hm(e.s)}の記録を消す`);
      d.addEventListener("click", () => {
        if (!confirm("この記録を消しますか？")) return;
        st.log = st.log.filter(x => x !== e); save(); renderLog();
      });
      li.append(t, n, d); ol.append(li);
    });
    const total = items.reduce((a, e) => a + e.m, 0);
    $("empty").hidden = items.length > 0;
    $("sum").textContent = items.length ? `${items.length}回・${fmtMin(total)}` : "";
    $("paper-foot").hidden = !items.length;
    renderWeek();
  }
  function renderWeek() {
    const now = new Date(), wd = (now.getDay() + 6) % 7; // 0 = Monday
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - wd);
    const labels = ["月", "火", "水", "木", "金", "土", "日"], days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i), k = dayKey(d);
      days.push({ lb: labels[i], k, min: st.log.filter(e => dayKey(e.s) === k).reduce((a, e) => a + e.m, 0), today: i === wd });
    }
    const max = Math.max(60, ...days.map(d => d.min)), box = $("week");
    box.replaceChildren();
    days.forEach(d => {
      const c = document.createElement("div"); c.className = "day" + (d.today ? " today" : "");
      const v = document.createElement("span"); v.className = "v"; v.textContent = d.min ? `${d.min}分` : "";
      const col = document.createElement("span"); col.className = "col" + (d.min ? "" : " zero");
      col.style.height = d.min ? `${Math.max(6, (d.min / max) * 76)}%` : "3px";
      const lb = document.createElement("span"); lb.className = "lb"; lb.textContent = d.lb;
      c.append(v, col, lb); box.append(c);
    });
    const total = days.reduce((a, d) => a + d.min, 0);
    $("wsum").textContent = total ? `合計${fmtMin(total)}` : "まだありません";
    box.classList.toggle("nil", !total);
    box.setAttribute("aria-label", "今週の集中時間：" + days.map(d => `${d.lb}曜${d.min}分`).join("、"));
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
      ta.className = "offscreen"; document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  }
  $("copy").addEventListener("click", async () => {
    const items = todays(); if (!items.length) return;
    const d = new Date();
    const total = items.reduce((a, e) => a + e.m, 0);
    const lines = [`${d.getMonth() + 1}月${d.getDate()}日の集中記録`]
      .concat(items.map(e => `${hm(e.s)}〜${hm(e.e)}（${e.m}分）${e.note || "（メモなし）"}`))
      .concat([`合計：${items.length}回・${fmtMin(total)}`]);
    const ok = await copyText(lines.join("\n"));
    $("copied").textContent = ok ? "コピーしました。" : "コピーできませんでした。もう一度押してください。";
    setTimeout(() => { $("copied").textContent = ""; }, 2500);
  });

  // resume after reload
  if (st.run && st.run.paused == null && Date.now() >= st.run.end) finish();
  else if (st.run) say(st.run.paused != null ? "止めています。再開で続きから計ります。" : `${modeName(st.run.mode)}の途中です。`);
  else say(idleMsg());
  draw(); renderLog();
})();
