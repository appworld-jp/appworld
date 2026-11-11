(() => {
  "use strict";
  const KEY = "moshimo.v1";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const now = new Date();
  const todayS = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const jd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${+m[1]}年${+m[2]}月${+m[3]}日` : ""; };
  const ageOf = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null;
    let a = now.getFullYear() - +m[1];
    if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) a--;
    return a >= 0 && a < 130 ? a : null;
  };

  const PF = { name: 20, kana: 30, birth: 10, blood: 4, allergy: 200, meds: 200, illness: 200, hosp: 40, hospTel: 20, note: 200 };
  const BLOODS = ["A型", "B型", "O型", "AB型"];
  const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
  function cleanPerson(p) {
    if (!p || typeof p !== "object") return null;
    const o = { id: typeof p.id === "string" && /^[\w-]{1,30}$/.test(p.id) ? p.id : uid() };
    for (const [k, n] of Object.entries(PF)) o[k] = str(p[k], n);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.birth)) o.birth = "";
    if (!BLOODS.includes(o.blood)) o.blood = "";
    o.rh = !!p.rh && !!o.blood;
    return o;
  }
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const people = Array.isArray(raw.people) ? raw.people.slice(0, 12).map(cleanPerson).filter(Boolean) : [];
    const contacts = Array.isArray(raw.contacts) ? raw.contacts.slice(0, 8).map(c => c && typeof c === "object"
      ? { id: typeof c.id === "string" && /^[\w-]{1,30}$/.test(c.id) ? c.id : uid(), name: str(c.name, 20), rel: str(c.rel, 12), tel: str(c.tel, 20) } : null).filter(Boolean) : [];
    const pl = raw.place && typeof raw.place === "object" ? raw.place : {};
    return { v: 1, people, contacts, place: { hinan: str(pl.hinan, 60), shugo: str(pl.shugo, 60), memo: str(pl.memo, 200) }, updated: /^\d{4}-\d{2}-\d{2}$/.test(raw.updated) ? raw.updated : "", sel: typeof raw.sel === "string" ? raw.sel : "" };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, people: [], contacts: [], place: { hinan: "", shugo: "", memo: "" }, updated: "", sel: "" };
  const save = () => { st.updated = todayS; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snap = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const sel = () => st.people.find(p => p.id === st.sel) || st.people[0] || null;
  const label = (p, i) => p.name.trim() || `${i + 1}人目`;

  // マイナンバーのような12桁の番号を見つける
  const z2h = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const looks12 = s => /(^|\D)\d{4}[\s\-‐－]?\d{4}[\s\-‐－]?\d{4}(\D|$)/.test(z2h(s || ""));

  // ---------- タブ ----------
  const views = { tabEdit: "viewEdit", tabShow: "viewShow", tabPrint: "viewPrint" };
  function show(tab) {
    for (const [t, v] of Object.entries(views)) { $(t).setAttribute("aria-pressed", String(t === tab)); $(v).hidden = t !== tab; }
    document.body.classList.toggle("showing", tab === "tabShow");
    if (tab === "tabShow") renderShow();
    if (tab === "tabPrint") renderPreview();
    if (tab === "tabEdit") renderEdit();
  }
  Object.keys(views).forEach(t => $(t).addEventListener("click", () => show(t)));

  // ---------- 書く ----------
  let savedT = null;
  function flashSaved(id) {
    $(id).textContent = "保存しました";
    clearTimeout(savedT); savedT = setTimeout(() => { $("savedMark").textContent = ""; $("savedMark2").textContent = ""; }, 1500);
  }
  function renderPeople() {
    const box = $("people"); box.textContent = "";
    const cur = sel();
    st.people.forEach((p, i) => {
      const b = el("button", "who", label(p, i)); b.type = "button";
      b.setAttribute("aria-pressed", String(cur && cur.id === p.id));
      b.addEventListener("click", () => { st.sel = p.id; save(); renderEdit(); });
      box.append(b);
    });
    if (st.people.length && st.people.length < 12) {
      const add = el("button", "who add", "＋ 家族を追加"); add.type = "button";
      add.addEventListener("click", addPerson);
      box.append(add);
    }
    box.hidden = !st.people.length;
  }
  function addPerson() {
    const p = cleanPerson({});
    st.people.push(p); st.sel = p.id; save(); renderEdit();
    $("fName").focus();
  }
  $("firstAdd").addEventListener("click", addPerson);

  function renderEdit() {
    renderPeople();
    const p = sel();
    $("noPeople").hidden = !!p;
    $("personForm").hidden = !p;
    if (p) {
      $("pfH").textContent = p.name.trim() ? `${p.name.trim()}さんのこと` : "この人のこと";
      document.querySelectorAll("#personForm [data-k]").forEach(inp => {
        const k = inp.dataset.k;
        if (inp.type === "checkbox") inp.checked = !!p[k]; else inp.value = p[k] || "";
      });
      $("fRh").disabled = !p.blood;
      checkWarn();
    }
    // 家族みんな
    document.querySelectorAll("[data-pk]").forEach(inp => { inp.value = st.place[inp.dataset.pk] || ""; });
    renderContacts();
  }
  function checkWarn() {
    const p = sel();
    $("numWarn").hidden = !(p && Object.keys(PF).some(k => looks12(p[k])));
    $("numWarn2").hidden = !(looks12(st.place.hinan) || looks12(st.place.shugo) || looks12(st.place.memo) || st.contacts.some(c => looks12(c.name) || looks12(c.rel)));
  }
  $("personForm").addEventListener("input", e => {
    const inp = e.target.closest("[data-k]"); const p = sel(); if (!inp || !p) return;
    const k = inp.dataset.k;
    if (inp.type === "checkbox") p[k] = inp.checked; else p[k] = inp.value.slice(0, PF[k]);
    if (k === "blood") { if (!p.blood) { p.rh = false; $("fRh").checked = false; } $("fRh").disabled = !p.blood; }
    save(); flashSaved("savedMark"); checkWarn();
    if (k === "name") {
      $("pfH").textContent = p.name.trim() ? `${p.name.trim()}さんのこと` : "この人のこと";
      const i = st.people.indexOf(p);
      const b = $("people").querySelectorAll(".who")[i]; if (b) b.textContent = label(p, i);
    }
  });
  $("personForm").addEventListener("submit", e => e.preventDefault());
  $("delPerson").addEventListener("click", () => {
    const p = sel(); if (!p) return;
    const nm = label(p, st.people.indexOf(p));
    if (!confirm(`${nm}のメモを削除しますか？`)) return;
    const s = snap();
    st.people = st.people.filter(q => q.id !== p.id); st.sel = st.people[0] ? st.people[0].id : ""; save(); renderEdit();
    toast(`${nm}のメモを削除しました。`, () => { restore(s); renderEdit(); });
  });

  // 連絡先
  function renderContacts() {
    const ul = $("contacts"); ul.textContent = "";
    if (!st.contacts.length) ul.append(el("li", "c-empty", "まだありません。家族以外で、すぐ連絡がつく人を入れておくと安心です。"));
    st.contacts.forEach((c, i) => {
      const li = el("li", "contact");
      const mk = (k, ph, n, type, lab) => {
        const l = el("label", "f c-" + k); l.append(el("span", null, lab));
        const inp = el("input"); inp.maxLength = n; inp.placeholder = ph; inp.autocomplete = "off"; if (type) inp.type = type;
        inp.value = c[k];
        inp.addEventListener("input", () => { c[k] = inp.value.slice(0, n); save(); flashSaved("savedMark2"); checkWarn(); });
        l.append(inp); return l;
      };
      li.append(mk("name", "山田 太郎", 20, "", "名前"), mk("rel", "夫", 12, "", "続柄"), mk("tel", "090-1234-5678", 20, "tel", "電話"));
      const del = el("button", "c-del", "×"); del.type = "button"; del.setAttribute("aria-label", `${i + 1}番目の連絡先を削除`);
      del.addEventListener("click", () => { const s = snap(); st.contacts = st.contacts.filter(x => x.id !== c.id); save(); renderContacts(); toast("連絡先を削除しました。", () => { restore(s); renderContacts(); }); });
      li.append(del); ul.append(li);
    });
    $("addContact").hidden = st.contacts.length >= 8;
  }
  $("addContact").addEventListener("click", () => {
    st.contacts.push({ id: uid(), name: "", rel: "", tel: "" }); save(); renderContacts();
    const last = $("contacts").querySelector(".contact:last-child input"); if (last) last.focus();
  });
  document.querySelectorAll("[data-pk]").forEach(inp => inp.addEventListener("input", () => {
    st.place[inp.dataset.pk] = inp.value.slice(0, inp.maxLength > 0 ? inp.maxLength : 200); save(); flashSaved("savedMark2"); checkWarn();
  }));

  // ---------- 見せる ----------
  let showId = "";
  let big = false;
  try { big = localStorage.getItem(KEY + ".big") === "1"; } catch (e) {}
  const telHref = t => "tel:" + z2h(t).replace(/[^\d+]/g, "");
  function renderShow() {
    const who = $("showWho"); who.textContent = "";
    const has = st.people.length > 0;
    $("showEmpty").hidden = has; $("show").hidden = !has;
    $("bigger").setAttribute("aria-pressed", String(big));
    $("show").classList.toggle("big", big);
    if (!has) return;
    if (!st.people.some(p => p.id === showId)) showId = (sel() || st.people[0]).id;
    st.people.forEach((p, i) => {
      const b = el("button", "who", label(p, i)); b.type = "button";
      b.setAttribute("aria-pressed", String(p.id === showId));
      b.addEventListener("click", () => { showId = p.id; renderShow(); });
      who.append(b);
    });
    const p = st.people.find(x => x.id === showId);
    const box = $("show"); box.textContent = "";
    const head = el("div", "s-head");
    if (p.kana.trim()) head.append(el("p", "s-kana", p.kana));
    head.append(el("p", "s-name", p.name.trim() || "（名前なし）"));
    const meta = [];
    if (p.birth) { const a = ageOf(p.birth); meta.push(`${jd(p.birth)}生まれ${a != null ? `（${a}歳）` : ""}`); }
    if (meta.length) head.append(el("p", "s-meta", meta.join("　")));
    if (p.blood) head.append(el("p", "s-blood", `血液型 ${p.blood}${p.rh ? "（Rh−）" : ""}`));
    box.append(head);
    const sec = (title, text, cls) => {
      if (!text || !text.trim()) return;
      const s = el("section", "s-sec" + (cls ? " " + cls : ""));
      s.append(el("h3", null, title), el("p", null, text.trim()));
      box.append(s);
    };
    sec("アレルギー", p.allergy, "alert");
    sec("飲んでいる薬", p.meds);
    sec("持病・これまでの病気", p.illness);
    sec("伝えたいこと", p.note);
    if (p.hosp.trim() || p.hospTel.trim()) {
      const s = el("section", "s-sec"); s.append(el("h3", null, "かかりつけ病院"));
      if (p.hosp.trim()) s.append(el("p", null, p.hosp.trim()));
      if (p.hospTel.trim()) { const a = el("a", "s-tel", p.hospTel.trim()); a.href = telHref(p.hospTel); s.append(a); }
      box.append(s);
    }
    const cs = st.contacts.filter(c => c.name.trim() || c.tel.trim());
    if (cs.length) {
      const s = el("section", "s-sec"); s.append(el("h3", null, "緊急連絡先"));
      const ul = el("ul", "s-contacts");
      for (const c of cs) {
        const li = el("li"); li.append(el("span", "s-cn", [c.name.trim(), c.rel.trim() ? `（${c.rel.trim()}）` : ""].join("")));
        if (c.tel.trim()) { const a = el("a", "s-tel", c.tel.trim()); a.href = telHref(c.tel); li.append(a); }
        ul.append(li);
      }
      s.append(ul); box.append(s);
    }
    sec("避難場所", st.place.hinan);
    sec("家族の集合場所", st.place.shugo);
    if (box.children.length === 1) box.append(el("p", "s-none", "まだ何も書いていません。「書く」で、アレルギーや薬などを入れてください。"));
  }
  $("bigger").addEventListener("click", () => { big = !big; try { localStorage.setItem(KEY + ".big", big ? "1" : "0"); } catch (e) {} renderShow(); });

  // ---------- 印刷 ----------
  const layout = () => (document.querySelector("input[name=layout]:checked") || {}).value || "card";
  document.querySelectorAll("input[name=layout]").forEach(r => r.addEventListener("change", renderPreview));
  function line(parent, label, text, cls) {
    if (!text || !String(text).trim()) return;
    const d = el("div", "pl" + (cls ? " " + cls : ""));
    d.append(el("span", "pl-k", label), el("span", "pl-v", String(text).trim()));
    parent.append(d);
  }
  function buildCards() {
    const wrap = el("div", "sheet-cards");
    const cs = st.contacts.filter(c => c.name.trim() || c.tel.trim()).slice(0, 3);
    st.people.forEach((p, i) => {
      const strip = el("div", "strip");
      const front = el("div", "card c-front");
      const fh = el("div", "c-band"); fh.append(el("b", null, "もしものメモ"), el("span", null, "救助の方へ"));
      const who = el("div", "c-who");
      if (p.kana.trim()) who.append(el("span", "c-kana", p.kana.trim()));
      who.append(el("span", "c-name", label(p, i)));
      const sub = [];
      if (p.birth) sub.push(`${jd(p.birth)}生`);
      if (p.blood) sub.push(`${p.blood}${p.rh ? " Rh−" : ""}`);
      if (sub.length) who.append(el("span", "c-sub", sub.join("　")));
      const body = el("div", "c-body");
      line(body, "アレルギー", p.allergy || "なし", "red");
      line(body, "薬", p.meds);
      line(body, "持病", p.illness);
      front.append(fh, who, body);
      const back = el("div", "card c-back");
      const bb = el("div", "c-body");
      line(bb, "伝えたいこと", p.note);
      if (p.hosp.trim() || p.hospTel.trim()) line(bb, "病院", [p.hosp.trim(), p.hospTel.trim()].filter(Boolean).join(" "));
      cs.forEach(c => line(bb, "連絡先", [c.name.trim() + (c.rel.trim() ? `（${c.rel.trim()}）` : ""), c.tel.trim()].filter(Boolean).join(" ")));
      line(bb, "避難場所", st.place.hinan);
      line(bb, "集合場所", st.place.shugo);
      const foot = el("div", "c-foot", `災害用伝言ダイヤル 171　記入 ${jd(st.updated || todayS)}`);
      back.append(bb, foot);
      strip.append(front, back);
      wrap.append(strip);
    });
    wrap.append(el("p", "cut-note", "点線で切り取り、真ん中の線で折ってください。"));
    return wrap;
  }
  function buildA4() {
    const a = el("div", "sheet-a4");
    const h = el("div", "a4-h"); h.append(el("h1", null, "もしものメモ"), el("span", null, `記入日 ${jd(st.updated || todayS)}`));
    a.append(h);
    const pl = el("div", "a4-places");
    line(pl, "避難場所", st.place.hinan || "　");
    line(pl, "家族の集合場所", st.place.shugo || "　");
    line(pl, "家族の決めごと", st.place.memo || "つながらないときは、災害用伝言ダイヤル171を使う");
    a.append(pl);
    const cs = st.contacts.filter(c => c.name.trim() || c.tel.trim());
    if (cs.length) {
      const t = el("table", "a4-t");
      const tr0 = el("tr"); ["緊急連絡先", "続柄", "電話"].forEach(x => tr0.append(el("th", null, x))); t.append(tr0);
      cs.forEach(c => { const tr = el("tr"); [c.name, c.rel, c.tel].forEach(x => tr.append(el("td", null, x.trim()))); t.append(tr); });
      a.append(t);
    }
    const grid = el("div", "a4-people");
    st.people.forEach((p, i) => {
      const b = el("div", "a4-p");
      const hh = el("div", "a4-ph");
      hh.append(el("b", null, label(p, i)));
      if (p.kana.trim()) hh.append(el("span", null, p.kana.trim()));
      b.append(hh);
      line(b, "生年月日", p.birth ? jd(p.birth) : "");
      line(b, "血液型", p.blood ? `${p.blood}${p.rh ? "（Rh−）" : ""}` : "");
      line(b, "アレルギー", p.allergy || "なし", "red");
      line(b, "飲んでいる薬", p.meds);
      line(b, "持病", p.illness);
      line(b, "かかりつけ", [p.hosp.trim(), p.hospTel.trim()].filter(Boolean).join("　"));
      line(b, "伝えたいこと", p.note);
      grid.append(b);
    });
    a.append(grid);
    return a;
  }
  function buildSheet() { return layout() === "a4" ? buildA4() : buildCards(); }
  function renderPreview() {
    const paper = $("paper"); paper.textContent = "";
    $("printBtn").disabled = !st.people.length;
    if (!st.people.length) { paper.append(el("p", "pv-empty", "「書く」で家族を追加すると、ここに印刷のイメージを表示します。")); paper.style.zoom = ""; paper.className = "paper"; return; }
    paper.className = "paper lay-" + layout();
    paper.append(buildSheet());
    // 画面の幅に合わせて縮小（A4＝210mm、カード＝172mm＋余白）
    const mmW = layout() === "a4" ? 214 : 196;
    const avail = Math.max(240, paper.parentElement.clientWidth - 2);
    const z = Math.min(1, avail / (mmW * 96 / 25.4));
    paper.style.zoom = String(z);
  }
  window.addEventListener("resize", () => { if (!$("viewPrint").hidden) renderPreview(); });
  $("printBtn").addEventListener("click", () => {
    const root = $("printRoot"); root.textContent = "";
    root.className = "print-root lay-" + layout();
    root.append(buildSheet());
    window.print();
  });
  window.addEventListener("afterprint", () => { $("printRoot").textContent = ""; });

  // ---------- 書き出し・読み込み・消去 ----------
  $("expBtn").addEventListener("click", () => {
    if (!st.people.length && !st.contacts.length) { $("moveMsg").textContent = "まだメモがないので、書き出せません。"; return; }
    const blob = new Blob([JSON.stringify({ app: "moshimo", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `moshimo-${todayS}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で読み込んだら、このファイルは消してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 1e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "moshimo") data = clean(j.data); } catch (e) { data = null; }
    if (!data || (!data.people.length && !data.contacts.length)) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.people.length && !confirm(`今のメモを、ファイルの内容（${data.people.length}人分）に置き換えますか？`)) return;
    const s = snap();
    st = data; save(); renderEdit();
    $("moveMsg").textContent = `${data.people.length}人分を読み込みました。`;
    toast("読み込みました。", () => { restore(s); renderEdit(); });
  });
  $("wipeBtn").addEventListener("click", () => {
    if (!st.people.length && !st.contacts.length && !st.place.hinan && !st.place.shugo && !st.place.memo) { $("moveMsg").textContent = "消すメモはありません。"; return; }
    if (!confirm("この端末から、もしものメモを全て消しますか？")) return;
    const s = snap();
    st = { v: 1, people: [], contacts: [], place: { hinan: "", shugo: "", memo: "" }, updated: "", sel: "" };
    try { localStorage.removeItem(KEY); } catch (e) {}
    renderEdit();
    $("moveMsg").textContent = "";
    toast("全て消しました。", () => { restore(s); renderEdit(); });
  });

  // ---------- トースト ----------
  let tt = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg;
    $("toastUndo").hidden = !undo;
    $("toastUndo").onclick = () => { if (undo) undo(); $("toast").hidden = true; };
    $("toast").hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { $("toast").hidden = true; }, 6000);
  }

  renderEdit();
})();
