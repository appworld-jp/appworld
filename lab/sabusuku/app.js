// サブスク棚卸し — 定期的な支払いを並べ、月と年の合計、あまり使っていない物、14日以内の支払い、やめたときの差額を出す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-sabusuku-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const WD = "日月火水木金土";
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const jp = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase().trim();
  const today = ymd(new Date());
  const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  function addMonthsKeep(s, n, day) {
    const d = parseYmd(s);
    const y = d.getFullYear(), m = d.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(day || d.getDate(), last)));
  }
  const yen = n => `${Math.round(n).toLocaleString("ja-JP")}円`;
  function parseNum(v) {
    const s = (v || "").normalize("NFKC").replace(/[,，\s円¥￥]/g, "");
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }

  const CATS = [
    { id: "video", label: "動画", color: "#E5484D", kw: ["netflix", "ネットフリックス", "hulu", "u-next", "unext", "ディズニー", "disney", "プライム", "prime", "dazn", "abema", "youtube", "lemino", "fod", "telasa", "dアニメ", "アニメ"] },
    { id: "music", label: "音楽", color: "#8E4EC6", kw: ["spotify", "apple music", "amazon music", "line music", "awa", "音楽", "ミュージック"] },
    { id: "book", label: "本・マンガ", color: "#D6409F", kw: ["kindle", "audible", "オーディブル", "マガジン", "ジャンプ", "楽天マガジン", "dマガジン", "マンガ", "漫画", "コミック", "雑誌"] },
    { id: "game", label: "ゲーム", color: "#3E63DD", kw: ["switch", "nintendo", "playstation", "ps plus", "xbox", "game pass", "ゲーム", "スイッチ"] },
    { id: "cloud", label: "クラウド・アプリ", color: "#0090FF", kw: ["icloud", "google one", "dropbox", "microsoft", "office", "adobe", "notion", "chatgpt", "claude", "evernote", "1password", "canva", "アプリ", "クラウド"] },
    { id: "learn", label: "ニュース・学習", color: "#12A594", kw: ["新聞", "日経", "ニュース", "学習", "英会話", "duolingo", "スタディ", "講座", "塾", "通信教育"] },
    { id: "net", label: "通信", color: "#46A758", kw: ["スマホ", "携帯", "docomo", "ドコモ", "au", "softbank", "ソフトバンク", "楽天モバイル", "ahamo", "povo", "linemo", "光", "wi-fi", "wifi", "ネット", "回線", "プロバイダ"] },
    { id: "ins", label: "保険", color: "#978365", kw: ["保険", "共済"] },
    { id: "gym", label: "習いごと・ジム", color: "#F76B15", kw: ["ジム", "フィットネス", "ヨガ", "教室", "レッスン", "スイミング", "習い"] },
    { id: "life", label: "暮らし・会員", color: "#FFC53D", kw: ["会員", "コストコ", "宅配", "生協", "ウォーター", "水", "nhk", "受信料", "家賃", "駐車場"] },
    { id: "other", label: "その他", color: "#8B8D98", kw: [] }
  ];
  const C = Object.fromEntries(CATS.map(c => [c.id, c]));
  // 自分で入れた種類は cat を "other" にして、名前を catL に持つ。色は「その他」と同じ灰色。
  const catLabel = it => it.catL || C[it.cat].label;
  const guessCat = name => { const n = norm(name); const c = CATS.find(c => c.kw.some(k => n.includes(k))); return c ? c.id : "other"; };
  const SERVICES = ["Netflix", "Amazonプライム", "Disney+", "U-NEXT", "Hulu", "DAZN", "ABEMAプレミアム", "YouTube Premium", "Spotify", "Apple Music", "Amazon Music Unlimited", "Kindle Unlimited", "Audible", "Nintendo Switch Online", "PlayStation Plus", "iCloud+", "Google One", "Microsoft 365", "Adobe Creative Cloud", "スマホ代", "光回線", "生命保険", "スポーツジム", "NHK受信料", "新聞"];
  const PAYS = ["クレジットカード", "デビットカード", "口座振替", "キャリア決済", "App Store", "Google Play", "PayPay"];
  $("svc").replaceChildren(...SERVICES.map(s => { const o = el("option"); o.value = s; return o; }));

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !str(it.name, 30)) return null;
    const cyc = ["m", "y", "n", "w"].includes(it.cyc) ? it.cyc : "m";
    return {
      id: str(it.id, 20) || uid(), name: str(it.name, 30),
      price: typeof it.price === "number" && isFinite(it.price) && it.price >= 0 && it.price < 1e8 ? Math.round(it.price * 100) / 100 : 0,
      cyc, n: cyc === "n" && Number.isInteger(it.n) && it.n >= 2 && it.n <= 60 ? it.n : cyc === "n" ? 3 : 1,
      next: isYmd(it.next) ? it.next : "", day: Number.isInteger(it.day) && it.day >= 1 && it.day <= 31 ? it.day : 0,
      pay: str(it.pay, 30), cat: C[it.cat] ? it.cat : "other", catL: !C[it.cat] || it.cat === "other" ? str(it.catL, 20) : "", star: [1, 2, 3].includes(it.star) ? it.star : 3,
      note: str(it.note, 300), off: !!it.off, offDate: isYmd(it.offDate) ? it.offDate : ""
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
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  // ---------- 計算 ----------
  const perMonth = it => it.cyc === "m" ? it.price : it.cyc === "y" ? it.price / 12 : it.cyc === "n" ? it.price / it.n : it.price * 52 / 12;
  const perYear = it => it.cyc === "m" ? it.price * 12 : it.cyc === "y" ? it.price : it.cyc === "n" ? it.price * 12 / it.n : it.price * 52;
  const cycText = it => it.cyc === "m" ? "毎月" : it.cyc === "y" ? "毎年" : it.cyc === "n" ? `${it.n}か月ごと` : "毎週";
  function step(it, s) {
    if (it.cyc === "w") return addDays(s, 7);
    const months = it.cyc === "m" ? 1 : it.cyc === "y" ? 12 : it.n;
    return addMonthsKeep(s, months, it.day);
  }
  // 支払日が過ぎていたら、次の支払日まで進める
  function rollForward() {
    let changed = false;
    st.items.forEach(it => {
      if (it.off || !it.next) return;
      let guard = 0;
      while (it.next < today && guard++ < 600) { it.next = step(it, it.next); changed = true; }
    });
    if (changed) save();
  }

  // ---------- 描画 ----------
  let sortBy = "price", wi = false;
  const picked = new Set();
  let tickTot = false;
  function row(it, opts) {
    const li = el("li"); if (wi && picked.has(it.id)) li.classList.add("cut");
    const b = el("button", "it"); b.type = "button";
    const nm = el("span", "nm"); nm.append(el("span", null, it.name));
    const stc = el("span", `st s${it.star}`, "★".repeat(it.star)); stc.setAttribute("aria-label", `使っている度${it.star}`); nm.append(stc);
    b.append(nm, el("span", "pm", it.off ? `年${yen(perYear(it))}` : `月${yen(perMonth(it))}`));
    const meta = el("span", "meta");
    const tag = el("span", "tag", catLabel(it)); tag.style.borderColor = C[it.cat].color; tag.style.boxShadow = `inset 4px 0 0 ${C[it.cat].color}`;
    meta.append(tag, ` ${it.off ? `${it.offDate ? md(it.offDate) + "に" : ""}解約` : it.next ? `次は${jp(it.next)}` : "支払日は未登録"}${it.pay ? `・${it.pay}` : ""}`);
    b.append(meta, el("span", "raw", it.cyc === "m" ? "" : `${cycText(it)}${yen(it.price)}`));
    b.addEventListener("click", () => openEdit(it.id));
    li.append(b);
    if (wi && !it.off && !(opts && opts.noPick)) {
      const lab = el("label", "pick"); const cb = el("input"); cb.type = "checkbox"; cb.checked = picked.has(it.id);
      cb.setAttribute("aria-label", `${it.name}をやめたら`);
      cb.addEventListener("change", () => { if (cb.checked) picked.add(it.id); else picked.delete(it.id); render(); });
      lab.append(cb); li.append(lab);
    }
    return li;
  }
  function render() {
    rollForward();
    const act = st.items.filter(i => !i.off), off = st.items.filter(i => i.off);
    const has = act.length > 0;
    $("empty").hidden = has || off.length > 0; $("receipt").hidden = !has && !off.length;
    $("addBtn").hidden = (!has && !off.length) || wi;
    $("wiBtn").hidden = act.length < 2;
    document.body.classList.toggle("wi", wi);
    $("wiBtn").setAttribute("aria-pressed", String(wi));
    $("wiBtn").textContent = wi ? "見直しを終える" : "やめたら、いくら浮く？";
    // 合計
    const m = act.reduce((s, i) => s + perMonth(i), 0), y = act.reduce((s, i) => s + perYear(i), 0);
    $("totM").textContent = yen(m); $("totY").textContent = yen(y);
    if (tickTot) { $("totM").classList.remove("tick"); void $("totM").offsetWidth; $("totM").classList.add("tick"); tickTot = false; }
    const offY = off.reduce((s, i) => s + perYear(i), 0);
    $("totSub").textContent = has ? `${act.length}件。${y >= 12000 ? `1日あたり約${yen(y / 365)}です。` : ""}${off.length ? `やめた${off.length}件で、年${yen(offY)}浮いています。` : ""}` : off.length ? `いま払っている物はありません。やめた${off.length}件で、年${yen(offY)}浮いています。` : "";
    const bar = $("bar"); bar.replaceChildren(); const lg = $("legend"); lg.replaceChildren();
    const groups = new Map();
    act.forEach(i => { const k = catLabel(i); if (!groups.has(k)) groups.set(k, { c: { label: k, color: C[i.cat].color }, v: 0 }); groups.get(k).v += perMonth(i); });
    const byCat = [...groups.values()].filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    byCat.forEach(({ c, v }) => {
      const i = el("i"); i.style.background = c.color; i.style.flex = String(v); bar.append(i);
      const li = el("li"); const sw = el("i"); sw.style.background = c.color; li.append(sw, `${c.label} `, el("b", null, yen(v))); lg.append(li);
    });
    bar.hidden = !byCat.length;
    // 14日以内
    const soon = act.filter(i => i.next && dayDiff(today, i.next) <= 14).sort((a, b) => a.next < b.next ? -1 : 1);
    $("soonSec").hidden = !soon.length;
    $("soonList").replaceChildren(...soon.map(it => {
      const left = dayDiff(today, it.next);
      const li = el("li", left === 0 ? "today" : null);
      li.append(el("span", "d", md(it.next)), el("span", "w", left === 0 ? "今日" : left === 1 ? "明日" : `${WD[parseYmd(it.next).getDay()]}曜・あと${left}日`), el("span", "n", it.name), el("span", "p", yen(it.price)));
      return li;
    }));
    // あまり使っていない
    const cand = act.filter(i => i.star === 1).sort((a, b) => perMonth(b) - perMonth(a));
    $("candSec").hidden = !cand.length;
    const cy = cand.reduce((s, i) => s + perYear(i), 0);
    $("candNote").textContent = `「あまり使っていない」にした物です。全部やめると、年${yen(cy)}浮きます。`;
    $("candList").replaceChildren(...cand.map(it => row(it)));
    $("candPick").hidden = cand.length < 1 || (wi && cand.every(i => picked.has(i.id)));
    // すべて
    $("allSec").hidden = !has;
    $("allCnt").textContent = `${act.length}件`;
    $("q").hidden = act.length < 8;
    const q = norm($("q").value);
    let list = act.filter(i => !q || norm([i.name, i.pay, catLabel(i), i.note].join(" ")).includes(q));
    if (sortBy === "price") list.sort((a, b) => perMonth(b) - perMonth(a));
    else if (sortBy === "date") list.sort((a, b) => (a.next || "9999") < (b.next || "9999") ? -1 : 1);
    else list.sort((a, b) => CATS.findIndex(c => c.id === a.cat) - CATS.findIndex(c => c.id === b.cat) || (a.catL || "").localeCompare(b.catL || "", "ja") || perMonth(b) - perMonth(a));
    $("allList").replaceChildren(...list.map(it => row(it)));
    // やめた物
    $("offBox").hidden = !off.length;
    $("offSum").textContent = `やめた物（${off.length}件・年${yen(offY)}浮いています）`;
    $("offList").replaceChildren(...off.map(it => row(it, { noPick: true })));
    // 見直し
    [...picked].forEach(id => { if (!act.some(i => i.id === id)) picked.delete(id); });
    $("saveBar").hidden = !wi;
    const pm = act.filter(i => picked.has(i.id)).reduce((s, i) => s + perMonth(i), 0), py = act.filter(i => picked.has(i.id)).reduce((s, i) => s + perYear(i), 0);
    const t = $("saveTxt"); t.replaceChildren();
    if (!picked.size) t.append("やめてもいい物にチェックを入れてください。");
    else t.append(`${picked.size}件やめると、毎月 `, el("b", null, yen(pm)), "、1年で ", el("b", null, yen(py)), " 浮きます。");
    $("saveOff").hidden = !picked.size;
  }
  $("q").addEventListener("input", render);
  $("sortSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sortBy = b.dataset.v; [...$("sortSeg").children].forEach(x => x.setAttribute("aria-pressed", String(x === b))); render(); });
  $("wiBtn").addEventListener("click", () => { wi = !wi; if (!wi) picked.clear(); render(); if (wi) $("allH").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
  $("saveClose").addEventListener("click", () => { wi = false; picked.clear(); render(); });
  $("candPick").addEventListener("click", () => { wi = true; st.items.filter(i => !i.off && i.star === 1).forEach(i => picked.add(i.id)); render(); });
  $("saveOff").addEventListener("click", () => {
    const ids = [...picked]; if (!ids.length) return;
    if (!confirm(`選んだ${ids.length}件を「解約した物」にしますか？ 合計から外れます。解約の手続きは、それぞれのサービスで行ってください。`)) return;
    const snap = snapshot();
    st.items.forEach(i => { if (ids.includes(i.id)) { i.off = true; i.offDate = today; } });
    save(); wi = false; picked.clear(); tickTot = true; render();
    toast(`${ids.length}件を解約した物にしました。`, () => { restore(snap); render(); });
  });

  // ---------- 追加・編集 ----------
  const openD = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const closeD = d => { if (d.close) d.close(); else d.removeAttribute("open"); };
  const radio = n => (document.querySelector(`input[name=${n}]:checked`) || {}).value;
  const setRadio = (n, v) => document.querySelectorAll(`input[name=${n}]`).forEach(r => { r.checked = r.value === String(v); });
  // 種類のチップ。自分で入れた種類は値を "~名前" にする。
  const catChip = (value, label, color) => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "cat"; r.value = value; const s = el("span"); const i = el("i"); i.style.background = color; s.append(i, label); l.append(r, s); return l; };
  const catFree = window.FreeChoice({
    key: KEY + ".custom", set: "cat", label: "種類", max: 20, placeholder: "車、ペット、寄付",
    builtins: () => CATS.map(c => ({ value: c.id, label: c.label })),
    onChange: () => renderCats(radio("cat")),
    onPick: v => { catTouched = true; renderCats(C[v] ? v : "~" + v); }
  });
  let catExtra = "";
  function renderCats(sel) {
    const own = catFree.values();
    if (catExtra && !own.includes(catExtra)) own.push(catExtra);
    $("catSeg").replaceChildren(...CATS.map(c => catChip(c.id, c.label, c.color)),
      ...own.map(v => { const ch = catChip("~" + v, v, C.other.color); return catFree.values().includes(v) ? catFree.wrap(ch, v) : ch; }), catFree.root);
    if (sel) setRadio("cat", sel);
  }
  let editId = null, catTouched = false;
  function syncForm() {
    $("fNF").hidden = radio("cyc") !== "n";
    const p = parseNum($("fPrice").value), n = parseInt(norm($("fN").value), 10);
    const tmp = { price: p, cyc: radio("cyc"), n: n >= 2 ? n : 3 };
    $("fCalc").textContent = p != null && p > 0 && tmp.cyc !== "m" ? `1か月あたり ${yen(perMonth(tmp))}／1年で ${yen(perYear(tmp))}` : p != null && p > 0 ? `1年で ${yen(perYear(tmp))}` : "";
  }
  ["fPrice", "fN"].forEach(id => $(id).addEventListener("input", syncForm));
  $("cycSeg").addEventListener("change", syncForm);
  $("catSeg").addEventListener("change", () => { catTouched = true; });
  $("fName").addEventListener("input", () => { if (!catTouched && !editId) setRadio("cat", guessCat($("fName").value)); });
  function fillPays() {
    const mine = [...new Set(st.items.map(i => i.pay).filter(Boolean))];
    $("pays").replaceChildren(...[...mine, ...PAYS.filter(p => !mine.includes(p))].map(p => { const o = el("option"); o.value = p; return o; }));
  }
  function openEdit(id) {
    editId = id; catTouched = !!id;
    const it = id ? st.items.find(x => x.id === id) : null;
    $("eH").textContent = it ? "編集する" : "追加する";
    $("fName").value = it ? it.name : ""; $("fPrice").value = it ? String(it.price) : "";
    $("fNext").value = it ? it.next : ""; setRadio("cyc", it ? it.cyc : "m"); $("fN").value = it && it.cyc === "n" ? String(it.n) : "";
    setRadio("star", it ? it.star : 3);
    catExtra = it && it.catL ? it.catL : ""; catFree.close();
    renderCats(it ? (it.catL ? "~" + it.catL : it.cat) : "other");
    $("fPay").value = it ? it.pay : ""; $("fNote").value = it ? it.note : "";
    $("eMore").hidden = !it; $("eOff").textContent = it && it.off ? "また払い始めた" : "解約した";
    $("fErr").textContent = "";
    document.querySelectorAll("#form [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    fillPays(); syncForm();
    openD($("edit"));
    if (!it) $("fName").focus();
  }
  const fail = (id, msg) => { $("fErr").textContent = msg; $(id).setAttribute("aria-invalid", "true"); $(id).focus(); };
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    document.querySelectorAll("#form [aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const name = $("fName").value.trim();
    if (!name) return fail("fName", "名前を入れてください（例：Netflix）。");
    const price = parseNum($("fPrice").value);
    if (price == null) return fail("fPrice", "金額を数字で入れてください（例：1590）。");
    const cyc = radio("cyc");
    let n = 1;
    if (cyc === "n") { n = parseInt(norm($("fN").value), 10); if (!(n >= 2 && n <= 60)) return fail("fN", "何か月ごとかを、2〜60の数字で入れてください。"); }
    const next = $("fNext").value;
    if (next && !isYmd(next)) return fail("fNext", "次の支払日を選び直してください。");
    const old = editId ? st.items.find(i => i.id === editId) : null;
    const snap = snapshot();
    const item = cleanItem({ id: editId || uid(), name, price, cyc, n, next, day: next ? parseYmd(next).getDate() : 0, pay: $("fPay").value, cat: (radio("cat") || "")[0] === "~" ? "other" : radio("cat"), catL: (radio("cat") || "")[0] === "~" ? radio("cat").slice(1) : "", star: Number(radio("star")), note: $("fNote").value, off: old ? old.off : false, offDate: old ? old.offDate : "" });
    if (editId) st.items = st.items.map(i => i.id === editId ? item : i); else st.items.push(item);
    save(); tickTot = true; closeD($("edit")); render();
    toast(`${item.name}を保存しました。${item.off ? "" : `1か月あたり${yen(perMonth(item))}です。`}`, () => { restore(snap); render(); });
  });
  $("eCancel").addEventListener("click", () => closeD($("edit")));
  $("eOff").addEventListener("click", () => {
    const it = st.items.find(i => i.id === editId); const snap = snapshot();
    it.off = !it.off; it.offDate = it.off ? today : "";
    save(); tickTot = true; closeD($("edit")); render();
    toast(it.off ? `${it.name}を解約した物にしました。年${yen(perYear(it))}浮きます。` : `${it.name}を戻しました。`, () => { restore(snap); render(); });
  });
  $("eDel").addEventListener("click", () => {
    const it = st.items.find(i => i.id === editId); const snap = snapshot();
    st.items = st.items.filter(i => i.id !== editId); save(); tickTot = true; closeD($("edit")); render();
    toast(`${it.name}を削除しました。`, () => { restore(snap); render(); });
  });
  $("addBtn").addEventListener("click", () => openEdit(null));
  $("firstAdd").addEventListener("click", () => openEdit(null));

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const snap = snapshot();
    const nx = d => addDays(today, d);
    [
      { name: "動画の配信サービス", price: 1590, cyc: "m", next: nx(4), pay: "クレジットカード", cat: "video", star: 3, note: "例として入れた記録です。" },
      { name: "音楽の配信サービス", price: 1080, cyc: "m", next: nx(12), pay: "クレジットカード", cat: "music", star: 3 },
      { name: "通販の会員", price: 5900, cyc: "y", next: nx(80), pay: "クレジットカード", cat: "life", star: 2 },
      { name: "マンガの読み放題", price: 980, cyc: "m", next: nx(20), pay: "App Store", cat: "book", star: 1 },
      { name: "スポーツジム", price: 7700, cyc: "m", next: nx(1), pay: "口座振替", cat: "gym", star: 1 },
      { name: "写真のクラウド保存", price: 400, cyc: "m", next: nx(9), pay: "App Store", cat: "cloud", star: 3 },
      { name: "スマホ代", price: 2980, cyc: "m", next: nx(17), pay: "クレジットカード", cat: "net", star: 3 }
    ].forEach(x => { const it = cleanItem(x); it.day = parseYmd(it.next).getDate(); st.items.push(it); });
    save(); tickTot = true; render();
    toast("例を7件入れました。不要になったら、開いて削除できます。", () => { restore(snap); render(); });
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
    const blob = new Blob([JSON.stringify({ app: "sabusuku", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `sabusuku-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "sabusuku") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.items.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いまの記録を、ファイルの${data.items.length}件と置きかえますか？`)) return;
    const snap = snapshot();
    st = data; save(); render();
    $("moveMsg").textContent = `${data.items.length}件を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  render();
})();
