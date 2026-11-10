(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const L = window.LabImg;
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const PALETTES = [
    { id: "auto", name: "写真の色から", colors: null },
    { id: "gb", name: "携帯ゲーム機風（緑4色）", colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"] },
    { id: "r16", name: "レトロ16色", colors: ["#000000", "#1D2B53", "#7E2553", "#008751", "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8", "#FF004D", "#FFA300", "#FFEC27", "#00E436", "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA"] },
    { id: "cga", name: "昔のパソコン風（4色）", colors: ["#000000", "#55FFFF", "#FF55FF", "#FFFFFF"] },
    { id: "sepia", name: "セピア（4色）", colors: ["#2B1D14", "#6B4A2F", "#B58B5A", "#F1DDB5"] },
    { id: "mono", name: "白黒（2色）", colors: ["#000000", "#FFFFFF"] }
  ];
  const SIZES = [16, 24, 32, 48, 64];
  const st = { img: null, size: 32, pal: "auto", n: 8, dither: false, outline: false, out: null };
  try { const o = JSON.parse(localStorage.getItem("dotmaker.v1") || "null"); if (o) Object.assign(st, { size: o.size, pal: o.pal, n: o.n, dither: !!o.dither, outline: !!o.outline }); } catch (e) { /* ignore */ }
  if (!SIZES.includes(st.size)) st.size = 32;
  if (!PALETTES.some(p => p.id === st.pal)) st.pal = "auto";
  if (!(st.n >= 2 && st.n <= 16)) st.n = 8;
  const remember = () => { try { localStorage.setItem("dotmaker.v1", JSON.stringify({ size: st.size, pal: st.pal, n: st.n, dither: st.dither, outline: st.outline })); } catch (e) { /* ignore */ } };

  // average-down the photo so each dot is the mean of its area
  function downsample(img, size) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = size / Math.max(iw, ih);
    const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s)), F = 4;
    const c = document.createElement("canvas"); c.width = w * F; c.height = h * F;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, w * F, h * F);
    const src = g.getImageData(0, 0, w * F, h * F).data, out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, gg = 0, b = 0, a = 0;
      for (let dy = 0; dy < F; dy++) for (let dx = 0; dx < F; dx++) {
        const i = ((y * F + dy) * w * F + (x * F + dx)) * 4, al = src[i + 3];
        r += src[i] * al; gg += src[i + 1] * al; b += src[i + 2] * al; a += al;
      }
      const o = (y * w + x) * 4;
      if (a) { out[o] = r / a; out[o + 1] = gg / a; out[o + 2] = b / a; }
      out[o + 3] = a / (F * F) > 127 ? 255 : 0;
    }
    return { w, h, data: out };
  }
  const dist = (a, r, g, b) => { const dr = a[0] - r, dg = a[1] - g, db = a[2] - b; return 2 * dr * dr + 4 * dg * dg + 3 * db * db; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function convert() {
    if (!st.img) return;
    const { w, h, data } = downsample(st.img, st.size);
    const p = PALETTES.find(x => x.id === st.pal);
    let pal = p.colors ? p.colors.map(hex2) : L.kmeans(data, Math.min(st.n, w * h)).map(c => c.rgb);
    if (!pal.length) pal = [[0, 0, 0]];
    // spread for ordered dithering: about half the typical gap between palette colours
    let spread = 0;
    if (st.dither) {
      let s = 0, k = 0;
      for (const a of pal) { let m = Infinity; for (const b of pal) if (a !== b) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); if (isFinite(m)) { s += m; k++; } }
      spread = k ? Math.min(96, s / k) : 0;
    }
    const idx = new Int16Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4;
      if (!data[o + 3]) continue;
      const t = st.dither ? (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * spread : 0;
      const r = data[o] + t, g = data[o + 1] + t, b = data[o + 2] + t;
      let bi = 0, bd = Infinity;
      for (let j = 0; j < pal.length; j++) { const d = dist(pal[j], r, g, b); if (d < bd) { bd = d; bi = j; } }
      idx[i] = bi;
    }
    if (st.outline && pal.length > 1) {
      // background = most common colour along the edge of the picture
      const cnt = new Array(pal.length).fill(0);
      for (let x = 0; x < w; x++) { if (idx[x] >= 0) cnt[idx[x]]++; if (idx[(h - 1) * w + x] >= 0) cnt[idx[(h - 1) * w + x]]++; }
      for (let y = 0; y < h; y++) { if (idx[y * w] >= 0) cnt[idx[y * w]]++; if (idx[y * w + w - 1] >= 0) cnt[idx[y * w + w - 1]]++; }
      const bg = cnt.indexOf(Math.max(...cnt));
      const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      let dark = 0; pal.forEach((c, j) => { if (lum(c) < lum(pal[dark])) dark = j; });
      if (dark === bg) { let lo = Infinity; pal.forEach((c, j) => { if (j !== bg && lum(c) < lo) { lo = lum(c); dark = j; } }); }
      const isBg = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? false : (idx[y * w + x] === bg || idx[y * w + x] < 0);
      const next = idx.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (idx[i] === bg || idx[i] < 0) continue;
        if (isBg(x - 1, y) || isBg(x + 1, y) || isBg(x, y - 1) || isBg(x, y + 1)) next[i] = dark;
      }
      idx.set(next);
    }
    const out = new ImageData(w, h), used = new Set();
    for (let i = 0; i < w * h; i++) {
      const o = i * 4; if (idx[i] < 0) continue;
      const c = pal[idx[i]]; used.add(idx[i]);
      out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255;
    }
    const cv = $("view"); cv.width = w; cv.height = h;
    cv.getContext("2d").putImageData(out, 0, 0);
    st.out = { w, h };
    $("info").textContent = `${w}×${h}ドット・${used.size}色` + (st.dither ? "・網目あり" : "") + (st.outline ? "・ふちどりあり" : "");
    $("saveRaw").textContent = `原寸で保存（${w}×${h}）`;
    const sc = Math.max(1, Math.floor(1024 / Math.max(w, h)));
    $("saveBig").textContent = `画像で保存（${w * sc}×${h * sc}）`;
    cv.classList.remove("boot"); void cv.offsetWidth; cv.classList.add("boot");
    $("view").setAttribute("aria-label", `ドット絵にした画像（${w}×${h}ドット、${used.size}色）`);
    const sw = $("swatches"); sw.textContent = "";
    [...used].sort((a, b) => a - b).forEach(j => { const i = document.createElement("i"); i.style.background = L.hex(pal[j]); sw.appendChild(i); });
  }

  // ---------- settings UI ----------
  function seg(box, items, cur, pick) {
    box.textContent = "";
    for (const it of items) {
      const b = document.createElement("button"); b.type = "button";
      b.setAttribute("aria-pressed", String(it.v === cur));
      const t = document.createElement("span"); t.textContent = it.t; b.appendChild(t);
      if (it.colors) { const m = document.createElement("span"); m.className = "mini"; m.setAttribute("aria-hidden", "true"); it.colors.forEach(c => { const i = document.createElement("i"); i.style.background = c; m.appendChild(i); }); b.appendChild(m); }
      b.addEventListener("click", () => pick(it.v));
      box.appendChild(b);
    }
  }
  function renderSettings() {
    seg($("sizeSeg"), SIZES.map(s => ({ v: s, t: String(s) })), st.size, v => { st.size = v; changed(); });
    seg($("palSeg"), PALETTES.map(p => ({ v: p.id, t: p.name, colors: p.colors })), st.pal, v => { st.pal = v; changed(); });
    $("cntOpt").hidden = st.pal !== "auto";
    $("cnt").value = st.n; $("cntV").textContent = st.n;
    $("dither").checked = st.dither; $("outline").checked = st.outline;
  }
  function changed() { remember(); renderSettings(); convert(); }
  $("cnt").addEventListener("input", () => { st.n = +$("cnt").value; $("cntV").textContent = st.n; remember(); convert(); });
  $("dither").addEventListener("change", () => { st.dither = $("dither").checked; remember(); convert(); });
  $("outline").addEventListener("change", () => { st.outline = $("outline").checked; remember(); convert(); });

  // ---------- save ----------
  function download(scale) {
    if (!st.out) return;
    const src = $("view"), c = document.createElement("canvas");
    c.width = st.out.w * scale; c.height = st.out.h * scale;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    c.toBlob(b => {
      if (!b) { $("saveMsg").textContent = "画像を作れませんでした。もう一度お試しください。"; return; }
      const url = URL.createObjectURL(b), a = document.createElement("a");
      a.href = url; a.download = `dot-${st.out.w}x${st.out.h}${scale > 1 ? "-x" + scale : ""}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      $("saveMsg").textContent = `${c.width}×${c.height}の画像を保存しました。`;
    }, "image/png");
  }
  $("saveBig").addEventListener("click", () => download(Math.max(1, Math.floor(1024 / Math.max(st.out ? st.out.w : 1, st.out ? st.out.h : 1)))));
  $("saveRaw").addEventListener("click", () => download(1));

  // ---------- input ----------
  function use(img) {
    st.img = img; $("err").textContent = "";
    $("work").hidden = false; $("startWin").hidden = true;
    renderSettings(); convert();
    $("view").scrollIntoView({ block: "nearest" });
  }
  async function fromFile(f) {
    try { const { img } = await L.load(f); use(img); }
    catch (e) { $("err").textContent = /ファイルを選んで/.test(e.message || "") ? "写真（画像ファイル）を選んでください。" : "この写真は読み込めませんでした。JPEGかPNGの写真でお試しください。"; $("work").hidden = !st.img; $("startWin").hidden = !!st.img; if (st.img) $("saveMsg").textContent = $("err").textContent; }
  }
  L.bind($("drop"), $("file"), fromFile);
  $("file2").addEventListener("change", () => { const f = $("file2").files[0]; if (f) fromFile(f); $("file2").value = ""; });
  $("sample").addEventListener("click", () => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 240;
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, 160); sky.addColorStop(0, "#5DA9E9"); sky.addColorStop(1, "#CDEBFA");
    g.fillStyle = sky; g.fillRect(0, 0, 320, 240);
    g.fillStyle = "#FFD23F"; g.beginPath(); g.arc(250, 55, 28, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#FFFFFF"; [[70, 50, 18], [92, 44, 22], [114, 52, 16]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#4C7A3D"; g.beginPath(); g.moveTo(0, 170); g.lineTo(90, 90); g.lineTo(170, 170); g.fill();
    g.fillStyle = "#6E9F4A"; g.beginPath(); g.moveTo(110, 170); g.lineTo(210, 100); g.lineTo(320, 170); g.fill();
    g.fillStyle = "#7BC950"; g.fillRect(0, 168, 320, 72);
    g.fillStyle = "#8B5A2B"; g.fillRect(56, 150, 12, 50);
    g.fillStyle = "#2F7D32"; g.beginPath(); g.arc(62, 140, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#E4572E"; g.fillRect(190, 175, 40, 30); g.fillStyle = "#7A2E1C"; g.beginPath(); g.moveTo(184, 177); g.lineTo(210, 155); g.lineTo(236, 177); g.fill();
    const img = new Image(); img.onload = () => use(img); img.src = c.toDataURL("image/png");
  });
  renderSettings();
})();
