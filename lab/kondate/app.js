// こんだて帖 — 手持ちの食材と、内蔵の料理データを照らし合わせるだけ。通信はしない。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "kondate.v1";
  const NAME = {};
  window.FOODS.forEach(g => g.items.forEach(([id, n]) => { NAME[id] = n; }));
  const OPT = /あれば|好みで|付け合わせ/;
  const has = id => id.split("|").some(x => have.has(x));
  const label = id => id.split("|").map(x => NAME[x]).join("か");
  const have = new Set();
  let triples = [], page = 0;

  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(v)) v.forEach(id => NAME[id] && have.add(id)); } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify([...have])); } catch (e) {} }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // 食材のチェックリスト
  window.FOODS.forEach((g, gi) => {
    const fs = el("fieldset", "group"); fs.append(el("legend", null, g.cat));
    const box = el("div", "chips");
    g.items.forEach(([id, n]) => {
      const lab = el("label", "chip"), inp = el("input");
      inp.type = "checkbox"; inp.value = id; inp.checked = false;
      inp.addEventListener("change", () => { inp.checked ? have.add(id) : have.delete(id); save(); syncGo(); });
      lab.append(inp, el("span", null, n)); box.append(lab);
    });
    fs.append(box); $("groups").append(fs);
  });
  function syncChecks() { document.querySelectorAll("#groups input").forEach(i => { i.checked = have.has(i.value); }); syncGo(); }
  function syncGo() {
    $("go").disabled = have.size === 0;
    $("go-label").textContent = have.size ? `献立を決める（${have.size}品）` : "食材を選んでください";
    $("try").hidden = have.size > 0;
  }

  // 点数：手持ちを多く使うほど高く、足りないものが多いほど低く
  function rank() {
    const list = window.RECIPES.map(r => {
      const req = r.i.filter(([, a]) => !OPT.test(a));
      const got = r.i.filter(([id]) => has(id)).length;
      const miss = req.filter(([id]) => !has(id)).length;
      return { r, got, miss, score: got * 3 - miss * 1.5 + (miss === 0 ? 2 : 0) };
    }).filter(x => x.got > 0);
    list.sort((a, b) => b.score - a.score || b.got - a.got || a.r.m - b.r.m);
    // 同じ種類ばかりにならないよう、3品ずつ組む（1組に同じ種類は2品まで）
    const pool = list.slice(), out = [];
    while (pool.length) {
      const t = [], kinds = {};
      for (let i = 0; i < pool.length && t.length < 3; i++) {
        const k = pool[i].r.t;
        if ((kinds[k] || 0) >= 2 && pool.length - i > 3 - t.length) continue;
        kinds[k] = (kinds[k] || 0) + 1; t.push(pool.splice(i, 1)[0]); i--;
      }
      out.push(t);
    }
    return out;
  }

  function card(x) {
    const r = x.r, c = el("article", "card");
    const meta = el("div", "meta");
    meta.append(el("span", "tag", r.t), el("span", null, `約${r.m}分`), el("span", null, "2人分"));
    meta.append(el("span", "score", x.miss === 0 ? "買い足しなし" : `買い足し${x.miss}品`));
    c.append(meta, el("h3", null, r.n));
    const ul = el("ul", "ing");
    r.i.forEach(([id, amt]) => {
      const opt = OPT.test(amt), ok = has(id), nm = label(id);
      const li = el("li", ok ? "have" : opt ? "opt" : "need");
      li.append(el("span", "mk", ok ? "○" : opt ? "・" : "×"), el("span", "nm", nm), el("span", "amt", amt));
      li.setAttribute("aria-label", `${nm} ${amt}、${ok ? "家にある" : opt ? "なくてもよい" : "買い足す"}`);
      ul.append(li);
    });
    c.append(ul, el("p", "season", "調味料：" + r.s));
    const d = el("details"), sm = el("summary", null, "作り方"), ol = el("ol", "steps");
    r.st.forEach(s => ol.append(el("li", null, s)));
    d.append(sm, ol); c.append(d);
    return c;
  }

  function show() {
    const out = $("out"); out.textContent = "";
    if (!triples.length) {
      const e = el("div", "empty"); e.append(el("p", null, "合う料理がありませんでした。食材をもう少し選んでみてください。"));
      out.append(e); $("shop").hidden = true; $("more").hidden = true; return;
    }
    const t = triples[page % triples.length];
    t.forEach(x => out.append(card(x)));
    $("more").hidden = triples.length < 2;
    shopping(t);
  }

  function shopping(t) {
    const memo = $("memo"); memo.textContent = ""; memo.classList.remove("all-done"); $("copy-msg").textContent = "";
    const need = new Map();
    t.forEach(({ r }) => r.i.forEach(([id, a]) => {
      if (has(id) || OPT.test(a)) return;
      if (!need.has(id)) need.set(id, []);
      need.get(id).push(r.n);
    }));
    $("shop").hidden = false;
    if (!need.size) { const li = el("li"); li.append(el("span", "none", "買い足すものはありません。")); memo.append(li); return; }
    need.forEach((dishes, id) => {
      const li = el("li"), lab = el("label"), cb = el("input"); cb.type = "checkbox";
      cb.addEventListener("change", doneCheck);
      lab.append(cb, el("span", "nm", label(id)), el("span", "for", dishes.join("・")));
      li.append(lab); memo.append(li);
    });
  }

  // 買い物リストをすべてチェックしたら、ひとこと出す
  function doneCheck() {
    const all = [...$("memo").querySelectorAll("input")];
    const done = all.length && all.every(c => c.checked);
    $("copy-msg").textContent = done ? "買い物完了です。いただきます！" : "";
    $("memo").classList.toggle("all-done", !!done);
  }

  function run() {
    triples = rank(); page = 0; show();
    $("h-res").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  $("go").addEventListener("click", run);
  $("more").addEventListener("click", () => { page++; show(); });
  $("clear").addEventListener("click", () => { have.clear(); save(); syncChecks(); });
  $("sample").addEventListener("click", () => {
    ["tamanegi", "ninjin", "jagaimo", "buta", "tamago"].forEach(id => have.add(id)); save(); syncChecks(); run();
  });
  $("copy").addEventListener("click", async () => {
    const items = [...$("memo").querySelectorAll(".nm")].map(n => "・" + n.textContent);
    const text = items.length ? "買い物リスト\n" + items.join("\n") : "買い足すものはありません";
    try { await navigator.clipboard.writeText(text); $("copy-msg").textContent = "コピーしました"; }
    catch (e) { $("copy-msg").textContent = "コピーできませんでした。リストを長押しして選んでください。"; }
  });

  load(); syncChecks();
})();
