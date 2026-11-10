// みずのむ — 水分の記録。データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "mizu.v1", NS = "http://www.w3.org/2000/svg";
  const CUPS = [
    { ml: 150, n: "小さなコップ", h: .55 }, { ml: 200, n: "コップ", h: .7 },
    { ml: 250, n: "マグカップ", h: .8 }, { ml: 500, n: "ペットボトル", h: 1 }
  ];
  const pad = n => String(n).padStart(2, "0");
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmt = n => n.toLocaleString("ja-JP");
  let st = { goal: 1500, days: {} }, lastAdded = null, toastT = null;

  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v.days === "object") st = { goal: Math.min(5000, Math.max(300, +v.goal || 1500)), days: v.days };
  } catch (e) {}
  function save() {
    // 60日より前の記録は消す
    const cut = new Date(); cut.setDate(cut.getDate() - 60); const ck = key(cut);
    Object.keys(st.days).forEach(k => { if (k < ck) delete st.days[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。", true); }
  }
  const today = () => key(new Date());
  const list = k => (Array.isArray(st.days[k]) ? st.days[k] : []);
  const sum = k => list(k).reduce((s, x) => s + (+x.ml || 0), 0);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const svg = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  CUPS.forEach(c => {
    const b = el("button", "cup"); b.type = "button"; b.setAttribute("aria-label", `${c.n}1杯（${c.ml}ml）を記録`);
    const s = svg("svg", { viewBox: "0 0 40 52", "aria-hidden": "true" });
    const top = 52 - 46 * c.h, w = c.ml >= 500 ? 9 : 4;
    if (c.ml >= 500) {
      s.append(svg("path", { class: "c-in", d: `M10 ${top + 16}h20v${44 - top - 16}a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z` }));
      s.append(svg("path", { class: "c-out", d: `M16 ${top}h8v5c0 3 6 5 6 10v30a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V${top + 15}c0-5 6-7 6-10z` }));
    } else {
      s.append(svg("path", { class: "c-in", d: `M${w + 2} ${top + 14}h${36 - 2 * w - 4}l-2 ${48 - top - 14}H${w + 4}z` }));
      s.append(svg("path", { class: "c-out", d: `M${w} ${top}h${40 - 2 * w}l-3 ${50 - top}H${w + 3}z` }));
      if (c.ml === 250) s.append(svg("path", { class: "c-out", d: `M${40 - w - 1} ${top + 8}q8 0 6 10t-8 8` }));
    }
    b.append(s, el("b", null, c.ml + "ml"), el("span", null, c.n));
    b.addEventListener("click", () => add(c.ml));
    $("cups").append(b);
  });

  function add(ml) {
    const k = today(), item = { t: Date.now(), ml };
    $("custom-err").textContent = "";
    st.days[k] = list(k).concat(item); save(); lastAdded = item;
    render();
    const reached = sum(k) >= st.goal && sum(k) - ml < st.goal;
    toast(reached ? "きょうの目標に届きました！" : `${fmt(ml)}mlを記録しました。`, false, true);
    if (reached) celebrate();
    else splash();
  }
  function replay(node, cls) { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); }
  function splash() { replay(document.querySelector(".bottle-wrap"), "drip"); }
  function celebrate() { replay(document.querySelector(".bottle-wrap"), "cheer"); }
  function removeItem(item) {
    const k = today(); st.days[k] = list(k).filter(x => x !== item); save(); render();
  }
  function toast(msg, err, undo) {
    const t = $("toast"); t.textContent = ""; t.className = "toast" + (err ? " err" : "");
    t.append(el("span", null, msg));
    if (undo && lastAdded) {
      const it = lastAdded, b = el("button", null, "取り消す"); b.type = "button";
      b.addEventListener("click", () => { removeItem(it); lastAdded = null; toast("取り消しました。"); });
      t.append(b);
    }
    clearTimeout(toastT); toastT = setTimeout(() => { t.textContent = ""; }, 6000);
  }

  function render() {
    const now = new Date(), k = key(now), total = sum(k), g = st.goal, frac = Math.min(1, total / g);
    $("today").textContent = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;
    $("amount").firstChild.textContent = fmt(total);
    $("pct").textContent = Math.round(total / g * 100) + "%";
    $("goal-v").textContent = fmt(g) + "ml";
    const left = g - total;
    const L = $("left"); L.textContent = "";
    if (left > 0) { L.append(el("span", null, `あと${fmt(left)}ml`), el("span", null, `（コップ${Math.ceil(left / 200)}杯ほど）`)); }
    else L.append(el("span", null, "きょうの目標を達成しました！"));
    document.body.classList.toggle("reached", left <= 0);
    $("left").className = "left" + (left > 0 ? "" : " ok");
    $("water").style.transform = `translateY(${212 - frac * 200}px)`;
    $("amount").setAttribute("aria-label", `きょうは${fmt(total)}ml。目標${fmt(g)}mlの${Math.round(total / g * 100)}%です`);

    const log = $("log"); log.textContent = "";
    const items = list(k);
    if (!items.length) log.append(el("li", "empty", "飲んだ時刻と量が、ここに並びます。"));
    items.slice().reverse().forEach(x => {
      const d = new Date(x.t), li = el("li");
      const del = el("button", null, "×"); del.type = "button";
      del.setAttribute("aria-label", `${pad(d.getHours())}:${pad(d.getMinutes())}の${x.ml}mlを削除`);
      del.addEventListener("click", () => { removeItem(x); toast(`${x.ml}mlの記録を削除しました。`); });
      li.append(el("span", "drop"), el("span", "tm", `${d.getHours()}:${pad(d.getMinutes())}`), el("span", "ml", `${fmt(x.ml)}ml`), del);
      li.className = "item";
      log.append(li);
    });

    // 7日間
    const w = $("week"); w.textContent = "";
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); days.push(d); }
    const vals = days.map(d => sum(key(d))), max = Math.max(g * 1.2, ...vals);
    const H = 108; // 棒の最大の高さ（px）
    const mark = el("div", "goal-mark");
    mark.append(el("span", null, "目標")); w.append(mark);
    const desc = [];
    days.forEach((d, i) => {
      const v = vals[i], col = el("div", "day" + (i === 6 ? " today" : ""));
      const bar = el("div", "bar" + (v >= g ? " hit" : "")); bar.style.height = Math.round(v / max * H) + "px";
      col.append(el("span", "v", v ? (v >= 1000 ? (v / 1000).toFixed(1) + "L" : v + "") : ""), bar, el("small", null, i === 6 ? "きょう" : "日月火水木金土"[d.getDay()]));
      w.append(col);
      desc.push(`${d.getMonth() + 1}月${d.getDate()}日 ${v}ml`);
    });
    w.setAttribute("aria-label", "7日間の記録：" + desc.join("、"));
    const b0 = w.querySelector(".bar");
    const base = b0 ? w.clientHeight - (b0.offsetTop + b0.offsetHeight) : 40;
    mark.style.bottom = (base + g / max * H) + "px";
  }

  $("goal-edit").addEventListener("click", () => {
    const f = $("goal-form"); f.hidden = !f.hidden; $("goal-edit").setAttribute("aria-expanded", String(!f.hidden)); $("goal-err").textContent = "";
    if (!f.hidden) { $("goal-in").value = st.goal; $("goal-in").focus(); }
  });
  $("goal-form").addEventListener("submit", e => {
    e.preventDefault();
    const v = Math.round(+$("goal-in").value);
    if (!(v >= 300 && v <= 5000)) { $("goal-err").textContent = "300〜5,000mlの数字を入れてください。"; $("goal-in").focus(); return; }
    $("goal-err").textContent = "";
    st.goal = v; save(); $("goal-form").hidden = true; $("goal-edit").setAttribute("aria-expanded", "false"); render();
  });
  $("custom").addEventListener("submit", e => {
    e.preventDefault();
    const v = Math.round(+$("custom-in").value);
    if (!(v >= 10 && v <= 2000)) { $("custom-err").textContent = "10〜2,000mlの数字を入れてください。"; $("custom-in").focus(); return; }
    $("custom-err").textContent = "";
    $("custom-in").value = ""; add(v);
  });
  // 日付が変わったら表示を更新する
  let shown = today();
  setInterval(() => { if (today() !== shown) { shown = today(); render(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { shown = today(); render(); } });

  $("custom-in").addEventListener("input", () => { $("custom-err").textContent = ""; });

  render();
})();
