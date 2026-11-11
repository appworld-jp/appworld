// 電話・窓口メモ — 電話や窓口での「言われたこと」を時刻つきで残し、次にやることを一覧にする。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const KEY = "lab-denwa-v1";
  const pad = n => String(n).padStart(2, "0");
  const WD = "日月火水木金土";
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const hm = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dayJp = d => `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  const longJp = iso => { const d = new Date(iso); return `${d.getFullYear()}年${dayJp(d)} ${hm(iso)}`; };
  const norm = s => (s || "").normalize("NFKC").toLowerCase();
  const isIso = s => typeof s === "string" && !isNaN(Date.parse(s));
  const FIELDS = ["org", "dept", "person", "phone", "ref", "topic", "next", "note"];
  const MAXLEN = { org: 40, dept: 30, person: 30, phone: 20, ref: 30, topic: 60, next: 80, note: 600 };

  // ---------- 保存 ----------
  const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
  function cleanItem(it) {
    if (!it || typeof it !== "object" || !isIso(it.at)) return null;
    const o = { id: str(it.id, 20) || uid(), at: new Date(it.at).toISOString(), kind: cleanKind(it.kind) };
    FIELDS.forEach(f => o[f] = str(it[f], MAXLEN[f]));
    o.due = isYmd(it.due) ? it.due : "";
    o.done = !!it.done;
    o.lines = Array.isArray(it.lines) ? it.lines.slice(0, 300).filter(l => l && isIso(l.t) && typeof l.s === "string" && l.s.trim()).map(l => ({ t: new Date(l.t).toISOString(), s: l.s.slice(0, 200) })) : [];
    return o;
  }
  // 種類は「電話」「窓口」のほか、自分で入れた言葉（20文字まで）
  function cleanKind(k) {
    if (k === "tel" || k === "desk") return k;
    const t = typeof k === "string" ? k.replace(/\s+/g, " ").trim().slice(0, 20) : "";
    return t === "電話" ? "tel" : t === "窓口" ? "desk" : t || "tel";
  }
  const kindName = k => k === "desk" ? "窓口" : k === "tel" ? "電話" : k;
  const kindCls = k => k === "desk" || k === "tel" ? k : "own";
  function clean(raw) {
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, items: raw.items.slice(0, 2000).map(cleanItem).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, items: [] };
  let saveOk = true;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); saveOk = true; } catch (e) { saveOk = false; } };
  const isBlank = it => FIELDS.every(f => !it[f].trim()) && !it.lines.length && !it.due;

  // ---------- 画面 ----------
  let cur = null;
  function route() {
    const m = /^#m=([\w]+)$/.exec(location.hash);
    const it = m && st.items.find(x => x.id === m[1]);
    if (cur && (!it || it !== cur) && isBlank(cur)) { st.items.splice(st.items.indexOf(cur), 1); save(); }
    cur = it || null;
    $("home").hidden = !!cur; $("memo").hidden = !cur;
    if (cur) openMemo(); else renderHome();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);
  $("backBtn").addEventListener("click", () => { if (history.length > 1 && sessionStorageGet()) history.back(); else location.hash = ""; });
  function sessionStorageGet() { try { return sessionStorage.getItem(KEY + "-nav") === "1"; } catch (e) { return false; } }
  function go(id) { try { sessionStorage.setItem(KEY + "-nav", "1"); } catch (e) {} location.hash = "m=" + id; }

  $("newBtn").addEventListener("click", () => {
    const it = cleanItem({ at: new Date().toISOString() });
    st.items.unshift(it); save(); go(it.id);
    setTimeout(() => $("fOrg").focus(), 50);
  });

  // ---------- 一覧 ----------
  function dueInfo(it) {
    if (!it.due) return null;
    const days = Math.round((parseYmd(it.due) - parseYmd(ymd(new Date()))) / 864e5);
    const d = parseYmd(it.due);
    const txt = days < 0 ? `${-days}日過ぎています` : days === 0 ? "今日まで" : days === 1 ? "明日まで" : `${dayJp(d)}まで`;
    return { days, txt };
  }
  const who = it => [it.org, it.dept, it.person].filter(s => s.trim()).join(" ") || kindName(it.kind);
  function renderHome() {
    // まだやること：次にやることが書かれていて、済んでいないもの
    const todos = st.items.filter(it => it.next.trim() && !it.done).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : (a.due || "9999") > (b.due || "9999") ? 1 : 0);
    $("todoSec").hidden = !todos.length;
    $("todoN").textContent = todos.length ? `${todos.length}件` : "";
    const tl = $("todoList"); tl.replaceChildren();
    todos.forEach(it => {
      const li = el("li", "td");
      const di = dueInfo(it);
      if (di && di.days < 0) li.classList.add("late"); else if (di && di.days <= 2) li.classList.add("soon");
      const ck = el("button", "ck"); ck.type = "button"; ck.setAttribute("aria-label", `「${it.next}」を済んだにする`);
      ck.addEventListener("click", () => {
        it.done = true; save(); renderHome();
        toast("済んだにしました。", () => { it.done = false; save(); renderHome(); });
      });
      const body = el("button", "td-b"); body.type = "button";
      body.append(el("span", "td-next", it.next), el("span", "td-who", who(it)));
      if (di) body.append(el("span", "td-due", di.txt));
      body.addEventListener("click", () => go(it.id));
      li.append(ck, body); tl.append(li);
    });
    renderList();
  }
  function renderList() {
    const q = norm($("q").value.trim());
    const words = q ? q.split(/\s+/) : [];
    const all = st.items.slice().sort((a, b) => a.at < b.at ? 1 : -1);
    const hits = all.filter(it => {
      if (!words.length) return true;
      const hay = norm(FIELDS.map(f => it[f]).join(" ") + " " + it.lines.map(l => l.s).join(" ") + " " + longJp(it.at));
      return words.every(w => hay.includes(w));
    });
    $("q").hidden = st.items.length < 2;
    $("empty").hidden = st.items.length > 0;
    $("found").textContent = words.length ? (hits.length ? `${hits.length}件見つかりました。` : "見つかりませんでした。ほかの言葉でも探してみてください。") : "";
    const ul = $("list"); ul.replaceChildren();
    let lastMonth = "";
    hits.forEach(it => {
      const d = new Date(it.at);
      const mk = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      if (mk !== lastMonth) { ul.append(el("li", "month", mk)); lastMonth = mk; }
      const li = el("li");
      const b = el("button", "row-item"); b.type = "button";
      const date = el("span", "ri-date"); date.append(el("b", null, String(d.getDate())), el("small", null, WD[d.getDay()]));
      const main = el("span", "ri-main");
      const top = el("span", "ri-top"); top.append(el("span", "ri-kind " + kindCls(it.kind), kindName(it.kind)), el("span", "ri-who", who(it)));
      main.append(top, el("span", "ri-topic", it.topic || (it.lines[0] ? it.lines[0].s : "（用件なし）")));
      const meta = [];
      if (it.ref) meta.push("受付番号 " + it.ref);
      if (it.next.trim()) meta.push(it.done ? "済み" : "やることあり");
      if (meta.length) main.append(el("span", "ri-meta", meta.join("・")));
      b.append(date, main, el("span", "ri-time", hm(it.at)));
      b.addEventListener("click", () => go(it.id));
      li.append(b); ul.append(li);
    });
  }
  $("q").addEventListener("input", renderList);

  // ---------- メモ ----------
  const inputs = { org: $("fOrg"), dept: $("fDept"), person: $("fPerson"), phone: $("fPhone"), ref: $("fRef"), topic: $("fTopic"), next: $("fNext"), note: $("fNote") };
  let savedTimer = 0;
  function touched() {
    save();
    $("savedMark").textContent = saveOk ? "保存しました" : "保存できませんでした。空き容量を確かめてください。";
    clearTimeout(savedTimer); savedTimer = setTimeout(() => { $("savedMark").textContent = ""; }, 1500);
    updateCall();
  }
  for (const f in inputs) inputs[f].addEventListener("input", () => { if (cur) { cur[f] = inputs[f].value; touched(); } });
  $("fDue").addEventListener("change", () => { if (cur) { cur.due = isYmd($("fDue").value) ? $("fDue").value : ""; touched(); } });
  $("fDone").addEventListener("change", () => { if (cur) { cur.done = $("fDone").checked; touched(); } });
  function setKind(k) {
    if (!cur) return; cur.kind = k;
    document.querySelectorAll("#kindBox .kb").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === k)));
  }
  document.querySelectorAll("#kindBox .kb").forEach(b => b.addEventListener("click", () => { setKind(b.dataset.v); touched(); }));
  const OWN = KEY + ".custom";
  const ownKind = window.OwnChoices({
    key: OWN, name: "kind", host: $("kindBox"), max: 20,
    builtins: [{ value: "tel", label: "電話" }, { value: "desk", label: "窓口" }],
    placeholder: "メール", inputLabel: "種類を自分で入力", emptyMsg: "種類を入れてから「追加」を押してください。",
    extra: () => cur ? [cur.kind] : [],
    chip: v => {
      const b = el("button", "kb", v); b.type = "button"; b.dataset.v = v;
      b.setAttribute("aria-pressed", String(!!cur && cur.kind === v));
      b.addEventListener("click", () => { setKind(v); touched(); });
      return b;
    },
    onPick: v => { setKind(v); touched(); }
  });
  const ownQuick = window.OwnChoices({
    key: OWN, name: "quick", host: $("quickBox"), max: 40, addLabel: "＋ 定型文を追加", okLabel: "追加",
    builtins: [...document.querySelectorAll("#quickBox .qb")].filter(b => b.dataset.q !== "said").map(b => ({ value: b.dataset.q, label: b.textContent })),
    placeholder: "メールで案内が届くことになった", inputLabel: "よく使う言葉", emptyMsg: "よく使う言葉を入れてから「追加」を押してください。",
    chip: v => {
      const b = el("button", "qb", v); b.type = "button";
      b.setAttribute("aria-label", `「${v}」を書く`);
      b.addEventListener("click", () => addLine(v));
      return b;
    },
    onPick: v => addLine(v)
  });
  function updateCall() {
    const tel = (cur && cur.phone || "").normalize("NFKC").replace(/[^\d+]/g, "");
    $("callBtn").hidden = !(cur && cur.kind !== "desk" && tel.length >= 3);
    if (!$("callBtn").hidden) $("callBtn").href = "tel:" + tel;
  }
  function openMemo() {
    $("mWhen").textContent = longJp(cur.at);
    for (const f in inputs) inputs[f].value = cur[f];
    $("fDue").value = cur.due; $("fDone").checked = cur.done;
    ownKind.render(); setKind(cur.kind); renderLines(); updateCall();
    $("copyMsg").textContent = ""; $("copyArea").hidden = true; $("savedMark").textContent = "";
  }
  function renderLines() {
    const ol = $("lines"); ol.replaceChildren();
    $("linesEmpty").hidden = cur.lines.length > 0;
    cur.lines.forEach((l, i) => {
      const li = el("li");
      li.append(el("time", null, hm(l.t)), el("span", "l-s", l.s));
      const x = el("button", "l-x", "×"); x.type = "button"; x.setAttribute("aria-label", `「${l.s}」を消す`);
      x.addEventListener("click", () => {
        const memo = cur; memo.lines.splice(i, 1); touched(); renderLines();
        toast("1行消しました。", () => { memo.lines.splice(i, 0, l); save(); if (cur === memo) renderLines(); });
      });
      li.append(x); ol.append(li);
    });
  }
  function addLine(s) {
    s = s.trim().slice(0, 200); if (!s || !cur) return;
    cur.lines.push({ t: new Date().toISOString(), s }); touched(); renderLines();
  }
  $("sayForm").addEventListener("submit", e => { e.preventDefault(); addLine($("sayIn").value); $("sayIn").value = ""; $("sayIn").focus(); });
  document.querySelectorAll("#quickBox > .qb").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.q === "said") {
      const v = $("sayIn").value.trim();
      if (!v) { $("sayIn").focus(); $("sayIn").placeholder = "言われたことを書いてから押してください"; return; }
      addLine(/と言われた$/.test(v) ? v : `「${v.replace(/[。.]$/, "")}」と言われた`);
      $("sayIn").value = ""; $("sayIn").placeholder = "来週中に書類を郵送します";
    } else addLine(b.dataset.q);
  }));

  function asText(it) {
    const out = [`【${kindName(it.kind)}メモ】${longJp(it.at)}`];
    const w = [it.org, it.dept, it.person].filter(s => s.trim()).join(" ");
    if (w) out.push(`相手：${w}${it.phone ? `（${it.phone}）` : ""}`);
    else if (it.phone) out.push(`電話番号：${it.phone}`);
    if (it.topic) out.push(`用件：${it.topic}`);
    if (it.ref) out.push(`受付番号：${it.ref}`);
    if (it.lines.length) { out.push("言われたこと："); it.lines.forEach(l => out.push(`・${hm(l.t)} ${l.s}`)); }
    if (it.next.trim()) out.push(`次にやること：${it.next}${it.due ? `（期限 ${dayJp(parseYmd(it.due))}）` : ""}${it.done ? "【済み】" : ""}`);
    if (it.note.trim()) out.push(`メモ：${it.note}`);
    return out.join("\n");
  }
  $("copyBtn").addEventListener("click", async () => {
    if (!cur) return;
    const text = asText(cur);
    try { await navigator.clipboard.writeText(text); $("copyMsg").textContent = "コピーしました。メールやLINEに貼りつけられます。"; $("copyArea").hidden = true; }
    catch (e) {
      const a = $("copyArea"); a.value = text; a.hidden = false; a.focus(); a.select();
      $("copyMsg").textContent = "コピーできませんでした。下の文章を長押しして選んでください。";
    }
  });
  $("delBtn").addEventListener("click", () => {
    if (!cur) return;
    const it = cur, idx = st.items.indexOf(it);
    st.items.splice(idx, 1); save(); cur = null; location.hash = "";
    toast("メモを削除しました。", () => { st.items.splice(idx, 0, it); save(); renderHome(); });
  });

  // ---------- 例 ----------
  $("sample").addEventListener("click", () => {
    const now = new Date(); const t = m => new Date(now.getTime() - m * 60000).toISOString();
    const due = new Date(now); due.setDate(due.getDate() + 4);
    const it = cleanItem({ at: t(18), kind: "tel", org: "〇〇市役所", dept: "国民健康保険課", person: "山田さん", phone: "03-0000-0000", ref: "A-20481",
      topic: "引っ越しにともなう保険証の住所変更", lines: [{ t: t(16), s: "保留で待った" }, { t: t(14), s: "「転入届のあとでないと手続きできない」と言われた" }, { t: t(12), s: "「窓口に来るときは本人確認書類が要る」と言われた" }],
      next: "転入届を出してから、保険課の窓口へ行く", due: ymd(due), note: "窓口は2階の12番。平日8:30〜17:15。" });
    st.items.unshift(it); save(); renderHome();
    toast("例を1件入れました。いらなければ開いて削除できます。");
  });

  // ---------- お知らせ ----------
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "denwa", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `denwa-${ymd(new Date())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 10e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "denwa") data = clean(j.data); } catch (e) { data = null; }
    if (!data || !data.items.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`いまのメモを、ファイルの${data.items.length}件と置きかえますか？`)) return;
    const prev = JSON.stringify(st);
    st = data; save(); renderHome();
    $("moveMsg").textContent = `${data.items.length}件を読み込みました。`;
    toast("読み込みました。", () => { st = JSON.parse(prev); save(); renderHome(); });
  });

  route();
})();
