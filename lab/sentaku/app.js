// 洗濯表示よみとき — 記号を調べる／1着ぶんの記号から洗い方をまとめる／旧表示。
(function () {
  "use strict";
  const { CATS, S, OLD, draw } = window.SENTAKU;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const KEY = "lab-sentaku-v1";
  const byId = {}; S.forEach(s => byId[s.id] = s);
  const catName = {}; CATS.forEach(c => catName[c.id] = c.name);

  // タグに並ぶ順番。クリーニングはドライとウエットに分ける。
  const SLOTS = [
    { id: "wash", name: "洗濯", ids: S.filter(s => s.cat === "wash").map(s => s.id) },
    { id: "bleach", name: "漂白", ids: S.filter(s => s.cat === "bleach").map(s => s.id) },
    { id: "tumble", name: "乾燥機", ids: S.filter(s => s.cat === "tumble").map(s => s.id) },
    { id: "dry", name: "干し方", ids: S.filter(s => s.cat === "dry").map(s => s.id) },
    { id: "iron", name: "アイロン", ids: S.filter(s => s.cat === "iron").map(s => s.id) },
    { id: "dcl", name: "ドライ", ids: ["p", "pb", "f", "fb", "pno"] },
    { id: "wcl", name: "ウエット", ids: ["wcl", "wclb", "wclc", "wclno"] }
  ];
  const slotOf = {}; SLOTS.forEach(sl => sl.ids.forEach(i => slotOf[i] = sl.id));

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function cleanPick(p) {
    const o = {};
    if (p && typeof p === "object") SLOTS.forEach(sl => { if (sl.ids.includes(p[sl.id])) o[sl.id] = p[sl.id]; });
    return o;
  }
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const items = Array.isArray(raw.items) ? raw.items.slice(0, 300).map(g => {
      if (!g || !str(g.name, 30)) return null;
      const pick = cleanPick(g.pick); if (!Object.keys(pick).length) return null;
      return { id: str(g.id, 20) || uid(), name: str(g.name, 30), pick };
    }).filter(Boolean) : [];
    return { v: 1, items, cur: cleanPick(raw.cur) };
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [], cur: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // ---------- タブ ----------
  const tabs = { Find: $("tabFind"), Build: $("tabBuild"), Old: $("tabOld") };
  function show(name) {
    for (const k in tabs) { tabs[k].setAttribute("aria-pressed", String(k === name)); $("v" + k).hidden = k !== name; }
    try { localStorage.setItem(KEY + "-tab", name); } catch (e) {}
  }
  for (const k in tabs) tabs[k].addEventListener("click", () => { show(k); window.scrollTo({ top: 0 }); });

  // ---------- 調べる ----------
  function symBtn(s, onClick, extraCls) {
    const b = el("button", "sbtn" + (extraCls ? " " + extraCls : ""));
    b.type = "button";
    b.append(draw(s, 52), el("span", "sname", s.name));
    b.addEventListener("click", () => onClick(s, b));
    return b;
  }
  CATS.forEach(c => {
    const sec = el("section", "cat"); sec.id = "c-" + c.id;
    const h = el("h2"); h.append(el("span", "cname", c.name), el("span", "cshape", c.shape));
    sec.append(h, el("p", "cnote", c.note));
    const grid = el("div", "grid");
    S.filter(s => s.cat === c.id).forEach(s => grid.append(symBtn(s, openSheet)));
    sec.append(grid); $("cats").append(sec);
  });

  let sheetSym = null;
  function openSheet(s) {
    sheetSym = s;
    $("shSym").replaceChildren(draw(s, 120));
    $("shCat").textContent = s.old ? "旧表示（2016年11月まで）" : catName[s.cat];
    $("shName").textContent = s.name;
    $("shMean").textContent = s.mean;
    $("shDo").textContent = s.do || "";
    $("shDo").parentNode.hidden = !s.do;
    $("shAdd").hidden = !!s.old;
    $("sheet").showModal();
  }
  $("shClose").addEventListener("click", () => $("sheet").close());
  $("shAdd").addEventListener("click", () => {
    if (!sheetSym) return;
    st.cur[slotOf[sheetSym.id]] = sheetSym.id; save();
    $("sheet").close(); renderBuild(); show("Build");
    toast(`「${sheetSym.name}」を入れました。`);
  });
  [$("sheet"), $("picker")].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  // ---------- 旧表示 ----------
  OLD.forEach(o => { o.old = true; $("oldGrid").append(symBtn(o, openSheet, "old")); });

  // ---------- この服の表示 ----------
  let pickSlot = null;
  function renderStrip() {
    const strip = $("strip"); strip.replaceChildren();
    SLOTS.forEach(sl => {
      const b = el("button", "slot"); b.type = "button";
      const s = byId[st.cur[sl.id]];
      if (s) { b.append(draw(s, 44)); b.classList.add("on"); b.setAttribute("aria-label", `${sl.name}：${s.name}（変える）`); }
      else { b.append(el("span", "plus", "＋")); b.setAttribute("aria-label", `${sl.name}の記号を選ぶ`); }
      b.append(el("span", "slabel", sl.name));
      b.addEventListener("click", () => openPicker(sl));
      strip.append(b);
    });
  }
  function openPicker(sl) {
    pickSlot = sl;
    $("pkH").textContent = sl.name + "の記号";
    $("pkNote").textContent = sl.id === "dcl" ? "丸の中にPかF、またはバツの丸。" : sl.id === "wcl" ? "丸の中にW。" : (CATS.find(c => c.id === sl.id) || {}).note || "";
    const g = $("pkGrid"); g.replaceChildren();
    sl.ids.forEach(i => {
      const b = symBtn(byId[i], s => { st.cur[sl.id] = s.id; save(); $("picker").close(); renderBuild(); });
      b.setAttribute("aria-pressed", String(st.cur[sl.id] === i));
      g.append(b);
    });
    $("picker").showModal();
  }
  $("pkNone").addEventListener("click", () => { if (pickSlot) { delete st.cur[pickSlot.id]; save(); } $("picker").close(); renderBuild(); });
  $("pkClose").addEventListener("click", () => $("picker").close());

  // 選んだ記号から、洗い方をまとめる
  function advise(pick) {
    const g = id => byId[pick[id]];
    const w = g("wash"), b = g("bleach"), t = g("tumble"), d = g("dry"), i = g("iron"), dc = g("dcl"), wc = g("wcl");
    const steps = [];
    let head;
    if (!w) head = "洗濯の記号を選ぶと、洗い方がわかります。";
    else if (w.id === "wno") head = "家では洗えません。クリーニング店へ。";
    else if (w.id === "whand") head = "手洗いで、40℃まで。";
    else head = `洗濯機の${w.bars === 2 ? "いちばん弱いコース" : w.bars === 1 ? "弱いコース" : "標準コース"}で、${w.t}℃まで。`;
    if (w) steps.push(["洗う", w.do]);
    if (b && !(w && w.id === "wno")) steps.push(["漂白", b.do]);
    if (w && w.id !== "wno") {
      let dryText = "";
      if (t) dryText += t.do;
      if (d) dryText += d.do;
      if (!t && !d) dryText = "乾燥機の記号がないときは、干して乾かすと安心です。";
      steps.push(["乾かす", dryText]);
    } else if (d) steps.push(["干す", d.do]);
    if (i) steps.push(["アイロン", i.do]);
    const shop = [dc, wc].filter(Boolean);
    if (shop.length) steps.push(["お店に出すなら", shop.map(s => s.do).join("")]);
    else if (w && w.id === "wno") steps.push(["お店に出すなら", "クリーニングの記号がなければ、タグを見せてお店に相談します。"]);
    const warn = [];
    if (w && w.id === "wno" && ((dc && dc.id === "pno") && (!wc || wc.id === "wclno"))) warn.push("家でもクリーニング店でも洗いにくい服です。買ったお店かメーカーに相談すると確実です。");
    if (w && w.bars && !t) warn.push("弱く洗う服は、乾燥機を使わないほうが安心です。");
    return { head, steps, warn };
  }
  function renderBuild() {
    renderStrip();
    const r = $("result"); r.replaceChildren();
    const n = Object.keys(st.cur).length;
    if (!n) {
      r.append(el("p", "r-empty", "まだ記号を選んでいません。上の「＋」をタップして、タグと同じ記号を選んでください。"));
      return;
    }
    const a = advise(st.cur);
    r.append(el("p", "r-head", a.head));
    const ol = el("ol", "steps");
    a.steps.forEach(([k, v]) => { const li = el("li"); li.append(el("b", null, k), el("p", null, v)); ol.append(li); });
    r.append(ol);
    a.warn.forEach(x => r.append(el("p", "r-warn", x)));
    r.append(el("p", "r-foot", "記号のそばに書かれた文字（「洗濯ネット使用」など）も合わせて守ってください。"));
  }
  $("bClear").addEventListener("click", () => {
    const prev = JSON.stringify(st.cur);
    if (!Object.keys(st.cur).length) return;
    st.cur = {}; save(); renderBuild();
    toast("選んだ記号を消しました。", () => { st.cur = JSON.parse(prev); save(); renderBuild(); });
  });
  $("bSample").addEventListener("click", () => {
    st.cur = { wash: "w30c", bleach: "b_oxy", tumble: "t_no", dry: "d_flat_s", iron: "i1", dcl: "fb", wcl: "wclc" };
    save(); renderBuild();
    if ($("gName").value.trim() === "") $("gName").value = "ウールのニット";
  });

  // 保存した服
  function renderSaved() {
    const ul = $("savedList"); ul.replaceChildren();
    $("savedEmpty").hidden = st.items.length > 0;
    st.items.forEach(g => {
      const li = el("li", "gitem");
      const open = el("button", "gopen"); open.type = "button";
      const icons = el("span", "gicons");
      SLOTS.forEach(sl => { const s = byId[g.pick[sl.id]]; if (s) icons.append(draw(s, 26)); });
      open.append(el("span", "gname", g.name), icons);
      open.addEventListener("click", () => {
        st.cur = Object.assign({}, g.pick); save(); renderBuild(); $("gName").value = g.name;
        $("strip").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      });
      const del = el("button", "gdel", "削除"); del.type = "button"; del.setAttribute("aria-label", `${g.name}を削除`);
      del.addEventListener("click", () => {
        const idx = st.items.indexOf(g); st.items.splice(idx, 1); save(); renderSaved();
        toast(`「${g.name}」を削除しました。`, () => { st.items.splice(idx, 0, g); save(); renderSaved(); });
      });
      li.append(open, del); ul.append(li);
    });
  }
  $("saveForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("gName").value.trim().slice(0, 30);
    $("saveErr").textContent = "";
    if (!Object.keys(st.cur).length) { $("saveErr").textContent = "先に、上で記号を選んでください。"; return; }
    if (!name) { $("saveErr").textContent = "服の名前を入れてください。例：白いシャツ"; $("gName").focus(); return; }
    const same = st.items.find(g => g.name === name);
    if (same) same.pick = Object.assign({}, st.cur);
    else st.items.unshift({ id: uid(), name, pick: Object.assign({}, st.cur) });
    save(); renderSaved(); $("gName").value = "";
    toast(same ? `「${name}」を上書きしました。` : `「${name}」を保存しました。`);
  });

  // ---------- お知らせ ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const today = new Date().toISOString().slice(0, 10);
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "sentaku", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `sentaku-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 2e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "sentaku") data = clean(j.data); } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いま保存している服を、ファイルの${data.items.length}着と置きかえますか？`)) return;
    const prev = JSON.stringify(st);
    st = data; save(); renderBuild(); renderSaved();
    $("moveMsg").textContent = `${data.items.length}着を読み込みました。`;
    toast("読み込みました。", () => { st = JSON.parse(prev); save(); renderBuild(); renderSaved(); });
  });

  renderBuild(); renderSaved();
  let t0 = "Find"; try { t0 = localStorage.getItem(KEY + "-tab") || "Find"; } catch (e) {}
  show(tabs[t0] ? t0 : "Find");
})();
