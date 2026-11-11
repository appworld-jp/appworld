// 家計ひとめ — 手入力の家計簿。記録はこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "kakei.v1";
  const CATS = [
    { n: "食費", p: "M5 11h14l-1.5 8a2 2 0 0 1-2 1.6H8.5a2 2 0 0 1-2-1.6zM8 11l3-6M16 11l-3-6" },
    { n: "日用品", p: "M8 3h8v3l2 3v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9l2-3zM8 6h8M9 13h6" },
    { n: "外食", p: "M7 3v8a2 2 0 0 0 2 2v8M7 3v5M10 3v8a2 2 0 0 1-1 1.7M17 21V3c-2 1-3 4-3 8h3" },
    { n: "交通", p: "M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM4 11h16M8 17l-2 3M16 17l2 3" },
    { n: "その他", p: "M5 12h.01M12 12h.01M19 12h.01" }
  ];
  const yen = n => "¥" + Math.round(n).toLocaleString("ja-JP");
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let st = { e: [], budget: 0 };
  let view = new Date(); view.setDate(1);
  let lastId = null, toastTimer = null;

  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && Array.isArray(v.e)) st = { e: v.e.filter(x => x && typeof x.a === "number").map(x => { if (typeof x.cn === "string" && x.cn.trim()) x.cn = x.cn.trim().slice(0, 12); else delete x.cn; return x; }), budget: +v.budget || 0 }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。", true); } };
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const svg = (p, color) => {
    const ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg"), path = document.createElementNS(ns, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    path.setAttribute("d", p); path.setAttribute("fill", "none"); path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", p.indexOf(".01") > 0 ? "3.5" : "1.8"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
    s.append(path); return s;
  };
  const color = i => `var(--c${i})`;
  // 自分で入れた項目は c を「その他」(4) にして、名前を cn に持つ。色と印は「その他」と同じ。
  const OTHER = 4, TAG = "M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8zM8.5 8.5h.01";
  const catName = x => x.cn || (CATS[x.c] ? CATS[x.c].n : "その他");
  const colorOf = x => color(x.cn || !CATS[x.c] ? OTHER : x.c);

  // 全角数字やカンマも受けつける
  function parseAmount(s) {
    const t = String(s).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[,，円¥￥\s]/g, "");
    if (!/^\d{1,9}$/.test(t)) return 0;
    return parseInt(t, 10);
  }

  const free = window.FreeChoice({
    key: KEY + ".custom", set: "cat", label: "項目", max: 12, placeholder: "子ども、趣味、医療費",
    builtins: () => CATS.map((c, i) => ({ value: i, label: c.n })),
    onChange: () => renderCats(),
    onPick: v => add(v)
  });
  function renderCats() {
    const box = $("cats"); box.textContent = "";
    CATS.forEach((c, i) => {
      const b = el("button", "cat c" + i); b.type = "button";
      b.append(svg(c.p, "currentColor"), el("span", null, c.n));
      b.addEventListener("click", () => add(i));
      box.append(b);
    });
    free.values().forEach(n => {
      const b = el("button", "cat c4 own"); b.type = "button";
      b.append(svg(TAG, "currentColor"), el("span", null, n));
      b.addEventListener("click", () => add(n));
      box.append(free.wrap(b, n));
    });
    box.append(free.root);
  }
  renderCats();

  // ci は決まった項目の番号か、自分で入れた項目の名前
  function add(ci) {
    const a = parseAmount($("amount").value);
    if (!a) { $("amount-err").textContent = $("amount").value.trim() ? "金額は数字だけで入れてください（例：1200）。" : "先に金額を入れてください。"; $("amount").focus(); return; }
    $("amount-err").textContent = "";
    const d = $("date").value || iso(new Date());
    const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d, a, c: typeof ci === "string" ? OTHER : ci, m: $("memo").value.trim().slice(0, 30) };
    if (typeof ci === "string") item.cn = ci;
    st.e.push(item); save();
    lastId = item.id;
    $("amount").value = ""; $("memo").value = "";
    const [y, m] = d.split("-").map(Number);
    if (y !== view.getFullYear() || m !== view.getMonth() + 1) { view = new Date(y, m - 1, 1); }
    render();
    toast(`${catName(item)}に${yen(a)}を記録しました。`, false, true); bump();
    $("amount").focus();
  }

  function toast(msg, err, undo) {
    const t = $("toast"); t.textContent = ""; t.className = "toast" + (err ? " err" : "");
    t.append(el("span", null, msg));
    if (undo) {
      const b = el("button", null, "取り消す"); b.type = "button";
      b.addEventListener("click", () => { remove(lastId); toast("取り消しました。"); });
      t.append(b);
    }
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.textContent = ""; }, 6000);
  }
  function bump() {
    const t = $("total"); t.classList.remove("bump"); void t.offsetWidth; t.classList.add("bump");
  }
  function remove(id) { st.e = st.e.filter(x => x.id !== id); save(); render(); }

  function render() {
    const y = view.getFullYear(), m = view.getMonth() + 1, pre = `${y}-${pad(m)}-`;
    $("month").textContent = `${y}年${m}月`;
    const now = new Date(), cur = now.getFullYear() === y && now.getMonth() + 1 === m;
    $("date").value = cur ? iso(now) : pre + "01";
    $("date").min = pre + "01"; $("date").max = pre + pad(new Date(y, m, 0).getDate());

    const items = st.e.filter(x => x.d.startsWith(pre));
    const total = items.reduce((s, x) => s + x.a, 0);
    $("total").textContent = Math.round(total).toLocaleString("ja-JP");
    const B = st.budget;
    $("budget-v").textContent = B ? yen(B) : "未設定";
    $("edit-budget").textContent = B ? "予算を変える" : "予算を決める";
    $("total-l").textContent = cur ? "今月使ったお金" : `${m}月に使ったお金`;
    const left = B - total;
    $("left-l").textContent = B && left < 0 ? "予算オーバー" : "残り";
    $("left").textContent = B ? yen(Math.abs(left)) : "—";
    $("left").className = B && left < 0 ? "neg" : "";
    const dim = new Date(y, m, 0).getDate();
    const daysLeft = cur ? dim - now.getDate() + 1 : (new Date(y, m - 1, 1) > now ? dim : 0);
    $("perday").textContent = B && daysLeft && left > 0 ? yen(Math.floor(left / daysLeft)) : "—";
    const pct = B ? Math.min(100, total / B * 100) : 0;
    $("meter").style.width = pct + "%";
    $("meter").className = B && total > B ? "over" : "";

    // 項目ごとの棒
    // 決まった項目のあとに、自分で入れた項目を名前ごとにまとめる
    const groups = CATS.map((c, i) => ({ n: c.n, col: color(i), v: items.filter(x => !x.cn && x.c === i).reduce((s, x) => s + x.a, 0) }));
    const own = [];
    items.filter(x => x.cn).forEach(x => { let g = own.find(o => o.n === x.cn); if (!g) own.push(g = { n: x.cn, col: color(OTHER), v: 0, own: true }); g.v += x.a; });
    own.sort((a, b) => b.v - a.v);
    const rows = groups.concat(own);
    const sums = rows.map(g => g.v);
    const max = Math.max(1, ...sums);
    const bars = $("bars"); bars.textContent = "";
    if (!total) { bars.append(el("li", "empty", "記録すると、食費・日用品などの合計がここに出ます。")); }
    else
    sums.forEach((v, i) => {
      const li = el("li"), tr = el("span", "track"), fill = el("i");
      fill.style.width = (v / max * 100) + "%"; fill.style.background = rows[i].col;
      tr.append(fill); tr.setAttribute("aria-hidden", "true");
      const val = el("span", "v", yen(v));
      if (total) val.append(el("span", "pct", Math.round(v / total * 100) + "%"));
      li.append(el("span", "bn", rows[i].n), tr, val);
      bars.append(li);
    });

    // 日ごとの一覧（新しい日付が上）
    const list = $("list"); list.textContent = "";
    if (!items.length) {
      list.append(el("p", "empty", cur ? "記録した支出が、日付ごとにここに並びます。" : `${m}月の記録はありません。`));
      return;
    }
    const byDay = {};
    items.forEach(x => (byDay[x.d] = byDay[x.d] || []).push(x));
    const wd = "日月火水木金土";
    Object.keys(byDay).sort().reverse().forEach(d => {
      const box = el("div", "day"), h = el("h3"), dt = new Date(d + "T00:00:00");
      const arr = byDay[d];
      h.append(el("span", null, `${dt.getMonth() + 1}月${dt.getDate()}日（${wd[dt.getDay()]}）`), el("b", null, yen(arr.reduce((s, x) => s + x.a, 0))));
      const ul = el("ul");
      arr.slice().reverse().forEach(x => {
        const li = el("li"), dot = el("span", "dot"), w = el("span", "what", catName(x));
        dot.style.background = colorOf(x);
        if (x.m) w.append(el("small", null, x.m));
        const del = el("button", "del", "×"); del.type = "button";
        del.setAttribute("aria-label", `${catName(x)} ${yen(x.a)} を削除`);
        del.addEventListener("click", () => { if (confirm(`${yen(x.a)}（${catName(x)}）を削除しますか？`)) remove(x.id); });
        li.append(dot, w, el("span", "amt", yen(x.a)), del); ul.append(li);
      });
      box.append(h, ul); list.append(box);
    });
  }

  $("prev").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
  $("next").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
  $("edit-budget").addEventListener("click", () => {
    const f = $("budget-form"); f.hidden = !f.hidden;
    if (!f.hidden) { $("budget-in").value = st.budget ? String(st.budget) : ""; $("budget-in").focus(); }
  });
  $("budget-form").addEventListener("submit", ev => {
    ev.preventDefault();
    const raw = $("budget-in").value.trim();
    const v = raw ? parseAmount(raw) : 0;
    if (raw && !v) { $("budget-help").textContent = "数字だけで入れてください（例：60000）。"; $("budget-help").className = "help err"; $("budget-in").focus(); return; }
    $("budget-help").textContent = "空にして保存すると、予算なしに戻ります。"; $("budget-help").className = "help";
    st.budget = v; save();
    $("budget-form").hidden = true; render();
  });

  $("amount").addEventListener("input", () => { $("amount-err").textContent = ""; });

  render();
})();
