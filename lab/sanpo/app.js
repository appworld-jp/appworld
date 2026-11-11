(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "sanpolog.v1";
  const THEMES = window.SANPO_THEMES || [];
  const TAGS = ["花", "木・緑", "猫", "犬", "鳥", "虫", "空・雲", "夕焼け", "川・池", "海", "公園", "神社・お寺", "お店", "パン屋", "カフェ", "季節のもの", "おもしろい看板", "古い建物", "坂・階段", "電車"];
  const MOODS = [["☀️", "晴れやか"], ["🍃", "のんびり"], ["💪", "すっきり"], ["😌", "ほっとした"], ["😪", "つかれた"]];
  const pad = n => String(n).padStart(2, "0");
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const fmtMin = m => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`);
  const label = k => { const d = parseKey(k); return `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`; };

  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && Array.isArray(o.walks)) return Object.assign({ walks: [], running: null, shift: null }, o); } catch (e) { /* ignore */ }
    return { walks: [], running: null, shift: null };
  }
  const S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  // ---------- theme of the day ----------
  function themeIndex() {
    const d = new Date(), base = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const shift = S.shift && S.shift.day === todayKey() ? S.shift.n : 0;
    return ((base * 7 + shift) % THEMES.length + THEMES.length) % THEMES.length; // 7 is coprime with the list length, so days vary
  }
  const theme = () => THEMES[themeIndex()];
  function renderTheme() { $("themeTxt").textContent = theme(); }
  $("themeNext").addEventListener("click", () => {
    const n = S.shift && S.shift.day === todayKey() ? S.shift.n + 1 : 1;
    S.shift = { day: todayKey(), n }; save(); renderTheme();
  });

  // ---------- timer ----------
  let tickI = 0;
  function renderTimer() {
    const on = S.running != null;
    $("walk").classList.toggle("on", on);
    $("startBtn").hidden = on; $("stopBtn").hidden = !on; $("cancelBtn").hidden = !on; $("manualBtn").hidden = on;
    clearInterval(tickI);
    if (on) {
      const st = new Date(S.running);
      $("clockSub").textContent = `${st.getHours()}:${pad(st.getMinutes())}に出発。帰ったら「ただいま」を押してください。`;
      const t = () => { const s = Math.max(0, Math.floor((Date.now() - S.running) / 1000)); const h = Math.floor(s / 3600); $("clock").textContent = h ? `${h}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
      t(); tickI = setInterval(t, 1000);
    } else {
      $("clock").textContent = "0:00";
      $("clockSub").textContent = "出かけるときに押すと、歩いた時間を計ります。";
    }
  }
  $("startBtn").addEventListener("click", () => { S.running = Date.now(); save(); renderTimer(); $("stopBtn").focus(); });
  $("cancelBtn").addEventListener("click", () => { if (!confirm("計っている時間を取り消しますか？")) return; S.running = null; save(); renderTimer(); });
  $("stopBtn").addEventListener("click", () => {
    const min = Math.max(1, Math.round((Date.now() - S.running) / 60000));
    openSheet(min, keyOf(new Date(S.running)));
  });
  $("manualBtn").addEventListener("click", () => openSheet(20, todayKey(), true));

  // ---------- finish sheet ----------
  let pickTags = new Set(), pickMood = null;
  const FC = window.FreeChips;
  const myTags = FC.store("sanpolog.tags.custom"), myMoods = FC.store("sanpolog.moods.custom");
  const moodLabel = m => (typeof m === "string" ? ["💬", m] : MOODS[m]);
  function wrapCustom(chip, name, onRemove) {
    const w = document.createElement("span"); w.className = "fc-item";
    w.append(chip, FC.remover(name, onRemove));
    return w;
  }
  function tagBtn(name) {
    const b = document.createElement("button"); b.type = "button"; b.className = "tag"; b.textContent = name;
    b.setAttribute("aria-pressed", String(pickTags.has(name)));
    b.addEventListener("click", () => { pickTags.has(name) ? pickTags.delete(name) : pickTags.add(name); b.setAttribute("aria-pressed", String(pickTags.has(name))); });
    return b;
  }
  function buildSheet(focusAdder) {
    const t = $("fTags"); t.textContent = "";
    for (const name of TAGS) t.appendChild(tagBtn(name));
    for (const name of myTags.all()) t.appendChild(wrapCustom(tagBtn(name), name, () => { myTags.remove(name); pickTags.delete(name); buildSheet(); }));
    const ta = FC.adder({
      label: "＋ 自分で入力", aria: "見たものを入力", placeholder: "例：金木犀", max: 20, ok: "追加", btnClass: "tag add",
      empty: "見たものを入れてから「追加」を押してください。",
      submit: v => { if (!TAGS.includes(v)) myTags.add(v); pickTags.add(v); buildSheet("tag"); }
    });
    t.append(ta.btn, ta.form);
    const m = $("fMood"); m.textContent = ""; m.setAttribute("role", "radiogroup"); m.setAttribute("aria-label", "気分");
    const sync = () => m.querySelectorAll(".mood").forEach(x => x.setAttribute("aria-checked", String(pickMood === (x.dataset.c != null ? x.dataset.c : Number(x.dataset.i)))));
    const moodBtn = (val, ic, name) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "mood"; b.setAttribute("role", "radio");
      if (typeof val === "string") b.dataset.c = val; else b.dataset.i = String(val);
      const e = document.createElement("b"); e.textContent = ic; e.setAttribute("aria-hidden", "true");
      const s = document.createElement("span"); s.textContent = name;
      b.append(e, s);
      b.addEventListener("click", () => { pickMood = pickMood === val ? null : val; sync(); });
      return b;
    };
    MOODS.forEach(([ic, name], i) => m.appendChild(moodBtn(i, ic, name)));
    for (const name of myMoods.all()) m.appendChild(wrapCustom(moodBtn(name, "💬", name), name, () => { myMoods.remove(name); if (pickMood === name) pickMood = null; buildSheet(); }));
    const ma = FC.adder({
      label: "＋ 自分で入力", aria: "気分を入力", placeholder: "例：わくわく", max: 12, ok: "決定", btnClass: "mood add",
      empty: "気分を入れてから「決定」を押してください。",
      submit: v => { const i = MOODS.findIndex(x => x[1] === v); if (i >= 0) pickMood = i; else { myMoods.add(v); pickMood = v; } buildSheet("mood"); }
    });
    m.append(ma.btn, ma.form);
    sync();
    if (focusAdder) { const box = focusAdder === "tag" ? t : m; const f = box.querySelector(".fc-add"); if (f) f.focus(); }
  }
  let manual = false;
  function openSheet(min, date, isManual) {
    manual = !!isManual;
    pickTags = new Set(); pickMood = null; buildSheet();
    $("sheetTitle").textContent = manual ? "さんぽを記録" : "おかえりなさい！";
    $("fDate").value = date; $("fDate").max = todayKey(); $("fMin").value = min;
    $("fTheme").checked = false; $("fThemeTxt").textContent = theme();
    $("fNote").value = ""; $("fErr").textContent = "";
    $("sheet").hidden = false; $("walk").hidden = true;
    $("sheetTitle").setAttribute("tabindex", "-1"); $("sheetTitle").focus();
  }
  function closeSheet() { $("sheet").hidden = true; $("walk").hidden = false; }
  $("fCancel").addEventListener("click", () => { closeSheet(); (S.running ? $("stopBtn") : $("startBtn")).focus(); });
  $("sheet").addEventListener("submit", e => {
    e.preventDefault();
    const date = $("fDate").value, min = parseInt($("fMin").value, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) { $("fErr").textContent = "今日までの日付を選んでください。"; return; }
    if (!(min >= 1 && min <= 600)) { $("fErr").textContent = "歩いた時間は1〜600分で入れてください。"; return; }
    S.walks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date, min, tags: [...pickTags], mood: pickMood, note: $("fNote").value.trim().slice(0, 140), theme: $("fTheme").checked ? theme() : null, t: Date.now() });
    if (!manual) S.running = null;
    save(); closeSheet(); calMonth = date.slice(0, 7); stampDay = date; renderAll();
    $("startBtn").focus();
  });

  // ---------- stats ----------
  function byDay() { const m = new Map(); for (const w of S.walks) m.set(w.date, (m.get(w.date) || 0) + w.min); return m; }
  function streaks() {
    const days = new Set(S.walks.map(w => w.date));
    let cur = 0, k = todayKey();
    if (!days.has(k)) k = addDays(k, -1);
    while (days.has(k)) { cur++; k = addDays(k, -1); }
    let best = 0;
    for (const d of days) { if (days.has(addDays(d, -1))) continue; let n = 0, x = d; while (days.has(x)) { n++; x = addDays(x, 1); } best = Math.max(best, n); }
    return { cur, best, walkedToday: days.has(todayKey()) };
  }
  function renderStreak() {
    const s = streaks();
    $("streakBadge").textContent = s.cur ? `${s.cur}日連続` : "";
  }

  let calMonth = todayKey().slice(0, 7), stampDay = null;
  const lvl = m => (m <= 0 ? "" : m < 15 ? "l1" : m < 30 ? "l2" : m < 60 ? "l3" : "l4");
  function renderCal() {
    const [y, mo] = calMonth.split("-").map(Number);
    $("calTitle").textContent = `${y}年${mo}月`;
    const first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
    const minMonth = S.walks.reduce((a, w) => (w.date.slice(0, 7) < a ? w.date.slice(0, 7) : a), todayKey().slice(0, 7));
    $("calPrev").disabled = calMonth <= minMonth; $("calNext").disabled = calMonth >= todayKey().slice(0, 7);
    const cal = $("cal"); cal.textContent = "";
    "日月火水木金土".split("").forEach((w, i) => { const d = document.createElement("span"); d.className = "wd" + (i === 0 ? " su" : ""); d.textContent = w; d.setAttribute("aria-hidden", "true"); cal.appendChild(d); });
    for (let i = 0; i < first.getDay(); i++) { const c = document.createElement("span"); c.className = "c out"; c.setAttribute("aria-hidden", "true"); cal.appendChild(c); }
    const map = byDay(), themes = new Set(S.walks.filter(w => w.theme).map(w => w.date));
    let count = 0, total = 0, longest = 0; const tagCount = new Map();
    for (const w of S.walks) if (w.date.startsWith(calMonth)) { count++; total += w.min; longest = Math.max(longest, w.min); for (const t of w.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1); }
    for (let d = 1; d <= days; d++) {
      const k = `${calMonth}-${pad(d)}`, m = map.get(k) || 0;
      const c = document.createElement("span");
      c.className = "c " + lvl(m) + (k === todayKey() ? " today" : "") + (themes.has(k) ? " th" : "") + (k === stampDay ? " stamp" : "");
      c.textContent = d;
      c.setAttribute("role", "img");
      c.setAttribute("aria-label", `${mo}月${d}日：${m ? fmtMin(m) + "歩いた" + (themes.has(k) ? "、テーマ達成" : "") : "記録なし"}`);
      if (m) c.title = fmtMin(m);
      cal.appendChild(c);
    }
    stampDay = null;
    const tot = $("totals"); tot.textContent = "";
    const s = streaks();
    [["さんぽ", count, "回"], ["合計", total ? fmtMin(total) : "0分", ""], ["いちばん長い日", longest ? fmtMin(longest) : "—", ""], ["いまの連続", s.cur, "日"], ["最長の連続", s.best, "日"], ["テーマ達成", S.walks.filter(w => w.theme && w.date.startsWith(calMonth)).length, "回"]].forEach(([a, b, u]) => {
      const d = document.createElement("div"); const dt = document.createElement("dt"); dt.textContent = a;
      const dd = document.createElement("dd"); dd.textContent = b; if (u) { const sm = document.createElement("small"); sm.textContent = u; dd.appendChild(sm); }
      d.append(dt, dd); tot.appendChild(d);
    });
    const top = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    $("favs").textContent = top.length ? `今月よく見たもの：${top.map(([t, n]) => `${t}（${n}回）`).join("、")}` : "";
  }
  $("calPrev").addEventListener("click", () => { const d = parseKey(calMonth + "-01"); d.setMonth(d.getMonth() - 1); calMonth = keyOf(d).slice(0, 7); renderCal(); });
  $("calNext").addEventListener("click", () => { const d = parseKey(calMonth + "-01"); d.setMonth(d.getMonth() + 1); calMonth = keyOf(d).slice(0, 7); renderCal(); });

  function renderJournal() {
    const ol = $("journal"); ol.textContent = "";
    const list = S.walks.slice().sort((a, b) => (a.date === b.date ? b.t - a.t : a.date < b.date ? 1 : -1)).slice(0, 30);
    for (const w of list) {
      const li = document.createElement("li");
      const top = document.createElement("div"); top.className = "top";
      const d = document.createElement("span"); d.className = "d"; d.textContent = label(w.date);
      const m = document.createElement("span"); m.className = "m"; m.textContent = fmtMin(w.min);
      top.append(d, m); li.appendChild(top);
      const tg = document.createElement("div"); tg.className = "tg";
      const ml = w.mood != null ? moodLabel(w.mood) : null;
      if (ml) { const s = document.createElement("span"); s.className = "mo"; s.textContent = ml.join(" "); tg.appendChild(s); }
      if (w.theme) { const s = document.createElement("span"); s.className = "tt"; s.textContent = "テーマ：" + w.theme; tg.appendChild(s); }
      for (const t of w.tags) { const s = document.createElement("span"); s.textContent = t; tg.appendChild(s); }
      if (tg.childNodes.length) li.appendChild(tg);
      if (w.note) { const n = document.createElement("p"); n.className = "n"; n.textContent = w.note; li.appendChild(n); }
      const del = document.createElement("button"); del.type = "button"; del.className = "del"; del.textContent = "削除";
      del.setAttribute("aria-label", `${label(w.date)}の記録を削除`);
      del.addEventListener("click", () => { if (!confirm(`${label(w.date)}の記録を削除しますか？`)) return; S.walks = S.walks.filter(x => x.id !== w.id); save(); renderAll(); });
      li.appendChild(del); ol.appendChild(li);
    }
    $("jEmpty").hidden = list.length > 0;
  }

  function renderAll() { renderTheme(); renderTimer(); renderStreak(); renderCal(); renderJournal(); }
  renderAll();
})();
