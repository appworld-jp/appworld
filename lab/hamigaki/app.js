// おはなしタイマー — 3 minutes, six 30-second parts. Read-aloud uses the device's own speech engine.
(function () {
  const $ = id => document.getElementById(id);
  const S = window.STORIES, A = window.AREAS, TOTAL = 180, PART = 30, C = 326.7;
  let timer = null, endAt = 0, part = -1;

  S.forEach((s, i) => { const o = document.createElement("option"); o.value = i; o.textContent = s.title; $("story").append(o); });
  $("story").value = String(new Date().getDate() % S.length);          // a different story each day
  if (!("speechSynthesis" in window)) $("speak").parentElement.hidden = true;

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function say(text) {
    if (!$("speak").checked || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.rate = 0.95;
    speechSynthesis.speak(u);
  }
  function show(p) {
    const st = S[+$("story").value];
    $("area").textContent = `${A[p]}をみがこう`;
    $("title").textContent = `${st.title}（${p + 1}/6）`;
    $("text").textContent = st.parts[p];
    say(`${A[p]}。${st.parts[p]}`);
  }
  function tick() {
    const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    $("time").textContent = fmt(left);
    $("arc").style.strokeDashoffset = String(C * left / TOTAL);
    const p = Math.min(5, Math.floor((TOTAL - left) / PART));
    if (p !== part) { part = p; show(p); }
    if (left === 0) done();
  }
  function start() {
    endAt = Date.now() + TOTAL * 1000; part = -1;
    $("start").hidden = true; $("stop").hidden = false; $("story").disabled = true;
    tick(); timer = setInterval(tick, 250);
  }
  function reset(msg) {
    clearInterval(timer); timer = null;
    $("start").hidden = false; $("stop").hidden = true; $("story").disabled = false;
    $("time").textContent = fmt(TOTAL); $("arc").style.strokeDashoffset = String(C);
    $("area").textContent = msg; $("title").textContent = ""; $("text").textContent = "";
  }
  function done() {
    reset("ぴかぴか！ よくがんばりました");
    say("ぴかぴか。よくがんばりました。");
  }
  $("start").onclick = start;
  $("stop").onclick = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); reset("お話をえらんで、はじめよう"); };
})();
