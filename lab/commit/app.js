/* コミット清書 — UI. All user text goes through textContent. */
(function () {
  "use strict";
  var R = window.CommitRules;
  var KEY = "commit-seisho.v1";
  var MAX_HIST = 20;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- storage ---------- */
  var store = { prefs: { lang: "ja", jaStyle: "taigen", wrap: true, issueKw: "Refs", tab: "write" }, draft: {}, hist: [] };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var d = JSON.parse(raw);
      if (d && typeof d === "object") {
        if (d.prefs && typeof d.prefs === "object") Object.keys(store.prefs).forEach(function (k) { if (d.prefs[k] != null) store.prefs[k] = d.prefs[k]; });
        if (d.draft && typeof d.draft === "object") store.draft = d.draft;
        if (Array.isArray(d.hist)) store.hist = d.hist.filter(function (h) { return h && typeof h.m === "string"; }).slice(0, MAX_HIST);
      }
    }
  } catch (e) { /* ignore broken data */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }
  function str(v) { return typeof v === "string" ? v : ""; }

  /* ---------- tabs ---------- */
  var TABS = ["write", "fix", "hist", "sheet"];
  function showTab(name, focus) {
    if (TABS.indexOf(name) < 0) name = "write";
    TABS.forEach(function (t) {
      var on = t === name, tab = $("tab-" + t);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      $("p-" + t).hidden = !on;
      if (on && focus) tab.focus();
    });
    $("prefs").hidden = name === "hist";
    $("lang-seg").hidden = name === "fix";
    store.prefs.tab = name; save();
    if (name === "hist") renderHist();
  }
  TABS.forEach(function (t, i) {
    var tab = $("tab-" + t);
    tab.addEventListener("click", function () { showTab(t); });
    tab.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowRight") n = TABS[(i + 1) % TABS.length];
      else if (e.key === "ArrowLeft") n = TABS[(i + TABS.length - 1) % TABS.length];
      else if (e.key === "Home") n = TABS[0];
      else if (e.key === "End") n = TABS[TABS.length - 1];
      if (n) { e.preventDefault(); showTab(n, true); }
    });
  });

  /* ---------- prefs ---------- */
  function radios(name) { return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]')); }
  function setRadio(name, v) { radios(name).forEach(function (r) { r.checked = r.value === v; }); }
  setRadio("lang", store.prefs.lang);
  setRadio("jastyle", store.prefs.jaStyle);
  radios("lang").forEach(function (r) { r.addEventListener("change", function () { store.prefs.lang = r.value; save(); applyLang(); renderWrite(); renderSheet(); }); });
  radios("jastyle").forEach(function (r) { r.addEventListener("change", function () { store.prefs.jaStyle = r.value; save(); renderWrite(); renderSheet(); if (!$("fix-out").hidden) lintFixDst(); }); });

  var PH = {
    ja: { summary: "ログイン後にトップへ戻される問題を修正", why: "ログインのたびにトップへ戻され、見ていたページを開き直す手間があったため。",
      what: "ログイン前のURLを保存して、ログイン後にそのページへ戻す\n戻り先は同じサイトのURLだけに限定", brk: "設定のキー名をloginUrlからauthUrlに変更",
      help: "何をしたかを1行で。全角は2文字分で数えます。" },
    en: { summary: "keep users on the same page after login", why: "Users were sent back to the top page after every login and had to find their page again.",
      what: "save the URL before login and return to it afterwards\nonly allow return URLs on the same site", brk: "the loginUrl option is renamed to authUrl",
      help: "命令形で、小文字から。added ではなく add のように書きます。" }
  };
  var PH_DESU = "ログイン後にトップへ戻される問題を修正しました";
  function applyLang() {
    var p = PH[store.prefs.lang] || PH.ja;
    $("summary").placeholder = store.prefs.lang === "ja" && store.prefs.jaStyle === "desu" ? PH_DESU : p.summary;
    $("why").placeholder = p.why; $("what").placeholder = p.what; $("break-note").placeholder = p.brk;
    $("sum-help").textContent = p.help;
    $("style-seg").classList.toggle("dim", store.prefs.lang !== "ja");
  }

  /* ---------- 書く ---------- */
  var typesBox = $("types");
  R.TYPES.forEach(function (t) {
    var lab = el("label", "type");
    var inp = document.createElement("input");
    inp.type = "radio"; inp.name = "type"; inp.value = t.id;
    var face = el("span", "t-face");
    face.appendChild(el("b", "mono", t.id));
    face.appendChild(el("span", "t-l", t.label));
    lab.appendChild(inp); lab.appendChild(face);
    typesBox.appendChild(lab);
  });
  /* 自分で追加した種類（英小文字）。この端末に覚えて、次から候補に並べる */
  var ownType = window.OwnChoices({
    key: KEY + ".custom", name: "type", host: typesBox, max: 15, addLabel: "＋ 自分で入力",
    builtins: R.TYPES.map(function (t) { return { value: t.id, label: t.id }; }),
    placeholder: "deps", inputLabel: "種類を英小文字で入力", emptyMsg: "種類を英小文字で入れてから「追加」を押してください。",
    parse: function (t) {
      var v = t.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
      return /^[a-z]{1,15}$/.test(v) ? { value: v } : { error: "英小文字だけで、15文字までにしてください（例：deps）。" };
    },
    extra: function () { var c = currentType() || (store.draft && store.draft.type); return c ? [c] : []; },
    chip: function (v) {
      var lab = el("label", "type");
      var inp = document.createElement("input");
      inp.type = "radio"; inp.name = "type"; inp.value = v;
      inp.checked = currentType() === v;
      var face = el("span", "t-face");
      face.appendChild(el("b", "mono", v));
      face.appendChild(el("span", "t-l", "自分で追加"));
      lab.appendChild(inp); lab.appendChild(face);
      return lab;
    },
    onPick: function (v) { setRadio("type", v); onForm(); },
    onRemove: function () { fillFixTypes(); }
  });
  function ownTypes() { return ownType.list(); }
  function isType(v) { return typeof v === "string" && (R.TYPE_IDS.indexOf(v) >= 0 || /^[a-z]{1,15}$/.test(v)); }
  var typeHint = el("p", "type-hint"); typeHint.hidden = true; typeHint.setAttribute("aria-live", "polite");
  typesBox.parentNode.appendChild(typeHint);

  var F = { scope: $("scope"), summary: $("summary"), why: $("why"), what: $("what"), breaking: $("breaking"),
    breakNote: $("break-note"), issues: $("issues"), issueKw: $("issue-kw"), wrap: $("wrap") };
  function currentType() { var r = document.querySelector('input[name="type"]:checked'); return r ? r.value : ""; }
  function readForm() {
    return { type: currentType(), scope: F.scope.value.trim().replace(/[\s()]+/g, "-").replace(/^-+|-+$/g, ""), summary: F.summary.value,
      why: F.why.value, what: F.what.value, breaking: F.breaking.checked, breakNote: F.breakNote.value,
      issues: F.issues.value, issueKw: F.issueKw.value, wrap: F.wrap.checked };
  }
  function loadDraft() {
    var d = store.draft || {};
    if (isType(d.type)) { ownType.render(); setRadio("type", d.type); }
    F.scope.value = str(d.scope); F.summary.value = str(d.summary); F.why.value = str(d.why); F.what.value = str(d.what);
    F.breaking.checked = d.breaking === true; F.breakNote.value = str(d.breakNote); F.issues.value = str(d.issues);
    F.issueKw.value = ["Refs", "Closes", "Fixes"].indexOf(store.prefs.issueKw) >= 0 ? store.prefs.issueKw : "Refs";
    F.wrap.checked = store.prefs.wrap !== false;
  }
  function saveDraft() {
    var f = readForm();
    store.draft = { type: f.type, scope: F.scope.value, summary: f.summary, why: f.why, what: f.what, breaking: f.breaking, breakNote: f.breakNote, issues: f.issues };
    store.prefs.wrap = f.wrap; store.prefs.issueKw = f.issueKw; save();
  }

  function hash7(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-7);
  }
  function renderMsg(pre, text) {
    pre.textContent = "";
    text.split("\n").forEach(function (line, i) {
      var row = el("span", i === 0 ? "ln h" : "ln");
      var lc = el("span", "lc");
      var limit = i === 0 ? 50 : 72;
      if (R.width(line) > limit && !(i > 0 && /^( {4}|\s*\S*:\/\/)/.test(line))) {
        var parts = R.cut(line, limit);
        lc.appendChild(document.createTextNode(parts[0]));
        lc.appendChild(el("mark", i === 0 && R.width(line) <= 72 ? "over soft" : "over", parts[1]));
      } else lc.textContent = line;
      if (/^BREAKING CHANGE:/.test(line)) row.classList.add("brk");
      else if (/^(Refs|Closes|Fixes|Resolves) /.test(line)) row.classList.add("ref");
      row.appendChild(lc);
      pre.appendChild(row);
    });
  }

  var LEVEL_ICON = { ok: "✓", warn: "!", error: "×" };
  var LEVEL_SR = { ok: "OK：", warn: "注意：", error: "直す：" };
  function renderChecks(ul, checks, onFix, fixLabels) {
    ul.textContent = "";
    checks.forEach(function (c) {
      var li = el("li", "ck " + c.level);
      li.appendChild(el("span", "ck-i", LEVEL_ICON[c.level])).setAttribute("aria-hidden", "true");
      var t = el("span", "ck-t");
      t.appendChild(el("span", "sr", LEVEL_SR[c.level]));
      t.appendChild(document.createTextNode(c.text));
      li.appendChild(t);
      if (c.fix && onFix && fixLabels[c.fix]) {
        var b = el("button", "btn tiny", fixLabels[c.fix]);
        b.type = "button";
        b.addEventListener("click", function () { onFix(c.fix); });
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  var lastOut = "";
  function renderWrite() {
    var f = readForm();
    $("break-box").hidden = !f.breaking;
    /* rail nodes */
    $("st-type").classList.toggle("done", !!f.type);
    $("st-scope").classList.toggle("done", !!f.scope);
    $("st-summary").classList.toggle("done", !!f.summary.trim());
    $("st-body").classList.toggle("done", !!(f.why.trim() || f.what.trim()));
    $("st-break").classList.toggle("done", f.breaking);
    $("st-issue").classList.toggle("done", R.parseIssues(f.issues).length > 0);

    /* type suggestion when none is picked */
    if (!f.type && f.summary.trim()) {
      var g = R.guessType(f.summary + " " + f.what);
      typeHint.textContent = "";
      if (g.word) {
        typeHint.appendChild(document.createTextNode("「" + g.word + "」なら「" + g.type + "」が合いそうです。"));
        var pick = el("button", "btn tiny", g.type + "にする"); pick.type = "button";
        pick.addEventListener("click", function () { setRadio("type", g.type); onForm(); });
        typeHint.appendChild(pick);
        typeHint.hidden = false;
      } else typeHint.hidden = true;
    } else typeHint.hidden = true;

    var head = (f.type || "type") + (f.scope ? "(" + f.scope + ")" : "") + (f.breaking ? "!" : "") + ": ";
    var sumW = R.width(head + f.summary.replace(/\s+/g, " ").trim());
    var meter = $("meter");
    meter.textContent = f.summary.trim() ? "1行目 " + sumW + " / 50" : "";
    meter.className = "meter" + (sumW > 72 ? " bad" : sumW > 50 ? " warn" : "");

    var ready = !!(f.type && f.summary.trim());
    var out = $("out");
    if (!ready) {
      var ex = store.prefs.lang === "en" ? R.typeInfo("fix").en : store.prefs.jaStyle === "desu" ? R.typeInfo("fix").jaDesu : R.typeInfo("fix").ja;
      renderMsg(out, ex);
      out.classList.add("ghost");
      $("out-empty").hidden = false;
      $("out-empty").textContent = !f.type && !f.summary.trim() ? "種類を選んで要約を入れると、ここにメッセージができます。上は例です。"
        : !f.type ? "種類を選ぶと、メッセージができます。" : "要約を入れると、メッセージができます。";
      $("copy-out").disabled = true;
      $("oneline").hidden = true; $("multi-note").hidden = true;
      $("hash").textContent = "";
      $("checks").textContent = "";
      $("checks-box").hidden = true;
      lastOut = "";
      updateDock();
      return;
    }
    var msg = R.assemble(f);
    lastOut = msg;
    out.classList.remove("ghost");
    renderMsg(out, msg);
    $("out-empty").hidden = true;
    $("copy-out").disabled = false;
    $("hash").textContent = "commit " + hash7(msg);
    var single = msg.indexOf("\n") < 0;
    $("oneline").hidden = !single;
    $("multi-note").hidden = single;
    if (single) $("cmd").textContent = "git commit -m " + R.shellQuote(msg);
    var res = R.lint(msg, { lang: store.prefs.lang, jaStyle: store.prefs.jaStyle, own: ownTypes() });
    if (f.breaking && !f.breakNote.trim()) res.checks.push({ level: "warn", text: "「何が変わるか」を書くと、BREAKING CHANGEの行が入ります。", fix: null });
    $("checks-box").hidden = false;
    var nBad = res.checks.filter(function (c) { return c.level !== "ok"; }).length;
    $("dock-line").textContent = msg.split("\n")[0];
    $("dock").classList.toggle("has-bad", nBad > 0);
    $("dock").setAttribute("aria-label", "できたメッセージを確認する" + (nBad ? "（直すところ" + nBad + "つ）" : ""));
    updateDock();
    renderChecks($("checks"), res.checks, writeFix, { period: "消す", style: "直す", wrap: "折り返す", footer: "issue欄に移す" });
  }
  var pvVisible = false;
  function updateDock() { $("dock").hidden = !lastOut || pvVisible; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { var e = es[es.length - 1]; pvVisible = e.isIntersecting && e.intersectionRatio >= 0.3; updateDock(); }, { threshold: [0, 0.3, 0.6] }).observe($("out"));
  }
  function writeFix(kind) {
    var s = F.summary.value;
    if (kind === "period") F.summary.value = s.replace(/[\s.。．]+$/, "");
    else if (kind === "style") {
      if (R.hasJa(s)) { var jc = R.jaCheck(s.trim(), store.prefs.jaStyle); if (jc.text) F.summary.value = jc.text; }
      else { var ef = R.enFix(s.trim()); if (ef) F.summary.value = ef.text; }
    } else if (kind === "wrap") F.wrap.checked = true;
    else if (kind === "footer") {
      var refs = [];
      F.summary.value = s.replace(/[\s,、(（]*(?:(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?)\s*:?\s*)?((?:[\w.-]+\/[\w.-]+)?#\d+)[)）]?/gi, function (m, r) { refs.push(r); return ""; }).trim();
      if (refs.length) F.issues.value = (F.issues.value.trim() ? F.issues.value.trim() + ", " : "") + refs.join(", ");
    }
    onForm();
    F.summary.focus();
  }
  function onForm() { saveDraft(); renderWrite(); }
  ["scope", "summary", "why", "what", "breakNote", "issues"].forEach(function (k) { F[k].addEventListener("input", onForm); });
  [F.breaking, F.issueKw, F.wrap].forEach(function (e) { e.addEventListener("change", onForm); });
  typesBox.addEventListener("change", onForm);
  $("form").addEventListener("submit", function (e) { e.preventDefault(); });

  $("example").addEventListener("click", function () {
    var en = store.prefs.lang === "en", desu = store.prefs.jaStyle === "desu";
    setRadio("type", "fix");
    F.scope.value = "auth";
    F.summary.value = en ? PH.en.summary : desu ? PH_DESU : PH.ja.summary;
    F.why.value = en ? PH.en.why : PH.ja.why;
    F.what.value = en ? PH.en.what : PH.ja.what;
    F.breaking.checked = false; F.breakNote.value = "";
    F.issues.value = "128"; F.issueKw.value = "Closes";
    onForm();
  });
  $("reset").addEventListener("click", function () {
    if ((F.summary.value || F.why.value || F.what.value) && !confirm("入力を消しますか？")) return;
    radios("type").forEach(function (r) { r.checked = false; });
    ["scope", "summary", "why", "what", "breakNote", "issues"].forEach(function (k) { F[k].value = ""; });
    F.breaking.checked = false;
    onForm();
    F.summary.focus();
  });

  /* ---------- copy ---------- */
  function copyText(text, toastEl, okMsg, failMsg) {
    function ok() { toast(toastEl, okMsg, false); }
    function fallback() {
      var ta = el("textarea", "sr"); ta.value = text; ta.setAttribute("readonly", "");
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand("copy"); } catch (e) { done = false; }
      document.body.removeChild(ta);
      if (done) ok(); else toast(toastEl, failMsg, true);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  var toastTimers = {};
  function toast(node, msg, bad) {
    node.textContent = msg;
    node.classList.toggle("bad", !!bad);
    node.classList.remove("pop"); void node.offsetWidth; node.classList.add("pop");
    clearTimeout(toastTimers[node.id]);
    toastTimers[node.id] = setTimeout(function () { node.textContent = ""; }, bad ? 6000 : 2400);
  }
  function addHist(msg) {
    store.hist = store.hist.filter(function (h) { return h.m !== msg; });
    store.hist.unshift({ m: msg, t: Date.now() });
    store.hist = store.hist.slice(0, MAX_HIST);
    save(); updateHistCount();
  }
  $("copy-out").addEventListener("click", function () {
    if (!lastOut) return;
    addHist(lastOut);
    copyText(lastOut, $("toast-out"), "コピーしました。履歴にも残しました。", "コピーできませんでした。メッセージを長押しして選んでください。");
  });
  $("copy-cmd").addEventListener("click", function () {
    if (!lastOut) return;
    addHist(lastOut);
    copyText($("cmd").textContent, $("toast-out"), "コマンドをコピーしました。", "コピーできませんでした。コマンドを長押しして選んでください。");
  });

  /* ---------- 直す ---------- */
  var fixTypeSel = $("fix-type");
  function fillFixTypes() {
    var keep = fixTypeSel.value;
    fixTypeSel.textContent = "";
    R.TYPES.forEach(function (t) { var o = el("option", null, t.id + "（" + t.label + "）"); o.value = t.id; fixTypeSel.appendChild(o); });
    ownTypes().forEach(function (v) { var o = el("option", null, v + "（自分で追加）"); o.value = v; fixTypeSel.appendChild(o); });
    if (keep && !Array.prototype.some.call(fixTypeSel.options, function (o) { return o.value === keep; })) { var o = el("option", null, keep); o.value = keep; fixTypeSel.appendChild(o); }
    if (keep) fixTypeSel.value = keep;
  }
  fillFixTypes();
  var SAMPLES = [
    "ログイン画面のバグを修正しました。\nパスワードを間違えると画面が真っ白になっていたので、エラーメッセージを出すようにしました。ついでに関係ないところのインデントも直しています。\n#45",
    "Fixed the crash when the cart is empty. Also cleaned up some old code.\nfixes #123",
    ":sparkles: Added dark mode (#88)\n* toggle in settings\n* remembers the choice\nbreaking change: the theme option is now called colorScheme",
    "【修正】READMEのインストール手順の誤字",
    "Update dependencies"
  ];
  var sampleIx = 0;
  var fixFrom = "";
  var FIX_LABELS = { period: "直す", style: "直す", wrap: "折り返す", footer: "直す", blank: "直す", header: "直す" };
  function runFix(typeOverride) {
    var src = $("fix-src").value;
    if (!src.trim()) {
      $("fix-err").textContent = "メッセージを貼ってから押してください。";
      $("fix-src").focus();
      return;
    }
    $("fix-err").textContent = "";
    fixFrom = src;
    var before = R.lint(src, { jaStyle: store.prefs.jaStyle, own: ownTypes() });
    var bad = before.checks.filter(function (c) { return c.level !== "ok"; });
    renderChecks($("before-checks"), before.checks.filter(function (c) { return c.level !== "ok"; }).concat(bad.length ? [] : before.checks), null, {});
    $("before-count").textContent = bad.length ? "直すところ" + bad.length + "つ" : "問題なし";
    $("before-count").className = "badge" + (bad.length ? " bad" : " good");
    fillFixTypes();
    var c = R.clean(src, { jaStyle: store.prefs.jaStyle, type: typeOverride || null, own: ownTypes() });
    if (!c) return;
    fixTypeSel.value = c.type;
    $("fix-guess").textContent = typeOverride ? "選んだ種類です。" : c.guessedFrom ? "「" + c.guessedFrom + "」から考えました。" : "";
    $("fix-dst").value = c.text;
    var ch = $("changes"); ch.textContent = "";
    var list = c.changes.filter(function (t) { return !/から、種類を/.test(t) || !typeOverride; });
    if (!list.length) ch.appendChild(el("li", "none", "直すところはありませんでした。"));
    list.forEach(function (t) { ch.appendChild(el("li", null, t)); });
    $("fix-out").hidden = false;
    $("fix-empty").hidden = true;
    lintFixDst();
  }
  function lintFixDst() {
    var res = R.lint($("fix-dst").value, { jaStyle: store.prefs.jaStyle, own: ownTypes() });
    renderChecks($("after-checks"), res.checks, function () {
      var c = R.clean($("fix-dst").value, { jaStyle: store.prefs.jaStyle, type: fixTypeSel.value, own: ownTypes() });
      if (c) $("fix-dst").value = c.text;
      lintFixDst();
    }, FIX_LABELS);
    autoGrow($("fix-dst"));
  }
  function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 4, 520) + "px"; }
  $("fix-run").addEventListener("click", function () { runFix(null); });
  $("fix-redo").addEventListener("click", function () { if (fixFrom) { $("fix-src").value = fixFrom; runFix(fixTypeSel.value); } });
  fixTypeSel.addEventListener("change", function () { if (fixFrom) runFix(fixTypeSel.value); });
  $("fix-dst").addEventListener("input", lintFixDst);
  $("fix-src").addEventListener("input", function () { $("fix-err").textContent = ""; });
  $("fix-sample").addEventListener("click", function () {
    $("fix-src").value = SAMPLES[sampleIx % SAMPLES.length];
    sampleIx++;
    runFix(null);
  });
  $("copy-fix").addEventListener("click", function () {
    var v = $("fix-dst").value.replace(/\s+$/, "");
    if (!v.trim()) return;
    addHist(v);
    copyText(v, $("toast-fix"), "コピーしました。履歴にも残しました。", "コピーできませんでした。案を長押しして選んでください。");
  });

  /* ---------- 履歴 ---------- */
  function updateHistCount() { $("hist-count").textContent = store.hist.length ? String(store.hist.length) : ""; }
  function fmtTime(t) {
    var d = new Date(t); if (isNaN(d)) return "";
    var now = new Date();
    var hm = d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
    if (d.toDateString() === now.toDateString()) return "今日 " + hm;
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + hm;
  }
  var undoItem = null;
  function renderHist() {
    var ol = $("hist"); ol.textContent = "";
    $("hist-empty").hidden = store.hist.length > 0;
    $("hist-clear").hidden = store.hist.length === 0;
    store.hist.forEach(function (h, i) {
      var li = el("li", "h-item");
      var lines = h.m.split("\n");
      var pre = el("pre", "h-msg mono");
      pre.appendChild(el("span", "h-head", lines[0]));
      var rest = lines.slice(1).join("\n").replace(/^\n+/, "");
      if (rest) { pre.appendChild(document.createTextNode("\n")); pre.appendChild(el("span", "h-rest", rest)); }
      li.appendChild(pre);
      var meta = el("div", "h-meta");
      meta.appendChild(el("time", "h-time", fmtTime(h.t)));
      var acts = el("div", "h-acts");
      var cp = el("button", "btn small", "コピー"); cp.type = "button";
      cp.addEventListener("click", function () { copyText(h.m, $("toast-hist"), "コピーしました。", "コピーできませんでした。メッセージを長押しして選んでください。"); });
      var fx = el("button", "btn small ghost", "直すで開く"); fx.type = "button";
      fx.addEventListener("click", function () { $("fix-src").value = h.m; showTab("fix"); runFix(null); $("fix-src").focus(); });
      var del = el("button", "btn small ghost", "削除"); del.type = "button";
      del.setAttribute("aria-label", "削除：" + lines[0]);
      del.addEventListener("click", function () {
        undoItem = { h: store.hist.splice(i, 1)[0], i: i };
        save(); updateHistCount(); renderHist();
        var tEl = $("toast-hist"); tEl.textContent = "1件削除しました。";
        var u = el("button", "btn tiny", "元に戻す"); u.type = "button";
        u.addEventListener("click", function () {
          if (!undoItem) return;
          store.hist.splice(Math.min(undoItem.i, store.hist.length), 0, undoItem.h);
          undoItem = null; save(); updateHistCount(); renderHist();
          $("toast-hist").textContent = "元に戻しました。";
        });
        tEl.appendChild(u);
      });
      acts.appendChild(cp); acts.appendChild(fx); acts.appendChild(del);
      meta.appendChild(acts);
      li.appendChild(meta);
      ol.appendChild(li);
    });
  }
  $("hist-clear").addEventListener("click", function () {
    if (!confirm("履歴をすべて消しますか？")) return;
    store.hist = []; save(); updateHistCount(); renderHist();
    $("toast-hist").textContent = "履歴を消しました。";
  });

  /* ---------- 早見表 ---------- */
  function renderSheet() {
    var ul = $("sheet"); ul.textContent = "";
    var en = store.prefs.lang === "en", desu = store.prefs.jaStyle === "desu";
    R.TYPES.forEach(function (t) {
      var li = el("li", "sh-item");
      var top = el("div", "sh-top");
      top.appendChild(el("b", "sh-id mono", t.id));
      top.appendChild(el("span", "sh-l", t.label));
      li.appendChild(top);
      li.appendChild(el("p", "sh-when", t.when));
      li.appendChild(el("code", "sh-ex mono", en ? t.en : desu ? t.jaDesu : t.ja));
      ul.appendChild(li);
    });
  }

  /* ---------- start ---------- */
  loadDraft();
  applyLang();
  renderWrite();
  renderSheet();
  updateHistCount();
  showTab(store.prefs.tab);
})();
