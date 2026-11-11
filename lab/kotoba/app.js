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
  const say = m => { $("sr").textContent = m; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.decks)) {
    const S = window.STARTER || { name: "最初のデッキ", cards: [] };
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
  // 次に出る日を、ふつうの言葉で。0 = この回のうちにもう一度。
  function when(iv) {
    if (iv <= 0) return "すぐ";
    if (iv === 1) return "明日";
    if (iv < 14) return `${iv}日後`;
    if (iv < 60) return `${Math.round(iv / 7)}週間後`;
    return `${Math.round(iv / 30)}か月後`;
  }
  const label = iv => iv <= 0 ? "すぐまた出ます" : iv === 1 ? "明日また出ます" : `${when(iv)}にまた出ます`;
  const nextText = iv => iv <= 0 ? "このあと、もう一度出ます。" : iv === 1 ? "次は明日出ます。" : `次は${when(iv)}に出ます。`;

  // 答え方：4択（mc）か、めくって自己採点（flip）か。端末ごとに覚える。
  const MODE_KEY = "lab-kotoba-mode", HELP_KEY = "lab-kotoba-help-seen";
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let mode = lsGet(MODE_KEY) === "flip" ? "flip" : "mc";
  let helpSeen = lsGet(HELP_KEY) === "1";

  let view = "home", deck = null, queue = [], cur = null, studied = 0, startCount = 0, flipped = false;
  let curMode = "mc", choices = null, answered = false, unsure = false, timer = 0;

  function show(v) {
    view = v; clearTimeout(timer);
    ["Home", "Deck", "Study"].forEach(k => { $("v" + k).hidden = "v" + k !== "v" + v[0].toUpperCase() + v.slice(1); });
    $("navBack").hidden = v === "home"; $("labLink").hidden = v !== "home";
    $("barT").textContent = v === "home" ? "ことばカード" : v === "deck" ? "デッキ" : "復習";
    const n = totalDue(); $("duePill").textContent = `今日${n}枚`;
    window.scrollTo(0, 0);
  }

  function renderHome() {
    const n = totalDue();
    $("studyAll").disabled = !n;
    $("studyAll").textContent = n ? `復習を始める（${n}枚）` : "今日の復習は完了";
    $("heroNote").textContent = n ? "" : st.decks.some(d => d.cards.length) ? "また明日、続きをどうぞ。" : "デッキを開いて、カードを追加してください。";
    const ul = $("decks"); ul.replaceChildren();
    st.decks.forEach((d, i) => {
      const li = el("li"); const b = el("button", "deck c" + (i % 5)); b.type = "button";
      const due = dueOf(d);
      b.append(el("span", "d-name", d.name), el("span", "d-meta", `${d.cards.length}枚`));
      const dueEl = el("span", due ? "d-due" : "d-due zero", due ? `${due}` : "✓"); dueEl.setAttribute("aria-label", due ? `今日の復習${due}枚` : "今日の復習は完了");
      b.append(dueEl);
      b.addEventListener("click", () => openDeck(d));
      li.append(b); ul.append(li);
    });
    if (!st.decks.length) ul.append(el("li", "none", "デッキはまだありません。下に名前を入れて作成してください。"));
    show("home");
  }

  function openDeck(d) {
    deck = d; $("deckT").textContent = d.name;
    $("deckInfo").textContent = `${d.cards.length}枚・今日の復習${dueOf(d)}枚`;
    $("studyDeck").textContent = dueOf(d) ? `復習する（${dueOf(d)}枚）` : "今日の復習は完了";
    $("studyDeck").disabled = !dueOf(d);
    $("cardN").textContent = `（${d.cards.length}）`;
    const ul = $("cards"); ul.replaceChildren();
    d.cards.slice().reverse().forEach(c => {
      const li = el("li", "card-row");
      const t = el("div", "cr-t"); t.append(el("b", null, c.f), el("span", null, c.b));
      const due = el("span", "cr-due", isDue(c) ? "今日" : `${+c.due.slice(5, 7)}/${+c.due.slice(8)}`);
      due.setAttribute("aria-label", isDue(c) ? "次は今日" : `次は${+c.due.slice(5, 7)}月${+c.due.slice(8)}日`);
      const del = el("button", "cr-del", "×"); del.type = "button"; del.setAttribute("aria-label", `「${c.f}」のカードを削除`);
      del.addEventListener("click", () => { if (!confirm(`「${c.f}」のカードを削除しますか？`)) return; d.cards = d.cards.filter(x => x !== c); save(); openDeck(d); });
      li.append(t, due, del); ul.append(li);
    });
    if (!d.cards.length) ul.append(el("li", "none", "カードはまだありません。上に表と裏を入れて追加してください。"));
    show("deck");
  }

  // ---- 4択の選択肢づくり ----
  const norm = s => String(s).replace(/\s+/g, "").toLowerCase();
  const parts = s => String(s).split(/[・、,，/／]/).map(norm).filter(Boolean);
  const kind = s => /[一-鿿]/.test(s) ? "kanji" : /[぀-ヿ]/.test(s) ? "kana" : /[a-z]/i.test(s) ? "latin" : /\d/.test(s) ? "num" : "other";
  const tag = f => { const m = String(f).match(/[（(]([^）)]+)[）)]\s*$/); return m ? m[1] : ""; };
  // 正解と同じ語を含む答えは、どちらも正しく見えるので候補にしない。
  function buildChoices(item) {
    const c = item.c, mine = parts(c.b), seen = new Set([norm(c.b)]), pool = [];
    item.d.cards.forEach(o => {
      if (o === c) return;
      const k = norm(o.b);
      if (!k || seen.has(k) || parts(o.b).some(p => mine.includes(p))) return;
      seen.add(k); pool.push(o);
    });
    if (pool.length < 3) return null;
    const len = [...c.b].length, kd = kind(c.b), tg = tag(c.f);
    const score = o => Math.abs([...o.b].length - len) / Math.max(len, 4) + (kind(o.b) === kd ? 0 : 1) + (tg && tag(o.f) === tg ? -0.4 : 0) + Math.random() * 0.6;
    const picks = pool.map(o => [score(o), o]).sort((x, y) => x[0] - y[0]).slice(0, 3).map(x => x[1].b);
    const all = [c.b].concat(picks);
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all;
  }

  function startStudy(decks) {
    queue = []; decks.forEach(d => d.cards.filter(isDue).forEach(c => queue.push({ d, c })));
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    studied = 0; startCount = queue.length;
    $("done").hidden = true;
    show("study"); next();
  }
  function setModeButtons() {
    document.querySelectorAll(".mode-b").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  }
  function next() {
    clearTimeout(timer);
    cur = queue.shift();
    if (!cur) return finish();
    $("progT").textContent = `残り${queue.length + 1}枚`;
    $("progBar").style.width = (startCount ? Math.min(100, studied / (studied + queue.length + 1) * 100) : 0) + "%";
    renderCard();
  }
  function renderCard() {
    setModeButtons();
    if (window.scrollY > 0) window.scrollTo(0, 0);
    flipped = false; answered = false; unsure = false;
    choices = mode === "mc" ? buildChoices(cur) : null;
    curMode = choices ? "mc" : "flip";
    const deckN = cur.d.cards.length;
    $("modeNote").textContent = mode === "mc" && !choices
      ? (deckN < 4 ? "カードが4枚より少ないので、めくって答えます。" : "答えが似たカードばかりなので、めくって答えます。")
      : "";
    const isMc = curMode === "mc";
    $("stage").hidden = isMc; $("grades").hidden = true; $("mc").hidden = !isMc;
    $("keys").textContent = isMc ? "1〜4キーで選ぶ・Enterキーで次へ" : "スペースキーで裏返す・1〜3キーで答える";
    $("liveBack").textContent = "";
    if (isMc) renderMc(); else renderFlip();
    $("gradeHint").textContent = isMc
      ? "正解したカードは、次に出る日がだんだん先になります。間違えたカードは、この回のうちにもう一度出ます。"
      : "思い出せたか選ぶと、次に進みます。ボタンの下は、そのカードがまた出る日です。";
    $("gradeHint").hidden = helpSeen || !isMc;
  }
  function renderFlip() {
    $("flip").classList.remove("is-flipped");
    $("fFront").textContent = cur.c.f; $("fBack").textContent = cur.c.b; $("fEx").textContent = cur.c.ex || "";
    $("flip").querySelector(".f-back").setAttribute("aria-hidden", "true");
    $("nNg").textContent = label(schedule(cur.c, 1).iv); $("nMid").textContent = label(schedule(cur.c, 3).iv); $("nOk").textContent = label(schedule(cur.c, 5).iv);
    $("flip").focus({ preventScroll: true });
  }
  function renderMc() {
    $("qFront").textContent = cur.c.f;
    const box = $("choices"); box.replaceChildren();
    choices.forEach((t, i) => {
      const b = el("button", "ch"); b.type = "button"; b.dataset.i = String(i);
      b.append(el("span", "ch-n", String(i + 1)), el("span", "ch-t", t), el("span", "ch-m"));
      b.querySelector(".ch-m").setAttribute("aria-hidden", "true");
      box.append(b);
    });
    $("unsure").setAttribute("aria-pressed", "false"); $("unsureRow").hidden = false; $("unsureRow").classList.remove("on");
    $("fb").hidden = true; $("fb").className = "fb";
    const first = box.querySelector("button"); if (first) first.focus({ preventScroll: true });
  }
  function markHelp() { if (!helpSeen) { helpSeen = true; lsSet(HELP_KEY, "1"); } $("gradeHint").hidden = true; }
  function choose(i) {
    if (!cur || curMode !== "mc" || answered || !choices[i]) return;
    answered = true; markHelp();
    const ok = norm(choices[i]) === norm(cur.c.b);
    const q = ok ? (unsure ? 3 : 5) : 1;
    const n = schedule(cur.c, q); Object.assign(cur.c, n); save();
    studied++;
    if (q < 3) queue.push(cur);
    $("choices").querySelectorAll("button").forEach((b, j) => {
      b.disabled = true;
      const right = norm(choices[j]) === norm(cur.c.b);
      if (right) { b.classList.add("is-right"); b.querySelector(".ch-m").textContent = "○"; }
      else if (j === i) { b.classList.add("is-wrong"); b.querySelector(".ch-m").textContent = "×"; }
      else b.classList.add("is-dim");
    });
    $("unsureRow").hidden = true;
    const fb = $("fb"); fb.hidden = false; fb.className = "fb " + (ok ? "ok" : "ng");
    $("fbT").textContent = ok ? "正解！" : "不正解";
    $("fbS").textContent = ok
      ? (unsure ? `自信がなかったので、${when(n.iv) === "明日" ? "明日" : when(n.iv) + "に"}また出ます。` : nextText(n.iv))
      : `正解は「${cur.c.b}」です。${nextText(n.iv)}`;
    $("fbEx").textContent = cur.c.ex ? `例：${cur.c.ex}` : "";
    say(`${$("fbT").textContent}${$("fbS").textContent}`);
    $("nextBtn").focus({ preventScroll: true });
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    fb.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" });
    if (ok) timer = setTimeout(() => { if (view === "study" && answered) next(); }, cur.c.ex ? 1800 : 1200);
  }
  function flip() {
    if (!cur || curMode !== "flip") return;
    flipped = !flipped; $("flip").classList.toggle("is-flipped", flipped);
    $("flip").querySelector(".f-back").setAttribute("aria-hidden", String(!flipped));
    if (flipped) { $("grades").hidden = false; $("gradeHint").hidden = helpSeen; $("liveBack").textContent = `答え：${cur.c.b}${cur.c.ex ? "。" + cur.c.ex : ""}`; }
  }
  function grade(q) {
    if (!cur || curMode !== "flip" || !flipped) return;
    const n = schedule(cur.c, q); Object.assign(cur.c, n); save();
    studied++; markHelp();
    if (q < 3) queue.push(cur); // わからない：この回の最後にもう一度
    next();
  }
  function setMode(m) {
    if (m === mode) return;
    mode = m; lsSet(MODE_KEY, m); setModeButtons();
    // まだ答えていなければ、いまのカードを新しい答え方で出し直す。
    if (view === "study" && cur && !answered && !(curMode === "flip" && flipped)) renderCard();
    say(m === "mc" ? "4択で答えます。" : "めくって答えます。");
  }
  function finish() {
    clearTimeout(timer); cur = null;
    $("stage").hidden = true; $("grades").hidden = true; $("mc").hidden = true; $("gradeHint").hidden = true; $("done").hidden = false;
    $("modeNote").textContent = ""; $("keys").textContent = "";
    $("progBar").style.width = "100%"; $("progT").textContent = "完了";
    const tomorrow = addDays(1);
    const t = st.decks.reduce((s, d) => s + d.cards.filter(c => c.due <= tomorrow).length, 0);
    $("doneT").textContent = studied ? `${startCount}枚を復習しました。明日は${t}枚です。` : "今日の復習はありません。";
    $("duePill").textContent = `今日${totalDue()}枚`;
    $("doneBack").focus();
  }

  $("flip").addEventListener("click", flip);
  $("grades").addEventListener("click", e => { const b = e.target.closest("button[data-q]"); if (b) grade(+b.dataset.q); });
  $("choices").addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) choose(+b.dataset.i); });
  $("unsure").addEventListener("click", () => {
    if (answered) return;
    unsure = !unsure; $("unsure").setAttribute("aria-pressed", String(unsure)); $("unsureRow").classList.toggle("on", unsure);
  });
  $("nextBtn").addEventListener("click", () => { if (answered) next(); });
  document.querySelectorAll(".mode-b").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  document.addEventListener("keydown", e => {
    if (view !== "study" || !cur || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (curMode === "mc") {
      if (!answered && ["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); choose(+e.key - 1); }
      else if (answered && (e.key === "Enter" || e.key === " ") && document.activeElement !== $("nextBtn")) { e.preventDefault(); next(); }
      return;
    }
    if (e.key === " " && document.activeElement !== $("flip")) { e.preventDefault(); flip(); }
    if (flipped && ["1", "2", "3"].includes(e.key)) grade({ 1: 1, 2: 3, 3: 5 }[e.key]);
  });
  $("studyAll").addEventListener("click", () => startStudy(st.decks));
  $("studyDeck").addEventListener("click", () => startStudy([deck]));
  $("navBack").addEventListener("click", renderHome);
  $("doneBack").addEventListener("click", renderHome);
  $("delDeck").addEventListener("click", () => {
    if (!deck || !confirm(`デッキ「${deck.name}」を削除しますか？中のカード${deck.cards.length}枚も消えます。`)) return;
    st.decks = st.decks.filter(d => d !== deck); save(); renderHome();
  });
  $("newDeck").addEventListener("submit", e => {
    e.preventDefault(); const name = $("deckName").value.trim();
    if (!name) { $("deckErr").textContent = "デッキの名前を入れてください。"; $("deckName").focus(); return; }
    $("deckErr").textContent = "";
    const d = { id: uid(), name, cards: [] }; st.decks.push(d); save(); $("deckName").value = ""; openDeck(d);
  });
  $("addCard").addEventListener("submit", e => {
    e.preventDefault();
    const f = $("cFront").value.trim(), b = $("cBack").value.trim();
    if (!f || !b) { $("cardErr").textContent = f ? "裏（答え）を入れてください。" : "表（問題）を入れてください。"; (f ? $("cBack") : $("cFront")).focus(); return; }
    $("cardErr").textContent = "";
    deck.cards.push(newCard(f, b, $("cEx").value.trim())); save();
    $("cFront").value = ""; $("cBack").value = ""; $("cEx").value = "";
    openDeck(deck); $("cFront").focus(); $("cardErr").textContent = ""; say(`「${f}」を追加しました。`);
  });
  save(); renderHome();
})();
