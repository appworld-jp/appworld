// ひとこと漢字 — one question a day (same for everyone on the same date), then free practice.
(function () {
  const $ = id => document.getElementById(id);
  const W = window.WORDS;
  const today = new Date().toLocaleDateString("sv-SE");
  const KEY = "kanji-streak";

  // deterministic daily pick from the date, so "今日の1問" is stable all day
  const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const dailyIndex = hash(today) % W.length;

  function loadStreak() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function saveStreak(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  let st = loadStreak();
  function showStreak() { $("streak").textContent = st.days ? `${st.days}日つづいています` : ""; }

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let current = null, daily = true, seen = new Set();

  function ask(i) {
    current = W[i]; seen.add(i);
    $("kind").textContent = daily ? "今日の1問" : "練習";
    $("word").textContent = current[0];
    // the right reading, its common misreading, and two other words' readings of similar length
    const others = shuffle(W.filter(w => w !== current).map(w => w[1])).sort((a, b) => Math.abs(a.length - current[1].length) - Math.abs(b.length - current[1].length)).slice(0, 6);
    const pool = [current[1], current[2], ...shuffle(others).filter(r => r !== current[1] && r !== current[2]).slice(0, 2)];
    const box = $("choices"); box.replaceChildren();
    shuffle(pool).forEach(r => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = r;
      b.onclick = () => answer(b, r);
      box.append(b);
    });
    $("answer").hidden = true;
  }
  function answer(btn, r) {
    const ok = r === current[1];
    $("choices").querySelectorAll("button").forEach(b => { b.disabled = true; if (b.textContent === current[1]) b.classList.add("ok"); });
    if (!ok) btn.classList.add("ng");
    $("result").textContent = ok ? `正解。「${current[1]}」と読みます。` : `正しくは「${current[1]}」。「${current[2]}」と読み間違えやすい言葉です。`;
    $("mean").textContent = `意味：${current[3]}`;
    $("answer").hidden = false;
    if (daily && st.last !== today) {
      const y = new Date(Date.now() - 864e5).toLocaleDateString("sv-SE");
      st = { last: today, days: st.last === y ? (st.days || 0) + 1 : 1 };
      saveStreak(st); showStreak();
    }
    $("next").focus();
  }
  $("next").onclick = () => {
    daily = false;
    if (seen.size >= W.length) seen.clear();
    let i; do { i = Math.floor(Math.random() * W.length); } while (seen.has(i));
    ask(i);
  };

  showStreak();
  ask(dailyIndex);
})();
