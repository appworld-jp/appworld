// シフト交換板 — make a shift-swap request as text + a link whose #hash carries the request. No server.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "shiftboard.v1";
  const WD = "日月火水木金土";
  const LIM = { p: 30, n: 20, o: 60, m: 120 };

  // ---------- encoding ----------
  function toB64url(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64url(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  // accept only known fields with safe shapes
  function clean(r) {
    if (!r || typeof r !== "object") return null;
    const str = (v, n) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "";
    const out = {
      k: r.k === "swap" ? "swap" : "cover",
      d: typeof r.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.d) ? r.d : "",
      s: typeof r.s === "string" && /^\d{2}:\d{2}$/.test(r.s) ? r.s : "",
      e: typeof r.e === "string" && /^\d{2}:\d{2}$/.test(r.e) ? r.e : "",
      p: str(r.p, LIM.p), n: str(r.n, LIM.n), o: str(r.o, LIM.o), m: str(r.m, LIM.m)
    };
    return out.d ? out : null;
  }
  const baseUrl = () => location.href.split("#")[0];
  const shareUrl = r => `${baseUrl()}#r=${toB64url({ v: 1, k: r.k, d: r.d, s: r.s, e: r.e, p: r.p, n: r.n, o: r.o, m: r.m })}`;

  // ---------- formatting ----------
  function dateLabel(d, withYear) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return "";
    const dt = new Date(+m[1], +m[2] - 1, +m[3]);
    const y = withYear && dt.getFullYear() !== new Date().getFullYear() ? `${dt.getFullYear()}年` : "";
    return `${y}${+m[2]}月${+m[3]}日（${WD[dt.getDay()]}）`;
  }
  const timeLabel = r => r.s && r.e ? `${r.s}〜${r.e}` : r.s ? `${r.s}〜` : "時間未定";
  const kindLabel = k => k === "swap" ? "交換したい" : "代わってほしい";
  const offerLabel = k => k === "swap" ? "代わりに入れる日" : "お礼";

  function shareText(r, url) {
    const lines = [r.k === "swap" ? "【シフト交換のお願い】" : "【シフトを代わってくれる方を探しています】",
      `${dateLabel(r.d, true)} ${timeLabel(r)}`];
    if (r.p) lines.push(`場所：${r.p}`);
    if (r.o) lines.push(`${offerLabel(r.k)}：${r.o}`);
    if (r.m) lines.push(r.m);
    if (r.n) lines.push(`（${r.n}より）`);
    lines.push("", "引き受けてくれる方は、こちらから返事を作れます。", url);
    return lines.join("\n");
  }
  function replyText(r, name, msg) {
    const who = name.trim() || "（名前）";
    const lines = ["【引き受けます】",
      `${r.n ? `${r.n}さん、` : ""}${dateLabel(r.d, true)} ${timeLabel(r)}${r.p ? `（${r.p}）` : ""}のシフト、${r.k === "swap" ? "交換できます" : "私が入ります"}。`];
    if (r.k === "swap" && r.o) lines.push(`代わりに「${r.o}」でお願いします。`);
    if (msg.trim()) lines.push(msg.trim());
    lines.push(`${who}より`);
    return lines.join("\n");
  }

  function card(r) {
    const el = document.createElement("article");
    el.className = "ticket" + (r.k === "swap" ? " swap" : "");
    el.setAttribute("aria-label", "依頼のカード");
    const add = (tag, cls, text) => { const x = document.createElement(tag); x.className = cls; x.textContent = text; el.append(x); return x; };
    add("span", "t-kind", kindLabel(r.k));
    add("p", "t-date", dateLabel(r.d, true));
    add("div", "t-time", timeLabel(r));
    if (r.p) add("div", "t-place", r.p);
    add("div", "t-cut", "");
    const row = (k, v) => { if (!v) return; const p = add("p", "t-row", ""); const b = document.createElement("b"); b.textContent = k; p.append(b, document.createTextNode(v)); };
    row(offerLabel(r.k), r.o);
    row("ひとこと", r.m);
    if (r.n) add("p", "t-from", `${r.n}より`);
    return el;
  }

  async function copy(text, toastId, ok) {
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.className = "sr"; document.body.append(ta); ta.select();
      try { done = document.execCommand("copy"); } catch (e2) { done = false; } ta.remove();
    }
    $(toastId).textContent = done ? ok : "コピーできませんでした。文を長押しして選んでください。";
    setTimeout(() => { $(toastId).textContent = ""; }, 2600);
  }
  const canShare = typeof navigator.share === "function";
  async function share(text) { try { await navigator.share({ text }); } catch (e) { /* cancelled */ } }

  // ---------- storage ----------
  let mine = [];
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && Array.isArray(r.mine)) mine = r.mine.map(x => Object.assign(clean(x) || {}, { id: x.id, done: !!x.done })).filter(x => x.d); } catch (e) { /* ignore */ }
  let lastName = "";
  try { lastName = localStorage.getItem(KEY + ".name") || ""; } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ mine })); } catch (e) { /* ignore */ } };

  // ---------- make view ----------
  const kindVal = () => document.querySelector("input[name=kind]:checked").value;
  function syncKind() {
    const k = kindVal();
    $("offer-label").textContent = k === "swap" ? "代わりに入れる日" : "お礼・こちらから出せるもの";
    $("f-offer").placeholder = k === "swap" ? "例：11/22（土）の朝番に入れます" : "例：今度どこか1回代わります";
  }
  document.querySelectorAll("input[name=kind]").forEach(r => r.addEventListener("change", syncKind));
  (function defaults() {
    const t = new Date(); t.setDate(t.getDate() + 3);
    $("f-date").value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    $("f-name").value = lastName;
  })();

  let current = null;
  function showOut(r) {
    current = r;
    const url = shareUrl(r);
    $("out-card").replaceChildren(card(r));
    $("share-text").value = shareText(r, url);
    $("out").hidden = false; $("share").hidden = !canShare;
  }
  $("form").addEventListener("submit", ev => {
    ev.preventDefault();
    const r = clean({ k: kindVal(), d: $("f-date").value, s: $("f-start").value, e: $("f-end").value, p: $("f-place").value, n: $("f-name").value, o: $("f-offer").value, m: $("f-note").value });
    if (!r) { $("f-err").textContent = "日付を入れてください。"; $("f-date").focus(); return; }
    if (!r.s || !r.e) { $("f-err").textContent = "開始と終了の時間を入れてください。"; (r.s ? $("f-end") : $("f-start")).focus(); return; }
    $("f-err").textContent = "";
    try { localStorage.setItem(KEY + ".name", r.n); } catch (e) { /* ignore */ }
    r.id = Date.now(); r.done = false;
    mine.unshift(r); mine = mine.slice(0, 50); save(); renderMine();
    showOut(r);
    $("o-h").setAttribute("tabindex", "-1"); $("o-h").focus();
    $("out").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  $("copy-text").addEventListener("click", () => copy($("share-text").value, "toast", "コピーしました。LINEやSlackに貼ってください。"));
  $("copy-url").addEventListener("click", () => current && copy(shareUrl(current), "toast", "リンクをコピーしました。"));
  $("share").addEventListener("click", () => share($("share-text").value));

  function renderMine() {
    const ul = $("mine"); ul.replaceChildren();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    mine.forEach(r => {
      const li = document.createElement("li");
      const past = new Date(r.d + "T00:00") < today;
      li.className = (r.done ? "done " : "") + (past ? "past" : "");
      const top = document.createElement("div"); top.className = "m-top";
      const d = document.createElement("span"); d.className = "m-date"; d.textContent = `${dateLabel(r.d, true)} ${timeLabel(r)}`;
      const chip = document.createElement("span"); chip.className = "chip" + (r.done ? " done" : past ? " past" : "");
      chip.textContent = r.done ? "決まった" : past ? "日付が過ぎた" : "募集中";
      top.append(d, chip);
      const sub = document.createElement("div"); sub.className = "m-sub"; sub.textContent = [kindLabel(r.k), r.p, r.o].filter(Boolean).join("・");
      const btns = document.createElement("div"); btns.className = "m-btns";
      const b = (label, fn, aria) => { const x = document.createElement("button"); x.type = "button"; x.className = "btn small"; x.textContent = label; if (aria) x.setAttribute("aria-label", aria); x.addEventListener("click", fn); btns.append(x); };
      b("文を出す", () => { showOut(r); $("out").scrollIntoView({ block: "start" }); $("o-h").focus(); }, `${dateLabel(r.d)}の依頼文を出す`);
      b(r.done ? "募集中に戻す" : "決まった", () => { r.done = !r.done; save(); renderMine(); }, `${dateLabel(r.d)}の依頼を${r.done ? "募集中に戻す" : "決まったにする"}`);
      b("消す", () => { if (confirm("この依頼を一覧から消しますか？")) { mine = mine.filter(x => x !== r); save(); renderMine(); } }, `${dateLabel(r.d)}の依頼を消す`);
      li.append(top, sub, btns); ul.append(li);
    });
    $("mine-empty").hidden = mine.length > 0;
    $("l-count").textContent = mine.length ? `${mine.filter(x => !x.done).length}件募集中` : "";
  }

  // ---------- received view ----------
  let recv = null;
  function updateReply() { if (recv) $("rep-text").value = replyText(recv, $("rep-name").value, $("rep-msg").value); }
  $("rep-name").value = lastName;
  $("rep-name").addEventListener("input", () => { updateReply(); try { localStorage.setItem(KEY + ".name", $("rep-name").value.trim()); } catch (e) { /* ignore */ } });
  $("rep-msg").addEventListener("input", updateReply);
  $("rep-copy").addEventListener("click", () => {
    if (!$("rep-name").value.trim()) { $("rep-toast").textContent = "名前を入れると、誰からの返事か伝わります。"; $("rep-name").focus(); return; }
    copy($("rep-text").value, "rep-toast", "コピーしました。依頼が届いた場所に貼って返してください。");
  });
  $("rep-share").addEventListener("click", () => share($("rep-text").value));
  $("to-new").addEventListener("click", ev => { ev.preventDefault(); history.pushState(null, "", baseUrl()); route(); });

  function route() {
    const m = /^#r=([A-Za-z0-9_-]{4,2000})$/.exec(location.hash);
    recv = null;
    if (m) { try { recv = clean(fromB64url(m[1])); } catch (e) { recv = null; } }
    $("recv").hidden = !recv; $("make").hidden = !!recv;
    if (recv) {
      $("recv-card").replaceChildren(card(recv));
      $("recv-h").textContent = recv.k === "swap" ? "シフトを交換できますか？" : "代わりに入れますか？";
      $("rep-share").hidden = !canShare;
      updateReply();
      document.title = `${dateLabel(recv.d)}のシフト依頼｜シフト交換板`;
    } else {
      document.title = "シフト交換板";
      $("f-err").textContent = "";
      if (location.hash.startsWith("#r=")) { $("f-err").textContent = "リンクの内容を読み取れませんでした。送ってくれた人に、もう一度リンクをもらってください。"; }
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  syncKind(); renderMine(); route();
})();
