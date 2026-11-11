// App World Lab — shared helper loaded by every app (../pwa.js).
// Registers the app's own service worker (sw.js next to index.html, scope = the app folder)
// so the app can be added to the home screen and opened offline.
// On phones that have not added the app yet, a small bar at the bottom explains how to add it:
// it slides in 3 seconds after the page opens, slides away while you scroll down or type (and after
// 12 seconds), comes back when you scroll up,
// and stays away for good once closed or added (remembered in localStorage).
// Nothing is sent anywhere. Generated apps reference this file via tools/make_pwa.mjs.
// The apps' CSS is not touched: the bar is styled here through element.style (allowed by style-src 'self').
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
  function remember() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  function css(el, rules) { for (var k in rules) el.style[k] = rules[k]; return el; }

  var bar = null, deferred = null, addBtn = null, hidden = false;

  window.addEventListener("beforeinstallprompt", function (e) {   // Android Chrome: its own install dialog
    e.preventDefault();
    deferred = e;
    if (addBtn) addBtn.style.display = "";
  });
  window.addEventListener("appinstalled", function () { remember(); close(); });

  function place(show) {
    if (!bar) return;
    hidden = !show;
    bar.style.transform = show ? "translateY(0)" : "translateY(calc(100% + 24px))";
    bar.style.opacity = show ? "1" : "0";
  }
  function close() {
    if (!bar) return;
    var b = bar; bar = null;
    b.style.transform = "translateY(calc(100% + 24px))"; b.style.opacity = "0";
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
  }
  function button(text, primary) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    return css(b, {
      font: "inherit", fontSize: "13px", fontWeight: "600", lineHeight: "1", letterSpacing: "normal", textTransform: "none",
      margin: "0", padding: "0 14px", height: "40px", minHeight: "40px", minWidth: "0", width: "auto", flex: "none",
      borderRadius: "999px", cursor: "pointer", boxShadow: "none",
      background: primary ? "#F1F1F0" : "transparent", color: primary ? "#1E1F20" : "#F1F1F0",
      border: primary ? "0" : "1px solid rgba(241,241,240,.45)"
    });
  }

  function hint() {
    if (bar || standalone() || off()) return;
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var how = ios ? "Safariの共有ボタンから「ホーム画面に追加」。記録はSafariとは別に保存されます。"
      : /Android/.test(ua) ? "メニュー（⋮）から「ホーム画面に追加」または「アプリをインストール」。"
      : "ブラウザのメニューから「ホーム画面に追加」。";

    bar = css(document.createElement("aside"), {
      position: "fixed", left: "10px", right: "10px", bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", zIndex: "2147483000",
      display: "flex", alignItems: "center", gap: "10px", padding: "10px 10px 10px 14px", margin: "0",
      background: "rgba(30,31,32,.94)", color: "#F1F1F0", borderRadius: "16px", boxShadow: "0 12px 30px -12px rgba(0,0,0,.55)",
      fontFamily: "system-ui, -apple-system, \"Hiragino Sans\", \"Noto Sans JP\", sans-serif", textAlign: "left",
      maxWidth: "560px", marginInline: "auto", boxSizing: "border-box",
      transform: "translateY(calc(100% + 24px))", opacity: "0", transition: "transform .35s ease, opacity .35s ease"
    });
    bar.className = "pwa-hint";
    bar.setAttribute("aria-label", "ホーム画面に追加");
    var text = css(document.createElement("p"), { margin: "0", flex: "1", minWidth: "0", fontSize: "12px", lineHeight: "1.55", color: "inherit" });
    var b = css(document.createElement("b"), { display: "block", fontSize: "13px", fontWeight: "700", color: "inherit" });
    b.textContent = "ホーム画面に追加すると、電波がなくても使えます";
    var s = css(document.createElement("span"), { display: "block", opacity: ".8", color: "inherit" });
    s.textContent = how;
    text.appendChild(b); text.appendChild(s);

    addBtn = button("追加する", true);
    if (!deferred) addBtn.style.display = "none";
    addBtn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r && r.outcome === "accepted") { remember(); close(); } }, function () {});
      deferred = null; addBtn.style.display = "none";
    });
    var x = button("閉じる", false);
    x.setAttribute("aria-label", "ホーム画面に追加の案内を閉じる");
    x.addEventListener("click", function () { remember(); close(); });

    bar.appendChild(text); bar.appendChild(addBtn); bar.appendChild(x);
    document.body.appendChild(bar);
    requestAnimationFrame(function () { requestAnimationFrame(function () { place(true); }); });
    // never in the way for long: after 12 seconds it slides away until the next scroll up
    setTimeout(function () { if (bar && !hidden) place(false); }, 12000);

    // out of the way while scrolling down (towards the app's buttons) or typing; back when scrolling up
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      if (!bar) return;
      var y = window.scrollY;
      if (y > lastY + 8 && !hidden) place(false);
      else if (y < lastY - 8 && hidden && !typing()) place(true);
      lastY = y;
    }, { passive: true });
    document.addEventListener("focusin", function () { if (typing()) place(false); });
    document.addEventListener("focusout", function () { setTimeout(function () { if (bar && !typing()) place(true); }, 50); });
  }
  function typing() {
    var a = document.activeElement;
    return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable);
  }

  function start() {
    if (standalone() || off()) return;
    var touch = false;
    try { touch = window.matchMedia("(pointer: coarse)").matches; } catch (e) {}
    if (!touch) return;
    setTimeout(hint, 3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
