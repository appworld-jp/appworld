// おはなしタイマー — 3分を30秒×6場面に分ける。読み上げは端末の音声合成だけを使う。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const BASE = window.STORIES, A = window.AREAS, TOTAL = 180000, PART = 30000, C = 628.3;
  const NS = "http://www.w3.org/2000/svg";
  const KEY = "hamigaki.v2";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  // じぶんで つくる おはなし：なまえを いれると、6ばめんの おはなしに なる
  const FC = window.FreeChips, mine = FC.store("hamigaki.stories.custom", { limit: 8 });
  const myStory = n => ({ mine: n, title: `${n}と、ぴかぴかのほし`, parts: [
    `あるひ、${n}は、そらにひかるちいさなほしをみつけました。「どうしてそんなにぴかぴかなの？」`,
    `ほしはいいました。「まいにち、ていねいにみがいているからだよ。${n}もいっしょにやってみる？」`,
    `${n}はほしといっしょに、しゃか、しゃか、しゃか。1ぽんずつ、ていねいにみがきます。`,
    `すると、どこからかむしばきんがやってきました。「おくちのなかにすみたいなあ」`,
    `でも、${n}のはは、もうぴかぴか。むしばきんは「まぶしくてすめないよ」と、にげていきました。`,
    `ほしはにっこり。「${n}のはも、わたしとおなじくらいひかってるね」。おしまい。`
  ] });
  let S = BASE.concat(mine.all().map(myStory));
  let pick = new Date().getDate() % BASE.length;
  let timer = null, endAt = 0, remain = TOTAL, part = -1, paused = false, lock = null;
  let saved = { done: 0, speak: false, pick: null };
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v) saved = Object.assign(saved, v); } catch (e) {}
  if (Number.isInteger(saved.pick) && saved.pick >= 0 && saved.pick < BASE.length + mine.all().length) pick = saved.pick;
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  // ---- おはなしの本 ----
  const COVERS = [
    ["#9fd8ff", "M3 15c3-3 5-3 8 0s5 3 8 0M5 10c2-3 6-4 9-2"],
    ["#ffb3c6", "M4 7h16v11H4zM4 7l8 6 8-6"],
    ["#c9f2a6", "M6 8h12v10H6zM9 12h.01M15 12h.01M12 8V4M10 15h4"],
    ["#e9e0ff", "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4 4 0 0 1 17 18z"],
    ["#d6f3ff", "M3 19a9 9 0 0 1 18 0zM10 19v-4a2 2 0 0 1 4 0v4"],
    ["#ffe39a", "M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M12 9.5V5M14.5 12H19M12 14.5V19M9.5 12H5"]
  ];
  const MY_COVER = ["#ffd6a5", "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"];
  const adder = FC.adder({ label: "＋ じぶんでつくる", aria: "おはなしのしゅじんこうのなまえ", placeholder: "ねこのタマ", max: 10, ok: "つくる", btnClass: "book add",
    empty: "なまえをいれてから「つくる」をおしてね。",
    submit: v => {
      if (!mine.has(v)) mine.add(v);
      buildBooks();
      const i = S.findIndex(x => x.mine === v);
      if (i >= 0) { pick = i; saved.pick = i; store(); syncBooks(); preview(); const b = bookEls()[i]; b.scrollIntoView({ block: "nearest", inline: "nearest" }); b.focus({ preventScroll: true }); }
    } });
  $("books").after(adder.form);
  const bookEls = () => [...$("books").querySelectorAll(".book[role=radio]")];
  function buildBooks() {
    S = BASE.concat(mine.all().map(myStory));
    if (pick >= S.length) pick = 0;
    $("books").textContent = "";
    S.forEach((s, i) => {
      const cvr = s.mine ? MY_COVER : COVERS[i % COVERS.length];
      const b = document.createElement("button"); b.type = "button"; b.className = "book"; b.setAttribute("role", "radio");
      const cv = document.createElement("span"); cv.className = "cover"; cv.style.background = cvr[0];
      const sv = svgEl("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" });
      sv.append(svgEl("path", { d: cvr[1], fill: "none", stroke: "#23325a", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round" }));
      cv.append(sv);
      const t = document.createElement("span"); t.className = "name"; titleInto(t, s.title);
      b.append(cv, t);
      b.addEventListener("click", () => { pick = i; saved.pick = i; store(); syncBooks(); preview(); });
      if (!s.mine) { $("books").append(b); return; }
      const w = document.createElement("div"); w.className = "fc-item";
      const x = FC.remover(s.title, () => {
        const cur = S[pick]; mine.remove(s.mine); buildBooks();
        pick = Math.max(0, S.indexOf(S.find(y => y === cur || (cur.mine && y.mine === cur.mine)) || S[0]));
        saved.pick = pick; store(); syncBooks(); preview();
      });
      x.setAttribute("aria-label", `「${s.title}」をけす`);
      w.append(b, x); $("books").append(w);
    });
    $("books").append(adder.btn);
    syncBooks();
  }
  // 「くじらのクウと、ひかるかい」→ 読点のあとで改行する
  function titleInto(node, title) {
    node.textContent = "";
    const i = title.indexOf("、");
    const parts = i < 0 ? [title] : [title.slice(0, i + 1), title.slice(i + 1)];
    parts.forEach(x => { const e = document.createElement("span"); e.className = "ln"; e.textContent = x; node.append(e); });
  }
  function syncBooks() { bookEls().forEach((b, i) => { b.setAttribute("aria-checked", String(i === pick)); b.tabIndex = i === pick ? 0 : -1; }); }
  $("books").addEventListener("keydown", e => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d || timer) return;
    if (!e.target.closest || !e.target.closest(".book[role=radio]")) return;
    e.preventDefault(); pick = (pick + d + S.length) % S.length; saved.pick = pick; store(); syncBooks(); preview(); bookEls()[pick].focus();
  });

  // ---- 星（30秒ごと） ----
  for (let i = 0; i < 6; i++) {
    const li = document.createElement("li"), sv = svgEl("svg", { viewBox: "0 0 24 24" });
    sv.append(svgEl("path", { d: "M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" }));
    li.append(sv); $("stars").append(li);
  }
  function stars(p, finished) { [...$("stars").children].forEach((li, i) => { li.className = finished || i < p ? "done" : i === p ? "now" : ""; }); }

  // ---- 口の図 ----
  function drawMap(area) {
    const m = $("map"); m.textContent = "";
    const jaws = [{ k: "up", cx: 100, cy: 74, a0: Math.PI, a1: 2 * Math.PI }, { k: "down", cx: 100, cy: 100, a0: 0, a1: Math.PI }];
    jaws.forEach(j => {
      const g = svgEl("g", {}); if (area && area.jaw !== j.k) g.setAttribute("class", "off");
      const arc = r => { const x0 = j.cx + r * Math.cos(j.a0), y0 = j.cy + r * Math.sin(j.a0), x1 = j.cx + r * Math.cos(j.a1), y1 = j.cy + r * Math.sin(j.a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
      g.append(svgEl("path", { d: arc(46), fill: "none", stroke: "#ffd0dc", "stroke-width": "22", "stroke-linecap": "round" }));
      for (let i = 0; i < 7; i++) {
        const a = j.a0 + (j.a1 - j.a0) * (i + .5) / 7;
        g.append(svgEl("circle", { class: "t" + (area && area.jaw === j.k && area.side === "top" ? " hot" : ""), cx: (j.cx + 46 * Math.cos(a)).toFixed(1), cy: (j.cy + 46 * Math.sin(a)).toFixed(1), r: 7.5 }));
      }
      if (area && area.jaw === j.k && area.side !== "top") g.append(svgEl("path", { class: "arc", d: arc(area.side === "out" ? 62 : 30) }));
      m.append(g);
    });
  }

  // ---- 読み上げ ----
  const canSpeak = "speechSynthesis" in window;
  if (!canSpeak) $("speak-wrap").hidden = true;
  $("speak").checked = canSpeak && !!saved.speak;
  $("speak").addEventListener("change", () => { saved.speak = $("speak").checked; store(); if (!$("speak").checked && canSpeak) speechSynthesis.cancel(); });
  function say(text) {
    if (!canSpeak || !$("speak").checked) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.rate = 0.9; u.pitch = 1.1;
    speechSynthesis.speak(u);
  }

  // ---- タイマー ----
  const fmt = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function show(p) {
    const st = S[pick], a = A[p];
    where(a.say.split("、")[1], a.say.split("、")[0], "をみがこう！");
    $("part-label").textContent = `ばめん${p + 1}／6`;
    titleInto($("title"), st.title);
    $("text").textContent = st.parts[p];
    drawMap(a); stars(p);
    say(`${a.say}を、みがこう。${st.parts[p]}`);
  }
  function where(big, pre, post) {
    const w = $("where"); w.textContent = "";
    [[pre, "span"], [big, "b"], [post, "span"]].forEach(([t, tag]) => { if (!t) return; const e = document.createElement(tag); e.textContent = t; w.append(e); });
  }
  function tick() {
    remain = Math.max(0, endAt - Date.now());
    $("time").textContent = fmt(remain);
    $("arc").style.strokeDashoffset = String(C * (1 - remain / TOTAL));
    const p = Math.min(5, Math.floor((TOTAL - remain) / PART));
    if (p !== part) { part = p; show(p); }
    if (remain <= 0) finish();
  }
  function setMode(m) {
    document.body.classList.toggle("running", m === "run");
    document.body.classList.toggle("done-state", m === "done");
    document.body.classList.toggle("idle", m === "idle");
    $("start").hidden = m === "run" || m === "pause";
    $("pause").hidden = !(m === "run" || m === "pause");
    $("stop").hidden = !(m === "run" || m === "pause");
    $("books").querySelectorAll("button").forEach(b => { b.disabled = m === "run" || m === "pause"; });
  }
  async function wake(on) {
    try {
      if (on && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      else if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  }
  function start() {
    remain = TOTAL; part = -1; paused = false; endAt = Date.now() + remain;
    $("pause").querySelector("span").textContent = "ちょっとまって";
    setMode("run"); tick(); timer = setInterval(tick, 250); wake(true);
    $("pause").focus();
  }
  function togglePause() {
    if (!paused) {
      clearInterval(timer); timer = null; remain = Math.max(0, endAt - Date.now()); paused = true;
      if (canSpeak) speechSynthesis.cancel();
      $("pause").querySelector("span").textContent = "つづける"; setMode("pause");
      where("ひとやすみ", "", "「つづける」をおしてね");
    } else {
      paused = false; endAt = Date.now() + remain; part = -1;
      $("pause").querySelector("span").textContent = "ちょっとまって"; setMode("run");
      tick(); timer = setInterval(tick, 250);
    }
  }
  function stop() {
    clearInterval(timer); timer = null; paused = false; wake(false);
    if (canSpeak) speechSynthesis.cancel();
    reset(); $("start").focus();
  }
  function finish() {
    clearInterval(timer); timer = null; wake(false);
    saved.done = (saved.done || 0) + 1; store();
    setMode("done"); stars(6, true); drawMap(null);
    $("time").textContent = "0:00";
    $("arc").style.strokeDashoffset = "0";
    where("ぴかぴか！", "", "よくがんばったね");
    $("part-label").textContent = "おしまい";
    count();
    $("start").querySelector("span").textContent = "もういちど";
    say("ぴかぴか。よくがんばったね。");
    $("start").focus();
  }
  function count() { $("count").textContent = saved.done ? `これまでに${saved.done}かい、ぴかぴかにしたよ！` : ""; }
  function preview() {
    if (timer || paused) return;
    $("part-label").textContent = "きょうのおはなし";
    titleInto($("title"), S[pick].title);
    $("text").textContent = "「はじめる」をおすと、おはなしがはじまるよ。30びょうごとに、つぎのばめんにすすむよ。";
  }
  function reset() {
    setMode("idle"); remain = TOTAL;
    $("time").textContent = fmt(TOTAL); $("arc").style.strokeDashoffset = "0";
    where("よーい", "", "「はじめる」をおしてね");
    $("start").querySelector("span").textContent = "はじめる";
    stars(-1); drawMap(null); preview();
  }

  $("start").addEventListener("click", start);
  $("pause").addEventListener("click", togglePause);
  $("stop").addEventListener("click", stop);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && timer) { tick(); wake(true); } });

  buildBooks(); reset(); count();
  { const b = $("books"), c = bookEls()[pick]; if (c) b.scrollLeft = c.offsetLeft - b.offsetLeft - 16; }
})();
