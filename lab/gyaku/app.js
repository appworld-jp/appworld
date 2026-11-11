// 出発から逆算タイマー — データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "gyaku.v1";
  const MIN = 60000;
  const TEMPLATES = [
    { name: "朝の支度", mode: "leave", time: "08:00", steps: [["起きる・顔を洗う", 5], ["朝ご飯", 15], ["歯磨き", 5], ["着替え", 10], ["髪・メイク", 15], ["持ち物チェック", 5]] },
    { name: "子どもの登園", mode: "leave", time: "08:15", steps: [["子どもを起こす", 5], ["朝ご飯", 20], ["着替え", 10], ["歯磨き・トイレ", 10], ["連絡帳と持ち物", 5], ["靴と上着", 5]] },
    { name: "出張の日", mode: "leave", time: "06:30", steps: [["起きる", 5], ["シャワー", 15], ["身支度", 15], ["朝ご飯", 10], ["荷物の最終チェック", 5], ["戸締まり・火の元", 5]] },
    { name: "待ち合わせ", mode: "arrive", time: "13:00", steps: [["着替え", 15], ["身支度", 15], ["持ち物チェック", 5], ["移動", 40]] },
    { name: "新しい段取り", mode: "leave", time: "09:00", steps: [["支度", 15]] }
  ];
  const pad = n => String(n).padStart(2, "0");
  const hm = d => `${d.getHours()}:${pad(d.getMinutes())}`;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isTime = s => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fromTpl = t => ({ id: uid(), name: t.name, mode: t.mode, time: t.time, steps: t.steps.map(([name, min]) => ({ id: uid(), name, min })) });

  let st = null;
  function valid(v) {
    if (!v || !Array.isArray(v.routines)) return null;
    const routines = [];
    v.routines.slice(0, 50).forEach(r => {
      if (!r || typeof r.name !== "string" || !Array.isArray(r.steps)) return;
      const steps = r.steps.slice(0, 40).filter(s => s && typeof s.name === "string").map(s => ({ id: typeof s.id === "string" ? s.id.slice(0, 40) : uid(), name: s.name.slice(0, 24), min: Math.min(240, Math.max(1, Math.round(+s.min) || 5)) }));
      routines.push({ id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : uid(), name: r.name.trim().slice(0, 20) || "段取り", mode: r.mode === "arrive" ? "arrive" : "leave", time: isTime(r.time) ? r.time : "08:00", steps });
    });
    if (!routines.length) return null;
    let run = null;
    const rr = v.run;
    if (rr && routines.some(r => r.id === rr.rid) && Number.isFinite(rr.target) && Number.isInteger(rr.i) && Number.isFinite(rr.stepStart) && Array.isArray(rr.plan)) run = rr;
    return { routines, cur: routines.some(r => r.id === v.cur) ? v.cur : routines[0].id, chime: !!v.chime, run };
  }
  try { st = valid(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) {}
  if (!st) st = { routines: [fromTpl(TEMPLATES[0])], cur: null, chime: false, run: null, fresh: true };
  if (!st.cur) st.cur = st.routines[0].id;
  function save() {
    try { const { fresh, ...o } = st; localStorage.setItem(KEY, JSON.stringify(o)); }
    catch (e) { toast("保存できませんでした。ブラウザの設定で、サイトのデータ保存を許可してください。"); }
  }
  const snapshot = () => JSON.stringify(st);
  const R = () => st.routines.find(r => r.id === st.cur) || st.routines[0];
  const finalWord = r => (r.mode === "arrive" ? "到着" : "出発");

  // 目標の日時：時刻がもう3時間以上前なら明日、それ以外は今日（少し過ぎているなら「おくれ」になる）
  function targetDate(time, now) {
    const [h, m] = time.split(":").map(Number);
    const t = new Date(now); t.setHours(h, m, 0, 0);
    if (now - t > 3 * 60 * MIN) t.setDate(t.getDate() + 1);
    return t;
  }
  // 各ステップの開始時刻（ミリ秒）
  function schedule(steps, target) {
    const out = []; let t = +target;
    for (let i = steps.length - 1; i >= 0; i--) { t -= steps[i].min * MIN; out[i] = t; }
    return out;
  }
  const total = steps => steps.reduce((s, x) => s + x.min, 0);

  // ---- 計画の画面 ----
  function renderPlan() {
    const r = R();
    const nav = $("routines"); nav.textContent = "";
    st.routines.forEach(x => {
      const b = el("button", "rt", x.name); b.type = "button";
      if (x.id === r.id) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => { st.cur = x.id; save(); renderPlan(); });
      nav.append(b);
    });
    const add = el("button", "rt plus", "＋ 新規"); add.type = "button";
    add.addEventListener("click", () => { $("templates").hidden = false; renderTpl(); $("tpl-list").querySelector("button").focus(); });
    nav.append(add);

    $("mode-leave").setAttribute("aria-checked", r.mode === "leave" ? "true" : "false");
    $("mode-arrive").setAttribute("aria-checked", r.mode === "arrive" ? "true" : "false");
    if (document.activeElement !== $("tgt")) $("tgt").value = r.time;
    $("r-name").value = r.name;
    const ol = $("steps"); ol.textContent = "";
    const target = targetDate(r.time, new Date());
    const sch = schedule(r.steps, target);
    r.steps.forEach((s, i) => {
      const li = el("li", "step"); li.dataset.id = s.id;
      li.append(el("span", "at", hm(new Date(sch[i]))));
      const nm = el("input", "sn"); nm.value = s.name; nm.maxLength = 24; nm.placeholder = "やること"; nm.setAttribute("aria-label", `${i + 1}番目のやること`); nm.autocomplete = "off";
      nm.addEventListener("input", () => { s.name = nm.value; save(); });
      nm.addEventListener("change", () => { s.name = nm.value.trim(); nm.value = s.name; save(); });
      const dur = el("div", "dur");
      const minus = el("button", "st-b", "−"); minus.type = "button"; minus.setAttribute("aria-label", `${s.name || "このやること"}を1分減らす`);
      const v = el("input", "dv"); v.inputMode = "numeric"; v.value = String(s.min); v.setAttribute("aria-label", `${s.name || "このやること"}の分数`);
      const plus = el("button", "st-b", "＋"); plus.type = "button"; plus.setAttribute("aria-label", `${s.name || "このやること"}を1分増やす`);
      const setMin = n => { s.min = Math.min(240, Math.max(1, n)); save(); renderPlan(); focusIn(s.id, ".dv"); };
      minus.addEventListener("click", () => { s.min = Math.max(1, s.min - (s.min > 10 ? 5 : 1)); save(); renderPlan(); focusIn(s.id, ".st-b"); });
      plus.addEventListener("click", () => { s.min = Math.min(240, s.min + (s.min >= 10 ? 5 : 1)); save(); renderPlan(); focusIn(s.id, ".st-b:last-of-type"); });
      v.addEventListener("change", () => {
        const n = Number(v.value.normalize("NFKC").replace(/分/g, "").trim());
        if (!Number.isInteger(n) || n < 1 || n > 240) { $("steps-err").textContent = "時間は1〜240分の数字で入れてください。"; v.value = String(s.min); return; }
        $("steps-err").textContent = ""; setMin(n);
      });
      dur.append(minus, v, el("span", "u", "分"), plus);
      const tools = el("div", "tools");
      const up = el("button", "tb", "↑"); up.type = "button"; up.setAttribute("aria-label", `${s.name || "このやること"}を前へ`); up.disabled = i === 0;
      const dn = el("button", "tb", "↓"); dn.type = "button"; dn.setAttribute("aria-label", `${s.name || "このやること"}を後ろへ`); dn.disabled = i === r.steps.length - 1;
      const rm = el("button", "tb rm", "×"); rm.type = "button"; rm.setAttribute("aria-label", `${s.name || "このやること"}を削除`);
      up.addEventListener("click", () => { r.steps.splice(i - 1, 0, r.steps.splice(i, 1)[0]); save(); renderPlan(); focusIn(s.id, i - 1 === 0 ? ".tb:nth-child(2)" : ".tb"); });
      dn.addEventListener("click", () => { r.steps.splice(i + 1, 0, r.steps.splice(i, 1)[0]); save(); renderPlan(); focusIn(s.id, i + 1 === r.steps.length - 1 ? ".tb" : ".tb:nth-child(2)"); });
      rm.addEventListener("click", () => { const snap = snapshot(); r.steps.splice(i, 1); save(); renderPlan(); toast(`「${s.name || "やること"}」を削除しました。`, snap); });
      tools.append(up, dn, rm);
      li.append(nm, dur, tools);
      ol.append(li);
    });
    const end = el("li", "step end"); end.append(el("span", "at", hm(target)), el("span", "endw", finalWord(r)));
    ol.append(end);
    const sa = $("startat");
    if (!r.steps.length) sa.textContent = "やることを追加してください。";
    else {
      const first = new Date(sch[0]), now = new Date();
      const tomorrow = target.getDate() !== now.getDate();
      sa.textContent = `${tomorrow ? "明日の" : ""}${hm(first)}に始めれば、${hm(target)}に${r.mode === "arrive" ? "着けます" : "出られます"}（${fmtDur(total(r.steps))}）`;
      sa.classList.toggle("late", first < now && !tomorrow);
      if (first < now && !tomorrow) sa.textContent += "。もう始める時刻を過ぎています。";
    }
  }
  function fmtDur(m) { return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`; }
  function focusIn(id, sel) { const li = document.querySelector(`.step[data-id="${CSS.escape(id)}"]`); const f = li && li.querySelector(sel); if (f && !f.disabled) f.focus(); }

  function renderTpl() {
    const box = $("tpl-list"); box.textContent = "";
    TEMPLATES.forEach(t => {
      const b = el("button", "tpl"); b.type = "button";
      b.append(el("b", null, t.name), el("small", null, t.steps.length > 1 ? `${t.steps.map(s => s[0]).slice(0, 3).join("、")}…（${fmtDur(t.steps.reduce((s, x) => s + x[1], 0))}）` : "やることを自分で入力"));
      b.addEventListener("click", () => {
        const r = fromTpl(t);
        if (st.routines.some(x => x.name === r.name)) { let n = 2; while (st.routines.some(x => x.name === `${t.name}${n}`)) n++; r.name = `${t.name}${n}`; }
        st.routines.push(r); st.cur = r.id; save(); $("templates").hidden = true; renderPlan();
        toast(`「${r.name}」を作りました。時刻と時間を自分に合わせてください。`);
      });
      box.append(b);
    });
  }
  $("tpl-close").addEventListener("click", () => { $("templates").hidden = true; });
  $("mode-leave").addEventListener("click", () => { R().mode = "leave"; save(); renderPlan(); });
  $("mode-arrive").addEventListener("click", () => { R().mode = "arrive"; save(); renderPlan(); });
  $("tgt").addEventListener("change", () => {
    const v = $("tgt").value;
    if (!isTime(v)) { $("tgt-err").textContent = "時刻を入れてください（例：8:00）。"; return; }
    $("tgt-err").textContent = ""; R().time = v; save(); renderPlan();
  });
  $("add-step").addEventListener("click", () => {
    const r = R(); if (r.steps.length >= 40) { $("steps-err").textContent = "やることは40個までです。"; return; }
    const s = { id: uid(), name: "", min: 5 }; r.steps.push(s); save(); renderPlan(); focusIn(s.id, ".sn");
  });
  $("r-name").addEventListener("change", () => { const v = $("r-name").value.trim(); if (v) { R().name = v.slice(0, 20); save(); } renderPlan(); });
  $("r-del").addEventListener("click", () => {
    const r = R(), snap = snapshot();
    st.routines = st.routines.filter(x => x !== r);
    if (!st.routines.length) st.routines.push(fromTpl(TEMPLATES[0]));
    st.cur = st.routines[0].id; save(); renderPlan();
    toast(`「${r.name}」を削除しました。`, snap);
  });

  // ---- 実行 ----
  let tick = null, lastBoundary = -1, wake = null;
  $("go").addEventListener("click", () => {
    const r = R(); $("steps-err").textContent = "";
    r.steps.forEach(s => { s.name = s.name.trim(); });
    if (!r.steps.length) { $("steps-err").textContent = "やることを1つ以上入れてください。"; return; }
    const empty = r.steps.findIndex(s => !s.name);
    if (empty >= 0) { $("steps-err").textContent = `${empty + 1}番目のやることに名前を入れてください。`; focusIn(r.steps[empty].id, ".sn"); return; }
    const now = Date.now();
    const target = +targetDate(r.time, new Date(now));
    st.run = { rid: r.id, target, i: 0, stepStart: now, started: now, plan: r.steps.map(s => ({ name: s.name, min: s.min })) };
    save(); unlockAudio(); startRun();
  });
  function startRun() {
    lastBoundary = boundaries(); show("run"); renderRun();
    clearInterval(tick); tick = setInterval(renderRun, 500);
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(w => { wake = w; }).catch(() => {}); } catch (e) {}
  }
  function stopRun() {
    clearInterval(tick); tick = null; st.run = null; save();
    try { if (wake) wake.release(); } catch (e) {} wake = null;
  }
  function boundaries() {
    const run = st.run; if (!run) return 0;
    const sch = schedule(run.plan, run.target), now = Date.now();
    return sch.filter(t => t <= now).length + (run.target <= now ? 1 : 0);
  }
  function margin(run, now) {
    const cur = run.plan[run.i];
    const rem = Math.max(0, cur.min * MIN - (now - run.stepStart)) + run.plan.slice(run.i + 1).reduce((s, x) => s + x.min * MIN, 0);
    return run.target - now - rem;
  }
  const mmss = ms => { const s = Math.max(0, Math.floor(Math.abs(ms) / 1000)); const h = Math.floor(s / 3600); return h ? `${h}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  function statusText(m) {
    if (m <= -30000) return { t: `${Math.max(1, Math.round(-m / MIN))}分遅れ`, c: "late" };
    if (m >= 30000) return { t: `${Math.max(1, Math.round(m / MIN))}分余裕`, c: "ahead" };
    return { t: "予定どおり", c: "on" };
  }
  function renderRun() {
    const run = st.run; if (!run) return;
    const r = st.routines.find(x => x.id === run.rid) || R();
    const now = Date.now();
    const sch = schedule(run.plan, run.target);
    const cur = run.plan[run.i];
    const tgt = new Date(run.target);
    const left = run.target - now;
    $("dep").textContent = left >= 0 ? `${hm(tgt)} ${finalWord(r)}まで あと${mmss(left)}` : `${hm(tgt)} ${finalWord(r)}の時刻を${mmss(left)}過ぎています`;
    $("now").textContent = cur.name;
    const nextT = run.i + 1 < run.plan.length ? sch[run.i + 1] : run.target;
    const nextName = run.i + 1 < run.plan.length ? run.plan[run.i + 1].name : finalWord(r);
    const d = nextT - now;
    $("cd").textContent = "";
    const cdNum = el("span", "cd-num" + (d < 0 ? " over" : ""), (d < 0 ? "+" : "") + mmss(d));
    $("cd").append(el("span", "cd-l", d >= 0 ? `「${nextName}」の${hm(new Date(nextT))}まで` : `「${nextName}」の${hm(new Date(nextT))}を過ぎています`), cdNum);
    const s = statusText(margin(run, now));
    if ($("status").textContent !== s.t) $("status").textContent = s.t;
    $("status").className = "status " + s.c;
    // 進みぐあい
    const segs = $("segs");
    if (segs.childElementCount !== run.plan.length) {
      segs.textContent = "";
      run.plan.forEach(p => { const g = el("span", "seg"); g.style.flexGrow = String(p.min); segs.append(g); });
    }
    [...segs.children].forEach((g, i) => { g.className = "seg" + (i < run.i ? " done" : i === run.i ? " cur" : ""); });
    const span = run.target - sch[0];
    $("needle").style.left = Math.max(0, Math.min(100, ((now - sch[0]) / span) * 100)) + "%";
    // この先
    const rows = $("rows"); rows.textContent = "";
    run.plan.forEach((p, i) => {
      if (i < run.i) return;
      const li = el("li", i === run.i ? "cur" : "");
      li.append(el("span", "rt-at", hm(new Date(sch[i]))), el("span", "rt-n", p.name), el("span", "rt-m", p.min + "分"));
      rows.append(li);
    });
    const fin = el("li", "fin"); fin.append(el("span", "rt-at", hm(tgt)), el("span", "rt-n", finalWord(r)), el("span", "rt-m", "")); rows.append(fin);
    $("next").textContent = run.i + 1 < run.plan.length ? `できた → ${run.plan[run.i + 1].name}` : `できた → ${finalWord(r)}`;
    // 時刻の区切りでチャイム
    const b = boundaries();
    if (b > lastBoundary) {
      lastBoundary = b;
      const idx = sch.filter(t => t <= now).length;
      const msg = run.target <= now ? `${finalWord(r)}の時刻です` : `「${run.plan[idx - 1].name}」を始める時刻です`;
      flash(msg); chime(run.target <= now ? 3 : 2);
    }
  }
  function flash(msg) {
    const f = $("flash"); f.textContent = msg; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
    clearTimeout(f._t); f._t = setTimeout(() => { f.classList.remove("on"); f.textContent = ""; }, 8000);
  }
  $("next").addEventListener("click", () => {
    const run = st.run; if (!run) return;
    const now = Date.now();
    if (run.i + 1 < run.plan.length) { run.i++; run.stepStart = now; save(); renderRun(); }
    else finish(now);
  });
  function finish(now) {
    const run = st.run; const r = st.routines.find(x => x.id === run.rid) || R();
    const diff = run.target - now;
    stopRun(); show("done");
    $("done-h").textContent = `${finalWord(r)}！`;
    $("done-sub").textContent = diff >= MIN ? `予定より${Math.floor(diff / MIN)}分早く終わりました。いってらっしゃい。` : diff <= -MIN ? `予定より${Math.ceil(-diff / MIN)}分遅れました。次は少し早めに始めると安心です。` : "ぴったりです。いってらっしゃい。";
    chime(3);
    $("done-back").focus();
  }
  $("stop").addEventListener("click", () => { stopRun(); show("plan"); toast("タイマーを止めました。"); });
  $("done-back").addEventListener("click", () => show("plan"));

  // ---- チャイム（タップしてから鳴らせる） ----
  let ac = null;
  function unlockAudio() {
    if (!st.chime) return;
    try { const A = window.AudioContext || window.webkitAudioContext; if (!ac && A) ac = new A(); if (ac && ac.state === "suspended") ac.resume(); } catch (e) {}
  }
  function chime(n) {
    if (!st.chime || !ac) return;
    try {
      const notes = n >= 3 ? [659.25, 523.25, 783.99] : [659.25, 523.25];
      notes.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.45;
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.start(t); o.stop(t + 1.2);
      });
    } catch (e) {}
  }
  document.addEventListener("pointerdown", () => { if (st.run) unlockAudio(); });
  function renderChime() { $("chime").setAttribute("aria-pressed", st.chime ? "true" : "false"); $("chime").textContent = st.chime ? "チャイム オン" : "チャイム オフ"; }
  $("chime").addEventListener("click", () => { st.chime = !st.chime; save(); renderChime(); unlockAudio(); if (st.chime) chime(1); });

  function show(v) {
    $("plan").hidden = v !== "plan"; $("run").hidden = v !== "run"; $("done").hidden = v !== "done";
    document.body.className = "v-" + v;
    if (v === "plan") renderPlan();
    renderChime();
    window.scrollTo(0, 0);
  }

  // ---- 書き出し・読みこみ ----
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  $("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "gyaku", version: 1, exported: new Date().toISOString(), routines: st.routines }, null, 1)], { type: "application/json" });
    const a = el("a"); a.href = URL.createObjectURL(blob); a.download = `gyaku-${ymd(new Date())}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("ファイルに書き出しました。新しい端末で「ファイルを読み込む」から開いてください。");
  });
  $("import").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; $("move-err").textContent = "";
    if (!f) return;
    try {
      if (f.size > 2e6) throw 0;
      const raw = JSON.parse(await f.text());
      if (raw.app && raw.app !== "gyaku") throw 0;
      const v = valid({ routines: raw.routines }); if (!v) throw 0;
      const snap = snapshot(); st.routines = v.routines; st.cur = v.routines[0].id; save(); renderPlan();
      toast(`${v.routines.length}件の段取りを読み込みました。`, snap);
    } catch (x) { $("move-err").textContent = "読み込めませんでした。このアプリで書き出したファイル（.json）を選んでください。"; }
  });

  // ---- トースト ----
  let tT = null, undoSnap = null;
  function toast(msg, snap) {
    $("toast-t").textContent = msg; undoSnap = snap || null;
    $("toast-undo").hidden = !snap; $("toast").classList.add("on");
    clearTimeout(tT); tT = setTimeout(() => { $("toast").classList.remove("on"); undoSnap = null; }, snap ? 6000 : 3500);
  }
  $("toast-undo").addEventListener("click", () => {
    if (!undoSnap) return; st = JSON.parse(undoSnap); undoSnap = null; save(); renderPlan();
    $("toast").classList.remove("on"); setTimeout(() => toast("元に戻しました。"), 50);
  });

  // 実行中だったら続きから（目標から6時間以上たっていたら終わりにする）
  if (st.run && Date.now() - st.run.target < 6 * 60 * MIN) startRun();
  else { st.run = null; show("plan"); }
  setInterval(() => { if (!st.run && !$("plan").hidden && document.activeElement && !document.activeElement.matches("input")) renderPlan(); }, 30000);
})();
