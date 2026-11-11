/* Every page: the service worker (offline use, add to home screen), the 新着 tab on the home page,
   and a small dismissible hint on phones about adding App World to the home screen.
   Nothing is sent anywhere. localStorage only remembers that the hint was closed. Text is set with textContent. */
(function () {
  "use strict";
  var KEY = "appworld:a2hs-hint-off";

  if ("serviceWorker" in navigator && window.isSecureContext) {
    var reg = function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); };
    if (document.readyState === "complete") reg(); else addEventListener("load", reg);
  }

  /* home page: the 新着 tab lights up while the 新着 shelf is on screen */
  var shelf = document.getElementById("shelf");
  var tabHome = document.querySelector('.tabs a[data-tab="home"]'), tabNew = document.querySelector('.tabs a[data-tab="new"]');
  if (shelf && tabHome && tabNew && tabHome.classList.contains("on") && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var inView = es[0].isIntersecting;
      tabNew.classList.toggle("on", inView); tabHome.classList.toggle("on", !inView);
      if (inView) { tabNew.setAttribute("aria-current", "location"); tabHome.removeAttribute("aria-current"); }
      else { tabHome.setAttribute("aria-current", "page"); tabNew.removeAttribute("aria-current"); }
    }, { rootMargin: "-45% 0px -45% 0px" }).observe(shelf);
  }

  /* add-to-home-screen hint */
  function standalone() {
    try { return navigator.standalone === true || matchMedia("(display-mode: standalone)").matches; } catch (e) { return false; }
  }
  function off() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  var phone = false;
  try { phone = matchMedia("(pointer: coarse) and (max-width: 720px)").matches; } catch (e) {}

  var deferred = null, box = null;
  addEventListener("beforeinstallprompt", function (e) {   // Android Chrome: offer its own install dialog
    e.preventDefault(); deferred = e;
    var b = box && box.querySelector(".a2hs-add"); if (b) b.hidden = false;
  });
  addEventListener("appinstalled", function () { remember(); close(); });

  function close() {
    if (!box) return;
    box.classList.remove("show");
    var b = box; box = null;
    setTimeout(function () { b.remove(); }, 400);
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  function show() {
    if (box || standalone() || off()) return;
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var how = ios ? "Safariの共有ボタン →「ホーム画面に追加」"
      : /Android/.test(ua) ? "メニュー（⋮）→「ホーム画面に追加」か「アプリをインストール」"
      : "ブラウザのメニュー →「ホーム画面に追加」";
    box = el("aside", "a2hs");
    box.setAttribute("aria-label", "ホーム画面に追加");
    var t = el("p", "a2hs-t");
    t.append(el("b", "", "ホーム画面に追加できます"), el("span", "", how));
    var acts = el("div", "a2hs-acts");
    var add = el("button", "a2hs-add", "追加する"); add.type = "button"; add.hidden = !deferred;
    add.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r && r.outcome === "accepted") { remember(); close(); } }, function () {});
      deferred = null; add.hidden = true;
    });
    var x = el("button", "a2hs-x", "閉じる"); x.type = "button";
    x.setAttribute("aria-label", "ホーム画面に追加の案内を閉じる");
    x.addEventListener("click", function () { remember(); close(); });
    acts.append(add, x);
    box.append(t, acts);
    document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (box) box.classList.add("show"); }); });
    // out of the way while scrolling down; back when scrolling up
    var lastY = scrollY;
    addEventListener("scroll", function () {
      if (!box) return;
      var y = scrollY;
      if (y > lastY + 8) box.classList.remove("show"); else if (y < lastY - 8) box.classList.add("show");
      lastY = y;
    }, { passive: true });
  }
  if (phone && !standalone() && !off()) setTimeout(show, 2500);
})();
