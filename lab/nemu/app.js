(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "nemulog.v1";
  const H = 3600000, M = 60000, DAY = 86400000;
  const FEEL = ["眠い", "普通", "ぐっすり"];
  const pad = n => String(n).padStart(2, "0");
  const hm = t => { const d = new Date(t); return `${d.getHours()}:${pad(d.getMinutes())}`; };
  const dur = ms => { const m = Math.round(ms / M); return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`; };
  const clockOf = min => { const x = ((Math.round(min) % 1440) + 1440) % 1440; return `${Math.floor(x / 60)}:${pad(x % 60)}`; };
  const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayName = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`; };
  const fcls = e => (e.fc ? "fc" : e.feel === 0 || e.feel === 1 || e.feel === 2 ? "f" + e.feel : "fn");
  const feelText = e => (e.fc ? e.fc : e.feel == null ? "目覚め未入力" : FEEL[e.feel]);
  const FC = window.FreeChips, myFeels = FC.store("nemulog.feel.custom");

  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && Array.isArray(o.entries)) return Object.assign({ entries: [], pending: null, rateId: null }, o); } catch (e) { /* ignore */ }
    return { entries: [], pending: null, rateId: null };
  }
  const S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  const sorted = () => S.entries.slice().sort((a, b) => b.wake - a.wake);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- now panel ----------
  let elT = 0;
  function renderNow() {
    const rateE = S.rateId && S.entries.find(e => e.id === S.rateId);
    $("idle").hidden = !!(S.pending || rateE);
    $("sleeping").hidden = !S.pending;
    $("rate").hidden = !(rateE && !S.pending);
    clearInterval(elT);
    if (S.pending) {
      $("since").textContent = hm(S.pending);
      const upd = () => { $("elapsed").textContent = `経過 ${dur(Date.now() - S.pending)}`; };
      upd(); elT = setInterval(upd, 30000);
    } else if (rateE) {
      renderRateCustom();
      $("slept").textContent = `${dur(rateE.wake - rateE.bed)}眠りました。`;
    } else {
      const h = new Date().getHours();
      const morning = h >= 5 && h < 11, day = h >= 11 && h < 18;
      $("greet").textContent = morning ? "おはようございます。" : day ? "こんにちは。" : "今日もお疲れさまでした。";
      $("idleHint").textContent = morning ? "昨夜の分は、下の「＋ 追加」から入れられます。" : day ? "寝るときに押してください。昼寝の記録にも使えます。" : "布団に入ったら押してください。朝は「起きた」を押すだけです。";
    }
  }
  $("goSleep").addEventListener("click", () => { S.pending = Date.now(); S.rateId = null; save(); renderNow(); $("goWake").focus(); });
  $("cancelSleep").addEventListener("click", () => { S.pending = null; save(); renderNow(); $("goSleep").focus(); });
  $("goWake").addEventListener("click", () => {
    const bed = S.pending, wake = Date.now();
    S.pending = null;
    if (wake - bed < 10 * M) { save(); renderNow(); flashGreet("10分未満だったので、記録しませんでした。"); return; }
    if (wake - bed > 20 * H) { save(); renderNow(); flashGreet("20時間を超えたので、記録しませんでした。"); $("idleHint").textContent = "下の「＋ 追加」から、時刻を入れて記録できます。"; return; }
    const e = { id: uid(), bed, wake, feel: null };
    S.entries.push(e); S.rateId = e.id; save(); renderAll();
  });
  function flashGreet(msg) { $("greet").textContent = msg; }
  function rateWith(feel, fc) {
    const e = S.entries.find(x => x.id === S.rateId);
    if (e) { e.feel = feel; if (fc) e.fc = fc; else delete e.fc; }
    S.rateId = null; save(); renderAll();
    flashGreet("記録しました。今日もいい一日を。");
  }
  document.querySelectorAll(".feels > .feel").forEach(b => b.addEventListener("click", () => rateWith(Number(b.dataset.feel), null)));
  function wrapCustom(chip, name, onRemove) { const w = document.createElement("span"); w.className = "fc-item"; w.append(chip, FC.remover(name, onRemove)); return w; }
  // 目覚めの「自分で入力」（朝の画面）
  function renderRateCustom() {
    const box = $("rateMine"); box.textContent = "";
    for (const name of myFeels.all()) {
      const b = document.createElement("button"); b.type = "button"; b.className = "feel fc"; b.textContent = name;
      b.addEventListener("click", () => rateWith(null, name));
      box.append(wrapCustom(b, name, () => { myFeels.remove(name); renderRateCustom(); }));
    }
    const a = FC.adder({ label: "＋ 自分で入力", aria: "目覚めを入力", placeholder: "例：頭が重い", max: 12, ok: "記録", btnClass: "feel add",
      empty: "目覚めの様子を入れてから「記録」を押してください。",
      submit: v => { const i = FEEL.indexOf(v); if (i >= 0) { rateWith(i, null); return; } myFeels.add(v); rateWith(null, v); } });
    box.append(a.btn, a.form);
  }
  $("rateLater").addEventListener("click", () => { S.rateId = null; save(); renderNow(); });

  // ---------- week ----------
  let weekBack = 0;
  function weekDays() {
    const today = midnight(Date.now()), out = [];
    for (let i = 6; i >= 0; i--) out.push(midnight(today - (weekBack * 7 + i) * DAY + 12 * H));
    return out;
  }
  function entriesOn(day) { return S.entries.filter(e => midnight(e.wake) === day).sort((a, b) => a.bed - b.bed); }
  const bedMin = t => { const d = new Date(t); return (d.getHours() * 60 + d.getMinutes() - 720 + 1440) % 1440; }; // minutes since noon
  const wakeMin = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

  const NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, text) { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }

  function renderWeek() {
    const days = weekDays();
    $("weekTitle").textContent = weekBack === 0 ? "この1週間" : `${dayName(days[0]).replace(/（.）/, "")}〜${dayName(days[6]).replace(/（.）/, "")}`;
    $("nextWeek").disabled = weekBack === 0;
    $("prevWeek").disabled = !S.entries.some(e => e.wake < days[0]);
    const rows = days.map(d => ({ d, list: entriesOn(d) }));
    const all = rows.flatMap(r => r.list);
    // horizontal range in hours relative to midnight of the wake day
    let lo = -4, hi = 12;
    for (const r of rows) for (const e of r.list) { lo = Math.min(lo, Math.floor((e.bed - r.d) / H)); hi = Math.max(hi, Math.ceil((e.wake - r.d) / H)); }
    lo = Math.max(lo, -14); hi = Math.min(hi, 20);
    const W = 360, L = 74, R = 58, T = 24, RH = 30, PW = W - L - R, HGT = T + RH * 7 + 6;
    const x = h => L + ((h - lo) / (hi - lo)) * PW;
    const svg = $("chart"); svg.textContent = "";
    svg.setAttribute("viewBox", `0 0 ${W} ${HGT}`);
    const step = hi - lo > 18 ? 6 : 4;
    for (let h = Math.ceil(lo / step) * step; h <= hi; h += step) {
      svg.appendChild(el("line", { class: "grid", x1: x(h), x2: x(h), y1: T - 4, y2: HGT - 6 }));
      svg.appendChild(el("text", { x: x(h), y: 12, "text-anchor": "middle" }, `${((h % 24) + 24) % 24}時`));
    }
    $("chartEmpty").hidden = all.length > 0;
    const desc = [];
    rows.forEach((r, i) => {
      const y = T + i * RH;
      svg.appendChild(el("text", { class: "day", x: 4, y: y + 19 }, dayName(r.d)));
      svg.appendChild(el("rect", { class: "none", x: L, y: y + 6, width: PW, height: 18, rx: 9 }));
      let tot = 0;
      for (const e of r.list) {
        const a = Math.max(lo, (e.bed - r.d) / H), b = Math.min(hi, (e.wake - r.d) / H);
        const rect = el("rect", { class: fcls(e), x: x(a), y: y + 6, width: Math.max(4, x(b) - x(a)), height: 18, rx: 9 });
        rect.appendChild(el("title", {}, `${hm(e.bed)}〜${hm(e.wake)}（${dur(e.wake - e.bed)}）`));
        svg.appendChild(rect); tot += e.wake - e.bed;
      }
      svg.appendChild(el("text", { x: W - 4, y: y + 19, "text-anchor": "end" }, r.list.length ? dur(tot) : "—"));
      desc.push(`${dayName(r.d)}：${r.list.length ? r.list.map(e => `${hm(e.bed)}から${hm(e.wake)}まで`).join("、") + `、合計${dur(tot)}` : "記録なし"}`);
    });
    const beds = all.map(e => bedMin(e.bed));
    if (beds.length) {
      const avgH = (mean(beds) + 720) / 60 - 24; // hours relative to wake-day midnight
      if (avgH >= lo && avgH <= hi) {
        svg.appendChild(el("line", { class: "avg", x1: x(avgH), x2: x(avgH), y1: T, y2: HGT - 6 }));
      }
    }
    $("chartDesc").textContent = desc.join("。");
    renderStats(all);
    renderTips(all);
  }

  function stat(label, value, unit) {
    const d = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    if (unit) { const s = document.createElement("small"); s.textContent = unit; dd.appendChild(s); }
    d.append(dt, dd); return d;
  }
  // total sleep per wake-day, so a nap does not count as a separate short night
  function nights(all) {
    const m = new Map();
    for (const e of all) { const k = midnight(e.wake); m.set(k, (m.get(k) || 0) + (e.wake - e.bed)); }
    return [...m.values()];
  }
  function renderStats(all) {
    const box = $("stats"); box.textContent = "";
    if (!all.length) { box.append(stat("平均の睡眠時間", "—"), stat("平均の寝る時刻", "—"), stat("寝る時刻のばらつき", "—"), stat("記録した日", "0", "日")); return; }
    const n = nights(all), beds = all.map(e => bedMin(e.bed));
    box.append(
      stat("平均の睡眠時間", dur(mean(n))),
      stat("平均の寝る時刻", clockOf(mean(beds) + 720), "（点線）"),
      stat("寝る時刻のばらつき", beds.length > 1 ? `±${Math.round(sd(beds))}` : "—", beds.length > 1 ? "分" : ""),
      stat("記録した日", String(n.length), "日")
    );
  }

  function renderTips(all) {
    const ul = $("tips"); ul.textContent = "";
    const add = (t, cls) => { const li = document.createElement("li"); li.textContent = t; if (cls) li.className = cls; ul.appendChild(li); };
    const nd = nights(all).length;
    if (nd < 3) { add(`この週の記録が3日分たまると、眠りに合わせたヒントが出ます（あと${3 - nd}日）。`, "wait"); return; }
    const n = nights(all), avg = mean(n) / H, beds = all.map(e => bedMin(e.bed)), wakes = all.map(e => wakeMin(e.wake));
    const avgBed = mean(beds) + 720; // minutes since midnight of the evening, may exceed 1440
    let k = 0;
    if (avg < 6) { add(`平均の睡眠が${dur(mean(n))}で、6時間を切っています。厚生労働省の「健康づくりのための睡眠ガイド2023」では、大人は6時間以上が目安です。まずは寝る時刻を15分早めてみてください。`); k++; }
    else if (avg > 9.5) { add(`平均の睡眠が${dur(mean(n))}と長めです。寝床で長く過ごしすぎると、眠りが浅くなることがあります。眠くなってから布団に入るのも一つの方法です。`); k++; }
    if (beds.length >= 3 && sd(beds) > 60) { add(`寝る時刻が日によって1時間以上ばらついています（±${Math.round(sd(beds))}分）。まずは起きる時刻を毎日そろえると、寝る時刻もそろいやすくなります。`); k++; }
    else if (wakes.length >= 3 && sd(wakes) > 60) { add(`起きる時刻のばらつきが±${Math.round(sd(wakes))}分あります。休みの日も平日との差を1時間ほどに抑えると、体内時計が乱れにくくなります。`); k++; }
    const wk = all.filter(e => { const g = new Date(e.wake).getDay(); return g > 0 && g < 6; }).map(e => wakeMin(e.wake));
    const we = all.filter(e => { const g = new Date(e.wake).getDay(); return g === 0 || g === 6; }).map(e => wakeMin(e.wake));
    if (wk.length >= 2 && we.length >= 1 && mean(we) - mean(wk) >= 120) { add(`休日の起床が平日より${dur((mean(we) - mean(wk)) * M)}遅くなっています。「社会的時差ぼけ」と呼ばれる状態で、週明けがつらくなりがちです。差を少しずつ縮めていくと楽になります。`); k++; }
    if (avgBed >= 1440 + 60) { add(`寝る時刻の平均が${clockOf(avgBed)}と遅めです。寝る1時間前からスマホの画面を見る時間を減らし、部屋の明かりを落とすと寝つきやすくなります。`); k++; }
    const good = all.filter(e => e.feel === 2), bad = all.filter(e => e.feel === 0);
    if (good.length && bad.length) {
      const g = mean(good.map(e => e.wake - e.bed)), b = mean(bad.map(e => e.wake - e.bed));
      if (g - b >= 45 * M) { add(`「眠い」朝は、「ぐっすり」の朝より平均${dur(g - b)}短く眠っています。${dur(g)}くらい眠るのが合っていそうです。`); k++; }
    }
    if (!k) add(`睡眠時間も寝る時刻も安定しています。平均${dur(mean(n))}、寝る時刻はだいたい${clockOf(avgBed)}です。`);
  }
  $("prevWeek").addEventListener("click", () => { weekBack++; renderWeek(); });
  $("nextWeek").addEventListener("click", () => { weekBack = Math.max(0, weekBack - 1); renderWeek(); });

  // ---------- log + edit ----------
  let editId = null;
  const toLocal = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromLocal = v => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || ""); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN; };
  function openEdit(e) {
    editId = e ? e.id : null;
    $("editTitle").textContent = e ? "記録を編集" : "記録を追加";
    const now = new Date(); now.setSeconds(0, 0);
    const wake = e ? e.wake : (now.getHours() < 12 ? now.getTime() : midnight(now.getTime()) + 7 * H);
    const bed = e ? e.bed : wake - 7 * H - 30 * M;
    $("inBed").value = toLocal(bed); $("inWake").value = toLocal(wake);
    renderEditFeels(e && e.fc ? "c:" + e.fc : e && e.feel != null ? String(e.feel) : "");
    $("err").textContent = ""; $("edit").hidden = false; $("inBed").focus();
  }
  $("addBtn").addEventListener("click", () => openEdit(null));
  $("editCancel").addEventListener("click", () => { $("edit").hidden = true; $("addBtn").focus(); });
  $("edit").addEventListener("submit", ev => {
    ev.preventDefault();
    const bed = fromLocal($("inBed").value), wake = fromLocal($("inWake").value);
    const fr = document.querySelector("input[name=feel]:checked");
    const fv = fr ? fr.value : "";
    const fc = fv.startsWith("c:") ? fv.slice(2) : null;
    const feel = fv !== "" && !fc ? Number(fv) : null;
    if (!isFinite(bed) || !isFinite(wake)) { $("err").textContent = "寝た時刻と起きた時刻を入れてください。"; return; }
    if (wake <= bed) { $("err").textContent = "起きた時刻は、寝た時刻より後にしてください。"; return; }
    if (wake - bed > 20 * H) { $("err").textContent = "20時間を超える記録は入れられません。日付を確かめてください。"; return; }
    if (S.entries.some(e => e.id !== editId && e.bed < wake && bed < e.wake)) { $("err").textContent = "ほかの記録と時間が重なっています。時刻を確かめてください。"; return; }
    if (editId) { const x = S.entries.find(e => e.id === editId); Object.assign(x, { bed, wake, feel }); if (fc) x.fc = fc; else delete x.fc; }
    else S.entries.push(fc ? { id: uid(), bed, wake, feel, fc } : { id: uid(), bed, wake, feel });
    save(); $("edit").hidden = true; weekBack = Math.max(0, Math.floor((midnight(Date.now()) - midnight(wake)) / DAY / 7));
    renderAll();
  });
  // 編集フォームの「目覚め」。自分で入れた言葉も選べる
  function renderEditFeels(val) {
    const box = $("feelMine"); box.textContent = "";
    const fixed = document.querySelectorAll("#feelSet > .r input");
    fixed.forEach(r => { r.checked = r.value === val; });
    const names = myFeels.all();
    if (val.startsWith("c:") && !names.includes(val.slice(2))) names.push(val.slice(2)); // 候補から外した言葉の記録も、そのまま編集できる
    for (const name of names) {
      const lab = document.createElement("label"); lab.className = "r";
      const inp = document.createElement("input"); inp.type = "radio"; inp.name = "feel"; inp.value = "c:" + name; inp.checked = val === inp.value;
      lab.append(inp, document.createTextNode(name));
      box.append(myFeels.has(name) ? wrapCustom(lab, name, () => { const cur = document.querySelector("input[name=feel]:checked"); myFeels.remove(name); renderEditFeels(cur ? cur.value : ""); }) : lab);
    }
    const a = FC.adder({ label: "＋ 自分で入力", aria: "目覚めを入力", placeholder: "例：頭が重い", max: 12, ok: "追加", btnClass: "pill add",
      empty: "目覚めの様子を入れてから「追加」を押してください。",
      submit: v => { const i = FEEL.indexOf(v); if (i >= 0) { renderEditFeels(String(i)); return; } myFeels.add(v); renderEditFeels("c:" + v); const n = $("feelMine").querySelector(".fc-add"); if (n) n.focus(); } });
    box.append(a.btn, a.form);
  }
  function renderLog() {
    const ol = $("log"); ol.textContent = "";
    const list = sorted().slice(0, 21);
    for (const e of list) {
      const li = document.createElement("li");
      const dot = document.createElement("span"); dot.className = "dot " + fcls(e);
      const d = document.createElement("span"); d.className = "d"; d.textContent = `${dayName(e.wake)} ${dur(e.wake - e.bed)}`;
      const t = document.createElement("span"); t.className = "t"; t.textContent = `${hm(e.bed)}〜${hm(e.wake)}・${feelText(e)}`;
      const acts = document.createElement("span"); acts.className = "acts";
      const ed = document.createElement("button"); ed.type = "button"; ed.textContent = "編集"; ed.setAttribute("aria-label", `${dayName(e.wake)}の記録を編集`);
      ed.addEventListener("click", () => openEdit(e));
      const rm = document.createElement("button"); rm.type = "button"; rm.textContent = "削除"; rm.setAttribute("aria-label", `${dayName(e.wake)}の記録を削除`);
      rm.addEventListener("click", () => { if (!confirm(`${dayName(e.wake)}の記録を削除しますか？`)) return; S.entries = S.entries.filter(x => x.id !== e.id); if (S.rateId === e.id) S.rateId = null; save(); renderAll(); });
      acts.append(ed, rm); li.append(dot, d, acts, t); ol.appendChild(li);
    }
    $("logEmpty").hidden = list.length > 0;
  }

  function renderAll() { renderNow(); renderWeek(); renderLog(); }
  renderAll();
})();
