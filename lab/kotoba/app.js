// ことばカード — SM-2 をもとにした、かんたんな間隔反復。記録はこの端末の localStorage だけ。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-kotoba-v1";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const today = ymd(new Date());
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.decks)) {
    const S = window.STARTER || { name: "はじめのデッキ", cards: [] };
    st = { decks: [{ id: uid(), name: S.name, cards: S.cards.map(c => newCard(c[0], c[1], c[2])) }] };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  function newCard(f, b, ex) { return { id: uid(), f, b, ex: ex || "", ef: 2.5, reps: 0, iv: 0, due: today }; }
  const isDue = c => c.due <= today;
  const dueOf = d => d.cards.filter(isDue).length;
  const totalDue = () => st.decks.reduce((s, d) => s + dueOf(d), 0);

  // SM-2: q = 5（わかった）, 3（あやしい）, 1（わからない）
  function schedule(c, q) {
    const n = Object.assign({}, c);
    if (q < 3) { n.reps = 0; n.iv = 0; n.due = today; }
    else {
      n.reps = c.reps + 1;
      if (n.reps === 1) n.iv = 1;
      else if (n.reps === 2) n.iv = q === 5 ? 3 : 2;
      else n.iv = Math.max(c.iv + 1, Math.round(c.iv * (q === 5 ? c.ef : 1.2)));
      n.due = addDays(n.iv);
    }
    n.ef = Math.max(1.3, c.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    return n;
  }
  const label = iv => iv === 0 ? "もう一度" : iv === 1 ? "明日" : `${iv}日後`;

  let view = "home", deck = null, queue = [], cur = null, studied = 0, startCount = 0, flipped = false;

  function show(v) {
    view = v;
    ["Home", "Deck", "Study"].forEach(k => { $("v" + k).hidden = "v" + k !== "v" + v[0].toUpperCase() + v.slice(1); });
    $("navBack").hidden = v === "home"; $("labLink").hidden = v !== "home";
    $("barT").textContent = v === "home" ? "ことばカード" : v === "deck" ? "デッキ" : "復習";
    const n = totalDue(); $("duePill").textContent = n ? `今日 ${n}枚` : "今日 0枚";
    window.scrollTo(0, 0);
  }

  function renderHome() {
    const n = totalDue();
    $("studyAll").disabled = !n;
    $("heroNote").textContent = n ? `今日復習するカードは${n}枚です。` : st.decks.some(d => d.cards.length) ? "今日の分は終わっています。また明日。" : "まずはデッキにカードを足しましょう。";
    const ul = $("decks"); ul.replaceChildren();
    st.decks.forEach((d, i) => {
      const li = el("li"); const b = el("button", "deck c" + (i % 5)); b.type = "button";
      const due = dueOf(d);
      b.append(el("span", "d-name", d.name), el("span", "d-meta", `${d.cards.length}枚`));
      const dueEl = el("span", due ? "d-due" : "d-due zero", due ? `${due}` : "✓"); dueEl.setAttribute("aria-label", due ? `今日${due}枚` : "今日の分は完了");
      b.append(dueEl);
      b.addEventListener("click", () => openDeck(d));
      li.append(b); ul.append(li);
    });
    if (!st.decks.length) ul.append(el("li", "none", "デッキがありません。下の欄から作れます。"));
    show("home");
  }

  function openDeck(d) {
    deck = d; $("deckT").textContent = d.name;
    $("deckInfo").textContent = `${d.cards.length}枚・今日の復習${dueOf(d)}枚`;
    $("studyDeck").disabled = !dueOf(d);
    $("cardN").textContent = `（${d.cards.length}）`;
    const ul = $("cards"); ul.replaceChildren();
    d.cards.slice().reverse().forEach(c => {
      const li = el("li", "card-row");
      const t = el("div", "cr-t"); t.append(el("b", null, c.f), el("span", null, c.b));
      const due = el("span", "cr-due", isDue(c) ? "今日" : c.due.slice(5).replace("-", "/"));
      const del = el("button", "cr-del", "×"); del.type = "button"; del.setAttribute("aria-label", `「${c.f}」のカードを削除`);
      del.addEventListener("click", () => { if (!confirm(`「${c.f}」のカードを削除します。`)) return; d.cards = d.cards.filter(x => x !== c); save(); openDeck(d); });
      li.append(t, due, del); ul.append(li);
    });
    if (!d.cards.length) ul.append(el("li", "none", "まだカードがありません。上の欄から足してください。"));
    show("deck");
  }

  function startStudy(decks) {
    queue = []; decks.forEach(d => d.cards.filter(isDue).forEach(c => queue.push({ d, c })));
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    studied = 0; startCount = queue.length;
    $("done").hidden = true; $("stage").hidden = false;
    show("study"); next();
  }
  function next() {
    cur = queue.shift();
    if (!cur) return finish();
    flipped = false; $("flip").classList.remove("is-flipped");
    $("fFront").textContent = cur.c.f; $("fBack").textContent = cur.c.b; $("fEx").textContent = cur.c.ex || "";
    $("liveBack").textContent = "";
    $("flip").querySelector(".f-back").setAttribute("aria-hidden", "true");
    $("grades").hidden = true;
    $("progT").textContent = `残り${queue.length + 1}枚`;
    $("progBar").style.width = (startCount ? Math.min(100, studied / (studied + queue.length + 1) * 100) : 0) + "%";
    $("nNg").textContent = label(schedule(cur.c, 1).iv); $("nMid").textContent = label(schedule(cur.c, 3).iv); $("nOk").textContent = label(schedule(cur.c, 5).iv);
    $("flip").focus({ preventScroll: true });
  }
  function flip() {
    if (!cur) return;
    flipped = !flipped; $("flip").classList.toggle("is-flipped", flipped);
    $("flip").querySelector(".f-back").setAttribute("aria-hidden", String(!flipped));
    if (flipped) { $("grades").hidden = false; $("liveBack").textContent = `答え：${cur.c.b}${cur.c.ex ? "。" + cur.c.ex : ""}`; }
  }
  function grade(q) {
    if (!cur || !flipped) return;
    const n = schedule(cur.c, q); Object.assign(cur.c, n); save();
    studied++;
    if (q < 3) queue.push(cur); // わからない：この回の最後にもう一度
    next();
  }
  function finish() {
    $("stage").hidden = true; $("grades").hidden = true; $("done").hidden = false;
    $("progBar").style.width = "100%"; $("progT").textContent = "完了";
    const tomorrow = addDays(1);
    const t = st.decks.reduce((s, d) => s + d.cards.filter(c => c.due <= tomorrow).length, 0);
    $("doneT").textContent = studied ? `${startCount}枚を復習しました。明日の復習は${t}枚です。` : "今日復習するカードはありません。";
    $("duePill").textContent = `今日 ${totalDue()}枚`;
    $("doneBack").focus();
  }

  $("flip").addEventListener("click", flip);
  $("grades").addEventListener("click", e => { const b = e.target.closest("button[data-q]"); if (b) grade(+b.dataset.q); });
  document.addEventListener("keydown", e => {
    if (view !== "study" || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === " " && document.activeElement !== $("flip")) { e.preventDefault(); flip(); }
    if (flipped && ["1", "2", "3"].includes(e.key)) grade({ 1: 1, 2: 3, 3: 5 }[e.key]);
  });
  $("studyAll").addEventListener("click", () => startStudy(st.decks));
  $("studyDeck").addEventListener("click", () => startStudy([deck]));
  $("navBack").addEventListener("click", renderHome);
  $("doneBack").addEventListener("click", renderHome);
  $("delDeck").addEventListener("click", () => {
    if (!deck || !confirm(`デッキ「${deck.name}」と、中の${deck.cards.length}枚のカードを削除します。よろしいですか。`)) return;
    st.decks = st.decks.filter(d => d !== deck); save(); renderHome();
  });
  $("newDeck").addEventListener("submit", e => {
    e.preventDefault(); const name = $("deckName").value.trim();
    if (!name) { $("deckErr").textContent = "デッキの名前を入れてください。"; return; }
    $("deckErr").textContent = "";
    const d = { id: uid(), name, cards: [] }; st.decks.push(d); save(); $("deckName").value = ""; openDeck(d);
  });
  $("addCard").addEventListener("submit", e => {
    e.preventDefault();
    const f = $("cFront").value.trim(), b = $("cBack").value.trim();
    if (!f || !b) { $("cardErr").textContent = "表と裏の両方を入れてください。"; (f ? $("cBack") : $("cFront")).focus(); return; }
    $("cardErr").textContent = "";
    deck.cards.push(newCard(f, b, $("cEx").value.trim())); save();
    $("cFront").value = ""; $("cBack").value = ""; $("cEx").value = "";
    openDeck(deck); $("cFront").focus();
  });
  save(); renderHome();
})();
