/* All-apps page: keyword search + filter chips + sort over window.APPS. Everything is rendered with textContent. */
(function () {
  const APPS = window.APPS;
  const $ = id => document.getElementById(id);
  const state = { q: "", p: new Set(), g: new Set(), a: new Set(), s: new Set(), sort: "new" };
  const val = (x, key) => key === "s" ? (x.b ? "試作中" : "公開中") : x[key];
  const groups = { p: ["iPhone", "Android", "Web"], g: [], a: [], s: ["公開中", "試作中"] };
  groups.g = [...new Set(APPS.map(x => x.g))];
  groups.a = [...new Set(APPS.map(x => x.a))].sort();

  // chips with counts
  for (const key of ["p", "g", "a", "s"]) {
    const box = $("f-" + key);
    groups[key].forEach(v => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", "false");
      b.append(v);
      const s = document.createElement("small"); s.textContent = APPS.filter(x => val(x, key) === v).length; b.append(s);
      b.onclick = () => { state[key].has(v) ? state[key].delete(v) : state[key].add(v); b.setAttribute("aria-pressed", state[key].has(v)); render(); };
      box.append(b);
    });
  }
  // a keyword matches name, tagline, maker, genre or AI; spaces mean AND
  const norm = s => s.normalize("NFKC").toLowerCase();
  function matches(x) {
    if (state.p.size && !state.p.has(x.p)) return false;
    if (state.g.size && !state.g.has(x.g)) return false;
    if (state.a.size && !state.a.has(x.a)) return false;
    if (state.s.size && !state.s.has(val(x, "s"))) return false;
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    const hay = norm([x.n, x.t, x.m, x.g, x.a, x.p].join(" "));
    return words.every(w => hay.includes(w));
  }
  function highlight(el, text) {
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    el.textContent = "";
    if (!words.length) { el.textContent = text; return; }
    const n = norm(text); let i = 0;
    while (i < text.length) {
      let hit = null;
      for (const w of words) if (n.startsWith(w, i) && (!hit || w.length > hit.length)) hit = w;
      if (hit) { const m = document.createElement("mark"); m.textContent = text.slice(i, i + hit.length); el.append(m); i += hit.length; }
      else { let j = i + 1; while (j < text.length && !words.some(w => n.startsWith(w, j))) j++; el.append(text.slice(i, j)); i = j; }
    }
  }
  function render() {
    let list = APPS.filter(matches);
    list.sort(state.sort === "name" ? (a, b) => a.n.localeCompare(b.n, "ja") : state.sort === "old" ? (a, b) => a.d.localeCompare(b.d) : (a, b) => b.d.localeCompare(a.d));
    const grid = $("grid"); grid.replaceChildren();
    list.forEach(x => {
      const li = document.createElement("li");
      const a = document.createElement("a"); a.className = "item glass"; a.href = "app.html?id=" + encodeURIComponent(x.id); a.style.setProperty("--c", x.c);
      a.innerHTML = '<span class="mini"><b></b></span><span class="it"><span class="date"></span><h2><span class="nm"></span><span class="sample">運営</span></h2><p></p><span class="meta"><span></span><span></span><span></span></span></span>';
      a.querySelector(".mini b").textContent = x.n[0];
      a.querySelector(".date").textContent = x.d.replaceAll("-", ".");
      highlight(a.querySelector(".nm"), x.n);
      if (x.b) { const bt = document.createElement("span"); bt.className = "beta"; bt.textContent = "試作中"; a.querySelector("h2").append(bt); }
      highlight(a.querySelector("p"), x.t);
      const m = a.querySelectorAll(".meta span"); m[0].textContent = x.p; m[1].textContent = x.g; m[2].textContent = x.a;
      li.append(a); grid.append(li);
    });
    const filtered = state.q || state.p.size || state.g.size || state.a.size || state.s.size;
    $("count").replaceChildren();
    const b = document.createElement("b"); b.textContent = list.length;
    $("count").append(filtered ? `${APPS.length}件中 ` : "全 ", b, "件");
    $("none").hidden = list.length > 0;
    $("clear").hidden = !filtered;
  }
  function clearAll() {
    state.q = ""; $("q").value = ""; ["p", "g", "a", "s"].forEach(k => state[k].clear());
    document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
    render();
  }
  $("q").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("finder").addEventListener("submit", e => e.preventDefault());
  $("sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("clear").onclick = clearAll; $("clear2").onclick = clearAll;
  // deep links from the home page: ?q=keyword, ?g=genre
  const params = new URLSearchParams(location.search);
  if (params.get("q")) { state.q = params.get("q"); $("q").value = state.q; }
  const g = params.get("g");
  if (g && groups.g.includes(g)) { state.g.add(g); document.querySelectorAll("#f-g .chip").forEach(c => { if (c.firstChild.textContent === g) c.setAttribute("aria-pressed", "true"); }); }
  render();
})();
