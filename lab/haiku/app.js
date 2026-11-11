// 俳句カメラ — 写真の色と明るさから五・七・五を組み立て、縦書きのカード画像に。
// 句づくりは compose.js（人が書いた季語と言葉の組み合わせ）。AI は使わず、写真は送信しません。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const K = window.KIGO || {};
  const E = window.HaikuEngine;
  const KEY = "lab-haiku-v1";
  const TARGET = [5, 7, 5];
  const NAMES = ["上五", "中七", "下五"];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---- 保存（形式は前と同じ。gen は最後に自動で詠んだ句）
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || typeof st !== "object") st = {};
  const okLine = L => L && typeof L.t === "string" && typeof L.r === "string";
  st.lines = Array.isArray(st.lines) && st.lines.length === 3 && st.lines.every(okLine) ? st.lines : [{ t: "", r: "" }, { t: "", r: "" }, { t: "", r: "" }];
  if (!(Array.isArray(st.kigo) && st.kigo.length === 2)) st.kigo = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ season: st.season, kigo: st.kigo, lines: st.lines, author: st.author, gen: st.gen })); } catch (e) {} };

  const m = new Date().getMonth() + 1;
  if (!K[st.season]) st.season = m === 1 ? "新年" : m <= 4 ? "春" : m <= 7 ? "夏" : m <= 10 ? "秋" : "冬";
  let photo = null; // {img, url, seed, mood}
  let count = 0;    // 同じ写真で何句目か
  let history = [];

  const lineKey = () => st.lines.map(L => L.t.trim()).join("/");
  const hasPoem = () => st.lines.some(L => L.t.trim());
  const edited = () => hasPoem() && lineKey() !== st.gen;

  // ---- 音の数（手で直す行用。ひらがな・カタカナ以外は「よみが必要」）
  const KANA = /[ぁ-ゖァ-ヺー]/;
  const IGNORE = /[\s、。，．,.!！?？「」『』（）()・…〜~―-]/;
  function mora(s) {
    let unknown = false; const kana = [];
    for (const ch of s) { if (IGNORE.test(ch)) continue; if (KANA.test(ch)) kana.push(ch); else unknown = true; }
    return { n: E.mora(kana.join("")), unknown };
  }
  const allKana = s => [...s].every(ch => KANA.test(ch) || IGNORE.test(ch));

  // ---- 自動で詠む
  function compose() {
    if (!photo) return false;
    const seed = (photo.seed + E.hash(st.season) + count * 7919) >>> 0;
    const p = E.compose(st.season, photo.mood, seed, history, count === 0);
    if (!p) return false;
    history.push(p.key); if (history.length > 12) history.shift();
    st.kigo = p.kigo;
    st.lines = p.lines.map(l => ({ t: l.t, r: l.r }));
    st.gen = lineKey();
    save(); renderKigo(); renderLines(); update();
    const ol = $("poem"); ol.classList.remove("in"); void ol.offsetWidth; ol.classList.add("in");
    return true;
  }
  function recompose(next) {
    if (!photo) return;
    if (edited() && !confirm("自分で直した句は消えます。新しく詠みますか？")) return;
    if (next) count++;
    compose();
  }
  $("again").addEventListener("click", () => recompose(true));

  // ---- 季節
  function renderSeasons() {
    const box = $("seasons"); box.replaceChildren();
    Object.keys(K).forEach(s => {
      const b = el("button", "season s-" + s, s); b.type = "button"; b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(s === st.season));
      b.addEventListener("click", () => {
        if (s === st.season) return;
        if (photo && edited() && !confirm("自分で直した句は消えます。季節を変えて詠み直しますか？")) return;
        st.season = s;
        if (photo) { count = 0; compose(); }
        else { st.kigo = null; save(); renderKigo(); update(); }
        renderSeasons();
      });
      box.append(b);
    });
  }

  // ---- 季語（自分で直す）
  function renderKigo() {
    const box = $("kigo"); box.replaceChildren();
    (K[st.season] || []).forEach(([w, r]) => {
      const b = el("button", "kg"); b.type = "button"; b.setAttribute("role", "radio");
      const on = st.kigo && st.kigo[0] === w; b.setAttribute("aria-checked", String(!!on));
      const ru = el("ruby"); ru.append(document.createTextNode(w)); ru.append(el("rt", null, r));
      b.append(ru); b.setAttribute("aria-label", `${w}（${r}）`);
      b.addEventListener("click", () => { st.kigo = [w, r]; save(); renderKigo(); update(); });
      box.append(b);
    });
    ownKigo(st.season).render();
    const now = $("kigoNow"); now.replaceChildren();
    if (st.kigo) {
      now.append(document.createTextNode(`季語：${st.kigo[0]}（${st.kigo[1]}）`));
      [0, 1, 2].forEach(i => {
        const b = el("button", "ins", `${NAMES[i]}に入れる`); b.type = "button";
        b.addEventListener("click", () => insertKigo(i)); now.append(b);
      });
    } else now.textContent = "季語を一つ選ぶと、句に入れられます。";
  }
  // 自分の季語（季節ごと）。この端末に覚えて、次から候補に並べる
  const owns = {};
  const KANA_ONLY = /^[ぁ-ゖァ-ヺー]+$/;
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function pickKigo(v) { const [w, r] = v.split("\t"); st.kigo = [w, r]; save(); renderKigo(); update(); }
  function ownKigo(season) {
    if (owns[season]) return owns[season];
    owns[season] = window.OwnChoices({
      key: KEY + ".custom", name: "kigo-" + season, host: $("kigo"), max: 10,
      builtins: (K[season] || []).map(([w, r]) => ({ value: `${w}\t${r}`, label: w })),
      addClass: "kg", addLabel: "＋ 自分の季語", placeholder: "季語（初雪）", inputLabel: "季語",
      second: { label: "よみ（ひらがな）", placeholder: "よみ（はつゆき）", max: 20 },
      label: v => v.split("\t")[0], emptyMsg: "季語を入れてから「追加」を押してください。",
      parse: (w, r) => {
        if (/\t/.test(w)) return { error: "季語に使えない文字があります。" };
        if (!r && KANA_ONLY.test(w)) r = toHira(w);
        if (!r) return { error: "漢字のある季語は、よみも入れてください。", second: true };
        r = toHira(r.replace(/\s+/g, ""));
        if (!KANA_ONLY.test(r)) return { error: "よみは、ひらがなで入れてください。", second: true };
        return { value: `${w}\t${r}` };
      },
      extra: () => st.kigo && st.season === season ? [st.kigo.join("\t")] : [],
      chip: v => {
        const [w, r] = v.split("\t");
        const b = el("button", "kg own"); b.type = "button"; b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(!!st.kigo && st.kigo[0] === w && st.kigo[1] === r));
        if (w === r) b.append(w);
        else { const ru = el("ruby"); ru.append(document.createTextNode(w)); ru.append(el("rt", null, r)); b.append(ru); }
        b.setAttribute("aria-label", `${w}（${r}）`);
        b.addEventListener("click", () => pickKigo(v));
        return b;
      },
      onPick: pickKigo
    });
    return owns[season];
  }
  function insertKigo(i) {
    const L = st.lines[i], [w, r] = st.kigo;
    const wasKana = allKana(L.t);
    if (L.r) L.r += r; else if (wasKana) L.r = L.t + r;
    L.t += w; save(); renderLines(); update();
    const inp = $("t" + i); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  }

  // ---- 3行の入力（自分で直す）
  function renderLines() {
    const box = $("lines"); box.replaceChildren();
    st.lines.forEach((L, i) => {
      const row = el("div", "line");
      const lt = el("label", "lt"); lt.htmlFor = "t" + i; lt.append(el("span", "ln", NAMES[i]));
      const t = el("input"); t.type = "text"; t.id = "t" + i; t.maxLength = 20; t.value = L.t; t.autocomplete = "off";
      t.placeholder = ["古池や", "蛙飛びこむ", "水の音"][i];
      const rl = el("label", "lr"); rl.htmlFor = "r" + i; rl.append(el("span", "ln", "よみ"));
      const r = el("input"); r.type = "text"; r.id = "r" + i; r.maxLength = 30; r.value = L.r; r.autocomplete = "off"; r.placeholder = ["ふるいけや", "かわずとびこむ", "みずのおと"][i];
      const c = el("output", "cnt"); c.id = "c" + i;
      t.addEventListener("input", () => { L.t = t.value; save(); update(); });
      r.addEventListener("input", () => { L.r = r.value; save(); update(); });
      row.append(lt, t, rl, r, c);
      box.append(row);
    });
  }

  function count3() {
    return st.lines.map(L => { const src = L.r.trim() ? L.r : L.t; return mora(src); });
  }
  function update() {
    const cs = count3();
    st.lines.forEach((L, i) => {
      const { n, unknown } = cs[i];
      const c = $("c" + i); if (!c) return;
      c.className = "cnt";
      if (!L.t.trim()) { c.textContent = `0 / ${TARGET[i]}`; c.classList.add("idle"); }
      else if (unknown) { c.textContent = "よみが必要"; c.classList.add("need"); }
      else { c.textContent = `${n} / ${TARGET[i]}`; c.classList.add(n === TARGET[i] ? "ok" : n > TARGET[i] ? "over" : "under"); }
      $("r" + i).closest(".line").classList.toggle("needs-r", unknown && !L.r.trim());
    });
    const text = st.lines.map(L => L.t).join("");
    const reading = st.lines.map(L => L.r || L.t).join("");
    const inPoem = st.kigo && (text.includes(st.kigo[0]) || reading.includes(st.kigo[1]));
    const kc = $("kcheck");
    if (!text.trim()) kc.textContent = "";
    else if (!st.kigo) kc.textContent = "季語を選ぶと、句に入っているか確かめられます。";
    else kc.textContent = inPoem ? `季語「${st.kigo[0]}」が入っています。` : `季語「${st.kigo[0]}」は、まだ句に入っていません。`;

    // 結果の欄
    const show = hasPoem();
    $("result").hidden = !show; $("empty").hidden = show;
    const ol = $("poem"); ol.classList.remove("in"); ol.replaceChildren(); // 動きは自動で詠んだときだけ
    st.lines.forEach((L, i) => {
      const li = el("li");
      li.append(el("span", "pl", L.t.trim() || "　"));
      const { n, unknown } = cs[i];
      const badge = el("span", "mora " + (!unknown && n === TARGET[i] ? "ok" : "ng"), unknown ? "よみ？" : `${n}音`);
      badge.setAttribute("aria-label", unknown ? "よみが必要" : `${n}音（${TARGET[i]}音の行）`);
      li.append(badge);
      li.append(el("span", "py", L.r.trim() || L.t.trim()));
      ol.append(li);
    });
    const ro = $("readout"); ro.replaceChildren();
    if (photo && photo.mood.labels.length) {
      ro.append(document.createTextNode("写真から："));
      photo.mood.labels.forEach(l => ro.append(el("span", "chip", l)));
    } else if (photo) ro.textContent = "写真から：落ち着いた色";
    else ro.textContent = "前回の句です。写真を選ぶと、新しく詠みます。";
    if (photo && edited()) ro.append(el("span", "chip mine", "直した句"));
    $("kigoUsed").textContent = st.kigo ? (inPoem ? `季語：${st.kigo[0]}（${st.kigo[1]}・${st.season}）` : `季語「${st.kigo[0]}」が句に入っていません`) : "";
    $("again").hidden = !photo;

    // カード（writing-mode: vertical-rl）
    const hp = $("cardHaiku"); hp.replaceChildren();
    const lines = st.lines.map(L => L.t.trim());
    if (lines.some(Boolean)) lines.forEach((l, i) => hp.append(el("span", "hl hl" + i, l || "　")));
    else hp.append(el("span", "hl ghost", "ここに句が入ります"));
    st.author = $("author").value.trim();
    const meta = $("cardMeta"); meta.replaceChildren();
    [st.kigo && inPoem ? `季語　${st.kigo[0]}` : "", st.author ? `${st.author}　詠` : ""].filter(Boolean).forEach(t => meta.append(el("span", null, t)));
  }

  // ---- 写真
  async function usePhoto(file) {
    $("fileErr").textContent = "";
    let p;
    try { p = await window.LabImg.load(file); }
    catch (e) { const m = e.message || "画像を読み込めませんでした"; $("fileErr").textContent = /選んで/.test(m) ? m + "。" : m + "。別の写真を選んでください。"; return; }
    const px = window.LabImg.pixels(p.img, 64);
    if (photo) URL.revokeObjectURL(photo.url);
    photo = { img: p.img, url: p.url, seed: E.hashPixels(px.data), mood: E.moods(E.analyze(px)) };
    count = 0; history = [];
    const box = $("cardPhoto"); box.replaceChildren();
    const im = el("img"); im.src = p.url; im.alt = "選んだ写真"; box.append(im);
    $("pickT").textContent = "写真を選び直す"; $("pickLabel").classList.add("has");
    if (edited() && !confirm("前の句は消えます。この写真で新しく詠みますか？")) { update(); return; }
    compose();
    if (window.matchMedia && window.matchMedia("(max-width: 879px)").matches) $("resultStep").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  $("file").addEventListener("change", () => { const f = $("file").files[0]; if (f) usePhoto(f); $("file").value = ""; });

  // ---- 見本の写真（この場で絵を描いて使う）
  const SAMPLES = [
    ["夜の町", (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#070B22"); sky.addColorStop(1, "#1C2550"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = "#E9E4C8"; for (let i = 0; i < 70; i++) { const x = (i * 97) % w, y = (i * 53) % (h * 0.5); g.fillRect(x, y, 2, 2); }
      g.fillStyle = "#05070F"; [[0, .62, .18], [.16, .55, .14], [.3, .66, .2], [.5, .5, .16], [.66, .6, .14], [.8, .56, .2]].forEach(([x, y, bw]) => g.fillRect(x * w, y * h, bw * w, h));
      g.fillStyle = "#F2C66B"; for (let i = 0; i < 40; i++) { const x = ((i * 37) % 95) / 100 * w, y = (0.62 + ((i * 13) % 30) / 100) * h; g.fillRect(x, y, 8, 10); }
    }],
    ["夕焼け", (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#F6B04F"); sky.addColorStop(.55, "#E2602E"); sky.addColorStop(1, "#7A2D2A"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = "#FFE0A0"; g.beginPath(); g.arc(w * .62, h * .55, w * .11, 0, 7); g.fill();
      g.fillStyle = "#3A1A1E"; g.beginPath(); g.moveTo(0, h * .7); g.quadraticCurveTo(w * .3, h * .58, w * .55, h * .72); g.quadraticCurveTo(w * .8, h * .62, w, h * .7); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    }],
    ["海", (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h * .55); sky.addColorStop(0, "#3F8FDB"); sky.addColorStop(1, "#A9D4F5"); g.fillStyle = sky; g.fillRect(0, 0, w, h * .55);
      g.fillStyle = "#FFFFFF"; [[.25, .18, .1], [.33, .17, .08], [.7, .28, .09], [.78, .27, .07]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * w, y * h, r * w, 0, 7); g.fill(); });
      const sea = g.createLinearGradient(0, h * .55, 0, h); sea.addColorStop(0, "#1C6DAE"); sea.addColorStop(1, "#0E4A7A"); g.fillStyle = sea; g.fillRect(0, h * .55, w, h);
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = h * (.6 + i * .045); g.beginPath(); g.moveTo(w * ((i * 0.13) % .6), y); g.lineTo(w * ((i * 0.13) % .6 + .25), y); g.stroke(); }
    }],
    ["森", (g, w, h) => {
      g.fillStyle = "#CFE6B8"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { const x = (i * 71) % w, y = h * (.15 + ((i * 17) % 40) / 100); g.fillStyle = ["#2F6B2A", "#4E8F3A", "#6FAF4A", "#2A5A33"][i % 4]; g.beginPath(); g.arc(x, y, w * .18, 0, 7); g.fill(); }
      g.fillStyle = "#4A3A26"; [.2, .48, .78].forEach(x => g.fillRect(x * w, h * .45, w * .05, h));
      g.fillStyle = "#3E7A30"; g.fillRect(0, h * .85, w, h);
    }],
    ["雪", (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#E4E8EE"); sky.addColorStop(1, "#FFFFFF"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = "#8E959E"; [.15, .35, .62, .84].forEach((x, i) => { g.beginPath(); g.moveTo(x * w, h * (.3 + i % 2 * .05)); g.lineTo(x * w - w * .07, h * .62); g.lineTo(x * w + w * .07, h * .62); g.fill(); });
      g.fillStyle = "#FFFFFF"; g.fillRect(0, h * .6, w, h);
      g.fillStyle = "#C9CFD8"; for (let i = 0; i < 12; i++) g.fillRect(w * (.45 + (i % 2) * .04), h * (.65 + i * .028), 10, 6);
    }]
  ];
  SAMPLES.forEach(([name, paint]) => {
    const b = el("button", "smp", name); b.type = "button";
    b.addEventListener("click", () => {
      const c = document.createElement("canvas"); c.width = 600; c.height = 800;
      paint(c.getContext("2d"), c.width, c.height);
      c.toBlob(blob => { if (blob) usePhoto(blob); else $("fileErr").textContent = "見本を作れませんでした。写真を選んでください。"; }, "image/png");
    });
    $("samples").append(b);
  });

  // ---- PNG 書き出し（canvas に一字ずつ縦に描く）
  const SERIF = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","BIZ UDPMincho",serif';
  const ROTATE = /[ー〜～…―\-「」『』（）()【】]/;
  const PUNCT = /[、。，．]/;
  const SMALLK = /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]/;
  function vtext(g, text, x, y, size) {
    g.font = `500 ${size}px ${SERIF}`; g.textAlign = "center"; g.textBaseline = "middle";
    for (const ch of text) {
      const cy = y + size / 2;
      if (ROTATE.test(ch)) { g.save(); g.translate(x, cy); g.rotate(Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); }
      else if (PUNCT.test(ch)) g.fillText(ch, x + size * 0.6, cy - size * 0.55);
      else if (SMALLK.test(ch)) g.fillText(ch, x + size * 0.1, cy - size * 0.1);
      else g.fillText(ch, x, cy);
      y += size * 1.08;
    }
    return y;
  }
  function draw() {
    const W = 1080, H = 1440, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#F4EEDF"; g.fillRect(0, 0, W, H);
    const pw = photo ? 600 : 0;
    if (photo) {
      const img = photo.img, s = Math.max(pw / img.naturalWidth, H / img.naturalHeight);
      const sw = pw / s, sh = H / s;
      g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, pw, H);
      g.fillStyle = "#B08D4A"; g.fillRect(pw, 0, 6, H);
    }
    g.strokeStyle = "rgba(120,100,60,.08)"; g.lineWidth = 1;
    for (let x = pw + 40; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    const lines = st.lines.map(L => L.t.trim()).filter(Boolean);
    const area = W - pw, longest = Math.max(1, ...lines.map(l => [...l].length));
    const top = 150, bottom = H - 300;
    const size = Math.min(photo ? 84 : 110, Math.floor((bottom - top) / (longest * 1.08 + 2.4)));
    const gap = size * 1.6, total = gap * (lines.length - 1);
    // all lines start at the same height; the block sits in the middle of the paper
    let x = pw + area / 2 + total / 2;
    const startY = top + Math.max(0, (bottom - top - longest * size * 1.08) / 2);
    g.fillStyle = "#1B1F33";
    lines.forEach(l => { vtext(g, l, x, startY, size); x -= gap; });
    const text = st.lines.map(L => L.t).join(""), reading = st.lines.map(L => L.r || L.t).join("");
    const kigoOk = st.kigo && (text.includes(st.kigo[0]) || reading.includes(st.kigo[1]));
    const meta = [st.author ? `${st.author}　詠` : "", kigoOk ? `季語　${st.kigo[0]}` : ""].filter(Boolean);
    g.fillStyle = "#6B5F48";
    let mx = pw + 56; meta.forEach(t => { vtext(g, t, mx, H - 90 - [...t].length * 26 * 1.08, 26); mx += 44; });
    g.fillStyle = "#B8332A"; const sx = W - 112, sy = H - 132; g.fillRect(sx, sy, 72, 72);
    g.fillStyle = "#F4EEDF"; g.font = `700 46px ${SERIF}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("句", sx + 36, sy + 38);
    return c;
  }
  let outUrl = null;
  $("export").addEventListener("click", () => {
    $("expErr").textContent = "";
    if (!hasPoem()) { $("expErr").textContent = "先に写真を選んで、一句詠んでください。"; $("file").focus(); return; }
    const c = draw();
    c.toBlob(blob => {
      if (!blob) { $("expErr").textContent = "画像を作れませんでした。もう一度お試しください。"; return; }
      if (outUrl) URL.revokeObjectURL(outUrl);
      outUrl = URL.createObjectURL(blob);
      $("outImg").src = outUrl; $("out").hidden = false;
      const cd = $("card"); cd.classList.remove("sealed"); void cd.offsetWidth; cd.classList.add("sealed");
      const a = document.createElement("a"); a.href = outUrl; a.download = "haiku-card.png"; document.body.append(a); a.click(); a.remove();
    }, "image/png");
  });

  $("author").value = st.author || "";
  $("author").addEventListener("input", () => { update(); save(); });
  renderSeasons(); renderKigo(); renderLines(); update();
})();
