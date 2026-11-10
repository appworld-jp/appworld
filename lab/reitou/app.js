// 冷凍ストック帳 — 冷凍庫に入れた物と日付を記録し、古い順に並べる。種類ごとの保存の目安つき。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-reitou-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const jp = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase().trim();
  const today = ymd(new Date());
  const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const PLACES = ["上段", "下段", "引き出し"];

  // 保存の目安（家庭用冷凍庫でしっかり包んだ場合のおおよそ。控えめな値）
  // lo を過ぎたら「早めに」、hi を過ぎたら「目安を過ぎた」
  const TYPES = [
    { id: "sashimi", label: "刺身用の魚", lo: 7, hi: 14, text: "1〜2週間", kw: ["刺身", "さしみ", "刺し身", "まぐろ", "マグロ", "鮪", "ネギトロ", "ねぎとろ", "生食用"] },
    { id: "hiki", label: "ひき肉", lo: 10, hi: 14, text: "2週間", kw: ["ひき肉", "挽肉", "挽き肉", "ミンチ", "合いびき", "合挽"] },
    { id: "shitaaji", label: "下味冷凍の肉・魚", lo: 14, hi: 21, text: "2〜3週間", kw: ["下味", "漬け", "づけ", "味噌漬", "みそ漬", "生姜焼き用", "唐揚げ用", "から揚げ用", "マリネ"] },
    { id: "niku", label: "生の肉", lo: 14, hi: 21, text: "2〜3週間", kw: ["肉", "豚", "鶏", "牛", "こま", "バラ", "ロース", "もも", "むね", "手羽", "ささみ", "レバー", "ステーキ"] },
    { id: "sakana", label: "生の魚・えび・貝", lo: 14, hi: 21, text: "2〜3週間", kw: ["魚", "鮭", "さけ", "しゃけ", "サーモン", "さば", "サバ", "鯖", "ぶり", "ブリ", "たら", "タラ", "切り身", "えび", "エビ", "いか", "イカ", "あさり", "しじみ", "ほたて", "たこ", "しらす", "あじ", "さんま"] },
    { id: "kakou", label: "ハム・ベーコン・ソーセージ", lo: 14, hi: 28, text: "2〜4週間", kw: ["ハム", "ベーコン", "ソーセージ", "ウインナー", "ウィンナー"] },
    { id: "okazu", label: "加熱したおかず", lo: 14, hi: 21, text: "2〜3週間", kw: ["カレー", "ハンバーグ", "スープ", "シチュー", "煮物", "肉じゃが", "作り置き", "作りおき", "ミートソース", "そぼろ", "餃子", "ぎょうざ", "コロッケ", "唐揚げ", "から揚げ", "きんぴら", "ひじき", "豚汁", "味噌汁", "おかず"] },
    { id: "gohan", label: "ごはん", lo: 23, hi: 30, text: "1か月", kw: ["ごはん", "ご飯", "白米", "玄米", "おにぎり", "炊き込み", "赤飯"] },
    { id: "pan", label: "食パン・パン", lo: 14, hi: 28, text: "2〜4週間", kw: ["パン", "ベーグル", "バゲット", "クロワッサン", "マフィン"] },
    { id: "yasai", label: "野菜・きのこ", lo: 23, hi: 30, text: "1か月", kw: ["野菜", "ほうれん草", "ほうれんそう", "小松菜", "ブロッコリー", "ねぎ", "ネギ", "長ねぎ", "玉ねぎ", "にんじん", "人参", "キャベツ", "かぼちゃ", "オクラ", "いんげん", "枝豆", "えだまめ", "コーン", "トマト", "きのこ", "しめじ", "えのき", "まいたけ", "しいたけ", "エリンギ", "なめこ", "しょうが", "生姜", "にんにく", "大根", "油揚げ", "油あげ"] },
    { id: "fruit", label: "果物", lo: 23, hi: 30, text: "1か月", kw: ["果物", "フルーツ", "バナナ", "いちご", "苺", "ブルーベリー", "マンゴー", "りんご", "みかん", "ぶどう", "キウイ"] },
    { id: "shihan", label: "市販の冷凍食品", exp: true, text: "袋の期限", kw: ["冷凍食品", "冷食", "アイス", "冷凍うどん", "冷凍餃子", "冷凍ピザ", "チャーハン", "冷凍の"] },
    { id: "other", label: "その他", text: "なし", kw: [] }
  ];
  const T = Object.fromEntries(TYPES.map(t => [t.id, t]));
  function guessType(name) {
    const n = (name || "").normalize("NFKC");
    // 「冷凍食品」は先に、「刺身」は「魚」より先に見る
    const order = ["shihan", "sashimi", "hiki", "shitaaji", "okazu", "kakou", "gohan", "pan", "sakana", "niku", "fruit", "yasai"];
    for (const id of order) if (T[id].kw.some(k => n.includes(k))) return id;
    return "other";
  }

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !str(it.name, 30)) return null;
    return {
      id: str(it.id, 20) || uid(), name: str(it.name, 30), amt: str(it.amt, 12),
      type: T[it.type] ? it.type : "other", place: PLACES.includes(it.place) ? it.place : "",
      date: isYmd(it.date) ? it.date : today, exp: isYmd(it.exp) ? it.exp : ""
    };
  }
  function cleanHist(h) {
    if (!h || typeof h !== "object" || !str(h.name, 30)) return null;
    return { name: str(h.name, 30), amt: str(h.amt, 12), type: T[h.type] ? h.type : "other", place: PLACES.includes(h.place) ? h.place : "",
      n: Number.isInteger(h.n) && h.n > 0 ? Math.min(h.n, 9999) : 1, last: isYmd(h.last) ? h.last : today };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, items: raw.items.slice(0, 500).map(cleanItem).filter(Boolean), hist: (Array.isArray(raw.hist) ? raw.hist : []).slice(0, 200).map(cleanHist).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [], hist: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  // ---------- 量 ----------
  function parseAmt(a) {
    const m = (a || "").normalize("NFKC").trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (!m) return null;
    const n = Number(m[1]); if (!(n > 0)) return null;
    const unit = m[2];
    const step = /^(g|グラム|ml|cc|ミリ)/i.test(unit) ? (n >= 200 ? 50 : 10) : 1;
    return { n, unit, step };
  }
  const fmtAmt = (n, unit) => `${Math.round(n * 10) / 10}${unit}`;

  // ---------- 状態 ----------
  function status(it) {
    const t = T[it.type];
    const age = Math.max(0, dayDiff(it.date, today));
    if (t.exp) {
      if (!it.exp) return { key: "none", age, text: "袋の期限を見てください" };
      const left = dayDiff(today, it.exp);
      if (left < 0) return { key: "over", age, text: `袋の期限（${jp(it.exp)}）を過ぎました` };
      if (left <= 14) return { key: "soon", age, text: left === 0 ? "袋の期限は今日までです" : `袋の期限まで、あと${left}日` };
      return { key: "ok", age, text: `袋の期限は${jp(it.exp)}` };
    }
    if (t.lo == null) return { key: "none", age, text: "目安なし" };
    const frac = Math.min(1, age / t.hi);
    if (age > t.hi) return { key: "over", age, frac, t, text: `目安の${t.text}を過ぎました` };
    if (age >= t.lo) return { key: "soon", age, frac, t, text: `早めに使いましょう（目安${t.text}）` };
    return { key: "ok", age, frac, t, text: `あと${t.lo - age}日は余裕（目安${t.text}）` };
  }
  const ageText = a => a === 0 ? "今日入れた" : `${a}日目`;

  // ---------- 入れる ----------
  const typeOpts = sel => { sel.replaceChildren(); TYPES.forEach(t => { const o = el("option", null, t.label); o.value = t.id; sel.append(o); }); };
  typeOpts($("aType")); typeOpts($("eType"));
  $("guideList").replaceChildren(...TYPES.filter(t => t.id !== "other").map(t => { const li = el("li"); li.append(el("span", null, t.label), el("b", null, t.text)); return li; }));
  let typeTouched = false;
  const resetAdd = () => {
    $("aName").value = ""; $("aAmt").value = ""; $("aDate").value = today; $("aDate").max = today; $("aExp").value = "";
    $("aType").value = "other"; typeTouched = false; syncAdd();
  };
  function syncAdd() {
    const t = T[$("aType").value];
    $("aExpF").hidden = !t.exp;
    const g = $("aGuide"); g.replaceChildren();
    if (!$("aName").value.trim()) return;
    if (t.exp) g.append("市販の冷凍食品は、袋の期限で知らせます。");
    else if (t.lo == null) g.append("種類を選ぶと、保存の目安がわかります（「その他」は目安なし）。");
    else { g.append(`${t.label}の目安は `); g.append(el("b", null, t.text)); g.append(" です。"); }
  }
  $("aName").addEventListener("input", () => { if (!typeTouched) $("aType").value = guessType($("aName").value); syncAdd(); $("aErr").textContent = ""; $("aName").removeAttribute("aria-invalid"); });
  $("aType").addEventListener("change", () => { typeTouched = true; syncAdd(); });
  function remember(it) {
    const k = norm(it.name);
    const h = st.hist.find(x => norm(x.name) === k);
    if (h) { h.n++; h.last = today; h.amt = it.amt; h.type = it.type; h.place = it.place; h.name = it.name; }
    else st.hist.push({ name: it.name, amt: it.amt, type: it.type, place: it.place, n: 1, last: today });
  }
  let flashId = null;
  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("aName").value.trim();
    if (!name) { $("aErr").textContent = "品名を入れてください（例：ごはん）。"; $("aName").setAttribute("aria-invalid", "true"); $("aName").focus(); return; }
    const date = $("aDate").value;
    if (date && (!isYmd(date) || date > today)) { $("aErr").textContent = "冷凍した日は、今日より前の日を選んでください。"; $("aDate").focus(); return; }
    const place = (document.querySelector("input[name=ap]:checked") || {}).value || "";
    const it = cleanItem({ name, amt: $("aAmt").value, type: $("aType").value, place, date: date || today, exp: $("aExp").value });
    const snap = snapshot();
    st.items.push(it); remember(it); save(); flashId = it.id;
    resetAdd(); render();
    toast(`「${it.name}」を入れました。`, () => { restore(snap); render(); });
    $("aName").focus();
  });

  // ---------- いつもの ----------
  let stEdit = false;
  function renderStaples() {
    const list = st.hist.slice().sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1)).slice(0, 10);
    $("staples").hidden = !list.length;
    $("stNote").textContent = stEdit ? "外したい物を押してください。" : "押すと、今日の日付ですぐ入ります。";
    $("stChips").replaceChildren(...list.map(h => {
      const b = el("button", stEdit ? "chip rm" : "chip"); b.type = "button";
      b.append(el("span", "plus", stEdit ? "×" : "＋"), el("span", null, h.name));
      if (h.amt && !stEdit) b.append(el("small", null, h.amt));
      b.setAttribute("aria-label", stEdit ? `「${h.name}」をいつものから外す` : `「${h.name}」${h.amt ? `を${h.amt}` : ""}入れる`);
      b.addEventListener("click", () => {
        const snap = snapshot();
        if (stEdit) { st.hist = st.hist.filter(x => x !== h); save(); render(); toast(`「${h.name}」をいつものから外しました。`, () => { restore(snap); render(); }); return; }
        const it = cleanItem({ name: h.name, amt: h.amt, type: h.type, place: h.place, date: today });
        st.items.push(it); remember(it); save(); flashId = it.id; render();
        toast(`「${it.name}」を入れました。`, () => { restore(snap); render(); });
      });
      return b;
    }));
  }
  $("stEdit").addEventListener("click", () => { stEdit = !stEdit; $("stEdit").setAttribute("aria-pressed", String(stEdit)); $("stEdit").textContent = stEdit ? "完了" : "整理"; renderStaples(); });

  // ---------- 一覧 ----------
  let pf = "";
  function renderPf() {
    const opts = [["", "すべて"], ...PLACES.filter(p => st.items.some(i => i.place === p)).map(p => [p, p])];
    if (st.items.some(i => !i.place) && opts.length > 1) opts.push(["-", "場所なし"]);
    if (!opts.some(([v]) => v === pf)) pf = "";
    $("pf").hidden = opts.length < 2;
    $("pf").replaceChildren(...opts.map(([v, label]) => {
      const n = v === "" ? st.items.length : st.items.filter(i => (v === "-" ? !i.place : i.place === v)).length;
      const b = el("button", null, `${label} ${n}`); b.type = "button"; b.setAttribute("aria-pressed", String(v === pf));
      b.addEventListener("click", () => { pf = v; render(); });
      return b;
    }));
  }
  function render() {
    renderStaples(); renderPf();
    const has = st.items.length > 0;
    $("empty").hidden = has; $("stockHead").hidden = !has; $("filters").hidden = !has;
    $("q").hidden = st.items.length < 5;
    $("cnt").textContent = has ? `${st.items.length}品` : "";
    const q = norm($("q").value);
    let list = st.items.slice();
    if (pf) list = list.filter(i => pf === "-" ? !i.place : i.place === pf);
    if (q) list = list.filter(i => norm(i.name + " " + T[i.type].label).includes(q));
    list.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    $("found").textContent = (q || pf) && has ? (list.length ? `${list.length}品あります。` : q ? "見つかりませんでした。品名で探せます。" : "") : "";
    $("bags").replaceChildren(...list.map(it => {
      const s = status(it);
      const li = el("li", `bag k-${s.key}`); li.dataset.id = it.id; if (it.id === flashId) li.classList.add("new");
      const tape = el("div", "tape"); tape.append(el("small", null, "冷凍"), el("b", null, md(it.date)));
      tape.setAttribute("aria-label", `${jp(it.date)}に冷凍`);
      const top = el("div", "b-top");
      const nb = el("button", "b-name", it.name); nb.type = "button"; nb.setAttribute("aria-label", `${it.name}の記録を直す`);
      nb.addEventListener("click", () => openEdit(it.id));
      top.append(nb);
      if (it.amt) top.append(el("span", "b-amt", it.amt));
      if (it.place) top.append(el("span", "b-place", it.place));
      li.append(tape, top);
      li.append(el("p", "b-meta", `${ageText(s.age)}・${T[it.type].label}`));
      if (s.frac != null) {
        const m = el("div", "meter"); m.setAttribute("aria-hidden", "true");
        const i = el("i"); i.style.width = `${Math.max(4, s.frac * 100)}%`; m.append(i);
        const mk = el("s"); mk.style.left = `${(s.t.lo / s.t.hi) * 100}%`; m.append(mk);
        li.append(m);
      }
      const foot = el("div", "b-foot");
      foot.append(el("span", "state", s.text));
      const u = el("button", "used", "使った"); u.type = "button"; u.setAttribute("aria-label", `${it.name}を使った`);
      u.addEventListener("click", () => openUse(it.id));
      foot.append(u); li.append(foot);
      return li;
    }));
    flashId = null;
  }
  $("q").addEventListener("input", render);

  // ---------- 使った ----------
  const openD = d => { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
  const closeD = d => { if (d.close) d.close(); else d.removeAttribute("open"); };
  let useId = null, useN = 0, useA = null;
  function syncStep() {
    $("uVal").textContent = fmtAmt(useN, useA.unit);
    $("uMinus").disabled = useN - useA.step < useA.step - 1e-9;
    $("uPlus").disabled = useN + useA.step > useA.n - useA.step + 1e-9;
    $("uSome").textContent = `残り${fmtAmt(useA.n - useN, useA.unit)}を冷凍庫に戻す`;
  }
  function openUse(id) {
    const it = st.items.find(x => x.id === id); if (!it) return;
    useId = id;
    $("uH").textContent = it.name;
    $("uSub").textContent = `${jp(it.date)}に冷凍${it.amt ? `・${it.amt}` : ""}`;
    $("uErr").textContent = ""; $("uLeft").value = ""; $("uLeft").removeAttribute("aria-invalid");
    useA = parseAmt(it.amt);
    const stepper = useA && useA.n - useA.step >= useA.step - 1e-9;
    $("uStep").hidden = !stepper; $("uLeftF").hidden = !!stepper;
    if (stepper) { useN = useA.step; syncStep(); } else $("uSome").textContent = "残りを冷凍庫に戻す";
    openD($("use"));
  }
  $("uMinus").addEventListener("click", () => { useN = Math.max(useA.step, useN - useA.step); syncStep(); });
  $("uPlus").addEventListener("click", () => { useN = Math.min(useA.n - useA.step, useN + useA.step); syncStep(); });
  function finishUse(left) {
    const it = st.items.find(x => x.id === useId); if (!it) return;
    const snap = snapshot();
    closeD($("use"));
    const done = () => {
      if (left == null) st.items = st.items.filter(x => x.id !== useId); else it.amt = left;
      save(); render();
      toast(left == null ? `「${it.name}」を使い切りました。` : `「${it.name}」は残り${left}です。`, () => { restore(snap); render(); });
    };
    const li = left == null ? document.querySelector(`.bag[data-id="${useId}"]`) : null;
    if (li && !matchMedia("(prefers-reduced-motion: reduce)").matches) { li.classList.add("gone"); setTimeout(done, 240); } else done();
  }
  $("uAll").addEventListener("click", () => finishUse(null));
  $("uSome").addEventListener("click", () => {
    if (!$("uStep").hidden) return finishUse(fmtAmt(useA.n - useN, useA.unit));
    const v = $("uLeft").value.trim();
    if (!v) { $("uErr").textContent = "残りの量を入れてください（例：半分くらい、1袋）。"; $("uLeft").setAttribute("aria-invalid", "true"); $("uLeft").focus(); return; }
    finishUse(v.slice(0, 12));
  });
  $("uClose").addEventListener("click", () => closeD($("use")));
  $("uEdit").addEventListener("click", () => { closeD($("use")); openEdit(useId); });

  // ---------- 直す ----------
  let editId = null;
  const syncE = () => { $("eExpF").hidden = !T[$("eType").value].exp; };
  $("eType").addEventListener("change", syncE);
  function openEdit(id) {
    const it = st.items.find(x => x.id === id); if (!it) return;
    editId = id;
    $("eName").value = it.name; $("eAmt").value = it.amt; $("ePlace").value = it.place; $("eType").value = it.type;
    $("eDate").value = it.date; $("eDate").max = today; $("eExp").value = it.exp; $("eErr").textContent = "";
    $("eName").removeAttribute("aria-invalid");
    syncE(); openD($("edit"));
  }
  $("eForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("eName").value.trim();
    if (!name) { $("eErr").textContent = "品名を入れてください。"; $("eName").setAttribute("aria-invalid", "true"); $("eName").focus(); return; }
    const d = $("eDate").value;
    if (!isYmd(d) || d > today) { $("eErr").textContent = "冷凍した日は、今日より前の日を選んでください。"; $("eDate").focus(); return; }
    const it = cleanItem({ id: editId, name, amt: $("eAmt").value, place: $("ePlace").value, type: $("eType").value, date: d, exp: $("eExp").value });
    st.items = st.items.map(x => x.id === editId ? it : x); save(); closeD($("edit")); render();
    toast(`「${it.name}」を保存しました。`);
  });
  $("eCancel").addEventListener("click", () => closeD($("edit")));
  $("eDel").addEventListener("click", () => {
    const it = st.items.find(x => x.id === editId); const snap = snapshot();
    st.items = st.items.filter(x => x.id !== editId); save(); closeD($("edit")); render();
    toast(`「${it.name}」を削除しました。`, () => { restore(snap); render(); });
  });

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const snap = snapshot();
    [
      { name: "ごはん", amt: "4個", type: "gohan", place: "引き出し", date: addDays(today, -26) },
      { name: "鶏もも（塩こうじ漬け）", amt: "2袋", type: "shitaaji", place: "上段", date: addDays(today, -16) },
      { name: "食パン", amt: "3枚", type: "pan", place: "上段", date: addDays(today, -6) },
      { name: "ブロッコリー（ゆで）", amt: "300g", type: "yasai", place: "下段", date: addDays(today, -2) }
    ].forEach(x => { const it = cleanItem(x); st.items.push(it); remember(it); });
    save(); render();
    toast("例を4品入れました。「使った」を押すと消えます。", () => { restore(snap); render(); });
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
    const blob = new Blob([JSON.stringify({ app: "reitou", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `reitou-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "reitou") data = clean(j.data); } catch (e) { data = null; }
    if (!data || (!data.items.length && !data.hist.length)) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いまの記録を、ファイルの${data.items.length}品と置きかえますか？`)) return;
    const snap = snapshot();
    st = data; save(); render();
    $("moveMsg").textContent = `${data.items.length}品を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); render(); });
  });

  resetAdd();
  render();
})();
