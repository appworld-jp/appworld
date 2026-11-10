// コミット短歌 — builds a 5-7-5-7-7 tanka from hand-written phrases and keywords found in a commit message.
// Template-based fun: no AI. Mora are counted from the kana readings.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const W = window.TANKA_WORDS;
  const TARGET = [5, 7, 5, 7, 7];
  const KEY = "commit-tanka.v1";

  // ---------- mora ----------
  const SMALL = new Set([..."ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ"]);
  function mora(kana) {
    let n = 0;
    for (const ch of kana) {
      if (SMALL.has(ch)) continue;              // small kana merge with the previous sound
      if (/[ぁ-ゖァ-ヺー]/.test(ch)) n++; // っ・ん・ー each count as one
    }
    return n;
  }
  // "[漢字|よみ]かな" → segments
  function segs(s) {
    const out = []; const re = /\[([^|\]]+)\|([^\]]+)\]|([^[]+)/g; let m;
    while ((m = re.exec(s))) out.push(m[3] ? { t: m[3], r: m[3] } : { t: m[1], r: m[2], ruby: true });
    return out;
  }
  const reading = s => segs(s).map(x => x.r).join("");
  const plain = s => segs(s).map(x => x.t).join("");
  const M = s => mora(reading(s));

  // keep only phrases whose length really matches
  function checked(pool, n) { const o = {}; for (const k in pool) o[k] = pool[k].filter(p => M(p) === n); return o; }
  const L1 = checked(W.l1, 5), L3 = checked(W.l3, 5), L4 = checked(W.l4, 7), L5 = checked(W.l5, 7), L2 = W.l2;

  // ---------- analysis ----------
  function detect(msg) {
    const first = (msg.split(/\r?\n/).find(l => l.trim()) || "").trim();
    let kind = "";
    const pre = /^([A-Za-z]+)(?:\([^)]*\))?!?:/.exec(first);
    if (pre && W.prefix[pre[1].toLowerCase()]) kind = W.prefix[pre[1].toLowerCase()];
    if (pre && pre[1].toLowerCase() === "chore" && /deps?/i.test(first)) kind = "deps";
    if (!kind || kind === "misc") {
      for (const [k, re] of W.kinds) if (re.test(first)) { kind = k; break; }
      if (!kind) for (const [k, re] of W.kinds) if (re.test(msg)) { kind = k; break; }
    }
    kind = kind || "misc";
    const found = [];
    W.nouns.forEach(([re, noun]) => {
      const m = re.exec(msg);
      if (m && !found.some(f => f.noun === noun)) found.push({ noun, at: m.index });
    });
    found.sort((a, b) => a.at - b.at);
    return { kind, first, nouns: found.map(f => f.noun) };
  }
  const kindName = k => (W.kinds.find(x => x[0] === k) || [0, 0, "そのほか"])[2];

  // ---------- generation ----------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pool = (P, kind) => {
    const own = P[kind] || [], all = P.all || P.misc || [];
    return own.length && Math.random() < 0.6 ? own : (all.length ? all : own);
  };
  function line2(kind, nouns) {
    const suffixes = (L2[kind] || []).concat(L2.all);
    const cands = [];
    nouns.forEach((n, i) => {
      const need = 7 - M(n);
      suffixes.filter(s => M(s) === need).forEach(s => cands.push({ n, s, w: (i === 0 ? 3 : 1) * ((L2[kind] || []).includes(s) ? 2 : 1) }));
    });
    if (!cands.length) return null;
    let r = Math.random() * cands.reduce((a, c) => a + c.w, 0);
    for (const c of cands) { r -= c.w; if (r <= 0) return { text: c.n + c.s, noun: c.n }; }
    return { text: cands[0].n + cands[0].s, noun: cands[0].n };
  }
  function compose(info, avoid) {
    const nouns = info.nouns.length ? info.nouns : (W.fallbackNouns[info.kind] || W.fallbackNouns.misc);
    for (let tries = 0; tries < 30; tries++) {
      const l2 = line2(info.kind, nouns) || line2(info.kind, W.fallbackNouns.misc);
      const lines = [pick(pool(L1, info.kind)), l2.text, pick(L3[info.kind] && L3[info.kind].length ? L3[info.kind] : L3.misc), pick(pool(L4, info.kind)), pick(pool(L5, info.kind))];
      if (lines.some((l, i) => M(l) !== TARGET[i])) continue; // never show a wrong count
      const key = lines.join("/");
      if (key !== avoid || tries > 20) return { lines, key, noun: l2.noun };
    }
    return null;
  }

  // ---------- render ----------
  function rubyNodes(s) {
    const frag = document.createDocumentFragment();
    segs(s).forEach(x => {
      if (!x.ruby) { frag.append(document.createTextNode(x.t)); return; }
      const r = document.createElement("ruby"); r.append(document.createTextNode(x.t));
      const rt = document.createElement("rt"); rt.textContent = x.r; r.append(rt); frag.append(r);
    });
    return frag;
  }
  let cur = null, info = null;
  function show(t) {
    cur = t;
    const ol = $("lines"); ol.replaceChildren();
    t.lines.forEach((l, i) => {
      const li = document.createElement("li");
      const txt = document.createElement("span"); txt.className = "ln"; txt.append(rubyNodes(l));
      const n = M(l), badge = document.createElement("span");
      badge.className = "mora" + (n === TARGET[i] ? " ok" : " ng");
      badge.textContent = `${n}音`;
      badge.setAttribute("aria-label", `${n}音（目標${TARGET[i]}音）`);
      const yomi = document.createElement("span"); yomi.className = "yomi"; yomi.textContent = reading(l);
      li.append(txt, badge, yomi); ol.append(li);
    });
    const tz = $("tanzaku-text"); tz.replaceChildren();
    [[0, 1, 2], [3, 4]].forEach((idx, c) => {
      const col = document.createElement("span"); col.className = "tz-col tz-c" + c;
      col.textContent = idx.map(i => plain(t.lines[i])).join("\u3000"); tz.append(col);
    });
    $("result").hidden = false; $("empty").hidden = true;
    $("total").textContent = `${t.lines.map(M).join("・")}（計${t.lines.reduce((a, l) => a + M(l), 0)}音）`;
    $("poem-sr").textContent = t.lines.map(plain).join("　");
    const stamp = $("stamp"); stamp.classList.remove("in"); void stamp.offsetWidth; stamp.classList.add("in");
    const tzf = $("tanzaku"); tzf.classList.remove("in"); void tzf.offsetWidth; tzf.classList.add("in");
  }
  function chips(inf) {
    const box = $("chips"); box.replaceChildren();
    const add = (label, cls) => { const c = document.createElement("span"); c.className = "chip " + (cls || ""); c.textContent = label; box.append(c); };
    add(`種類：${kindName(inf.kind)}`, "kind");
    if (inf.nouns.length) inf.nouns.slice(0, 6).forEach(n => add(plain(n)));
    else add("拾える言葉がないので、定番の言葉で詠みました", "muted");
  }
  function run(again) {
    const msg = $("msg").value.trim();
    if (!msg) { $("msg").focus(); $("hint").textContent = "メッセージが空です。1行だけでも詠めます。"; return; }
    $("hint").textContent = "";
    if (!again || !info) { info = detect(msg); chips(info); }
    const t = compose(info, cur && cur.key);
    if (t) show(t);
    try { localStorage.setItem(KEY, msg.slice(0, 2000)); } catch (e) { /* ignore */ }
  }

  $("go").addEventListener("click", () => run(false));
  $("again").addEventListener("click", () => run(true));
  $("msg").addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(false); } });
  $("msg").addEventListener("input", () => { info = null; });
  let si = -1;
  $("sample").addEventListener("click", () => { si = (si + 1) % W.samples.length; $("msg").value = W.samples[si]; run(false); });
  $("copy").addEventListener("click", async () => {
    if (!cur) return;
    const text = `${cur.lines.map(plain).join("　")}\n（コミット短歌：${(info && info.first || "").slice(0, 60)}）`;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.className = "sr"; document.body.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove();
    }
    $("toast").textContent = ok ? "コピーしました" : "コピーできませんでした。短歌を選んでコピーしてください。";
    setTimeout(() => { $("toast").textContent = ""; }, 2400);
  });
  try { const saved = localStorage.getItem(KEY); if (saved) $("msg").value = saved; } catch (e) { /* ignore */ }

})();
