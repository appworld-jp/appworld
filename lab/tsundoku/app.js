// 積読ゼロ — 本を1日10分ずつに切り分ける。記録はこの端末の localStorage だけ。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-tsundoku-v1";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = ymd(new Date());
  const COLORS = ["#7A3B2E", "#2F5B4B", "#3E4E77", "#8C5A3C", "#5B3F6B", "#9A6B1F", "#2C4F5E", "#6E2F3F"];

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.books)) st = { ppt: 8, books: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const left = b => b.pages - b.at;
  const daysLeft = b => Math.ceil(left(b) / st.ppt);
  const readToday = b => (b.log && b.log[today]) || 0;
  const fmtDate = s => { const [, m, d] = s.split("-").map(Number); return `${m}月${d}日`; };

  function finishDate(b) {
    const d = new Date(); d.setDate(d.getDate() + daysLeft(b) - (readToday(b) ? 0 : 1));
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function tick(b) {
    const before = b.at;
    b.at = Math.min(b.pages, b.at + st.ppt);
    b.log = b.log || {}; b.log[today] = (b.log[today] || 0) + (b.at - before);
    if (b.at >= b.pages) b.done = today;
    justRead = b.id; save(); render();
    announce(b.done ? `『${b.title}』を読み終えました。本棚に並べました。` : `${before + 1}〜${b.at}ページを読みました。`);
  }
  function announce(msg) { let a = $("sr"); if (!a) { a = el("p", "sr"); a.id = "sr"; a.setAttribute("aria-live", "polite"); document.body.append(a); } a.textContent = msg; }

  function renderToday() {
    const box = $("portions"); box.replaceChildren();
    const active = st.books.filter(b => !b.done);
    const doneToday = st.books.filter(b => b.done === today);
    $("first").hidden = st.books.length > 0;
    active.forEach(b => {
      const card = el("article", "portion");
      card.style.setProperty("--c", b.color);
      const r = readToday(b);
      const from = b.at + 1, to = Math.min(b.pages, b.at + st.ppt);
      const head = el("div", "p-head");
      head.append(el("h3", "p-title", b.title), el("span", "p-left", `残り${left(b)}ページ`));
      const range = el("p", "p-range");
      if (r) {
        range.append(el("span", "p-done", `今日は${r}ページ読みました`));
        range.append(el("span", "p-sub", `次は${from}〜${to}ページ`));
      } else {
        const big = el("span", "p-pages"); big.append(el("b", null, String(from)), document.createTextNode("〜"), el("b", null, String(to)), el("small", null, "ページ"));
        range.append(big, el("span", "p-sub", `${to - from + 1}ページ・約10分`));
      }
      const btn = el("button", r ? "btn ghost tick" : "btn tick", r ? "もう10分読んだ" : "読んだ");
      btn.type = "button";
      btn.setAttribute("aria-label", `『${b.title}』の${from}〜${to}ページを読んだ`);
      btn.addEventListener("click", () => tick(b));
      const meta = el("p", "p-meta", `このペースなら${finishDate(b)}に読み終わります（あと${daysLeft(b)}日）`);
      card.append(head, range, btn, meta);
      if (justRead === b.id) { card.classList.add("bump"); }
      box.append(card);
    });
    doneToday.forEach(b => {
      const card = el("article", justRead === b.id ? "portion fin bump" : "portion fin"); card.style.setProperty("--c", b.color);
      card.append(el("p", "fin-t", `『${b.title}』読了！`), el("p", "p-meta", `${b.pages}ページ、おつかれさまでした。`));
      box.append(card);
    });
    if (st.books.length && !active.length) {
      box.append(el("p", "none", doneToday.length ? "次の1冊を積みましょう。" : "今日読む本はありません。次の1冊を積みましょう。"));
    }
  }

  function grid(b) {
    // one cell per 10-minute portion
    const n = Math.ceil(b.pages / st.ppt);
    const g = el("div", "grid"); g.setAttribute("role", "img");
    g.setAttribute("aria-label", `10分×${n}回のうち、${Math.min(n, Math.floor(b.at / st.ppt))}回分を読みました`);
    const show = Math.min(n, 120);
    for (let i = 0; i < show; i++) {
      const c = el("i"); if ((i + 1) * st.ppt <= b.at || b.at >= b.pages) c.className = "on"; else if (i * st.ppt < b.at) c.className = "part";
      g.append(c);
    }
    if (n > show) g.append(el("span", "more", `ほか${n - show}回`));
    return g;
  }

  function renderPile() {
    const ul = $("pile"); ul.replaceChildren();
    const active = st.books.filter(b => !b.done);
    $("pileNone").hidden = active.length > 0;
    $("pileN").textContent = active.length ? `${active.length}冊` : "";
    active.forEach(b => {
      const li = el("li", "book"); li.style.setProperty("--c", b.color);
      const spine = el("div", "spine", b.title);
      const body = el("div", "b-body");
      const pct = Math.round(b.at / b.pages * 100);
      const top = el("div", "b-top");
      top.append(el("span", "b-pct", `${pct}%`), el("span", "b-of", `${b.at}/${b.pages}ページ・10分×${Math.ceil(b.pages / st.ppt)}回`));
      const edit = el("button", "b-edit", "編集"); edit.type = "button"; edit.setAttribute("aria-label", `『${b.title}』を編集`);
      edit.addEventListener("click", () => openEdit(b));
      top.append(edit);
      body.append(top, grid(b));
      li.append(spine, body); ul.append(li);
    });
  }

  function renderShelf() {
    const ul = $("shelf"); ul.replaceChildren();
    const done = st.books.filter(b => b.done).sort((a, b) => a.done < b.done ? -1 : 1);
    $("shelfNone").hidden = done.length > 0;
    $("shelf").parentElement.hidden = !done.length;
    $("shelfN").textContent = done.length ? `${done.length}冊・${done.reduce((s, b) => s + b.pages, 0)}ページ` : "";
    done.forEach(b => {
      const li = el("li", justRead === b.id ? "sp new" : "sp"); li.style.setProperty("--c", b.color);
      li.style.height = (130 + Math.min(30, b.pages / 15)) + "px";
      li.style.width = (30 + Math.min(22, b.pages / 40)) + "px";
      li.append(el("span", "sp-t", b.title), el("span", "sp-d", b.done.slice(5).replace("-", "/")));
      li.title = `${b.title}（${fmtDate(b.done)}読了）`;
      li.tabIndex = 0; li.setAttribute("role", "button"); li.setAttribute("aria-label", `${b.title}、${b.pages}ページ、${fmtDate(b.done)}に読了。編集する`);
      li.addEventListener("click", () => openEdit(b)); li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(b); } });
      ul.append(li);
    });
  }

  function render() {
    $("ppt").value = st.ppt; $("pptOut").textContent = `${st.ppt}ページ`;
    renderToday(); renderPile(); renderShelf();
    justRead = null;
  }

  let editing = null, justRead = null;
  function openEdit(b) {
    editing = b; $("editT").textContent = b.title; $("editSub").textContent = `全${b.pages}ページ`; $("editAt").max = b.pages; $("editAt").value = b.at;
    if ($("edit").showModal) $("edit").showModal();
  }
  $("edit").addEventListener("close", () => {
    if ($("edit").returnValue === "save" && editing) {
      const v = Math.max(0, Math.min(editing.pages, parseInt($("editAt").value, 10) || 0));
      editing.at = v; editing.done = v >= editing.pages ? (editing.done || today) : null;
      save(); render();
    }
    editing = null;
  });
  $("editDel").addEventListener("click", () => {
    if (!editing) return;
    if (!confirm(`『${editing.title}』を削除しますか？読んだ記録も消えます。`)) return;
    st.books = st.books.filter(b => b !== editing); editing = null; save(); $("edit").close("cancel"); render();
  });

  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const t = $("title").value.trim(), p = parseInt($("pages").value, 10);
    if (!t) { $("addErr").textContent = "タイトルを入れてください。"; $("title").focus(); return; }
    if (!(p >= 1 && p <= 3000)) { $("addErr").textContent = "ページ数は1〜3000で入れてください。"; $("pages").focus(); return; }
    $("addErr").textContent = "";
    st.books.push({ id: Date.now().toString(36), title: t, pages: p, at: 0, added: today, log: {}, done: null, color: COLORS[st.books.length % COLORS.length] });
    save(); $("title").value = ""; $("pages").value = ""; render();
    announce(`『${t}』を積みました。1日10分で${Math.ceil(p / st.ppt)}日分です。`);
  });
  $("sample").addEventListener("click", () => { $("title").value = "坊っちゃん"; $("pages").value = "230"; $("addErr").textContent = ""; $("addForm").querySelector("button[type=submit]").focus(); });
  $("ppt").addEventListener("input", () => { st.ppt = parseInt($("ppt").value, 10) || 8; save(); render(); });

  const d = new Date(); $("today").textContent = `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`;
  render();
})();
