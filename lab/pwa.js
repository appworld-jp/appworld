// App World Lab — shared helper loaded by every app (../pwa.js).
// Registers the app's own service worker (sw.js next to index.html, scope = the app folder)
// so the app can be added to the home screen and opened offline.
// Also shows one dismissible line in the footer about adding the app to the home screen.
// Nothing is sent anywhere. Generated apps reference this file via tools/make_pwa.mjs.
(function () {
  "use strict";

  var KEY = "appworld-lab:pwa-hint-off";
  var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if ("serviceWorker" in navigator && secure) {
    var reg = function () { navigator.serviceWorker.register("sw.js").catch(function () {}); };
    if (document.readyState === "complete") reg(); else window.addEventListener("load", reg);
  }

  function standalone() {
    try {
      if (window.navigator.standalone === true) return true;
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch (e) { return false; }
  }
  function off() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }

  function hint() {
    if (standalone() || off()) return;
    var touch = false;
    try { touch = window.matchMedia("(pointer: coarse)").matches; } catch (e) {}
    if (!touch) return;
    var foot = document.querySelector("footer");
    if (!foot || foot.querySelector(".pwa-hint")) return;

    var p = document.createElement("p");
    p.className = "pwa-hint";
    p.appendChild(document.createTextNode(
      "ホーム画面に追加すると、アプリのように開けて、電波がなくても使えます。" +
      "iPhone：共有 → ホーム画面に追加（記録はSafariとは別になります）。" +
      "Android：メニュー → ホーム画面に追加（アプリをインストール）。"));
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = "閉じる";
    b.setAttribute("aria-label", "ホーム画面に追加の案内を閉じる");
    var s = b.style;
    s.font = "inherit"; s.color = "inherit"; s.background = "none"; s.border = "0"; s.boxShadow = "none";
    s.margin = "0"; s.padding = "4px 6px"; s.width = "auto"; s.minWidth = "0"; s.minHeight = "0"; s.height = "auto";
    s.display = "inline"; s.textDecoration = "underline"; s.cursor = "pointer"; s.borderRadius = "4px";
    s.letterSpacing = "inherit"; s.textTransform = "none";
    b.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      p.remove();
    });
    p.appendChild(document.createTextNode(" "));
    p.appendChild(b);
    foot.appendChild(p);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hint); else hint();
})();
