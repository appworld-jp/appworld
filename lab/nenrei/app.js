(() => {
  "use strict";
  const C = window.NenreiCalc;
  const KEY = "nenrei.v1";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const jp = a => `${a[0]}年${a[1]}月${a[2]}日`;
  const jpw = a => { const w = C.wareki(a); return w ? `${w.text}${a[1]}月${a[2]}日` : ""; };
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- 保存 ----------
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const people = Array.isArray(raw.people) ? raw.people.slice(0, 50).map(p => {
      if (!p || typeof p !== "object" || !C.parse(p.birth)) return null;
      return { id: typeof p.id === "string" && p.id ? p.id.slice(0, 20) : uid(), name: typeof p.name === "string" ? p.name.trim().slice(0, 12) : "", birth: p.birth };
    }).filter(Boolean) : [];
    return { v: 1, people, mode: raw.mode === "wareki" ? "wareki" : "seireki" };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, people: [], mode: "seireki" };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  const todayA = C.fromDate(new Date());
  let asof = todayA.slice();
  let cur = null; // 表示中の誕生日 [y,m,d]

  // ---------- タブ ----------
  const views = { tabLook: "viewLook", tabFam: "viewFam", tabTable: "viewTable" };
  function show(tab) {
    for (const [t, v] of Object.entries(views)) { $(t).setAttribute("aria-pressed", String(t === tab)); $(v).hidden = t !== tab; }
    if (tab === "tabFam") renderFam();
    if (tab === "tabTable") renderTable();
  }
  Object.keys(views).forEach(t => $(t).addEventListener("click", () => show(t)));

  // ---------- 入力 ----------
  function setMode(m) {
    st.mode = m; save();
    $("modeSeireki").setAttribute("aria-pressed", String(m === "seireki"));
    $("modeWareki").setAttribute("aria-pressed", String(m === "wareki"));
    $("inSeireki").hidden = m !== "seireki";
    $("inWareki").hidden = m !== "wareki";
    if (cur) fillInputs(cur);
    $("birthErr").textContent = "";
  }
  $("modeSeireki").addEventListener("click", () => setMode("seireki"));
  $("modeWareki").addEventListener("click", () => setMode("wareki"));

  function fillInputs(a) {
    $("birth").value = C.fmt(a);
    const w = C.wareki(a);
    if (w) { $("wEra").value = w.era; $("wY").value = w.year; $("wM").value = a[1]; $("wD").value = a[2]; }
  }

  function fromWareki() {
    const era = $("wEra").value, n = parseInt($("wY").value, 10), m = parseInt($("wM").value, 10), d = parseInt($("wD").value, 10);
    if (!n || !m || !d) return { empty: true };
    const i = C.ERAS.findIndex(e => e.name === era);
    const e = C.ERAS[i];
    const y = e.y0 + n - 1;
    const a = C.parse(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    if (!a) return { err: `${era}${n === 1 ? "元" : n}年${m}月${d}日という日はありません。` };
    if (C.cmp(a, e.start) < 0) {
      if (era === "明治") return { err: "明治6年1月1日より前の日付は扱えません。" };
      const sn = e.start[0] - e.y0 + 1;
      return { err: `${era}は${sn === 1 ? "元" : sn}年${e.start[1]}月${e.start[2]}日からです。` };
    }
    if (i > 0) {
      const next = C.ERAS[i - 1];
      if (C.cmp(a, next.start) >= 0) {
        const last = new Date(next.start[0], next.start[1] - 1, next.start[2] - 1);
        const la = C.fromDate(last);
        return { err: `${era}は${la[0] - e.y0 + 1}年${la[1]}月${la[2]}日までです。そのあとは${next.name}です。` };
      }
    }
    return { a };
  }

  function readBirth() {
    if (st.mode === "wareki") {
      const r = fromWareki();
      if (r.empty) return null;
      if (r.err) { $("birthErr").textContent = r.err; return null; }
      $("birthErr").textContent = "";
      return r.a;
    }
    const v = $("birth").value;
    if (!v) { $("birthErr").textContent = ""; return null; }
    const a = C.parse(v);
    if (!a) { $("birthErr").textContent = "1873年から2200年までの日付を入れてください。"; return null; }
    $("birthErr").textContent = "";
    return a;
  }
  function onInput() {
    const a = readBirth();
    cur = a;
    render();
  }
  $("birth").addEventListener("input", onInput);
  ["wEra", "wY", "wM", "wD"].forEach(id => $(id).addEventListener("input", onInput));
  $("askForm").addEventListener("submit", e => { e.preventDefault(); onInput(); });
  $("samples").addEventListener("click", e => {
    const b = e.target.closest("[data-d]"); if (!b) return;
    cur = C.parse(b.dataset.d); fillInputs(cur); $("birthErr").textContent = ""; render(true);
  });

  // 基準日
  function setAsof(a) {
    asof = a; $("asof").value = C.fmt(a);
    $("asofTxt").textContent = C.cmp(a, todayA) === 0 ? "今日" : jp(a);
    render(); if (!$("viewFam").hidden) renderFam();
  }
  $("asof").addEventListener("input", () => { const a = C.parse($("asof").value); if (a) setAsof(a); });
  $("asofToday").addEventListener("click", () => setAsof(todayA.slice()));
  $("asofApril").addEventListener("click", () => {
    const y = todayA[1] >= 4 && !(todayA[1] === 4 && todayA[2] === 1) ? todayA[0] + 1 : todayA[0];
    setAsof([y, 4, 1]);
  });

  // ---------- 結果 ----------
  function gradeText(b, t) {
    const g = C.grade(b, t);
    const fy = C.birthFY(b);
    if (g > 15) return { big: "社会人の年代", g };
    if (g < -6) return { big: `${fy + 7}年4月に小学校へ`, g };
    return { big: C.gradeLabel(g).long, g };
  }
  function gradeNote(b) {
    const fy = C.birthFY(b);
    const range = `同じ学年は、${fy}年4月2日〜${fy + 1}年4月1日生まれです。`;
    if (b[1] === 4 && b[2] === 1) return `4月1日生まれは早生まれです。法律では誕生日の前日に年をとるので、前の学年に入ります。${range}`;
    if (b[1] === 4 && b[2] === 2) return `4月2日生まれは、学年でいちばん早い誕生日です。${range}`;
    if (C.hayaumare(b)) return `早生まれ（1月1日〜4月1日生まれ）です。${range}`;
    return range;
  }

  function render(fromSample) {
    const has = !!cur;
    $("lookEmpty").hidden = has;
    $("result").hidden = !has;
    if (!has) return;
    const b = cur, t = asof;
    const born = C.cmp(t, b) >= 0;
    const w = C.wareki(b);
    $("rDate").textContent = `${jp(b)}${w ? `（${jpw(b)}）` : ""}生まれ`;
    const age = C.age(b, t);
    $("rAge").textContent = born ? `${age}歳` : "誕生前";
    const gt = gradeText(b, t);
    $("rGrade").textContent = gt.big;
    $("rGrade").dataset.stage = gt.g >= -6 && gt.g <= 15 ? "in" : "out";
    $("rGradeNote").textContent = gradeNote(b);
    $("rWareki").textContent = w ? `${w.text}生まれ` : "—";
    const e = C.eto(b[0]);
    $("rEto").textContent = `${e.shi}年（${e.kanshi}）`;
    $("rSign").textContent = C.sign(b[1], b[2]);
    $("rKazoe").textContent = born ? `${C.kazoe(b, t)}歳` : "—";
    const asofLbl = C.cmp(t, todayA) === 0 ? "" : `（${jp(t)}の時点）`;
    if (!born) {
      const days = Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(t[0], t[1] - 1, t[2])) / 864e5);
      $("rNext").textContent = `生まれるまで、あと${days}日です。${asofLbl}`;
    } else {
      const d = C.daysUntilBirthday(b, t);
      $("rNext").textContent = d === 0 ? `今日が${age}歳の誕生日です。おめでとうございます！${asofLbl}` : `次の誕生日（${age + 1}歳）まで、あと${d}日です。${asofLbl}`;
    }
    $("rAge").closest(".fuda").classList.remove("pop");
    if (fromSample && !reduce()) { void $("rAge").offsetWidth; $("rAge").closest(".fuda").classList.add("pop"); }

    // 入学と卒業
    const ul = $("rSchools"); ul.textContent = "";
    const sy = C.schoolYear(t);
    for (const s of C.schools(b)) {
      const li = el("li", "r-item");
      let state = "", stLabel = "";
      if (sy >= s.out) { state = "past"; stLabel = "卒業"; }
      else if (sy >= s.in) { state = "now"; stLabel = "在学中"; }
      else { state = "future"; stLabel = s.in - sy === 1 ? "来年度" : `${s.in - sy}年後`; }
      li.dataset.state = state;
      li.append(el("span", "r-dot"));
      const body = el("div", "r-body");
      const h = el("p", "r-name"); h.append(el("b", null, s.name), el("span", "r-st", stLabel));
      const yrs = el("p", "r-yrs");
      const wy = y => C.warekiYear(y).slice(-1)[0] || "";
      yrs.append(el("span", null, `入学 ${s.in}年4月（${wy(s.in)}）`), el("span", null, `卒業 ${s.out}年3月（${wy(s.out)}）`));
      body.append(h, yrs); li.append(body); ul.append(li);
    }

    // 年祝い
    const iu = $("rIwai"); iu.textContent = "";
    const yNow = t[0];
    let nextMarked = false, nextName = "";
    for (const x of C.iwai(b)) {
      const li = el("li", "iw");
      const past = x.man ? x.manYear < yNow : x.manYear < yNow && x.kazoeYear < yNow;
      if (past) li.classList.add("past");
      else if (!nextMarked) { li.classList.add("next"); nextMarked = true; nextName = `次は${x.name}（${x.man ? `${x.manYear}年` : `満${x.manYear}年・数え${x.kazoeYear}年`}）`; }
      const head = el("div", "iw-h");
      const nm = el("p", "iw-name"); nm.append(el("b", null, x.name), el("small", null, x.yomi));
      head.append(el("span", "iw-age", `${x.age}`), nm);
      const yrs = el("p", "iw-yrs");
      if (x.man) yrs.textContent = `${x.manYear}年（満${x.age}歳・数え${x.age + 1}歳）`;
      else yrs.textContent = `満なら${x.manYear}年／数えなら${x.kazoeYear}年`;
      li.append(head, yrs, el("p", "iw-note", x.note));
      iu.append(li);
    }
    $("iwHint").textContent = nextName;
    $("iwBox").open = born && age >= 50;
    $("saveErr").textContent = "";
  }

  // 家族に保存
  $("saveForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!cur) return;
    const name = $("saveName").value.trim().slice(0, 12);
    if (!name) { $("saveErr").textContent = "名前を入れると保存できます。"; $("saveName").focus(); return; }
    const birth = C.fmt(cur);
    const same = st.people.find(p => p.name === name);
    if (same) { same.birth = birth; toast(`${name}の誕生日を更新しました。`); }
    else { st.people.push({ id: uid(), name, birth }); toast(`${name}を家族に保存しました。`); }
    save(); $("saveName").value = ""; $("saveErr").textContent = ""; updateCount();
  });

  // ---------- 家族 ----------
  function updateCount() {
    const n = st.people.length;
    $("famCount").hidden = !n; $("famCount").textContent = String(n);
  }
  function renderFam() {
    const list = $("famList"); list.textContent = "";
    $("famEmpty").hidden = st.people.length > 0;
    $("famAsof").textContent = C.cmp(asof, todayA) === 0 ? `${jp(todayA)}の時点` : `${jp(asof)}の時点（基準日）`;
    const sorted = st.people.slice().sort((a, b) => a.birth < b.birth ? -1 : 1);
    for (const p of sorted) {
      const b = C.parse(p.birth);
      const li = el("li", "fam-i");
      const btn = el("button", "fam-b"); btn.type = "button";
      const born = C.cmp(asof, b) >= 0;
      const g = C.grade(b, asof);
      const gl = g >= -6 && g <= 15 ? C.gradeLabel(g).short : "";
      const e = C.eto(b[0]);
      const top = el("span", "fam-top");
      top.append(el("b", "fam-name", p.name), el("span", "fam-age", born ? `${C.age(b, asof)}歳` : "誕生前"));
      if (gl) top.append(el("span", "fam-grade", gl));
      btn.append(top, el("span", "fam-sub", `${jp(b)}・${(C.wareki(b) || { text: "" }).text}・${e.shi}年`));
      btn.setAttribute("aria-label", `${p.name}の結果を見る`);
      btn.addEventListener("click", () => { cur = b; fillInputs(b); show("tabLook"); render(true); window.scrollTo(0, 0); });
      const del = el("button", "fam-del", "削除"); del.type = "button";
      del.setAttribute("aria-label", `${p.name}を削除`);
      del.addEventListener("click", () => {
        const snap = JSON.stringify(st.people);
        st.people = st.people.filter(q => q.id !== p.id); save(); renderFam(); updateCount();
        toast(`${p.name}を削除しました。`, () => { st.people = JSON.parse(snap); save(); renderFam(); updateCount(); });
      });
      li.append(btn, del); list.append(li);
    }
  }
  $("famGo").addEventListener("click", () => { show("tabLook"); (st.mode === "wareki" ? $("wY") : $("birth")).focus(); });

  // 書き出し・読み込み
  $("expBtn").addEventListener("click", () => {
    if (!st.people.length) { $("moveMsg").textContent = "保存した家族がいないので、書き出すものがありません。"; return; }
    const blob = new Blob([JSON.stringify({ app: "nenrei", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `nenrei-${C.fmt(todayA)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 1e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "nenrei") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.people.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.people.length && !confirm(`いまの家族（${st.people.length}人）を、ファイルの${data.people.length}人と置きかえますか？`)) return;
    const snap = JSON.stringify(st.people);
    st.people = data.people; save(); renderFam(); updateCount();
    $("moveMsg").textContent = `${data.people.length}人分を読み込みました。`;
    toast("読み込みました。", () => { st.people = JSON.parse(snap); save(); renderFam(); updateCount(); });
  });

  // ---------- 早見表 ----------
  let tKind = "grade";
  let tYearG = C.schoolYear(todayA), tYearY = todayA[0];
  function setKind(k) {
    tKind = k;
    $("tGrade").setAttribute("aria-pressed", String(k === "grade"));
    $("tYear").setAttribute("aria-pressed", String(k === "year"));
    renderTable();
  }
  $("tGrade").addEventListener("click", () => setKind("grade"));
  $("tYear").addEventListener("click", () => setKind("year"));
  const yGet = () => tKind === "grade" ? tYearG : tYearY;
  const ySet = y => { y = Math.max(1900, Math.min(2150, y)); if (tKind === "grade") tYearG = y; else tYearY = y; renderTable(); };
  $("yPrev").addEventListener("click", () => ySet(yGet() - 1));
  $("yNext").addEventListener("click", () => ySet(yGet() + 1));
  $("yIn").addEventListener("change", () => { const y = parseInt($("yIn").value, 10); if (y) ySet(y); else $("yIn").value = yGet(); });

  function row(cells, cls) {
    const tr = el("tr", cls || null);
    cells.forEach((c, i) => {
      const td = el(i === 0 ? "th" : "td");
      if (Array.isArray(c)) c.forEach(line => td.append(el("span", "ln", line))); else td.textContent = c;
      if (i === 0) td.scope = "row"; tr.append(td);
    });
    return tr;
  }
  function renderTable() {
    const y = yGet();
    $("yIn").value = y;
    $("yUnit").textContent = tKind === "grade" ? "年度" : "年";
    const head = $("tblHead"), body = $("tblBody");
    head.textContent = ""; body.textContent = "";
    const wy = C.warekiYear(y).join("／");
    if (tKind === "grade") {
      $("tblNote").textContent = `${y}年4月〜${y + 1}年3月（${wy}度）の学年です。`;
      head.append(row(["学年", "生まれた期間"]));
      for (const r of C.gradeTable(y)) {
        const tr = row([r.label.short, [`${jp(r.from)}〜`, `${jp(r.to)}`, `${jpw(r.from)}〜${jpw(r.to)}`]], r.g === 0 || r.g === 6 || r.g === 9 || r.g === 12 ? "first" : "");
        body.append(tr);
      }
    } else {
      $("tblNote").textContent = `${y}年（${wy}）の誕生日を過ぎたあとの年齢です。数え年は1月1日に1つ増えます。`;
      head.append(row(["生まれ年", "和暦", "干支", "満", "数え"]));
      for (const r of C.yearTable(y, 100)) {
        body.append(row([`${r.by}年`, r.wareki.join("／"), `${r.eto.shi}（${r.eto.yomi}）`, `${r.man}歳`, `${r.kazoe}歳`], r.man % 10 === 0 ? "first" : ""));
      }
    }
  }

  // ---------- トースト ----------
  let tt = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg;
    $("toastUndo").hidden = !undo;
    $("toastUndo").onclick = () => { if (undo) undo(); $("toast").hidden = true; };
    $("toast").hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { $("toast").hidden = true; }, 5000);
  }

  // ---------- はじめ ----------
  $("asof").value = C.fmt(asof);
  setMode(st.mode);
  updateCount();
  render();
})();
