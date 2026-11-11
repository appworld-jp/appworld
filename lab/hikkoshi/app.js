(() => {
  "use strict";
  const KEY = "hikkoshi.v1";
  const GROUPS = window.HIKKOSHI_GROUPS, TASKS = window.HIKKOSHI_TASKS;
  const OPTS = { cross: "oCross", fromRent: "oFromRent", toRent: "oToRent", school: "oSchool", car: "oCar", pet: "oPet" };
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- 日付 ----------
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3], 12); return d.getMonth() === +m[2] - 1 ? d : null; };
  const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diff = (a, b) => Math.round((a - b) / 864e5);
  const md = d => `${d.getMonth() + 1}月${d.getDate()}日`;
  const mdw = d => `${md(d)}（${WD[d.getDay()]}）`;
  const today = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12); })();

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  function clean(raw) {
    if (!raw || typeof raw !== "object" || !parse(raw.date)) return null;
    const opts = {};
    for (const k of Object.keys(OPTS)) opts[k] = !!(raw.opts && raw.opts[k]);
    const done = {};
    if (raw.done && typeof raw.done === "object") for (const [k, v] of Object.entries(raw.done)) if (v === true && /^[\w-]{1,30}$/.test(k)) done[k] = true;
    const custom = Array.isArray(raw.custom) ? raw.custom.slice(0, 100).map(c => c && GROUPS.some(g => g.key === c.g) && str(c.t, 60)
      ? { id: /^[\w-]{1,30}$/.test(c.id) ? c.id : "c" + uid(), g: c.g, t: str(c.t, 60) } : null).filter(Boolean) : [];
    return { v: 1, date: raw.date, opts, done, custom, hide: !!raw.hide };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snap = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  // ---------- 設定 ----------
  function openSetup() {
    $("viewMain").hidden = true; $("viewSetup").hidden = false;
    $("setupCancel").hidden = !st;
    $("setupH").textContent = st ? "日付と条件を変える" : "いつ引っ越しますか？";
    $("setupGo").textContent = st ? "変更する" : "リストを作る";
    if (st) {
      $("moveDate").value = st.date;
      for (const [k, id] of Object.entries(OPTS)) $(id).checked = st.opts[k];
    } else if (!$("moveDate").value) {
      $("moveDate").value = ymd(add(today, 45));
    }
    $("dateErr").textContent = "";
  }
  $("setupForm").addEventListener("submit", e => {
    e.preventDefault();
    const d = parse($("moveDate").value);
    if (!d) { $("dateErr").textContent = "引っ越し日を入れてください。"; $("moveDate").focus(); return; }
    const n = diff(d, today);
    if (n < -60) { $("dateErr").textContent = "2か月以上前の日付です。引っ越し日を確かめてください。"; $("moveDate").focus(); return; }
    if (n > 730) { $("dateErr").textContent = "2年より先の日付は入れられません。"; $("moveDate").focus(); return; }
    const opts = {};
    for (const [k, id] of Object.entries(OPTS)) opts[k] = $(id).checked;
    const first = !st;
    if (!st) st = { v: 1, date: "", opts, done: {}, custom: [], hide: false };
    st.date = ymd(d); st.opts = opts; save();
    renderMain(); window.scrollTo(0, 0);
    if (first) toast(`${tasks().length}件のやることを並べました。`);
  });
  $("setupCancel").addEventListener("click", renderMain);
  $("editBtn").addEventListener("click", () => { openSetup(); window.scrollTo(0, 0); });

  // ---------- 一覧 ----------
  function applies(t) {
    if (!t.need) return true;
    const needs = Array.isArray(t.need) ? t.need : [t.need];
    return needs.every(n => n === "same" ? !st.opts.cross : !!st.opts[n]);
  }
  const tasks = () => TASKS.filter(applies).map(t => ({ ...t, own: false })).concat(st.custom.map(c => ({ id: c.id, g: c.g, t: c.t, w: "", own: true })));

  function groupState(g, move) {
    const due = add(move, g.off);
    const dn = diff(due, today);
    if (g.deadline) {
      const sinceMove = diff(today, move);
      if (sinceMove < 0) return { due, kind: "later", tag: `${md(due)}まで` };
      if (dn < 0) return { due, kind: "late", tag: `${md(due)}まで（期限が過ぎました）` };
      return { due, kind: "now", tag: dn === 0 ? `今日（${md(due)}）まで` : `${md(due)}まで・あと${dn}日` };
    }
    if (g.off === 0) {
      if (dn > 0) return { due, kind: "later", tag: mdw(due) };
      if (dn === 0) return { due, kind: "now", tag: `今日・${mdw(due)}` };
      return { due, kind: "past", tag: mdw(due) };
    }
    const nextG = GROUPS[GROUPS.indexOf(g) + 1];
    const gr = g.off === -1 ? "" : "ごろ";
    const nextDue = add(move, nextG.off);
    if (dn > 0) return { due, kind: "later", tag: `${mdw(due)}${gr}` };
    if (diff(nextDue, today) > 0) return { due, kind: "now", tag: `${mdw(due)}${gr}・今の時期` };
    if (diff(today, move) > 0) return { due, kind: "past", tag: `${mdw(due)}${gr}` };
    return { due, kind: "late", tag: `${mdw(due)}${gr}・早めに` };
  }

  const openPast = new Set();
  function renderMain() {
    if (!st) { openSetup(); return; }
    $("viewSetup").hidden = true; $("viewMain").hidden = false;
    const move = parse(st.date);
    const all = tasks();
    const doneN = all.filter(t => st.done[t.id]).length;
    const n = diff(move, today);
    $("lcDate").textContent = `${move.getFullYear()}年${mdw(move)}に引っ越し`;
    const left = $("lcLeft"); left.textContent = "";
    if (n > 0) left.append(el("small", null, "あと"), el("b", null, String(n)), el("small", null, "日"));
    else if (n === 0) left.append(el("b", "word", "今日が引っ越し日"));
    else left.append(el("small", null, "引っ越しから"), el("b", null, String(-n + 1)), el("small", null, "日目"));
    $("barFill").style.width = all.length ? `${Math.round(doneN / all.length * 100)}%` : "0";
    $("lcCount").textContent = doneN === all.length ? `${all.length}件全て済みました！` : `${all.length}件中${doneN}件済み・残り${all.length - doneN}件`;
    $("hideDone").checked = st.hide;

    // いちばん近い期限
    const tennyu = all.find(t => (t.id === "tennyu" || t.id === "tenkyo") && !st.done[t.id]);
    let next = "";
    const urgent = [];
    const line = $("line"); line.textContent = "";
    const anyNow = GROUPS.some(g => { const k = groupState(g, move).kind; return k === "now" || k === "late"; });
    const firstLater = anyNow ? null : GROUPS.find(g => groupState(g, move).kind === "later");
    for (const g of GROUPS) {
      const items = all.filter(t => t.g === g.key);
      if (!items.length) continue;
      const gs = groupState(g, move);
      const left = items.filter(t => !st.done[t.id]).length;
      if ((gs.kind === "now" || gs.kind === "late") && left) urgent.push(left);
      const li = el("li", "grp");
      li.dataset.kind = left ? gs.kind : "done";
      const h = el("div", "grp-h");
      const hh = el("h2", "grp-t", g.label);
      const tag = el("span", "grp-tag", gs.tag);
      const cnt = el("span", "grp-c", left ? `残り${left}` : "済み");
      h.append(el("span", "grp-dot"), hh, tag, cnt);
      li.append(h);
      const folded = gs.kind === "past" && left > 0;
      let foldBtn = null;
      if (folded) {
        foldBtn = el("button", "grp-open", "開く"); foldBtn.type = "button"; foldBtn.setAttribute("aria-expanded", "false");
        foldBtn.setAttribute("aria-label", `${g.label}のやることを開く`);
        h.append(foldBtn);
      }
      const active = gs.kind === "now" || gs.kind === "late" || g === firstLater;
      const ul = el("ul", "tasks");
      for (const t of items) {
        const done = !!st.done[t.id];
        if (done && st.hide) continue;
        const ti = el("li", "task" + (done ? " done" : "") + (t.own ? " own" : ""));
        const lab = el("label", "t-lab");
        const cb = el("input"); cb.type = "checkbox"; cb.checked = done; cb.className = "t-cb"; cb.dataset.id = t.id;
        cb.addEventListener("change", () => toggle(t, cb.checked, ti));
        const box = el("span", "t-box"); box.setAttribute("aria-hidden", "true");
        const txt = el("span", "t-txt");
        txt.append(el("b", "t-title", t.t));
        if (t.w && !done) txt.append(el("span", "t-why", t.w));
        if (t.own) txt.append(el("span", "t-own", "自分で追加"));
        lab.append(cb, box, txt); ti.append(lab);
        if (t.w && !done && !active) {
          ti.classList.add("fold");
          const more = el("button", "t-more", "詳しく"); more.type = "button"; more.setAttribute("aria-expanded", "false");
          more.setAttribute("aria-label", `「${t.t}」の詳しい説明`);
          more.addEventListener("click", () => { const o = ti.classList.toggle("open"); more.setAttribute("aria-expanded", String(o)); more.textContent = o ? "閉じる" : "詳しく"; });
          ti.append(more);
        }
        if (t.own) {
          const del = el("button", "t-del", "×"); del.type = "button"; del.setAttribute("aria-label", `「${t.t}」を削除`);
          del.addEventListener("click", () => { const s = snap(); st.custom = st.custom.filter(c => c.id !== t.id); delete st.done[t.id]; save(); renderMain(); toast("削除しました。", () => { restore(s); renderMain(); }); });
          ti.append(del);
        }
        ul.append(ti);
      }
      if (!ul.children.length) ul.append(el("li", "t-none", `${items.length}件とも済みました。`));
      if (folded) {
        ul.hidden = !openPast.has(g.key);
        foldBtn.setAttribute("aria-expanded", String(!ul.hidden)); foldBtn.textContent = ul.hidden ? "開く" : "閉じる";
        foldBtn.addEventListener("click", () => {
          if (openPast.has(g.key)) openPast.delete(g.key); else openPast.add(g.key);
          ul.hidden = !openPast.has(g.key);
          foldBtn.setAttribute("aria-expanded", String(!ul.hidden)); foldBtn.textContent = ul.hidden ? "開く" : "閉じる";
        });
      }
      li.append(ul); line.append(li);
    }
    if (tennyu && n <= 0) {
      const dl = diff(add(move, 14), today);
      const nm = tennyu.id === "tennyu" ? "転入届" : "転居届";
      next = dl >= 0 ? `${nm}の期限は${md(add(move, 14))}です（あと${dl}日）。` : `${nm}の期限（${md(add(move, 14))}）が過ぎています。早めに窓口へ。`;
    } else if (urgent.length) {
      next = `今の時期にやることが、あと${urgent.reduce((a, b) => a + b, 0)}件あります。`;
    } else if (doneN < all.length) {
      next = "今の時期の分は済んでいます。";
    }
    $("lcNext").textContent = next;
    $("lcNext").hidden = !next;

    // 追加フォームの「いつ」
    const sel = $("addG"); const keep = sel.value; sel.textContent = "";
    for (const g of GROUPS) { const o = el("option", null, g.label); o.value = g.key; sel.append(o); }
    const cur = GROUPS.find(g => { const k = groupState(g, move).kind; return k === "now"; });
    sel.value = keep || (cur ? cur.key : "m1");
  }

  function refocus(id) {
    const c = document.querySelector(`.t-cb[data-id="${CSS.escape(id)}"]`);
    if (c) c.focus({ preventScroll: true });
  }
  function toggle(t, on, li) {
    if (on) st.done[t.id] = true; else delete st.done[t.id];
    save();
    if (on && !reduce()) { li.classList.add("stamp"); setTimeout(() => { renderMain(); refocus(t.id); }, 380); }
    else { renderMain(); refocus(t.id); }
    const all = tasks();
    if (on && all.every(x => st.done[x.id])) toast("全て済みました。お疲れさまでした！");
  }
  $("hideDone").addEventListener("change", () => { st.hide = $("hideDone").checked; save(); renderMain(); });

  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const t = $("addText").value.trim().slice(0, 60);
    if (!t) { $("addErr").textContent = "やることを入れてください。"; $("addText").focus(); return; }
    $("addErr").textContent = "";
    st.custom.push({ id: "c" + uid(), g: $("addG").value, t }); save();
    $("addText").value = ""; renderMain();
    const g = GROUPS.find(x => x.key === $("addG").value);
    toast(`「${g.label}」に追加しました。`);
  });

  // ---------- 書き出し・読み込み・作り直し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "hikkoshi", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `hikkoshi-${ymd(today)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 1e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "hikkoshi") data = clean(j.data); } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (!confirm("今のリストを、ファイルの内容に置き換えますか？")) return;
    const s = snap();
    st = data; save(); renderMain();
    $("moveMsg").textContent = "読み込みました。";
    toast("読み込みました。", () => { restore(s); renderMain(); });
  });
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("チェックと自分で追加したやることを消して、最初から作り直しますか？")) return;
    const s = snap();
    st = null; try { localStorage.removeItem(KEY); } catch (e) {}
    $("moveDate").value = ""; openSetup();
    toast("リストを消しました。", () => { restore(s); renderMain(); });
  });

  // ---------- トースト ----------
  let tt = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg;
    $("toastUndo").hidden = !undo;
    $("toastUndo").onclick = () => { if (undo) undo(); $("toast").hidden = true; };
    $("toast").hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { $("toast").hidden = true; }, 5000);
  }

  if (st) renderMain(); else openSetup();
})();
