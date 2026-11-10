// いただきもの帳 — いただいた物・贈った物の記録。お返しの目安（金額・時期）、相手ごとの履歴、お年玉の表。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-okaeshi-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const thisYear = new Date().getFullYear();
  const jp = s => { const d = parseYmd(s); return `${d.getFullYear() !== thisYear ? d.getFullYear() + "年" : ""}${d.getMonth() + 1}月${d.getDate()}日`; };
  const jpFull = s => { const d = parseYmd(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "").trim();
  const today = ymd(new Date());
  const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const yen = n => `${n.toLocaleString("ja-JP")}円`;
  const r100 = n => Math.round(n / 100) * 100;
  function parseYen(v) {
    const s = (v || "").normalize("NFKC").replace(/[,，\s円¥￥]/g, "");
    if (!s) return { ok: true, n: null };
    const m = s.match(/^(\d+(?:\.\d+)?)(万)?$/);
    if (!m) return { ok: false };
    const n = Math.round(Number(m[1]) * (m[2] ? 10000 : 1));
    return n >= 0 && n < 1e9 ? { ok: true, n } : { ok: false };
  }

  // 行事。act はするべきこと、rate はお返しの額の目安があるか、due は日付からの目安日数。
  const EVS = [
    { id: "shussan", label: "出産祝い", act: "内祝い", rate: "half", due: 30, dueL: "生後1か月（お宮参り）のころまで",
      guide: "内祝いは、いただいた額の半分〜3分の1が目安です。生後1か月（お宮参り）のころまでに贈ります。" },
    { id: "kekkon", label: "結婚祝い", act: "内祝い", rate: "half", due: 30, dueL: "いただいてから1か月以内",
      guide: "内祝いは、いただいた額の半分〜3分の1が目安です。いただいてから1か月以内に贈ります。式に招いた方には、引き出物がお返しになります。" },
    { id: "shinchiku", label: "新築祝い", act: "内祝い", rate: "half", due: 30, dueL: "1か月以内",
      guide: "新築内祝いは、半分〜3分の1が目安です。1か月以内に贈ります。新居に招いておもてなしすることで、お返しにする場合もあります。" },
    { id: "omimai", label: "お見舞い", act: "快気祝い", rate: "third", due: 30, dueL: "退院から10日〜1か月ごろ",
      guide: "快気祝いは、いただいた額の3分の1〜半分が目安です。退院や床上げから10日〜1か月ごろに贈ります。" },
    { id: "kouden", label: "香典", act: "香典返し", rate: "half", due: 80, dueL: "四十九日のあと1か月以内",
      guide: "香典返しは、いただいた額の半分〜3分の1が目安です。仏式では、四十九日（忌明け）のあと1か月以内に贈るのが一般的です。葬儀の日にお返しを渡した（即日返し）場合は、高額だった方にだけ、あらためて贈ります。" },
    { id: "iwai", label: "入学・就職祝い", act: "お礼", due: 7, dueL: "なるべく早く",
      guide: "子どもの入学祝いなどは、お返しはしなくてよいとされています。本人からお礼を伝えましょう。就職祝いは、初任給でちょっとした贈り物をする人もいます。" },
    { id: "chugen", label: "お中元", act: "お礼", due: 3, dueL: "届いてから3日以内",
      guide: "お返しは要りません。届いたら、なるべく早く（3日以内が目安）お礼の連絡やお礼状を。" },
    { id: "seibo", label: "お歳暮", act: "お礼", due: 3, dueL: "届いてから3日以内",
      guide: "お返しは要りません。届いたら、なるべく早く（3日以内が目安）お礼の連絡やお礼状を。" },
    { id: "otoshidama", label: "お年玉", act: "お礼", none: true,
      guide: "お返しは要りません。相手にも子どもがいれば、同じくらいの額を渡すことが多いです。" },
    { id: "present", label: "誕生日・プレゼント", act: "お礼", none: true,
      guide: "決まったお返しはありません。お礼を伝えて、相手のお祝いのときに贈る人が多いです。" },
    { id: "temiyage", label: "手土産・おすそわけ", act: "お礼", none: true,
      guide: "お返しは要りません。お礼を伝えれば十分です。" },
    { id: "other", label: "その他", act: "お返し", none: true, guide: "" }
  ];
  const E = Object.fromEntries(EVS.map(e => [e.id, e]));
  const STATES = ["todo", "done", "none"];

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const amt = v => Number.isInteger(v) && v >= 0 && v < 1e9 ? v : null;
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !str(it.who, 30)) return null;
    const dir = it.dir === "out" ? "out" : "in";
    return {
      id: str(it.id, 20) || uid(), dir, ev: E[it.ev] ? it.ev : "other", who: str(it.who, 30), kid: str(it.kid, 20),
      what: str(it.what, 40), amt: amt(it.amt), date: isYmd(it.date) ? it.date : today,
      state: dir === "in" && STATES.includes(it.state) ? it.state : "none",
      retWhat: str(it.retWhat, 40), retAmt: amt(it.retAmt), retDate: isYmd(it.retDate) ? it.retDate : "", note: str(it.note, 300)
    };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, items: raw.items.slice(0, 2000).map(cleanItem).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  // ---------- 目安 ----------
  function amountGuide(it) {
    const e = E[it.ev];
    if (!e.rate || it.amt == null || it.dir !== "in") return null;
    const lo = r100(it.amt / 3), hi = r100(it.amt / 2);
    return `${yen(lo)}〜${yen(hi)}くらい（3分の1〜半分）`;
  }
  function dueInfo(it) {
    const e = E[it.ev];
    if (!e.due) return null;
    const due = addDays(it.date, e.due);
    return { due, left: dayDiff(today, due), label: e.dueL };
  }

  // ---------- タブ ----------
  let pane = "todo";
  function show(p) {
    pane = p;
    ["todo", "all", "people", "nen"].forEach(x => { $(`p-${x}`).hidden = x !== p; const t = $(`t-${x}`); if (x === p) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    render();
  }
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => { show(b.dataset.p); window.scrollTo(0, 0); }));

  // ---------- 札（カード） ----------
  let justId = null;
  function card(it, mode) {
    const e = E[it.ev];
    const li = el("li", `noshi ${it.dir}` + (it.id === justId ? " just" : ""));
    const open = el("button", "open"); open.type = "button";
    open.setAttribute("aria-label", `${it.who}${it.dir === "in" ? "から" : "へ"}の${e.label}を開く`);
    const top = el("span", "n-top");
    top.append(el("span", "n-ev", e.label), el("span", "n-who", it.who), el("span", "n-dir", it.dir === "in" ? "から" : "へ"));
    open.append(top);
    const what = el("p", "n-what");
    const bits = [];
    if (it.what) bits.push(it.what);
    if (it.amt != null) bits.push(yen(it.amt));
    if (it.ev === "otoshidama" && it.kid) bits.push(`${it.kid}に`);
    what.textContent = `${jp(it.date)}${bits.length ? "　" + bits.join("・") : ""}`;
    open.append(what);
    open.addEventListener("click", () => openEdit(it.id));
    li.append(open);
    if (mode === "todo") {
      const d = dueInfo(it);
      if (d) li.append(el("p", "n-due" + (d.left < 0 ? " late" : ""), d.left < 0 ? `${e.act}の目安（${jp(d.due)}ごろ）を過ぎています` : `${e.act}は${jp(d.due)}ごろまでに（あと${d.left}日）`));
      const g = amountGuide(it);
      if (g) { const p = el("p", "n-guide", `${e.act}の目安：`); p.append(el("b", null, g)); li.append(p); }
      const acts = el("div", "n-acts");
      const b = el("button", "btn done", `${e.act === "お礼" ? "お礼をした" : "お返しをした"}`); b.type = "button";
      b.addEventListener("click", () => openEdit(it.id, true));
      acts.append(b); li.append(acts);
    } else if (it.dir === "in") {
      if (it.state === "done") li.append(el("p", "n-ret", `${e.act === "お礼" ? "お礼済み" : "お返し済み"}${it.retWhat ? `：${it.retWhat}` : ""}${it.retAmt != null ? `（${yen(it.retAmt)}）` : ""}`));
      else if (it.state === "todo") li.append(el("p", "n-due", `${e.act}がまだです`));
    }
    return li;
  }

  // ---------- 描画 ----------
  let dirF = "", nenDir = "out";
  function render() {
    const todo = st.items.filter(i => i.dir === "in" && i.state === "todo");
    $("badge").hidden = !todo.length; $("badge").textContent = todo.length;
    if (pane === "todo") renderTodo(todo);
    if (pane === "all") renderAll();
    if (pane === "people") renderPeople();
    if (pane === "nen") renderNen();
    justId = null;
  }
  function renderTodo(todo) {
    const due = it => { const d = dueInfo(it); return d ? d.due : "9999"; };
    todo.sort((a, b) => due(a) < due(b) ? -1 : due(a) > due(b) ? 1 : 0);
    $("todoCnt").textContent = todo.length ? `${todo.length}件` : "";
    $("todoList").replaceChildren(...todo.map(it => card(it, "todo")));
    $("todoEmpty").hidden = !!todo.length;
    const first = !st.items.length;
    $("firstBtns").hidden = !first;
    $("todoEmptyH").textContent = first ? "いただいた物を記録しましょう。" : "お返しがまだの物はありません。";
    $("todoEmptyP").textContent = first ? "行事と金額を入れると、お返しの金額と時期の目安がわかります。贈った物も記録できます。" : "新しくいただいたら、上の「記録する」から控えておきましょう。";
  }
  function renderAll() {
    const q = norm($("q").value);
    let list = st.items.slice();
    if (dirF) list = list.filter(i => i.dir === dirF);
    if (q) list = list.filter(i => norm([i.who, i.kid, i.what, E[i.ev].label, i.note, i.retWhat].join(" ")).includes(q));
    list.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    $("allCnt").textContent = st.items.length ? `${st.items.length}件` : "";
    $("allEmpty").hidden = !!st.items.length;
    $("found").textContent = q || dirF ? (list.length ? `${list.length}件あります。` : "見つかりませんでした。名前、品物、行事で探せます。") : "";
    $("allList").replaceChildren(...list.slice(0, 300).map(it => card(it, "all")));
  }
  $("q").addEventListener("input", render);
  $("dirSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; dirF = b.dataset.v; [...$("dirSeg").children].forEach(x => x.setAttribute("aria-pressed", String(x === b))); render(); });

  function people() {
    const map = new Map();
    st.items.forEach(i => {
      const k = norm(i.who);
      if (!map.has(k)) map.set(k, { name: i.who, items: [], last: "" });
      const p = map.get(k); p.items.push(i);
      if (i.date >= p.last) { p.last = i.date; p.name = i.who; }
    });
    return [...map.values()].sort((a, b) => a.last < b.last ? 1 : -1);
  }
  function renderPeople() {
    const ps = people();
    $("pplCnt").textContent = ps.length ? `${ps.length}人` : "";
    $("pplEmpty").hidden = !!ps.length;
    $("pplList").replaceChildren(...ps.map(p => {
      const li = el("li"); const b = el("button", "pp"); b.type = "button";
      const nIn = p.items.filter(i => i.dir === "in").length, nOut = p.items.filter(i => i.dir === "out").length;
      const nm = el("span", "nm"); nm.append(el("b", null, p.name), el("small", null, [nIn ? `いただいた${nIn}件` : "", nOut ? `贈った${nOut}件` : ""].filter(Boolean).join("・") + `　最後は${jp(p.last)}`));
      b.append(el("span", "ini", [...p.name][0]), nm);
      const t = p.items.filter(i => i.dir === "in" && i.state === "todo").length;
      if (t) b.append(el("span", "todo", `お返しまだ${t}`));
      b.addEventListener("click", () => openPerson(p));
      li.append(b); return li;
    }));
  }
  function openPerson(p) {
    $("pName").textContent = p.name;
    const sumIn = p.items.filter(i => i.dir === "in" && i.amt != null).reduce((s, i) => s + i.amt, 0);
    const sumOut = p.items.filter(i => i.dir === "out" && i.amt != null).reduce((s, i) => s + i.amt, 0) + p.items.filter(i => i.retAmt != null).reduce((s, i) => s + i.retAmt, 0);
    const box = $("pSums"); box.replaceChildren();
    [["いただいた合計", sumIn], ["贈った合計（お返しを含む）", sumOut]].forEach(([k, v]) => { const d = el("div"); d.append(el("small", null, k), el("b", null, yen(v))); box.append(d); });
    box.append(el("p", "sums-note", "金額を入れた記録だけの合計です。"));
    const ev = [];
    p.items.forEach(i => {
      ev.push({ date: i.date, dir: i.dir, i });
      if (i.dir === "in" && i.state === "done" && (i.retWhat || i.retAmt != null || i.retDate)) ev.push({ date: i.retDate || i.date, dir: "out", ret: true, i });
    });
    ev.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.ret ? -1 : 1));
    $("pTl").replaceChildren(...ev.map(x => {
      const li = el("li", x.dir);
      li.append(el("time", null, jpFull(x.date)));
      const e = E[x.i.ev];
      if (x.ret) {
        li.append(el("b", null, `${e.act === "お礼" ? "お礼" : e.act}を贈った`));
        li.append(el("span", "r", [x.i.retWhat, x.i.retAmt != null ? yen(x.i.retAmt) : ""].filter(Boolean).join("・") || "内容の記録なし"));
      } else {
        li.append(el("b", null, `${e.label}を${x.dir === "in" ? "いただいた" : "贈った"}`));
        const d = [x.i.what, x.i.amt != null ? yen(x.i.amt) : "", x.i.kid ? `${x.i.kid}に` : ""].filter(Boolean).join("・");
        if (d) li.append(document.createTextNode(`　${d}`));
        if (x.i.dir === "in" && x.i.state === "todo") li.append(el("span", "r", `${e.act}はまだです`));
      }
      return li;
    }));
    openD($("person"));
  }
  $("pClose").addEventListener("click", () => closeD($("person")));

  function renderNen() {
    const list = st.items.filter(i => i.ev === "otoshidama" && i.dir === nenDir);
    const rowKey = i => nenDir === "out" ? i.who : (i.kid || "（名前なし）");
    const rows = [...new Set(list.map(rowKey))];
    const years = [...new Set(list.map(i => parseYmd(i.date).getFullYear()))].sort((a, b) => b - a);
    $("nenNote").textContent = nenDir === "out" ? "子どもごと、年ごとにあげた額です。" : "受け取った子ごと、年ごとの合計です。誰からかは「記録」で見られます。";
    $("nenEmpty").hidden = !!list.length; $("nenWrap").hidden = !list.length;
    $("nenEmpty").textContent = nenDir === "out" ? "あげたお年玉を記録すると、ここに表ができます。去年いくら渡したか、すぐわかります。" : "もらったお年玉を記録すると、子どもごとの表ができます。";
    const tbl = $("nenTbl"); tbl.replaceChildren();
    if (!list.length) return;
    const sum = (r, y) => list.filter(i => (r == null || rowKey(i) === r) && parseYmd(i.date).getFullYear() === y && i.amt != null).reduce((s, i) => s + i.amt, 0);
    const has = (r, y) => list.some(i => rowKey(i) === r && parseYmd(i.date).getFullYear() === y);
    const thead = el("thead"); const hr = el("tr");
    hr.append(el("th", null, nenDir === "out" ? "あげた子" : "受け取った子"), ...years.map(y => el("th", null, `${y}年`)));
    thead.append(hr);
    const tbody = el("tbody");
    rows.sort((a, b) => a.localeCompare(b, "ja")).forEach(r => {
      const tr = el("tr"); tr.append(el("td", null, r));
      years.forEach(y => { const v = sum(r, y); const td = el("td", has(r, y) ? "yen" : "z", has(r, y) ? yen(v) : "—"); tr.append(td); });
      tbody.append(tr);
    });
    const tfoot = el("tfoot"); const fr = el("tr"); fr.append(el("td", null, "合計"), ...years.map(y => el("td", "yen", yen(sum(null, y))))); tfoot.append(fr);
    tbl.append(thead, tbody, tfoot);
  }
  $("nenSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; nenDir = b.dataset.v; [...$("nenSeg").children].forEach(x => x.setAttribute("aria-pressed", String(x === b))); render(); });
  $("nenAdd").addEventListener("click", () => openEdit(null, false, { ev: "otoshidama", dir: nenDir }));

  // ---------- 記録・編集 ----------
  const openD = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const closeD = d => { if (d.close) d.close(); else d.removeAttribute("open"); };
  $("evChips").replaceChildren(...EVS.map(e => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "ev"; r.value = e.id; l.append(r, el("span", null, e.label)); return l; }));
  $("guideList").replaceChildren(...EVS.filter(e => e.guide).map(e => { const li = el("li"); li.append(el("b", null, e.label), el("span", null, e.guide)); return li; }));
  const radio = n => (document.querySelector(`input[name=${n}]:checked`) || {}).value;
  const setRadio = (n, v) => { document.querySelectorAll(`input[name=${n}]`).forEach(r => { r.checked = r.value === v; }); };
  let editId = null, stateTouched = false;
  function defaultState(ev) { const e = E[ev]; return !e || e.none ? "none" : "todo"; }
  function sync() {
    const dir = radio("dir"), ev = radio("ev"), e = E[ev];
    const nen = ev === "otoshidama";
    $("fWhoL").textContent = dir === "in" ? "誰から" : nen ? "誰に（子どもの名前）" : "誰へ";
    $("fWho").placeholder = dir === "out" && nen ? "はると（姉の子）" : "田中さん（夫の会社）";
    $("fKidF").hidden = !(nen && dir === "in");
    $("fStateF").hidden = dir !== "in";
    $("fStateL").textContent = e ? (e.act === "お礼" ? "お礼" : `お返し（${e.act}）`) : "お返し";
    if (!stateTouched && !editId && ev) setRadio("state", defaultState(ev));
    $("retBox").hidden = !(dir === "in" && radio("state") === "done");
    const tip = $("fTip"); tip.replaceChildren();
    if (e && dir === "in" && e.guide) {
      tip.append(e.guide);
      const a = parseYen($("fAmt").value);
      if (e.rate && a.ok && a.n) { tip.append(el("br"), `${e.act}の目安：`, el("b", null, `${yen(r100(a.n / 3))}〜${yen(r100(a.n / 2))}くらい`)); }
    }
  }
  ["fDir", "fState"].forEach(id => $(id).addEventListener("change", e => { if (id === "fState") stateTouched = true; sync(); }));
  $("evChips").addEventListener("change", sync);
  $("fAmt").addEventListener("input", sync);
  function fillLists() {
    const names = [...new Set(st.items.map(i => i.who))].slice(0, 200);
    $("names").replaceChildren(...names.map(n => { const o = el("option"); o.value = n; return o; }));
    const kids = [...new Set(st.items.map(i => i.kid).filter(Boolean).concat(st.items.filter(i => i.ev === "otoshidama" && i.dir === "out").map(i => i.who)))];
    $("kids").replaceChildren(...kids.map(n => { const o = el("option"); o.value = n; return o; }));
  }
  function openEdit(id, markDone, preset) {
    editId = id; stateTouched = !!id;
    const it = id ? st.items.find(x => x.id === id) : null;
    const p = preset || {};
    $("eH").textContent = it ? (markDone ? (E[it.ev].act === "お礼" ? "お礼をした" : "お返しをした") : "記録を直す") : "記録する";
    setRadio("dir", it ? it.dir : p.dir || "in");
    setRadio("ev", it ? it.ev : p.ev || "");
    $("fWho").value = it ? it.who : ""; $("fKid").value = it ? it.kid : ""; $("fWhat").value = it ? it.what : "";
    $("fAmt").value = it && it.amt != null ? String(it.amt) : ""; $("fDate").value = it ? it.date : today;
    setRadio("state", it ? (markDone ? "done" : it.state) : "todo");
    $("fRetWhat").value = it ? it.retWhat : ""; $("fRetAmt").value = it && it.retAmt != null ? String(it.retAmt) : "";
    $("fRetDate").value = it && it.retDate ? it.retDate : today;
    $("fNote").value = it ? it.note : "";
    $("eDel").hidden = !it;
    $("fErr").textContent = "";
    document.querySelectorAll("#form [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    fillLists(); sync();
    openD($("edit"));
    if (markDone) $("fRetWhat").focus(); else if (!it) $("fWho").focus();
  }
  const fail = (id, msg) => { $("fErr").textContent = msg; const x = $(id); if (x.tagName === "INPUT") x.setAttribute("aria-invalid", "true"); x.focus ? x.focus() : 0; };
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    document.querySelectorAll("#form [aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const ev = radio("ev");
    if (!ev) { $("fErr").textContent = "行事を選んでください（わからなければ「その他」）。"; document.querySelector("input[name=ev]").focus(); return; }
    const who = $("fWho").value.trim();
    if (!who) return fail("fWho", radio("dir") === "in" ? "誰からいただいたかを入れてください。" : "誰へ贈ったかを入れてください。");
    const a = parseYen($("fAmt").value);
    if (!a.ok) return fail("fAmt", "金額は数字で入れてください（例：10000、1万）。");
    if (!isYmd($("fDate").value)) return fail("fDate", "日付を選んでください。");
    const ra = parseYen($("fRetAmt").value);
    if (!$("retBox").hidden && !ra.ok) return fail("fRetAmt", "お返しの金額は数字で入れてください（例：5000）。");
    const snap = snapshot();
    const item = cleanItem({
      id: editId || uid(), dir: radio("dir"), ev, who, kid: $("fKidF").hidden ? "" : $("fKid").value, what: $("fWhat").value, amt: a.n,
      date: $("fDate").value, state: radio("state"), retWhat: $("retBox").hidden ? "" : $("fRetWhat").value, retAmt: $("retBox").hidden ? null : ra.n,
      retDate: $("retBox").hidden ? "" : $("fRetDate").value, note: $("fNote").value
    });
    const was = editId ? st.items.find(i => i.id === editId) : null;
    if (editId) st.items = st.items.map(i => i.id === editId ? item : i); else st.items.push(item);
    save(); justId = item.id; closeD($("edit")); render();
    const e2 = E[item.ev];
    let msg = `${item.who}${item.dir === "in" ? "から" : "へ"}の${e2.label}を保存しました。`;
    if (was && was.state !== "done" && item.state === "done") msg = `${item.who}への${e2.act === "お礼" ? "お礼" : e2.act}、済みにしました。`;
    else if (!was && item.state === "todo") { const d = dueInfo(item); if (d) msg += `${e2.act}は${jp(d.due)}ごろまでが目安です。`; }
    toast(msg, () => { restore(snap); render(); });
  });
  $("eCancel").addEventListener("click", () => closeD($("edit")));
  $("eDel").addEventListener("click", () => {
    const it = st.items.find(x => x.id === editId); const snap = snapshot();
    st.items = st.items.filter(x => x.id !== editId); save(); closeD($("edit")); render();
    toast(`${it.who}の記録を削除しました。`, () => { restore(snap); render(); });
  });
  $("addBtn").addEventListener("click", () => openEdit(null));
  $("firstAdd").addEventListener("click", () => openEdit(null));

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const snap = snapshot();
    const jan = y => `${y}-01-02`;
    [
      { dir: "in", ev: "shussan", who: "佐藤さん（職場）", what: "ベビー服", amt: 10000, date: addDays(today, -12), state: "todo", note: "例として入れた記録です。" },
      { dir: "in", ev: "seibo", who: "山本さん", what: "ハムの詰め合わせ", amt: 5000, date: addDays(today, -1), state: "todo" },
      { dir: "in", ev: "kouden", who: "田中さん", amt: 5000, date: addDays(today, -120), state: "done", retWhat: "お茶のセット", retAmt: 2500, retDate: addDays(today, -60) },
      { dir: "out", ev: "kekkon", who: "鈴木さん", what: "ご祝儀", amt: 30000, date: addDays(today, -200) },
      { dir: "out", ev: "otoshidama", who: "はると", amt: 3000, date: jan(thisYear - 1) },
      { dir: "out", ev: "otoshidama", who: "はると", amt: 5000, date: jan(thisYear) },
      { dir: "out", ev: "otoshidama", who: "めい", amt: 3000, date: jan(thisYear) },
      { dir: "in", ev: "otoshidama", who: "おばあちゃん", kid: "ゆい", amt: 5000, date: jan(thisYear), state: "none" }
    ].forEach(x => st.items.push(cleanItem(x)));
    save(); render();
    toast("例を8件入れました。不要になったら、開いて削除できます。", () => { restore(snap); render(); });
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
    const blob = new Blob([JSON.stringify({ app: "okaeshi", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `okaeshi-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "okaeshi") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.items.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いまの記録を、ファイルの${data.items.length}件と置きかえますか？`)) return;
    const snap = snapshot();
    st = data; save(); render();
    $("moveMsg").textContent = `${data.items.length}件を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  render();
})();
