(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const L = window.LabImg;
  const COUNTS = [3, 4, 5, 6, 7, 8];
  const SORTS = [["share", "多い順"], ["light", "明るい順"], ["hue", "色相順"]];
  const st = { px: [], k: 5, sort: "share", pal: [], seed: 1, img: null, total: 1 };

  // ---------- colour helpers ----------
  function hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
    return [h, s, l];
  }
  const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
  function colorName(rgb) {
    const [h, s, l] = hsl(rgb);
    if (l > 0.95) return "白"; if (l < 0.07) return "黒";
    if (s < 0.14) {
      if (l > 0.9) return "白"; if (l < 0.13) return "黒";
      const g = l > 0.68 ? "明るい灰色" : l < 0.32 ? "暗い灰色" : "灰色";
      if (s < 0.06) return g;
      const tint = h < 20 || h >= 330 ? "赤み" : h < 70 ? "黄み" : h < 170 ? "緑み" : h < 260 ? "青み" : "紫み";
      return tint + "の" + g;
    }
    if (h >= 20 && h < 60 && s < 0.65 && l > 0.68) return "ベージュ";
    let base;
    if (h < 12 || h >= 345) base = "赤"; else if (h < 40) base = "橙"; else if (h < 65) base = "黄";
    else if (h < 85) base = "黄緑"; else if (h < 155) base = "緑"; else if (h < 185) base = "青緑"; else if (h < 205) base = "水色";
    else if (h < 250) base = "青"; else if (h < 280) base = "青紫"; else if (h < 320) base = "紫"; else base = "赤紫";
    if ((base === "橙" || base === "赤" || base === "黄") && l < 0.42 && s < 0.9) return l < 0.22 ? "こげ茶" : "茶色";
    if (base === "水色" && l < 0.45) base = "青";
    if ((base === "赤" || base === "赤紫") && l > 0.7) return "ピンク";
    let mod = "";
    if (l > 0.8) mod = "淡い"; else if (l < 0.25) mod = "暗い"; else if (s < 0.4) mod = "くすんだ"; else if (s > 0.7 && l > 0.38 && l < 0.62) mod = "あざやかな";
    return mod + base;
  }

  // ---------- clustering with locked colours ----------
  function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  function cluster(px, k, fixed, seed) {
    const rand = rng(seed * 2654435761);
    const cs = fixed.map(c => c.slice());
    if (!cs.length) cs.push(px[Math.floor(rand() * px.length)].slice());
    while (cs.length < k) {
      // k-means++: pick a far pixel with probability proportional to squared distance
      const ds = px.map(p => Math.min(...cs.map(c => d2(c, p))));
      const sum = ds.reduce((a, b) => a + b, 0);
      let t = rand() * sum, i = 0;
      while (i < ds.length - 1 && t > ds[i]) { t -= ds[i]; i++; }
      cs.push(px[i].slice());
    }
    let counts = [];
    for (let it = 0; it < 14; it++) {
      const acc = cs.map(() => [0, 0, 0]); counts = cs.map(() => 0);
      for (const p of px) {
        let bi = 0, bd = Infinity;
        for (let j = 0; j < cs.length; j++) { const d = d2(cs[j], p); if (d < bd) { bd = d; bi = j; } }
        acc[bi][0] += p[0]; acc[bi][1] += p[1]; acc[bi][2] += p[2]; counts[bi]++;
      }
      for (let j = fixed.length; j < cs.length; j++) {
        if (counts[j]) cs[j] = acc[j].map(v => v / counts[j]);
        else cs[j] = px[Math.floor(rand() * px.length)].slice();
      }
    }
    return cs.map((c, j) => ({ rgb: c.map(v => Math.round(v)), n: counts[j], locked: j < fixed.length }));
  }

  function generate() {
    if (!st.px.length) return;
    const locked = st.pal.filter(c => c.locked);
    const fixed = locked.slice(0, st.k).map(c => c.rgb);
    const res = cluster(st.px, st.k, fixed, st.seed);
    // keep the ids of locked colours so they stay in place
    st.pal = res.map((c, i) => Object.assign(c, { id: i < fixed.length ? locked[i].id : "c" + st.seed + "-" + i }));
    render();
  }

  function sorted() {
    const a = st.pal.slice();
    if (st.sort === "share") a.sort((x, y) => y.n - x.n);
    else if (st.sort === "light") a.sort((x, y) => luma(y.rgb) - luma(x.rgb));
    else a.sort((x, y) => { const [hx, sx] = hsl(x.rgb), [hy, sy] = hsl(y.rgb); const gx = sx < 0.12, gy = sy < 0.12; if (gx !== gy) return gx ? 1 : -1; if (gx) return luma(y.rgb) - luma(x.rgb); return hx - hy; });
    return a;
  }

  // ---------- UI ----------
  function seg(box, items, cur, onPick, disabled) {
    box.textContent = "";
    for (const [v, t] of items) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = t;
      b.setAttribute("aria-pressed", String(v === cur));
      if (disabled && disabled(v)) b.disabled = true;
      b.addEventListener("click", () => onPick(v));
      box.appendChild(b);
    }
  }
  function renderControls() {
    const nLocked = st.pal.filter(c => c.locked).length;
    seg($("countSeg"), COUNTS.map(n => [n, n + "色"]), st.k, n => { st.k = n; generate(); renderControls(); }, n => n < nLocked);
    seg($("sortSeg"), SORTS, st.sort, v => { st.sort = v; render(); renderControls(); });
  }
  function render() {
    const ol = $("chips"); ol.textContent = "";
    const total = st.pal.reduce((a, c) => a + c.n, 0) || 1;
    sorted().forEach((c, i) => {
      const hex = L.hex(c.rgb), ink = L.ink(c.rgb);
      const li = document.createElement("li"); li.className = "chip" + (c.locked ? " locked" : "");
      const sw = document.createElement("div"); sw.className = "sw"; sw.style.background = hex; sw.style.color = ink;
      const no = document.createElement("span"); no.className = "no"; no.textContent = "No." + String(i + 1).padStart(2, "0");
      sw.appendChild(no);
      if (c.locked) { const lm = document.createElement("span"); lm.className = "lockmark"; lm.textContent = "固定"; sw.appendChild(lm); }
      const lab = document.createElement("div"); lab.className = "lab";
      const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = colorName(c.rgb);
      const hx = document.createElement("span"); hx.className = "hx"; hx.textContent = hex;
      const rgb = document.createElement("span"); rgb.className = "rgb"; rgb.textContent = `RGB ${c.rgb.join(", ")}`;
      const pct = document.createElement("span"); pct.className = "pct"; pct.textContent = `写真の約${Math.max(1, Math.round(c.n / total * 100))}%`;
      lab.append(nm, hx, rgb, pct);
      const bt = document.createElement("div"); bt.className = "bt";
      const cp = document.createElement("button"); cp.type = "button"; cp.textContent = "コピー"; cp.setAttribute("aria-label", `${hex}をコピー`);
      cp.addEventListener("click", () => copy(hex, `${hex}をコピーしました`));
      const lk = document.createElement("button"); lk.type = "button"; lk.textContent = c.locked ? "固定中" : "固定"; lk.setAttribute("aria-pressed", String(!!c.locked));
      lk.setAttribute("aria-label", `${hex}を固定する`);
      lk.addEventListener("click", () => { c.locked = !c.locked; render(); renderControls(); say(c.locked ? `${hex}を固定しました。` : `${hex}の固定を外しました。`); });
      bt.append(cp, lk);
      li.append(sw, lab, bt); ol.appendChild(li);
    });
  }
  let sayT = 0;
  function say(t) { $("msg").textContent = t; clearTimeout(sayT); sayT = setTimeout(() => { $("msg").textContent = ""; }, 3500); }

  async function copy(text, okMsg) {
    $("fallback").hidden = true;
    try { await navigator.clipboard.writeText(text); say(okMsg); return; } catch (e) { /* fall back below */ }
    const f = $("fallback"); f.hidden = false; f.value = text; f.focus(); f.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    say(ok ? okMsg : "自動でコピーできませんでした。下の欄から選んでコピーしてください。");
  }
  $("copyAll").addEventListener("click", () => {
    const lines = sorted().map(c => `${L.hex(c.rgb)}  rgb(${c.rgb.join(", ")})  ${colorName(c.rgb)}`);
    copy(lines.join("\n"), `${lines.length}色の色コードをコピーしました`);
  });
  $("regen").addEventListener("click", () => { st.seed++; generate(); say("固定していない色を作り直しました。"); });

  // ---------- PNG card ----------
  $("savePng").addEventListener("click", () => {
    const pal = sorted(), W = 1080, H = 1350, P = 64;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const SERIF = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif', MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
    g.fillStyle = "#F6F2EA"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1F1C18"; g.font = `600 52px ${SERIF}`; g.textBaseline = "alphabetic"; g.fillText("おえかき色見本", P, 110);
    g.font = `22px ${MONO}`; g.fillStyle = "#C8361E"; g.fillText("COLOR CHIPS", P, 56);
    g.fillStyle = "#1F1C18"; g.fillRect(P, 136, W - P * 2, 3);
    // photo, cropped to fill
    const ph = { x: P, y: 168, w: W - P * 2, h: 440 };
    if (st.img) {
      const iw = st.img.naturalWidth || st.img.width, ih = st.img.naturalHeight || st.img.height;
      const s = Math.max(ph.w / iw, ph.h / ih), sw = ph.w / s, sh = ph.h / s;
      g.drawImage(st.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, ph.x, ph.y, ph.w, ph.h);
    }
    // chips: up to 4 per row
    const per = pal.length <= 4 ? pal.length : Math.ceil(pal.length / 2), rows = Math.ceil(pal.length / per);
    const gap = 20, cw = (W - P * 2 - gap * (per - 1)) / per, top = 650, ch = rows === 1 ? 600 : 290;
    pal.forEach((c, i) => {
      const x = P + (i % per) * (cw + gap), y = top + Math.floor(i / per) * (ch + gap);
      g.fillStyle = "#FFFFFF"; g.fillRect(x, y, cw, ch);
      g.strokeStyle = "#E4DDD0"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      const sh = ch - 120;
      g.fillStyle = L.hex(c.rgb); g.fillRect(x, y, cw, sh);
      g.fillStyle = "#1F1C18"; g.font = `700 ${cw > 200 ? 30 : 24}px ${MONO}`; g.fillText(L.hex(c.rgb), x + 14, y + sh + 44);
      g.fillStyle = "#6E675C"; g.font = `${cw > 200 ? 20 : 16}px ${MONO}`; g.fillText(c.rgb.join(", "), x + 14, y + sh + 76);
      g.font = `${cw > 200 ? 20 : 16}px ${SERIF}`; g.fillText(colorName(c.rgb), x + 14, y + sh + 104);
    });
    g.fillStyle = "#6E675C"; g.font = `18px ${SERIF}`;
    g.fillText("App World Lab「おえかき色見本」で作成", P, H - 30);
    cv.toBlob(b => {
      if (!b) { say("画像を作れませんでした。"); return; }
      const url = URL.createObjectURL(b), a = document.createElement("a");
      a.href = url; a.download = "irominohon.png"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      say("色見本カードをPNGで保存しました。");
    }, "image/png");
  });

  // ---------- input ----------
  function useImage(img, src) {
    const { data } = L.pixels(img, 160);
    const px = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) px.push([data[i], data[i + 1], data[i + 2]]);
    if (!px.length) { $("loadMsg").textContent = "色を読み取れませんでした。ほかの写真を選んでください。"; return; }
    $("loadMsg").textContent = "";
    st.px = px; st.img = img; st.pal = []; st.seed = 1;
    $("preview").src = src;
    $("work").hidden = false;
    $("drop").classList.add("compact"); $("drop").querySelector(".drop-t").textContent = "べつの写真を選ぶ";
    $("sample").parentElement.hidden = true;
    generate(); renderControls();
    $("chips").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }
  L.bind($("drop"), $("file"), async f => {
    try { const { img, url } = await L.load(f); useImage(img, url); }
    catch (e) { $("loadMsg").textContent = e.message || "画像を読み込めませんでした。"; }
  });
  $("sample").addEventListener("click", () => {
    // a small painted scene drawn on this device
    const c = document.createElement("canvas"); c.width = 480; c.height = 320;
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, "#2E4A7D"); sky.addColorStop(.6, "#E58F65"); sky.addColorStop(1, "#F6C98B");
    g.fillStyle = sky; g.fillRect(0, 0, 480, 200);
    g.fillStyle = "#FBE7A1"; g.beginPath(); g.arc(330, 168, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2B5F75"; g.fillRect(0, 196, 480, 70);
    g.fillStyle = "#E9D6B0"; g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(240, 225, 480, 262); g.lineTo(480, 320); g.lineTo(0, 320); g.fill();
    g.fillStyle = "#3D5A3A"; g.beginPath(); g.moveTo(40, 320); g.lineTo(70, 200); g.lineTo(100, 320); g.fill();
    const img = new Image(); const src = c.toDataURL("image/png");
    img.onload = () => useImage(img, src); img.src = src;
  });
})();
