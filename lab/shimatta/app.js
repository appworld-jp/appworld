// しまった場所メモ — 家の中の場所を「部屋 › 収納 › 段・箱」の木で持ち、しまった物をひと言でさがす。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-shimatta-v1";
  const CK = KEY + ".custom";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const today = ymd(new Date());
  const jp = s => { const d = parseYmd(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  // ひらがな・カタカナ、全角・半角、大文字・小文字、空白の違いを気にせずさがす
  const kana = s => String(s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, "");
  const str = (v, max) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

  function ago(s) {
    const days = Math.round((parseYmd(today) - parseYmd(s)) / 864e5);
    if (days <= 0) return "今日";
    if (days === 1) return "昨日";
    if (days < 30) return `${days}日前`;
    if (days < 365) return `${Math.floor(days / 30)}か月前`;
    return `${Math.floor(days / 365)}年前`;
  }
  const isOld = s => (parseYmd(today) - parseYmd(s)) / 864e5 >= 365;

  // ---------- 保存 ----------
  function clean(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.places) || !Array.isArray(raw.items)) return null;
    const places = raw.places.slice(0, 600).map(p => p && typeof p === "object" && str(p.name, 20) ? { id: str(p.id, 24) || uid(), name: str(p.name, 20), parent: typeof p.parent === "string" ? p.parent.slice(0, 24) : "", sample: p.sample === true } : null).filter(Boolean);
    const ids = new Set();
    places.forEach(p => { while (ids.has(p.id)) p.id = uid(); ids.add(p.id); });
    places.forEach(p => { if (!ids.has(p.parent) || p.parent === p.id) p.parent = ""; });
    // 親をたどって輪になっていたら切る
    const byId = Object.fromEntries(places.map(p => [p.id, p]));
    places.forEach(p => { const seen = new Set([p.id]); let q = p; while (q.parent) { if (seen.has(q.parent)) { q.parent = ""; break; } seen.add(q.parent); q = byId[q.parent]; } });
    const items = raw.items.slice(0, 3000).map(it => it && typeof it === "object" && str(it.name, 30) && ids.has(it.place) ? {
      id: str(it.id, 24) || uid(), name: str(it.name, 30), note: str(it.note, 60), place: it.place,
      checked: isYmd(it.checked) ? it.checked : today, moved: isYmd(it.moved) ? it.moved : "", sample: it.sample === true
    } : null).filter(Boolean);
    const itemIds = new Set(items.map(i => i.id));
    const recent = (Array.isArray(raw.recent) ? raw.recent : []).filter(id => itemIds.has(id)).slice(0, 8);
    return { v: 1, places, items, recent };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, places: [], items: [], recent: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  // ---------- 場所の木 ----------
  const P = id => st.places.find(p => p.id === id);
  const kids = id => st.places.filter(p => p.parent === id);
  function chain(id) { const out = []; let p = P(id); while (p) { out.unshift(p); p = P(p.parent); } return out; }
  const pathNames = id => chain(id).map(p => p.name);
  const depth = id => id ? chain(id).length : 0;
  function under(id) { const out = [id]; for (let i = 0; i < out.length; i++) kids(out[i]).forEach(k => out.push(k.id)); return out; }
  function sortedTree() {
    const out = [];
    const walk = (pid, d) => kids(pid).forEach(p => { out.push({ p, d }); walk(p.id, d + 1); });
    walk("", 0);
    return out;
  }
  function fillPlaceSelect(sel, value, opts = {}) {
    const list = [];
    if (opts.root) { const o = el("option", null, "家の中（いちばん外側）"); o.value = ""; list.push(o); }
    else if (!st.places.length) { const o = el("option", null, "まだ場所がありません"); o.value = ""; list.push(o); }
    sortedTree().forEach(({ p, d }) => {
      if (opts.exclude && opts.exclude.includes(p.id)) return;
      const o = el("option", null, "　".repeat(d + (opts.root ? 1 : 0)) + p.name); o.value = p.id; list.push(o);
    });
    if (opts.allowNew) { const o = el("option", null, "＋ 新しい場所を作る…"); o.value = "__new"; list.push(o); }
    sel.replaceChildren(...list);
    sel.value = value || "";
    if (sel.selectedIndex < 0) sel.selectedIndex = 0;
  }
  function pathList(id, cls) {
    const ol = el("ol", cls);
    ol.setAttribute("aria-label", "しまった場所");
    pathNames(id).forEach(n => { const li = el("li"); li.append(el("span", null, n)); ol.append(li); });
    return ol;
  }

  // ---------- 切りかえ ----------
  let view = "find", here = "";
  function setView(v) {
    view = v;
    $("tabFind").setAttribute("aria-pressed", String(v === "find"));
    $("tabPlace").setAttribute("aria-pressed", String(v === "place"));
    $("findView").hidden = v !== "find"; $("placeView").hidden = v !== "place";
    render();
  }
  $("tabFind").addEventListener("click", () => setView("find"));
  $("tabPlace").addEventListener("click", () => setView("place"));

  // ---------- さがす ----------
  let flashId = null;
  const hay = it => kana([it.name, it.note, ...pathNames(it.place)].join(" "));
  function itemCard(it, fromSearch) {
    const li = el("li");
    const b = el("button", "item"); b.type = "button";
    b.append(el("span", "nm", it.name), pathList(it.place, "path"));
    if (it.note) b.append(el("span", "nt", it.note));
    b.append(el("span", isOld(it.checked) ? "ck old" : "ck", `${ago(it.checked)}に確認`));
    if (it.id === flashId) b.classList.add("flash");
    b.addEventListener("click", () => openItem(it.id, fromSearch));
    li.append(b);
    return li;
  }
  function renderFind() {
    const raw = $("q").value;
    const toks = raw.split(/[\s　、,]+/).map(kana).filter(Boolean);
    const first = !st.items.length && !st.places.length;
    $("firstRun").hidden = !first;
    $("results").replaceChildren(); $("placeHits").replaceChildren(); $("noHit").hidden = true;
    if (first) { $("found").textContent = ""; $("recentBox").hidden = true; return; }
    if (!toks.length) {
      const rec = st.recent.map(id => st.items.find(i => i.id === id)).filter(Boolean);
      $("recentBox").hidden = !rec.length;
      $("recent").replaceChildren(...rec.map(it => {
        const b = el("button", "rchip"); b.type = "button";
        b.append(el("span", null, it.name), el("small", null, pathNames(it.place).slice(-1)[0] || ""));
        b.addEventListener("click", () => openItem(it.id, true));
        return b;
      }));
      $("found").textContent = st.items.length ? `${st.items.length}点を記録しています。新しく記録した順に並んでいます。` : "";
      const list = st.items.slice().reverse();
      $("results").replaceChildren(...list.map(it => itemCard(it, false)));
      if (!st.items.length) { $("noHit").hidden = false; $("noHit").textContent = "場所はできています。下の「しまった物を記録」から、物を1つ入れてみましょう。"; }
      return;
    }
    $("recentBox").hidden = true;
    const hits = st.items.filter(it => { const h = hay(it); return toks.every(t => h.includes(t)); });
    const phits = st.places.filter(p => { const h = kana(pathNames(p.id).join(" ")); return toks.every(t => h.includes(t)); }).slice(0, 8);
    $("placeHits").replaceChildren(...phits.map(p => {
      const b = el("button", "phit"); b.type = "button";
      const n = st.items.filter(i => under(p.id).includes(i.place)).length;
      b.append("場所：", el("b", null, pathNames(p.id).join(" › ")), ` （${n}点）`);
      b.addEventListener("click", () => { here = p.id; setView("place"); });
      return b;
    }));
    $("results").replaceChildren(...hits.map(it => itemCard(it, true)));
    $("found").textContent = hits.length ? `「${raw.trim()}」が${hits.length}点見つかりました。` : phits.length ? `「${raw.trim()}」という場所が見つかりました。` : "";
    if (!hits.length && !phits.length) { $("noHit").hidden = false; $("noHit").textContent = `「${raw.trim()}」は見つかりませんでした。漢字やひらがななど別の書き方や、メモに書いた言葉（例：単3）でも試してください。`; }
  }
  $("q").addEventListener("input", () => { if (view !== "find") setView("find"); else renderFind(); });
  $("searchForm").addEventListener("submit", e => { e.preventDefault(); $("q").blur(); });

  // ---------- 物の詳細 ----------
  let curItem = null;
  function openItem(id, fromSearch) {
    const it = st.items.find(i => i.id === id); if (!it) return;
    curItem = id;
    if (fromSearch) { st.recent = [id, ...st.recent.filter(x => x !== id)].slice(0, 8); save(); }
    fillView(it);
    $("view").showModal();
  }
  function fillView(it) {
    $("vName").textContent = it.name;
    const names = pathNames(it.place);
    $("vPath").replaceChildren(...names.map((n, i) => { const li = el("li", null, n); li.style.setProperty("--d", String(i)); return li; }));
    $("vNote").textContent = it.note;
    $("vMeta").textContent = `${jp(it.checked)}に確認（${ago(it.checked)}）` + (it.moved ? `・${jp(it.moved)}に移動` : "");
  }
  $("vClose").addEventListener("click", () => { $("view").close(); render(); });
  $("vHere").addEventListener("click", () => {
    const it = st.items.find(i => i.id === curItem); if (!it) return;
    const snap = snapshot(); it.checked = today; save(); fillView(it); flashId = it.id;
    $("view").close(); render();
    toast(`「${it.name}」は記録どおりの場所にありました。`, () => { restore(snap); render(); });
  });
  $("vDel").addEventListener("click", () => {
    const it = st.items.find(i => i.id === curItem); if (!it) return;
    const snap = snapshot();
    st.items = st.items.filter(i => i !== it); st.recent = st.recent.filter(x => x !== it.id); save();
    $("view").close(); render();
    toast(`「${it.name}」の記録を消しました。`, () => { restore(snap); render(); });
  });
  $("vEdit").addEventListener("click", () => { $("view").close(); openEdit(curItem); });
  $("vMove").addEventListener("click", () => {
    const it = st.items.find(i => i.id === curItem); if (!it) return;
    $("view").close();
    $("mFrom").textContent = `いまの場所：${pathNames(it.place).join(" › ")}`;
    fillPlaceSelect($("mPlace"), it.place, { allowNew: true }); mPrev = it.place;
    $("mErr").textContent = "";
    $("moveDlg").showModal();
  });
  let mPrev = "";
  $("mPlace").addEventListener("change", () => {
    if ($("mPlace").value === "__new") openPlace({ parent: mPrev, after: id => { fillPlaceSelect($("mPlace"), id || mPrev, { allowNew: true }); mPrev = $("mPlace").value; } });
    else mPrev = $("mPlace").value;
  });
  $("mCancel").addEventListener("click", () => $("moveDlg").close());
  $("moveForm").addEventListener("submit", e => {
    e.preventDefault();
    const it = st.items.find(i => i.id === curItem); if (!it) return;
    const to = $("mPlace").value;
    if (!P(to)) { $("mErr").textContent = "移した先の場所を選んでください。"; return; }
    if (to === it.place) { $("mErr").textContent = "いまと同じ場所です。別の場所を選んでください。"; return; }
    const snap = snapshot();
    it.place = to; it.moved = today; it.checked = today; save(); flashId = it.id;
    $("moveDlg").close(); render();
    toast(`「${it.name}」を${pathNames(to).slice(-1)[0]}へ移しました。`, () => { restore(snap); render(); });
  });

  // ---------- 物の記録 ----------
  let editId = null, fPrev = "";
  function openEdit(id, placeId) {
    editId = id || null;
    const it = id ? st.items.find(i => i.id === id) : null;
    $("eH").textContent = it ? "記録を直す" : "しまった物を記録";
    $("fName").value = it ? it.name : "";
    $("fNote").value = it ? it.note : "";
    $("fChecked").value = it ? it.checked : today; $("fChecked").max = today;
    const pl = it ? it.place : placeId || (view === "place" && here) || lastPlace();
    fillPlaceSelect($("fPlace"), pl, { allowNew: true }); fPrev = $("fPlace").value;
    $("fPlaceHint").textContent = st.places.length ? "" : "まだ場所がありません。「＋ 新しい場所を作る…」から、部屋を作ってください。";
    $("fErr").textContent = ""; ["fName", "fPlace"].forEach(k => $(k).removeAttribute("aria-invalid"));
    $("edit").showModal();
    $("fName").focus();
  }
  const lastPlace = () => st.items.length ? st.items[st.items.length - 1].place : "";
  $("fPlace").addEventListener("change", () => {
    if ($("fPlace").value === "__new") openPlace({ parent: P(fPrev) ? fPrev : "", after: id => { fillPlaceSelect($("fPlace"), id || fPrev, { allowNew: true }); fPrev = $("fPlace").value; $("fPlaceHint").textContent = ""; } });
    else { fPrev = $("fPlace").value; $("fPlace").removeAttribute("aria-invalid"); }
  });
  $("fName").addEventListener("input", () => { $("fErr").textContent = ""; $("fName").removeAttribute("aria-invalid"); });
  $("eCancel").addEventListener("click", () => $("edit").close());
  $("itemForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = str($("fName").value, 30);
    if (!name) { $("fErr").textContent = "しまった物の名前を入れてください（例：パスポート）。"; $("fName").setAttribute("aria-invalid", "true"); $("fName").focus(); return; }
    const place = $("fPlace").value;
    if (!P(place)) { $("fErr").textContent = st.places.length ? "しまった場所を選んでください。" : "先に場所を作ってください。「しまった場所」で「＋ 新しい場所を作る…」を選びます。"; $("fPlace").setAttribute("aria-invalid", "true"); $("fPlace").focus(); return; }
    const ck = $("fChecked").value;
    if (ck && (!isYmd(ck) || ck > today)) { $("fErr").textContent = "確かめた日は、今日までの日付にしてください。"; $("fChecked").focus(); return; }
    const snap = snapshot();
    let it;
    if (editId) { it = st.items.find(i => i.id === editId); if (it.place !== place) it.moved = today; Object.assign(it, { name, place, note: str($("fNote").value, 60), checked: ck || today }); }
    else { it = { id: uid(), name, note: str($("fNote").value, 60), place, checked: ck || today, moved: "", sample: false }; st.items.push(it); }
    save(); flashId = it.id;
    $("edit").close(); render();
    toast(editId ? `「${it.name}」を直しました。` : `「${it.name}」は ${pathNames(place).join(" › ")}。記録しました。`, () => { restore(snap); render(); });
  });
  $("addBtn").addEventListener("click", () => openEdit());
  $("firstItem").addEventListener("click", () => openEdit());

  // ---------- 場所を作る ----------
  const PRESETS = {
    room: ["リビング", "寝室", "台所", "洗面所", "玄関", "和室", "子ども部屋", "書斎", "物置"],
    storage: ["クローゼット", "押し入れ", "引き出し", "本棚", "食器棚", "テレビ台", "靴箱", "机", "洗面台の下", "天袋"],
    spot: ["上段", "中段", "下段", "1段目", "2段目", "奥", "手前", "左側", "右側", "青い箱", "白い箱", "紙袋", "ファイルボックス"]
  };
  const SETS = { room: "部屋", storage: "収納", spot: "段・箱" };
  const setFor = d => d === 0 ? "room" : d === 1 ? "storage" : "spot";
  let pCtx = null, pFc = null;
  function openPlace(ctx) {
    pCtx = ctx; // {parent, after(id)} か {rename: id}
    const ren = ctx.rename ? P(ctx.rename) : null;
    $("pH").textContent = ren ? "名前を変える" : "場所を作る";
    $("pOk").textContent = ren ? "変える" : "作る";
    $("pParentF").hidden = !!ren;
    if (!ren) fillPlaceSelect($("pParent"), ctx.parent || "", { root: true });
    $("pErr").textContent = "";
    renderPChips(ren ? ren.name : "");
    $("placeDlg").showModal();
  }
  function curSet() { const ren = pCtx && pCtx.rename ? P(pCtx.rename) : null; return setFor(ren ? depth(ren.parent) : depth($("pParent").value)); }
  function renderPChips(selected) {
    const set = curSet();
    $("pLegend").textContent = `${SETS[set]}の名前`;
    pFc = window.FreeChoice({
      key: CK, set, label: `${SETS[set]}の名前`, max: 20,
      placeholder: set === "room" ? "納戸、2階の廊下" : set === "storage" ? "カラーボックス、キッチンの吊り戸棚" : "赤い缶、3段目の右",
      builtins: () => PRESETS[set].map(v => ({ value: v, label: v })),
      onChange: () => renderPChips(pickedName()),
      onPick: v => { renderPChips(v); $("pErr").textContent = ""; }
    });
    const chip = (v, extra) => {
      const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "pname"; r.value = v; r.checked = v === selected;
      r.addEventListener("change", () => { $("pErr").textContent = ""; });
      l.append(r, el("span", null, v)); return extra ? l : l;
    };
    const own = pFc.values();
    const nodes = PRESETS[set].map(v => chip(v));
    own.forEach(v => nodes.push(pFc.wrap(chip(v), v)));
    if (selected && !PRESETS[set].includes(selected) && !own.includes(selected)) nodes.push(chip(selected));
    $("pChips").replaceChildren(...nodes, pFc.root);
  }
  const pickedName = () => (document.querySelector("input[name=pname]:checked") || {}).value || "";
  $("pParent").addEventListener("change", () => renderPChips(pickedName()));
  $("pCancel").addEventListener("click", () => { $("placeDlg").close(); });
  $("placeDlg").addEventListener("close", () => { if (pCtx && pCtx.after && !pCtx.done) pCtx.after(""); });
  $("placeForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = pickedName();
    if (!name) { $("pErr").textContent = "名前を選ぶか、「＋ 自分で入力」で入れてください。"; return; }
    const snap = snapshot();
    if (pCtx.rename) {
      const p = P(pCtx.rename); const old = p.name; p.name = name; save();
      pCtx.done = true; $("placeDlg").close(); render();
      toast(`「${old}」を「${name}」に変えました。`, () => { restore(snap); render(); });
      return;
    }
    const parent = $("pParent").value;
    if (kids(parent).some(k => kana(k.name) === kana(name))) { $("pErr").textContent = `「${name}」はもうあります。別の名前にしてください。`; return; }
    const p = { id: uid(), name, parent, sample: false };
    st.places.push(p); save();
    pCtx.done = true; $("placeDlg").close();
    if (pCtx.after) pCtx.after(p.id);
    render();
    toast(`「${pathNames(p.id).join(" › ")}」を作りました。`, () => { restore(snap); render(); });
  });

  // ---------- 場所ごとに見る ----------
  function renderPlace() {
    if (here && !P(here)) here = "";
    const ch = chain(here);
    const crumbs = [{ id: "", name: "家の中" }, ...ch];
    $("crumbs").replaceChildren(...crumbs.flatMap((c, i) => {
      const b = el("button", "crumb", c.name); b.type = "button";
      if (i === crumbs.length - 1) b.setAttribute("aria-current", "location");
      else b.addEventListener("click", () => { here = c.id; renderPlace(); });
      return i ? [el("span", "sep", "›"), b] : [b];
    }));
    $("crumbs").hidden = !here;
    $("hereName").textContent = here ? P(here).name : "家の中";
    const all = here ? under(here) : null;
    const inside = st.items.filter(i => !all || all.includes(i.place));
    const children = kids(here);
    $("hereSub").textContent = here ? `${SETS[setFor(depth(here) - 1)]}・中に${inside.length}点` : st.places.length ? `部屋${children.length}つ・ぜんぶで${inside.length}点` : "";
    const d = depth(here);
    const boxes = children.map(p => {
      const b = el("button", "box"); b.type = "button";
      const n = st.items.filter(i => under(p.id).includes(i.place)).length;
      const sub = kids(p.id).length;
      b.append(el("b", null, p.name), el("small", null, `${n}点` + (sub ? `・中に${sub}か所` : "")));
      b.addEventListener("click", () => { here = p.id; renderPlace(); window.scrollTo({ top: 0 }); });
      return b;
    });
    const add = el("button", "box add-box", here ? `＋ 中に${SETS[setFor(d)]}を作る` : "＋ 部屋を作る"); add.type = "button";
    add.addEventListener("click", () => openPlace({ parent: here }));
    $("boxes").replaceChildren(...boxes, add);

    const acts = [];
    if (here) {
      const a = el("button", "btn small", "ここに物を記録"); a.type = "button"; a.addEventListener("click", () => openEdit(null, here)); acts.push(a);
      const r = el("button", "btn ghost small", "名前を変える"); r.type = "button"; r.addEventListener("click", () => openPlace({ rename: here })); acts.push(r);
      const x = el("button", "btn ghost small", "この場所を消す"); x.type = "button"; x.addEventListener("click", () => delPlace(here)); acts.push(x);
    }
    $("placeActs").replaceChildren(...acts);

    $("insideBox").hidden = !inside.length || !here;
    $("placeEmpty").hidden = true;
    if (!here && !st.places.length) { $("placeEmpty").hidden = false; $("placeEmpty").textContent = "まだ場所がありません。「＋ 部屋を作る」から、寝室やリビングを作りましょう。"; }
    else if (here && !inside.length) { $("placeEmpty").hidden = false; $("placeEmpty").textContent = "ここにしまった物はまだありません。「ここに物を記録」で入れられます。"; }
    if (!here || !inside.length) return;
    $("insideH").textContent = `この中にあるもの（${inside.length}点）`;
    // 中の場所ごとにまとめる
    const groups = new Map();
    all.forEach(pid => { const its = inside.filter(i => i.place === pid); if (its.length) groups.set(pid, its); });
    const base = ch.length;
    $("insideList").replaceChildren(...[...groups].map(([pid, its]) => {
      const g = el("div", "grp");
      const rel = pathNames(pid).slice(base);
      g.append(el("h4", "grp-h", rel.length ? rel.join(" › ") : `${P(here).name}（じか置き）`));
      const ul = el("ul");
      its.forEach(it => {
        const li = el("li"); const b = el("button", "row-item"); b.type = "button";
        b.append(el("b", null, it.name), el("small", isOld(it.checked) ? "old" : null, `${ago(it.checked)}に確認`));
        b.addEventListener("click", () => openItem(it.id, false));
        li.append(b); ul.append(li);
      });
      g.append(ul); return g;
    }));
  }
  $("allChecked").addEventListener("click", () => {
    const all = under(here); const its = st.items.filter(i => all.includes(i.place));
    if (!its.length) return;
    const snap = snapshot(); its.forEach(i => { i.checked = today; }); save(); render();
    toast(`${P(here).name}の${its.length}点を、今日確認したことにしました。`, () => { restore(snap); render(); });
  });
  function delPlace(id) {
    const p = P(id); if (!p) return;
    const n = st.items.filter(i => i.place === id).length, sub = kids(id).length;
    const up = p.parent ? P(p.parent) : null;
    if ((n || sub) && !up) {
      if (!confirm(`「${p.name}」には${n ? `物が${n}点` : ""}${n && sub ? "、" : ""}${sub ? `場所が${sub}か所` : ""}あります。中の場所と物もまとめて消しますか？`)) return;
    }
    const snap = snapshot();
    if (up) {
      st.places.forEach(k => { if (k.parent === id) k.parent = up.id; });
      st.items.forEach(i => { if (i.place === id) i.place = up.id; });
      st.places = st.places.filter(x => x.id !== id);
    } else {
      const all = under(id);
      st.items = st.items.filter(i => !all.includes(i.place));
      st.places = st.places.filter(x => !all.includes(x.id));
    }
    st.recent = st.recent.filter(r => st.items.some(i => i.id === r));
    save(); here = p.parent; render();
    toast(up && (n || sub) ? `「${p.name}」を消して、中身を${up.name}に移しました。` : `「${p.name}」を消しました。`, () => { restore(snap); here = id; render(); });
  }

  // ---------- 例 ----------
  $("sampleBtn").addEventListener("click", () => {
    const snap = snapshot();
    const mk = (name, parent) => { const p = { id: uid(), name, parent: parent || "", sample: true }; st.places.push(p); return p.id; };
    const bed = mk("寝室"), clo = mk("クローゼット", bed), top = mk("上段", clo), blue = mk("青い箱", top), low = mk("下段", clo);
    const liv = mk("リビング"), tv = mk("テレビ台", liv), drawer = mk("左の引き出し", tv), shelf = mk("本棚", liv), file = mk("ファイルボックス", shelf);
    const ent = mk("玄関"), shoe = mk("靴箱", ent), shoeLow = mk("下段", shoe);
    const wa = mk("和室"), oshi = mk("押し入れ", wa), ten = mk("天袋", oshi);
    const back = d => { const x = parseYmd(today); x.setDate(x.getDate() - d); return ymd(x); };
    const it = (name, place, note, d) => st.items.push({ id: uid(), name, place, note, checked: back(d), moved: "", sample: true });
    it("パスポート", blue, "家族4人分。母子手帳も同じ箱", 40);
    it("年金手帳", blue, "", 400);
    it("予備の電池", drawer, "単3が8本、単4が4本", 12);
    it("家電の保証書", file, "買った順にクリアファイルへ", 90);
    it("冬物のコート", low, "クリーニングの袋のまま", 200);
    it("工具セット", shoeLow, "ドライバー、メジャー、六角レンチ", 30);
    it("ひな人形", ten, "箱は2つ。小さい箱が道具", 250);
    save(); render();
    toast("例を入れました。上の欄に「ぱすぽ」と入れて、さがしてみてください。", () => { restore(snap); render(); });
  });
  $("clearSample").addEventListener("click", () => {
    const snap = snapshot();
    const keepPlace = new Set(st.items.filter(i => !i.sample).map(i => i.place));
    // 自分の物が入っている例の場所（とその外側）は残す
    const keep = new Set();
    keepPlace.forEach(id => chain(id).forEach(p => keep.add(p.id)));
    st.places.filter(p => !p.sample).forEach(p => chain(p.id).forEach(x => keep.add(x.id)));
    st.items = st.items.filter(i => !i.sample);
    st.places = st.places.filter(p => !p.sample || keep.has(p.id));
    st.places.forEach(p => { if (p.sample) p.sample = false; });
    st.recent = st.recent.filter(r => st.items.some(i => i.id === r));
    save(); here = ""; render();
    toast("例を消しました。", () => { restore(snap); render(); });
  });

  // ---------- 表示 ----------
  function render() {
    $("sampleBar").hidden = !st.items.some(i => i.sample) && !st.places.some(p => p.sample);
    if (view === "find") renderFind(); else renderPlace();
    flashId = null;
  }

  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const readCustom = () => { try { const o = JSON.parse(localStorage.getItem(CK) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "shimatta", version: 1, exportedAt: new Date().toISOString(), data: st, custom: readCustom() }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `shimatta-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, custom = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "shimatta") { data = clean(j.data); custom = j.custom; } } catch (e) { data = null; }
    if (!data || (!data.places.length && !data.items.length)) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if ((st.items.length || st.places.length) && !confirm(`いまの記録を、ファイルの場所${data.places.length}か所・物${data.items.length}点と置きかえますか？`)) return;
    const snap = snapshot(), csnap = JSON.stringify(readCustom());
    st = data; save();
    if (custom && typeof custom === "object" && !Array.isArray(custom)) { const c = {}; Object.keys(SETS).forEach(k => { if (Array.isArray(custom[k])) c[k] = custom[k].filter(v => typeof v === "string").slice(0, 60); }); try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) {} }
    here = ""; render();
    $("moveMsg").textContent = `場所${data.places.length}か所、物${data.items.length}点を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); try { localStorage.setItem(CK, csnap); } catch (e) {} render(); });
  });

  render();
})();
