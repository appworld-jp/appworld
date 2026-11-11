// 立て替え精算 — 画面。計算は calc.js。データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const C = window.WarikanCalc;
  const $ = id => document.getElementById(id);
  const KEY = "warikan.v1";
  const yen = n => "¥" + Math.abs(n).toLocaleString("ja-JP");
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  let st = { events: [], cur: null };

  function validEvent(e) {
    if (!e || typeof e.name !== "string" || !Array.isArray(e.members) || !Array.isArray(e.pays)) return null;
    const members = [], ids = new Set();
    e.members.slice(0, 30).forEach(m => {
      if (!m || typeof m.name !== "string" || !m.name.trim() || typeof m.id !== "string" || ids.has(m.id)) return;
      ids.add(m.id); members.push({ id: m.id.slice(0, 40), name: m.name.trim().slice(0, 12) });
    });
    const pays = [];
    e.pays.slice(0, 500).forEach(p => {
      if (!p || !ids.has(p.by) || !Array.isArray(p.for)) return;
      const amount = Number(p.amount);
      if (!Number.isInteger(amount) || amount < 1 || amount > C.MAX_AMOUNT) return;
      const f = [...new Set(p.for.filter(id => ids.has(id)))]; if (!f.length) return;
      let w = null;
      if (p.w && typeof p.w === "object") { w = {}; f.forEach(id => { const v = Number(p.w[id]); w[id] = v > 0 && v <= 100 ? Math.round(v * 100) / 100 : 1; }); }
      pays.push({ id: typeof p.id === "string" ? p.id.slice(0, 40) : uid(), by: p.by, amount, what: typeof p.what === "string" ? p.what.slice(0, 24) : "", for: f, w });
    });
    return { id: typeof e.id === "string" && e.id ? e.id.slice(0, 40) : uid(), name: e.name.trim().slice(0, 30) || "精算", members, pays,
      unit: [1, 10, 100].includes(Number(e.unit)) ? Number(e.unit) : 1, absorb: typeof e.absorb === "string" ? e.absorb : "auto",
      updated: Number(e.updated) || Date.now() };
  }
  function valid(v) {
    if (!v || !Array.isArray(v.events)) return null;
    const events = v.events.slice(0, 200).map(validEvent).filter(Boolean);
    return { events, cur: null };
  }
  try { const v = valid(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); }
    catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。"); }
  }
  const snapshot = () => JSON.stringify(st);
  const ev = () => st.events.find(e => e.id === st.cur);
  const nameOf = (e, id) => { const m = e.members.find(x => x.id === id); return m ? m.name : "？"; };
  function touch(e) { e.updated = Date.now(); }

  // ---- 一覧 ----
  function render() {
    const e = ev();
    $("home").hidden = !!e; $("event").hidden = !e;
    document.title = e ? `${e.name} - 立て替え精算` : "立て替え精算";
    if (e) renderEvent(e); else renderHome();
  }
  function renderHome() {
    const ul = $("events"); ul.textContent = "";
    [...st.events].sort((a, b) => b.updated - a.updated).forEach(e => {
      const li = el("li"); const b = el("button", "ev-card"); b.type = "button";
      const total = e.pays.reduce((s, p) => s + p.amount, 0);
      const d = new Date(e.updated);
      b.append(el("span", "ev-n", e.name), el("span", "ev-t", yen(total)), el("span", "ev-m", `${e.members.length}人・支払い${e.pays.length}件`), el("span", "ev-d", `${d.getMonth() + 1}/${d.getDate()}`));
      b.addEventListener("click", () => open(e.id));
      li.append(b); ul.append(li);
    });
    $("first").hidden = st.events.length > 0;
  }
  function open(id) { st.cur = id; resetPay(); $("rename-form").hidden = true; render(); window.scrollTo(0, 0); }
  $("new-form").addEventListener("submit", e => {
    e.preventDefault(); $("new-err").textContent = "";
    const name = $("new-name").value.trim();
    if (!name) { $("new-err").textContent = "名前を入れてください。例：箱根旅行、12月の忘年会"; $("new-name").focus(); return; }
    const x = { id: uid(), name: name.slice(0, 30), members: [], pays: [], unit: 1, absorb: "auto", updated: Date.now() };
    st.events.push(x); save(); $("new-name").value = ""; open(x.id);
    $("mem-name").focus();
  });
  $("sample").addEventListener("click", () => {
    const m = ["田中", "佐藤", "鈴木"].map(n => ({ id: uid(), name: n }));
    const all = m.map(x => x.id);
    const x = { id: uid(), name: "箱根旅行（例）", members: m, unit: 10, absorb: "auto", updated: Date.now(), pays: [
      { id: uid(), by: m[0].id, amount: 45000, what: "旅館", for: all, w: null },
      { id: uid(), by: m[1].id, amount: 12800, what: "レンタカーとガソリン", for: all, w: null },
      { id: uid(), by: m[2].id, amount: 6300, what: "昼ご飯", for: all, w: { [m[0].id]: 1.5, [m[1].id]: 1, [m[2].id]: 1 } }
    ] };
    st.events.push(x); save(); open(x.id);
    toast("例を入れました。数字を変えたり、支払いを追加したりして試せます。");
  });
  $("back").addEventListener("click", () => { st.cur = null; render(); window.scrollTo(0, 0); });

  // ---- 精算の画面 ----
  function renderEvent(e) {
    $("ev-name").textContent = e.name;
    // メンバー
    const mu = $("members"); mu.textContent = "";
    if (!e.members.length) mu.append(el("li", "none", "まず、精算する人を入れてください。自分も含めます。"));
    e.members.forEach(m => {
      const li = el("li", "mem"); li.append(el("span", null, m.name));
      const x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", `${m.name}を外す`);
      x.addEventListener("click", () => removeMember(e, m));
      li.append(x); mu.append(li);
    });
    renderPayForm(e);
    // 支払い一覧
    const pl = $("pays"); pl.textContent = "";
    e.pays.forEach(p => {
      const li = el("li", "payrow" + (editing === p.id ? " editing" : ""));
      const main = el("div", "pr-main");
      main.append(el("span", "pr-what", p.what || "支払い"), el("span", "pr-amt", yen(p.amount)));
      const sub = el("div", "pr-sub");
      const forT = p.for.length === e.members.length ? "全員の分" : p.for.map(id => nameOf(e, id)).join("・") + "の分";
      sub.append(el("span", null, `${nameOf(e, p.by)}が立て替え・${forT}${p.w ? "（割合あり）" : ""}`));
      const ed = el("button", "link small", "編集"); ed.type = "button"; ed.setAttribute("aria-label", `${p.what || "支払い"} ${yen(p.amount)}を編集`);
      ed.addEventListener("click", () => editPay(e, p));
      const del = el("button", "link small danger", "削除"); del.type = "button"; del.setAttribute("aria-label", `${p.what || "支払い"} ${yen(p.amount)}を削除`);
      del.addEventListener("click", () => { const snap = snapshot(); e.pays = e.pays.filter(x => x !== p); if (editing === p.id) resetPay(); touch(e); save(); render(); toast(`${p.what || "支払い"}（${yen(p.amount)}）を削除しました。`, snap); });
      sub.append(ed, del);
      li.append(main, sub); pl.append(li);
    });
    renderResult(e);
  }

  function removeMember(e, m) {
    $("mem-err").textContent = "";
    if (e.pays.some(p => p.by === m.id || p.for.includes(m.id))) { $("mem-err").textContent = `${m.name}は支払いに入っているので外せません。先に支払いを編集してください。`; return; }
    const snap = snapshot();
    e.members = e.members.filter(x => x !== m); if (e.absorb === m.id) e.absorb = "auto";
    pf.for.delete(m.id); if (pf.by === m.id) pf.by = null;
    touch(e); save(); render(); toast(`${m.name}を外しました。`, snap);
  }
  $("mem-form").addEventListener("submit", x => {
    x.preventDefault();
    const e = ev(), err = $("mem-err"); err.textContent = "";
    const names = $("mem-name").value.normalize("NFKC").split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
    if (!names.length) { err.textContent = "名前を入れてください。「、」で区切ると、まとめて入れられます。"; $("mem-name").focus(); return; }
    for (const n of names) {
      if (n.length > 12) { err.textContent = "名前は12文字までです。"; return; }
      if (e.members.some(m => m.name === n) || names.filter(v => v === n).length > 1) { err.textContent = `「${n}」はもう入っています。同じ名前の人がいるときは「田中（兄）」のように分けてください。`; return; }
    }
    if (e.members.length + names.length > 30) { err.textContent = "メンバーは30人までです。"; return; }
    names.forEach(n => { const m = { id: uid(), name: n }; e.members.push(m); if (!editing) pf.for.add(m.id); });
    touch(e); save(); $("mem-name").value = ""; render(); $("mem-name").focus();
  });

  // ---- 支払いフォーム ----
  let editing = null;
  const pf = { by: null, for: new Set(), weights: {}, useW: false, forInit: false };
  function resetPay() {
    editing = null; pf.by = null; pf.for = new Set(); pf.weights = {}; pf.useW = false; pf.forInit = false;
    $("p-amount").value = ""; $("p-what").value = ""; $("p-weight").checked = false;
    ["p-amount-err", "p-by-err", "p-for-err"].forEach(id => { $(id).textContent = ""; });
  }
  function renderPayForm(e) {
    if (!pf.forInit) { e.members.forEach(m => pf.for.add(m.id)); pf.forInit = true; }
    $("pay-form").hidden = e.members.length < 1;
    const by = $("p-by"); by.textContent = "";
    e.members.forEach(m => {
      const b = el("button", "pk", m.name); b.type = "button"; b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", pf.by === m.id ? "true" : "false");
      b.addEventListener("click", () => { pf.by = m.id; $("p-by-err").textContent = ""; renderPayForm(e); });
      by.append(b);
    });
    const fo = $("p-for"); fo.textContent = "";
    e.members.forEach(m => {
      const b = el("button", "pk chk-pk", m.name); b.type = "button";
      b.setAttribute("aria-pressed", pf.for.has(m.id) ? "true" : "false");
      b.addEventListener("click", () => { pf.for.has(m.id) ? pf.for.delete(m.id) : pf.for.add(m.id); $("p-for-err").textContent = ""; renderPayForm(e); });
      fo.append(b);
    });
    $("p-weight").checked = pf.useW;
    const wb = $("p-weights"); wb.hidden = !pf.useW; wb.textContent = "";
    if (pf.useW) {
      e.members.filter(m => pf.for.has(m.id)).forEach(m => {
        const row = el("div", "wrow"); row.append(el("span", "wn", m.name));
        const minus = el("button", "step", "−"); minus.type = "button"; minus.setAttribute("aria-label", `${m.name}の割合を減らす`);
        const inp = el("input", "wi"); inp.inputMode = "decimal"; inp.value = String(pf.weights[m.id] || 1); inp.setAttribute("aria-label", `${m.name}の割合`);
        const plus = el("button", "step", "＋"); plus.type = "button"; plus.setAttribute("aria-label", `${m.name}の割合を増やす`);
        const set = v => { pf.weights[m.id] = v; inp.value = String(v); preview(e); };
        minus.addEventListener("click", () => set(Math.max(0.5, Math.round(((pf.weights[m.id] || 1) - 0.5) * 2) / 2)));
        plus.addEventListener("click", () => set(Math.min(10, Math.round(((pf.weights[m.id] || 1) + 0.5) * 2) / 2)));
        inp.addEventListener("input", () => { const v = C.parseWeight(inp.value); if (v != null) { pf.weights[m.id] = v; inp.removeAttribute("aria-invalid"); } else inp.setAttribute("aria-invalid", "true"); preview(e); });
        row.append(minus, inp, plus); wb.append(row);
      });
      wb.append(el("p", "hint", "「2」の人は「1」の人の2倍を払います。"));
    }
    $("p-submit").textContent = editing ? "変更を保存" : "支払いを追加";
    $("p-cancel").hidden = !editing;
    preview(e);
  }
  function preview(e) {
    const a = C.parseAmount($("p-amount").value), ids = e.members.filter(m => pf.for.has(m.id)).map(m => m.id);
    const pv = $("p-preview");
    if (!a || !ids.length) { pv.textContent = ""; return; }
    const sh = C.split(a, ids, pf.useW ? pf.weights : null);
    pv.textContent = "1人分：" + ids.map(id => `${nameOf(e, id)} ${yen(sh[id])}`).join("、");
  }
  $("p-amount").addEventListener("input", () => { $("p-amount-err").textContent = ""; const e = ev(); if (e) preview(e); });
  $("p-weight").addEventListener("change", () => { pf.useW = $("p-weight").checked; renderPayForm(ev()); });
  $("p-all").addEventListener("click", () => { const e = ev(); const allOn = e.members.every(m => pf.for.has(m.id)); pf.for = new Set(allOn ? [] : e.members.map(m => m.id)); renderPayForm(e); });
  $("p-cancel").addEventListener("click", () => { resetPay(); render(); });
  function editPay(e, p) {
    resetPay(); editing = p.id; pf.forInit = true;
    pf.by = p.by; pf.for = new Set(p.for); pf.useW = !!p.w; pf.weights = p.w ? { ...p.w } : {};
    $("p-amount").value = p.amount.toLocaleString("ja-JP"); $("p-what").value = p.what;
    render();
    $("pay-form").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    $("p-amount").focus({ preventScroll: true });
  }
  $("pay-form").addEventListener("submit", x => {
    x.preventDefault();
    const e = ev(); let bad = false;
    ["p-amount-err", "p-by-err", "p-for-err"].forEach(id => { $(id).textContent = ""; });
    const a = C.parseAmount($("p-amount").value);
    if (a == null) { $("p-amount-err").textContent = `金額は1〜${C.MAX_AMOUNT.toLocaleString("ja-JP")}円の整数で入れてください。`; bad = true; }
    if (!pf.by || !e.members.some(m => m.id === pf.by)) { $("p-by-err").textContent = "払った人を選んでください。"; bad = true; }
    const ids = e.members.filter(m => pf.for.has(m.id)).map(m => m.id);
    if (!ids.length) { $("p-for-err").textContent = "誰の分か、1人以上選んでください。"; bad = true; }
    let w = null;
    if (pf.useW) {
      w = {};
      for (const id of ids) { const v = Number(pf.weights[id] || 1); if (!(v > 0 && v <= 100)) { $("p-for-err").textContent = "割合は0より大きい数で入れてください（例：1.5）。"; bad = true; break; } w[id] = v; }
      if (ids.every(id => w[id] === 1)) w = null;
    }
    if (bad) { const f = document.querySelector("#pay-form .ferr:not(:empty)"); if (f && a == null) $("p-amount").focus(); return; }
    const snap = snapshot();
    const data = { by: pf.by, amount: a, what: $("p-what").value.trim().slice(0, 24), for: ids, w };
    let msg;
    if (editing) { const p = e.pays.find(v => v.id === editing); if (p) Object.assign(p, data); msg = "支払いを更新しました。"; }
    else { e.pays.push(Object.assign({ id: uid() }, data)); msg = `${nameOf(e, pf.by)}の${data.what || "支払い"}（${yen(a)}）を追加しました。`; }
    touch(e); save(); resetPay(); render(); toast(msg, snap);
    $("p-amount").focus({ preventScroll: true });
  });

  // ---- 結果 ----
  function compute(e) {
    const { paid, owed, bal } = C.balances(e);
    const r = C.roundBalances(bal, e.unit, e.absorb);
    return { paid, owed, bal, r, tr: C.settle(r.rounded), total: e.pays.reduce((s, p) => s + p.amount, 0) };
  }
  function renderResult(e) {
    const box = $("res-body"); box.textContent = "";
    const sel = $("o-absorb"); sel.textContent = "";
    const au = el("option", null, "おまかせ"); au.value = "auto"; sel.append(au);
    e.members.forEach(m => { const o = el("option", null, m.name); o.value = m.id; sel.append(o); });
    sel.value = e.members.some(m => m.id === e.absorb) ? e.absorb : "auto";
    $("o-unit").value = String(e.unit);
    if (e.members.length < 2) { box.append(el("p", "none", "メンバーを2人以上入れると、ここに精算が出ます。")); $("summary").value = ""; return; }
    if (!e.pays.length) { box.append(el("p", "none", "支払いを追加すると、誰が誰にいくら払うかがここに出ます。")); $("summary").value = ""; return; }
    const c = compute(e);
    box.append(el("p", "total", `合計 ${yen(c.total)}（${e.members.length}人）`));
    const ul = el("ul", "transfers");
    if (!c.tr.length) ul.append(el("li", "none", "精算は必要ありません。全員ぴったりです。"));
    c.tr.forEach(t => {
      const li = el("li", "tr");
      li.append(el("span", "tf", nameOf(e, t.from)), el("span", "ta", "→"), el("span", "tt", nameOf(e, t.to)), el("span", "tm", yen(t.amount)));
      li.setAttribute("aria-label", `${nameOf(e, t.from)}が${nameOf(e, t.to)}に${yen(t.amount)}`);
      ul.append(li);
    });
    box.append(ul);
    if (c.tr.length) box.append(el("p", "hint", `送金は${c.tr.length}回で終わります。`));
    if (c.r.diff) box.append(el("p", "adj", adjText(e, c)));
    const tbl = el("table", "bal");
    const cap = el("caption", null, "1人ずつの内訳"); tbl.append(cap);
    const th = el("tr"); ["", "払った", "負担", "差し引き"].forEach(t => th.append(el("th", null, t))); th.firstChild.setAttribute("aria-label", "名前");
    const thead = el("thead"); thead.append(th); tbl.append(thead);
    const tb = el("tbody");
    e.members.forEach(m => {
      const tr = el("tr"); const b = c.bal[m.id];
      const n = el("th", null, m.name); n.scope = "row"; tr.append(n);
      tr.append(el("td", null, yen(c.paid[m.id])), el("td", null, yen(c.owed[m.id])), el("td", b > 0 ? "plus" : b < 0 ? "minus" : "", b > 0 ? "+" + yen(b) : b < 0 ? "−" + yen(b) : "±0"));
      tb.append(tr);
    });
    tbl.append(tb); box.append(tbl);
    $("summary").value = summaryText(e, c);
  }
  function adjText(e, c) {
    const n = nameOf(e, c.r.absorber);
    return c.r.diff > 0 ? `${e.unit}円単位にそろえたため、${n}の負担が${yen(c.r.diff)}多くなります。` : `${e.unit}円単位にそろえたため、${n}の負担が${yen(c.r.diff)}少なくなります。`;
  }
  function summaryText(e, c) {
    const L = [`【${e.name}】の精算`, `合計 ${yen(c.total)}（${e.members.length}人）`, ""];
    L.push("▼ 送金");
    if (!c.tr.length) L.push("精算は必要ありません");
    c.tr.forEach(t => L.push(`${nameOf(e, t.from)} → ${nameOf(e, t.to)}　${yen(t.amount)}`));
    L.push("", "▼ 内訳（払った／負担）");
    e.members.forEach(m => L.push(`${m.name}　${yen(c.paid[m.id])}／${yen(c.owed[m.id])}`));
    if (e.pays.length) {
      L.push("", "▼ 支払い");
      e.pays.forEach(p => L.push(`${p.what || "支払い"} ${yen(p.amount)}（${nameOf(e, p.by)}）`));
    }
    if (c.r.diff) L.push("", adjText(e, c));
    return L.join("\n");
  }
  $("o-unit").addEventListener("change", () => { const e = ev(); e.unit = Number($("o-unit").value); touch(e); save(); renderResult(e); });
  $("o-absorb").addEventListener("change", () => { const e = ev(); e.absorb = $("o-absorb").value; touch(e); save(); renderResult(e); });
  $("copy").addEventListener("click", async () => {
    const t = $("summary").value, msg = $("copy-msg");
    if (!t) { msg.textContent = "まだコピーする内容がありません。"; return; }
    let okk = false;
    try { await navigator.clipboard.writeText(t); okk = true; } catch (x) {
      try { $("summary").select(); okk = document.execCommand("copy"); } catch (y) {}
    }
    msg.textContent = okk ? "コピーしました。LINEのトークに貼り付けてください。" : "コピーできませんでした。上の文を長押しして選んでください。";
    clearTimeout(msg._t); msg._t = setTimeout(() => { msg.textContent = ""; }, 5000);
  });

  // ---- 名前・削除 ----
  $("ev-rename").addEventListener("click", () => { const f = $("rename-form"); f.hidden = !f.hidden; if (!f.hidden) { $("rename-in").value = ev().name; $("rename-in").focus(); } });
  $("rename-form").addEventListener("submit", x => {
    x.preventDefault(); const v = $("rename-in").value.trim();
    if (!v) { $("rename-err").textContent = "名前を入れてください。"; return; }
    $("rename-err").textContent = ""; const e = ev(); e.name = v.slice(0, 30); touch(e); save(); $("rename-form").hidden = true; render();
  });
  $("ev-del").addEventListener("click", () => {
    const e = ev(); const snap = snapshot();
    st.events = st.events.filter(x => x !== e); st.cur = null; save(); render(); window.scrollTo(0, 0);
    toast(`「${e.name}」を削除しました。`, snap);
  });

  // ---- 書き出し・読みこみ ----
  $("export").addEventListener("click", () => {
    if (!st.events.length) { $("move-err").textContent = "まだ書き出す精算がありません。"; return; }
    $("move-err").textContent = "";
    const blob = new Blob([JSON.stringify({ app: "warikan", version: 1, exported: new Date().toISOString(), events: st.events }, null, 1)], { type: "application/json" });
    const a = el("a"); a.href = URL.createObjectURL(blob); a.download = `warikan-${ymd(new Date())}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("ファイルに書き出しました。新しい端末で「ファイルを読み込む」から開いてください。");
  });
  $("import").addEventListener("change", async x => {
    const f = x.target.files[0]; x.target.value = ""; $("move-err").textContent = "";
    if (!f) return;
    try {
      if (f.size > 5e6) throw 0;
      const raw = JSON.parse(await f.text());
      if (raw.app && raw.app !== "warikan") throw 0;
      const v = valid(raw); if (!v || (!v.events.length && raw.events.length)) throw 0;
      const snap = snapshot();
      // 同じ精算（同じID）は読みこんだほうで置きかえ、ほかは残す
      const map = new Map(st.events.map(e => [e.id, e])); v.events.forEach(e => map.set(e.id, e));
      st.events = [...map.values()]; st.cur = null; save(); render();
      toast(`${v.events.length}件の精算を読み込みました。`, snap);
    } catch (y) { $("move-err").textContent = "読み込めませんでした。このアプリで書き出したファイル（.json）を選んでください。"; }
  });

  // ---- トースト ----
  let tT = null, undoSnap = null;
  function toast(msg, snap) {
    $("toast-t").textContent = msg; undoSnap = snap || null;
    $("toast-undo").hidden = !snap; $("toast").classList.add("on");
    clearTimeout(tT); tT = setTimeout(() => { $("toast").classList.remove("on"); undoSnap = null; }, snap ? 6000 : 3500);
  }
  $("toast-undo").addEventListener("click", () => {
    if (!undoSnap) return; const cur = st.cur; st = JSON.parse(undoSnap); undoSnap = null;
    if (!st.events.some(e => e.id === st.cur)) st.cur = null;
    if (cur && st.events.some(e => e.id === cur)) st.cur = cur;
    resetPay(); save(); render();
    $("toast").classList.remove("on"); setTimeout(() => toast("元に戻しました。"), 50);
  });

  st.cur = null;
  render();
})();
