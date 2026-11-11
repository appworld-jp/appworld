// いつやった？帳 — ときどきやる家事の記録。データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "itsu.v1";
  const UNITS = { d: "日", w: "週間", m: "か月" };
  const PRESETS = [
    ["エアコンのフィルター掃除", 2, "w"], ["シーツの洗濯", 1, "w"], ["歯ブラシの交換", 1, "m"],
    ["換気扇の掃除", 3, "m"], ["布団を干す", 1, "w"], ["冷蔵庫の掃除", 1, "m"],
    ["車のオイル交換", 6, "m"], ["洗濯槽の掃除", 1, "m"], ["排水口の掃除", 1, "w"],
    ["バスマットの洗濯", 1, "w"], ["浄水器のカートリッジ交換", 3, "m"], ["掃除機のフィルター掃除", 1, "m"],
    ["カーテンの洗濯", 6, "m"], ["火災警報器の点検", 6, "m"], ["髪を切る", 2, "m"]
  ];
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parse(s)) === s;
  const dayDiff = (a, b) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
  const WD = "日月火水木金土";
  const jp = d => `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  const jpY = d => (d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + "年" : "") + jp(d);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const toHalf = s => String(s).normalize("NFKC").trim();

  let st = { items: [] };
  let openId = null;

  function valid(v) {
    if (!v || !Array.isArray(v.items)) return null;
    const items = [];
    for (const it of v.items) {
      if (!it || typeof it.name !== "string" || !it.name.trim()) continue;
      const n = Math.round(+it.n), u = it.u;
      if (!(n >= 1 && n <= 365) || !UNITS[u]) continue;
      const log = Array.isArray(it.log) ? [...new Set(it.log.filter(isYmd))].sort() : [];
      items.push({ id: typeof it.id === "string" && it.id ? it.id : uid(), name: it.name.trim().slice(0, 30), n, u, log });
    }
    return { items };
  }
  try { const v = valid(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); }
    catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。"); }
  }
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); render(); };

  // ---- 計算 ----
  function addInterval(d, n, u) {
    const r = new Date(d);
    if (u === "d") r.setDate(r.getDate() + n);
    else if (u === "w") r.setDate(r.getDate() + 7 * n);
    else { const day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + n); const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(day, last)); }
    return r;
  }
  function info(it) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const span = dayDiff(addInterval(now, it.n, it.u), now);
    if (!it.log.length) return { state: "none", left: Infinity, span, ratio: 0, label: "まだ記録がありません" };
    const last = parse(it.log[it.log.length - 1]), due = addInterval(last, it.n, it.u);
    const left = dayDiff(due, now), ago = dayDiff(now, last);
    const soon = Math.max(1, Math.round(span * 0.2));
    const state = left < 0 ? "over" : left <= soon ? "soon" : "ok";
    let label;
    if (left < 0) label = `${-left}日過ぎています`;
    else if (left === 0) label = "今日が目安です";
    else if (left === 1) label = "明日";
    else label = left > 60 ? `あと約${Math.round(left / 30)}か月` : `あと${left}日`;
    return { state, left, span, ago, last, due, ratio: Math.min(1.25, ago / Math.max(1, dayDiff(due, last))), label };
  }
  const agoText = n => n === 0 ? "今日" : n === 1 ? "昨日" : `${n}日前`;
  const everyText = it => (it.n === 1 && it.u === "w" ? "毎週" : it.n === 1 && it.u === "m" ? "毎月" : it.n === 1 && it.u === "d" ? "毎日" : `${it.n}${UNITS[it.u]}ごと`);

  // ---- 表示 ----
  function render() {
    const now = new Date();
    $("today").textContent = `${now.getFullYear()}年${jp(now)}`;
    const list = $("list"); list.textContent = "";
    const rows = st.items.map(it => ({ it, f: info(it) }));
    rows.sort((a, b) => (a.f.left - b.f.left) || (b.f.ratio - a.f.ratio) || a.it.name.localeCompare(b.it.name, "ja"));
    const c = { over: 0, soon: 0, ok: 0 };
    rows.forEach(({ it, f }) => {
      if (c[f.state] != null) c[f.state]++;
      const li = el("li", "card s-" + f.state); li.dataset.id = it.id;
      const open = el("button", "card-open"); open.type = "button";
      open.setAttribute("aria-label", `${it.name}。${f.label}。詳しく見る`);
      const nm = el("span", "nm", it.name);
      const meta = el("span", "meta", f.state === "none" ? `目安：${everyText(it)}` : `前回 ${f.last.getMonth() + 1}月${f.last.getDate()}日（${agoText(f.ago)}）・${everyText(it)}`);
      const stt = el("span", "stt", f.label);
      const bar = el("span", "gauge"); bar.setAttribute("aria-hidden", "true");
      const fill = el("i"); fill.style.width = Math.min(100, f.ratio * 100) + "%"; bar.append(fill);
      open.append(nm, stt, meta, bar);
      const doneToday = f.state !== "none" && f.ago === 0;
      const btn = el("button", "done" + (doneToday ? " is-done" : ""), doneToday ? "今日やった ✓" : "今日やった");
      btn.type = "button"; btn.setAttribute("aria-label", doneToday ? `${it.name}は今日やりました` : `${it.name}を今日やったと記録`);
      if (doneToday) btn.disabled = true;
      btn.addEventListener("click", () => markDone(it.id, ymd(new Date()), li));
      li.append(open, btn);
      if (doneToday) li.append(stamp());
      if (f.state === "none") {
        const past = el("button", "past link", "前にやった日を入れる"); past.type = "button";
        past.addEventListener("click", () => openSheet(it.id, true)); li.append(past);
      }
      open.addEventListener("click", () => openSheet(it.id));
      list.append(li);
    });
    const empty = !st.items.length;
    document.body.classList.toggle("empty", empty);
    $("tally").hidden = empty;
    if (!empty) $("tally").textContent = `過ぎている ${c.over}　もうすぐ ${c.soon}　まだ先 ${c.ok}`;
    $("add-open").hidden = empty;
    const addShown = empty || $("add-open").getAttribute("aria-expanded") === "true";
    $("add").hidden = !addShown;
    $("add-close").hidden = empty;
    $("h-add").textContent = empty ? "まずは、よくある項目から選んでください" : "よくある項目から選ぶ";
    renderPresets();
    if (openId && $("sheet").open) fillSheet();
  }
  function stamp() { const s = el("span", "stamp", "済"); s.setAttribute("aria-hidden", "true"); return s; }

  const picked = new Set();
  function renderPresets() {
    const box = $("presets"); box.textContent = "";
    const have = new Set(st.items.map(i => i.name));
    PRESETS.forEach(([name, n, u]) => {
      if (have.has(name)) { picked.delete(name); return; }
      const b = el("button", "chip"); b.type = "button";
      b.setAttribute("aria-pressed", picked.has(name) ? "true" : "false");
      b.append(el("span", null, name), el("small", null, everyText({ n, u })));
      b.addEventListener("click", () => { picked.has(name) ? picked.delete(name) : picked.add(name); renderPresets(); });
      box.append(b);
    });
    if (!box.children.length) box.append(el("p", "hint", "よくある項目は全て追加済みです。"));
    $("add-presets").disabled = !picked.size;
    $("pcount").textContent = picked.size ? `${picked.size}件を選んでいます` : "";
  }
  $("add-presets").addEventListener("click", () => {
    const snap = snapshot(); let n = 0;
    PRESETS.forEach(([name, num, u]) => { if (picked.has(name)) { st.items.push({ id: uid(), name, n: num, u, log: [] }); n++; } });
    picked.clear(); save(); closeAdd(); render();
    toast(`${n}件を追加しました。やったことがあれば、日付を入れておくと便利です。`, snap);
  });

  function readEvery(nEl, uEl, errEl) {
    const n = Number(toHalf(nEl.value));
    if (!Number.isInteger(n) || n < 1 || n > 365) { errEl.textContent = "目安は1〜365の数字で入れてください。"; nEl.focus(); return null; }
    return { n, u: uEl.value };
  }
  $("custom").addEventListener("submit", e => {
    e.preventDefault();
    const err = $("c-err"); err.textContent = "";
    const name = $("c-name").value.trim();
    if (!name) { err.textContent = "項目の名前を入れてください。"; $("c-name").focus(); return; }
    if (st.items.some(i => i.name === name)) { err.textContent = "同じ名前の項目があります。"; $("c-name").focus(); return; }
    const ev = readEvery($("c-n"), $("c-unit"), err); if (!ev) return;
    const snap = snapshot();
    st.items.push({ id: uid(), name, n: ev.n, u: ev.u, log: [] }); save();
    $("c-name").value = ""; $("c-n").value = "1";
    closeAdd(); render(); toast(`「${name}」を追加しました。`, snap);
  });
  function closeAdd() { $("add-open").setAttribute("aria-expanded", "false"); }
  $("add-open").addEventListener("click", () => {
    const x = $("add-open").getAttribute("aria-expanded") !== "true";
    $("add-open").setAttribute("aria-expanded", String(x)); render();
    if (x) $("add").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  $("add-close").addEventListener("click", () => { closeAdd(); render(); $("add-open").focus(); });

  function markDone(id, date, li) {
    const it = st.items.find(i => i.id === id); if (!it) return;
    if (it.log.includes(date)) { toast(`${jp(parse(date))}は、もう記録してあります。`); return; }
    const snap = snapshot();
    it.log.push(date); it.log.sort(); save();
    if (li && !matchMedia("(prefers-reduced-motion: reduce)").matches) { li.classList.add("pressed"); setTimeout(() => render(), 380); } else render();
    const nx = info(it);
    toast(nx.left > 0 ? `「${it.name}」を記録しました。次は${jp(nx.due)}ごろです。` : `「${it.name}」を記録しました。`, snap);
  }

  // ---- 詳細 ----
  function openSheet(id, focusDate) {
    openId = id; fillSheet();
    const it = st.items.find(i => i.id === id);
    $("e-name").value = it.name; $("e-n").value = it.n; $("e-unit").value = it.u; $("e-err").textContent = "";
    $("d-date-err").textContent = "";
    const d = new Date(); d.setDate(d.getDate() - 1); $("d-date").value = ymd(d);
    $("sheet").querySelector(".d-edit").open = false;
    $("sheet").showModal();
    if (focusDate) $("d-date").focus();
  }
  function fillSheet() {
    const it = st.items.find(i => i.id === openId); if (!it) { $("sheet").close(); return; }
    const f = info(it);
    $("d-name").textContent = it.name;
    $("d-status").textContent = f.state === "none" ? `目安は${everyText(it)}。まだ記録がありません。` : f.left < 0 ? `${f.label}。目安は${jpY(f.due)}でした。` : f.left === 0 ? `${f.label}。` : `${f.label === "明日" ? "明日が目安です" : f.label}。次は${jpY(f.due)}ごろです。`;
    $("d-status").className = "d-status s-" + f.state;
    $("d-date").max = ymd(new Date());
    const ul = $("d-hist"); ul.textContent = "";
    if (!it.log.length) ul.append(el("li", "none", "ここに、やった日が並びます。"));
    [...it.log].reverse().forEach((s, i, arr) => {
      const li = el("li"); const d = parse(s);
      li.append(el("span", "hd", jpY(d)));
      const prev = arr[i + 1];
      li.append(el("span", "gap", prev ? `${dayDiff(d, parse(prev))}日ぶり` : "初めての記録"));
      const x = el("button", "rm", "×"); x.type = "button"; x.setAttribute("aria-label", `${jpY(d)}の記録を削除`);
      x.addEventListener("click", () => {
        const snap = snapshot(); it.log = it.log.filter(v => v !== s); save(); render();
        toast(`${jp(d)}の記録を削除しました。`, snap);
      });
      li.append(x); ul.append(li);
    });
  }
  $("d-other").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("d-date").value, err = $("d-date-err"); err.textContent = "";
    if (!isYmd(v)) { err.textContent = "日付を選んでください。"; return; }
    if (v > ymd(new Date())) { err.textContent = "未来の日付は記録できません。今日までの日付を選んでください。"; return; }
    const it = st.items.find(i => i.id === openId);
    if (it.log.includes(v)) { err.textContent = "その日は、もう記録してあります。"; return; }
    markDone(openId, v);
  });
  $("d-edit").addEventListener("submit", e => {
    e.preventDefault();
    const err = $("e-err"); err.textContent = "";
    const it = st.items.find(i => i.id === openId);
    const name = $("e-name").value.trim();
    if (!name) { err.textContent = "項目の名前を入れてください。"; return; }
    if (st.items.some(i => i.name === name && i.id !== it.id)) { err.textContent = "同じ名前の項目があります。"; return; }
    const ev = readEvery($("e-n"), $("e-unit"), err); if (!ev) return;
    const snap = snapshot();
    Object.assign(it, { name, n: ev.n, u: ev.u }); save(); render();
    $("sheet").querySelector(".d-edit").open = false;
    toast("保存しました。", snap);
  });
  $("d-del").addEventListener("click", () => {
    const it = st.items.find(i => i.id === openId); if (!it) return;
    const snap = snapshot();
    st.items = st.items.filter(i => i.id !== openId); save(); $("sheet").close(); openId = null; render();
    toast(`「${it.name}」を削除しました。`, snap);
  });
  $("sheet").addEventListener("click", e => { if (e.target === $("sheet")) $("sheet").close(); });

  // ---- 書き出し・読みこみ ----
  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "itsu", version: 1, exported: new Date().toISOString(), items: st.items }, null, 1)], { type: "application/json" });
    const a = el("a"); a.href = URL.createObjectURL(blob); a.download = `itsu-${ymd(new Date())}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("ファイルに書き出しました。新しい端末で「ファイルを読み込む」から開いてください。");
  });
  $("import").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; $("move-err").textContent = "";
    if (!f) return;
    try {
      if (f.size > 2e6) throw 0;
      const raw = JSON.parse(await f.text());
      if (raw.app && raw.app !== "itsu") throw 0;
      const v = valid(raw); if (!v || (!v.items.length && raw.items.length)) throw 0;
      const snap = snapshot(); st = v; save(); render();
      toast(`${v.items.length}件の項目を読み込みました。`, snap);
    } catch (x) { $("move-err").textContent = "読み込めませんでした。このアプリで書き出したファイル（.json）を選んでください。"; }
  });

  // ---- トースト ----
  let tT = null, undoSnap = null;
  function toast(msg, snap) {
    $("toast-t").textContent = msg; undoSnap = snap || null;
    $("toast-undo").hidden = !snap; showT(true);
    clearTimeout(tT); tT = setTimeout(() => { showT(false); undoSnap = null; }, snap ? 6000 : 3500);
  }
  // ダイアログの上にも出るよう、使えるときは popover で最前面に出す
  function showT(on) {
    const t = $("toast");
    if (t.showPopover) { try { if (t.matches(":popover-open")) t.hidePopover(); if (on) t.showPopover(); } catch (e) {} }
    t.classList.toggle("on", on);
  }
  $("toast-undo").addEventListener("click", () => {
    if (!undoSnap) return; restore(undoSnap); undoSnap = null;
    showT(false); setTimeout(() => toast("元に戻しました。"), 50);
  });

  render();
  // 日付が変わったら表示を更新する
  let lastDay = ymd(new Date());
  setInterval(() => { const d = ymd(new Date()); if (d !== lastDay) { lastDay = d; render(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
})();
