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
  const SIZES = [16, 24, 32, 48, 64, 96, 128];
  const st = { img: null, size: 32, pal: "auto", n: 8, dither: false, outline: false, out: null };
  try { const o = JSON.parse(localStorage.getItem("dotmaker.v1") || "null"); if (o) Object.assign(st, { size: o.size, pal: o.pal, n: o.n, dither: !!o.dither, outline: !!o.outline }); } catch (e) { /* ignore */ }
  if (!SIZES.includes(st.size)) st.size = 32;
  if (!PALETTES.some(p => p.id === st.pal)) st.pal = "auto";
  if (!(st.n >= 2 && st.n <= 16)) st.n = 8;
  const remember = () => { try { localStorage.setItem("dotmaker.v1", JSON.stringify({ size: st.size, pal: st.pal, n: st.n, dither: st.dither, outline: st.outline })); } catch (e) { /* ignore */ } };

  // ---------- colour space: OKLab (distances match how different colours look) ----------
  const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = toLin(i);
  function lab(r, g, b, o, k) {
    const R = LIN[r], G = LIN[g], B = LIN[b];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    o[k] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    o[k + 1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    o[k + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  }
  const toS = c => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)));
  function rgb(L, a, b) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [toS(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), toS(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toS(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
  }
  const d3 = (p, i, q, j) => { const a = p[i] - q[j], b = p[i + 1] - q[j + 1], c = p[i + 2] - q[j + 2]; return a * a + b * b + c * c; };

  // Read the photo at F×F samples per dot, in OKLab, slightly crisper (a little more contrast and colour).
  function sample(img, size) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = size / Math.max(iw, ih);
    const w = Math.max(1, Math.round(iw * sc)), h = Math.max(1, Math.round(ih * sc)), F = size > 64 ? 6 : 8;
    const c = document.createElement("canvas"); c.width = w * F; c.height = h * F;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, w * F, h * F);
    const src = g.getImageData(0, 0, w * F, h * F).data, n = w * F * h * F;
    const px = new Float32Array(n * 3), on = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (src[i * 4 + 3] < 128) continue;
      on[i] = 1; lab(src[i * 4], src[i * 4 + 1], src[i * 4 + 2], px, i * 3);
      px[i * 3] = Math.min(1, Math.max(0, (px[i * 3] - 0.6) * 1.06 + 0.6));
      px[i * 3 + 1] *= 1.12; px[i * 3 + 2] *= 1.12;
    }
    return { w, h, F, px, on };
  }

  // k-means++ in OKLab on a subsample of the photo (not on the averaged dots, which wash colours out)
  function autoPalette(px, on, k) {
    const pts = [], n = on.length, step = Math.max(1, Math.floor(n / 8000));
    for (let i = 0; i < n; i += step) if (on[i]) pts.push(px[i * 3], px[i * 3 + 1], px[i * 3 + 2]);
    const m = pts.length / 3; if (!m) return [];
    k = Math.min(k, m);
    const c = new Float32Array(k * 3), dist = new Float64Array(m).fill(Infinity);
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let pick = Math.floor(m / 2);
    for (let j = 0; j < k; j++) {
      c.set(pts.slice(pick * 3, pick * 3 + 3), j * 3);
      let sum = 0;
      for (let i = 0; i < m; i++) { const d = d3(pts, i * 3, c, j * 3); if (d < dist[i]) dist[i] = d; sum += dist[i]; }
      let t = rnd() * sum; pick = 0; while (pick < m - 1 && (t -= dist[pick]) > 0) pick++;
    }
    const acc = new Float64Array(k * 4);
    for (let it = 0; it < 14; it++) {
      acc.fill(0);
      for (let i = 0; i < m; i++) {
        let bi = 0, bd = Infinity;
        for (let j = 0; j < k; j++) { const d = d3(pts, i * 3, c, j * 3); if (d < bd) { bd = d; bi = j; } }
        acc[bi * 4] += pts[i * 3]; acc[bi * 4 + 1] += pts[i * 3 + 1]; acc[bi * 4 + 2] += pts[i * 3 + 2]; acc[bi * 4 + 3]++;
      }
      for (let j = 0; j < k; j++) if (acc[j * 4 + 3]) for (let q = 0; q < 3; q++) c[j * 3 + q] = acc[j * 4 + q] / acc[j * 4 + 3];
    }
    const out = []; for (let j = 0; j < k; j++) if (acc[j * 4 + 3]) out.push([c[j * 3], c[j * 3 + 1], c[j * 3 + 2]]);
    return out;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function convert() {
    if (!st.img) return;
    const { w, h, F, px, on } = sample(st.img, st.size);
    const p = PALETTES.find(x => x.id === st.pal);
    let palLab;
    if (p.colors) palLab = p.colors.map(hx => { const o = [0, 0, 0], c = hex2(hx); lab(c[0], c[1], c[2], o, 0); return o; });
    else palLab = autoPalette(px, on, st.n);
    if (!palLab.length) palLab = [[0, 0, 0]];
    const P = new Float32Array(palLab.flat()), K = palLab.length;
    const pal = p.colors ? p.colors.map(hex2) : palLab.map(c => rgb(c[0], c[1], c[2]));
    const nearest = (arr, i) => { let bi = 0, bd = Infinity; for (let j = 0; j < K; j++) { const d = d3(arr, i, P, j * 3); if (d < bd) { bd = d; bi = j; } } return bi; };
    // for ordered dithering: about half the typical gap between palette colours (in OKLab lightness)
    let spread = 0;
    if (st.dither && K > 1) {
      let s = 0; for (let a = 0; a < K; a++) { let m = Infinity; for (let b = 0; b < K; b++) if (a !== b) m = Math.min(m, Math.sqrt(d3(P, a * 3, P, b * 3))); s += m; }
      spread = Math.min(0.25, s / K);
    }
    const idx = new Int16Array(w * h).fill(-1), W = w * F, cnt = new Float64Array(K), mean = new Float32Array(3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let seen = 0; cnt.fill(0); mean.fill(0);
      for (let dy = 0; dy < F; dy++) for (let dx = 0; dx < F; dx++) {
        const i = (y * F + dy) * W + (x * F + dx); if (!on[i]) continue; seen++;
        if (st.dither) { mean[0] += px[i * 3]; mean[1] += px[i * 3 + 1]; mean[2] += px[i * 3 + 2]; }
        else {
          // centre samples count a little more, so a dot takes the colour of what is really there
          const wt = (dx > 0 && dx < F - 1 && dy > 0 && dy < F - 1) ? 1.5 : 1;
          cnt[nearest(px, i * 3)] += wt;
        }
      }
      if (seen * 2 < F * F) continue;
      if (st.dither) {
        mean[0] /= seen; mean[1] /= seen; mean[2] /= seen;
        mean[0] += (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * spread;
        idx[y * w + x] = nearest(mean, 0);
      } else {
        // the colour most of the dot's area belongs to: keeps edges sharp, no grey halo
        let bi = 0; for (let j = 1; j < K; j++) if (cnt[j] > cnt[bi]) bi = j;
        idx[y * w + x] = bi;
      }
    }
    if (!st.dither) {
      // tidy up: a lone dot surrounded by one other colour takes that colour
      const next = idx.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, v = idx[i]; if (v < 0) continue;
        const nb = [x > 0 ? idx[i - 1] : -2, x < w - 1 ? idx[i + 1] : -2, y > 0 ? idx[i - w] : -2, y < h - 1 ? idx[i + w] : -2];
        if (nb.includes(v)) continue;
        const c = {}; let best = -2, bc = 0;
        for (const q of nb) if (q >= 0) { c[q] = (c[q] || 0) + 1; if (c[q] > bc) { bc = c[q]; best = q; } }
        if (bc >= 3) next[i] = best;
      }
      idx.set(next);
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
      // colours very close to the background (soft shadows, paper texture) count as background
      const near = new Set([bg]); for (let j = 0; j < K; j++) if (j !== dark && d3(P, j * 3, P, bg * 3) < 0.11 * 0.11) near.add(j);
      for (let i = 0; i < w * h; i++) if (near.has(idx[i])) idx[i] = bg;
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
