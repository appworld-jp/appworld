// Shared image helpers for App World Lab. All processing happens on this device; nothing is uploaded.
window.LabImg = {
  // read a File into an <img> without uploading it anywhere
  load(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error("画像ファイルを選んでください"));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("画像を読み込めませんでした")); };
      img.src = url;
    });
  },
  // pixels of the image scaled so the longer side is `max`
  pixels(img, max) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    return { w, h, data: g.getImageData(0, 0, w, h).data };
  },
  // k-means on RGB; returns centres sorted by how many pixels they cover
  kmeans(data, k, iters = 12) {
    const px = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) px.push([data[i], data[i + 1], data[i + 2]]);
    if (!px.length) return [];
    // k-means++ style seeding for stable, spread-out colours
    const cs = [px[Math.floor(px.length / 2)].slice()];
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    while (cs.length < k) {
      let best = null, bd = -1;
      for (let i = 0; i < px.length; i += Math.max(1, Math.floor(px.length / 2000))) {
        const d = Math.min(...cs.map(c => d2(c, px[i]))); if (d > bd) { bd = d; best = px[i]; }
      }
      cs.push(best.slice());
    }
    let counts = [];
    for (let it = 0; it < iters; it++) {
      const sum = cs.map(() => [0, 0, 0]); counts = cs.map(() => 0);
      for (const p of px) {
        let bi = 0, bd = Infinity;
        for (let j = 0; j < cs.length; j++) { const d = d2(cs[j], p); if (d < bd) { bd = d; bi = j; } }
        sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2] += p[2]; counts[bi]++;
      }
      cs.forEach((c, j) => { if (counts[j]) { c[0] = sum[j][0] / counts[j]; c[1] = sum[j][1] / counts[j]; c[2] = sum[j][2] / counts[j]; } });
    }
    return cs.map((c, j) => ({ rgb: c.map(Math.round), n: counts[j] })).sort((a, b) => b.n - a.n);
  },
  hex(rgb) { return "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase(); },
  // text colour that stays readable on the swatch
  ink(rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 150 ? "#1E1E1E" : "#FFFFFF"; },
  // wire a drop zone + file input to a callback
  bind(drop, input, onFile) {
    input.addEventListener("change", () => input.files[0] && onFile(input.files[0]));
    ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
  }
};
