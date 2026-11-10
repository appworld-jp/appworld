// 寸法メモ — 長さは mm で保存し、表示だけ cm／mm に切りかえる。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-sunpo-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const norm = s => (s || "").normalize("NFKC").toLowerCase();
  const AX = ["幅", "高さ", "奥行き"];
  const ROOM_SUGGEST = ["キッチン", "リビング", "寝室", "洗面所", "玄関", "子ども部屋", "和室", "トイレ"];
  const SPOT_SUGGEST = ["窓", "冷蔵庫置き場", "洗濯機パン", "本棚のすき間", "カーテンレール", "玄関ドア", "食器棚のすき間", "クローゼット", "ベッドの下", "テレビ台"];

  // ---------- 保存 ----------
  const num = v => (typeof v === "number" && isFinite(v) && v >= 0 && v < 1e6) ? Math.round(v * 10) / 10 : null;
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function clean(raw) {
    if (!raw || !Array.isArray(raw.rooms)) return null;
    const rooms = raw.rooms.slice(0, 50).filter(r => r && typeof r === "object").map(r => ({
      id: str(r.id, 20) || uid(), name: str(r.name, 20) || "部屋",
      spots: (Array.isArray(r.spots) ? r.spots : []).slice(0, 200).filter(s => s && typeof s === "object").map(s => ({
        id: str(s.id, 20) || uid(), name: str(s.name, 30) || "場所", w: num(s.w), h: num(s.h), d: num(s.d), note: str(s.note, 200)
      }))
    }));
    const f = raw.fit && typeof raw.fit === "object" ? raw.fit : {};
    return {
      v: 1, unit: raw.unit === "mm" ? "mm" : "cm", rooms,
      fit: { name: str(f.name, 30), w: num(f.w), h: num(f.h), d: num(f.d), ms: num(f.ms), mt: num(f.mt), mb: num(f.mb), rotY: f.rotY !== false, rotAll: !!f.rotAll }
    };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = clean({ rooms: [] });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  // ---------- 長さ ----------
  // 全角数字、「1,200」「1.2m」「850mm」「85センチ」も受けつける。単位がなければ今の単位。
  function parseLen(s) {
    s = norm(s).replace(/[\s,]/g, "").replace(/[ｍ]/g, "m");
    if (!s) return null;
    const m = s.match(/^(\d+(?:\.\d+)?|\.\d+)(mm|cm|m|ミリ|センチ|メートル|メ-トル)?$/);
    if (!m) return NaN;
    const u = m[2] || st.unit;
    const k = (u === "mm" || u === "ミリ") ? 1 : (u === "cm" || u === "センチ") ? 10 : 1000;
    const v = parseFloat(m[1]) * k;
    return v >= 1e6 ? NaN : Math.round(v * 10) / 10;
  }
  const inUnit = mm => st.unit === "mm" ? String(Math.round(mm)) : String(Math.round(mm) / 10).replace(/\.0$/, "");
  const fmt = mm => inUnit(mm) + st.unit;
  const field = mm => mm == null ? "" : inUnit(mm);

  // ---------- タブ ----------
  let tab = "list";
  function setTab(t) {
    tab = t;
    $("tabList").setAttribute("aria-pressed", String(t === "list"));
    $("tabFit").setAttribute("aria-pressed", String(t === "fit"));
    $("pList").hidden = t !== "list";
    $("pFit").hidden = t !== "fit";
    if (t === "fit") { fillFit(); renderFit(); } else renderList();
    window.scrollTo(0, 0);
  }
  $("tabList").addEventListener("click", () => setTab("list"));
  $("tabFit").addEventListener("click", () => setTab("fit"));

  function setUnit(u) {
    st.unit = u; save();
    $("uCm").setAttribute("aria-pressed", String(u === "cm"));
    $("uMm").setAttribute("aria-pressed", String(u === "mm"));
    document.querySelectorAll(".u-l").forEach(i => { i.textContent = u; });
    if (tab === "fit") { fillFit(); renderFit(); } else renderList();
  }
  $("uCm").addEventListener("click", () => setUnit("cm"));
  $("uMm").addEventListener("click", () => setUnit("mm"));

  // ---------- 一覧 ----------
  let editingRoom = null;
  function dimsLine(s) {
    const box = el("p", "dims-line");
    [s.w, s.h, s.d].forEach((v, i) => {
      if (i) box.append(el("span", "x", "×"));
      const c = el("span", v == null ? "dim none" : "dim");
      c.append(el("small", null, AX[i]), el("b", null, v == null ? "—" : inUnit(v)));
      box.append(c);
    });
    box.append(el("span", "u", st.unit));
    box.setAttribute("aria-label", [s.w, s.h, s.d].map((v, i) => `${AX[i]}${v == null ? "未記入" : fmt(v)}`).join("、"));
    return box;
  }
  function renderList() {
    const q = norm($("q").value).trim();
    const box = $("rooms"); box.replaceChildren();
    const total = st.rooms.reduce((n, r) => n + r.spots.length, 0);
    $("empty").hidden = st.rooms.length > 0 || !$("roomForm").hidden;
    $("addRoom").hidden = st.rooms.length === 0 || !$("roomForm").hidden;
    $("searchBox").hidden = total < 2;
    let hits = 0;
    st.rooms.forEach(r => {
      const roomHit = q && norm(r.name).includes(q);
      const spots = q && !roomHit ? r.spots.filter(s => norm(s.name + " " + s.note).includes(q)) : r.spots;
      if (q && !roomHit && !spots.length) return;
      hits += spots.length;
      const sec = el("section", "room");
      const head = el("div", "room-h");
      if (editingRoom === r.id) {
        const f = el("form", "rename"); f.noValidate = true;
        const inp = el("input"); inp.type = "text"; inp.maxLength = 20; inp.value = r.name; inp.setAttribute("aria-label", "部屋の名前");
        const ok = el("button", "btn small", "保存"); ok.type = "submit";
        const del = el("button", "btn ghost small danger", "部屋を削除"); del.type = "button";
        f.append(inp, ok, del);
        f.addEventListener("submit", e => { e.preventDefault(); const v = inp.value.trim().slice(0, 20); if (v) r.name = v; editingRoom = null; save(); renderList(); });
        del.addEventListener("click", () => {
          const snap = snapshot();
          st.rooms = st.rooms.filter(x => x.id !== r.id); editingRoom = null; save(); renderList();
          toast(`「${r.name}」を削除しました。`, () => { restore(snap); renderList(); });
        });
        head.append(f);
        setTimeout(() => inp.focus(), 0);
      } else {
        const h = el("h2", null, r.name);
        h.append(el("span", "n", `${r.spots.length}か所`));
        const more = el("button", "icon-btn", "編集"); more.type = "button";
        more.setAttribute("aria-label", `${r.name}の名前を変える・削除`);
        more.addEventListener("click", () => { editingRoom = r.id; renderList(); });
        head.append(h, more);
      }
      sec.append(head);
      const ul = el("ul", "spots");
      spots.forEach(s => {
        const li = el("li");
        const b = el("button", "spot"); b.type = "button";
        b.append(el("span", "spot-n", s.name), dimsLine(s));
        if (s.note) b.append(el("span", "spot-note", s.note));
        b.addEventListener("click", () => openSpot(r.id, s.id));
        li.append(b); ul.append(li);
      });
      sec.append(ul);
      if (!q) {
        const add = el("button", "add-spot", "＋ 寸法を追加"); add.type = "button";
        add.setAttribute("aria-label", `${r.name}に寸法を追加`);
        add.addEventListener("click", () => openSpot(r.id, null));
        sec.append(add);
      }
      box.append(sec);
    });
    $("found").textContent = q ? (hits ? `${hits}件見つかりました。` : "見つかりませんでした。ほかの言葉で探してみてください。") : "";
  }
  $("q").addEventListener("input", renderList);

  // 部屋の追加
  function openRoomForm() {
    $("roomForm").hidden = false; $("roomErr").textContent = ""; $("roomName").value = "";
    const chips = $("roomChips"); chips.replaceChildren();
    ROOM_SUGGEST.filter(n => !st.rooms.some(r => r.name === n)).forEach(n => {
      const c = el("button", "chip", n); c.type = "button";
      c.addEventListener("click", () => { $("roomName").value = n; $("roomName").focus(); });
      chips.append(c);
    });
    renderList(); $("roomName").focus();
  }
  $("firstRoom").addEventListener("click", openRoomForm);
  $("addRoom").addEventListener("click", openRoomForm);
  $("roomCancel").addEventListener("click", () => { $("roomForm").hidden = true; renderList(); });
  $("roomForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("roomName").value.trim().slice(0, 20);
    if (!name) { $("roomErr").textContent = "部屋の名前を入れてください。下の候補から選ぶこともできます。"; $("roomName").focus(); return; }
    const r = { id: uid(), name, spots: [] };
    st.rooms.push(r); save();
    $("roomForm").hidden = true; renderList();
    openSpot(r.id, null);
  });

  $("sample").addEventListener("click", () => {
    const S = (name, w, h, d, note) => ({ id: uid(), name, w: w == null ? null : w * 10, h: h == null ? null : h * 10, d: d == null ? null : d * 10, note: note || "" });
    st.rooms = [
      { id: uid(), name: "キッチン", spots: [S("冷蔵庫置き場", 68, 200, 70, "上に吊り戸棚あり。床から200cm。"), S("食器棚のすき間", 45, 180, 45)] },
      { id: uid(), name: "洗面所", spots: [S("洗濯機パン", 64, null, 64, "防水パンの内側。蛇口は床から110cm。"), S("洗面所の入口", 60, 180, null, "搬入のときに通るところ")] },
      { id: uid(), name: "リビング", spots: [S("窓", 169, 183, null, "掃き出し窓"), S("カーテンレール", 200, null, null, "床からレールまで200cm"), S("本棚のすき間", 42, 90, 30)] }
    ];
    save(); renderList();
    toast("例を入れました。不要になったら、部屋の「編集」から削除できます。");
  });

  // ---------- 寸法の追加・編集 ----------
  const dlg = $("dlg");
  let editing = null;
  function openSpot(roomId, spotId) {
    editing = { roomId, spotId };
    const r = st.rooms.find(x => x.id === roomId);
    const s = spotId ? r.spots.find(x => x.id === spotId) : null;
    $("dlgH").textContent = s ? "寸法を直す" : "寸法を追加";
    const sel = $("sRoom"); sel.replaceChildren();
    st.rooms.forEach(x => { const o = el("option", null, x.name); o.value = x.id; sel.append(o); });
    sel.value = roomId;
    $("sName").value = s ? s.name : "";
    $("sW").value = s ? field(s.w) : ""; $("sH").value = s ? field(s.h) : ""; $("sD").value = s ? field(s.d) : "";
    ["sW", "sH", "sD"].forEach(id => { $(id).placeholder = st.unit === "mm" ? "850" : "85"; $(id).removeAttribute("aria-invalid"); });
    $("sNote").value = s ? s.note : "";
    $("sErr").textContent = "";
    $("sDel").hidden = !s;
    const chips = $("spotChips"); chips.replaceChildren();
    if (!s) SPOT_SUGGEST.filter(n => !r.spots.some(x => x.name === n)).slice(0, 8).forEach(n => {
      const c = el("button", "chip", n); c.type = "button";
      c.addEventListener("click", () => { $("sName").value = n; $("sW").focus(); });
      chips.append(c);
    });
    chips.hidden = !!s;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    (s ? $("sW") : $("sName")).focus();
  }
  const closeDlg = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
  $("dlgCancel").addEventListener("click", closeDlg);
  $("spotForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("sName").value.trim().slice(0, 30);
    const vals = ["sW", "sH", "sD"].map(id => parseLen($(id).value));
    ["sW", "sH", "sD"].forEach((id, i) => { if (Number.isNaN(vals[i])) $(id).setAttribute("aria-invalid", "true"); else $(id).removeAttribute("aria-invalid"); });
    const bad = vals.findIndex(v => Number.isNaN(v));
    if (!name) { $("sErr").textContent = "場所の名前を入れてください。"; $("sName").focus(); return; }
    if (bad >= 0) { $("sErr").textContent = `${AX[bad]}は数字で入れてください（例：85、850mm、1.2m）。`; $(["sW", "sH", "sD"][bad]).focus(); return; }
    if (vals.every(v => v == null || v === 0)) { $("sErr").textContent = "幅・高さ・奥行きのどれか1つは入れてください。"; $("sW").focus(); return; }
    const [w, h, d] = vals.map(v => v || null);
    const note = $("sNote").value.trim().slice(0, 200);
    const target = st.rooms.find(x => x.id === $("sRoom").value);
    if (editing.spotId) {
      const from = st.rooms.find(x => x.id === editing.roomId);
      const s = from.spots.find(x => x.id === editing.spotId);
      Object.assign(s, { name, w, h, d, note });
      if (target !== from) { from.spots = from.spots.filter(x => x !== s); target.spots.push(s); }
    } else target.spots.push({ id: uid(), name, w, h, d, note });
    save(); closeDlg(); renderList();
    toast(`「${name}」を保存しました。`);
  });
  $("sDel").addEventListener("click", () => {
    const r = st.rooms.find(x => x.id === editing.roomId);
    const s = r.spots.find(x => x.id === editing.spotId);
    const snap = snapshot();
    r.spots = r.spots.filter(x => x !== s); save(); closeDlg(); renderList();
    toast(`「${s.name}」を削除しました。`, () => { restore(snap); renderList(); });
  });

  // ---------- 入る？ ----------
  const FIT_IDS = [["fW", "w"], ["fH", "h"], ["fD", "d"], ["mS", "ms"], ["mT", "mt"], ["mB", "mb"]];
  function fillFit() {
    $("fName").value = st.fit.name;
    FIT_IDS.forEach(([id, k]) => { $(id).value = field(st.fit[k]); $(id).removeAttribute("aria-invalid"); });
    $("rotY").checked = st.fit.rotY; $("rotAll").checked = st.fit.rotAll;
    $("fW").placeholder = st.unit === "mm" ? "650" : "65"; $("fH").placeholder = st.unit === "mm" ? "1800" : "180"; $("fD").placeholder = st.unit === "mm" ? "680" : "68";
    $("fErr").textContent = "";
  }
  function readFit() {
    st.fit.name = $("fName").value.trim().slice(0, 30);
    const bad = [];
    FIT_IDS.forEach(([id, k]) => {
      const v = parseLen($(id).value);
      if (Number.isNaN(v)) { bad.push(id); $(id).setAttribute("aria-invalid", "true"); }
      else { st.fit[k] = v; $(id).removeAttribute("aria-invalid"); }
    });
    st.fit.rotY = $("rotY").checked; st.fit.rotAll = $("rotAll").checked;
    $("fErr").textContent = bad.length ? "数字で入れてください（例：65、650mm、1.2m）。" : "";
    save(); renderFit();
  }
  $("fitForm").addEventListener("input", readFit);
  $("fitForm").addEventListener("change", readFit);
  $("fitForm").addEventListener("submit", e => e.preventDefault());

  const PERMS = [[0, 1, 2], [2, 1, 0], [1, 0, 2], [1, 2, 0], [0, 2, 1], [2, 0, 1]];
  function check(spot) {
    const f = st.fit, p = [f.w || 0, f.h || 0, f.d || 0];
    const m = [2 * (f.ms || 0), f.mt || 0, f.mb || 0];
    const space = [spot.w, spot.h, spot.d];
    const perms = f.rotAll ? PERMS : f.rotY ? PERMS.slice(0, 2) : PERMS.slice(0, 1);
    let best = null;
    perms.forEach((o, idx) => {
      const need = [p[o[0]] + m[0], p[o[1]] + m[1], p[o[2]] + m[2]];
      const slack = space.map((s, i) => s == null ? null : s - need[i]);
      const ok = slack.every(x => x == null || x >= 0);
      const short = slack.reduce((n, x) => n + (x != null && x < 0 ? -x : 0), 0);
      const minSlack = Math.min(...slack.filter(x => x != null));
      const cand = { o, idx, slack, ok, short, minSlack };
      if (!best) { best = cand; return; }
      if (cand.ok && !best.ok) best = cand;
      else if (!cand.ok && !best.ok && cand.short < best.short) best = cand;
    });
    return best;
  }
  function renderFit() {
    const box = $("result"); box.replaceChildren();
    const sum = $("fitSum"); sum.textContent = ""; sum.className = "fit-sum";
    const f = st.fit;
    const spots = st.rooms.flatMap(r => r.spots.map(s => ({ r, s }))).filter(x => x.s.w || x.s.h || x.s.d);
    if (!spots.length) {
      const e = el("div", "fit-empty");
      e.append(el("p", null, "まだ比べる場所がありません。"), el("p", null, "「寸法」のタブで、置きたい場所の寸法をメモしてから使います。"));
      const b = el("button", "btn small", "寸法をメモする"); b.type = "button";
      b.addEventListener("click", () => setTab("list"));
      e.append(b); box.append(e); return;
    }
    if (!f.w && !f.h && !f.d) {
      box.append(el("p", "fit-empty", `幅・高さ・奥行きを入れると、メモした${spots.length}か所に入るかどうかがここに出ます。`));
      return;
    }
    const groups = { ok: [], rot: [], ng: [] };
    spots.forEach(x => {
      const c = check(x.s);
      groups[c.ok ? (c.idx === 0 ? "ok" : "rot") : "ng"].push({ ...x, c });
    });
    groups.ok.sort((a, b) => b.c.minSlack - a.c.minSlack);
    const what = f.name ? `「${f.name}」` : "この大きさ";
    const nOk = groups.ok.length + groups.rot.length;
    sum.textContent = nOk ? `${what}は、${nOk}か所に入ります。` : `${what}が入る場所は、ありませんでした。`;
    sum.classList.add(nOk ? "yes" : "no");
    const sec = (key, title, items) => {
      if (!items.length) return;
      const s = el("section", `fit-g ${key}`);
      s.append(el("h3", null, `${title}（${items.length}）`));
      const ul = el("ul");
      items.forEach(({ r, s: sp, c }) => {
        const li = el("li", "fit-i");
        const h = el("p", "fit-n"); h.append(el("span", "fit-r", r.name), document.createTextNode(sp.name));
        li.append(h);
        const det = el("p", "fit-d");
        if (c.ok) {
          const parts = c.slack.map((x, i) => x == null ? null : `${AX[i]} あと${fmt(x)}`).filter(Boolean);
          det.textContent = (c.idx === 1 ? "横に向きを変えれば入ります。" : c.idx > 1 ? "寝かせれば入ります。" : "") + "ゆとり：" + parts.join("・");
          if (c.minSlack < 10) li.append(el("span", "tight", "ぎりぎり"));
        } else {
          det.textContent = (c.idx > 0 ? "向きを変えても、" : "") + c.slack.map((x, i) => x != null && x < 0 ? `${AX[i]}が${fmt(-x)}足りません` : null).filter(Boolean).join("。") + "。";
        }
        li.append(det);
        const unknown = c.slack.map((x, i) => x == null ? AX[i] : null).filter(Boolean);
        if (unknown.length) li.append(el("p", "fit-u", `${unknown.join("と")}は未記入のため、比べていません。`));
        ul.append(li);
      });
      s.append(ul); box.append(s);
    };
    sec("ok", "入ります", groups.ok);
    sec("rot", "向きを変えれば入ります", groups.rot);
    sec("ng", "入りません", groups.ng);
  }

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
  const pad = n => String(n).padStart(2, "0");
  const d0 = new Date(), today = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "sunpo", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `sunpo-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 2e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "sunpo") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.rooms.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    const n = data.rooms.reduce((k, r) => k + r.spots.length, 0);
    if (st.rooms.length && !confirm(`いまのメモを、ファイルの${n}か所分と置きかえますか？`)) return;
    const snap = snapshot();
    st = data; save(); setUnit(st.unit);
    $("moveMsg").textContent = `${data.rooms.length}部屋・${n}か所の寸法を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); setUnit(st.unit); });
  });

  setUnit(st.unit);
  setTab("list");
})();
