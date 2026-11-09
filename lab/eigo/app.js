// 英語ひとこと日記 — テーマとフレーズを手がかりに、英語で一文。添削はしません。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const T = window.THEMES || [];
  const KEY = "lab-eigo-v1";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date(), today = ymd(now);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const say = m => { $("sr").textContent = m; };

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || typeof st !== "object") st = {};
  st.entries = st.entries && typeof st.entries === "object" ? st.entries : {}; // date -> {theme, text}
  st.book = Array.isArray(st.book) ? st.book : [];                              // [{en, ja, theme}]
  st.pick = st.pick && st.pick.date === today ? st.pick : null;                 // today's theme override
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // theme of the day: the same for everyone on that date
  const dayNo = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const dailyTheme = T[((dayNo % T.length) + T.length) % T.length];
  const byId = id => T.find(t => t.id === id);
  let theme = (st.entries[today] && byId(st.entries[today].theme)) || (st.pick && byId(st.pick.id)) || dailyTheme;

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmtEn = d => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const fmtJa = s => { const [y, m, d] = s.split("-").map(Number); const w = "日月火水木金土"[new Date(y, m - 1, d).getDay()]; return `${y}年${m}月${d}日（${w}）`; };

  const inBook = en => st.book.some(b => b.en === en);
  const canSpeak = "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
  function speak(text) {
    if (!canSpeak) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/~/g, "something")); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {}
  }

  function phraseItem(ph, themeId, inBookView) {
    const li = el("li", "ph");
    const txt = el("div", "ph-t");
    const en = el("p", "ph-en", ph[0]); en.lang = "en";
    txt.append(en, el("p", "ph-ja", ph[1]));
    if (inBookView) { const t = byId(themeId); if (t) txt.append(el("p", "ph-th", t.ja)); }
    const acts = el("div", "ph-a");
    if (!inBookView) {
      const use = el("button", "mini", "使う"); use.type = "button"; use.setAttribute("aria-label", `「${ph[0]}」を一文に入れる`);
      use.addEventListener("click", () => insert(ph[0]));
      acts.append(use);
    }
    if (canSpeak) {
      const sp = el("button", "mini icon", "▶"); sp.type = "button"; sp.setAttribute("aria-label", `「${ph[0]}」を読み上げる`);
      sp.addEventListener("click", () => speak(ph[0])); acts.append(sp);
    }
    const star = el("button", "mini icon star", inBook(ph[0]) ? "★" : "☆"); star.type = "button";
    star.setAttribute("aria-pressed", String(inBook(ph[0])));
    star.setAttribute("aria-label", inBook(ph[0]) ? `「${ph[0]}」をフレーズ帳から外す` : `「${ph[0]}」をフレーズ帳に保存`);
    star.addEventListener("click", () => {
      if (inBook(ph[0])) { st.book = st.book.filter(b => b.en !== ph[0]); say("フレーズ帳から外しました。"); }
      else { st.book.push({ en: ph[0], ja: ph[1], theme: themeId }); say("フレーズ帳に保存しました。"); }
      save(); renderToday(); renderBook();
    });
    acts.append(star);
    li.classList.toggle("on", inBook(ph[0]));
    li.append(txt, acts);
    return li;
  }

  function insert(phrase) {
    const ta = $("line"); const v = ta.value;
    const add = phrase.replace(/~/g, "…");
    ta.value = (v && !/\s$/.test(v) ? v + " " : v) + add;
    ta.value = ta.value.slice(0, 200);
    ta.focus();
    const i = ta.value.lastIndexOf("…");
    if (i >= 0) ta.setSelectionRange(i, i + 1);
    count();
  }
  const count = () => { $("cnt").textContent = `${$("line").value.length} / 200`; };

  function renderToday() {
    $("dEn").textContent = fmtEn(now); $("dJa").textContent = fmtJa(today);
    $("themeJa").textContent = theme.ja;
    $("todayH").textContent = theme.q; $("qja").textContent = theme.qja;
    const ul = $("phrases"); ul.replaceChildren();
    theme.p.forEach(ph => ul.append(phraseItem(ph, theme.id, false)));
    const e = st.entries[today];
    $("saveBtn").textContent = e ? "書き直す" : "日記に書く";
    $("other").hidden = !!e;
    $("saved").textContent = e ? "今日の日記は保存されています。書き直すこともできます。" : "";
  }

  function renderDiary() {
    const ol = $("diary"); ol.replaceChildren();
    const keys = Object.keys(st.entries).sort().reverse();
    $("diaryEmpty").hidden = keys.length > 0;
    $("diaryN").textContent = keys.length ? `${keys.length}日分` : "";
    keys.forEach(k => {
      const e = st.entries[k], t = byId(e.theme);
      const li = el("li", "entry");
      const head = el("div", "e-h");
      head.append(el("span", "e-d", fmtJa(k)), el("span", "e-t", t ? t.ja : ""));
      const p = el("p", "e-x", e.text); p.lang = "en";
      const del = el("button", "e-del", "削除"); del.type = "button"; del.setAttribute("aria-label", `${fmtJa(k)}の日記を削除`);
      del.addEventListener("click", () => {
        if (!confirm(`${fmtJa(k)}の日記を削除します。よろしいですか。`)) return;
        delete st.entries[k]; save(); renderDiary(); if (k === today) renderToday(); say("日記を削除しました。");
      });
      head.append(del);
      li.append(head, p);
      if (t) { const q = el("p", "e-q", t.q); q.lang = "en"; li.append(q); }
      ol.append(li);
    });
  }

  function renderBook() {
    const ul = $("book"); ul.replaceChildren();
    $("bookEmpty").hidden = st.book.length > 0;
    $("bookN").textContent = st.book.length ? `${st.book.length}個` : "";
    st.book.slice().reverse().forEach(b => ul.append(phraseItem([b.en, b.ja], b.theme, true)));
  }

  $("line").addEventListener("input", count);
  $("writeForm").addEventListener("submit", e => {
    e.preventDefault();
    const text = $("line").value.trim().replace(/\s+/g, " ");
    if (!text) { $("saved").textContent = "一文を書いてから保存してください。"; $("line").focus(); return; }
    if (text.includes("…")) { $("saved").textContent = "「…」の部分を自分の言葉に書きかえてください。"; $("line").focus(); return; }
    st.entries[today] = { theme: theme.id, text };
    save(); renderToday(); renderDiary();
    $("saved").textContent = "日記に書きました。「日記」から読み返せます。";
  });
  $("other").addEventListener("click", () => {
    const i = T.indexOf(theme); theme = T[(i + 1) % T.length];
    st.pick = { date: today, id: theme.id }; save(); renderToday();
    say(`テーマを「${theme.ja}」に変えました。`);
  });

  function show(v) {
    document.querySelectorAll(".view").forEach(s => { s.hidden = s.id !== "view-" + v; });
    document.querySelectorAll(".tabbar button").forEach(b => {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tabbar button").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

  if (st.entries[today]) $("line").value = st.entries[today].text;
  count(); renderToday(); renderDiary(); renderBook();
})();
