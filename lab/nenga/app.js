// 年賀状リスト — 人ごとに、年ごとの「出した・来た・喪中」を記録し、去年のやりとりから今年出す人を決める。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-nenga-v1";
  const FC = window.FreeChips;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const tidy = s => String(s == null ? "" : s).replace(/[\s　]+/g, " ").trim();
  const GROUPS = ["家族", "親戚", "友人", "仕事", "学校", "ご近所", "恩師"];
  const groupStore = FC.store("lab-nenga-v1.custom", { limit: 30 });

  // 年賀状の「年」= その年のお正月。10月からは次のお正月を見る。
  const now = new Date();
  const defaultYear = () => (now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear());
  const reiwa = y => (y >= 2019 ? (y === 2019 ? "令和元年" : `令和${y - 2018}年`) : `平成${y - 1988}年`);

  // ---------- 保存 ----------
  function blank() { return { people: [], year: defaultYear(), self: {}, sample: false }; }
  function cleanRec(r) {
    if (!r || typeof r !== "object") return null;
    const o = { s: [0, 1, 2].includes(r.s) ? r.s : 0, r: !!r.r, m: !!r.m };
    if (r.p === true || r.p === false) o.p = r.p;
    return (o.s || o.r || o.m || "p" in o) ? o : null;
  }
  function cleanPerson(p) {
    if (!p || typeof p !== "object") return null;
    const name = tidy(p.name).slice(0, 30);
    if (!name) return null;
    const y = {};
    if (p.y && typeof p.y === "object") Object.keys(p.y).forEach(k => { if (/^\d{4}$/.test(k)) { const r = cleanRec(p.y[k]); if (r) y[k] = r; } });
    return {
      id: typeof p.id === "string" && p.id ? p.id.slice(0, 40) : uid(),
      name, group: tidy(p.group).slice(0, 20) || "友人",
      memo: tidy(p.memo).slice(0, 40),
      addr: String(p.addr == null ? "" : p.addr).replace(/\r/g, "").slice(0, 200).trim(),
      stop: !!p.stop, sample: !!p.sample, y
    };
  }
  function clean(d) {
    const o = blank();
    if (!d || typeof d !== "object") return null;
    if (!Array.isArray(d.people)) return null;
    o.people = d.people.map(cleanPerson).filter(Boolean).slice(0, 2000);
    if (Number.isInteger(d.year) && d.year >= 1990 && d.year <= 2100) o.year = d.year;
    if (d.self && typeof d.self === "object") Object.keys(d.self).forEach(k => { if (/^\d{4}$/.test(k) && d.self[k]) o.self[k] = true; });
    o.sample = !!d.sample && o.people.some(p => p.sample);
    return o;
  }
  let st = blank();
  try { const v = clean(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 読めなければ新しく始める */ }
  // 開いたときは、いつも「今のお正月」から
  st.year = defaultYear();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("保存できませんでした。ブラウザの設定で保存を許可してください。"); } }
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); render(); };

  // ---------- 判定 ----------
  const rec = (p, y) => p.y[y] || { s: 0, r: false, m: false };
  const hasHistoryBefore = (p, y) => Object.keys(p.y).some(k => +k < y && (p.y[k].s || p.y[k].r || p.y[k].m));
  // 去年から見て、この年に出すかどうか
  function autoPlan(p, y) {
    if (!hasHistoryBefore(p, y)) return true; // 新しく入れた人は出す
    const last = rec(p, y - 1);
    if (last.s || last.r) return true;
    if (last.m) { // 去年喪中だった人は、おととしのやりとりで判断
      const two = rec(p, y - 2);
      return !!(two.s || two.r) || !Object.keys(p.y).some(k => +k < y - 1);
    }
    return false;
  }
  function plan(p, y) {
    const r = rec(p, y);
    if (p.stop || r.m) return false;
    if (r.p === true || r.p === false) return r.p;
    return autoPlan(p, y);
  }
  function why(p, y) {
    const r = rec(p, y);
    if (p.stop) return "年賀状じまい";
    if (r.m) return "喪中のため出さない";
    if (r.p === true) return "この年は出すと決めた";
    if (r.p === false) return "この年は出さないと決めた";
    if (!hasHistoryBefore(p, y)) return "新しく追加した人";
    const l = rec(p, y - 1), parts = [];
    if (l.m) return "去年は喪中";
    if (l.s === 2) parts.push("来てから出した");
    else if (l.s) parts.push("出した");
    if (l.r) parts.push("来た");
    if (!parts.length) return "去年はやりとりなし";
    if (l.s && !l.r) return "去年：出したが、来なかった";
    return "去年：" + parts.join("・");
  }

  // ---------- 画面 ----------
  let filter = "plan";
  function setRec(p, y, patch) {
    const r = Object.assign({}, rec(p, y), patch);
    const c = cleanRec(r);
    if (c) p.y[y] = c; else delete p.y[y];
  }

  function render() {
    const y = st.year;
    $("yrMain").textContent = `${y}年（${reiwa(y)}）`;
    const dy = defaultYear();
    $("yrSub").textContent = y === dy ? "今度のお正月" : y === dy - 1 ? "前のお正月" : y < dy ? `${dy - y}年前のお正月` : "先のお正月";
    const selfM = !!st.self[y];
    $("selfMochu").checked = selfM;
    $("selfNote").hidden = !selfM;
    $("lPlan").textContent = selfM ? "喪中はがき" : "出す人";

    const ps = st.people;
    const planned = ps.filter(p => plan(p, y));
    const sent = ps.filter(p => rec(p, y).s).length;
    const recv = ps.filter(p => rec(p, y).r).length;
    const mochu = ps.filter(p => rec(p, y).m).length;
    $("nPlan").textContent = planned.length;
    $("nSent").textContent = sent;
    $("nRecv").textContent = recv;
    $("nMochu").textContent = mochu;
    const left = planned.filter(p => !rec(p, y).s).length;
    const need = $("need"); need.textContent = "";
    if (ps.length) {
      if (left) {
        need.append("あと");
        need.append(el("b", null, `${left}枚`));
        need.append(selfM ? "。" : `。はがきは予備を入れて${left + Math.max(2, Math.ceil(left * 0.1))}枚あると安心です。`);
      } else if (planned.length) need.append("出す人全員に出しました。");
    }

    $("first").hidden = ps.length > 0;
    ["board", "need", "selfBox", "actions", "filters"].forEach(id => { $(id).hidden = !ps.length; });
    $("mochuTip").hidden = !(mochu > 0 && (filter === "mochu" || filter === "all"));
    [...$("filters").children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === filter)));

    const shown = ps.filter(p => {
      const r = rec(p, y);
      if (filter === "plan") return plan(p, y);
      if (filter === "todo") return plan(p, y) && !r.s;
      if (filter === "reply") return r.r && !r.s && !p.stop;
      if (filter === "mochu") return r.m;
      return true;
    });
    const list = $("list"); list.textContent = "";
    const empty = $("empty");
    if (!ps.length) { empty.hidden = true; return; }
    if (!shown.length) {
      empty.hidden = false;
      empty.textContent = {
        plan: "出す人はいません。「全員」から、出す人を選べます。",
        todo: "まだ出していない人はいません。",
        reply: "来たのに返事を出していない人はいません。",
        mochu: "喪中の人はいません。喪中はがきが届いたら、その人の「喪中」を押します。",
        all: ""
      }[filter];
      return;
    }
    empty.hidden = true;
    const order = groupOrder();
    const groups = new Map();
    shown.forEach(p => { if (!groups.has(p.group)) groups.set(p.group, []); groups.get(p.group).push(p); });
    const keys = [...groups.keys()].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, "ja");
    });
    keys.forEach(g => {
      const sec = el("section", "grp");
      const h = el("h3", null, g); h.append(el("small", null, `${groups.get(g).length}人`));
      const ul = el("ul");
      groups.get(g).sort((a, b) => a.name.localeCompare(b.name, "ja")).forEach(p => ul.append(personRow(p, y)));
      sec.append(h, ul); list.append(sec);
    });
  }

  function groupOrder() { return GROUPS.concat(groupStore.all()); }
  function byGroup(a, b) {
    const o = groupOrder(), ia = o.indexOf(a.group), ib = o.indexOf(b.group);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.group.localeCompare(b.group, "ja") || a.name.localeCompare(b.name, "ja");
  }

  function personRow(p, y) {
    const r = rec(p, y), pl = plan(p, y);
    const li = el("li", "person"); li.dataset.id = p.id;
    if (p.stop) li.classList.add("is-stop");
    else if (r.m) li.classList.add("is-mochu");
    else if (r.s) li.classList.add("is-done");
    else if (pl) li.classList.add("is-plan");
    const head = el("div", "p-head");
    const nb = el("button", "p-name"); nb.type = "button";
    nb.setAttribute("aria-label", `${p.name}を編集`);
    nb.append(el("b", null, p.name), el("span", "p-why", why(p, y)));
    if (p.memo) nb.append(el("span", "p-memo", p.memo));
    nb.addEventListener("click", () => openSheet(p));
    let tag;
    if (r.m) tag = el("span", "p-tag mochu", "喪中");
    else if (r.s) tag = el("span", "p-tag done", r.s === 2 ? "返信済み" : "出した");
    else if (pl) tag = el("span", "p-tag plan", st.self[y] ? "喪中はがき" : "出す");
    else tag = el("span", "p-tag skip", "出さない");
    head.append(nb, tag);
    li.append(head);
    if (!p.stop) {
      const btns = el("div", "p-btns");
      const mk = (cls, label, on, fn) => {
        const b = el("button", "tog " + cls); b.type = "button";
        b.setAttribute("aria-pressed", String(on));
        b.append(el("span", "stamp", (on ? "✓ " : "") + label));
        b.setAttribute("aria-label", `${p.name}：${label}`);
        b.addEventListener("click", () => { fn(); save(); render(); flash(p.id, cls); });
        return b;
      };
      btns.append(
        mk("t-sent", "出した", !!r.s, () => setRec(p, y, { s: r.s ? 0 : (r.r ? 2 : 1) })),
        mk("t-recv", "来た", r.r, () => setRec(p, y, { r: !r.r })),
        mk("t-mochu", "喪中", r.m, () => setRec(p, y, { m: !r.m }))
      );
      li.append(btns);
      if (r.s) {
        const late = el("button", "late"); late.type = "button";
        late.setAttribute("aria-pressed", String(r.s === 2));
        late.textContent = r.s === 2 ? "✓ 来てから出した" : "来てから出した";
        late.addEventListener("click", () => { setRec(p, y, { s: r.s === 2 ? 1 : 2 }); save(); render(); });
        li.append(late);
      }
    }
    return li;
  }
  // 押したボタンに判子のような動き
  function flash(id, cls) {
    const li = [...document.querySelectorAll(".person")].find(x => x.dataset.id === id);
    const b = li && li.querySelector(".tog." + cls);
    if (b && b.getAttribute("aria-pressed") === "true") { b.classList.add("pop"); b.focus(); }
    else if (b) b.focus();
  }

  // ---------- 年の切り替え ----------
  $("prevYr").addEventListener("click", () => { st.year--; save(); render(); });
  $("nextYr").addEventListener("click", () => { if (st.year < defaultYear() + 3) { st.year++; save(); render(); } });
  $("selfMochu").addEventListener("change", () => { if ($("selfMochu").checked) st.self[st.year] = true; else delete st.self[st.year]; save(); render(); });
  $("filters").addEventListener("click", e => { const b = e.target.closest("button[data-f]"); if (!b) return; filter = b.dataset.f; render(); });

  // ---------- グループの選択肢 ----------
  function groupChips(box, getSel, setSel) {
    box.textContent = "";
    const cur = getSel();
    const all = GROUPS.concat(groupStore.all());
    if (cur && !all.includes(cur)) all.push(cur); // 外した候補でも、この人の値は見せる
    all.forEach(g => {
      const b = el("button", null, g); b.type = "button"; b.dataset.v = g;
      b.setAttribute("aria-pressed", String(g === cur));
      b.addEventListener("click", () => { setSel(g); groupChips(box, getSel, setSel); });
      if (groupStore.has(g)) {
        const w = el("span", "fc-item"); w.append(b, FC.remover(g, () => {
          const i = groupStore.remove(g);
          groupChips(box, getSel, setSel);
          toast(`「${g}」を候補から外しました。`, () => { groupStore.insert(g, i); groupChips(box, getSel, setSel); });
        }));
        box.append(w);
      } else box.append(b);
    });
    const ad = FC.adder({
      placeholder: "サークル", aria: "グループの名前", max: 20, empty: "グループの名前を入れてください。",
      submit: v => {
        const hit = GROUPS.find(g => g === v);
        if (!hit) groupStore.add(v);
        setSel(hit || v); groupChips(box, getSel, setSel);
        return null;
      }
    });
    box.append(ad.btn, ad.form);
  }

  // ---------- 追加・編集 ----------
  let editing = null, sel = { group: "友人", p: "auto" }, lastFocus = null;
  function openSheet(p) {
    lastFocus = document.activeElement;
    editing = p || null;
    $("sheetH").textContent = p ? "編集" : "人を追加";
    $("fName").value = p ? p.name : "";
    $("fMemo").value = p ? p.memo : "";
    $("fAddr").value = p ? p.addr : "";
    $("fName").removeAttribute("aria-invalid"); $("fNameErr").textContent = "";
    sel.group = p ? p.group : (sel.lastGroup || "友人");
    const r = p ? rec(p, st.year) : {};
    sel.p = r.p === true ? "yes" : r.p === false ? "no" : "auto";
    $("editOnly").hidden = !p; $("delBtn").hidden = !p;
    if (p) {
      $("fStop").checked = p.stop;
      [...$("planSeg").children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === sel.p)));
      const h = $("hist"); h.textContent = "";
      const ys = Object.keys(p.y).map(Number).sort((a, b) => b - a);
      if (!ys.length) h.append(el("p", null, "まだ記録はありません。"));
      ys.slice(0, 6).forEach(k => {
        const x = p.y[k], parts = [];
        if (x.m) parts.push("喪中");
        if (x.s) parts.push(x.s === 2 ? "来てから出した" : "出した");
        if (x.r) parts.push("来た");
        if (x.p === true) parts.push("出すと決めた");
        if (x.p === false) parts.push("出さないと決めた");
        h.append(el("p", null, `${k}年：${parts.join("・") || "なし"}`));
      });
    }
    groupChips($("groupChips"), () => sel.group, g => { sel.group = g; });
    $("sheetBg").hidden = false;
    $("fName").focus();
  }
  function closeSheet(bg) { $(bg).hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("planSeg").addEventListener("click", e => {
    const b = e.target.closest("button[data-p]"); if (!b) return;
    sel.p = b.dataset.p;
    [...$("planSeg").children].forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("addBtn").addEventListener("click", () => openSheet(null));
  $("first-add").addEventListener("click", () => openSheet(null));
  $("cancelBtn").addEventListener("click", () => closeSheet("sheetBg"));
  $("fName").addEventListener("input", () => { $("fName").removeAttribute("aria-invalid"); $("fNameErr").textContent = ""; });
  $("fName").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $("saveBtn").click(); } });
  $("saveBtn").addEventListener("click", () => {
    const name = tidy($("fName").value).slice(0, 30);
    if (!name) { $("fNameErr").textContent = "名前を入れてください。"; $("fName").setAttribute("aria-invalid", "true"); $("fName").focus(); return; }
    const dup = st.people.find(p => p.name === name && p !== editing);
    const data = { name, group: sel.group, memo: tidy($("fMemo").value).slice(0, 40), addr: $("fAddr").value.replace(/\r/g, "").slice(0, 200).trim() };
    sel.lastGroup = sel.group;
    if (editing) {
      Object.assign(editing, data);
      editing.stop = $("fStop").checked;
      setRec(editing, st.year, { p: sel.p === "yes" ? true : sel.p === "no" ? false : undefined });
      const r = editing.y[st.year]; if (r && sel.p === "auto") { delete r.p; if (!cleanRec(r)) delete editing.y[st.year]; }
      save(); closeSheet("sheetBg"); render();
      toast(`「${name}」を保存しました。`);
    } else {
      if (dup && !confirm(`「${name}」は登録済みです。同じ名前でもう1人追加しますか？`)) return;
      st.people.push(Object.assign({ id: uid(), stop: false, y: {} }, data));
      save(); closeSheet("sheetBg"); render();
      toast(`「${name}」を追加しました。`);
    }
  });
  $("delBtn").addEventListener("click", () => {
    if (!editing) return;
    const snap = snapshot(), name = editing.name;
    st.people = st.people.filter(p => p !== editing);
    save(); closeSheet("sheetBg"); render();
    toast(`「${name}」を削除しました。`, () => restore(snap));
  });

  // まとめて追加
  let bulkGroup = "友人";
  $("bulkBtn").addEventListener("click", () => {
    lastFocus = document.activeElement;
    $("bulkText").value = ""; $("bulkErr").textContent = ""; $("bulkText").removeAttribute("aria-invalid");
    groupChips($("bulkChips"), () => bulkGroup, g => { bulkGroup = g; });
    $("bulkBg").hidden = false; $("bulkText").focus();
  });
  $("bulkCancel").addEventListener("click", () => closeSheet("bulkBg"));
  $("bulkText").addEventListener("input", () => { $("bulkErr").textContent = ""; $("bulkText").removeAttribute("aria-invalid"); });
  $("bulkSave").addEventListener("click", () => {
    const names = $("bulkText").value.split(/\n/).map(s => tidy(s).slice(0, 30)).filter(Boolean);
    if (!names.length) { $("bulkErr").textContent = "名前を1行に1人ずつ入れてください。"; $("bulkText").setAttribute("aria-invalid", "true"); $("bulkText").focus(); return; }
    const snap = snapshot();
    const have = new Set(st.people.map(p => p.name));
    const add = [...new Set(names)].filter(n => !have.has(n)).slice(0, 500);
    add.forEach(n => st.people.push({ id: uid(), name: n, group: bulkGroup, memo: "", addr: "", stop: false, y: {} }));
    save(); closeSheet("bulkBg"); render();
    const skip = names.length - add.length;
    toast(`${add.length}人を追加しました。` + (skip ? `（${skip}人は登録済みのため省きました）` : ""), () => restore(snap));
  });

  // 例
  $("sampleBtn").addEventListener("click", () => {
    const y = st.year, l = y - 1;
    const S = (name, group, memo, last, cur) => ({ id: uid(), name, group, memo, addr: "", stop: false, sample: true, y: Object.assign({}, last ? { [l]: last } : {}, cur ? { [y]: cur } : {}) });
    st.people = [
      S("祖母", "家族", "", { s: 1, r: true, m: false }),
      S("中村のおじさん", "親戚", "", { s: 1, r: true, m: false }, { s: 0, r: false, m: true }),
      S("高橋 彩", "友人", "大学のゼミ", { s: 2, r: true, m: false }),
      S("林 健太", "友人", "", { s: 1, r: false, m: false }),
      S("木村 課長", "仕事", "", { s: 1, r: true, m: false }),
      S("前の職場の小川さん", "仕事", "", { s: 0, r: false, m: false }, null),
      S("田中先生", "恩師", "中学の担任", null)
    ];
    // 「前の職場の小川さん」は、おととしまでやりとりしていた
    st.people[5].y[y - 2] = { s: 1, r: true, m: false };
    st.sample = true;
    save(); render();
    toast("例を追加しました。不要なら「全員」から削除できます。", () => { st.people = []; st.sample = false; save(); render(); });
  });

  // ---------- 印刷 ----------
  let printWho = "plan";
  $("printBtn").addEventListener("click", () => {
    if (!st.people.length) { toast("先に人を追加してください。"); return; }
    lastFocus = document.activeElement;
    $("printBg").hidden = false; $("printGo").focus();
  });
  $("printSeg").addEventListener("click", e => {
    const b = e.target.closest("button[data-w]"); if (!b) return;
    printWho = b.dataset.w;
    [...$("printSeg").children].forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("printCancel").addEventListener("click", () => closeSheet("printBg"));
  function buildPrint() {
    const y = st.year, ps = st.people.filter(p => printWho === "all" || plan(p, y));
    const withAddr = $("prAddr").checked;
    const box = $("printSheet"); box.textContent = "";
    box.append(el("h2", null, `${y}年（${reiwa(y)}）の${st.self[y] ? "喪中はがき" : "年賀状"}　${printWho === "all" ? "全員" : "出す人"}`));
    box.append(el("p", null, `${ps.length}人`));
    const t = el("table"), th = el("tr");
    ["✓", "名前", "グループ", "去年"].concat(withAddr ? ["住所"] : []).concat(["メモ"]).forEach(s => th.append(el("th", null, s)));
    const thead = el("thead"); thead.append(th); t.append(thead);
    const tb = el("tbody");
    ps.slice().sort(byGroup).forEach(p => {
      const r = rec(p, y), tr = el("tr");
      tr.append(el("td", "ck", r.s ? "✓" : "□"), el("td", null, p.name), el("td", null, p.group), el("td", null, why(p, y).replace(/^去年：/, "")));
      if (withAddr) tr.append(el("td", "ad", p.addr));
      tr.append(el("td", null, p.memo));
      tb.append(tr);
    });
    t.append(tb); box.append(t);
  }
  $("printGo").addEventListener("click", () => { buildPrint(); closeSheet("printBg"); setTimeout(() => window.print(), 50); });
  window.addEventListener("beforeprint", () => { if (!$("printSheet").childNodes.length) buildPrint(); });

  // Esc でシートを閉じる
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    ["sheetBg", "bulkBg", "printBg"].forEach(id => { if (!$(id).hidden) closeSheet(id); });
  });
  ["sheetBg", "bulkBg", "printBg"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) closeSheet(id); }));

  // ---------- トースト ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const pad = n => String(n).padStart(2, "0");
  $("expBtn").addEventListener("click", () => {
    const out = { app: "nenga", version: 1, exportedAt: new Date().toISOString(), data: st, groups: groupStore.all() };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `nenga-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, groups = [];
    try {
      if (f.size > 5e6) throw 0;
      const j = JSON.parse(await f.text());
      if (j && j.app === "nenga") { data = clean(j.data); if (Array.isArray(j.groups)) groups = j.groups.filter(g => typeof g === "string").map(g => tidy(g).slice(0, 20)).filter(Boolean); }
    } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.people.length && !confirm(`今の${st.people.length}人を、ファイルの${data.people.length}人と置き換えますか？`)) return;
    const snap = snapshot();
    data.year = defaultYear();
    st = data; groups.forEach(g => { if (!GROUPS.includes(g)) groupStore.add(g); });
    save(); render();
    $("moveMsg").textContent = `${data.people.length}人を読み込みました。`;
    toast("読み込みました。", () => restore(snap));
  });

  window.__nenga = { plan, autoPlan, why, get st() { return st; } };
  render();
})();
