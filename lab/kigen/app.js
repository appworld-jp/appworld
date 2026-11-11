// 更新日まとめ帳 — 書類や契約の期限を控え、「そろそろ準備」「まだ先」「期限切れ」に分ける。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-kigen-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const WD = "日月火水木金土";
  const jp = s => { const d = parseYmd(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
  const jpShort = s => { const d = parseYmd(s); const y = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}年` : ""; return `${y}${d.getMonth() + 1}月${d.getDate()}日`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase().trim();
  const today = ymd(new Date());
  const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  function addMonths(s, n) {
    const d = parseYmd(s);
    const y = d.getFullYear(), m = d.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    return ymd(new Date(y, m, Math.min(d.getDate(), last)));
  }

  // 種類。prep は準備を始める日数の初期値、from は「期限の何か月前から手続きできるか」、cycle は更新後の年数の候補。
  const KINDS = [
    { id: "menkyo", label: "運転免許証", dateL: "免許証の有効期限", prep: 60, cycle: [5, 3], from: 2, window: true,
      info: "免許の更新は、誕生日の前後1か月のあいだにできます。免許証に書いてある有効期限（誕生日の1か月後）を入れると、更新できる期間を表示します。" },
    { id: "passport", label: "パスポート", dateL: "有効期間満了日", prep: 180, cycle: [10, 5], from: 12,
      info: "残りの有効期間が1年を切ると、新しいパスポートに切り替えられます。行き先によっては、入国時に残り6か月以上などの有効期間が必要です。" },
    { id: "mynumber", label: "マイナンバーカード", dateL: "カードの有効期限", prep: 90, cycle: [10, 5], from: 3,
      info: "カードの有効期限は、18歳以上なら発行から10回目の誕生日です。電子証明書（コンビニでの証明書の受け取りや、保険証として使う部分）は5回目の誕生日で切れ、カードとは別に更新します。どちらも期限の3か月前から手続きできます。" },
    { id: "denshi", label: "マイナンバーカードの電子証明書", dateL: "電子証明書の有効期限", prep: 90, cycle: [5], from: 3,
      info: "電子証明書は、発行から5回目の誕生日で切れます。カード本体の期限とは別です。期限の3か月前から、市区町村の窓口で更新できます。" },
    { id: "zairyu", label: "在留カード・在留期間", dateL: "在留期間の満了日", prep: 90, cycle: [1, 3, 5], from: 3,
      info: "在留期間の更新は、満了日のおおむね3か月前から申請できます。永住者の方は、カードの有効期限を入れてください（カードの更新は期限の2か月前からです）。" },
    { id: "shaken", label: "車検", dateL: "車検の満了日", prep: 60, cycle: [2, 3, 1], from: 2,
      info: "車検証に書いてある有効期間の満了日を入れてください。満了日の2か月前から受けても、次の満了日は変わりません。" },
    { id: "jibai", label: "自賠責保険", dateL: "保険期間の終わりの日", prep: 30, cycle: [2, 1, 3],
      info: "車検のある車は、車検と一緒に更新するのが一般的です。車検のない原付や250cc以下のバイクは、自分で更新します。切れたまま運転することはできません。" },
    { id: "kasai", label: "火災保険・地震保険", dateL: "満期日", prep: 60, cycle: [1, 5],
      info: "満期の案内が届いたら、補償の内容や保険料を見直すよい機会です。" },
    { id: "jidosha", label: "自動車保険", dateL: "満期日", prep: 45, cycle: [1],
      info: "ほかの保険会社に乗り換えるなら、見積もりは満期の1か月以上前から始めると落ち着いて比べられます。" },
    { id: "chintai", label: "賃貸の契約", dateL: "契約の満了日", prep: 90, cycle: [2],
      info: "更新の案内は、1〜3か月前に届くことが多いです。引っ越すなら、解約予告の期限（1か月前など）を契約書で確認してください。" },
    { id: "phone", label: "スマホの契約", dateL: "更新月・契約の期限", prep: 30, cycle: [2, 1],
      info: "違約金なしで解約や乗り換えができる月を入れておくと、見直しの時期を逃しません。" },
    { id: "card", label: "クレジットカード", dateL: "カードの有効期限", prep: 30, cycle: [5],
      info: "新しいカードは、期限の前の月ごろに届くことが多いです。届いたら、公共料金やサブスクに登録しているカード情報も更新してください。" },
    { id: "domain", label: "ドメイン", dateL: "有効期限", prep: 30, cycle: [1],
      info: "自動更新にしていても、登録したカードの期限切れで止まることがあります。" },
    { id: "other", label: "その他", dateL: "期限の日", prep: 30, cycle: [1, 2, 3, 5], info: "" }
  ];
  const K = Object.fromEntries(KINDS.map(k => [k.id, k]));
  // 自分で入れた種類は kind を "other" にして、名前を kindL に持つ。
  const kindLabel = it => it.kindL || K[it.kind].label;
  const PREPS = [[14, "2週間前"], [30, "1か月前"], [60, "2か月前"], [90, "3か月前"], [180, "半年前"], [365, "1年前"]];
  // 準備の時期は「10日前」「6週間前」「4か月前」のように自分でも入れられる
  function parsePrep(t) {
    const m = String(t).normalize("NFKC").replace(/\s+/g, "").replace(/前$/, "").match(/^(\d{1,3})(日|週|週間|か月|ヶ月|カ月|ケ月|ヵ月|箇月|月|年)?$/);
    if (!m) return null;
    const n = Number(m[1]), u = m[2] || "日";
    const d = u === "日" ? n : u[0] === "週" ? n * 7 : u === "年" ? n * 365 : n * 30;
    return d >= 1 && d <= 730 ? { d, label: `${n}${u === "日" ? "日" : u[0] === "週" ? "週間" : u === "年" ? "年" : "か月"}前` } : null;
  }
  const ownPreps = () => prepFree.values().map(v => [parsePrep(v), v]).filter(x => x[0]).map(([p, v]) => [p.d, v]);
  const prepText = d => (PREPS.find(p => p[0] === d) || ownPreps().find(p => p[0] === d) || [0, `${d}日前`])[1];

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !isYmd(it.date)) return null;
    const kind = K[it.kind] ? it.kind : "other";
    const kindL = kind === "other" ? str(it.kindL, 20) : "";
    return {
      id: str(it.id, 20) || uid(), kind, kindL, name: str(it.name, 30) || kindL || K[kind].label, date: it.date,
      prep: Number.isInteger(it.prep) && it.prep >= 0 && it.prep <= 730 ? it.prep : K[kind].prep,
      place: str(it.place, 40), note: str(it.note, 300), num: str(it.num, 40)
    };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, items: raw.items.slice(0, 300).map(cleanItem).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  // ---------- 状態 ----------
  function monthsBetween(a, b) {
    const x = parseYmd(a), y = parseYmd(b);
    let m = (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth();
    if (y.getDate() < x.getDate()) m--;
    return m;
  }
  function status(it) {
    const left = dayDiff(today, it.date);
    const key = left < 0 ? "over" : left <= it.prep ? "soon" : "later";
    const k = K[it.kind];
    const from = k.from ? addMonths(it.date, -k.from) : null;
    return { left, key, prepStart: addDays(it.date, -it.prep), from, k };
  }
  function bigText(s) {
    if (s.key === "over") return { pre: "期限切れ", big: `${-s.left}日`, post: "過ぎた" };
    if (s.left === 0) return { pre: "期限は", big: "今日", post: "" };
    if (s.left < 100) return { pre: "あと", big: `${s.left}日`, post: "" };
    const m = monthsBetween(today, s.k && s.date ? s.date : addDays(today, s.left));
    const y = Math.floor(m / 12), r = m % 12;
    return { pre: "あと", big: y ? `${y}年${r ? r + "か月" : ""}` : `${m}か月`, post: "", sm: true };
  }
  function windowText(it, s) {
    if (s.k.window) return `更新できる期間：${jpShort(s.from)}〜${jpShort(it.date)}`;
    if (s.from && s.from > today) return `${jpShort(s.from)}から手続きできます`;
    if (s.from && s.key !== "over") return "今、手続きできます";
    return "";
  }

  // ---------- 一覧 ----------
  const GROUPS = [
    ["soon", "そろそろ準備", "準備を始める日を過ぎた物です。"],
    ["later", "まだ先", ""],
    ["over", "期限切れ", "更新が済んでいたら、開いて「更新した」を押してください。"]
  ];
  let flashId = null;
  function renderYear() {
    const start = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const end = addDays(addMonths(start, 12), -1);
    const coming = st.items.filter(i => i.date >= today && i.date <= end).sort((a, b) => a.date < b.date ? -1 : 1);
    $("year").hidden = !st.items.length;
    $("yearH").textContent = coming.length ? `これからの1年で${coming.length}件。いちばん近いのは${jpShort(coming[0].date)}の${coming[0].name}です。` : "これからの1年に期限はありません。";
    const ol = $("months"); ol.replaceChildren();
    for (let i = 0; i < 12; i++) {
      const ms = addMonths(start, i), me = addDays(addMonths(start, i + 1), -1);
      const m = parseYmd(ms).getMonth() + 1;
      const li = el("li", i === 0 ? "now" : m === 1 ? "jan" : null);
      const dots = el("span", "dots");
      const these = coming.filter(x => x.date >= ms && x.date <= me);
      these.slice(0, 3).forEach(x => dots.append(el("i", status(x).key)));
      if (these.length > 3) dots.append(el("small", null, `+${these.length - 3}`));
      li.append(dots, el("b", null, i === 0 || m === 1 ? `${m}月` : String(m)));
      ol.append(li);
    }
  }
  function render() {
    const has = st.items.length > 0;
    $("empty").hidden = has; $("addBtn").hidden = !has; $("tools").hidden = st.items.length < 6;
    renderYear();
    const q = norm($("q").value);
    const by = { soon: [], later: [], over: [] };
    st.items.forEach(it => { const s = status(it); s.date = it.date; by[s.key].push({ it, s }); });
    const box = $("groups"); box.replaceChildren();
    let hits = 0;
    GROUPS.forEach(([key, title, note]) => {
      let list = by[key];
      if (q) list = list.filter(({ it }) => norm([it.name, kindLabel(it), it.place, it.note].join(" ")).includes(q));
      if (!list.length) return;
      hits += list.length;
      list.sort((a, b) => key === "over" ? (a.it.date < b.it.date ? 1 : -1) : (a.it.date < b.it.date ? -1 : a.it.date > b.it.date ? 1 : 0));
      const sec = el("section", `grp g-${key}`);
      const h = el("h2", null, title); h.append(el("span", "cnt", `${list.length}件`)); sec.append(h);
      if (note && !q) sec.append(el("p", "g-note", note));
      const ul = el("ul", "tickets");
      list.forEach(({ it, s }) => {
        const li = el("li");
        const b = el("button", "tk" + (it.id === flashId ? " flash" : "")); b.type = "button";
        const t = bigText(s);
        const stub = el("span", "stub");
        stub.append(el("small", null, t.pre), el("b", t.sm ? "sm" : null, t.big));
        if (t.post) stub.append(el("em", null, t.post));
        const body = el("span", "tk-body");
        if (it.name !== kindLabel(it)) body.append(el("span", "tk-kind", kindLabel(it)));
        body.append(el("span", "tk-name", it.name), el("span", "tk-date", `${jp(it.date)}まで`));
        const w = windowText(it, s);
        if (w && s.key !== "over") body.append(el("span", "tk-sub win", w));
        else if (key === "later") body.append(el("span", "tk-sub", `準備は${jpShort(s.prepStart)}から`));
        if (it.place) body.append(el("span", "tk-sub", `しまってある場所：${it.place}`));
        b.append(stub, body);
        b.setAttribute("aria-label", `${it.name}、${jp(it.date)}まで、${t.pre}${t.big}${t.post}`);
        b.addEventListener("click", () => openView(it.id));
        li.append(b); ul.append(li);
      });
      sec.append(ul); box.append(sec);
    });
    $("found").textContent = q ? (hits ? `${hits}件見つかりました。` : "見つかりませんでした。名前や保管場所で探せます。") : "";
    flashId = null;
  }
  $("q").addEventListener("input", render);

  // ---------- 種類を選ぶ ----------
  const openD = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const closeD = d => { if (d.close) d.close(); else d.removeAttribute("open"); };
  const kindBtn = (k, onPick) => { const b = el("button", "kb", k.label); b.type = "button"; b.addEventListener("click", () => onPick(k.id)); return b; };
  const kindFree = window.FreeChoice({
    key: KEY + ".custom", set: "kind", label: "登録する物", max: 20, placeholder: "犬の予防接種、保険証",
    builtins: () => KINDS.map(k => ({ value: k.id, label: k.label })),
    onChange: () => renderKinds(),
    onPick: v => { closeD($("pick")); if (K[v]) openEdit(null, v); else openEdit(null, "other", v); }
  });
  function renderKinds() {
    $("kinds").replaceChildren(...KINDS.map(k => kindBtn(k, id => { closeD($("pick")); openEdit(null, id); })),
      ...kindFree.values().map(v => { const b = el("button", "kb own", v); b.type = "button"; b.addEventListener("click", () => { closeD($("pick")); openEdit(null, "other", v); }); return kindFree.wrap(b, v); }),
      kindFree.root);
  }
  renderKinds();
  $("addBtn").addEventListener("click", () => kindFree.close());
  $("quick").replaceChildren(...["menkyo", "passport", "mynumber", "shaken"].map(id => kindBtn(K[id], id2 => openEdit(null, id2))));
  const more = el("button", "kb", "ほかの物"); more.type = "button"; more.addEventListener("click", () => openD($("pick")));
  $("quick").append(more);
  $("pClose").addEventListener("click", () => closeD($("pick")));
  $("addBtn").addEventListener("click", () => openD($("pick")));

  // ---------- 登録・編集 ----------
  let editId = null, editKind = "other", editKindL = "";
  const prepFree = window.FreeChoice({
    key: KEY + ".custom", set: "prep", label: "時期", max: 10, placeholder: "10日、6週間",
    builtins: () => PREPS.map(([d, label]) => ({ value: d, label })),
    validate: v => parsePrep(v) ? "" : "「10日」「6週間」「4か月」のように、2年以内で入れてください。",
    transform: v => { const p = parsePrep(v); const b = PREPS.find(x => x[0] === p.d) || ownPreps().find(x => x[0] === p.d); return b ? b[1] : p.label; },
    onChange: () => buildPrep(Number((document.querySelector("input[name=prep]:checked") || {}).value) || K[editKind].prep),
    onPick: v => buildPrep(typeof v === "number" ? v : parsePrep(v).d)
  });
  function buildPrep(sel) {
    const seg = $("prepSeg"); seg.replaceChildren();
    const own = ownPreps().filter(p => !PREPS.some(b => b[0] === p[0]));
    const opts = PREPS.slice();
    const chip = (d, label) => { const lab = el("label"); const r = el("input"); r.type = "radio"; r.name = "prep"; r.value = String(d); r.checked = d === sel; lab.append(r, el("span", null, label)); return lab; };
    PREPS.forEach(([d, label]) => seg.append(chip(d, label)));
    own.forEach(([d, label]) => seg.append(prepFree.wrap(chip(d, label), label)));
    if (!opts.some(p => p[0] === sel) && !own.some(p => p[0] === sel)) seg.append(chip(sel, `${sel}日前`));
    seg.append(prepFree.root);
  }
  function syncWin() {
    const d = $("fDate").value, k = K[editKind];
    $("fWin").textContent = isYmd(d) && k.window ? `更新できる期間は、${jp(addMonths(d, -2))}から${jp(d)}までです。` : isYmd(d) && k.from ? `${jp(addMonths(d, -k.from))}から手続きできます。` : "";
  }
  $("fDate").addEventListener("input", syncWin);
  $("fDenshi").addEventListener("change", () => { $("fDenshiF").hidden = !$("fDenshi").checked; });
  function openEdit(id, kind, kindL) {
    editId = id;
    const it = id ? st.items.find(x => x.id === id) : null;
    editKind = it ? it.kind : kind || "other";
    editKindL = it ? it.kindL : editKind === "other" ? kindL || "" : "";
    const k = K[editKind];
    $("eH").textContent = it ? "記録を直す" : editKindL || k.label;
    $("eInfo").textContent = k.info;
    prepFree.close();
    $("fName").value = it ? it.name : k.id === "other" ? editKindL : k.label;
    $("fName").placeholder = k.id === "other" ? "NHKの口座振替の見直し" : `${k.label}（夫）`;
    $("fDateL").textContent = k.dateL;
    $("fDate").value = it ? it.date : "";
    $("fPlace").value = it ? it.place : ""; $("fNote").value = it ? it.note : ""; $("fNum").value = it ? it.num : "";
    $("numBox").open = !!(it && it.num);
    buildPrep(it ? it.prep : k.prep);
    $("denshiBox").hidden = !(!it && editKind === "mynumber");
    $("fDenshi").checked = false; $("fDenshiF").hidden = true; $("fDenshiDate").value = "";
    $("fErr").textContent = "";
    document.querySelectorAll("#form [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    syncWin();
    openD($("edit"));
    (it ? $("fDate") : $("fName").value ? $("fDate") : $("fName")).focus();
  }
  const fail = (id, msg) => { $("fErr").textContent = msg; $(id).setAttribute("aria-invalid", "true"); $(id).focus(); };
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    document.querySelectorAll("#form [aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const name = $("fName").value.trim();
    if (!name) return fail("fName", "名前を入れてください（例：運転免許証）。");
    const date = $("fDate").value;
    if (!isYmd(date)) return fail("fDate", `${K[editKind].dateL}を選んでください。`);
    const prep = Number((document.querySelector("input[name=prep]:checked") || {}).value || K[editKind].prep);
    const wantDenshi = !$("denshiBox").hidden && $("fDenshi").checked;
    if (wantDenshi && !isYmd($("fDenshiDate").value)) return fail("fDenshiDate", "電子証明書の有効期限を選んでください。");
    const snap = snapshot();
    const item = cleanItem({ id: editId || uid(), kind: editKind, kindL: editKindL, name, date, prep, place: $("fPlace").value, note: $("fNote").value, num: $("fNum").value });
    if (editId) st.items = st.items.map(i => i.id === editId ? item : i); else st.items.push(item);
    let extra = "";
    if (wantDenshi) {
      const nm = name === K.mynumber.label ? "電子証明書" : `${name}の電子証明書`;
      st.items.push(cleanItem({ kind: "denshi", name: nm.slice(0, 30), date: $("fDenshiDate").value, prep: 90, place: item.place }));
      extra = "電子証明書も登録しました。";
    }
    save(); flashId = item.id; closeD($("edit")); render();
    const s = status(item);
    toast(`${item.name}を保存しました。${s.key === "soon" ? "そろそろ準備の時期です。" : s.key === "over" ? "期限は過ぎています。" : `準備は${jpShort(s.prepStart)}からです。`}${extra}`, editId ? null : () => { restore(snap); render(); });
  });
  $("eCancel").addEventListener("click", () => closeD($("edit")));

  // ---------- 詳しく ----------
  let viewId = null;
  function openView(id) {
    const it = st.items.find(x => x.id === id); if (!it) return;
    viewId = id;
    const s = status(it), k = K[it.kind], t = bigText({ ...s, date: it.date });
    $("vKind").textContent = kindLabel(it); $("vKind").hidden = it.name === kindLabel(it);
    $("vName").textContent = it.name;
    const big = $("vBig"); big.replaceChildren(); big.style.setProperty("--c", `var(--${s.key})`);
    if (s.key === "over") { big.append(el("b", null, `${-s.left}日`), el("span", null, "過ぎています")); }
    else if (s.left === 0) big.append(el("span", null, "期限は"), el("b", null, "今日"));
    else big.append(el("span", null, "あと"), el("b", null, t.big));
    const dl = $("vDl"); dl.replaceChildren();
    const row = (key, val, cls) => { if (!val) return; const d = el("div"); d.append(el("dt", null, key)); const dd = el("dd", cls); if (typeof val === "string") dd.textContent = val; else dd.append(...val); d.append(dd); dl.append(d); };
    row(k.dateL, jp(it.date));
    row("準備", `${jpShort(s.prepStart)}から（${prepText(it.prep)}）`);
    const w = windowText(it, s); if (w && s.key !== "over") row("手続き", w.replace("更新できる期間：", "更新できる期間は"));
    row("しまってある場所", it.place);
    row("メモ", it.note);
    if (it.num) {
      const v = el("span", "mono", "●●●●" + it.num.slice(-4).replace(/./g, "●"));
      const b = el("button", "mini", "表示"); b.type = "button";
      b.addEventListener("click", () => { const show = b.textContent === "表示"; v.textContent = show ? it.num : "●●●●●●●●"; b.textContent = show ? "隠す" : "表示"; });
      v.textContent = "●●●●●●●●";
      row("番号", [v, b]);
    }
    $("vInfo").textContent = k.info;
    openD($("view"));
  }
  $("vClose").addEventListener("click", () => closeD($("view")));
  $("vEdit").addEventListener("click", () => { closeD($("view")); openEdit(viewId); });
  $("vDel").addEventListener("click", () => {
    const it = st.items.find(x => x.id === viewId); const snap = snapshot();
    if (!confirm(`「${it.name}」を削除しますか？`)) return;
    st.items = st.items.filter(x => x.id !== viewId); save(); closeD($("view")); render();
    toast(`${it.name}を削除しました。`, () => { restore(snap); render(); });
  });

  // ---------- 更新した ----------
  function setRenew(y) {
    const it = st.items.find(x => x.id === viewId);
    $("rDate").value = addMonths(it.date, y * 12);
    [...$("rSeg").children].forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.y) === y)));
  }
  $("vRenew").addEventListener("click", () => {
    const it = st.items.find(x => x.id === viewId); if (!it) return;
    closeD($("view"));
    $("rH").textContent = `${it.name}を更新しました`;
    $("rSub").textContent = `今の期限：${jp(it.date)}。新しい期限を選んでください。`;
    $("rSeg").replaceChildren(...K[it.kind].cycle.map(y => { const b = el("button", null, `${y}年後`); b.type = "button"; b.dataset.y = String(y); b.addEventListener("click", () => setRenew(y)); return b; }));
    setRenew(K[it.kind].cycle[0]);
    $("rErr").textContent = "";
    openD($("renew"));
  });
  $("rDate").addEventListener("input", () => [...$("rSeg").children].forEach(b => b.setAttribute("aria-pressed", "false")));
  $("rForm").addEventListener("submit", e => {
    e.preventDefault();
    const it = st.items.find(x => x.id === viewId);
    const d = $("rDate").value;
    if (!isYmd(d) || d <= it.date) { $("rErr").textContent = "今の期限より後の日を選んでください。"; $("rDate").focus(); return; }
    const snap = snapshot();
    it.date = d; save(); flashId = it.id; closeD($("renew")); render();
    toast(`${it.name}の期限を${jpShort(d)}にしました。お疲れさまでした。`, () => { restore(snap); render(); });
  });
  $("rCancel").addEventListener("click", () => closeD($("renew")));

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const snap = snapshot();
    [
      { kind: "menkyo", name: "運転免許証", date: addDays(today, 40), place: "財布", note: "例として入れた記録です。" },
      { kind: "shaken", name: "車検（フィット）", date: addMonths(today, 7), place: "車のダッシュボード" },
      { kind: "passport", name: "パスポート", date: addMonths(today, 30), place: "書類ファイル" },
      { kind: "domain", name: "ドメイン（家族のブログ）", date: addDays(today, -5) }
    ].forEach(x => st.items.push(cleanItem(x)));
    save(); render();
    toast("例を4件入れました。不要になったら、開いて削除できます。", () => { restore(snap); render(); });
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
    const blob = new Blob([JSON.stringify({ app: "kigen", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `kigen-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "kigen") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.items.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`今の記録を、ファイルの${data.items.length}件に置き換えますか？`)) return;
    const snap = snapshot();
    st = data; save(); render();
    $("moveMsg").textContent = `${data.items.length}件を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  render();
})();
