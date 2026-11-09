// ドット絵メーカー — downscale, reduce colours, show big with crisp pixels. On this device only.
(function () {
  const $ = id => document.getElementById(id);
  let img = null, url = null, pending = 0;
  const SCALE = 12;                 // each dot is drawn as a 12×12 block in the saved image

  function render() {
    const size = +$("size").value, k = +$("col").value;
    $("sizeV").textContent = size; $("colV").textContent = k;
    const { w, h, data } = LabImg.pixels(img, size);
    const pal = LabImg.kmeans(data, k, 8).map(c => c.rgb);
    const v = $("view"); v.width = w * SCALE; v.height = h * SCALE;
    const g = v.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue;
      let best = pal[0], bd = Infinity;
      for (const p of pal) { const d = (p[0] - data[i]) ** 2 + (p[1] - data[i + 1]) ** 2 + (p[2] - data[i + 2]) ** 2; if (d < bd) { bd = d; best = p; } }
      g.fillStyle = `rgb(${best[0]},${best[1]},${best[2]})`;
      g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
  // sliders re-render at most once per frame
  const queue = () => { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; img && render(); }); };

  async function open(file) {
    try {
      const r = await LabImg.load(file);
      if (url) URL.revokeObjectURL(url);
      img = r.img; url = r.url; $("out").hidden = false; render();
    } catch (e) { $("msg").textContent = e.message; }
  }
  LabImg.bind($("drop"), $("file"), open);
  $("size").oninput = queue; $("col").oninput = queue;
  $("save").onclick = () => {
    $("view").toBlob(b => {
      if (!b) { $("msg").textContent = "保存できませんでした"; return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "dot.png";
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      $("msg").textContent = "保存しました";
    }, "image/png");
  };
})();
