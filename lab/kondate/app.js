// こんだて帖：家にある食材と、内蔵の料理データを照らし合わせるだけ。通信はしない。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "kondate.v1";        // 選んだ食材（食材id、または一覧にない言葉は「+言葉」）
  const PREF = "kondate.prefs.v1"; // 絞り込みの設定
  const OPT = /あれば|好みで|付け合わせ/;
  const TYPE = { "主": "主菜", "副": "副菜", "汁": "汁物", "食": "主食" };
  const GENRE = { "和": "和食", "洋": "洋食", "中": "中華", "韓": "韓国", "エ": "エスニック" };

  // ---- 文字のそろえ方（全角半角・カタカナ・記号の違いを吸収） ----
  function norm(s) {
    return String(s).normalize("NFKC").toLowerCase()
      .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・、。,.!?！？「」『』（）()［］\[\]〜~ー-]/g, m => (m === "ー" || m === "-" ? "ー" : ""));
  }
  const bare = s => s.replace(/（.*?）/g, "");

  // ---- 食材の一覧 ----
  const FOOD = {}, GROUPS = [], FAM = {};
  window.FOODS_TXT.split("\n").forEach(line => {
    line = line.trim(); if (!line) return;
    if (line[0] === "#") { GROUPS.push({ cat: line.slice(1), items: [] }); return; }
    const [id, name, yomi, syn, fl = ""] = line.split("|");
    const f = { id, name, yomi, cat: GROUPS[GROUPS.length - 1].cat, common: fl.includes("*"), fam: (fl.match(/=(\w+)/) || [])[1] || null };
    f.raw = [bare(name), yomi, ...(syn ? syn.split("、") : [])];
    f.keys = [...new Set(f.raw.map(norm).filter(Boolean))];
    f.nameKey = norm(bare(name));
    FOOD[id] = f; GROUPS[GROUPS.length - 1].items.push(f);
    if (f.fam) (FAM[f.fam] = FAM[f.fam] || []).push(id);
  });
  const SEASON = new Set(window.SEASONINGS_TXT.split("、").map(norm));

  // ---- 料理のデータ ----
  const RECIPES = window.RECIPES_TXT.trim().split(/\n\s*\n/).map((b, idx) => {
    const L = b.trim().split("\n"), [n, t, m, g] = L[0].split("|");
    const ing = L[1].split(",").map(x => {
      const k = x.indexOf(" "), alts = x.slice(0, k).split("|"), amt = x.slice(k + 1);
      const label = alts.map(a => bare(FOOD[a].name)).join("か");
      return { alts, amt, opt: OPT.test(amt), label, key: norm(alts.map(a => FOOD[a].name).join(" ")) };
    });
    const r = { idx, n, t: TYPE[t], m: +m, g: GENRE[g], ing, s: L[2], st: L.slice(3) };
    r.sKey = norm(r.s); r.nKey = norm(n);
    r.ids = new Set(ing.flatMap(x => x.alts));
    return r;
  });
  const USES = {};
  RECIPES.forEach(r => r.ids.forEach(id => { USES[id] = (USES[id] || 0) + 1; }));
  const DISH_COUNT = RECIPES.length;

  // ---- 状態 ----
  const have = new Set();   // 食材id
  let free = [];            // 一覧にない言葉（表示用の文字のまま）
  let prefs = { quick: false, genre: "" };
  let ranked = [], triples = [], page = 0, cur = [], listType = "", listShown = 20, shownOnce = false;

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v)) v.forEach(x => {
        if (typeof x !== "string") return;
        if (x[0] === "+") { const w = x.slice(1).trim().slice(0, 30); if (w && !free.includes(w)) free.push(w); }
        else if (FOOD[x]) have.add(x);
      });
    } catch (e) {}
    try {
      const p = JSON.parse(localStorage.getItem(PREF) || "{}");
      if (p && typeof p === "object") { prefs.quick = !!p.quick; prefs.genre = GENRE_LIST.includes(p.genre) ? p.genre : ""; }
    } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify([...have, ...free.map(w => "+" + w)])); } catch (e) {} }
  function savePrefs() { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) {} }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const count = () => have.size + free.length;

  // ---- 照合 ----
  // 食材が手元にあるか。完全に同じものか、同じ仲間（豚こまと豚バラなど）で代わりになるものを返す
  function match(alts) {
    for (const a of alts) if (have.has(a)) return { id: a, sub: null };
    for (const a of alts) {
      const fam = FOOD[a].fam;
      if (fam) for (const b of FAM[fam]) if (have.has(b)) return { id: a, sub: b };
    }
    return null;
  }
  const freeKeys = () => free.map(w => ({ w, k: norm(w) })).filter(x => x.k);

  function evaluate(r, fk) {
    let got = 0, miss = 0, extra = 0;
    const uses = [], usedFree = new Set();
    const rows = r.ing.map(x => {
      let m = match(x.alts), viaFree = null;
      if (!m) { const f = fk.find(f => x.key.includes(f.k)); if (f) { viaFree = f.w; usedFree.add(f.w); } }
      const ok = !!(m || viaFree);
      if (ok) { got++; uses.push(m ? bare(FOOD[m.sub || m.id].name) : viaFree); }
      else if (!x.opt) miss++;
      return { x, m, viaFree, ok };
    });
    // 一覧にない言葉が、料理名や調味料の欄に出てくる
    fk.forEach(f => { if (!usedFree.has(f.w) && (r.nKey.includes(f.k) || r.sKey.includes(f.k))) { got++; usedFree.add(f.w); uses.push(f.w); } });
    // にんにく・バター・牛乳などが調味料の欄に書いてある
    have.forEach(id => {
      const k = FOOD[id].nameKey;
      if (!r.ids.has(id) && k.length >= 2 && r.sKey.includes(k)) { extra++; uses.push(bare(FOOD[id].name)); }
    });
    const score = got * 3 + extra - miss * 1.5 + (miss === 0 ? 2 : 0);
    return { r, rows, got, miss, extra, uses, score };
  }

  function rankAll() {
    const fk = freeKeys();
    return RECIPES
      .filter(r => (!prefs.quick || r.m <= 20) && (!prefs.genre || genreOf(r) === prefs.genre))
      .map(r => evaluate(r, fk))
      .filter(x => x.got + x.extra > 0)
      .sort((a, b) => b.score - a.score || b.got - a.got || a.miss - b.miss || a.r.m - b.r.m);
  }
  const GENRE_LIST = ["和食", "洋食", "中華", "韓国・エスニック"];
  const genreOf = r => (r.g === "韓国" || r.g === "エスニック") ? "韓国・エスニック" : r.g;

  // 主菜（または主食）＋副菜＋汁物の組を作る。汁物は主菜とジャンルがそろうものを少し優先
  function buildTriples(list) {
    const mains = list.filter(x => x.r.t === "主菜" || x.r.t === "主食");
    const sides = list.filter(x => x.r.t === "副菜"), soups = list.filter(x => x.r.t === "汁物");
    const out = [], n = Math.min(Math.max(mains.length, 1), 12);
    const usedS = new Set(), usedP = new Set();
    for (let k = 0; k < n; k++) {
      const t = [], main = mains[k];
      if (main) t.push(main);
      const pick = (pool, used) => {
        let best = null, bs = -Infinity;
        pool.slice(0, 40).forEach(x => {
          if (used.has(x.r.idx)) return;
          const s = x.score + (main && genreOf(x.r) === genreOf(main.r) ? 2 : 0);
          if (s > bs) { bs = s; best = x; }
        });
        if (!best) { used.clear(); best = pool.find(x => !t.includes(x)) || null; }
        if (best) used.add(best.r.idx);
        return best;
      };
      const side = pick(sides, usedS), soup = pick(soups, usedP);
      if (side) t.push(side); if (soup) t.push(soup);
      // 足りない枠は、ほかの候補で埋める
      for (const x of list) { if (t.length >= 3) break; if (!t.includes(x)) t.push(x); }
      if (t.length) out.push(t);
      if (!main) break;
    }
    return out;
  }

  // ---- 食材の入力と候補 ----
  const q = $("q"), sugg = $("sugg");
  let options = [], active = -1;

  function search(text) {
    const k = norm(text);
    if (!k) return [];
    const res = [];
    Object.values(FOOD).forEach(f => {
      let best = 9, via = "";
      f.keys.forEach(key => {
        const s = key === k ? 0 : key.startsWith(k) ? 1 : key.includes(k) ? 2 : (k.length >= 2 && k.includes(key) && key.length >= 2) ? 3 : 9;
        if (s < best) { best = s; via = key; }
      });
      if (best < 9) res.push({ f, s: best, via, w: best === 0 ? -9 : best * 2 + (via === f.nameKey || via === norm(f.yomi) ? 0 : 1) - (f.common ? 1 : 0) });
    });
    res.sort((a, b) => a.w - b.w || (b.f.common - a.f.common) || (USES[b.f.id] || 0) - (USES[a.f.id] || 0) || a.f.name.length - b.f.name.length);
    return res.slice(0, 8);
  }

  function renderSugg() {
    const text = q.value.trim();
    sugg.textContent = ""; options = []; active = -1;
    if (!text) { closeSugg(); return; }
    const k = norm(text);
    const found = search(text);
    found.forEach(o => options.push({ kind: "food", f: o.f, exact: o.s === 0, via: o.via }));
    const exact = found.some(o => o.s === 0);
    if (SEASON.has(k)) options.unshift({ kind: "season", text });
    else if (!exact) options.push({ kind: "free", text });
    options.forEach((o, i) => {
      const li = el("li", "opt"); li.id = "opt-" + i; li.setAttribute("role", "option");
      if (o.kind === "food") {
        li.append(el("span", "o-name", o.f.name));
        const viaTxt = o.via === o.f.nameKey || o.via === norm(o.f.yomi) ? "" : o.f.raw.find(x => norm(x) === o.via);
        if (viaTxt) li.append(el("span", "o-via", viaTxt));
        li.append(el("span", "o-cat", have.has(o.f.id) ? "追加ずみ" : o.f.cat));
      } else if (o.kind === "season") {
        li.classList.add("o-season");
        li.append(el("span", "o-name", `「${o.text}」は調味料です`), el("span", "o-cat", "選ばなくて大丈夫"));
      } else {
        li.classList.add("o-free");
        li.append(el("span", "o-name", `「${o.text}」をそのまま追加`), el("span", "o-cat", "名前で探します"));
      }
      li.addEventListener("mousedown", e => e.preventDefault());
      li.addEventListener("click", () => choose(i));
      sugg.append(li);
    });
    // 入力と同じ名前の食材があれば、最初から選んだ状態に
    const first = options.findIndex(o => o.kind === "food" && o.exact);
    setActive(first >= 0 ? first : options[0] && options[0].kind === "food" && found[0].s === 1 ? 0 : -1);
    sugg.hidden = false; q.setAttribute("aria-expanded", "true");
  }
  function setActive(i) {
    active = i;
    [...sugg.children].forEach((li, j) => { li.setAttribute("aria-selected", j === i ? "true" : "false"); });
    if (i >= 0) { q.setAttribute("aria-activedescendant", "opt-" + i); sugg.children[i].scrollIntoView({ block: "nearest" }); }
    else q.removeAttribute("aria-activedescendant");
  }
  function closeSugg() { sugg.hidden = true; sugg.textContent = ""; options = []; active = -1; q.setAttribute("aria-expanded", "false"); q.removeAttribute("aria-activedescendant"); }

  function choose(i) {
    const o = options[i];
    if (!o) return;
    if (o.kind === "food") addFood(o.f.id);
    else if (o.kind === "season") say(`${o.text}は調味料なので、入れなくても大丈夫です。`);
    else addFree(o.text);
    q.value = ""; closeSugg(); q.focus();
  }
  function submitInput() {
    const text = q.value.trim();
    if (!text) return;
    if (active >= 0) { choose(active); return; }
    const k = norm(text);
    if (SEASON.has(k)) { options = [{ kind: "season", text }]; choose(0); return; }
    const hit = Object.values(FOOD).find(f => f.keys.includes(k));
    if (hit) addFood(hit.id); else addFree(text);
    q.value = ""; closeSugg();
  }

  function say(msg) { $("say").textContent = msg; }
  function addFood(id) {
    const f = FOOD[id];
    if (have.has(id)) { say(`${f.name}は、もう入っています。`); return; }
    have.add(id); save(); syncAll(true);
    const n = USES[id] || RECIPES.filter(r => r.sKey.includes(f.nameKey)).length;
    say(n ? `${f.name}を追加しました。` : `${f.name}を追加しました。ただ、${bare(f.name)}を使う料理はまだ入っていません。`);
  }
  function addFree(text) {
    const w = text.slice(0, 30);
    const k = norm(w);
    if (!k) return;
    if (free.some(x => norm(x) === k)) { say(`「${w}」は、もう入っています。`); return; }
    free.push(w); myFoods.add(w); save(); syncAll(true);
    const n = RECIPES.filter(r => r.nKey.includes(k) || r.sKey.includes(k) || r.ing.some(x => x.key.includes(k))).length;
    say(n ? `「${w}」は食材の一覧にないので、料理名と材料名から探します。${n}品に入っています。`
          : `「${w}」は食材の一覧になく、使う料理もまだ入っていません。ほかの食材で探してみてください。`);
  }
  function removeFood(id) { have.delete(id); save(); syncAll(true); say(`${FOOD[id].name}を外しました。`); }
  function removeFree(w) { free = free.filter(x => x !== w); save(); syncAll(true); say(`「${w}」を外しました。`); }

  // ---- 選んだ食材のチップ ----
  function renderPicked() {
    const box = $("picked"); box.textContent = "";
    $("picked-wrap").hidden = count() === 0;
    $("picked-n").textContent = `${count()}品`;
    [...have].forEach(id => {
      const b = el("button", "pick"); b.type = "button";
      b.append(el("span", null, FOOD[id].name), el("span", "x", "×"));
      b.setAttribute("aria-label", `${FOOD[id].name}を外す`);
      b.addEventListener("click", () => removeFood(id));
      box.append(b);
    });
    free.forEach(w => {
      const b = el("button", "pick free"); b.type = "button";
      b.append(el("span", null, w), el("span", "x", "×"));
      b.setAttribute("aria-label", `${w}を外す（一覧にない食材）`);
      b.addEventListener("click", () => removeFree(w));
      box.append(b);
    });
    $("free-note").hidden = free.length === 0;
  }

  // ---- チェックリスト ----
  const boxes = {};
  GROUPS.forEach(g => {
    const fs = el("fieldset", "group"); fs.append(el("legend", null, g.cat));
    const chips = el("div", "chips"), more = el("div", "chips more-items");
    more.hidden = true;
    const rest = g.items.filter(f => !f.common);
    g.items.forEach(f => {
      const lab = el("label", "chip"), inp = el("input");
      inp.type = "checkbox"; inp.value = f.id;
      inp.addEventListener("change", () => { inp.checked ? have.add(f.id) : have.delete(f.id); save(); syncAll(false); say(""); });
      lab.append(inp, el("span", null, f.name)); boxes[f.id] = inp;
      (f.common || !g.items.some(x => x.common) ? chips : more).append(lab);
    });
    fs.append(chips);
    if (g.items.some(x => x.common) && rest.length) {
      const btn = el("button", "more-btn"); btn.type = "button";
      const label = () => { btn.textContent = more.hidden ? `もっと見る（${rest.length}）` : "閉じる"; };
      btn.setAttribute("aria-expanded", "false"); label();
      btn.addEventListener("click", () => { more.hidden = !more.hidden; btn.setAttribute("aria-expanded", String(!more.hidden)); label(); });
      fs.append(more, btn);
    } else if (!g.items.some(x => x.common)) {
      // よく使うものがない分類（果物など）は、たたんでおく
      chips.hidden = true;
      const btn = el("button", "more-btn"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
      btn.textContent = `見る（${g.items.length}）`;
      btn.addEventListener("click", () => { chips.hidden = !chips.hidden; btn.setAttribute("aria-expanded", String(!chips.hidden)); btn.textContent = chips.hidden ? `見る（${g.items.length}）` : "閉じる"; });
      fs.append(btn);
    }
    $("groups").append(fs);
  });

  // ---- 自分で入れた食材（一覧にない言葉）は、次からチェックで選べる ----
  const FC = window.FreeChips;
  const myFoods = FC.store("kondate.foods.custom", { limit: 30 });
  const mineFs = el("fieldset", "group mine"); mineFs.append(el("legend", null, "自分で入れた食材"));
  const mineChips = el("div", "chips");
  const mineAdd = FC.adder({ label: "＋ 自分で入力", aria: "一覧にない食材を入力", placeholder: "例：ビーツ", max: 20, ok: "追加",
    empty: "食材の名前を入れてから「追加」を押してください。",
    submit: v => {
      const k = norm(v);
      if (SEASON.has(k)) return `「${v}」は調味料なので、入れなくても大丈夫です。`;
      const hit = Object.values(FOOD).find(f => f.keys.includes(k));
      if (hit) addFood(hit.id); else addFree(v);
      const b = mineChips.querySelector(".fc-add"); if (b) b.focus();
    } });
  mineFs.append(mineChips, mineAdd.form);
  $("groups").append(mineFs);
  let mineSig = null;
  function renderMine() {
    const sig = JSON.stringify(myFoods.all());
    if (sig === mineSig) { mineChips.querySelectorAll("input").forEach(i => { i.checked = free.includes(i.value); }); return; }
    mineSig = sig;
    mineChips.textContent = "";
    myFoods.all().forEach(w => {
      const lab = el("label", "chip free"), inp = el("input");
      inp.type = "checkbox"; inp.value = w; inp.checked = free.includes(w);
      inp.addEventListener("change", () => {
        if (inp.checked) { if (!free.includes(w)) free.push(w); } else free = free.filter(x => x !== w);
        save(); syncAll(false); say("");
      });
      lab.append(inp, el("span", null, w));
      const wrap = el("span", "fc-item");
      wrap.append(lab, FC.remover(w, () => { myFoods.remove(w); renderMine(); say(`「${w}」を候補から外しました。`); }));
      mineChips.append(wrap);
    });
    mineChips.append(mineAdd.btn);
  }

  function syncAll(rerun) {
    Object.entries(boxes).forEach(([id, inp]) => { inp.checked = have.has(id); });
    // 「もっと見る」の中で選ばれているものがあれば、閉じていても数を見せる
    document.querySelectorAll(".group").forEach(fs => {
      const btn = fs.querySelector(".more-btn"); if (!btn) return;
      const hiddenBox = fs.querySelector(".more-items") || fs.querySelector(".chips");
      const n = [...hiddenBox.querySelectorAll("input")].filter(i => i.checked).length;
      btn.dataset.on = n ? `${n}品選択中` : "";
    });
    renderPicked(); renderMine();
    const n = count();
    $("go").disabled = n === 0;
    $("go-label").textContent = n ? `献立を決める（${n}品）` : "食材を入れてください";
    $("try").hidden = n > 0;
    if (rerun && shownOnce) run(false);
  }

  // ---- カード ----
  function ingList(x) {
    const ul = el("ul", "ing");
    x.rows.forEach(({ x: it, m, viaFree, ok }) => {
      const cls = ok ? "have" : it.opt ? "opt" : "need";
      const li = el("li", cls);
      let nm = it.label;
      if (m && m.sub) nm = `${bare(FOOD[m.id].name)}（${bare(FOOD[m.sub].name)}で）`;
      else if (m && it.alts.length > 1) nm = bare(FOOD[m.id].name);
      li.append(el("span", "mk", ok ? "○" : it.opt ? "・" : "×"), el("span", "nm", nm), el("span", "amt", it.amt));
      li.setAttribute("aria-label", `${nm} ${it.amt}、${ok ? "家にある" : it.opt ? "なくてもよい" : "買い足す"}`);
      ul.append(li);
    });
    return ul;
  }
  function body(x, open) {
    const frag = document.createDocumentFragment();
    frag.append(ingList(x), el("p", "season", "調味料など：" + x.r.s));
    const d = el("details", "how"), sm = el("summary", null, "作り方"), ol = el("ol", "steps");
    x.r.st.forEach(s => ol.append(el("li", null, s)));
    d.append(sm, ol); if (open) d.open = true; frag.append(d);
    return frag;
  }
  function metaLine(x) {
    const meta = el("div", "meta");
    meta.append(el("span", "tag t-" + x.r.t, x.r.t), el("span", null, x.r.g), el("span", null, `約${x.r.m}分`), el("span", null, "2人分"));
    meta.append(el("span", x.miss ? "score need" : "score", x.miss === 0 ? "買い足しなし" : `買い足し${x.miss}品`));
    return meta;
  }
  function card(x) {
    const c = el("article", "card");
    c.append(metaLine(x), el("h3", null, x.r.n));
    if (x.uses.length) c.append(el("p", "uses", "家にある：" + [...new Set(x.uses)].join("・")));
    c.append(body(x, false));
    return c;
  }

  // ---- 結果 ----
  function show() {
    const out = $("out"); out.textContent = "";
    if (!cur.length) {
      const e = el("div", "empty");
      e.append(el("p", null, prefs.quick || prefs.genre
        ? "条件に合う料理がありませんでした。絞り込みを外すか、食材を増やしてみてください。"
        : "合う料理がありませんでした。食材をもう少し入れてみてください。"));
      out.append(e); $("shop").hidden = true; $("more").hidden = true; $("cands").hidden = true; return;
    }
    cur.forEach(x => out.append(card(x)));
    $("more").hidden = triples.length < 2;
    shopping();
    renderList();
  }

  function renderTabs() {
    const tabs = $("ltabs"); tabs.textContent = "";
    ["", "主菜", "副菜", "汁物", "主食"].forEach(t => {
      const n = ranked.filter(x => !t || x.r.t === t).length;
      const b = el("button", "ltab", `${t || "すべて"} ${n}`); b.type = "button";
      b.setAttribute("aria-pressed", String(listType === t));
      b.disabled = n === 0 && t !== "";
      b.addEventListener("click", () => { listType = t; listShown = 20; renderList(); });
      tabs.append(b);
    });
  }
  function renderList() {
    $("cands").hidden = false;
    renderTabs();
    const inCur = new Set(cur.map(x => x.r.idx));
    const list = ranked.filter(x => (!listType || x.r.t === listType) && !inCur.has(x.r.idx));
    const ul = $("clist"); ul.textContent = "";
    $("cands-sum").textContent = `${ranked.length}品が見つかりました。家にあるものを多く使う順です。`;
    list.slice(0, listShown).forEach(x => {
      const li = el("li", "cand"), d = el("details"), sm = el("summary");
      const top = el("span", "c-top");
      top.append(el("span", "c-name", x.r.n), el("span", x.miss ? "c-buy need" : "c-buy", x.miss ? `買い足し${x.miss}品` : "買い足しなし"));
      const sub = el("span", "c-sub", `${x.r.t}・${x.r.g}・約${x.r.m}分　家にある：${[...new Set(x.uses)].join("・")}`);
      sm.append(top, sub); d.append(sm);
      const inner = el("div", "c-body");
      inner.append(body(x, true));
      const use = el("button", "use", "献立に入れる"); use.type = "button";
      use.addEventListener("click", () => swapIn(x));
      inner.append(use); d.append(inner); li.append(d); ul.append(li);
    });
    if (!list.length) { const li = el("li", "c-none", "この種類の候補は、ほかにありません。"); ul.append(li); }
    $("lmore").hidden = list.length <= listShown;
  }
  // 同じ種類の料理と入れかえる（主菜と主食はどちらも「メイン」として扱う）
  function swapIn(x) {
    const role = t => (t === "主食" ? "主菜" : t);
    let i = cur.findIndex(y => role(y.r.t) === role(x.r.t));
    if (i < 0) i = cur.length < 3 ? cur.length : cur.length - 1;
    cur = cur.slice(); cur[i] = x;
    show();
    say("");
    $("pick-msg").textContent = `${x.r.n}を献立に入れました。`;
    $("h-res").scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
  }

  function shopping() {
    const memo = $("memo"); memo.textContent = ""; memo.classList.remove("all-done"); $("copy-msg").textContent = "";
    const need = new Map();
    cur.forEach(x => x.rows.forEach(({ x: it, ok }) => {
      if (ok || it.opt) return;
      if (!need.has(it.label)) need.set(it.label, []);
      need.get(it.label).push(x.r.n);
    }));
    $("shop").hidden = false;
    $("shop-n").textContent = need.size ? `買い足し${need.size}品` : "";
    if (!need.size) { const li = el("li"); li.append(el("span", "none", "買い足すものはありません。")); memo.append(li); return; }
    need.forEach((dishes, nm) => {
      const li = el("li"), lab = el("label"), cb = el("input"); cb.type = "checkbox";
      cb.addEventListener("change", doneCheck);
      lab.append(cb, el("span", "nm", nm), el("span", "for", dishes.join("・")));
      li.append(lab); memo.append(li);
    });
  }
  function doneCheck() {
    const all = [...$("memo").querySelectorAll("input")];
    const done = all.length && all.every(c => c.checked);
    $("copy-msg").textContent = done ? "買い物完了です。いただきます！" : "";
    $("memo").classList.toggle("all-done", !!done);
  }

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function run(scroll) {
    if (!count()) { shownOnce = false; cur = []; $("out").textContent = ""; $("out").append(emptyFirst); $("shop").hidden = true; $("cands").hidden = true; $("more").hidden = true; return; }
    ranked = rankAll(); triples = buildTriples(ranked); page = 0; cur = triples[0] ? triples[0].slice() : [];
    listType = ""; listShown = 20; shownOnce = true; $("pick-msg").textContent = "";
    show();
    if (scroll) $("h-res").scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
  }
  const emptyFirst = $("empty");

  // ---- 絞り込み ----
  function renderFilters() {
    $("quick").setAttribute("aria-pressed", String(prefs.quick));
    document.querySelectorAll("#genres button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === prefs.genre)));
  }
  $("quick").addEventListener("click", () => { prefs.quick = !prefs.quick; savePrefs(); renderFilters(); if (shownOnce) run(false); });
  const gbox = $("genres");
  ["", ...GENRE_LIST].forEach(g => {
    const b = el("button", "fchip", g || "すべて"); b.type = "button"; b.dataset.g = g;
    b.addEventListener("click", () => { prefs.genre = g; savePrefs(); renderFilters(); if (shownOnce) run(false); });
    gbox.append(b);
  });

  // ---- イベント ----
  q.addEventListener("input", renderSugg);
  q.addEventListener("focus", () => { if (q.value.trim()) renderSugg(); });
  q.addEventListener("blur", () => setTimeout(closeSugg, 120));
  q.addEventListener("keydown", e => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown" && options.length) { e.preventDefault(); setActive((active + 1) % options.length); }
    else if (e.key === "ArrowUp" && options.length) { e.preventDefault(); setActive(active <= 0 ? options.length - 1 : active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); submitInput(); }
    else if (e.key === "Escape") { closeSugg(); }
  });
  $("add").addEventListener("click", () => { submitInput(); q.focus(); });
  $("go").addEventListener("click", () => run(true));
  $("more").addEventListener("click", () => { page = (page + 1) % triples.length; cur = triples[page].slice(); $("pick-msg").textContent = ""; show(); });
  $("lmore").addEventListener("click", () => { listShown += 20; renderList(); });
  $("clear").addEventListener("click", () => {
    if (!count()) return;
    if (!confirm("選んだ食材をすべて外しますか？")) return;
    have.clear(); free = []; save(); syncAll(false); run(false); say("すべて外しました。");
  });
  $("sample").addEventListener("click", () => {
    ["tamanegi", "ninjin", "jagaimo", "buta", "tamago"].forEach(id => have.add(id)); save(); syncAll(false); run(true);
  });
  $("copy").addEventListener("click", async () => {
    const items = [...$("memo").querySelectorAll(".nm")].map(n => "・" + n.textContent);
    const dishes = cur.map(x => x.r.n).join("、");
    const text = items.length ? `買い物リスト（${dishes}）\n` + items.join("\n") : "買い足すものはありません";
    try { await navigator.clipboard.writeText(text); $("copy-msg").textContent = "コピーしました。"; }
    catch (e) { $("copy-msg").textContent = "コピーできませんでした。リストを長押しして選んでください。"; }
  });

  $("dish-count").textContent = `約${Math.floor(DISH_COUNT / 10) * 10}品`;
  load(); free.forEach(w => myFoods.add(w)); renderFilters(); syncAll(false);
})();
