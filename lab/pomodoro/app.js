// ポモドーロ箱 — focus timer with a one-line log. The log lives in localStorage on this device only.
(function () {
  const $ = id => document.getElementById(id);
  const REST_MIN = 5;
  const today = () => new Date().toLocaleDateString("sv-SE");          // YYYY-MM-DD in local time
  const KEY = "pomodoro-log";

  let focusMin = 25, mode = "focus", total = focusMin * 60, left = total, timer = null, endAt = 0;

  function load() { try { const d = JSON.parse(localStorage.getItem(KEY) || "{}"); return d.date === today() ? d.items : []; } catch (e) { return []; } }
  function save(items) { try { localStorage.setItem(KEY, JSON.stringify({ date: today(), items })); } catch (e) {} }
  let items = load();

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  function draw() {
    $("clock").textContent = fmt(left);
    $("bar").style.width = `${(1 - left / total) * 100}%`;
    $("mode").textContent = mode === "focus" ? "集中" : "休憩";
    $("mode").classList.toggle("rest", mode !== "focus");
    document.title = timer ? `${fmt(left)} ${mode === "focus" ? "集中" : "休憩"} — ポモドーロ箱` : "ポモドーロ箱";
  }
  function renderLog() {
    const ol = $("log"); ol.replaceChildren();
    items.forEach(it => {
      const li = document.createElement("li");
      const t = document.createElement("time"); t.textContent = it.t;
      const s = document.createElement("span"); s.textContent = it.what || "（記録なし）";
      li.append(t, s); ol.append(li);
    });
    $("empty").hidden = items.length > 0;
    const mins = items.reduce((a, it) => a + it.min, 0);
    $("sum").textContent = items.length ? `${items.length}回・${mins}分` : "";
  }

  // a short two-tone chime, made in the browser (no audio files)
  let ac = null;
  function chime() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.28].forEach((d, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = i ? 880 : 660; o.type = "sine";
        g.gain.setValueAtTime(0.0001, ac.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.6);
        o.connect(g).connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.65);
      });
    } catch (e) {}
  }

  function tick() {
    left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    draw();
    if (left === 0) finish();
  }
  function start() {
    if (timer) { clearInterval(timer); timer = null; $("start").textContent = "つづける"; draw(); return; }   // pause
    if (ac && ac.state === "suspended") ac.resume();
    endAt = Date.now() + left * 1000;
    timer = setInterval(tick, 250);
    $("start").textContent = "一時停止";
    draw();
  }
  function setMode(m) {
    mode = m; total = (m === "focus" ? focusMin : REST_MIN) * 60; left = total;
    clearInterval(timer); timer = null; $("start").textContent = "はじめる"; draw();
  }
  function finish() {
    clearInterval(timer); timer = null; chime();
    if (mode === "focus") { $("ask").hidden = false; $("what").focus(); $("start").disabled = true; }
    else { setMode("focus"); }
  }
  function record(what) {
    const now = new Date();
    items.push({ t: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, what: what.trim().slice(0, 60), min: focusMin });
    save(items); renderLog();
    $("ask").hidden = true; $("what").value = ""; $("start").disabled = false;
    setMode("rest"); start();
  }

  $("start").onclick = start;
  $("reset").onclick = () => setMode(mode);
  $("ask").addEventListener("submit", e => { e.preventDefault(); record($("what").value); });
  $("skip").onclick = () => record("");
  document.querySelectorAll(".lens button").forEach(b => b.onclick = () => {
    if (timer) return;
    focusMin = +b.dataset.min;
    document.querySelectorAll(".lens button").forEach(x => x.setAttribute("aria-pressed", x === b));
    if (mode === "focus") setMode("focus");
  });
  $("copy").onclick = async () => {
    const text = items.map(it => `${it.t} ${it.what || "（記録なし）"}`).join("\n") || "（まだ記録はありません）";
    try { await navigator.clipboard.writeText(`${today()} の記録\n${text}`); $("copied").textContent = "コピーしました"; }
    catch (e) { $("copied").textContent = "コピーできませんでした"; }
    setTimeout(() => $("copied").textContent = "", 2000);
  };

  draw(); renderLog();
})();
