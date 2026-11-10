// 俳句カメラ — 写真＋季語＋自作の五七五を、縦書きのカード画像に。句は自動で作りません。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const K = window.KIGO || {};
  const KEY = "lab-haiku-v1";
  const TARGET = [5, 7, 5];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  let st;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; }
  if (!st || typeof st !== "object") st = {};
  st.lines = Array.isArray(st.lines) && st.lines.length === 3 ? st.lines : [{ t: "", r: "" }, { t: "", r: "" }, { t: "", r: "" }];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ season: st.season, kigo: st.kigo, lines: st.lines, author: st.author })); } catch (e) {} };

  const m = new Date().getMonth() + 1;
  if (!K[st.season]) st.season = m === 1 ? "新年" : m <= 4 ? "春" : m <= 7 ? "夏" : m <= 10 ? "秋" : "冬";
  let photo = null; // {img, url}

  // ---- 音の数（モーラ）
  const SMALL = /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/;
  const KANA = /[ぁ-ゖァ-ヺー]/;
  const IGNORE = /[\s、。，．,.!！?？「」『』（）()・…〜~―-]/;
  function mora(s) {
    let n = 0, unknown = false;
    for (const ch of s) {
      if (IGNORE.test(ch)) continue;
      if (KANA.test(ch)) { if (!SMALL.test(ch)) n++; }
      else unknown = true;
    }
    return { n, unknown };
  }
  const allKana = s => [...s].every(ch => KANA.test(ch) || IGNORE.test(ch));

  // ---- 季節と季語
  function renderSeasons() {
    const box = $("seasons"); box.replaceChildren();
    Object.keys(K).forEach(s => {
      const b = el("button", "season s-" + s, s); b.type = "button"; b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(s === st.season));
      b.addEventListener("click", () => { st.season = s; st.kigo = null; save(); renderSeasons(); renderKigo(); update(); });
      box.append(b);
    });
  }
  function renderKigo() {
    const box = $("kigo"); box.replaceChildren();
    (K[st.season] || []).forEach(([w, r]) => {
      const b = el("button", "kg"); b.type = "button"; b.setAttribute("role", "radio");
      const on = st.kigo && st.kigo[0] === w; b.setAttribute("aria-checked", String(!!on));
      const ru = el("ruby"); ru.append(document.createTextNode(w)); const rt = el("rt", null, r); ru.append(rt);
      b.append(ru); b.setAttribute("aria-label", `${w}（${r}）`);
      b.addEventListener("click", () => { st.kigo = [w, r]; save(); renderKigo(); update(); });
      box.append(b);
    });
    const now = $("kigoNow"); now.replaceChildren();
    if (st.kigo) {
      now.append(document.createTextNode(`季語：${st.kigo[0]}（${st.kigo[1]}・${st.season}）`));
      [0, 1, 2].forEach(i => {
        const b = el("button", "ins", `${["上五", "中七", "下五"][i]}に入れる`); b.type = "button";
        b.addEventListener("click", () => insertKigo(i)); now.append(b);
      });
    } else now.textContent = "季語をひとつ選ぶと、句に入れられます。";
  }
  function insertKigo(i) {
    const L = st.lines[i], [w, r] = st.kigo;
    const wasKana = allKana(L.t);
    if (L.r) L.r += r; else if (wasKana) L.r = L.t + r;
    L.t += w; save(); renderLines(); update();
    const inp = $("t" + i); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  }

  // ---- 3行の入力
  function renderLines() {
    const box = $("lines"); box.replaceChildren();
    st.lines.forEach((L, i) => {
      const row = el("div", "line");
      const lt = el("label", "lt"); lt.htmlFor = "t" + i;
      lt.append(el("span", "ln", ["上五", "中七", "下五"][i]));
      const t = el("input"); t.type = "text"; t.id = "t" + i; t.maxLength = 20; t.value = L.t; t.autocomplete = "off";
      t.placeholder = ["古池や", "蛙飛びこむ", "水の音"][i];
      const rl = el("label", "lr"); rl.htmlFor = "r" + i; rl.append(el("span", "ln", "よみ"));
      const r = el("input"); r.type = "text"; r.id = "r" + i; r.maxLength = 30; r.value = L.r; r.autocomplete = "off"; r.placeholder = ["ふるいけや", "かわずとびこむ", "みずのおと"][i];
      const c = el("output", "cnt"); c.id = "c" + i; c.setAttribute("aria-live", "polite");
      t.addEventListener("input", () => { L.t = t.value; save(); update(); });
      r.addEventListener("input", () => { L.r = r.value; save(); update(); });
      row.append(lt, t, rl, r, c);
      box.append(row);
    });
  }

  function update() {
    st.lines.forEach((L, i) => {
      const src = L.r.trim() ? L.r : L.t;
      const { n, unknown } = mora(src);
      const c = $("c" + i); if (!c) return;
      c.className = "cnt";
      if (!L.t.trim()) { c.textContent = `0 / ${TARGET[i]}`; c.classList.add("idle"); }
      else if (unknown) { c.textContent = "よみが必要"; c.classList.add("need"); }
      else { c.textContent = `${n} / ${TARGET[i]}`; c.classList.add(n === TARGET[i] ? "ok" : n > TARGET[i] ? "over" : "under"); }
      $("r" + i).closest(".line").classList.toggle("needs-r", unknown && !L.r.trim());
    });
    $("sample").hidden = st.lines.some(L => L.t.trim());
    const text = st.lines.map(L => L.t).join("");
    const reading = st.lines.map(L => L.r || L.t).join("");
    const kc = $("kcheck");
    if (!text.trim()) kc.textContent = "";
    else if (!st.kigo) kc.textContent = "季語を選ぶと、句に入っているか確認できます。";
    else kc.textContent = text.includes(st.kigo[0]) || reading.includes(st.kigo[1]) ? `季語「${st.kigo[0]}」が入っています。` : `季語「${st.kigo[0]}」は、まだ句に入っていません。`;
    // DOM preview with writing-mode: vertical-rl
    const hp = $("cardHaiku"); hp.replaceChildren();
    const lines = st.lines.map(L => L.t.trim());
    if (lines.some(Boolean)) lines.forEach((l, i) => { const s = el("span", "hl hl" + i, l || "　"); hp.append(s); });
    else hp.append(el("span", "hl ghost", "ここに句が入ります"));
    st.author = $("author").value.trim();
    const meta = $("cardMeta"); meta.replaceChildren();
    [st.kigo ? `季語　${st.kigo[0]}` : "", st.author ? `${st.author}　詠` : ""].filter(Boolean).forEach(t => meta.append(el("span", null, t)));
  }

  // ---- 写真
  $("file").addEventListener("change", async () => {
    const f = $("file").files[0]; if (!f) return;
    $("fileErr").textContent = "";
    try {
      const p = await window.LabImg.load(f);
      if (photo) URL.revokeObjectURL(photo.url);
      photo = p;
      const box = $("cardPhoto"); box.replaceChildren();
      const im = el("img"); im.src = p.url; im.alt = "選んだ写真"; box.append(im);
      $("pickT").textContent = "写真を選び直す"; $("pickLabel").classList.add("has");
    } catch (e) { const m = e.message || "画像を読み込めませんでした"; $("fileErr").textContent = /選んで/.test(m) ? m + "。" : m + "。別の写真を選んでください。"; }
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
    // paper texture lines
    g.strokeStyle = "rgba(120,100,60,.08)"; g.lineWidth = 1;
    for (let x = pw + 40; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    const lines = st.lines.map(L => L.t.trim()).filter(Boolean);
    const area = W - pw, longest = Math.max(1, ...lines.map(l => [...l].length));
    // the haiku stays above y = H - 430; the small meta columns sit below that
    const top = 140, bottom = H - 430;
    const size = Math.min(photo ? 84 : 110, Math.floor((bottom - top) / (longest * 1.08 + 2.4)));
    const gap = size * 1.6, total = gap * (lines.length - 1);
    let x = pw + area / 2 + 30 + total / 2;
    g.fillStyle = "#1B1F33";
    lines.forEach((l, i) => { vtext(g, l, x, top + i * size * 1.2, size); x -= gap; });
    const meta = [st.author ? `${st.author}　詠` : "", st.kigo ? `季語　${st.kigo[0]}` : ""].filter(Boolean);
    g.fillStyle = "#6B5F48";
    let mx = pw + 56; meta.forEach(t => { vtext(g, t, mx, H - 90 - [...t].length * 26 * 1.08, 26); mx += 44; });
    // seal
    g.fillStyle = "#B8332A"; const sx = W - 112, sy = H - 132; g.fillRect(sx, sy, 72, 72);
    g.fillStyle = "#F4EEDF"; g.font = `700 46px ${SERIF}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("句", sx + 36, sy + 38);
    return c;
  }
  let outUrl = null;
  $("export").addEventListener("click", () => {
    $("expErr").textContent = "";
    if (!st.lines.some(L => L.t.trim())) { $("expErr").textContent = "上の「五・七・五を詠む」に句を入れてください。"; $("t0").focus(); return; }
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

  $("sample").addEventListener("click", () => {
    st.season = "春"; st.kigo = ["蛙", "かわず"];
    st.lines = [{ t: "古池や", r: "ふるいけや" }, { t: "蛙飛びこむ", r: "かわずとびこむ" }, { t: "水の音", r: "みずのおと" }];
    save(); renderSeasons(); renderKigo(); renderLines(); update();
    $("t0").focus();
  });
  $("author").value = st.author || "";
  $("author").addEventListener("input", () => { update(); save(); });
  renderSeasons(); renderKigo(); renderLines(); update();
})();
