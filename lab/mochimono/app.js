// 持ち物チェック — 人ごと・曜日ごとの持ち物。チェックは日ごとに分けて保存し、過ぎた日の分は消す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-mochimono-v1";
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const COLORS = ["#D23B4B", "#2F7FC1", "#2E9A62", "#E08A12", "#8A55B8", "#D2668F"];
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PRESETS = {
    elem: { name: "子ども", weekend: false, daily: ["連絡帳", "筆箱", "水筒", "ハンカチ", "ティッシュ", "給食袋"], week: { 1: ["上履き", "体操服"], 2: ["図書の本"], 3: ["習字道具"], 4: ["体操服"], 5: ["絵の具セット"] } },
    junior: { name: "子ども", weekend: false, daily: ["生徒手帳", "筆箱", "水筒", "弁当", "ハンカチ", "ティッシュ"], week: { 1: ["体操服", "上履き"], 3: ["体操服"], 4: ["美術の道具"], 5: ["部活の着替え"] } },
    work: { name: "自分", weekend: false, daily: ["鍵", "財布", "スマホ", "社員証", "ハンカチ"], week: { 2: ["ノートパソコン"], 4: ["ノートパソコン"], 5: ["ジムの着替え"] } },
    none: { name: "自分", weekend: true, daily: [], week: {} }
  };

  // ---------- 保存 ----------
  const blankWeek = () => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const list = (a, max) => Array.isArray(a) ? [...new Set(a.map(x => str(x, max)).filter(Boolean))].slice(0, 80) : [];
  function clean(raw) {
    if (!raw || !Array.isArray(raw.people)) return null;
    const people = raw.people.slice(0, 20).map((p, i) => {
      if (!p || typeof p !== "object") return null;
      const week = blankWeek();
      for (let d = 0; d < 7; d++) week[d] = list(p.week && p.week[d], 30);
      const once = Array.isArray(p.once) ? p.once.filter(o => o && /^\d{4}-\d{2}-\d{2}$/.test(o.date) && str(o.name, 30))
        .slice(0, 200).map(o => ({ id: str(o.id, 20) || uid(), date: o.date, name: str(o.name, 30) })) : [];
      return {
        id: str(p.id, 20) || uid(), name: str(p.name, 12) || `${i + 1}人目`,
        color: COLORS.includes(p.color) ? p.color : COLORS[i % COLORS.length],
        weekend: !!p.weekend, daily: list(p.daily, 30), week, once
      };
    }).filter(Boolean);
    const checks = {};
    if (raw.checks && typeof raw.checks === "object") {
      for (const [date, byP] of Object.entries(raw.checks)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !byP || typeof byP !== "object") continue;
        checks[date] = {};
        for (const [pid, names] of Object.entries(byP)) checks[date][str(pid, 20)] = list(names, 30);
      }
    }
    const sel = people.some(p => p.id === raw.sel) ? raw.sel : (people[0] && people[0].id);
    return { v: 1, people, checks, sel };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, people: [], checks: {}, sel: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  const now = new Date();
  const today = ymd(now);
  const tmr = (() => { const d = new Date(now); d.setDate(d.getDate() + 1); return ymd(d); })();
  // 過ぎた日のチェックは消す（毎日リセット）。この日だけの持ち物は30日たったら消す。
  for (const k of Object.keys(st.checks)) if (k < today) delete st.checks[k];
  const old = (() => { const d = new Date(now); d.setDate(d.getDate() - 30); return ymd(d); })();
  st.people.forEach(p => { p.once = p.once.filter(o => o.date >= old); });
  save();

  const night = now.getHours() >= 16;
  let day = night ? tmr : today;
  let editWd = night ? parseYmd(tmr).getDay() : now.getDay();
  if (editWd === 0 || editWd === 6) editWd = 1;
  let editId = null;
  const person = id => st.people.find(p => p.id === id);
  const cur = () => person(st.sel) || st.people[0];

  // ---------- その日の持ち物 ----------
  function groupsFor(p, date) {
    const wd = parseYmd(date).getDay();
    const seen = new Set(), out = [];
    const add = (label, kind, arr) => {
      const items = arr.filter(n => !seen.has(n) && seen.add(n));
      if (items.length) out.push({ label, kind, items });
    };
    add("この日だけ", "once", p.once.filter(o => o.date === date).map(o => o.name));
    add(`${WD[wd]}曜日`, "week", p.week[wd] || []);
    if (p.weekend || (wd !== 0 && wd !== 6)) add(p.weekend ? "毎日" : "毎日（平日）", "daily", p.daily);
    return out;
  }
  const allItems = (p, date) => groupsFor(p, date).flatMap(g => g.items);
  const checked = (p, date) => new Set(((st.checks[date] || {})[p.id]) || []);
  function counts(p, date) {
    const items = allItems(p, date), c = checked(p, date);
    const n = items.filter(i => c.has(i)).length;
    return { total: items.length, done: n, left: items.length - n };
  }
  function toggle(p, date, name) {
    const byDay = st.checks[date] || (st.checks[date] = {});
    const set = new Set(byDay[p.id] || []);
    const before = counts(p, date);
    set.has(name) ? set.delete(name) : set.add(name);
    byDay[p.id] = [...set];
    save();
    const after = counts(p, date);
    justDone = before.left > 0 && after.left === 0 && after.total > 0;
    renderMain(name);
  }
  let justDone = false;

  // ---------- 表示 ----------
  function show(view) {
    $("viewMain").hidden = view !== "main";
    $("viewSetup").hidden = view !== "setup";
    $("viewEdit").hidden = view !== "edit";
    document.querySelector(".move").hidden = view === "setup" && !st.people.length;
  }

  function renderMain(focusName) {
    const p = cur();
    if (!p) { openSetup(); return; }
    st.sel = p.id;
    $("dayTd").textContent = md(today);
    $("dayNd").textContent = md(tmr);
    $("dayT").setAttribute("aria-pressed", String(day === today));
    $("dayN").setAttribute("aria-pressed", String(day === tmr));
    $("nightHint").hidden = !(night && day === tmr);

    const pp = $("people"); pp.replaceChildren();
    st.people.forEach(q => {
      const c = counts(q, day);
      const b = el("button", "who"); b.type = "button";
      b.style.setProperty("--pc", q.color);
      b.setAttribute("aria-pressed", String(q.id === p.id));
      b.append(el("span", "who-n", q.name));
      const badge = c.total === 0 ? el("span", "who-b none", "なし") : c.left === 0 ? el("span", "who-b ok", "✓") : el("span", "who-b", String(c.left));
      b.append(badge);
      b.setAttribute("aria-label", `${q.name}（${c.total === 0 ? "持ち物なし" : c.left === 0 ? "全部そろった" : `あと${c.left}つ`}）`);
      b.addEventListener("click", () => { st.sel = q.id; save(); renderMain(); });
      pp.append(b);
    });
    const add = el("button", "who add", "＋ 追加"); add.type = "button";
    add.setAttribute("aria-label", "人を追加");
    add.addEventListener("click", () => openSetup());
    pp.append(add);

    const sheet = $("sheet");
    sheet.style.setProperty("--pc", p.color);
    $("sheetH").textContent = `${p.name}の${day === today ? "今日" : "明日"}の持ち物`;
    const groups = groupsFor(p, day), c = checked(p, day), cnt = counts(p, day);
    $("left").textContent = cnt.total === 0 ? "" : cnt.left === 0 ? "全部そろいました" : `あと${cnt.left}つ（${cnt.total}つ中）`;
    $("barFill").style.width = cnt.total ? `${(cnt.done / cnt.total) * 100}%` : "0";
    sheet.classList.toggle("complete", cnt.total > 0 && cnt.left === 0);

    const box = $("groups"); box.replaceChildren();
    let focusEl = null;
    groups.forEach(g => {
      const sec = el("div", `group g-${g.kind}`);
      sec.append(el("h3", "g-h", g.label));
      const ul = el("ul", "items");
      g.items.forEach(name => {
        const li = el("li");
        const b = el("button", "item"); b.type = "button";
        b.setAttribute("role", "checkbox");
        b.setAttribute("aria-checked", String(c.has(name)));
        b.append(el("span", "box"), el("span", "item-n", name));
        b.addEventListener("click", () => toggle(p, day, name));
        if (name === focusName) focusEl = b;
        li.append(b); ul.append(li);
      });
      sec.append(ul); box.append(sec);
    });
    $("nothing").hidden = groups.length > 0;
    $("clearBtn").hidden = cnt.done === 0;

    const done = $("done");
    done.hidden = !(cnt.total > 0 && cnt.left === 0);
    done.classList.toggle("pop", justDone && !reduce());
    if (justDone) announce(`${p.name}の持ち物が全部そろいました。`);
    justDone = false;
    if (focusEl) focusEl.focus({ preventScroll: true });
    show("main");
  }

  function announce(msg) {
    let a = $("sr");
    if (!a) { a = el("p", "sr"); a.id = "sr"; a.setAttribute("aria-live", "polite"); document.body.append(a); }
    a.textContent = ""; setTimeout(() => { a.textContent = msg; }, 30);
  }

  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg;
    undoFn = undo || null;
    $("toastUndo").hidden = !undo;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  $("dayT").addEventListener("click", () => { day = today; renderMain(); });
  $("dayN").addEventListener("click", () => { day = tmr; renderMain(); });
  $("editBtn").addEventListener("click", () => openEdit(cur().id));
  $("clearBtn").addEventListener("click", () => {
    const p = cur(), snap = snapshot();
    if (st.checks[day]) delete st.checks[day][p.id];
    save(); renderMain();
    toast("チェックを外しました。", () => { restore(snap); renderMain(); });
  });

  // ---------- 人の追加 ----------
  function openSetup() {
    const first = st.people.length === 0;
    $("setupH").textContent = first ? "誰の持ち物ですか？" : "人を追加";
    $("pCancel").hidden = first;
    $("pName").value = "";
    show("setup");
    if (!first) $("pName").focus();
  }
  $("pCancel").addEventListener("click", () => renderMain());
  $("setupForm").addEventListener("submit", e => {
    e.preventDefault();
    const key = (document.querySelector("input[name=preset]:checked") || {}).value || "none";
    const pr = PRESETS[key];
    let name = $("pName").value.trim().slice(0, 12);
    if (!name) {
      const base = pr.name, used = new Set(st.people.map(p => p.name));
      name = base === "自分" && !used.has("自分") ? "自分" : (() => { let i = 1; while (used.has(`${base === "自分" ? "家族" : "子ども"}${i}`)) i++; return `${base === "自分" ? "家族" : "子ども"}${i}`; })();
    }
    const week = blankWeek();
    for (const [d, arr] of Object.entries(pr.week)) week[d] = arr.slice();
    const used = st.people.map(p => p.color);
    const color = COLORS.find(c => !used.includes(c)) || COLORS[st.people.length % COLORS.length];
    const p = { id: uid(), name, color, weekend: pr.weekend, daily: pr.daily.slice(), week, once: [] };
    st.people.push(p); st.sel = p.id; save();
    if (key === "none") { openEdit(p.id); return; }
    renderMain();
    toast("よくある持ち物を入れました。「持ち物を編集」で時間割に合わせて直せます。");
  });

  // ---------- 編集 ----------
  function openEdit(id) {
    editId = id;
    const p = person(id);
    $("edName").value = p.name;
    $("onceDate").value = tmr;
    $("onceDate").min = today;
    $("onceErr").textContent = "";
    renderEdit();
    show("edit");
    window.scrollTo(0, 0);
    $("edH").setAttribute("tabindex", "-1");
    $("edH").focus();
  }
  function chipList(ul, arr, onRemove) {
    ul.replaceChildren();
    if (!arr.length) { ul.append(el("li", "chip-none", "まだありません")); return; }
    arr.forEach((name, i) => {
      const li = el("li", "chip");
      li.append(el("span", null, name));
      const x = el("button", "x", "×"); x.type = "button";
      x.setAttribute("aria-label", `${name}を消す`);
      x.addEventListener("click", () => onRemove(i, name));
      li.append(x); ul.append(li);
    });
  }
  function renderEdit() {
    const p = person(editId);
    if (!p) { renderMain(); return; }
    $("edH").textContent = `${p.name}の持ち物`;
    $("viewEdit").style.setProperty("--pc", p.color);
    const cs = $("edColors"); cs.replaceChildren();
    COLORS.forEach(c => {
      const b = el("button", "sw"); b.type = "button";
      b.style.setProperty("--sw", c);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(p.color === c));
      b.setAttribute("aria-label", "この色にする");
      b.addEventListener("click", () => { p.color = c; save(); renderEdit(); });
      cs.append(b);
    });
    $("edWeekend").checked = p.weekend;
    const removeFrom = (arr, label) => (i, name) => {
      const snap = snapshot();
      arr.splice(i, 1); save(); renderEdit();
      toast(`「${name}」を${label}から消しました。`, () => { restore(snap); renderEdit(); });
    };
    chipList($("edDaily"), p.daily, removeFrom(p.daily, "毎日の持ち物"));
    const wd = $("edWd"); wd.replaceChildren();
    WEEK_ORDER.forEach(d => {
      const b = el("button", "wd-b"); b.type = "button";
      b.setAttribute("aria-pressed", String(d === editWd));
      b.append(el("span", null, WD[d]));
      if (p.week[d].length) b.append(el("small", null, String(p.week[d].length)));
      b.setAttribute("aria-label", `${WD[d]}曜日（${p.week[d].length}つ）`);
      b.classList.toggle("we", d === 0 || d === 6);
      b.addEventListener("click", () => { editWd = d; renderEdit(); });
      wd.append(b);
    });
    $("edWeekIn").placeholder = editWd === 3 ? "習字道具、絵の具" : "体操服、習字道具";
    $("edWeekIn").setAttribute("aria-label", `${WD[editWd]}曜日の持ち物を追加`);
    chipList($("edWeek"), p.week[editWd], removeFrom(p.week[editWd], `${WD[editWd]}曜日`));

    const ol = $("edOnce"); ol.replaceChildren();
    const upcoming = p.once.filter(o => o.date >= today).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    if (!upcoming.length) ol.append(el("li", "chip-none", "遠足や行事など、その日だけの持ち物を入れておけます。"));
    upcoming.forEach(o => {
      const li = el("li", "once");
      li.append(el("span", "once-d", md(o.date)), el("span", "once-n", o.name));
      const x = el("button", "x", "×"); x.type = "button";
      x.setAttribute("aria-label", `${md(o.date)}の${o.name}を消す`);
      x.addEventListener("click", () => {
        const snap = snapshot();
        p.once = p.once.filter(q => q.id !== o.id); save(); renderEdit();
        toast(`「${o.name}」を消しました。`, () => { restore(snap); renderEdit(); });
      });
      li.append(x); ol.append(li);
    });
  }
  const splitItems = s => s.split(/[、，,\n]+/).map(x => x.trim().slice(0, 30)).filter(Boolean);
  document.querySelectorAll("form.add").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    const p = person(editId), input = f.querySelector("input");
    const items = splitItems(input.value);
    if (!items.length) { input.focus(); return; }
    const arr = f.dataset.k === "daily" ? p.daily : p.week[editWd];
    items.forEach(n => { if (!arr.includes(n)) arr.push(n); });
    input.value = ""; save(); renderEdit(); input.focus();
  }));
  $("edName").addEventListener("input", () => {
    const p = person(editId); const v = $("edName").value.trim().slice(0, 12);
    if (v) { p.name = v; save(); $("edH").textContent = `${p.name}の持ち物`; }
  });
  $("edWeekend").addEventListener("change", () => { person(editId).weekend = $("edWeekend").checked; save(); });
  $("onceForm").addEventListener("submit", e => {
    e.preventDefault();
    const p = person(editId), date = $("onceDate").value, name = $("onceName").value.trim().slice(0, 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $("onceErr").textContent = "日にちを選んでください。"; $("onceDate").focus(); return; }
    if (date < today) { $("onceErr").textContent = "今日以降の日にちを選んでください。"; $("onceDate").focus(); return; }
    if (!name) { $("onceErr").textContent = "持ち物を入れてください。"; $("onceName").focus(); return; }
    $("onceErr").textContent = "";
    splitItems(name).forEach(n => p.once.push({ id: uid(), date, name: n }));
    $("onceName").value = ""; save(); renderEdit(); $("onceName").focus();
  });
  $("edDone").addEventListener("click", () => { if (!$("edName").value.trim()) $("edName").value = person(editId).name; renderMain(); window.scrollTo(0, 0); });
  $("edDel").addEventListener("click", () => {
    const p = person(editId);
    if (!confirm(`${p.name}の持ち物を、すべて削除しますか？`)) return;
    const snap = snapshot();
    st.people = st.people.filter(q => q.id !== p.id);
    for (const d of Object.values(st.checks)) delete d[p.id];
    st.sel = st.people[0] ? st.people[0].id : null; save();
    if (!st.people.length) { openSetup(); toast(`${p.name}を削除しました。`, () => { restore(snap); renderMain(); }); return; }
    renderMain();
    toast(`${p.name}を削除しました。`, () => { restore(snap); renderMain(); });
  });

  // ---------- 引っ越し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "mochimono", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `mochimono-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try {
      if (f.size > 2e6) throw 0;
      const j = JSON.parse(await f.text());
      if (j && j.app === "mochimono") data = clean(j.data);
    } catch (e) { data = null; }
    if (!data || !data.people.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.people.length && !confirm(`今のリストを、ファイルの${data.people.length}人分に置き換えますか？`)) return;
    const snap = snapshot();
    st = data; save(); renderMain();
    $("moveMsg").textContent = `${data.people.length}人分の持ち物を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); renderMain(); });
  });

  if (st.people.length) renderMain(); else openSetup();
})();
