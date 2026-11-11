// えほんメーカー — 人が書いたお話の型に、選んだものを当てはめて絵本にする。生成AIは使っていない。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const D = window.EHON, NS = "http://www.w3.org/2000/svg", KEY = "ehon.v1";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let sel = { hero: null, place: null, thing: null }, tpl = 0, book = null, page = 0, reading = false;

  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v) { sel = Object.assign(sel, v.sel || {}); tpl = +v.tpl || 0; } } catch (e) {}
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify({ sel, tpl })); } catch (e) {} };
  const svg = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const use = (id, x, y, w, h, cls) => { const u = svg("use", { href: "#" + id, x, y, width: w, height: h }); if (cls) u.setAttribute("class", cls); return u; };
  const pick = a => Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a;

  // ---- 選ぶ画面 ----
  function choices(boxId, name, list, prefix, vb) {
    list.forEach(item => {
      const lab = document.createElement("label"); lab.className = "choice";
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = name; inp.value = item.id;
      inp.checked = sel[name] === item.id;
      inp.addEventListener("change", () => { sel[name] = item.id; store(); $("msg").textContent = ""; });
      const art = svg("svg", { viewBox: vb, "aria-hidden": "true" });
      art.append(use(prefix + item.id, 0, 0, vb.split(" ")[2], vb.split(" ")[3]));
      const t = document.createElement("span"); t.textContent = item.label;
      const face = document.createElement("span"); face.className = "face"; face.append(art, t);
      lab.append(inp, face); $(boxId).append(lab);
    });
  }
  choices("c-hero", "hero", D.heroes, "h-", "0 0 100 100");

  // ---- しゅじんこうに なまえを つける（絵は えらんだ どうぶつのまま） ----
  const FC = window.FreeChips;
  const baseOf = id => D.heroes.find(x => x.id === id);
  const myHeroes = FC.store("ehon.heroes.custom", { limit: 12, valid: v => v && typeof v === "object" && typeof v.id === "string" && typeof v.name === "string" && v.name.trim() && baseOf(v.base), same: (a, b) => a.id === b.id || (a.base === b.base && a.name === b.name) });
  function heroOf(id) {
    const b = baseOf(id); if (b) return b;
    const m = myHeroes.all().find(x => x.id === id); if (!m) return null;
    const base = baseOf(m.base), name = m.name;
    const short = name.startsWith(base.label + "の") ? name.slice(base.label.length + 1) || name : name;
    return Object.assign({}, base, { id: base.id, label: name, H: name.startsWith(base.label) ? name : `${base.label}の${name}`, h: short });
  }
  const heroAdd = FC.adder({ label: "＋ なまえを つける", aria: "しゅじんこうの なまえ", placeholder: "ポンタ", max: 10, ok: "つける", btnClass: "face add",
    empty: "なまえを いれてから「つける」を おしてね。",
    submit: v => {
      const cur = heroOf(sel.hero);
      if (!cur) return "さきに、どうぶつを えらんでね。";
      const base = cur.id;
      let m = myHeroes.all().find(x => x.base === base && x.name === v);
      if (!m) { m = { id: "my" + Date.now().toString(36), base, name: v }; myHeroes.add(m); }
      sel.hero = m.id; store(); $("msg").textContent = ""; renderMyHeroes();
      const i = document.querySelector(`input[name=hero][value="${m.id}"]`); if (i) i.focus();
    } });
  $("c-hero").after(heroAdd.form);
  function renderMyHeroes() {
    const box = $("c-hero");
    box.querySelectorAll(".mine, .fc-add").forEach(n => n.remove());
    myHeroes.all().forEach(m => {
      const lab = document.createElement("label"); lab.className = "choice mine";
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = "hero"; inp.value = m.id; inp.checked = sel.hero === m.id;
      inp.addEventListener("change", () => { sel.hero = m.id; store(); $("msg").textContent = ""; });
      const art = svg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" }); art.append(use("h-" + m.base, 0, 0, 100, 100));
      const t = document.createElement("span"); t.textContent = m.name;
      const face = document.createElement("span"); face.className = "face"; face.append(art, t);
      const x = FC.remover(m.name, () => { if (sel.hero === m.id) { sel.hero = m.base; store(); const r = document.querySelector(`input[name=hero][value="${m.base}"]`); if (r) r.checked = true; } myHeroes.remove(m); renderMyHeroes(); });
      x.setAttribute("aria-label", `「${m.name}」を けす`);
      lab.append(inp, face); 
      const w = document.createElement("div"); w.className = "mine fc-item"; w.append(lab, x);
      box.append(w);
    });
    box.append(heroAdd.btn);
    box.querySelectorAll("input[name=hero]").forEach(i => { i.checked = i.value === sel.hero; });
  }
  renderMyHeroes();
  choices("c-place", "place", D.places, "p-", "0 0 320 200");
  choices("c-thing", "thing", D.things, "t-", "0 0 60 60");

  // ---- お話を組み立てる ----
  function build(t) {
    const H = heroOf(sel.hero), P = D.places.find(x => x.id === sel.place), T = D.things.find(x => x.id === sel.thing);
    const T0 = D.templates[t % D.templates.length];
    const words = Object.assign({}, H, P, T);
    const endList = T0.p.some(p => /\{F\}|\{f\}/.test([].concat(p.s).join())) ? D.ends : D.ends.slice(0, 2);
    words.end = pick(endList);
    const dreamFriend = /\{f\}/.test(words.end);
    const fill = s => { let out = s; for (let i = 0; i < 3; i++) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in words ? words[k] : m)); return out; };
    return {
      title: fill(T0.title), hero: H.id, place: P.id, thing: T.id, tpl: t % D.templates.length, dreamFriend,
      pages: T0.p.map(p => ({ text: fill(pick(p.s)), art: p.art }))
    };
  }

  // ---- 絵（art.js がページごとの場面を描く） ----
  function draw(p, cover) {
    const T0 = D.templates[book.tpl];
    window.EHON_ART.draw($("scene"), book, cover ? T0.cover : p.art, { cover, dreamFriend: book.dreamFriend });
  }

  // ---- ページ ----
  const total = () => book.pages.length + 1;
  function render() {
    const cover = page === 0, p = cover ? null : book.pages[page - 1];
    draw(p, cover);
    $("page-no").textContent = cover ? "" : `${page} / ${book.pages.length}`;
    const tx = $("text"); tx.textContent = "";
    tx.className = "text" + (cover ? " is-cover" : "");
    if (cover) {
      const h = document.createElement("span"); h.className = "book-name"; h.textContent = book.title;
      const s = document.createElement("span"); s.className = "book-sub"; s.textContent = "ページを めくってね";
      tx.append(h, s);
    } else {
      tx.append(document.createTextNode(p.text));
      if (page === total() - 1) { const e = document.createElement("span"); e.className = "fin"; e.textContent = "おしまい"; tx.append(e); }
    }
    $("book-title").textContent = book.title;
    $("prev").disabled = page === 0; $("next").disabled = page === total() - 1;
    [...$("dots").children].forEach((d, i) => { d.className = i === page ? "on" : ""; });
    const sp = document.querySelector(".spread");
    if (!reduce.matches) { sp.classList.remove("flip"); void sp.offsetWidth; sp.classList.add("flip"); }
  }
  function open() {
    book = build(tpl);
    page = 0;
    $("dots").textContent = "";
    for (let i = 0; i < total(); i++) $("dots").append(document.createElement("li"));
    $("maker").hidden = true; $("reader").hidden = false;
    stopReading(); render();
    $("reader").scrollIntoView({ block: "start" });
    $("next").focus();
  }
  function go(d) { const n = page + d; if (n < 0 || n >= total()) return; page = n; render(); }

  // ---- 読み上げ（端末の音声合成） ----
  const canSpeak = "speechSynthesis" in window;
  if (!canSpeak) $("read").hidden = true;
  function pageText() { return page === 0 ? book.title : book.pages[page - 1].text + (page === total() - 1 ? "おしまい。" : ""); }
  function speakPage() {
    if (!reading) return;
    const u = new SpeechSynthesisUtterance(pageText()); u.lang = "ja-JP"; u.rate = 0.85; u.pitch = 1.05;
    u.onend = () => { if (!reading) return; if (page < total() - 1) { setTimeout(() => { if (reading) { go(1); speakPage(); } }, 700); } else stopReading(); };
    speechSynthesis.speak(u);
  }
  function stopReading() { reading = false; if (canSpeak) speechSynthesis.cancel(); $("read").textContent = "こえで よむ"; $("read").setAttribute("aria-pressed", "false"); }
  $("read").addEventListener("click", () => {
    if (reading) { stopReading(); return; }
    reading = true; $("read").textContent = "よむのを やめる"; $("read").setAttribute("aria-pressed", "true");
    speechSynthesis.cancel(); speakPage();
  });

  // ---- 操作 ----
  $("maker").addEventListener("submit", e => {
    e.preventDefault();
    const miss = !heroOf(sel.hero) ? "しゅじんこう" : !sel.place ? "ばしょ" : !sel.thing ? "すきなもの" : "";
    if (miss) { $("msg").textContent = `${miss}を えらんでね。`; return; }
    open();
  });
  $("omakase").addEventListener("click", () => {
    const r = a => a[Math.floor(Math.random() * a.length)].id;
    sel = { hero: r(D.heroes), place: r(D.places), thing: r(D.things) };
    tpl = Math.floor(Math.random() * D.templates.length);
    ["hero", "place", "thing"].forEach(k => { const i = document.querySelector(`input[name=${k}][value=${sel[k]}]`); if (i) i.checked = true; });
    $("msg").textContent = ""; store(); open();
  });
  $("prev").addEventListener("click", () => { stopReading(); go(-1); });
  $("next").addEventListener("click", () => { stopReading(); go(1); });
  $("another").addEventListener("click", () => { tpl = (tpl + 1) % D.templates.length; store(); open(); });
  $("back").addEventListener("click", () => { stopReading(); $("reader").hidden = true; $("maker").hidden = false; $("maker").scrollIntoView({ block: "start" }); $("make").focus(); });
  document.addEventListener("keydown", e => {
    if ($("reader").hidden || e.target.closest("input")) return;
    if (e.key === "ArrowRight") { stopReading(); go(1); } else if (e.key === "ArrowLeft") { stopReading(); go(-1); }
  });
  let sx = null;
  const sp = document.querySelector(".spread");
  sp.addEventListener("pointerdown", e => { sx = e.clientX; });
  sp.addEventListener("pointerup", e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) { stopReading(); go(dx < 0 ? 1 : -1); } });
})();
