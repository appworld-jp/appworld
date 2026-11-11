// 文字数ものさし — 文章を数え、書く場所ごとの上限に対して、あと何字入るかを出す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-mojisu-v1";
  const FC = window.FreeChips;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = n => n.toLocaleString("ja-JP");

  // 書く場所（2026年11月時点の目安）。kind: g=見た目の文字数, x=X の数え方, range=目安の幅
  const PLACES = [
    { id: "x", name: "X（旧Twitter）", max: 280, kind: "x", note: "全角140字" },
    { id: "threads", name: "Threads", max: 500, kind: "g" },
    { id: "bsky", name: "Bluesky", max: 300, kind: "g" },
    { id: "insta", name: "Instagram のキャプション", max: 2200, kind: "g" },
    { id: "ytt", name: "YouTube のタイトル", max: 100, kind: "g" },
    { id: "ytd", name: "YouTube の説明", max: 5000, kind: "g" },
    { id: "merT", name: "メルカリの商品名", max: 40, kind: "g" },
    { id: "merD", name: "メルカリの商品の説明", max: 1000, kind: "g" },
    { id: "resume", name: "履歴書の志望動機", min: 200, max: 300, kind: "range", note: "目安" },
    { id: "es", name: "エントリーシート（400字の設問）", min: 360, max: 400, kind: "range", note: "8割以上が目安" },
    { id: "genko", name: "原稿用紙1枚", max: 400, kind: "genko" }
  ];
  const DEFAULT_ON = ["x", "insta", "ytt", "merD", "resume", "genko"];

  // ---------- 保存 ----------
  const custom = FC.store(KEY + ".custom", {
    limit: 20,
    valid: v => v && typeof v.name === "string" && v.name.trim() && Number.isInteger(v.max) && v.max > 0 && v.max <= 100000,
    same: (a, b) => a.name === b.name
  });
  let st = { on: DEFAULT_ON.slice(), keep: false, text: "" };
  function cleanSt(d) {
    if (!d || typeof d !== "object") return null;
    const o = { on: DEFAULT_ON.slice(), keep: !!d.keep, text: "" };
    if (Array.isArray(d.on)) o.on = d.on.filter(x => typeof x === "string").slice(0, 60);
    if (o.keep && typeof d.text === "string") o.text = d.text.slice(0, 200000);
    return o;
  }
  try { const v = cleanSt(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 初めて */ }
  function save() {
    const out = { on: st.on, keep: st.keep, text: st.keep ? st.text : "" };
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* 保存できなくても数えられる */ }
  }

  // ---------- 数える ----------
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null;
  const graphemes = s => seg ? Array.from(seg.segment(s), x => x.segment) : Array.from(s);
  const isSpace = g => /^[\s　]+$/u.test(g);
  const isEmoji = g => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g);

  // X（twitter-text の重み）：この範囲は1、それ以外は2。URL は23。
  function xWeight(text) {
    let w = 0;
    const t = text.normalize("NFC").replace(/https?:\/\/[^\s　]+/g, () => { w += 23; return ""; });
    for (const g of graphemes(t)) {
      if (isEmoji(g)) { w += 2; continue; }
      for (const ch of g) {
        const c = ch.codePointAt(0);
        w += (c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247)) ? 1 : 2;
      }
    }
    return w;
  }

  // 原稿用紙（20字×20行）。行頭に来る句読点・閉じかっこは前の行にぶら下げる。半角英数字は2字で1ます。
  const HANG = new Set(["、", "。", "，", "．", "」", "』", "）", "】", "〕", "〉", "》", "”", "’"]);
  function genkoRows(text) {
    if (!text) return 0;
    let rows = 0;
    for (const line of text.split("\n")) {
      rows++;
      let col = 0;
      for (const g of graphemes(line)) {
        const w = /^[\x21-\x7e]$/.test(g) ? 0.5 : 1;
        if (col + w > 20) {
          if (HANG.has(g) && col <= 20) { col = 20.0001; continue; }
          rows++; col = 0;
        }
        col += w;
      }
    }
    return rows;
  }

  function count(text) {
    const gs = graphemes(text.replace(/\r\n?/g, "\n"));
    const all = gs.length;
    const noSp = gs.filter(g => !isSpace(g)).length;
    const lines = text ? text.split("\n").length : 0;
    const blank = text ? text.split("\n").filter(l => !l.trim()).length : 0;
    const bytes = new TextEncoder().encode(text).length;
    return { all, noSp, lines, blank, bytes, x: xWeight(text), rows: genkoRows(text.replace(/\r\n?/g, "\n")) };
  }

  function readTime(n) {
    if (!n) return "—";
    const lo = n / 600, hi = n / 500; // 分
    if (hi < 1) {
      const a = Math.max(1, Math.round(lo * 60 / 5) * 5), b = Math.max(a, Math.round(hi * 60 / 5) * 5);
      return a === b ? `約${a}秒` : `約${a}〜${b}秒`;
    }
    const a = Math.max(1, Math.round(lo)), b = Math.max(a, Math.round(hi));
    return a === b ? `約${a}分` : `約${a}〜${b}分`;
  }

  // ---------- 表示 ----------
  const allPlaces = () => PLACES.concat(custom.all().map(c => ({ id: "c:" + c.name, name: c.name, max: c.max, kind: "g", custom: true })));
  let last = null;
  function render() {
    const text = $("text").value;
    const c = count(text); last = c;
    $("nAll").textContent = fmt(c.all);
    $("nNoSp").textContent = fmt(c.noSp);
    const pages = Math.ceil(c.rows / 20), rest = c.rows % 20;
    $("genko").textContent = c.rows ? `${pages}枚` : "0枚";
    $("genkoNote").textContent = c.rows ? `原稿用紙では${c.rows}行（${rest ? `${pages}枚目の${rest}行目まで` : `${pages}枚ちょうど`}）。` : "";
    $("lines").textContent = c.blank ? `${fmt(c.lines)}行（空行${c.blank}）` : `${fmt(c.lines)}行`;
    $("read").textContent = readTime(c.noSp);
    $("bytes").textContent = fmt(c.bytes);
    $("clearBtn").hidden = !text; $("sampleBtn").hidden = !!text;
    renderBars();
  }

  function barInfo(p, c) {
    if (p.kind === "x") {
      const used = c.x / 2, max = p.max / 2, left = max - used;
      const s = n => (Number.isInteger(n) ? fmt(n) : n.toFixed(1));
      return { val: `${s(used)} / ${fmt(max)}`, ratio: used / max, over: left < 0, msg: left >= 0 ? `あと${s(left)}字（全角）` : `${s(-left)}字（全角）オーバー` };
    }
    if (p.kind === "genko") {
      const r = c.rows;
      return { val: `${r} / 20行`, ratio: r / 20, over: r > 20, msg: r > 20 ? `${r - 20}行はみ出し（目安）` : r ? `あと${20 - r}行（目安）` : "あと20行（目安）" };
    }
    const n = c.all;
    if (p.kind === "range") {
      let msg, ok = false;
      if (n < p.min) msg = `あと${fmt(p.min - n)}字で${fmt(p.min)}字`;
      else if (n <= p.max) { msg = `ちょうどいい長さ（${fmt(p.min)}〜${fmt(p.max)}字）`; ok = true; }
      else msg = `${fmt(n - p.max)}字多い`;
      return { val: `${fmt(n)} / ${fmt(p.min)}〜${fmt(p.max)}`, ratio: n / p.max, over: n > p.max, ok, min: p.min / p.max, msg };
    }
    return { val: `${fmt(n)} / ${fmt(p.max)}`, ratio: n / p.max, over: n > p.max, msg: n <= p.max ? `あと${fmt(p.max - n)}字` : `${fmt(n - p.max)}字オーバー` };
  }

  function renderBars() {
    const c = last || count("");
    const ul = $("bars"); ul.textContent = "";
    const list = allPlaces().filter(p => st.on.includes(p.id));
    $("barsEmpty").hidden = list.length > 0;
    list.forEach(p => {
      const b = barInfo(p, c);
      const li = el("li", "bar" + (b.over ? " over" : b.ok ? " ok" : b.ratio >= 0.9 ? " near" : ""));
      const top = el("div", "bar-top");
      const nm = el("span", "bar-name", p.name);
      if (p.note) nm.append(el("small", null, p.note));
      top.append(nm, el("span", "bar-val", b.val));
      const track = el("div", "track");
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", `${p.name}：${b.msg}`);
      const fill = el("div", "fill"); fill.style.width = Math.min(100, b.ratio * 100) + "%";
      track.append(fill);
      if (b.min) { const z = el("div", "zone"); z.style.left = (b.min * 100) + "%"; track.append(z); }
      li.append(top, track, el("p", "bar-msg", b.msg));
      ul.append(li);
    });
  }

  // 書く場所の選択（自分で入れた場所も）
  function renderChips() {
    const box = $("placeChips"); box.textContent = "";
    allPlaces().forEach(p => {
      const b = el("button", null, p.custom ? `${p.name} ${fmt(p.max)}字` : p.name); b.type = "button"; b.dataset.v = p.id;
      b.setAttribute("aria-pressed", String(st.on.includes(p.id)));
      b.addEventListener("click", () => {
        if (st.on.includes(p.id)) st.on = st.on.filter(x => x !== p.id); else st.on.push(p.id);
        save(); renderChips(); renderBars();
      });
      if (p.custom) {
        const w = el("span", "fc-item");
        w.append(b, FC.remover(p.name, () => {
          const item = { name: p.name, max: p.max }, i = custom.remove(item), was = st.on.includes(p.id);
          st.on = st.on.filter(x => x !== p.id); save(); renderChips(); renderBars();
          toast(`「${p.name}」を外しました。`, () => { custom.insert(item, i); if (was) st.on.push(p.id); save(); renderChips(); renderBars(); });
        }));
        box.append(w);
      } else box.append(b);
    });
    const ad = FC.adder({
      placeholder: "社内報 800", aria: "書く場所と字数", max: 26, empty: "名前と字数を入れてください（例：社内報 800）。",
      inputmode: "text",
      submit: v => {
        const t = v.normalize("NFKC");
        const hit = PLACES.find(p => p.name === v || p.name.replace(/[（(].*$/, "") === t);
        if (hit) { if (!st.on.includes(hit.id)) st.on.push(hit.id); save(); renderChips(); renderBars(); return null; }
        const m = t.match(/^(.+?)\s*(\d{1,6})\s*(字|文字)?$/);
        if (!m) return "字数も入れてください（例：社内報 800）。";
        const name = m[1].trim().slice(0, 20), max = +m[2];
        if (!name) return "名前も入れてください（例：社内報 800）。";
        if (max < 1 || max > 100000) return "字数は1〜100000で入れてください。";
        custom.remove({ name }); custom.add({ name, max });
        const id = "c:" + name; if (!st.on.includes(id)) st.on.push(id);
        save(); renderChips(); renderBars();
        return null;
      }
    });
    box.append(ad.btn, ad.form);
  }

  // ---------- 入力 ----------
  const ta = $("text");
  ta.value = st.keep ? st.text : "";
  $("keep").checked = st.keep;
  let saveTimer = 0;
  ta.addEventListener("input", () => {
    render();
    if (st.keep) { clearTimeout(saveTimer); saveTimer = setTimeout(() => { st.text = ta.value; save(); }, 400); }
  });
  $("keep").addEventListener("change", () => {
    st.keep = $("keep").checked; st.text = st.keep ? ta.value : "";
    save();
    $("keepNote").textContent = st.keep ? "文章はこの端末にだけ残ります。オフにすると消えます。" : "オフのときは、ページを閉じると文章は消えます。どこにも送りません。";
  });
  if (st.keep) $("keepNote").textContent = "文章はこの端末にだけ残ります。オフにすると消えます。";

  $("pasteBtn").addEventListener("click", async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) { toast("コピーした文章がありません。"); return; }
      const before = ta.value;
      ta.value = t; ta.dispatchEvent(new Event("input"));
      toast("貼り付けました。", before ? () => { ta.value = before; ta.dispatchEvent(new Event("input")); } : null);
    } catch (e) {
      ta.focus();
      toast("貼り付けられませんでした。枠を長押しして「ペースト」を選んでください。");
    }
  });
  $("copyBtn").addEventListener("click", async () => {
    if (!ta.value) { toast("コピーする文章がありません。"); return; }
    try { await navigator.clipboard.writeText(ta.value); toast("コピーしました。"); }
    catch (e) { ta.select(); toast("コピーできませんでした。選んだ文章を長押ししてコピーしてください。"); }
  });
  $("sampleBtn").addEventListener("click", () => {
    ta.value = "貴社を志望したのは、地域の暮らしを支える仕事に携わりたいと考えたからです。\n\n大学では、商店街の空き店舗を使った子ども向けの学習会を3年間続けました。参加する子どもが増えるにつれ、続けるためには場所や人の「仕組み」が大切だと学びました。\n\n貴社の、店舗を地域の集まる場所として育てていく取り組みに強くひかれています。お客様の声を聞き、売り場や催しに生かす経験を、学習会の運営でも積んできました。現場で学びながら、人が集まり続ける店づくりに貢献したいと考えています。";
    ta.dispatchEvent(new Event("input"));
  });
  $("clearBtn").addEventListener("click", () => {
    if (!ta.value) return;
    const before = ta.value;
    ta.value = ""; ta.dispatchEvent(new Event("input"));
    toast("文章を消しました。", () => { ta.value = before; ta.dispatchEvent(new Event("input")); });
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
    const out = { app: "mojisu", version: 1, exportedAt: d.toISOString(), data: { on: st.on, keep: st.keep, text: st.keep ? ta.value : "" }, custom: custom.all() };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `mojisu-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, cs = [];
    try {
      if (f.size > 2e6) throw 0;
      const j = JSON.parse(await f.text());
      if (j && j.app === "mojisu") {
        data = cleanSt(j.data);
        if (Array.isArray(j.custom)) cs = j.custom.filter(c => c && typeof c.name === "string" && Number.isInteger(c.max) && c.max > 0 && c.max <= 100000).map(c => ({ name: FC.tidy(c.name).slice(0, 20), max: c.max })).filter(c => c.name);
      }
    } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (ta.value && data.text && !confirm("今の文章を、ファイルの文章と置き換えますか？")) return;
    const snap = { st: JSON.stringify(st), text: ta.value, custom: custom.all() };
    cs.forEach(c => { custom.remove(c); custom.add(c); });
    st = data; if (data.text) ta.value = data.text;
    $("keep").checked = st.keep; $("keep").dispatchEvent(new Event("change"));
    save(); renderChips(); render();
    $("moveMsg").textContent = `読み込みました（自分で追加した書く場所${cs.length}件）。`;
    toast("読み込みました。", () => {
      st = JSON.parse(snap.st); ta.value = snap.text;
      custom.all().forEach(c => custom.remove(c)); snap.custom.forEach(c => custom.add(c));
      $("keep").checked = st.keep; save(); renderChips(); render();
    });
  });

  window.__mojisu = { count, xWeight, genkoRows, readTime };
  renderChips(); render();
})();
