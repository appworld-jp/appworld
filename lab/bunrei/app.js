(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const KEY = "bunrei.v1";
  const BYID = {}; TEMPLATES.forEach(t => { BYID[t.id] = t; });
  const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- 保存 ----------
  function clean(d) {
    const o = { tpl: TEMPLATES[0].id, tone: {}, vals: {}, to: { toCompany: "", toDept: "", toName: "" }, me: { myCompany: "", myDept: "", myName: "", myContact: "" }, mine: [], cur: "" };
    if (!d || typeof d !== "object") return o;
    if (BYID[d.tpl]) o.tpl = d.tpl;
    if (d.tone && typeof d.tone === "object") for (const k in d.tone) if (BYID[k] && BYID[k].tones.indexOf(d.tone[k]) >= 0) o.tone[k] = d.tone[k];
    if (d.vals && typeof d.vals === "object") for (const k in d.vals) {
      if (!BYID[k] || !d.vals[k] || typeof d.vals[k] !== "object") continue;
      o.vals[k] = {};
      BYID[k].fields.forEach(f => { const v = str(d.vals[k][f.k], 600); if (v) o.vals[k][f.k] = v; });
    }
    if (d.to && typeof d.to === "object") ["toCompany", "toDept", "toName"].forEach(k => { o.to[k] = str(d.to[k], 40); });
    if (d.me && typeof d.me === "object") ["myCompany", "myDept", "myName", "myContact"].forEach(k => { o.me[k] = str(d.me[k], k === "myContact" ? 200 : 40); });
    if (Array.isArray(d.mine)) o.mine = d.mine.filter(m => m && typeof m.title === "string" && m.title.trim() && typeof m.body === "string").slice(0, 100)
      .map(m => ({ id: str(m.id, 24) || rid(), title: m.title.trim().slice(0, 20), subject: str(m.subject, 100), body: m.body.slice(0, 5000) }));
    if (typeof d.cur === "string" && o.mine.some(m => m.id === d.cur)) o.cur = d.cur;
    return o;
  }
  let st = clean(null);
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { /* 初期値 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できなくても使える */ } };

  let edited = false, subjEdited = false, subjIdx = 0;

  // ---------- 文面を組み立てる ----------
  const tpl = () => BYID[st.tpl];
  const toneOf = t => st.tone[t.id] || t.tones[0];
  const stripHon = s => s.trim().replace(/\s*(様|さま|さん|殿|御中)$/, "");
  let marks = new Set();
  const TAGS = /【(ご確認|お詫び|お礼|日程調整|ご案内|休みの連絡|重要|至急|再送)】/g;
  const mark = label => { const m = "【" + label.replace(/（.*?）/g, "") + "】"; marks.add(m); return m; };

  function fill(src, ctx, labels) {
    let s = src, prev;
    const re = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/;
    do { prev = s; s = s.replace(re, (_, op, k, inner) => ((ctx[k] || "") !== "") === (op === "#") ? inner : ""); } while (s !== prev);
    return s.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] || "") !== "" ? ctx[k] : mark(labels[k] || k));
  }
  function context(t, tone) {
    const v = st.vals[t.id] || {};
    const ctx = {}, labels = {};
    t.fields.forEach(f => {
      labels[f.k] = f.label;
      let val = (v[f.k] || "").trim();
      if (f.type === "lines" && val) val = val.split(/\n+/).map(x => x.trim().replace(/^[・\-•*]\s*/, "")).filter(Boolean).map(x => "・" + x).join("\n");
      ctx[f.k] = val;
    });
    const me = st.me, to = st.to;
    ctx.myCompany = me.myCompany.trim(); ctx.myName = me.myName.trim(); ctx.myDept = me.myDept.trim();
    labels.myCompany = "自分の会社名"; labels.myName = "自分の名前";
    ctx.myCompanyOr = ctx.myCompany || "現在の会社";
    const nm = stripHon(to.toName);
    ctx.toSama = t.to && t.to[tone] ? t.to[tone] : (nm ? nm + "様" : (t.toDefault ? t.toDefault + "様" : mark("相手の名前") + "様"));
    const m = new Date().getMonth();
    ctx.seasonP = SEASON.P[m]; ctx.seasonN = SEASON.N[m]; ctx.seasonC = SEASON.C[m];
    return { ctx, labels };
  }
  function compose(t, tone) {
    marks = new Set();
    const { ctx, labels } = context(t, tone);
    const me = st.me, to = st.to;
    const myName = me.myName.trim() || mark("自分の名前");
    const nm = stripHon(to.toName);
    // あて名
    let head = [];
    if (t.to && t.to[tone]) head = [t.to[tone]];
    else if (tone === "internal" || tone === "casual") head = [(nm || mark("相手の名前")) + "さん"];
    else {
      if (to.toCompany.trim()) head.push(to.toCompany.trim());
      head.push((to.toDept.trim() ? to.toDept.trim() + " " : "") + (nm ? nm + "様" : (t.toDefault ? t.toDefault + "様" : mark("相手の名前") + "様")));
    }
    // 書き出し
    const co = me.myCompany.trim() ? me.myCompany.trim() + "の" : "";
    let open;
    if (t.open && tone in t.open) open = t.open[tone];
    else if (tone === "polite") open = t.first ? "突然のご連絡失礼いたします。\n" + co + myName + "と申します。" : "いつも大変お世話になっております。\n" + co + myName + "でございます。";
    else if (tone === "normal") open = t.first ? "初めてご連絡いたします。\n" + co + myName + "と申します。" : "お世話になっております。\n" + co + myName + "です。";
    else if (tone === "internal") open = "お疲れさまです。\n" + (me.myDept.trim() ? me.myDept.trim() + "の" : "") + myName + "です。";
    else open = "";
    // 結び
    let close;
    if (t.close && tone in t.close) close = t.close[tone];
    else close = { polite: "何卒よろしくお願い申し上げます。", normal: "引き続きよろしくお願いいたします。", internal: "よろしくお願いします。", casual: "" }[tone];
    // 署名
    let sig = "";
    if (tone === "polite" || tone === "normal") {
      const lines = [me.myCompany.trim(), me.myDept.trim(), myName].filter(Boolean).concat(me.myContact.split(/\n/).map(x => x.trim()).filter(Boolean));
      sig = "――――――――――――――\n" + lines.join("\n") + "\n――――――――――――――";
    } else if (tone === "internal") sig = "――――――――\n" + (me.myDept.trim() ? me.myDept.trim() + " " : "") + myName;
    const body = fill(t.body[tone], ctx, labels).replace(/\n+$/, "");
    const text = [head.join("\n"), open, body, close, sig].filter(x => x !== "").join("\n\n").replace(/\n{3,}/g, "\n\n");
    const subjects = (t.subject[tone] || []).map(s => fill(s, ctx, labels));
    return { text, subjects };
  }

  // ---------- 文例の一覧 ----------
  function renderIndex() {
    const groups = [];
    TEMPLATES.forEach(t => { let g = groups.find(x => x.name === t.group); if (!g) groups.push(g = { name: t.group, list: [] }); g.list.push(t); });
    $("tplList").replaceChildren(...groups.map((g, gi) => {
      const box = el("div", "ix-g");
      const h = el("h3", "ix-h", g.name); h.id = "ixg" + gi;
      const ul = el("div", "ix-list"); ul.setAttribute("role", "group"); ul.setAttribute("aria-labelledby", h.id);
      g.list.forEach(t => {
        const b = el("button", "ix", t.name); b.type = "button"; b.dataset.v = t.id;
        b.setAttribute("aria-pressed", !st.cur && st.tpl === t.id ? "true" : "false");
        b.addEventListener("click", () => choose(t.id, ""));
        ul.append(b);
      });
      box.append(h, ul);
      return box;
    }));
    $("mineList").replaceChildren(...st.mine.map(m => {
      const li = el("li", "mine-i");
      const b = el("button", "ix", m.title); b.type = "button"; b.dataset.v = m.id;
      b.setAttribute("aria-pressed", st.cur === m.id ? "true" : "false");
      b.addEventListener("click", () => choose(st.tpl, m.id));
      const x = el("button", "ix-x", "×"); x.type = "button"; x.setAttribute("aria-label", "自分の文例「" + m.title + "」を消す");
      x.addEventListener("click", () => {
        const pos = st.mine.indexOf(m);
        st.mine.splice(pos, 1);
        const wasCur = st.cur === m.id;
        if (wasCur) st.cur = "";
        save(); renderIndex(); if (wasCur) { edited = false; render(); }
        toast("「" + m.title + "」を消しました。", () => { st.mine.splice(pos, 0, m); save(); renderIndex(); });
      });
      li.append(b, x);
      return li;
    }));
    $("mineNone").hidden = st.mine.length > 0;
  }
  function choose(id, mineId) {
    if (edited && !confirm("手で書き換えた本文は消えます。別の文例に切り替えますか？")) return;
    st.tpl = id; st.cur = mineId || ""; save();
    edited = false; subjEdited = false; subjIdx = 0;
    renderIndex(); renderForm(); render();
    if (matchMedia("(max-width: 759px)").matches) $("formCard").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  // ---------- 入力欄 ----------
  function renderForm() {
    const mine = st.cur ? st.mine.find(m => m.id === st.cur) : null;
    const t = tpl(), tone = toneOf(t);
    document.body.classList.toggle("is-mine", !!mine);
    if (mine) {
      $("tplName").textContent = "自分の文例：" + mine.title;
      $("toneSeg").replaceChildren(); $("toneDesc").textContent = "保存した文面です。下で書き換えると、そのまま保存されます。";
      $("fields").replaceChildren(); $("toBox").hidden = true;
      return;
    }
    $("toBox").hidden = false;
    $("tplName").textContent = t.name;
    $("toneSeg").replaceChildren(...t.tones.map(k => {
      const b = el("button", "", TONES[k].name); b.type = "button";
      b.setAttribute("aria-pressed", k === tone ? "true" : "false");
      b.addEventListener("click", () => {
        if (edited && !confirm("手で書き換えた本文は消えます。言い回しを変えますか？")) return;
        st.tone[t.id] = k; save(); edited = false; subjEdited = false; subjIdx = 0; renderForm(); render();
      });
      return b;
    }));
    $("toneDesc").textContent = TONES[tone].desc + "の言い回しです。";
    const fixedTo = t.to && t.to[tone];
    const simple = tone === "internal" || tone === "casual";
    $("toCoF").hidden = simple || !!fixedTo; $("toDeptF").hidden = simple || !!fixedTo; $("toNameF").hidden = !!fixedTo;
    $("toNameL").textContent = simple ? "相手の名前（「さん」が付きます）" : (t.toDefault ? "相手の名前（分からなければ空欄）" : "相手の名前（「様」が付きます）");
    ["toCompany", "toDept", "toName"].forEach(k => { if (document.activeElement !== $(k)) $(k).value = st.to[k]; });
    const vals = st.vals[t.id] || (st.vals[t.id] = {});
    $("fields").replaceChildren(...t.fields.filter(f => !f.tones || f.tones.indexOf(tone) >= 0).map(f => {
      const wrap = el("div", "fld");
      const id = "f_" + f.k;
      const lab = el("label", "", f.label); lab.htmlFor = id;
      const inp = f.type === "area" || f.type === "lines" ? el("textarea") : el("input");
      if (inp.tagName === "INPUT") { inp.type = "text"; inp.maxLength = 100; inp.autocomplete = "off"; } else { inp.rows = f.type === "lines" ? 3 : 2; inp.maxLength = 600; }
      inp.id = id; inp.placeholder = f.ph || ""; inp.value = vals[f.k] || "";
      inp.addEventListener("input", () => { vals[f.k] = inp.value; save(); render(); });
      wrap.append(lab, inp);
      if (f.chips) {
        const cs = el("div", "fchips"); cs.setAttribute("role", "group"); cs.setAttribute("aria-label", f.label + "の例");
        f.chips.forEach(c => {
          const b = el("button", "chip", c); b.type = "button";
          b.addEventListener("click", () => { inp.value = c; vals[f.k] = c; save(); render(); inp.focus(); });
          cs.append(b);
        });
        const hint = el("span", "fc-hint", "候補にない言葉も入力できます");
        cs.append(hint);
        wrap.append(cs);
      }
      return wrap;
    }));
    renderMe();
  }
  ["toCompany", "toDept", "toName"].forEach(k => $(k).addEventListener("input", () => { st.to[k] = $(k).value; save(); render(); }));
  function renderMe() {
    ["myCompany", "myDept", "myName", "myContact"].forEach(k => { if (document.activeElement !== $(k)) $(k).value = st.me[k]; });
    $("meSum").textContent = st.me.myName.trim() ? "：" + [st.me.myCompany.trim(), st.me.myName.trim()].filter(Boolean).join(" ") : "：まだ入っていません";
  }
  ["myCompany", "myDept", "myName", "myContact"].forEach(k => $(k).addEventListener("input", () => { st.me[k] = $(k).value; save(); renderMe(); render(); }));
  if (!st.me.myName.trim()) $("meBox").open = true;

  // ---------- できあがり ----------
  function render() {
    const mine = st.cur ? st.mine.find(m => m.id === st.cur) : null;
    let subjects = [];
    if (mine) {
      if (!edited) { $("body").value = mine.body; }
      if (!subjEdited) $("subject").value = mine.subject;
    } else {
      const t = tpl(), r = compose(t, toneOf(t));
      subjects = r.subjects;
      if (!edited) $("body").value = r.text;
      if (!subjEdited) $("subject").value = subjects[Math.min(subjIdx, subjects.length - 1)] || "";
    }
    $("subjChips").replaceChildren(...subjects.map((s, i) => {
      const b = el("button", "chip", s); b.type = "button";
      b.setAttribute("aria-pressed", !subjEdited && i === subjIdx ? "true" : "false");
      b.addEventListener("click", () => { subjIdx = i; subjEdited = false; render(); });
      return b;
    }));
    $("subjChips").hidden = subjects.length < 2;
    $("editedBar").hidden = !edited || !!mine;
    const n = countBlanks($("subject").value + "\n" + $("body").value, !!mine);
    $("blanks").textContent = n ? "【 】の空欄があと" + n + "か所あります。項目を入れるか、本文を直接書き換えてください。" : "空欄はありません。送る前に、もう一度読み返してください。";
    $("blanks").classList.toggle("ok", !n);
    $("saveOpen").textContent = mine ? "＋ 別の名前で保存" : "＋ 自分の文例として保存";
  }
  $("body").addEventListener("input", () => {
    if (st.cur) { const m = st.mine.find(x => x.id === st.cur); if (m) { m.body = $("body").value.slice(0, 5000); save(); } }
    else edited = true;
    render();
  });
  $("subject").addEventListener("input", () => {
    subjEdited = true;
    if (st.cur) { const m = st.mine.find(x => x.id === st.cur); if (m) { m.subject = $("subject").value.slice(0, 100); save(); } }
    render();
  });
  $("regen").addEventListener("click", () => {
    const keep = $("body").value;
    edited = false; render();
    toast("項目から作り直しました。", () => { $("body").value = keep; edited = true; render(); });
  });

  function countBlanks(text, any) {
    if (any) return (text.replace(TAGS, "").match(/【[^】\n]*】/g) || []).length;
    let n = 0;
    marks.forEach(m => { n += text.split(m).length - 1; });
    return n;
  }
  // コピー
  async function copy(text, what) {
    const n = countBlanks(text, !!st.cur);
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) {
      const ta = el("textarea", "offscreen"); ta.value = text; document.body.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
    }
    $("copyMsg").textContent = ok ? what + "をコピーしました。メールに貼り付けてください。" + (n ? "（【 】の空欄が" + n + "か所残っています）" : "") : "コピーできませんでした。本文を長押しして選んでください。";
    $("copyMsg").classList.toggle("bad", !ok);
  }
  $("copyAll").addEventListener("click", () => copy("件名：" + $("subject").value + "\n\n" + $("body").value, "件名と本文"));
  $("copyBody").addEventListener("click", () => copy($("body").value, "本文"));
  $("copySubj").addEventListener("click", () => copy($("subject").value, "件名"));

  // 自分の文例として保存
  $("saveOpen").addEventListener("click", () => {
    const open = $("saveForm").hidden;
    $("saveForm").hidden = !open; $("saveOpen").setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { const mine = st.cur && st.mine.find(m => m.id === st.cur); $("saveName").value = mine ? mine.title + "（2）" : (st.cur ? "" : tpl().name); $("saveErr").textContent = ""; $("saveName").focus(); $("saveName").select(); }
  });
  $("saveCancel").addEventListener("click", () => { $("saveForm").hidden = true; $("saveOpen").setAttribute("aria-expanded", "false"); $("saveOpen").focus(); });
  $("saveName").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $("saveBtn").click(); } if (e.key === "Escape") $("saveCancel").click(); });
  $("saveName").addEventListener("input", () => { $("saveErr").textContent = ""; $("saveName").removeAttribute("aria-invalid"); });
  $("saveBtn").addEventListener("click", () => {
    const name = $("saveName").value.replace(/\s+/g, " ").trim().slice(0, 20);
    const bad = msg => { $("saveErr").textContent = msg; $("saveName").setAttribute("aria-invalid", "true"); $("saveName").focus(); };
    if (!name) return bad("名前を入れてから「保存」を押してください。");
    if (st.mine.some(m => m.title === name)) return bad("同じ名前の文例があります。別の名前にしてください。");
    if (st.mine.length >= 100) return bad("自分の文例は100件までです。使わないものを消してください。");
    const m = { id: rid(), title: name, subject: $("subject").value.slice(0, 100), body: $("body").value.slice(0, 5000) };
    st.mine.push(m); st.cur = m.id; edited = false; subjEdited = false; save();
    $("saveForm").hidden = true; $("saveOpen").setAttribute("aria-expanded", "false");
    renderIndex(); renderForm(); render();
    toast("「" + name + "」を保存しました。", () => { st.mine = st.mine.filter(x => x !== m); st.cur = ""; save(); renderIndex(); renderForm(); render(); });
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
    const blob = new Blob([JSON.stringify({ app: "bunrei", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = "bunrei.json";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 3e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "bunrei" && j.data && typeof j.data === "object") data = clean(j.data); } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。メール文例帳で書き出したファイルを選んでください。"; return; }
    if (st.mine.length && !confirm("今の内容（自分の文例" + st.mine.length + "件）を、ファイルの内容（" + data.mine.length + "件）と置き換えますか？")) return;
    const snap = JSON.stringify(st);
    st = data; save(); edited = false; subjEdited = false;
    renderIndex(); renderForm(); render();
    $("moveMsg").textContent = "読み込みました。自分の文例は" + data.mine.length + "件です。";
    toast("読み込みました。", () => { st = clean(JSON.parse(snap)); save(); renderIndex(); renderForm(); render(); });
  });

  renderIndex(); renderForm(); render();
})();
