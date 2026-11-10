/* App page (preview): renders one listing from window.APPS by ?id=. The real site writes one static page per app instead. */
(function () {
  const $ = id => document.getElementById(id);
  const APPS = window.APPS;
  const id = new URLSearchParams(location.search).get("id");
  const app = APPS.find(a => a.id === id) || (!id ? APPS[0] : null);
  if (!app) { $("detail").hidden = true; $("missing").hidden = false; return; }

  document.documentElement.dataset.page = app.n;
  document.title = document.title.split(" | ")[0] + " | " + app.n;
  document.querySelector(".detail").style.setProperty("--c", app.c);
  const date = app.d.replaceAll("-", ".");
  $("crumb-g").textContent = app.g; $("crumb-g").href = "apps.html?g=" + encodeURIComponent(app.g);
  $("d-initial").textContent = app.n[0];
  $("d-date").textContent = date + " に公開";
  $("d-name").textContent = app.n;
  if (app.b) { const bt = document.createElement("span"); bt.className = "beta"; bt.textContent = "試作中"; $("d-name").append(" ", bt); }
  $("d-tag").textContent = app.t;
  $("d-desc").textContent = app.x;

  const open = $("d-open");
  open.textContent = (app.p === "iPhone" ? (app.b ? "TestFlightで開く" : "App Storeで開く") : app.p === "Android" ? "Google Playで開く" : "アプリを開く") + " ↗";
  if (app.u && /^https:\/\/appworld-lab\.pages\.dev\//.test(app.u)) {
    open.href = app.u;
    $("d-note").textContent = "App Worldの運営が作った試作アプリです。ブラウザですぐに使えます。";
  } else {
    open.setAttribute("aria-disabled", "true"); open.removeAttribute("href");
    $("d-note").textContent = "サンプルのため、リンク先はありません";
  }

  $("s-p").textContent = app.p;
  $("s-g").textContent = app.g; $("s-g").href = "apps.html?g=" + encodeURIComponent(app.g);
  $("s-m").textContent = app.m;
  $("s-a").textContent = app.a; $("s-a").href = "apps.html?q=" + encodeURIComponent(app.a);
  $("s-d").textContent = date;
  $("s-s").textContent = app.b ? "試作中（ベータ）" : "公開中";
  const pageUrl = location.origin + location.pathname + "?id=" + encodeURIComponent(app.id);
  $("d-share").href = "https://x.com/intent/post?" + new URLSearchParams({ text: app.n + " — " + app.t, url: pageUrl }).toString();

  // keep the orbit dot on the ring whatever the size
  const orbit = document.querySelector(".orbit");
  const fit = () => orbit.style.setProperty("--r", (orbit.clientWidth / 2) + "px");
  addEventListener("resize", fit); fit();

  // same genre (others first by date), padded with the newest from other genres
  const others = APPS.filter(a => a !== app).sort((a, b) => b.d.localeCompare(a.d));
  const related = [...others.filter(a => a.g === app.g), ...others.filter(a => a.g !== app.g)].slice(0, 3);
  const allSame = related.every(x => x.g === app.g);
  $("more-cap").textContent = allSame ? app.g : "More apps";
  $("more-h").textContent = allSame ? "同じジャンルのアプリ" : "ほかのアプリも見る";
  related.forEach(x => {
    const li = document.createElement("li");
    const a = document.createElement("a"); a.className = "item glass"; a.href = "app.html?id=" + encodeURIComponent(x.id); a.style.setProperty("--c", x.c);
    a.innerHTML = '<span class="mini"><b></b></span><span class="it"><span class="date"></span><h2></h2><p></p><span class="meta"><span></span><span></span></span></span>';
    a.querySelector(".mini b").textContent = x.n[0];
    a.querySelector(".date").textContent = x.d.replaceAll("-", ".");
    a.querySelector("h2").textContent = x.n;
    a.querySelector("p").textContent = x.t;
    const m = a.querySelectorAll(".meta span"); m[0].textContent = x.p; m[1].textContent = x.g;
    li.append(a); $("more").append(li);
  });

  // previous / next in date order
  const ordered = [...APPS].sort((a, b) => b.d.localeCompare(a.d) || a.n.localeCompare(b.n, "ja"));
  const i = ordered.indexOf(app);
  const link = (el, x, label) => { if (!x) return; el.textContent = label + x.n; el.href = "app.html?id=" + encodeURIComponent(x.id); };
  link($("prev"), ordered[i - 1], "← ");
  link($("next"), ordered[i + 1], "");
  if (ordered[i + 1]) $("next").textContent += " →";
})();
