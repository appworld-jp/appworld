// 会った人メモ — 会った人を言葉で残し、探し、カードで名前を覚える。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const KEY = "lab-atta-v1";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => ymd(new Date());
  // カタカナはひらがなにそろえて探す
  const norm = s => (s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function ago(date) {
    const d = Math.round((parseYmd(today()) - parseYmd(date)) / 864e5);
    if (d <= 0) return "今日"; if (d === 1) return "昨日"; if (d < 7) return `${d}日前`;
    if (d < 31) return `${Math.floor(d / 7)}週間前`;
    const x = parseYmd(date); const now = new Date();
    return x.getFullYear() === now.getFullYear() ? `${x.getMonth() + 1}月${x.getDate()}日` : `${x.getFullYear()}年${x.getMonth() + 1}月`;
  }

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const splitTags = s => Array.from(new Set(String(s || "").split(/[、,，\s#＃]+/).map(t => t.trim().slice(0, 16)).filter(Boolean))).slice(0, 8);
  function cleanP(p) {
    if (!p || typeof p !== "object" || !str(p.name, 30)) return null;
    const meets = Array.isArray(p.meets) ? p.meets.filter(m => m && isYmd(m.date)).slice(0, 200).map(m => ({ date: m.date, place: str(m.place, 40) })) : [];
    const q = p.quiz && typeof p.quiz === "object" ? p.quiz : {};
    const n = v => Number.isInteger(v) && v >= 0 && v < 1e6 ? v : 0;
    return {
      id: str(p.id, 20) || uid(), name: str(p.name, 30), kana: str(p.kana, 40), meets,
      feat: str(p.feat, 300), talk: str(p.talk, 400), tags: Array.isArray(p.tags) ? splitTags(p.tags.join("、")) : [], next: str(p.next, 100),
      created: isYmd(p.created) ? p.created : today(), quiz: { ok: n(q.ok), ng: n(q.ng), last: isYmd(q.last) ? q.last : "" }
    };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.people)) return null;
    const ev = raw.event && typeof raw.event === "object" && str(raw.event.name, 40) ? { name: str(raw.event.name, 40), date: isYmd(raw.event.date) ? raw.event.date : today() } : null;
    return { v: 1, people: raw.people.slice(0, 3000).map(cleanP).filter(Boolean), event: ev };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, people: [], event: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("保存できませんでした。端末の空き容量を確かめてください。"); } };
  const lastMet = p => p.meets.reduce((a, m) => m.date > a ? m.date : a, "") || p.created;
  const lastPlace = p => { const m = p.meets.slice().sort((a, b) => a.date < b.date ? 1 : -1)[0]; return m ? m.place : ""; };

  // ---------- 画面切りかえ ----------
  function tab(name) {
    $("vPeople").hidden = name !== "people"; $("vQuiz").hidden = name !== "quiz";
    $("tPeople").setAttribute("aria-pressed", String(name === "people")); $("tQuiz").setAttribute("aria-pressed", String(name === "quiz"));
    if (name === "quiz") quizStart(); else render();
    window.scrollTo({ top: 0 });
  }
  $("tPeople").addEventListener("click", () => tab("people"));
  $("tQuiz").addEventListener("click", () => tab("quiz"));
  $("tAdd").addEventListener("click", () => openEdit(null));
  $("firstAdd").addEventListener("click", () => openEdit(null));

  // ---------- 一覧 ----------
  let tagSel = "";
  const ROWS = [["あ", "あいうえおゔ"], ["か", "かきくけこがぎぐげご"], ["さ", "さしすせそざじずぜぞ"], ["た", "たちつてとだぢづでどっ"], ["な", "なにぬねの"], ["は", "はひふへほばびぶべぼぱぴぷぺぽ"], ["ま", "まみむめも"], ["や", "やゆよゃゅょ"], ["ら", "らりるれろ"], ["わ", "わをん"]];
  function rowOf(p) {
    const c = norm(p.kana || p.name).replace(/[ぁぃぅぇぉ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 1))[0] || "";
    const r = ROWS.find(r => r[1].includes(c));
    return r ? r[0] : "よみなし";
  }
  function hay(p) { return norm([p.name, p.kana, p.feat, p.talk, p.next, p.tags.join(" "), p.meets.map(m => m.place).join(" ")].join(" ")); }
  function personCard(p, cls) {
    const b = el("button", "pc" + (cls ? " " + cls : "")); b.type = "button";
    b.append(el("span", "pc-kana", p.kana || " "), el("span", "pc-name", p.name));
    const place = lastPlace(p);
    b.append(el("span", "pc-where", [ago(lastMet(p)), place].filter(Boolean).join("・")));
    if (p.feat || p.talk) b.append(el("span", "pc-feat", p.feat || p.talk));
    b.addEventListener("click", () => openView(p));
    return b;
  }
  function render() {
    const n = st.people.length;
    $("empty").hidden = n > 0; $("searchBox").hidden = n === 0;
    renderEvent();
    // タグ
    const allTags = {}; st.people.forEach(p => p.tags.forEach(t => allTags[t] = (allTags[t] || 0) + 1));
    if (tagSel && !allTags[tagSel]) tagSel = "";
    const tf = $("tagFilter"); tf.replaceChildren();
    Object.keys(allTags).sort((a, b) => allTags[b] - allTags[a]).slice(0, 20).forEach(t => {
      const b = el("button", "tag", t); b.type = "button"; b.setAttribute("aria-pressed", String(tagSel === t));
      b.addEventListener("click", () => { tagSel = tagSel === t ? "" : t; render(); });
      tf.append(b);
    });
    const words = norm($("q").value.trim()).split(/\s+/).filter(Boolean);
    const filtering = words.length || tagSel;
    const hits = st.people.filter(p => (!tagSel || p.tags.includes(tagSel)) && words.every(w => hay(p).includes(w)));
    $("found").textContent = filtering ? (hits.length ? `${hits.length}人見つかりました。` : "見つかりませんでした。ほかの言葉でも探してみてください。") : "";
    // 最近会った人
    const recent = filtering ? [] : st.people.slice().sort((a, b) => lastMet(a) < lastMet(b) ? 1 : -1).slice(0, 4);
    $("recentSec").hidden = !recent.length || n < 3;
    $("recent").replaceChildren(...recent.map(p => personCard(p, "big")));
    // みんな（五十音）
    $("allSec").hidden = !hits.length;
    $("allN").textContent = `${hits.length}人`;
    const groups = {};
    hits.slice().sort((a, b) => norm(a.kana || a.name).localeCompare(norm(b.kana || b.name), "ja")).forEach(p => { const r = rowOf(p); (groups[r] = groups[r] || []).push(p); });
    const all = $("all"); all.replaceChildren();
    ROWS.map(r => r[0]).concat("よみなし").forEach(r => {
      if (!groups[r]) return;
      const g = el("div", "grp"); g.append(el("h3", "grp-h", r));
      const list = el("div", "cards list"); groups[r].forEach(p => list.append(personCard(p))); g.append(list); all.append(g);
    });
  }
  $("q").addEventListener("input", render);

  // ---------- 集まりの途中 ----------
  function renderEvent() {
    const on = !!st.event;
    $("evOff").hidden = on; $("evOn").hidden = !on;
    $("eventBox").classList.toggle("on", on);
    if (!on) return;
    $("evTitle").textContent = st.event.name;
    const ul = $("evList"); ul.replaceChildren();
    st.people.filter(p => p.meets.some(m => m.date === st.event.date && m.place === st.event.name)).forEach(p => {
      const li = el("li"); const b = el("button", null); b.type = "button";
      b.append(el("b", null, p.name), el("span", null, p.feat || p.talk || ""));
      b.addEventListener("click", () => openView(p)); li.append(b); ul.append(li);
    });
  }
  $("evStart").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("evName").value.trim().slice(0, 40);
    if (!name) { $("evErr").textContent = "集まりの名前を入れてください。例：同窓会"; $("evName").focus(); return; }
    $("evErr").textContent = "";
    st.event = { name, date: today() }; save(); render(); $("qName").focus();
  });
  $("evEnd").addEventListener("click", () => {
    const ev = st.event; st.event = null; save(); render();
    toast(`「${ev.name}」を終えました。`, () => { st.event = ev; save(); render(); });
  });
  $("quickForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("qName").value.trim();
    if (!name) { $("qErr").textContent = "名前を入れてください。名字だけでもかまいません。"; $("qName").focus(); return; }
    $("qErr").textContent = "";
    const p = cleanP({ name, feat: $("qFeat").value, meets: [{ date: st.event.date, place: st.event.name }] });
    st.people.unshift(p); save();
    $("qName").value = ""; $("qFeat").value = ""; render(); $("qName").focus();
    toast(`${p.name}を追加しました。`);
  });

  // ---------- くわしく ----------
  let viewing = null;
  function openView(p) {
    viewing = p;
    $("vName").textContent = p.name; $("vKana").textContent = p.kana;
    const tg = $("vTags"); tg.replaceChildren(...p.tags.map(t => el("span", "tag static", t)));
    const dl = $("vDl"); dl.replaceChildren();
    [["特徴", p.feat], ["話したこと", p.talk], ["次に話したいこと", p.next]].forEach(([k, v]) => { if (!v) return; const d = el("div"); d.append(el("dt", null, k), el("dd", null, v)); dl.append(d); });
    const ul = $("vMeets"); ul.replaceChildren();
    p.meets.slice().sort((a, b) => a.date < b.date ? 1 : -1).forEach(m => { const d = parseYmd(m.date); ul.append(el("li", null, `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${m.place ? "　" + m.place : ""}`)); });
    if (!p.meets.length) ul.append(el("li", null, "記録なし"));
    $("againPlace").value = st.event ? st.event.name : "";
    if (!$("view").open) $("view").showModal();
  }
  $("vClose").addEventListener("click", () => $("view").close());
  $("vEdit").addEventListener("click", () => { $("view").close(); openEdit(viewing); });
  $("againForm").addEventListener("submit", e => {
    e.preventDefault(); if (!viewing) return;
    const place = $("againPlace").value.trim().slice(0, 40);
    if (viewing.meets.some(m => m.date === today() && m.place === place)) { toast("今日の記録はもうあります。"); return; }
    viewing.meets.push({ date: today(), place }); save(); openView(viewing); render();
    toast(`${viewing.name}と今日会ったことを残しました。`);
  });
  $("vDel").addEventListener("click", () => {
    const p = viewing; if (!p) return;
    const idx = st.people.indexOf(p); st.people.splice(idx, 1); save(); $("view").close(); render();
    toast(`${p.name}を削除しました。`, () => { st.people.splice(idx, 0, p); save(); render(); });
  });

  // ---------- 追加・編集 ----------
  let editing = null;
  function openEdit(p) {
    editing = p;
    $("eH").textContent = p ? "編集" : "ひとり追加";
    $("fName").value = p ? p.name : ""; $("fKana").value = p ? p.kana : "";
    const m0 = p && p.meets.length ? p.meets.slice().sort((a, b) => a.date < b.date ? -1 : 1)[0] : null;
    $("fDate").value = m0 ? m0.date : today(); $("fPlace").value = m0 ? m0.place : (st.event ? st.event.name : "");
    $("fDate").disabled = $("fPlace").disabled = !!(p && p.meets.length > 1);
    $("fFeat").value = p ? p.feat : ""; $("fTalk").value = p ? p.talk : ""; $("fTags").value = p ? p.tags.join("、") : ""; $("fNext").value = p ? p.next : "";
    $("fErr").textContent = "";
    renderSuggest();
    $("edit").showModal(); $("fName").focus();
  }
  function renderSuggest() {
    const cur = splitTags($("fTags").value);
    const all = {}; st.people.forEach(p => p.tags.forEach(t => all[t] = (all[t] || 0) + 1));
    ["仕事", "ご近所", "ママ友", "ジム", "趣味"].forEach(t => { if (!all[t]) all[t] = 0; });
    const box = $("tagSuggest"); box.replaceChildren();
    Object.keys(all).filter(t => !cur.includes(t)).sort((a, b) => all[b] - all[a]).slice(0, 10).forEach(t => {
      const b = el("button", "tag", "＋" + t); b.type = "button";
      b.addEventListener("click", () => { $("fTags").value = cur.concat(t).join("、"); renderSuggest(); });
      box.append(b);
    });
  }
  $("fTags").addEventListener("input", renderSuggest);
  $("eCancel").addEventListener("click", () => $("edit").close());
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("fName").value.trim();
    if (!name) { $("fErr").textContent = "名前を入れてください。名字だけ、あだ名だけでもかまいません。"; $("fName").focus(); return; }
    const date = isYmd($("fDate").value) ? $("fDate").value : today();
    if (date > today()) { $("fErr").textContent = "会った日は、今日より前の日にしてください。"; $("fDate").focus(); return; }
    const data = { name, kana: $("fKana").value, feat: $("fFeat").value, talk: $("fTalk").value, tags: splitTags($("fTags").value), next: $("fNext").value };
    if (editing) {
      const keep = editing.meets.length > 1 ? editing.meets : [{ date, place: $("fPlace").value.trim().slice(0, 40) }];
      Object.assign(editing, cleanP(Object.assign({}, editing, data, { meets: keep })), { id: editing.id });
      save(); $("edit").close(); render(); openView(editing);
    } else {
      const p = cleanP(Object.assign(data, { meets: [{ date, place: $("fPlace").value }] }));
      st.people.unshift(p); save(); $("edit").close(); tab("people");
      toast(`${p.name}を追加しました。`);
    }
  });
  [$("view"), $("edit")].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

  // ---------- 覚える ----------
  let qzSet = "all", deck = [], qi = 0, okN = 0, flipped = false;
  const quizable = p => p.feat || p.talk || p.meets.some(m => m.place);
  function quizStart() {
    $("qzStart").hidden = false; $("qz").hidden = true; $("qzEnd").hidden = true; $("qzErr").textContent = "";
    const opts = [["all", "みんな"], ["recent", "この30日"]];
    const tags = {}; st.people.forEach(p => p.tags.forEach(t => tags[t] = 1));
    Object.keys(tags).slice(0, 12).forEach(t => opts.push(["t:" + t, t]));
    if (!opts.some(o => o[0] === qzSet)) qzSet = "all";
    const box = $("qzTags"); box.replaceChildren();
    opts.forEach(([k, label]) => {
      const b = el("button", "tag", label); b.type = "button"; b.setAttribute("aria-pressed", String(qzSet === k));
      b.addEventListener("click", () => { qzSet = k; quizStart(); });
      box.append(b);
    });
  }
  function pool() {
    const lim = new Date(); lim.setDate(lim.getDate() - 30); const l = ymd(lim);
    return st.people.filter(quizable).filter(p => qzSet === "all" ? true : qzSet === "recent" ? lastMet(p) >= l : p.tags.includes(qzSet.slice(2)));
  }
  $("qzGo").addEventListener("click", () => {
    const ps = pool();
    if (ps.length < 1) { $("qzErr").textContent = st.people.length ? "特徴か会った場所が書かれている人がいません。まず一覧で書き足してください。" : "まず、会った人を追加してください。"; return; }
    // 忘れた回数が多い人、しばらく練習していない人を先に
    const score = p => (p.quiz.ng - p.quiz.ok * 0.6) + (p.quiz.last ? 0 : 2) + Math.random() * 1.5;
    deck = ps.map(p => [score(p), p]).sort((a, b) => b[0] - a[0]).slice(0, 10).map(x => x[1]);
    qi = 0; okN = 0;
    $("qzStart").hidden = true; $("qz").hidden = false; showCard();
  });
  function showCard() {
    const p = deck[qi]; flipped = false;
    $("flash").classList.remove("flipped");
    $("qzProg").textContent = `${qi + 1} / ${deck.length}`;
    const f = $("qzFront"); f.replaceChildren();
    const place = lastPlace(p);
    f.append(el("span", "f-q", "この人は？"));
    if (place) f.append(el("span", "f-where", `${place}（${ago(lastMet(p))}）`));
    if (p.feat) f.append(el("span", "f-feat", p.feat));
    if (p.talk) f.append(el("span", "f-talk", "話したこと：" + p.talk));
    if (p.tags.length) f.append(el("span", "f-tags", p.tags.join("・")));
    const bk = $("qzBack"); bk.replaceChildren(el("span", "b-kana", p.kana), el("span", "b-name", p.name));
    if (p.next) bk.append(el("span", "b-next", "次は：" + p.next));
    $("qzActs").hidden = true; $("qzHint").hidden = false;
    $("flash").setAttribute("aria-label", "カードをめくって名前を見る");
  }
  $("flash").addEventListener("click", () => {
    flipped = !flipped;
    $("flash").classList.toggle("flipped", flipped);
    $("qzActs").hidden = !flipped; $("qzHint").hidden = flipped;
    $("flash").setAttribute("aria-label", flipped ? `答え：${deck[qi].name}。もう一度押すと表に戻ります` : "カードをめくって名前を見る");
  });
  function answer(ok) {
    const p = deck[qi]; if (!p) return;
    if (ok) { p.quiz.ok++; okN++; } else p.quiz.ng++;
    p.quiz.last = today(); save();
    qi++;
    if (qi < deck.length) showCard();
    else {
      $("qz").hidden = true; $("qzEnd").hidden = false;
      $("qzScore").textContent = `${deck.length}人中 ${okN}人`;
      $("qzMsg").textContent = okN === deck.length ? "全員思い出せました。" : "忘れていた人は、次の練習で先に出てきます。";
    }
  }
  $("qzOk").addEventListener("click", () => answer(true));
  $("qzNg").addEventListener("click", () => answer(false));
  $("qzAgain").addEventListener("click", () => { quizStart(); $("qzGo").click(); });
  $("qzBackBtn").addEventListener("click", () => tab("people"));

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return ymd(x); };
    [
      { name: "田中 ゆかり", kana: "たなか ゆかり", meets: [{ date: d(3), place: "保育園の運動会" }], feat: "背が高い。ショートカットで、よく笑う。", talk: "上の子が同じクラス。最近、山登りをはじめた。", tags: ["ママ友", "山"], next: "登った山の写真を見せてもらう" },
      { name: "佐々木さん", kana: "ささき", meets: [{ date: d(10), place: "ジム（火曜の夜）" }], feat: "白髪まじりで、いつも青いタオル。", talk: "元は高校の体育の先生。", tags: ["ジム"], next: "" },
      { name: "Mark Lee", kana: "まーく りー", meets: [{ date: d(40), place: "取引先との打ち合わせ" }], feat: "メガネ。日本語がとても上手。", talk: "大阪に5年住んでいた。たこ焼きが好き。", tags: ["仕事"], next: "大阪のおすすめの店を聞く" }
    ].forEach(x => st.people.push(cleanP(x)));
    save(); render();
    toast("例を3人入れました。開いて削除できます。");
  });

  // ---------- お知らせ ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "atta", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `atta-${today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 10e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "atta") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.people.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.people.length && !confirm(`いまのメモを、ファイルの${data.people.length}人と置きかえますか？`)) return;
    const prev = JSON.stringify(st);
    st = data; save(); render();
    $("moveMsg").textContent = `${data.people.length}人を読み込みました。`;
    toast("読み込みました。", () => { st = JSON.parse(prev); save(); render(); });
  });

  render();
})();
