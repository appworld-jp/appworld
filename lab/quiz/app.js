// クイズ横丁 — 1日1問（同じ日付なら誰でも同じ問題と選択肢の並び）。サーバーなし。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const Q = window.QUESTIONS || [];
  const KEY = "lab-quiz-v1", LIMIT = 30;
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date(), today = ymd(now);
  const EPOCH = Date.UTC(2026, 0, 1);
  const dayNo = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - EPOCH) / 864e5) + 1;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // a fixed order of all questions; day N takes the N-th one, so nothing repeats for Q.length days
  const order = shuffle(Q.map((_, i) => i), rng(20260101));
  const dailyIdx = order[((dayNo - 1) % Q.length + Q.length) % Q.length];

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || typeof st !== "object") st = {};
  st.hist = st.hist && typeof st.hist === "object" ? st.hist : {}; // date -> {ok, sec}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  let cur = null, daily = true, t0 = 0, raf = 0, timer = 0, answered = false;
  const LETTERS = ["A", "B", "C", "D"];

  function ask(idx, isDaily) {
    daily = isDaily; answered = false;
    const q = Q[idx]; const r = isDaily ? rng(dayNo * 7919) : Math.random;
    cur = { q, idx, opts: shuffle(q[1].slice(), r) };
    $("intro").hidden = true; $("result").hidden = true; $("play").hidden = false;
    $("kind").textContent = isDaily ? `今日の1問　第${dayNo}回` : "練習問題";
    $("q").textContent = q[0];
    const box = $("choices"); box.replaceChildren();
    cur.opts.forEach((o, i) => {
      const b = el("button", "ch c" + i); b.type = "button";
      b.append(el("span", "lt", LETTERS[i]), el("span", "ct", o));
      b.addEventListener("click", () => answer(o, b));
      box.append(b);
    });
    t0 = performance.now(); tick();
    timer = setTimeout(() => answer(null, null), LIMIT * 1000);
    $("q").focus({ preventScroll: true });
  }
  function tick() {
    const s = (performance.now() - t0) / 1000;
    $("sec").textContent = Math.min(LIMIT, s).toFixed(1);
    $("ring").style.strokeDashoffset = String(276.5 * Math.min(1, s / LIMIT));
    $("ring").classList.toggle("hurry", s > LIMIT - 10);
    raf = requestAnimationFrame(tick);
  }
  function answer(o, btn) {
    if (answered) return; answered = true;
    cancelAnimationFrame(raf); clearTimeout(timer);
    const sec = Math.min(LIMIT, Math.round((performance.now() - t0) / 100) / 10);
    const ok = o === cur.q[1][0];
    $("choices").querySelectorAll("button").forEach(b => { b.disabled = true; if (b.querySelector(".ct").textContent === cur.q[1][0]) b.classList.add("right"); });
    if (btn && !ok) btn.classList.add("wrong");
    if (daily && !st.hist[today]) {
      st.hist[today] = { ok, sec, pick: o, timeout: o === null };
      save();
    }
    setTimeout(() => showResult({ ok, sec, timeout: o === null }), 650);
  }

  function showResult(res) {
    $("play").hidden = false; $("result").hidden = false;
    $("verdict").textContent = res.timeout ? "時間切れ！" : res.ok ? "正解！" : "残念！";
    $("verdict").className = "verdict " + (res.ok ? "is-ok" : "is-ng");
    $("answer").textContent = `答え：${cur.q[1][0]}　${res.timeout ? "" : `（${res.sec.toFixed(1)}秒）`}`;
    $("explain").textContent = cur.q[2];
    $("shareBox").hidden = !daily;
    if (daily) $("shareT").textContent = shareText(res);
    $("copied").textContent = "";
    $("tmr").textContent = daily ? "次の問題は、明日の0時に出ます。" : "";
    $("practice").textContent = daily ? "練習問題を解く" : "次の練習問題";
    renderBoard();
    $("result").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  function shareText(res) {
    const blocks = res.ok ? speedBlocks(res.sec) : "⬛⬛⬛⬛⬛";
    return `クイズ横丁 第${dayNo}回（${today.replace(/-/g, "/")}）\n${res.ok ? "⭕ 正解" : res.timeout ? "⏰ 時間切れ" : "❌ 不正解"}${res.timeout ? "" : `　${res.sec.toFixed(1)}秒`}\n${blocks}\n#クイズ横丁`;
  }
  // faster answers light up more blocks
  function speedBlocks(sec) { const n = sec <= 3 ? 5 : sec <= 6 ? 4 : sec <= 10 ? 3 : sec <= 20 ? 2 : 1; return "🟨".repeat(n) + "⬜".repeat(5 - n); }

  async function copy() {
    const t = $("shareT").textContent;
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); ok = true; } } catch (e) { ok = false; }
    if (!ok) {
      try {
        const ta = el("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.className = "offscreen";
        document.body.append(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
      } catch (e) { ok = false; }
    }
    $("copied").textContent = ok ? "コピーしました。友だちに送って、秒数を比べてみましょう。" : "コピーできませんでした。上の文字を長押しして選んでください。";
  }

  function renderBoard() {
    const days = Object.keys(st.hist).sort();
    const n = days.length, okN = days.filter(d => st.hist[d].ok).length;
    $("bPlay").textContent = `${n}日`;
    $("bRate").textContent = n ? `${Math.round(okN / n * 100)}%` : "-";
    // consecutive correct days ending today or yesterday
    let s = 0; const d = new Date();
    if (!st.hist[today]) d.setDate(d.getDate() - 1);
    for (;;) { const h = st.hist[ymd(d)]; if (h && h.ok) { s++; d.setDate(d.getDate() - 1); } else break; }
    $("bStreak").textContent = `${s}日`;
    const best = days.filter(k => st.hist[k].ok).map(k => st.hist[k].sec);
    $("bBest").textContent = best.length ? `${Math.min(...best).toFixed(1)}秒` : "-";
  }

  $("start").addEventListener("click", () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return ask(dailyIdx, true);
    const c = $("count"); $("start").hidden = true; c.hidden = false;
    let n = 3; const step = () => {
      if (!n) { c.hidden = true; $("start").hidden = false; return ask(dailyIdx, true); }
      c.textContent = String(n); c.classList.remove("beat"); void c.offsetWidth; c.classList.add("beat"); n--; setTimeout(step, 650);
    };
    step();
  });
  $("copy").addEventListener("click", copy);
  $("practice").addEventListener("click", () => {
    let i; do { i = Math.floor(Math.random() * Q.length); } while (i === dailyIdx && Q.length > 1);
    ask(i, false);
  });

  $("no").textContent = `第${dayNo}回　${now.getMonth() + 1}月${now.getDate()}日`;
  $("qn").textContent = Q.length;
  renderBoard();
  // already played today: show the result again (no replay)
  const h = st.hist[today];
  if (h) {
    const q = Q[dailyIdx];
    cur = { q, idx: dailyIdx, opts: shuffle(q[1].slice(), rng(dayNo * 7919)) };
    daily = true; answered = true;
    $("intro").hidden = true; $("play").hidden = false;
    $("kind").textContent = `今日の1問　第${dayNo}回`; $("q").textContent = q[0];
    const box = $("choices"); box.replaceChildren();
    cur.opts.forEach((o, i) => {
      const b = el("button", "ch c" + i); b.type = "button"; b.disabled = true;
      b.append(el("span", "lt", LETTERS[i]), el("span", "ct", o));
      if (o === q[1][0]) b.classList.add("right"); else if (o === h.pick) b.classList.add("wrong");
      box.append(b);
    });
    $("sec").textContent = h.sec.toFixed(1);
    $("ring").style.strokeDashoffset = String(276.5 * Math.min(1, h.sec / LIMIT));
    showResult(h);
  }
})();
