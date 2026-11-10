/* All-apps page: keyword search, filter chips and sort over the pre-rendered list.
   Each <li> carries its fields as data-* attributes; text is only ever set with textContent. */
(function () {
  const $ = id => document.getElementById(id);
  const grid = $("grid");
  if (!grid) return;
  const APPS = [...grid.children].map(li => ({
    li, n: li.dataset.n, t: li.dataset.t, m: li.dataset.m, p: li.dataset.p, g: li.dataset.g,
    a: li.dataset.a.split("|"), s: li.dataset.s, d: li.dataset.d,
    nm: li.querySelector(".nm"), tl: li.querySelector("p"),
  }));
  if (!APPS.length) return;
  $("finder").hidden = false;
  $("bar-r").hidden = false;

  const state = { q: "", p: new Set(), g: new Set(), a: new Set(), s: new Set(), sort: "new" };
  const has = (x, key, v) => key === "a" ? x.a.includes(v) : x[key] === v;
  const groups = {
    p: ["iPhone", "Android", "Web"],
    g: [...new Set(APPS.map(x => x.g))],
    a: [...new Set(APPS.flatMap(x => x.a))].sort(),
    s: ["公開中", "試作中"],
  };

  // chips with counts
  for (const key of ["p", "g", "a", "s"]) {
    const box = $("f-" + key);
    groups[key].forEach(v => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.v = v; b.setAttribute("aria-pressed", "false");
      b.append(v);
      const s = document.createElement("small"); s.textContent = APPS.filter(x => has(x, key, v)).length; b.append(s);
      b.addEventListener("click", () => {
        state[key].has(v) ? state[key].delete(v) : state[key].add(v);
        b.setAttribute("aria-pressed", state[key].has(v));
        render();
      });
      box.append(b);
    });
  }

  // a keyword matches name, tagline, maker, genre, AI or platform; spaces mean AND
  const norm = s => s.normalize("NFKC").toLowerCase();
  const words = () => norm(state.q).split(/\s+/).filter(Boolean);
  function matches(x) {
    for (const key of ["p", "g", "a", "s"]) {
      if (state[key].size && ![...state[key]].some(v => has(x, key, v))) return false;
    }
    const hay = norm([x.n, x.t, x.m, x.g, x.a.join(" "), x.p].join(" "));
    return words().every(w => hay.includes(w));
  }
  function highlight(el, text) {
    const ws = words();
    el.textContent = "";
    if (!ws.length) { el.textContent = text; return; }
    const n = norm(text); let i = 0;
    while (i < text.length) {
      let hit = null;
      for (const w of ws) if (n.startsWith(w, i) && (!hit || w.length > hit.length)) hit = w;
      if (hit) { const m = document.createElement("mark"); m.textContent = text.slice(i, i + hit.length); el.append(m); i += hit.length; }
      else { let j = i + 1; while (j < text.length && !ws.some(w => n.startsWith(w, j))) j++; el.append(text.slice(i, j)); i = j; }
    }
  }
  const order = {
    new: (a, b) => b.d.localeCompare(a.d),
    old: (a, b) => a.d.localeCompare(b.d),
    name: (a, b) => a.n.localeCompare(b.n, "ja"),
  };
  function render() {
    const list = APPS.filter(matches).sort(order[state.sort]);
    list.forEach(x => { highlight(x.nm, x.n); highlight(x.tl, x.t); });
    grid.replaceChildren(...list.map(x => x.li));
    const filtered = state.q || state.p.size || state.g.size || state.a.size || state.s.size;
    const b = document.createElement("b"); b.textContent = list.length;
    $("count").replaceChildren(filtered ? `${APPS.length}件中 ` : "全 ", b, "件");
    $("none").hidden = list.length > 0;
    $("clear").hidden = !filtered;
  }
  function clearAll() {
    state.q = ""; $("q").value = "";
    ["p", "g", "a", "s"].forEach(k => state[k].clear());
    document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
    render();
  }
  $("q").addEventListener("input", e => { state.q = e.target.value; render(); });
  $("finder").addEventListener("submit", e => e.preventDefault());
  $("sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("clear").addEventListener("click", clearAll);
  $("clear2").addEventListener("click", clearAll);

  // links from the app pages: ?q=keyword, ?g=genre
  const params = new URLSearchParams(location.search);
  if (params.get("q")) { state.q = params.get("q"); $("q").value = state.q; }
  const g = params.get("g");
  if (g && groups.g.includes(g)) {
    state.g.add(g);
    document.querySelectorAll("#f-g .chip").forEach(c => { if (c.dataset.v === g) c.setAttribute("aria-pressed", "true"); });
  }
  render();
})();
