/* App page: the page is fully pre-rendered. This only keeps the orbit dot on its ring at any size. */
(function () {
  const orbit = document.querySelector(".orbit");
  if (!orbit) return;
  const fit = () => orbit.style.setProperty("--r", (orbit.clientWidth / 2) + "px");
  addEventListener("resize", fit);
  fit();
})();
