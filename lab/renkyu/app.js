(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const KEY = "renkyu.v1";
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = Plan.keyOf(today);
  const MINY = Holidays.MIN, MAXY = Holidays.MAX;
  const isDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !!Plan.parse(s) && Plan.keyOf(Plan.parse(s)) === s;

  // ---------- 保存 ----------
  const def = () => ({ offWeek: [0, 6], holidaysOff: true, marks: [], maxPaid: 3 });
  function clean(d) {
    if (!d || typeof d !== "object") return null;
    const o = def();
    if (Array.isArray(d.offWeek)) o.offWeek = d.offWeek.filter(n => Number.isInteger(n) && n >= 0 && n <= 6).filter((n, i, a) => a.indexOf(n) === i).sort();
    if (typeof d.holidaysOff === "boolean") o.holidaysOff = d.holidaysOff;
    if (Number.isInteger(d.maxPaid) && d.maxPaid >= 1 && d.maxPaid <= 5) o.maxPaid = d.maxPaid;
    if (Array.isArray(d.marks)) o.marks = d.marks.filter(m => m && isDate(m.from) && isDate(m.to || m.from) && (m.to || m.from) >= m.from && (m.type === "off" || m.type === "work"))
      .slice(0, 400).map(m => ({ id: String(m.id || rid()).slice(0, 20), from: m.from, to: m.to || m.from, type: m.type, name: String(m.name || "").slice(0, 20) || (m.type === "work" ? "出勤日" : "会社の休み") }));
    return o;
  }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  let st = def();
  try { const v = clean(JSON.parse(localStorage.getItem(KEY) || "null")); if (v) st = v; } catch (e) { /* 初期値で使う */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できなくても使える */ } };

  let year = Math.min(MAXY, Math.max(MINY, today.getFullYear()));
  let curMonth = year === today.getFullYear() ? today.getMonth() : 0;
  let sel = null;          // { s, e, take } 選んだ案
  let editing = false;
  let result = null, idx = {};

  // ---------- 表示の部品 ----------
  const md = d => (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")";
  const mdy = d => (d.getFullYear() !== year ? d.getFullYear() + "/" : "") + md(d);
  const range = (a, b) => mdy(a) + "〜" + mdy(b);
  const jd = d => (d.getMonth() + 1) + "月" + d.getDate() + "日（" + WD[d.getDay()] + "）";

  // ---------- 案の計算と表示 ----------
  function compute() {
    result = Plan.plans(year, st, st.maxPaid);
    idx = {};
    result.days.forEach((d, i) => { idx[d.key] = i; });
  }
  function rowPast(r) { return result.days[r.take[0]].date < today; }

  function rowButton(g, r) {
    const ds = result.days;
    const b = el("button", "prow"); b.type = "button";
    const top = el("span", "pr-top");
    top.append(el("b", "pr-k", r.k + "日"), document.createTextNode("休むと"), el("b", "pr-len", r.len + "連休"));
    const sub = el("span", "pr-sub", range(ds[r.s].date, ds[r.e].date));
    const tk = el("span", "pr-take", "有給：" + r.take.map(i => md(ds[i].date)).join("・"));
    b.append(top, sub, tk);
    const on = sel && sel.s === r.s && sel.e === r.e && sel.take.join() === r.take.join();
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.addEventListener("click", () => { select(r); });
    return b;
  }

  function groupItem(g) {
    const ds = result.days;
    const li = el("li", "grp");
    const h = el("div", "g-h");
    h.append(el("h3", "g-name", g.name || "連休"));
    const a = g.anchor, alen = a.e - a.s + 1;
    h.append(el("span", "g-now", alen >= 2 ? "このままでも" + range(ds[a.s].date, ds[a.e].date) + "の" + alen + "連休" : jd(ds[a.s].date) + "が休み"));
    li.append(h);
    const rows = el("div", "g-rows");
    g.rows.forEach(r => rows.append(rowButton(g, r)));
    li.append(rows);
    return li;
  }

  function render() {
    compute();
    $("yearLabel").textContent = year + "年";
    $("prevY").disabled = year <= MINY; $("nextY").disabled = year >= MAXY;
    document.querySelectorAll("#paidSeg button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.k === st.maxPaid ? "true" : "false"));
    const live = [], past = [];
    result.groups.forEach(g => { (g.rows.every(rowPast) ? past : live).push(g); });
    $("glist").replaceChildren(...live.map(groupItem));
    $("pastList").replaceChildren(...past.map(groupItem));
    $("pastBox").hidden = !past.length;
    $("pastN").textContent = past.length ? "（" + past.length + "件）" : "";
    $("plansEmpty").hidden = !!(live.length || past.length);
    $("plansHint").textContent = live.length ? "有給を" + st.maxPaid + "日まで使って、いつもの週末より長く休める連休だけを並べています。押すとカレンダーに表示します。" : "";
    renderHero(live);
    renderCal();
    renderSetup();
    renderHolTable();
  }

  function renderHero(live) {
    $("heroNext").hidden = !(year === today.getFullYear() && today.getMonth() >= 8 && year < MAXY);
    $("heroNext").textContent = (year + 1) + "年を見る";
    let best = null;
    live.forEach(g => g.rows.forEach(r => { if (rowPast(r)) return; if (!best || r.len > best.r.len || (r.len === best.r.len && r.k < best.r.k)) best = { g, r }; }));
    const ds = result.days;
    if (!best) {
      $("heroK").textContent = year + "年";
      $("heroBig").textContent = "長い連休の案はありません";
      $("heroD").textContent = "次の年も見てみてください。";
      $("heroShow").hidden = true;
      return;
    }
    $("heroK").textContent = "一番長いのは " + (best.g.name || "");
    $("heroBig").replaceChildren(el("span", "hb-s", best.r.k + "日休むと"), el("span", "hb-n", String(best.r.len)), el("span", "hb-u", "連休"));
    $("heroD").textContent = range(ds[best.r.s].date, ds[best.r.e].date) + "　有給：" + best.r.take.map(i => md(ds[i].date)).join("・");
    $("heroShow").hidden = false;
    heroRow = best.r;
  }
  let heroRow = null;
  $("heroNext").addEventListener("click", () => { $("nextY").click(); });
  $("heroShow").addEventListener("click", () => { if (heroRow) { select(heroRow, true); } });

  function select(r, force) {
    const same = sel && sel.s === r.s && sel.e === r.e && sel.take.join() === r.take.join();
    sel = same && !force ? null : { s: r.s, e: r.e, take: r.take.slice() };
    if (sel) {
      const d = result.days[sel.s].date;
      curMonth = d.getFullYear() === year ? d.getMonth() : (d.getFullYear() < year ? 0 : 11);
      const ds = result.days;
      $("dayInfo").textContent = range(ds[r.s].date, ds[r.e].date) + "の" + r.len + "連休。有給は" + r.take.map(i => md(ds[i].date)).join("・") + "です。";
    }
    render();
    if (sel) { const m = document.querySelector('.month[data-m="' + curMonth + '"]'); if (m) m.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  }

  // ---------- カレンダー ----------
  function renderCal() {
    const wrap = $("months");
    const ds = result.days;
    const selSet = {}, takeSet = {};
    if (sel) { for (let i = sel.s; i <= sel.e; i++) selSet[i] = true; sel.take.forEach(i => { takeSet[i] = true; }); }
    const frag = document.createDocumentFragment();
    for (let m = 0; m < 12; m++) {
      const box = el("section", "month" + (m === curMonth ? " cur" : ""));
      box.dataset.m = m;
      const head = el("div", "m-h");
      const pv = el("button", "m-nav", "‹"); pv.type = "button"; pv.setAttribute("aria-label", "前の月");
      const nx = el("button", "m-nav", "›"); nx.type = "button"; nx.setAttribute("aria-label", "次の月");
      pv.disabled = m === 0; nx.disabled = m === 11;
      pv.addEventListener("click", () => { curMonth = Math.max(0, m - 1); renderCal(); focusNav(0); });
      nx.addEventListener("click", () => { curMonth = Math.min(11, m + 1); renderCal(); focusNav(1); });
      head.append(pv, el("h3", "m-t", (m + 1) + "月"), nx);
      box.append(head);
      const grid = el("div", "m-g");
      WD.forEach((w, i) => grid.append(el("span", "wd" + (i === 0 ? " su" : i === 6 ? " sa" : ""), w)));
      const first = new Date(year, m, 1).getDay();
      for (let i = 0; i < first; i++) grid.append(el("span", "pad"));
      const last = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) {
        const key = year + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        const i = idx[key], info = ds[i];
        const b = el("button", "day k-" + info.kind); b.type = "button";
        const dow = info.date.getDay();
        if (dow === 0) b.classList.add("su"); if (dow === 6) b.classList.add("sa");
        if (info.holiday) b.classList.add("is-hol");
        if (key === todayKey) b.classList.add("today");
        if (selSet[i]) b.classList.add("in");
        if (takeSet[i]) b.classList.add("pd");
        b.append(el("span", "dn", String(d)));
        if (takeSet[i]) b.append(el("span", "tag", "有"));
        b.setAttribute("aria-label", dayLabel(info, takeSet[i]));
        b.addEventListener("click", () => onDay(info, takeSet[i]));
        grid.append(b);
      }
      box.append(grid);
      frag.append(box);
    }
    wrap.replaceChildren(frag);
  }
  function focusNav(which) {
    const navs = document.querySelectorAll(".month.cur .m-nav");
    const b = navs[which] && !navs[which].disabled ? navs[which] : navs[1 - which];
    if (b) b.focus();
  }
  function dayLabel(info, paid) {
    const parts = [jd(info.date)];
    if (info.holiday) parts.push(info.holiday);
    if (info.kind === "company") parts.push(info.label + "（会社の休み）");
    if (info.kind === "work") parts.push(info.label + "（出勤）");
    if (paid) parts.push("有給");
    parts.push(paid ? "" : info.off ? "休み" : "出勤");
    return parts.filter(Boolean).join("・");
  }
  function onDay(info, paid) {
    if (!editing) { $("dayInfo").textContent = dayLabel(info, paid); return; }
    const k = info.key;
    const single = st.marks.find(m => m.from === k && m.to === k);
    if (single) {
      const snap = JSON.stringify(st.marks);
      st.marks = st.marks.filter(m => m !== single); save(); render();
      $("dayInfo").textContent = jd(info.date) + "の「" + single.name + "」を外しました。";
      toast("「" + single.name + "」を外しました。", () => { st.marks = JSON.parse(snap); save(); render(); });
      return;
    }
    const inside = st.marks.find(m => m.from <= k && m.to >= k);
    if (inside) { $("dayInfo").textContent = jd(info.date) + "は「" + inside.name + "」（" + fmtMark(inside) + "）に入っています。下の一覧から外せます。"; return; }
    const m = info.off ? { id: rid(), from: k, to: k, type: "work", name: "出勤日" } : { id: rid(), from: k, to: k, type: "off", name: "会社の休み" };
    st.marks.push(m); save(); render();
    $("dayInfo").textContent = jd(info.date) + "を「" + m.name + "」にしました。";
  }

  // ---------- 設定 ----------
  const fmtMark = m => { const a = Plan.parse(m.from), b = Plan.parse(m.to); return m.from === m.to ? a.getFullYear() + "/" + md(a) : a.getFullYear() + "/" + md(a) + "〜" + (b.getFullYear() !== a.getFullYear() ? b.getFullYear() + "/" : "") + md(b); };
  function renderSetup() {
    const wk = $("weekSeg");
    if (!wk.children.length) {
      WD.forEach((w, i) => { const b = el("button", "wk" + (i === 0 ? " su" : i === 6 ? " sa" : ""), w); b.type = "button"; b.dataset.d = i; b.setAttribute("aria-label", w + "曜日"); wk.append(b); });
      wk.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        const d = +b.dataset.d;
        st.offWeek = st.offWeek.indexOf(d) >= 0 ? st.offWeek.filter(x => x !== d) : st.offWeek.concat(d).sort();
        save(); sel = null; render();
      });
    }
    [...wk.children].forEach(b => b.setAttribute("aria-pressed", st.offWeek.indexOf(+b.dataset.d) >= 0 ? "true" : "false"));
    $("holOff").checked = st.holidaysOff;
    const list = st.marks.slice().sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0);
    $("marks").replaceChildren(...list.map(m => {
      const li = el("li", "mk mk-" + m.type);
      li.append(el("span", "mk-t", m.type === "work" ? "出勤" : "休み"), el("span", "mk-n", m.name), el("span", "mk-d", fmtMark(m)));
      const x = el("button", "mk-x", "×"); x.type = "button"; x.setAttribute("aria-label", "「" + m.name + "」" + fmtMark(m) + "を外す");
      x.addEventListener("click", () => {
        const snap = JSON.stringify(st.marks);
        st.marks = st.marks.filter(z => z !== m); save(); sel = null; render();
        toast("「" + m.name + "」を外しました。", () => { st.marks = JSON.parse(snap); save(); render(); });
      });
      li.append(x);
      return li;
    }));
    $("marksNone").hidden = st.marks.length > 0;
    $("qNY").textContent = "年末年始（" + year + "/12/29〜1/3）を入れる";
    $("qObon").textContent = "お盆（" + year + "/8/13〜8/16）を入れる";
    $("qNY").disabled = year >= MAXY;
  }
  $("holOff").addEventListener("change", () => { st.holidaysOff = $("holOff").checked; save(); sel = null; render(); });
  document.querySelectorAll("#paidSeg button").forEach(b => b.addEventListener("click", () => { st.maxPaid = +b.dataset.k; save(); sel = null; render(); }));
  $("prevY").addEventListener("click", () => { if (year > MINY) { year--; sel = null; curMonth = year === today.getFullYear() ? today.getMonth() : 0; render(); } });
  $("nextY").addEventListener("click", () => { if (year < MAXY) { year++; sel = null; curMonth = year === today.getFullYear() ? today.getMonth() : 0; render(); } });
  $("editBtn").addEventListener("click", () => {
    editing = !editing;
    $("editBtn").setAttribute("aria-pressed", editing ? "true" : "false");
    $("editBtn").textContent = editing ? "完了" : "休みを入れる";
    $("editHint").hidden = !editing;
    document.querySelector(".cal").classList.toggle("editing", editing);
  });

  function addMark(m, msgEl) {
    if (st.marks.some(x => x.from === m.from && x.to === m.to && x.type === m.type)) { msgEl("同じ日付がもう入っています。"); return false; }
    st.marks.push(m); save(); sel = null; render();
    toast("「" + m.name + "」（" + fmtMark(m) + "）を入れました。", () => { st.marks = st.marks.filter(x => x !== m); save(); render(); });
    return true;
  }
  $("qNY").addEventListener("click", () => addMark({ id: rid(), from: year + "-12-29", to: (year + 1) + "-01-03", type: "off", name: "年末年始" }, t => toast(t)));
  $("qObon").addEventListener("click", () => addMark({ id: rid(), from: year + "-08-13", to: year + "-08-16", type: "off", name: "お盆" }, t => toast(t)));

  // 名前の選択肢（自分で入力つき）
  const NAMES = { off: ["会社の休み", "夏休み", "年末年始", "創立記念日", "一斉休暇"], work: ["出勤日", "土曜出勤", "休日出勤"] };
  const custom = FreeChips.store(KEY + ".custom", { valid: v => v && (v.t === "off" || v.t === "work") && typeof v.n === "string" && v.n.trim() !== "", same: (a, b) => a.t === b.t && a.n === b.n });
  let mType = "off", mName = "会社の休み";
  const adder = FreeChips.adder({ placeholder: "健康診断の日", aria: "名前を自分で入力", ok: "追加", submit: v => {
    if (NAMES[mType].indexOf(v) >= 0) { mName = v; renderNames(); return; }
    custom.add({ t: mType, n: v }); mName = v; renderNames(); return;
  } });
  function renderNames() {
    const box = $("nameChips");
    const items = NAMES[mType].map(n => ({ n, mine: false })).concat(custom.all().filter(c => c.t === mType).map(c => ({ n: c.n, mine: true })));
    if (!items.some(i => i.n === mName)) mName = NAMES[mType][0];
    box.replaceChildren(...items.map(it => {
      const b = el("button", "chip", it.n); b.type = "button"; b.dataset.v = it.n;
      b.setAttribute("aria-pressed", it.n === mName ? "true" : "false");
      b.addEventListener("click", () => { mName = it.n; renderNames(); });
      if (!it.mine) return b;
      const w = el("span", "fc-item"); w.append(b, FreeChips.remover(it.n, () => {
        const pos = custom.remove({ t: mType, n: it.n });
        if (mName === it.n) mName = NAMES[mType][0];
        renderNames();
        toast("「" + it.n + "」を候補から外しました。", () => { custom.insert({ t: mType, n: it.n }, pos); renderNames(); });
      }));
      return w;
    }), adder.btn, adder.form);
  }
  document.querySelectorAll("#typeSeg button").forEach(b => b.addEventListener("click", () => {
    mType = b.dataset.t; mName = NAMES[mType][0];
    document.querySelectorAll("#typeSeg button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    renderNames();
  }));
  const mErr = t => { $("mErr").textContent = t; };
  ["mFrom", "mTo"].forEach(id => $(id).addEventListener("input", () => { mErr(""); $(id).removeAttribute("aria-invalid"); }));
  $("mAdd").addEventListener("click", () => {
    const f = $("mFrom").value, t = $("mTo").value || f;
    const bad = (id, msg) => { mErr(msg); $(id).setAttribute("aria-invalid", "true"); $(id).focus(); };
    if (!isDate(f)) return bad("mFrom", "開始日を選んでください。");
    if (!isDate(t)) return bad("mTo", "終了日を選び直してください。");
    if (f < MINY + "-01-01" || t > MAXY + "-12-31") return bad("mFrom", MINY + "年から" + MAXY + "年までの日付を選んでください。");
    if (t < f) return bad("mTo", "終了日は、開始日より後にしてください。");
    if ((Plan.parse(t) - Plan.parse(f)) / Plan.DAY > 92) return bad("mTo", "一度に入れられるのは3か月までです。分けて入れてください。");
    const ok = addMark({ id: rid(), from: f, to: t, type: mType, name: mName }, mErr);
    if (ok) { $("mFrom").value = ""; $("mTo").value = ""; const y = +f.slice(0, 4); if (y !== year && y >= MINY && y <= MAXY) { year = y; render(); } }
  });

  // ---------- 祝日の一覧 ----------
  function renderHolTable() {
    const h = Holidays.holidays(year);
    const ks = Object.keys(h).sort();
    $("holN").textContent = "（" + year + "年・" + ks.length + "日）";
    $("holBody").replaceChildren(...ks.map(k => { const tr = el("tr"); tr.append(el("td", "hd-d", jd(Plan.parse(k))), el("td", "", h[k])); return tr; }));
  }

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
    const blob = new Blob([JSON.stringify({ app: "renkyu", version: 1, exportedAt: new Date().toISOString(), data: st, custom: custom.all() }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = "renkyu-" + todayKey + ".json";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、同じ設定で使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, cus = [];
    try { if (f.size > 2e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "renkyu") { data = clean(j.data); if (Array.isArray(j.custom)) cus = j.custom; } } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。連休メーカーで書き出したファイルを選んでください。"; return; }
    if (st.marks.length && !confirm("今の設定を、ファイルの内容（会社の休み・出勤日" + data.marks.length + "件）と置き換えますか？")) return;
    const snap = JSON.stringify(st);
    st = data; save();
    cus.forEach(c => { if (c && (c.t === "off" || c.t === "work") && typeof c.n === "string" && c.n.trim()) custom.add({ t: c.t, n: FreeChips.tidy(c.n).slice(0, 20) }); });
    sel = null; render(); renderNames();
    $("moveMsg").textContent = "読み込みました。会社の休み・出勤日は" + data.marks.length + "件です。";
    toast("読み込みました。", () => { st = clean(JSON.parse(snap)); save(); render(); });
  });

  renderNames();
  render();
})();
