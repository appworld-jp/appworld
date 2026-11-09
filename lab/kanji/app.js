// ひとこと漢字 — 今日の一問（同じ日付なら誰でも同じ問題）、練習、復習。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const W = window.WORDS || [];
  const KEY = "lab-kanji-v2";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = ymd(new Date());

  // date-seeded RNG: the daily word and its choice order are the same for everyone on that date
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  let st = load();
  st.hist = st.hist || {};      // date -> true/false (daily result)
  st.missed = Array.isArray(st.missed) ? st.missed : [];
  st.total = st.total || 0; st.ok = st.ok || 0;
  st.daily = st.daily || null;  // {date, pick}

  const dailyIndex = hash("kanji:" + today) % W.length;
  let mode = "daily", current = null, seenPractice = new Set();

  function choicesFor(w, r) {
    const others = W.filter(x => x !== w).map(x => x[1]).filter(x => x !== w[1] && x !== w[2]);
    const near = shuffle(others.slice(), r).sort((a, b) => Math.abs(a.length - w[1].length) - Math.abs(b.length - w[1].length)).slice(0, 6);
    const pick = shuffle(near, r).slice(0, 2);
    return shuffle([w[1], w[2], ...pick], r);
  }

  function renderWord(w) {
    const box = $("word"); box.replaceChildren();
    [...w[0]].forEach(ch => { const s = document.createElement("span"); s.textContent = ch; box.append(s); });
    box.setAttribute("aria-label", w[0]);
    box.classList.toggle("long", [...w[0]].length > 4);
  }

  function ask(w, r, pre) {
    current = w;
    $("empty").hidden = true;
    $("word").hidden = false; $("askText").hidden = false; $("choices").hidden = false;
    renderWord(w);
    const box = $("choices"); box.replaceChildren();
    choicesFor(w, r).forEach((reading, i) => {
      const b = document.createElement("button"); b.type = "button";
      const n = document.createElement("span"); n.className = "num"; n.textContent = "壱弐参四"[i];
      const t = document.createElement("span"); t.className = "rd"; t.textContent = reading;
      b.append(n, t); b.dataset.reading = reading;
      b.addEventListener("click", () => answer(b, reading));
      box.append(b);
    });
    $("answer").hidden = true;
    if (pre) { const b = [...box.children].find(x => x.dataset.reading === pre); if (b) answer(b, pre, true); }
  }

  function answer(btn, reading, replay) {
    const w = current, ok = reading === w[1];
    $("choices").querySelectorAll("button").forEach(b => {
      b.disabled = true;
      if (b.dataset.reading === w[1]) b.classList.add("ok");
    });
    if (!ok) btn.classList.add("ng");
    const stamp = $("stamp"); stamp.textContent = ok ? "正" : "誤"; stamp.className = "stamp " + (ok ? "is-ok" : "is-ng");
    $("result").textContent = ok ? "正解です。" : "残念、不正解です。";
    $("reading").textContent = `${w[0]}（${w[1]}）`;
    $("mean").textContent = w[3];
    $("trap").textContent = ok ? `「${w[2]}」と読み間違えやすい言葉です。` : (reading === w[2] ? `「${w[2]}」は、よくある読み間違いです。` : `「${w[2]}」と読み間違える人も多い言葉です。`);
    $("answer").hidden = false;
    $("next").textContent = mode === "daily" ? "練習を続ける" : "次の問題へ";

    if (!replay) {
      st.total++; if (ok) st.ok++;
      const i = st.missed.indexOf(w[0]);
      if (!ok && i < 0) st.missed.push(w[0]);
      if (ok && i >= 0 && mode === "review") st.missed.splice(i, 1);
      if (mode === "daily" && !(st.daily && st.daily.date === today)) {
        st.daily = { date: today, pick: reading };
        st.hist[today] = ok;
        const y = new Date(); y.setDate(y.getDate() - 1);
        st.days = st.last === ymd(y) ? (st.days || 0) + 1 : 1;
        st.last = today;
      }
      save(); renderStats();
      $("next").focus();
    }
  }

  function renderStats() {
    // streak resets visually if yesterday was skipped
    const y = new Date(); y.setDate(y.getDate() - 1);
    const alive = st.last === today || st.last === ymd(y);
    $("streakN").textContent = alive ? (st.days || 0) : 0;
    const week = $("week"); week.replaceChildren();
    for (let k = 6; k >= 0; k--) {
      const d = new Date(); d.setDate(d.getDate() - k);
      const li = document.createElement("li"); const v = st.hist[ymd(d)];
      li.className = v === true ? "ok" : v === false ? "ng" : "";
      if (k === 0) li.classList.add("today");
      week.append(li);
    }
    $("sTotal").textContent = st.total; $("sOk").textContent = st.ok; $("sMiss").textContent = st.missed.length;
    const b = $("missN"); b.hidden = !st.missed.length; b.textContent = st.missed.length;
    const ul = $("missList"); ul.replaceChildren();
    st.missed.slice(-12).reverse().forEach(t => {
      const w = W.find(x => x[0] === t); if (!w) return;
      const li = document.createElement("li");
      const a = document.createElement("b"); a.textContent = w[0];
      const r = document.createElement("span"); r.textContent = w[1];
      li.append(a, r); ul.append(li);
    });
  }

  function setMode(m) {
    mode = m;
    ["daily", "practice", "review"].forEach(k => {
      const t = $("tab-" + k); t.setAttribute("aria-selected", String(k === m)); t.tabIndex = k === m ? 0 : -1;
    });
    $("panel").setAttribute("aria-labelledby", "tab-" + m);
    $("kind").textContent = { daily: "今日の一問", practice: "練習", review: "復習" }[m];
    $("date").textContent = m === "daily" ? today.replace(/-/g, ".") : m === "review" ? `残り${st.missed.length}語` : "";
    if (m === "daily") ask(W[dailyIndex], rng(hash("choices:" + today)), st.daily && st.daily.date === today ? st.daily.pick : null);
    else if (m === "practice") nextPractice();
    else nextReview();
  }

  function nextPractice() {
    if (seenPractice.size >= W.length - 1) seenPractice.clear();
    let i; do { i = Math.floor(Math.random() * W.length); } while (seenPractice.has(i) || i === dailyIndex && W.length > 1);
    seenPractice.add(i); ask(W[i]);
  }
  function nextReview() {
    const list = st.missed.map(t => W.find(x => x[0] === t)).filter(Boolean);
    $("date").textContent = `残り${list.length}語`;
    if (!list.length) {
      $("word").hidden = true; $("askText").hidden = true; $("choices").hidden = true; $("answer").hidden = true;
      $("empty").hidden = false; return;
    }
    const others = list.filter(w => w !== current);
    ask((others.length ? others : list)[Math.floor(Math.random() * (others.length || list.length))]);
  }

  $("next").addEventListener("click", () => { if (mode === "daily") setMode("practice"); else if (mode === "practice") nextPractice(); else nextReview(); });
  $("goPractice").addEventListener("click", () => setMode("practice"));
  const tabs = ["daily", "practice", "review"];
  tabs.forEach((k, i) => {
    const t = $("tab-" + k);
    t.addEventListener("click", () => setMode(k));
    t.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3]; setMode(n); $("tab-" + n).focus();
    });
  });
  $("count").textContent = W.length;
  renderStats();
  setMode("daily");
})();
