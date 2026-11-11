(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const NS = "http://www.w3.org/2000/svg";
  const sv = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const KEY = "noshi.v1";
  const tidy = FreeChips.tidy;
  const BYID = {}; OCCASIONS.forEach(o => { BYID[o.id] = o; });
  const BYNAME = {}; OCCASIONS.forEach(o => { BYNAME[o.name] = o; });
  const KINDS = {}; MZ_KINDS.forEach(k => { KINDS[k.id] = k; });

  // ---------- 保存 ----------
  function clean(d) {
    const o = { occ: "", omote: {}, names: [""], company: "", size: "a4" };
    if (!d || typeof d !== "object") return o;
    if (typeof d.occ === "string") o.occ = d.occ.slice(0, 40);
    if (d.omote && typeof d.omote === "object") for (const k in d.omote) { if (typeof d.omote[k] === "string" && tidy(d.omote[k])) o.omote[String(k).slice(0, 40)] = tidy(d.omote[k]).slice(0, 20); }
    if (Array.isArray(d.names)) { o.names = d.names.filter(n => typeof n === "string").slice(0, 3).map(n => n.slice(0, 12)); if (!o.names.length) o.names = [""]; }
    if (typeof d.company === "string") o.company = d.company.slice(0, 20);
    if (d.size === "a4" || d.size === "tan") o.size = d.size;
    if (typeof d.ck === "string" && KINDS[d.ck]) o.ck = d.ck;
    return o;
  }
  let st = clean(null);
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { /* 初期値 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できなくても使える */ } };
  const customOcc = FreeChips.store(KEY + ".custom", { valid: v => v && typeof v.n === "string" && tidy(v.n) && KINDS[v.k], same: (a, b) => a.n === b.n });
  const customOm = FreeChips.store(KEY + ".omote.custom");

  // いま選んでいる場面の情報（自分で入れた場面にも同じ形で答える）
  function current() {
    if (!st.occ) return null;
    if (st.occ.indexOf("c:") === 0) {
      const n = st.occ.slice(2);
      const c = customOcc.all().find(x => x.n === n);
      const k = KINDS[(c && c.k) || st.ck || "cho"] || KINDS.cho;
      const om = k.id === "kokubyaku" ? ["御霊前", "御供"] : k.id === "none" ? ["御花料", "御礼"] : ["御祝", "御礼"];
      return { id: st.occ, name: n, custom: true, mz: k.mz, omote: om, omoteNote: "場面に合う言葉がなければ、「＋ 自分で入力」で書けます。", when: "", who: "贈る人のフルネーム。", amounts: [], taboo: ["4（死）と9（苦）がつく金額や品数は避けるのが一般的です。"], ink: k.id === "kokubyaku" ? "お悔やみは薄墨、法要などは濃い墨" : "濃い墨" };
    }
    return BYID[st.occ] || null;
  }

  // ---------- 場面を選ぶ ----------
  function renderPick() {
    const groups = [];
    OCCASIONS.forEach(o => { let g = groups.find(x => x.name === o.group); if (!g) groups.push(g = { name: o.group, list: [] }); g.list.push(o); });
    $("occGroups").replaceChildren(...groups.map(g => {
      const box = el("div", "og");
      const h = el("h3", "og-h", g.name); h.id = "og-" + groups.indexOf(g);
      const list = el("div", "tiles"); list.setAttribute("role", "group"); list.setAttribute("aria-labelledby", h.id);
      g.list.forEach(o => {
        const b = el("button", "tile t-" + (o.mz.color || "none")); b.type = "button"; b.dataset.v = o.id;
        b.append(el("span", "tl-n", o.name), el("span", "tl-m", shortMz(o.mz)));
        b.setAttribute("aria-pressed", st.occ === o.id ? "true" : "false");
        b.addEventListener("click", () => pick(o.id));
        list.append(b);
      });
      box.append(h, list);
      return box;
    }));
    renderMine();
  }
  const COLORN = { kohaku: "紅白", kingin: "金銀", kokubyaku: "黒白", sougin: "双銀", kibyaku: "黄白" };
  const shortMz = mz => mz.kind === "none" ? "水引なし" : (COLORN[mz.color] || "") + "・" + (mz.kind === "cho" ? "蝶結び" : "結び切り");

  let pendingName = "";
  const occAdder = FreeChips.adder({ placeholder: "昇進祝い", aria: "場面を自分で入力", ok: "次へ", submit: v => {
    if (BYNAME[v]) { pick(BYNAME[v].id); return; }
    const ex = customOcc.all().find(x => x.n === v);
    if (ex) { pick("c:" + v); return; }
    pendingName = v; renderMine();
    $("mzPick").hidden = false; $("mzQ").textContent = "「" + v + "」に近いものを選んでください";
    const f = $("mzChips").querySelector("button"); if (f) f.focus();
  } });
  function renderMine() {
    $("mineChips").replaceChildren(...customOcc.all().map(c => {
      const w = el("span", "fc-item");
      const b = el("button", "chip", c.n); b.type = "button"; b.dataset.v = c.n;
      b.setAttribute("aria-pressed", st.occ === "c:" + c.n ? "true" : "false");
      b.addEventListener("click", () => pick("c:" + c.n));
      w.append(b, FreeChips.remover(c.n, () => {
        const pos = customOcc.remove(c);
        if (st.occ === "c:" + c.n) st.ck = c.k; // 表示中なら水引はそのまま残す
        renderMine(); render();
        toast("「" + c.n + "」を候補から外しました。", () => { customOcc.insert(c, pos); renderMine(); render(); });
      }));
      return w;
    }), occAdder.btn, occAdder.form);
    $("mzChips").replaceChildren(...MZ_KINDS.map(k => {
      const b = el("button", "chip", k.name); b.type = "button";
      b.addEventListener("click", () => {
        if (!pendingName) return;
        customOcc.add({ n: pendingName, k: k.id });
        const n = pendingName; pendingName = ""; $("mzPick").hidden = true;
        pick("c:" + n);
      });
      return b;
    }));
  }
  function pick(id) {
    st.occ = id; delete st.ck; save();
    pendingName = ""; $("mzPick").hidden = true;
    renderPick(); render();
    const r = $("result");
    if (r && matchMedia("(max-width: 899px)").matches) r.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  // ---------- 水引の絵 ----------
  const COL = {
    kohaku: ["#FFFFFF", "#C8102E"], kingin: ["#C4C6CC", "#C9A24B"], kokubyaku: ["#FFFFFF", "#1F1F1F"],
    sougin: ["#C4C6CC", "#AEB1B8"], kibyaku: ["#FFFFFF", "#D4B23A"]
  };
  function cord(d, color, w) {
    const g = sv("g", {});
    g.append(sv("path", { d, fill: "none", stroke: "#8E8A80", "stroke-width": w + 1.4, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: ".45" }));
    g.append(sv("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    g.append(sv("path", { d, fill: "none", stroke: "rgba(0,0,0,.18)", "stroke-width": .6, "stroke-dasharray": "0", transform: "translate(0,-1.4)" }));
    g.append(sv("path", { d, fill: "none", stroke: "rgba(0,0,0,.18)", "stroke-width": .6, transform: "translate(0,1.4)" }));
    return g;
  }
  function drawMz(svgEl, mz) {
    svgEl.replaceChildren();
    if (mz.kind === "none") return;
    const [L, R] = COL[mz.color] || COL.kohaku;
    const y = 45, w = 5;
    // 左右にのびる帯
    svgEl.append(cord("M0 " + y + "H90", L, w), cord("M110 " + y + "H200", R, w));
    if (mz.kind === "cho") {
      svgEl.append(cord("M96 44C82 22 60 26 64 38C67 47 84 46 96 44", L, w), cord("M104 44C118 22 140 26 136 38C133 47 116 46 104 44", R, w));
      svgEl.append(cord("M97 47C92 58 86 68 80 82", L, w), cord("M103 47C108 58 114 68 120 82", R, w));
      svgEl.append(sv("rect", { x: 92, y: 38, width: 16, height: 14, rx: 4, fill: R, stroke: "#8E8A80", "stroke-width": .8 }));
      svgEl.append(sv("rect", { x: 92, y: 38, width: 8, height: 14, rx: 3, fill: L }));
    } else if (mz.kind === "awaji") {
      svgEl.append(cord("M90 45C78 30 92 22 100 34C108 22 122 30 110 45C104 56 96 56 90 45", L, w));
    } else {
      // 結び切り：中央で固く結び、端は上に向けて切る
      svgEl.append(cord("M96 42C92 30 88 22 84 12", L, w), cord("M104 42C108 30 112 22 116 12", R, w));
      svgEl.append(sv("rect", { x: 88, y: 37, width: 24, height: 16, rx: 5, fill: R, stroke: "#8E8A80", "stroke-width": .8 }));
      svgEl.append(sv("rect", { x: 88, y: 37, width: 12, height: 16, rx: 4, fill: L }));
      svgEl.append(sv("path", { d: "M90 45H110", stroke: "rgba(0,0,0,.25)", "stroke-width": .8 }));
    }
  }

  // ---------- のし紙と案内 ----------
  function omoteOf(o) { return st.omote[o.id] || o.omote[0]; }
  function render() {
    const o = current();
    $("result").hidden = !o;
    if (!o) return;
    const om = omoteOf(o);
    // 表書きの選択肢
    const items = o.omote.map(t => ({ t })).concat(customOm.all().filter(t => o.omote.indexOf(t) < 0).map(t => ({ t, mine: true })));
    if (items.every(i => i.t !== om)) items.push({ t: om });
    $("omChips").replaceChildren(...items.map(it => {
      const b = el("button", "chip", it.t); b.type = "button"; b.dataset.v = it.t;
      b.setAttribute("aria-pressed", it.t === om ? "true" : "false");
      b.addEventListener("click", () => { st.omote[o.id] = it.t; save(); render(); });
      if (!it.mine) return b;
      const w = el("span", "fc-item");
      w.append(b, FreeChips.remover(it.t, () => {
        const pos = customOm.remove(it.t); render();
        toast("「" + it.t + "」を候補から外しました。", () => { customOm.insert(it.t, pos); render(); });
      }));
      return w;
    }), omAdder.btn, omAdder.form);

    // のし紙
    const paper = $("paper");
    paper.className = "paper k-" + o.mz.kind + " c-" + (o.mz.color || "none") + (o.mz.noshi ? "" : " no-noshi");
    drawMz($("mzSvg"), o.mz);
    $("noshiMark").style.display = o.mz.noshi ? "" : "none";
    $("pOmote").textContent = om;
    $("pOmote").className = "omote len" + Math.min(6, Array.from(om).length);
    const names = st.names.map(tidy).filter(Boolean);
    const box = $("pNames"); box.replaceChildren();
    if (st.company && names.length) box.append(el("p", "co", tidy(st.company)));
    if (names.length) names.forEach(n => box.append(el("p", "nm len" + Math.min(8, Array.from(n).length), n)));
    else box.append(el("p", "nm ph", "お名前"));
    box.className = "names n" + Math.max(1, names.length);
    $("paperHint").textContent = o.mz.kind === "none" ? "水引を使わない場面です。白無地の封筒に、表書きと名前だけを書きます。" : (o.mz.noshi ? "" : "のしを付けない場面なので、右上の「のし」は描いていません。");

    // 案内
    $("gTitle").textContent = o.name;
    $("gMz").textContent = o.mz.label;
    $("gMzWhy").textContent = o.mz.why;
    $("gOm").replaceChildren(...o.omote.map(t => { const li = el("li", t === om ? "on" : "", t); return li; }));
    $("gOmNote").textContent = o.omoteNote || "";
    $("gOmNote").hidden = !o.omoteNote;
    $("gWho").textContent = o.who;
    const rules = ["名前は表書きより少し小さく、水引の下の中央に書きます。", "連名は3人まで。目上の人から右に順に書きます（同じ立場なら五十音順）。", "4人以上なら代表者の名前の左に「外一同」と書くか、「営業部一同」のようにまとめ、全員の名前は別紙で添えます。", "会社名や肩書は、名前の右上に小さく書きます。", "墨は" + o.ink + "。"];
    $("gWhoRules").replaceChildren(...rules.map(t => el("li", "", t)));
    $("gWhen").textContent = o.when; $("gWhenBox").hidden = !o.when;
    $("gAmt").replaceChildren(...o.amounts.map(([r, a]) => { const tr = el("tr"); tr.append(el("th", "", r), el("td", "", a)); return tr; }));
    $("gAmtBox").hidden = !o.amounts.length;
    $("gTaboo").replaceChildren(...o.taboo.map(t => el("li", "", t)));
    $("gRegion").textContent = o.region ? "地域の違い：" + o.region : "";
    $("gRegion").hidden = !o.region;

    renderNameInputs();
    document.querySelectorAll("#sizeSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === st.size ? "true" : "false"));
    document.body.dataset.size = st.size;
  }
  const omAdder = FreeChips.adder({ placeholder: "御餞", aria: "表書きを自分で入力", ok: "決定", max: 10, submit: v => {
    const o = current(); if (!o) return;
    if (/[<>]/.test(v)) return "記号の「<」「>」は使えません。";
    if (o.omote.indexOf(v) < 0) customOm.add(v);
    st.omote[o.id] = v; save(); render();
  } });

  // 名前の入力欄
  function renderNameInputs() {
    const box = $("namesIn");
    if (box.children.length === st.names.length) { [...box.querySelectorAll("input")].forEach((inp, i) => { if (document.activeElement !== inp) inp.value = st.names[i]; }); return; }
    box.replaceChildren(...st.names.map((n, i) => {
      const row = el("div", "nrow");
      const inp = el("input"); inp.type = "text"; inp.maxLength = 12; inp.autocomplete = i === 0 ? "name" : "off"; inp.value = n;
      inp.placeholder = ["山田 太郎", "佐藤 花子", "鈴木 一郎"][i];
      inp.setAttribute("aria-label", st.names.length > 1 ? "名前" + (i + 1) + "人目（右から）" : "名前");
      inp.addEventListener("input", () => { st.names[i] = inp.value.slice(0, 12); $("nameErr").textContent = ""; save(); render(); });
      row.append(inp);
      if (i > 0) {
        const x = el("button", "nx", "×"); x.type = "button"; x.setAttribute("aria-label", (i + 1) + "人目の名前を消す");
        x.addEventListener("click", () => {
          const snap = st.names.slice();
          st.names.splice(i, 1); save(); $("namesIn").replaceChildren(); render();
          toast("名前の欄を消しました。", () => { st.names = snap; save(); $("namesIn").replaceChildren(); render(); });
        });
        row.append(x);
      }
      return row;
    }));
    $("addName").hidden = st.names.length >= 3;
  }
  $("addName").addEventListener("click", () => {
    if (st.names.length >= 3) { $("nameErr").textContent = "連名は3人までです。4人以上なら「〇〇一同」と書いてください。"; return; }
    st.names.push(""); save(); $("namesIn").replaceChildren(); render();
    const ins = $("namesIn").querySelectorAll("input"); ins[ins.length - 1].focus();
  });
  $("company").value = st.company;
  $("company").addEventListener("input", () => { st.company = $("company").value.slice(0, 20); save(); render(); });
  document.querySelectorAll("#sizeSeg button").forEach(b => b.addEventListener("click", () => { st.size = b.dataset.s; save(); render(); }));
  $("printBtn").addEventListener("click", () => { window.print(); });

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
    const blob = new Blob([JSON.stringify({ app: "noshi", version: 1, exportedAt: new Date().toISOString(), data: st, custom: { occasions: customOcc.all(), omote: customOm.all() } }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = "noshi.json";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let j = null;
    try { if (f.size > 1e6) throw 0; j = JSON.parse(await f.text()); if (!j || j.app !== "noshi" || !j.data || typeof j.data !== "object") j = null; } catch (e) { j = null; }
    if (!j) { $("moveMsg").textContent = "読み込めませんでした。のし・表書きガイドで書き出したファイルを選んでください。"; return; }
    st = clean(j.data); save();
    const c = j.custom || {};
    (Array.isArray(c.occasions) ? c.occasions : []).forEach(v => { if (v && typeof v.n === "string" && tidy(v.n) && KINDS[v.k]) customOcc.add({ n: tidy(v.n).slice(0, 20), k: v.k }); });
    (Array.isArray(c.omote) ? c.omote : []).forEach(v => { if (typeof v === "string" && tidy(v)) customOm.add(tidy(v).slice(0, 10)); });
    $("company").value = st.company; $("namesIn").replaceChildren();
    renderPick(); render();
    $("moveMsg").textContent = "読み込みました。";
  });

  renderPick(); render();
})();
