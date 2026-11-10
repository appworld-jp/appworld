// どっちが安い？ — 値段と量から単価を出して、いちばん安い商品を示す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const KEY = "lab-tanka-v1";
  const LETTERS = "ABCDEF";
  const MAX = 6, MIN = 2;

  const UNITS = { g: ["g", 1], kg: ["g", 1000], ml: ["ml", 1], L: ["ml", 1000], m: ["m", 1], "個": ["個", 1], "枚": ["枚", 1], "ロール": ["ロール", 1], "回分": ["回分", 1] };
  const UNIT_LIST = Object.keys(UNITS);
  const BASES = {
    g: [["100g", 100], ["1kg", 1000], ["1g", 1]],
    ml: [["1L", 1000], ["100ml", 100]],
    m: [["1m", 1], ["10m", 10]]
  };
  const basesOf = fam => BASES[fam] || [["1" + fam, 1]];
  const FAM_WORD = { g: "重さ（g・kg）", ml: "量（ml・L）", m: "長さ（m）" };

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
  const blank = () => ({ id: uid(), name: "", price: "", tax: "in", qty: "", unit: "g", count: "", off: "" });
  function cleanItem(it) {
    if (!it || typeof it !== "object") return null;
    return { id: str(it.id, 20) || uid(), name: str(it.name, 30), price: str(it.price, 12), tax: it.tax === "out" ? "out" : "in",
      qty: str(it.qty, 10), unit: UNIT_LIST.includes(it.unit) ? it.unit : "g", count: str(it.count, 6), off: str(it.off, 5) };
  }
  function cleanMemo(m) {
    if (!m || typeof m !== "object" || !str(m.name, 30).trim()) return null;
    if (typeof m.unitPrice !== "number" || !isFinite(m.unitPrice) || m.unitPrice <= 0) return null;
    const fam = typeof m.fam === "string" && (BASES[m.fam] || ["個", "枚", "ロール", "回分"].includes(m.fam)) ? m.fam : null;
    if (!fam) return null;
    return { id: str(m.id, 20) || uid(), name: str(m.name, 30).trim(), unitPrice: m.unitPrice, fam, date: /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : "" };
  }
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    let items = Array.isArray(raw.items) ? raw.items.slice(0, MAX).map(cleanItem).filter(Boolean) : [];
    while (items.length < MIN) items.push(blank());
    const base = {};
    if (raw.base && typeof raw.base === "object") for (const f in raw.base) if (typeof raw.base[f] === "number" && basesOf(f).some(b => b[1] === raw.base[f])) base[f] = raw.base[f];
    return { v: 1, rate: raw.rate === 10 ? 10 : 8, base, items, memos: Array.isArray(raw.memos) ? raw.memos.slice(0, 300).map(cleanMemo).filter(Boolean) : [] };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = clean({});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // ---------- 数字 ----------
  // 全角数字、カンマ、「円」などを受け付ける。空は null、読めないときは NaN。
  function num(s) {
    const t = String(s || "").normalize("NFKC").replace(/[,，、円¥￥\s%％]/g, "").replace(/。/g, ".");
    if (!t) return null;
    return /^\d*\.?\d+$|^\d+\.$/.test(t) ? parseFloat(t) : NaN;
  }
  const fmt = n => n >= 100 ? Math.round(n).toLocaleString("ja-JP") : n >= 10 ? n.toFixed(1) : n.toFixed(2);
  const baseFor = fam => { const list = basesOf(fam); const v = st.base[fam]; return list.find(b => b[1] === v) || list[0]; };
  const label = (it, i) => it.name.trim() || LETTERS[i];
  const normName = s => s.normalize("NFKC").toLowerCase().replace(/\s/g, "");

  function calc(it) {
    const p = num(it.price), q = num(it.qty), c = num(it.count), o = num(it.off);
    const err = {};
    if (Number.isNaN(p)) err.price = "数字で入れてください。例：298";
    else if (p === 0) err.price = "0より大きい値段を入れてください。";
    if (Number.isNaN(q)) err.qty = "数字で入れてください。例：500";
    else if (q === 0) err.qty = "0より大きい量を入れてください。";
    if (Number.isNaN(c) || c === 0 || (c != null && c % 1)) err.count = "1以上の整数で入れてください。";
    if (Number.isNaN(o) || (o != null && o >= 100)) err.off = "0〜99の数字で入れてください。";
    if (Object.keys(err).length || p == null || q == null) return { err, ok: false };
    const [fam, f] = UNITS[it.unit];
    const amount = q * f * (c || 1);
    const pay = p * (it.tax === "out" ? 1 + st.rate / 100 : 1) * (1 - (o || 0) / 100);
    return { err, ok: true, fam, amount, pay, unitPrice: pay / amount };
  }

  // ---------- カード ----------
  const refs = new Map();
  function field(labelText, input, suffix, cls) {
    const w = el("label", "f" + (cls ? " " + cls : ""));
    w.append(el("span", "fl", labelText));
    const box = el("span", "fbox"); box.append(input); if (suffix) box.append(el("span", "fs", suffix));
    w.append(box);
    return w;
  }
  function inp(val, ph, mode, max) {
    const i = el("input"); i.type = "text"; i.inputMode = mode || "decimal"; i.autocomplete = "off"; i.placeholder = ph; i.value = val; i.maxLength = max || 10; i.spellcheck = false;
    return i;
  }
  function renderCards() {
    const box = $("cards"); box.replaceChildren(); refs.clear();
    st.items.forEach((it, i) => {
      const c = el("article", "card"); c.dataset.id = it.id;
      const head = el("div", "c-head");
      const badge = el("span", "letter", LETTERS[i]); badge.setAttribute("aria-hidden", "true");
      const name = inp(it.name, ["コーヒー 大袋", "コーヒー 小袋", "詰めかえ用", "まとめ買い", "お徳用", "ほかの店"][i], "text", 30);
      name.className = "name"; name.setAttribute("aria-label", `${LETTERS[i]}の商品名（なくてもかまいません）`);
      head.append(badge, name);
      if (st.items.length > MIN) {
        const rm = el("button", "rm", "×"); rm.type = "button"; rm.setAttribute("aria-label", `${label(it, i)}を外す`);
        rm.addEventListener("click", () => {
          const idx = st.items.indexOf(it); st.items.splice(idx, 1); save(); renderCards();
          toast(`${label(it, idx)}を外しました。`, () => { st.items.splice(idx, 0, it); save(); renderCards(); });
        });
        head.append(rm);
      }
      const price = inp(it.price, ["398", "158", "980", "1280", "498", "348"][i], "decimal", 12);
      const tax = el("button", "tax", it.tax === "out" ? "税抜" : "税込"); tax.type = "button";
      tax.setAttribute("aria-pressed", String(it.tax === "out"));
      tax.setAttribute("aria-label", "値札が税抜きなら押して切りかえ");
      const priceRow = el("div", "row1");
      const pf = field("値段", price, "円", "price"); priceRow.append(pf, tax);
      const qty = inp(it.qty, ["500", "200", "400", "1", "300", "250"][i]);
      const unit = el("select", "unit"); unit.setAttribute("aria-label", "単位");
      UNIT_LIST.forEach(u => { const o = el("option", null, u); o.value = u; if (u === it.unit) o.selected = true; unit.append(o); });
      const count = inp(it.count, "1", "numeric", 6);
      const off = inp(it.off, "0", "decimal", 5);
      const row2 = el("div", "row2");
      const qf = field("量", qty, null, "qty"); qf.querySelector(".fbox").append(unit);
      row2.append(qf, field("入り数", count, null, "cnt"), field("割引・ポイント", off, "%", "off"));
      const err = el("p", "c-err"); err.setAttribute("role", "alert");
      const res = el("div", "c-res");
      const memoLine = el("p", "c-memo");
      c.append(head, priceRow, row2, err, res, memoLine);
      box.append(c);
      refs.set(it.id, { c, res, err, memoLine, price, qty, count, off, tax, name });
      const bind = (node, key) => {
        node.addEventListener("input", () => { it[key] = node.value; save(); update(); });
        // 全角の数字は、入力が終わったら半角にそろえる
        if (key !== "name") node.addEventListener("blur", () => { const v = node.value.normalize("NFKC").replace(/[,\s円¥%]/g, ""); if (v !== node.value && /^[\d.]*$/.test(v)) { node.value = v; it[key] = v; save(); } });
      };
      bind(name, "name"); bind(price, "price"); bind(qty, "qty"); bind(count, "count"); bind(off, "off");
      unit.addEventListener("change", () => { it.unit = unit.value; save(); update(); });
      tax.addEventListener("click", () => { it.tax = it.tax === "out" ? "in" : "out"; tax.textContent = it.tax === "out" ? "税抜" : "税込"; tax.setAttribute("aria-pressed", String(it.tax === "out")); save(); update(); });
    });
    $("addBtn").hidden = st.items.length >= MAX;
    update();
  }

  // ---------- 計算と表示 ----------
  let winner = null;
  function update() {
    const rs = st.items.map(calc);
    // いちばん多い単位の種類で比べる（同数なら先に入れたほう）
    const cnt = {}; rs.forEach(r => { if (r.ok) cnt[r.fam] = (cnt[r.fam] || 0) + 1; });
    let fam = null; rs.forEach(r => { if (r.ok && (!fam || cnt[r.fam] > cnt[fam])) fam = r.fam; });
    const base = fam ? baseFor(fam) : null;
    const valid = rs.filter(r => r.ok && r.fam === fam);
    const min = valid.length ? Math.min(...valid.map(r => r.unitPrice)) : null;
    const max = valid.length ? Math.max(...valid.map(r => r.unitPrice)) : null;
    winner = null;
    st.items.forEach((it, i) => {
      const r = rs[i], ref = refs.get(it.id); if (!ref) return;
      ref.c.classList.remove("win", "lose", "off");
      ref.err.textContent = Object.values(r.err)[0] || "";
      [["price", ref.price], ["qty", ref.qty], ["count", ref.count], ["off", ref.off]].forEach(([k, n]) => n.setAttribute("aria-invalid", String(!!r.err[k])));
      ref.res.replaceChildren(); ref.memoLine.textContent = "";
      if (!r.ok) {
        if (!Object.keys(r.err).length) ref.res.append(el("span", "r-wait", "値段と量を入れてください"));
        ref.c.classList.add("off");
        return;
      }
      if (r.fam !== fam) {
        ref.err.textContent = `単位の種類がほかとちがうので比べられません。${FAM_WORD[fam] || fam}でそろえてください。`;
        ref.c.classList.add("off");
        return;
      }
      const per = r.unitPrice * base[1];
      const line = el("p", "r-per"); line.append(el("span", "r-base", base[0] + "あたり"), el("b", null, fmt(per)), el("span", "r-yen", "円"));
      ref.res.append(line);
      const pay = el("p", "r-pay", `${num(it.off) ? "実質" : "支払い"} ${Math.round(r.pay).toLocaleString("ja-JP")}円` + (it.tax === "out" ? `（税${st.rate}%込み）` : ""));
      ref.res.append(pay);
      if (valid.length >= 2) {
        if (Math.abs(r.unitPrice - min) < 1e-9 && max - min > 1e-9) { ref.c.classList.add("win"); if (!winner) winner = { it, i, r }; }
        else if (r.unitPrice - min > 1e-9) {
          ref.c.classList.add("lose");
          ref.res.append(el("p", "r-diff", `${Math.round((r.unitPrice / min - 1) * 1000) / 10}%高い`));
        }
      }
      // 底値メモと比べる
      const m = findMemo(it.name, r.fam);
      if (m) {
        const d = r.unitPrice / m.unitPrice - 1;
        ref.memoLine.textContent = `底値メモ：${base[0]}あたり${fmt(m.unitPrice * base[1])}円` + (Math.abs(d) < 0.005 ? "（同じ）" : d > 0 ? `（いまは${Math.round(d * 100)}%高い）` : "（いまのほうが安い！）");
      }
    });
    $("baseBtn").textContent = base ? base[0] + "あたり" : "100gあたり";
    $("baseBtn").disabled = !base || basesOf(fam).length < 2;
    $("baseBtn").dataset.fam = fam || "";
    renderBar(valid, min, max, base);
  }
  function renderBar(valid, min, max, base) {
    const t = $("barTxt"); t.replaceChildren();
    $("bar").classList.toggle("has", !!winner);
    $("memoBtn").hidden = !winner;
    if (valid.length < 2) { t.append(el("p", "bar-sub", "値段と量を2つ以上入れると、ここに答えが出ます。")); return; }
    if (!winner) { t.append(el("p", "bar-main", "どれも同じ値段です"), el("p", "bar-sub", `${base[0]}あたり${fmt(min * base[1])}円`)); return; }
    const second = Math.min(...valid.filter(r => r.unitPrice - min > 1e-9).map(r => r.unitPrice));
    const main = el("p", "bar-main"); main.append(el("b", null, label(winner.it, winner.i)), document.createTextNode("がいちばん安い"));
    t.append(main, el("p", "bar-sub", `${base[0]}あたり${fmt(min * base[1])}円。次に安いものより${Math.round((1 - min / second) * 1000) / 10}%お得です。`));
  }
  $("baseBtn").addEventListener("click", () => {
    const fam = $("baseBtn").dataset.fam; if (!fam) return;
    const list = basesOf(fam); const cur = baseFor(fam);
    st.base[fam] = list[(list.indexOf(cur) + 1) % list.length][1]; save(); update();
  });
  function setRate(r) { st.rate = r; $("r8").setAttribute("aria-pressed", String(r === 8)); $("r10").setAttribute("aria-pressed", String(r === 10)); save(); update(); }
  $("r8").addEventListener("click", () => setRate(8));
  $("r10").addEventListener("click", () => setRate(10));
  $("addBtn").addEventListener("click", () => {
    if (st.items.length >= MAX) return;
    const prev = st.items[st.items.length - 1];
    const n = blank(); n.unit = prev ? prev.unit : "g"; n.tax = prev ? prev.tax : "in";
    st.items.push(n); save(); renderCards();
    const r = refs.get(n.id); if (r) r.price.focus();
  });
  $("clearBtn").addEventListener("click", () => {
    const prev = JSON.stringify(st.items);
    if (st.items.every(it => !it.name && !it.price && !it.qty && !it.count && !it.off)) return;
    st.items = [blank(), blank()]; save(); renderCards();
    toast("入れた値段を消しました。", () => { st.items = JSON.parse(prev); save(); renderCards(); });
    window.scrollTo({ top: 0 });
  });

  // ---------- 底値メモ ----------
  function findMemo(name, fam) {
    const n = normName(name || ""); if (!n) return null;
    return st.memos.find(m => m.fam === fam && (normName(m.name) === n || (normName(m.name).length >= 2 && n.includes(normName(m.name))))) || null;
  }
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  $("memoBtn").addEventListener("click", () => {
    if (!winner) return;
    const { it, r } = winner;
    const name = it.name.trim();
    if (!name) {
      const ref = refs.get(it.id);
      ref.err.textContent = "商品名を入れると、底値メモに残せます。例：トイレットペーパー";
      ref.name.focus(); return;
    }
    const old = st.memos.find(m => normName(m.name) === normName(name) && m.fam === r.fam);
    const base = baseFor(r.fam);
    if (old && old.unitPrice <= r.unitPrice) { toast(`メモの底値（${base[0]}あたり${fmt(old.unitPrice * base[1])}円）のほうが安いので、そのままにしました。`); return; }
    const prev = JSON.stringify(st.memos);
    if (old) { old.unitPrice = r.unitPrice; old.date = today(); st.memos.splice(st.memos.indexOf(old), 1); st.memos.unshift(old); }
    else st.memos.unshift({ id: uid(), name, unitPrice: r.unitPrice, fam: r.fam, date: today() });
    save(); renderMemos(); update();
    toast(old ? `「${name}」の底値を更新しました。` : `「${name}」を底値メモに残しました。`, () => { st.memos = JSON.parse(prev); save(); renderMemos(); update(); });
  });
  function renderMemos() {
    const ul = $("memoList"); ul.replaceChildren();
    $("memoHint").hidden = st.memos.length > 0;
    st.memos.forEach(m => {
      const b = baseFor(m.fam);
      const li = el("li", "mi");
      const t = el("div", "mi-t"); t.append(el("b", null, m.name), el("span", null, m.date ? m.date.slice(5).replace("-", "/") : ""));
      const p = el("p", "mi-p"); p.append(el("span", null, b[0] + "あたり"), el("b", null, fmt(m.unitPrice * b[1])), el("span", null, "円"));
      const del = el("button", "mi-del", "削除"); del.type = "button"; del.setAttribute("aria-label", `${m.name}のメモを削除`);
      del.addEventListener("click", () => {
        const idx = st.memos.indexOf(m); st.memos.splice(idx, 1); save(); renderMemos(); update();
        toast(`「${m.name}」のメモを削除しました。`, () => { st.memos.splice(idx, 0, m); save(); renderMemos(); update(); });
      });
      li.append(t, p, del); ul.append(li);
    });
  }

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
    const blob = new Blob([JSON.stringify({ app: "tanka", version: 1, exportedAt: new Date().toISOString(), data: { memos: st.memos, base: st.base, rate: st.rate } }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `tanka-${today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 2e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "tanka" && j.data && Array.isArray(j.data.memos)) data = clean(Object.assign({}, j.data, { items: st.items })); } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.memos.length && !confirm(`いまの底値メモを、ファイルの${data.memos.length}件と置きかえますか？`)) return;
    const prev = JSON.stringify(st);
    st = data; save(); setRate(st.rate); renderMemos(); update();
    $("moveMsg").textContent = `底値メモ${data.memos.length}件を読み込みました。`;
    toast("読み込みました。", () => { st = JSON.parse(prev); save(); setRate(st.rate); renderMemos(); update(); });
  });

  setRate(st.rate);
  renderCards(); renderMemos();
})();
