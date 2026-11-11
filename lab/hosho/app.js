// 保証と説明書の台帳 — 購入日と保証の長さから期限を出し、「もうすぐ切れる」「保証中」「保証切れ」に分ける。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-hosho-v1";
  const SOON = 60; // 期限まで60日以内なら「もうすぐ切れる」
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const jp = s => { const d = parseYmd(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase();
  const today = ymd(new Date());
  const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  // 購入日から n か月の保証 → 前日まで（例：2025年11月10日に買って1年 → 2026年11月9日まで）
  function addMonthsEnd(start, n) {
    const d = parseYmd(start);
    const y = d.getFullYear(), m = d.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    const e = new Date(y, m, Math.min(d.getDate(), last));
    e.setDate(e.getDate() - 1);
    return ymd(e);
  }
  const safeUrl = u => { try { const x = new URL(u); return x.protocol === "https:" && !x.username && !x.password ? x.href : null; } catch (e) { return null; } };

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function cleanW(w, allowNone) {
    if (!w || typeof w !== "object") return { type: allowNone ? "none" : "m", months: 12 };
    if (w.type === "end" && isYmd(w.end)) return { type: "end", end: w.end };
    if (w.type === "m" && Number.isInteger(w.months) && w.months > 0 && w.months <= 600) return { type: "m", months: w.months };
    return { type: "none" };
  }
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !str(it.name, 40)) return null;
    return {
      id: str(it.id, 20) || uid(), name: str(it.name, 40), maker: str(it.maker, 30), model: str(it.model, 40), serial: str(it.serial, 40),
      date: isYmd(it.date) ? it.date : "", price: Number.isInteger(it.price) && it.price >= 0 && it.price < 1e10 ? it.price : null,
      shop: str(it.shop, 40), w: cleanW(it.w, true), x: cleanW(it.x, true), xBy: str(it.xBy, 40),
      phone: str(it.phone, 30), url: safeUrl(str(it.url, 300)) || "", note: str(it.note, 300)
    };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, items: raw.items.slice(0, 500).map(cleanItem).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  // ---------- 期限 ----------
  function endOf(w, date) {
    if (w.type === "end") return w.end;
    if (w.type === "m" && date) return addMonthsEnd(date, w.months);
    return null;
  }
  function status(it) {
    const mEnd = endOf(it.w, it.date), xEnd = endOf(it.x, it.date);
    const ends = [mEnd, xEnd].filter(Boolean).sort();
    const end = ends.length ? ends[ends.length - 1] : null;
    const needDate = !end && ((it.w.type === "m") || (it.x.type === "m"));
    if (!end) return { key: "none", mEnd, xEnd, end, needDate };
    const left = dayDiff(today, end);
    const key = left < 0 ? "over" : left <= SOON ? "soon" : "ok";
    const which = mEnd && mEnd >= today ? "メーカー保証" : xEnd && xEnd >= today ? "延長保証" : (xEnd && xEnd === end ? "延長保証" : "メーカー保証");
    let frac = null;
    if (it.date && end > it.date) frac = Math.min(1, Math.max(0, dayDiff(it.date, today) / dayDiff(it.date, end)));
    return { key, mEnd, xEnd, end, left, which, frac };
  }
  function leftText(s) {
    if (s.key === "over") return { pre: "", big: "保証切れ", small: "" };
    if (s.left === 0) return { pre: "", big: "今日まで", small: s.which };
    if (s.left <= SOON) return { pre: "あと", big: `${s.left}日`, small: s.which };
    const a = parseYmd(today), b = parseYmd(s.end);
    let months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
    if (b.getDate() < a.getDate()) months--;
    const y = Math.floor(months / 12), m = months % 12;
    return { pre: "あと", big: `${y ? `${y}年` : ""}${m ? `${m}か月` : y ? "" : `${s.left}日`}`, small: s.which };
  }
  function stampInto(box, s) {
    const t = leftText(s);
    if (t.pre) box.append(el("small", "pre", t.pre));
    box.append(el("b", t.big.length > 4 ? "long" : null, t.big));
    if (t.small) box.append(el("small", null, t.small));
    box.setAttribute("aria-label", `${t.pre}${t.big}${t.small ? `（${t.small}）` : ""}`);
  }

  // ---------- 一覧 ----------
  const GROUPS = [
    ["soon", "もうすぐ切れる", "保証の期限まで、60日を切った物です。気になる不調は今のうちに。"],
    ["ok", "保証中", ""],
    ["over", "保証切れ", ""],
    ["none", "期限がわからない物", ""]
  ];
  function render() {
    const q = norm($("q").value).trim();
    const has = st.items.length > 0;
    $("empty").hidden = has;
    $("tally").hidden = !has; $("tools").hidden = st.items.length < 4; $("addBtn").hidden = !has;
    const by = { soon: [], ok: [], over: [], none: [] };
    st.items.forEach(it => { const s = status(it); by[s.key].push({ it, s }); });
    $("nSoon").textContent = by.soon.length; $("nOk").textContent = by.ok.length; $("nOver").textContent = by.over.length;
    $("tally").querySelector(".soon").classList.toggle("zero", !by.soon.length);
    const box = $("groups"); box.replaceChildren();
    let hits = 0;
    GROUPS.forEach(([key, title, note]) => {
      let list = by[key];
      if (q) list = list.filter(({ it }) => norm([it.name, it.maker, it.model, it.shop, it.note, it.serial].join(" ")).includes(q));
      if (!list.length) return;
      hits += list.length;
      list.sort((a, b) => key === "over" ? (a.s.end < b.s.end ? 1 : -1) : key === "none" ? a.it.name.localeCompare(b.it.name, "ja") : (a.s.end < b.s.end ? -1 : a.s.end > b.s.end ? 1 : 0));
      const sec = el("section", `grp g-${key}`); sec.id = `g-${key}`;
      const h = el("h2", null, title); h.append(el("span", "cnt", `${list.length}件`));
      sec.append(h);
      if (note && !q) sec.append(el("p", "g-note", note));
      const ul = el("ul", "entries");
      list.forEach(({ it, s }) => {
        const li = el("li");
        const b = el("button", "entry"); b.type = "button";
        const main = el("span", "e-main");
        main.append(el("span", "e-name", it.name));
        const meta = [it.maker, it.model].filter(Boolean).join("・");
        if (meta) main.append(el("span", "e-meta", meta));
        if (s.key === "none") main.append(el("span", "e-meta", s.needDate ? "購入日を入れると、期限がわかります" : "保証の期間が未登録です"));
        else main.append(el("span", "e-meta", `${jp(s.end)}まで`));
        if (s.frac != null && s.key !== "over") { const bar = el("span", "e-bar"); const i = el("i"); i.style.width = `${(1 - s.frac) * 100}%`; bar.append(i); main.append(bar); }
        b.append(main);
        if (s.key !== "none") {
          const stamp = el("span", "e-stamp");
          stampInto(stamp, s);
          b.append(stamp);
        }
        b.addEventListener("click", () => openView(it.id));
        li.append(b); ul.append(li);
      });
      sec.append(ul); box.append(sec);
    });
    $("found").textContent = q ? (hits ? `${hits}件見つかりました。` : "見つかりませんでした。品名、メーカー、型番で探せます。") : "";
  }
  $("q").addEventListener("input", render);

  // ---------- 詳しく ----------
  const vDlg = $("view"), eDlg = $("edit");
  const openD = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const closeD = d => { if (d.close) d.close(); else d.removeAttribute("open"); };
  let viewId = null;
  const yen = n => `${n.toLocaleString("ja-JP")}円`;
  const wText = (w, end) => w.type === "none" ? "なし" : end ? `${jp(end)}まで${w.type === "m" ? `（${w.months % 12 ? `${w.months}か月` : `${w.months / 12}年`}）` : ""}` : `${w.type === "m" ? (w.months % 12 ? `${w.months}か月` : `${w.months / 12}年`) : ""}（購入日が未登録）`;
  function openView(id) {
    const it = st.items.find(x => x.id === id); if (!it) return;
    viewId = id;
    const s = status(it);
    $("vName").textContent = it.name;
    $("vMaker").textContent = it.maker;
    $("vMaker").hidden = !it.maker;
    const stp = $("vStamp"); stp.replaceChildren(); stp.className = `v-stamp k-${s.key}`;
    if (s.key !== "none") stampInto(stp, s);
    else stp.append(el("b", null, "期限が未登録"));
    $("vModel").textContent = it.model;
    $("vModelBox").hidden = !it.model;
    $("copied").textContent = "";
    const dl = $("vDl"); dl.replaceChildren();
    const row = (k, v) => { if (!v) return; const d = el("div"); d.append(el("dt", null, k)); const dd = el("dd"); if (typeof v === "string") dd.textContent = v; else dd.append(v); d.append(dd); dl.append(d); };
    row("製造番号", it.serial);
    row("購入日", it.date ? jp(it.date) : "");
    row("購入店", it.shop);
    row("価格", it.price != null ? yen(it.price) : "");
    row("メーカー保証", wText(it.w, s.mEnd));
    if (it.x.type !== "none") row("延長保証", wText(it.x, s.xEnd) + (it.xBy ? `・${it.xBy}` : ""));
    row("修理の窓口", it.phone);
    const url = safeUrl(it.url);
    if (url) { const a = el("a", null, url); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; row("サポートのページ", a); }
    row("メモ", it.note);
    openD(vDlg);
  }
  async function copy(text, okMsg) {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) {
      try {
        const ta = el("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.className = "offscreen";
        vDlg.append(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
      } catch (e) { ok = false; }
    }
    $("copied").textContent = ok ? okMsg : "コピーできませんでした。型番を長押しして選んでください。";
  }
  $("copyModel").addEventListener("click", () => { const it = st.items.find(x => x.id === viewId); copy(it.model, `「${it.model}」をコピーしました。`); });
  $("copyRepair").addEventListener("click", () => {
    const it = st.items.find(x => x.id === viewId);
    const lines = [["品名", it.name], ["メーカー", it.maker], ["型番", it.model], ["製造番号", it.serial], ["購入日", it.date ? jp(it.date) : ""], ["購入店", it.shop]]
      .filter(([, v]) => v).map(([k, v]) => `${k}：${v}`);
    copy(lines.join("\n"), "品名・型番・購入日などをコピーしました。修理の申し込みフォームに貼り付けられます。");
  });
  $("vClose").addEventListener("click", () => closeD(vDlg));
  $("vEdit").addEventListener("click", () => { closeD(vDlg); openEdit(viewId); });
  $("vDel").addEventListener("click", () => {
    const it = st.items.find(x => x.id === viewId);
    const snap = snapshot();
    st.items = st.items.filter(x => x.id !== viewId); save(); closeD(vDlg); render();
    toast(`「${it.name}」を削除しました。`, () => { restore(snap); render(); });
  });

  // ---------- 登録・編集 ----------
  let editId = null;
  const radio = name => (document.querySelector(`input[name=${name}]:checked`) || {}).value;
  const setRadio = (name, v) => { const r = document.querySelector(`input[name=${name}][value="${v}"]`); if (r) r.checked = true; };
  function syncSeg() {
    const w = radio("w"), x = radio("x");
    $("wMonthsF").hidden = w !== "m"; $("wEndF").hidden = w !== "end";
    $("xEndF").hidden = x !== "end"; $("xMonthsF").hidden = x !== "m"; $("xByF").hidden = x === "none";
  }
  $("wSeg").addEventListener("change", syncSeg);
  $("xSeg").addEventListener("change", syncSeg);
  function openEdit(id) {
    editId = id;
    const it = id ? st.items.find(x => x.id === id) : null;
    $("eH").textContent = it ? "記録を直す" : "登録する";
    $("fName").value = it ? it.name : ""; $("fMaker").value = it ? it.maker : ""; $("fModel").value = it ? it.model : "";
    $("fSerial").value = it ? it.serial : ""; $("fDate").value = it ? it.date : today; $("fPrice").value = it && it.price != null ? String(it.price) : "";
    $("fShop").value = it ? it.shop : ""; $("fPhone").value = it ? it.phone : ""; $("fUrl").value = it ? it.url : ""; $("fNote").value = it ? it.note : "";
    $("fDate").max = today;
    const w = it ? it.w : { type: "m", months: 12 };
    if (w.type === "m" && [12, 36, 60].includes(w.months)) setRadio("w", String(w.months));
    else if (w.type === "m") { setRadio("w", "m"); }
    else setRadio("w", w.type);
    $("wMonths").value = w.type === "m" ? String(w.months) : ""; $("wEnd").value = w.type === "end" ? w.end : "";
    const x = it ? it.x : { type: "none" };
    if (x.type === "m" && [36, 60, 120].includes(x.months)) setRadio("x", String(x.months));
    else if (x.type === "m") { setRadio("x", "m"); }
    else setRadio("x", x.type);
    $("xMonths").value = x.type === "m" ? String(x.months) : "";
    $("xEnd").value = x.type === "end" ? x.end : x.type === "m" && it && it.date ? addMonthsEnd(it.date, x.months) : "";
    $("xBy").value = it ? it.xBy : "";
    $("fErr").textContent = "";
    document.querySelectorAll("#form [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    syncSeg();
    openD(eDlg); $("fName").focus();
  }
  const fail = (id, msg) => { $("fErr").textContent = msg; $(id).setAttribute("aria-invalid", "true"); $(id).focus(); };
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    document.querySelectorAll("#form [aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const name = $("fName").value.trim();
    if (!name) return fail("fName", "品名を入れてください（例：ドラム式洗濯機）。");
    const date = $("fDate").value;
    if (date && !isYmd(date)) return fail("fDate", "購入日を選び直してください。");
    const pRaw = norm($("fPrice").value).replace(/[,\s円¥￥]/g, "");
    if (pRaw && !/^\d{1,10}$/.test(pRaw)) return fail("fPrice", "価格は数字だけで入れてください（例：198000）。");
    let w;
    const wr = radio("w");
    if (wr === "none") w = { type: "none" };
    else if (wr === "end") { if (!isYmd($("wEnd").value)) return fail("wEnd", "メーカー保証の終了日を選んでください。"); w = { type: "end", end: $("wEnd").value }; }
    else if (wr === "m") { const n = parseInt(norm($("wMonths").value), 10); if (!(n > 0 && n <= 600)) return fail("wMonths", "保証の月数を数字で入れてください（例：18）。"); w = { type: "m", months: n }; }
    else w = { type: "m", months: Number(wr) };
    let x;
    const xr = radio("x");
    if (xr === "none") x = { type: "none" };
    else if (xr === "end") { if (!isYmd($("xEnd").value)) return fail("xEnd", "延長保証の終了日を選んでください。"); x = { type: "end", end: $("xEnd").value }; }
    else if (xr === "m") { const n = parseInt(norm($("xMonths").value), 10); if (!(n > 0 && n <= 600)) return fail("xMonths", "延長保証の月数を数字で入れてください（例：96）。"); x = { type: "m", months: n }; }
    else x = { type: "m", months: Number(xr) };
    if ((w.type === "m" || x.type === "m") && !date) return fail("fDate", "保証の期限を出すには、購入日が要ります。");
    const urlRaw = $("fUrl").value.trim();
    const url = urlRaw ? safeUrl(urlRaw) : "";
    if (urlRaw && !url) return fail("fUrl", "サポートのページは「https://」で始まるアドレスを入れてください。");
    const item = cleanItem({
      id: editId || uid(), name, maker: $("fMaker").value, model: $("fModel").value, serial: $("fSerial").value, date,
      price: pRaw ? Number(pRaw) : null, shop: $("fShop").value, w, x, xBy: xr === "none" ? "" : $("xBy").value,
      phone: norm($("fPhone").value), url, note: $("fNote").value
    });
    if (editId) st.items = st.items.map(i => i.id === editId ? item : i); else st.items.push(item);
    save(); closeD(eDlg); render();
    const s = status(item);
    toast(s.key === "none" ? `「${item.name}」を保存しました。` : s.key === "over" ? `「${item.name}」を保存しました。保証は${jp(s.end)}で切れています。` : `「${item.name}」を保存しました。保証は${jp(s.end)}までです。`);
  });
  $("eCancel").addEventListener("click", () => closeD(eDlg));
  $("addBtn").addEventListener("click", () => openEdit(null));
  $("firstAdd").addEventListener("click", () => openEdit(null));
  $("sample").addEventListener("click", () => {
    const ago = (y, m, d) => { const t = new Date(); t.setFullYear(t.getFullYear() - y, t.getMonth() - m, t.getDate() - d); return ymd(t); };
    st.items = [
      { name: "電子レンジ", maker: "東芝", model: "ER-SAMPLE1", date: ago(0, 11, -20), shop: "近所の家電量販店", price: 32800, w: { type: "m", months: 12 }, x: { type: "none" }, phone: "0120-000-000", note: "例として入れた記録です。" },
      { name: "ドラム式洗濯機", maker: "パナソニック", model: "NA-SAMPLE2", serial: "1234567890", date: ago(2, 3, 0), shop: "家電量販店", price: 218000, w: { type: "m", months: 12 }, x: { type: "m", months: 60 }, xBy: "購入店の長期保証", note: "保証書は台所の引き出し。" },
      { name: "エアコン（寝室）", maker: "ダイキン", model: "AN-SAMPLE3", date: ago(6, 0, 0), shop: "工務店", w: { type: "m", months: 12 }, x: { type: "none" } }
    ].map(cleanItem);
    save(); render();
    toast("例を3件入れました。不要になったら、開いて削除できます。");
  });

  // ---------- お知らせ ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "hosho", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `hosho-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "hosho") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.items.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いまの台帳を、ファイルの${data.items.length}件と置きかえますか？`)) return;
    const snap = snapshot();
    st = data; save(); render();
    $("moveMsg").textContent = `${data.items.length}件を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  render();
})();
