(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "bugdrill.v1";
  const P = window.BUG_PUZZLES || [];
  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dayKey(new Date());
  const prevDay = k => { const [y, m, d] = k.split("-").map(Number); return dayKey(new Date(y, m - 1, d - 1)); };

  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.res) return Object.assign({ res: {}, daily: [], pick: null }, o); } catch (e) { /* ignore */ }
    return { res: {}, daily: [], pick: null };
  }
  const S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  // today's puzzle: fixed for the day, skipping ones already answered in practice
  function dailyId() {
    if (S.pick && S.pick.day === today() && P.some(p => p.id === S.pick.id)) return S.pick.id;
    const d = new Date(), n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const base = (n * 17) % P.length;
    let id = P[base].id;
    for (let i = 0; i < P.length; i++) { const p = P[(base + i) % P.length]; if (!S.res[p.id]) { id = p.id; break; } }
    S.pick = { day: today(), id }; save();
    return id;
  }
  function streak() {
    const set = new Set(S.daily);
    let k = today(); if (!set.has(k)) k = prevDay(k);
    let n = 0; while (set.has(k)) { n++; k = prevDay(k); }
    return n;
  }

  function renderScore() {
    const done = P.filter(p => S.res[p.id]), ok = done.filter(p => S.res[p.id].ok).length;
    const box = $("score"); box.textContent = "";
    [["連続", streak() + "日"], ["解いた", `${done.length}/${P.length}`], ["正解率", done.length ? Math.round(ok / done.length * 100) + "%" : "—"]].forEach(([a, b]) => {
      const d = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = a; dd.textContent = b; d.append(dt, dd); box.appendChild(d);
    });
  }

  let cur = null;
  function showPuzzle(id, focus) {
    cur = P.find(p => p.id === id) || P[0];
    const n = P.indexOf(cur) + 1, isDaily = cur.id === dailyId();
    const js = cur.lang === "JavaScript";
    $("qLang").textContent = cur.lang; $("qLang").className = "lang " + (js ? "js" : "py");
    $("qNo").textContent = (isDaily ? "今日の1問・" : "練習・") + `第${n}問`;
    $("qTitle").textContent = cur.title;
    const code = $("code"); code.textContent = "";
    const lines = cur.code.split("\n");
    lines.forEach((line, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "ln"; b.dataset.i = i;
      const no = document.createElement("span"); no.className = "no"; no.textContent = i + 1; no.setAttribute("aria-hidden", "true");
      const tx = document.createElement("span"); tx.className = "tx"; tx.textContent = line || " ";
      b.setAttribute("aria-label", `${i + 1}行目：${line.trim() || "空行"}`);
      b.append(no, tx);
      b.addEventListener("click", () => answer(i));
      code.appendChild(b);
    });
    const r = S.res[cur.id];
    if (r) reveal(r.line, false); else { $("result").hidden = true; code.classList.remove("done"); $("ask").classList.remove("good"); $("ask").textContent = "バグのある行を1つ選んでください。"; }
    $("tabToday").setAttribute("aria-pressed", String(isDaily));
    if (focus) $("qTitle").scrollIntoView({ block: "start", behavior: "auto" });
  }

  const accepted = p => p.ok || [p.bug];
  function answer(i) {
    if (!cur || S.res[cur.id]) return;
    const ok = accepted(cur).includes(i);
    S.res[cur.id] = { ok, line: i, day: today() };
    if (cur.id === dailyId() && !S.daily.includes(today())) S.daily.push(today());
    save(); reveal(i, true); renderScore();
  }
  function reveal(pick, fresh) {
    const code = $("code"); code.classList.add("done");
    const ok = accepted(cur).includes(pick);
    code.querySelectorAll(".ln").forEach(b => {
      const i = Number(b.dataset.i);
      b.classList.toggle("bug", i === cur.bug);
      b.classList.toggle("pick", i === pick);
      b.classList.toggle("right", ok && i === pick);
      b.setAttribute("aria-disabled", "true");
    });
    $("ask").textContent = `あなたの答え：${pick + 1}行目`;
    $("ask").classList.toggle("good", ok);
    const res = $("result"); res.hidden = false; res.classList.toggle("ok", ok);
    $("verdict").textContent = ok ? (fresh ? "正解！" : "正解済みの問題です") : `残念！バグは${cur.bug + 1}行目でした`;
    const hk = $("hanko"); hk.textContent = ok ? "正解" : "復習"; hk.classList.toggle("ok", ok);
    hk.classList.remove("press"); if (fresh) { void hk.offsetWidth; hk.classList.add("press"); }
    $("why").textContent = cur.why;
    $("fix").textContent = cur.fix;
    $("incident").textContent = cur.incident;
    const rest = P.filter(p => !S.res[p.id]).length;
    $("nextBtn").textContent = rest ? (cur.id === dailyId() ? "もう1問解く" : "次の問題") : "全問解きました！一覧へ";
    if (fresh) $("verdict").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  $("nextBtn").addEventListener("click", () => {
    const start = P.indexOf(cur);
    for (let k = 1; k <= P.length; k++) { const p = P[(start + k) % P.length]; if (!S.res[p.id]) { show("q"); showPuzzle(p.id, true); $("code").querySelector(".ln").focus(); return; } }
    show("list");
  });

  function renderList() {
    const ol = $("qlist"); ol.textContent = "";
    const d = dailyId();
    P.forEach((p, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button"); b.type = "button"; if (p.id === d) b.className = "today";
      const r = S.res[p.id];
      const mk = document.createElement("span"); mk.className = "mk" + (r ? (r.ok ? " ok" : " ng") : ""); mk.textContent = r ? (r.ok ? "○" : "×") : "";
      const t = document.createElement("span"); t.className = "t"; t.textContent = p.title;
      const m = document.createElement("span"); m.className = "m"; m.textContent = `第${i + 1}問・${p.lang}`;
      b.setAttribute("aria-label", `第${i + 1}問 ${p.title}（${p.lang}）${r ? (r.ok ? "正解" : "不正解") : "未回答"}${p.id === d ? "、今日の1問" : ""}`);
      b.append(mk, t, m);
      b.addEventListener("click", () => { show("q"); showPuzzle(p.id, true); });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  $("reset").addEventListener("click", () => {
    if (!confirm("成績と連続日数をリセットしますか？元に戻せません。")) return;
    S.res = {}; S.daily = []; S.pick = null; save(); renderScore(); renderList();
  });

  function show(v) {
    const q = v === "q";
    $("viewQ").hidden = !q; $("viewList").hidden = q;
    $("tabToday").setAttribute("aria-pressed", String(q && cur && cur.id === dailyId()));
    $("tabList").setAttribute("aria-pressed", String(!q));
    if (!q) renderList();
  }
  $("tabToday").addEventListener("click", () => { show("q"); showPuzzle(dailyId()); $("tabToday").setAttribute("aria-pressed", "true"); });
  $("tabList").addEventListener("click", () => show("list"));

  if (P.length) { showPuzzle(dailyId()); show("q"); }
  renderScore();
})();
