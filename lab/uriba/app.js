// 売り場順の買い物メモ — 品物を辞書で売り場に分け、お店ごとの売り場の順番で並べる。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-uriba-v1";
  const FC = window.FreeChips;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const tidy = s => String(s == null ? "" : s).replace(/[\s　]+/g, " ").trim();

  const SECS = window.URIBA_SECTIONS || [];
  const SEC_NAME = new Map(SECS);
  const DEFAULT_ORDER = SECS.map(s => s[0]);
  const secStore = FC.store(KEY + ".custom", { limit: 30 }); // 自分で入れた売り場の名前

  // ---------- 名前の読み取り ----------
  // ひらがな・カタカナ・全角半角・大文字小文字を区別しない
  const norm = s => String(s || "").normalize("NFKC").toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・]/g, "");
  // 末尾の数量（「2本」「x3」「300g」など）を外す
  const QTY = /[\s]*(?:[x×]\s*)?(\d+(?:\.\d+)?)\s*(個|本|袋|パック|枚|玉|束|缶|箱|株|尾|切れ|房|kg|g|グラム|l|ml|リットル|つ|セット|ケース|丁|合)?$/i;
  function splitQty(text) {
    const t = tidy(text).normalize("NFKC");
    const m = t.match(QTY);
    if (m && m.index > 0) return { name: t.slice(0, m.index).trim(), qty: m[0].trim() };
    return { name: t, qty: "" };
  }
  const DICT = new Map(); // 正規化した名前 → 売り場
  const SHORT_OK = new Set(["豚", "牛", "鶏", "肉", "魚", "米", "卵", "油", "塩", "水"].map(norm));
  Object.keys(window.URIBA_DICT || {}).forEach(sec => window.URIBA_DICT[sec].split(/\s+/).forEach(w => { const k = norm(w); if (k && !DICT.has(k)) DICT.set(k, sec); }));
  const PARTIAL = [...DICT.keys()].filter(k => k.length >= 2 || SHORT_OK.has(k)).sort((a, b) => b.length - a.length);

  // ---------- 保存 ----------
  function blank() {
    const id = uid();
    return { stores: [{ id, name: "いつものスーパー", order: DEFAULT_ORDER.slice() }], cur: id, items: [], staples: [], learn: {} };
  }
  function validSec(id) { return typeof id === "string" && (SEC_NAME.has(id) || (id.startsWith("c:") && id.length > 2 && id.length <= 24)); }
  function clean(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.stores)) return null;
    const o = { stores: [], cur: "", items: [], staples: [], learn: {} };
    d.stores.slice(0, 20).forEach(s => {
      if (!s || typeof s !== "object") return;
      const name = tidy(s.name).slice(0, 20); if (!name) return;
      const order = Array.isArray(s.order) ? s.order.filter(validSec) : [];
      o.stores.push({ id: typeof s.id === "string" && s.id ? s.id.slice(0, 40) : uid(), name, order: [...new Set(order)] });
    });
    if (!o.stores.length) return null;
    o.cur = o.stores.some(s => s.id === d.cur) ? d.cur : o.stores[0].id;
    if (Array.isArray(d.items)) d.items.slice(0, 500).forEach(it => {
      if (!it || typeof it !== "object") return;
      const name = tidy(it.name).slice(0, 40); if (!name) return;
      o.items.push({ id: typeof it.id === "string" && it.id ? it.id.slice(0, 40) : uid(), name, qty: tidy(it.qty).slice(0, 12), sec: validSec(it.sec) ? it.sec : "sonota", done: !!it.done, at: Number.isFinite(it.at) ? it.at : 0 });
    });
    if (Array.isArray(d.staples)) o.staples = [...new Set(d.staples.filter(x => typeof x === "string").map(x => tidy(x).slice(0, 40)).filter(Boolean))].slice(0, 100);
    if (d.learn && typeof d.learn === "object") Object.keys(d.learn).slice(0, 1000).forEach(k => { if (k.length <= 40 && validSec(d.learn[k])) o.learn[k] = d.learn[k]; });
    return o;
  }
  let st = blank();
  try { const v = clean(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 初めて */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("保存できませんでした。ブラウザの設定で保存を許可してください。"); } }
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); renderAll(); };

  const store = () => st.stores.find(s => s.id === st.cur) || st.stores[0];
  const secName = id => SEC_NAME.get(id) || (id.startsWith("c:") ? id.slice(2) : "その他");
  // そのお店の順番（入っていない売り場は「その他」の前に足す）
  function orderOf(s) {
    const mine = secStore.all().map(n => "c:" + n);
    const o = s.order.filter(id => !id.startsWith("c:") || mine.includes(id));
    const all = DEFAULT_ORDER.concat(secStore.all().map(n => "c:" + n));
    all.forEach(id => { if (!o.includes(id)) { const i = o.indexOf("sonota"); if (i >= 0 && id !== "sonota") o.splice(i, 0, id); else o.push(id); } });
    return o;
  }
  function guess(name) {
    const k = norm(name);
    if (!k) return "sonota";
    if (st.learn[k]) return st.learn[k];
    if (DICT.has(k)) return DICT.get(k);
    const hit = PARTIAL.find(w => k.includes(w));
    return hit ? DICT.get(hit) : "sonota";
  }

  // ---------- お店 ----------
  function renderStores() {
    const box = $("storeChips"); box.textContent = "";
    st.stores.forEach(s => {
      const b = el("button", "store", s.name); b.type = "button";
      b.setAttribute("aria-pressed", String(s.id === st.cur));
      b.addEventListener("click", () => { st.cur = s.id; save(); renderAll(); });
      if (st.stores.length > 1 && s.id === st.cur) {
        const w = el("span", "fc-item"); const x = el("button", "fc-x", "×"); x.type = "button";
        x.setAttribute("aria-label", `「${s.name}」を消す`);
        x.addEventListener("click", () => {
          const snap = snapshot();
          st.stores = st.stores.filter(t => t !== s); st.cur = st.stores[0].id; save(); renderAll();
          toast(`「${s.name}」を消しました。`, () => restore(snap));
        });
        w.append(b, x); box.append(w);
      } else box.append(b);
    });
    const ad = FC.adder({
      label: "＋ お店を追加", placeholder: "駅前のマルエツ", aria: "お店の名前", max: 20, ok: "追加", empty: "お店の名前を入れてください。",
      submit: v => {
        const hit = st.stores.find(s => s.name === v);
        if (hit) { st.cur = hit.id; save(); renderAll(); return null; }
        if (st.stores.length >= 20) return "お店は20まで登録できます。";
        const s = { id: uid(), name: v, order: orderOf(store()) };
        st.stores.push(s); st.cur = s.id; save(); renderAll();
        toast(`「${v}」を追加しました。売り場の順番は下で変えられます。`);
        return null;
      }
    });
    box.append(ad.btn, ad.form);
  }

  // ---------- 追加 ----------
  function addItems(lines, opt) {
    const added = [];
    const have = new Set(st.items.filter(i => !i.done).map(i => norm(i.name)));
    lines.forEach(line => {
      const { name, qty } = splitQty(line);
      if (!name) return;
      const k = norm(name);
      if (have.has(k) && !(opt && opt.dup)) {
        const ex = st.items.find(i => !i.done && norm(i.name) === k);
        if (ex && qty) ex.qty = qty;
        return;
      }
      have.add(k);
      const it = { id: uid(), name: name.slice(0, 40), qty: qty.slice(0, 12), sec: guess(name), done: false, at: Date.now() + added.length };
      st.items.push(it); added.push(it);
    });
    return added;
  }
  const inp = $("newItem");
  function submitAdd() {
    const raw = inp.value;
    const lines = raw.split(/\n|、|,/).map(tidy).filter(Boolean);
    if (!lines.length) { $("addErr").textContent = "買うものを入れてください。"; inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
    const snap = snapshot();
    const added = addItems(lines);
    inp.value = ""; updateHint(); save(); renderList();
    if (added.length === 1) flashItem(added[0].id);
    if (!added.length) toast("もうリストに入っています。");
    else if (added.length > 1) toast(`${added.length}品を追加しました。`, () => restore(snap));
    inp.focus();
  }
  $("addBtn").addEventListener("click", submitAdd);
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submitAdd(); } });
  inp.addEventListener("paste", e => {
    const t = (e.clipboardData || window.clipboardData).getData("text");
    if (t && /\n/.test(t.trim())) {
      e.preventDefault();
      const snap = snapshot();
      const added = addItems(t.split(/\n/).map(s => tidy(s.replace(/^[・\-*•□☐✓]\s*/, ""))).filter(Boolean));
      save(); renderList();
      toast(`${added.length}品を追加しました。`, () => restore(snap));
    }
  });
  function updateHint() {
    const v = tidy(inp.value);
    $("addErr").textContent = ""; inp.removeAttribute("aria-invalid");
    if (!v) { $("addHint").textContent = "まとめて貼り付けると、1行ずつ入ります。"; return; }
    const { name } = splitQty(v);
    const s = guess(name);
    $("addHint").textContent = s === "sonota" && !st.learn[norm(name)] ? `「${name}」→ その他（追加後に「⋯」で売り場を選べます）` : `「${name}」→ ${secName(s)}`;
  }
  inp.addEventListener("input", updateHint);

  // ---------- リスト ----------
  function renderList() {
    const list = $("list"); list.textContent = "";
    const items = st.items;
    const left = items.filter(i => !i.done).length;
    $("left").textContent = items.length ? (left ? `残り${left}品／${items.length}品` : `全て買いました（${items.length}品）`) : "";
    $("first").hidden = items.length > 0;
    $("listActs").hidden = !items.length;
    $("clearDone").hidden = !items.some(i => i.done);
    const order = orderOf(store());
    const groups = new Map();
    items.forEach(i => { if (!groups.has(i.sec)) groups.set(i.sec, []); groups.get(i.sec).push(i); });
    const secs = [...groups.keys()].sort((a, b) => (order.indexOf(a) < 0 ? 999 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 999 : order.indexOf(b)));
    secs.forEach(sec => {
      const its = groups.get(sec).slice().sort((a, b) => (a.done - b.done) || (a.at - b.at));
      const allDone = its.every(i => i.done);
      const box = el("section", "aisle" + (allDone ? " done" : ""));
      const h = el("h3", "aisle-h");
      const no = order.indexOf(sec);
      h.append(el("span", "aisle-no", String(no < 0 ? "?" : no + 1)), el("span", "aisle-name", secName(sec)), el("span", "aisle-n", allDone ? "済" : `${its.filter(i => !i.done).length}`));
      const ul = el("ul", "items");
      its.forEach(i => {
        const li = el("li", "item" + (i.done ? " is-done" : "")); li.dataset.id = i.id;
        const cb = el("button", "check"); cb.type = "button";
        cb.setAttribute("aria-pressed", String(i.done));
        cb.setAttribute("aria-label", `${i.name}${i.qty ? " " + i.qty : ""}${i.done ? "（買った）" : ""}`);
        const box2 = el("span", "box", i.done ? "✓" : ""); box2.setAttribute("aria-hidden", "true");
        const nm = el("span", "i-name", i.name);
        if (i.qty) nm.append(el("span", "i-qty", i.qty));
        if (st.staples.includes(i.name)) nm.append(el("span", "i-star", "いつもの"));
        cb.append(box2, nm);
        cb.addEventListener("click", () => {
          i.done = !i.done; save(); renderList();
          const nb = document.querySelector(`.item[data-id="${i.id}"] .check`); if (nb) nb.focus({ preventScroll: true });
          if (st.items.length && st.items.every(x => x.done)) toast("全て買いました。お疲れさまでした。");
        });
        const more = el("button", "more", "⋯"); more.type = "button";
        more.setAttribute("aria-label", `${i.name}の売り場を変える・消す`);
        more.addEventListener("click", () => openEdit(i));
        li.append(cb, more); ul.append(li);
      });
      box.append(h, ul); list.append(box);
    });
  }
  function flashItem(id) {
    const li = document.querySelector(`.item[data-id="${id}"]`);
    if (!li) return;
    li.classList.add("new");
    li.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  $("clearDone").addEventListener("click", () => {
    const n = st.items.filter(i => i.done).length; if (!n) return;
    const snap = snapshot(); st.items = st.items.filter(i => !i.done); save(); renderList();
    toast(`買ったもの${n}品を消しました。`, () => restore(snap));
  });
  $("clearAll").addEventListener("click", () => {
    const snap = snapshot(), n = st.items.length; st.items = []; save(); renderList();
    toast(`${n}品を消しました。`, () => restore(snap));
  });
  $("sampleBtn").addEventListener("click", () => {
    const snap = snapshot();
    addItems(["牛乳 1本", "キャベツ", "豚こま 300g", "食パン", "卵", "トイレットペーパー", "バナナ", "納豆 2パック", "冷凍うどん", "生鮭 2切れ", "醤油"]);
    save(); renderList();
    toast("例を追加しました。", () => restore(snap));
  });

  // ---------- いつもの ----------
  function renderStaples() {
    const ul = $("staples"); ul.textContent = "";
    $("stapleN").textContent = st.staples.length ? `（${st.staples.length}品）` : "";
    if (!st.staples.length) ul.append(el("li", "none", "まだありません。卵や牛乳など、よく買うものを登録します。"));
    st.staples.forEach(n => {
      const li = el("li", "staple");
      li.append(el("span", null, n), el("span", "s-sec", secName(guess(splitQty(n).name))));
      const x = el("button", "fc-x", "×"); x.type = "button"; x.setAttribute("aria-label", `「${n}」をいつものから外す`);
      x.addEventListener("click", () => {
        const i = st.staples.indexOf(n); st.staples.splice(i, 1); save(); renderStaples(); renderList();
        toast(`「${n}」をいつものから外しました。`, () => { st.staples.splice(i, 0, n); save(); renderStaples(); renderList(); });
      });
      li.append(x); ul.append(li);
    });
  }
  function addStaple() {
    const v = tidy($("newStaple").value).slice(0, 40);
    if (!v) { $("stapleErr").textContent = "よく買うものを入れてください。"; $("newStaple").setAttribute("aria-invalid", "true"); $("newStaple").focus(); return; }
    if (st.staples.includes(v)) { $("stapleErr").textContent = "もう登録しています。"; return; }
    st.staples.push(v); $("newStaple").value = ""; $("stapleErr").textContent = ""; save(); renderStaples(); renderList();
  }
  $("addStaple").addEventListener("click", addStaple);
  $("newStaple").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); addStaple(); } });
  $("newStaple").addEventListener("input", () => { $("stapleErr").textContent = ""; $("newStaple").removeAttribute("aria-invalid"); });
  $("stapleBtn").addEventListener("click", () => {
    if (!st.staples.length) { $("stapleBox").open = true; $("newStaple").focus(); toast("先に「いつもの」を登録してください。"); return; }
    const snap = snapshot();
    const added = addItems(st.staples);
    save(); renderList();
    toast(added.length ? `いつものを${added.length}品入れました。` : "いつものは、もう全部入っています。", added.length ? () => restore(snap) : null);
  });

  // ---------- 売り場の順番 ----------
  function renderOrder() {
    const s = store();
    $("orderStore").textContent = `（${s.name}）`;
    const ol = $("order"); ol.textContent = "";
    const o = orderOf(s);
    o.forEach((id, idx) => {
      const li = el("li", "o-row");
      li.append(el("span", "o-no", String(idx + 1)), el("span", "o-name", secName(id)));
      const up = el("button", "o-b", "↑"); up.type = "button"; up.disabled = idx === 0; up.setAttribute("aria-label", `${secName(id)}を前へ`);
      const dn = el("button", "o-b", "↓"); dn.type = "button"; dn.disabled = idx === o.length - 1; dn.setAttribute("aria-label", `${secName(id)}を後ろへ`);
      const mv = d => { const a = orderOf(store()); const j = idx + d; [a[idx], a[j]] = [a[j], a[idx]]; store().order = a; save(); renderOrder(); renderList(); const b = $("order").children[j].querySelectorAll(".o-b")[d < 0 ? 0 : 1]; (b.disabled ? $("order").children[j].querySelector(".o-b:not([disabled])") : b).focus(); };
      up.addEventListener("click", () => mv(-1)); dn.addEventListener("click", () => mv(1));
      li.append(up, dn);
      if (id.startsWith("c:")) {
        const n = id.slice(2);
        li.append(FC.remover(n, () => {
          const i = secStore.remove(n); renderOrder(); renderList();
          toast(`「${n}」を候補から外しました。`, () => { secStore.insert(n, i); renderOrder(); renderList(); });
        }, "o-b"));
      }
      ol.append(li);
    });
    const box = $("ownSec"); box.textContent = "";
    const ad = sectionAdder(id => { renderOrder(); renderList(); toast(`「${secName(id)}」を売り場に追加しました。`); });
    box.append(ad.btn, ad.form);
  }
  // 売り場の「自分で入力」。同じ名前の売り場があれば、それを使う。
  function sectionAdder(onDone, label) {
    const ad = FC.adder({
      label: label || "＋ 売り場を自分で入力", placeholder: "お米・もち", aria: "売り場の名前", max: 20, empty: "売り場の名前を入れてください。",
      submit: v => {
        const built = SECS.find(s => s[1] === v || norm(s[1]) === norm(v));
        if (built) { onDone(built[0]); return null; }
        secStore.add(v);
        onDone("c:" + v); return null;
      }
    });
    return ad;
  }
  $("resetOrder").addEventListener("click", () => {
    const snap = snapshot(); store().order = DEFAULT_ORDER.slice(); save(); renderOrder(); renderList();
    toast("最初の順番に戻しました。", () => restore(snap));
  });

  // ---------- 品物の編集 ----------
  let editing = null, eSec = null, lastFocus = null;
  function renderSecChips() {
    const box = $("eSecs"); box.textContent = "";
    const ids = orderOf(store());
    if (eSec && !ids.includes(eSec)) ids.push(eSec); // 外した売り場でも、この品物の値は見せる
    ids.forEach(id => {
      const b = el("button", null, secName(id)); b.type = "button"; b.dataset.v = id;
      b.setAttribute("aria-pressed", String(id === eSec));
      b.addEventListener("click", () => { eSec = id; renderSecChips(); });
      box.append(b);
    });
    const ad = sectionAdder(id => { eSec = id; renderSecChips(); }, "＋ 自分で入力");
    box.append(ad.btn, ad.form);
  }
  function openEdit(i) {
    lastFocus = document.activeElement; editing = i; eSec = i.sec;
    $("eName").value = i.name + (i.qty ? " " + i.qty : "");
    $("eErr").textContent = ""; $("eName").removeAttribute("aria-invalid");
    $("eStaple").checked = st.staples.includes(i.name);
    renderSecChips();
    $("sheetBg").hidden = false; $("eName").focus();
  }
  function closeEdit() { $("sheetBg").hidden = true; editing = null; if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus(); }
  $("eCancel").addEventListener("click", closeEdit);
  $("sheetBg").addEventListener("click", e => { if (e.target === $("sheetBg")) closeEdit(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheetBg").hidden && !e.defaultPrevented) closeEdit(); });
  $("eName").addEventListener("input", () => { $("eErr").textContent = ""; $("eName").removeAttribute("aria-invalid"); });
  $("eSave").addEventListener("click", () => {
    if (!editing) return;
    const { name, qty } = splitQty($("eName").value);
    if (!name) { $("eErr").textContent = "名前を入れてください。"; $("eName").setAttribute("aria-invalid", "true"); $("eName").focus(); return; }
    const oldName = editing.name;
    editing.name = name.slice(0, 40); editing.qty = qty.slice(0, 12);
    const auto = guess(name);
    if (eSec !== editing.sec || eSec !== auto) { st.learn[norm(name)] = eSec; }
    editing.sec = eSec;
    const si = st.staples.indexOf(oldName);
    if ($("eStaple").checked) { if (si >= 0) st.staples[si] = editing.name; else if (!st.staples.includes(editing.name)) st.staples.push(editing.name); }
    else if (si >= 0) st.staples.splice(si, 1);
    // 同じ名前の、まだ買っていない品物も同じ売り場へ
    st.items.forEach(x => { if (norm(x.name) === norm(name)) x.sec = eSec; });
    save(); closeEdit(); renderList(); renderStaples();
    toast(`「${name}」は${secName(eSec)}に入ります。`);
  });
  $("eDel").addEventListener("click", () => {
    if (!editing) return;
    const snap = snapshot(), n = editing.name;
    st.items = st.items.filter(x => x !== editing); save(); closeEdit(); renderList();
    toast(`「${n}」を消しました。`, () => restore(snap));
  });

  // ---------- 共有 ----------
  function listText() {
    const order = orderOf(store());
    const its = st.items.filter(i => !i.done);
    const pos = s => (order.indexOf(s) < 0 ? 999 : order.indexOf(s));
    const secs = [...new Set(its.map(i => i.sec))].sort((a, b) => pos(a) - pos(b));
    const lines = [`買い物メモ（${store().name}）`];
    secs.forEach(s => { lines.push(`【${secName(s)}】`); its.filter(i => i.sec === s).sort((a, b) => a.at - b.at).forEach(i => lines.push(`・${i.name}${i.qty ? " " + i.qty : ""}`)); });
    return lines.join("\n");
  }
  $("shareBtn").addEventListener("click", async () => {
    if (!st.items.some(i => !i.done)) { toast("共有する品物がありません。"); return; }
    const text = listText();
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(text); toast("リストをコピーしました。LINE やメールに貼り付けられます。"); }
    catch (e) { toast("共有もコピーもできませんでした。別のブラウザで試してください。"); }
  });

  // ---------- トースト ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const pad = n => String(n).padStart(2, "0");
  $("expBtn").addEventListener("click", () => {
    const d = new Date();
    const out = { app: "uriba", version: 1, exportedAt: d.toISOString(), data: st, sections: secStore.all() };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `uriba-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, secs = [];
    try {
      if (f.size > 3e6) throw 0;
      const j = JSON.parse(await f.text());
      if (j && j.app === "uriba") { data = clean(j.data); if (Array.isArray(j.sections)) secs = j.sections.filter(x => typeof x === "string").map(x => tidy(x).slice(0, 20)).filter(Boolean); }
    } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if ((st.items.length || st.stores.length > 1) && !confirm("今のリストとお店の設定を、ファイルの内容と置き換えますか？")) return;
    const snap = snapshot();
    secs.forEach(n => secStore.add(n));
    st = data; save(); renderAll();
    $("moveMsg").textContent = `読み込みました（お店${st.stores.length}、品物${st.items.length}）。`;
    toast("読み込みました。", () => restore(snap));
  });

  function renderAll() { renderStores(); renderList(); renderOrder(); renderStaples(); updateHint(); }
  window.__uriba = { guess, norm, splitQty, listText, get st() { return st; } };
  renderAll();
})();
