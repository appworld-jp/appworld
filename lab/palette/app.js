// おえかき色見本 — pick the main colours out of a photo, on this device only.
(function () {
  const $ = id => document.getElementById(id);
  let img = null, url = null, colors = [];

  function render() {
    const { data } = LabImg.pixels(img, 160);
    colors = LabImg.kmeans(data, +$("count").value);
    const total = colors.reduce((a, c) => a + c.n, 0) || 1;
    const ol = $("sw"); ol.replaceChildren();
    colors.forEach(c => {
      const li = document.createElement("li"), hex = LabImg.hex(c.rgb);
      li.style.background = hex; li.style.color = LabImg.ink(c.rgb);
      const b = document.createElement("button"); b.type = "button"; b.textContent = hex; b.title = "この色コードをコピー";
      b.onclick = () => copy(hex, `${hex} をコピーしました`);
      const s = document.createElement("small"); s.textContent = `${Math.round(c.n / total * 100)}%`;
      li.append(b, s); ol.append(li);
    });
  }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); $("msg").textContent = done; }
    catch (e) { $("msg").textContent = "コピーできませんでした"; }
    setTimeout(() => $("msg").textContent = "", 2200);
  }
  async function open(file) {
    try {
      const r = await LabImg.load(file);
      if (url) URL.revokeObjectURL(url);
      img = r.img; url = r.url; $("preview").src = url; $("out").hidden = false; render();
    } catch (e) { $("msg").textContent = e.message; }
  }
  LabImg.bind($("drop"), $("file"), open);
  $("count").onchange = () => img && render();
  $("copy").onclick = () => copy(colors.map(c => LabImg.hex(c.rgb)).join(" "), "まとめてコピーしました");
})();
