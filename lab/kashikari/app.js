// 貸し借り帳 — 貸した・借りたを相手と日付で記録。目安を過ぎたものが先、お金は人ごとに差し引き、やんわり伝える文をコピー。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-kashikari-v1";
  const CK = KEY + ".custom";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseYmd(s));
  const today = ymd(new Date());
  const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const full = s => { const d = parseYmd(s); return (d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}年` : "") + md(s); };
  const days = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const addMonths = (s, n) => { const d = parseYmd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return ymd(d); };
  const yen = n => `${n.toLocaleString("ja-JP")}円`;
  const str = (v, max) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const kana = s => String(s || "").normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, "");
  const HONOR = /(さん|くん|君|ちゃん|様|さま|先生|先輩|氏)$/;
  const pkey = w => kana(w).replace(HONOR, "") || kana(w);
  const san = w => HONOR.test(w) ? w : w + "さん";
  function parseYen(s) {
    const t = String(s || "").normalize("NFKC").replace(/[,，、\s円¥￥]/g, "");
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t); return n > 0 && n <= 99999999 ? n : null;
  }

  const KINDS = ["本", "マンガ", "DVD・ゲーム", "傘", "服", "道具", "お金"];
  const MONEY = "お金";
  const verbFor = k => k === "本" || k === "マンガ" ? "読み終わったら" : k === "DVD・ゲーム" ? "見終わったら" : "使い終わったら";

  // ---------- 保存 ----------
  function cleanRec(r) {
    if (!r || typeof r !== "object") return null;
    const dir = r.dir === "borrow" ? "borrow" : "lend";
    const who = str(r.who, 20), kind = str(r.kind, 20), what = str(r.what, 30);
    const amt = Number.isInteger(r.amt) && r.amt > 0 && r.amt <= 99999999 ? r.amt : 0;
    if (!who || (kind === MONEY ? !amt : !what)) return null;
    return { id: str(r.id, 24) || uid(), dir, who, kind, what, amt: kind === MONEY ? amt : 0,
      date: isYmd(r.date) ? r.date : today, due: isYmd(r.due) ? r.due : "", ret: isYmd(r.ret) ? r.ret : "", note: str(r.note, 60), sample: r.sample === true };
  }
  function clean(raw) {
    if (!raw || !Array.isArray(raw.recs)) return null;
    return { v: 1, recs: raw.recs.slice(0, 3000).map(cleanRec).filter(Boolean) };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, recs: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = clean(JSON.parse(s)); save(); };

  const label = r => r.kind === MONEY ? (r.what ? `${r.what} ${yen(r.amt)}` : yen(r.amt)) : r.what;
  function status(r) {
    if (r.ret) return { cls: "done", text: "済" };
    if (r.due) {
      const d = days(today, r.due);
      if (d < 0) return { cls: "over", text: `${-d}日過ぎ`, rank: 0 };
      if (d === 0) return { cls: "soon", text: "今日まで", rank: 1 };
      if (d <= 3) return { cls: "soon", text: `あと${d}日`, rank: 1 };
      return { cls: "calm", text: `${md(r.due)}まで`, rank: 1 };
    }
    const a = days(r.date, today);
    return { cls: "calm", text: a === 0 ? "今日" : `${a}日目`, rank: 2 };
  }

  // ---------- 一覧 ----------
  let tab = "open", flashId = null;
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }));
  function row(r) {
    const li = el("li");
    const b = el("button", "row"); b.type = "button";
    const s = status(r);
    const w = el("span", "what", label(r));
    if (r.kind) w.append(el("span", "kind", r.kind));
    const who = el("span", "who", r.dir === "lend" ? `${san(r.who)}に貸した・${full(r.date)}` : `${san(r.who)}から借りた・${full(r.date)}`);
    if (r.ret) who.textContent = `${san(r.who)}${r.dir === "lend" ? "に貸した" : "から借りた"}・${full(r.ret)}に返った`;
    b.append(el("span", "mark " + r.dir, r.dir === "lend" ? "貸" : "借"), w, who, el("span", "badge " + s.cls, s.text));
    b.setAttribute("aria-label", `${r.dir === "lend" ? "貸した" : "借りた"}：${label(r)}、${r.who}、${s.text}`);
    if (r.id === flashId) b.classList.add("flash");
    b.addEventListener("click", () => openView(r.id));
    li.append(b);
    return li;
  }
  function renderSum() {
    const open = st.recs.filter(r => !r.ret);
    const part = dir => { const xs = open.filter(r => r.dir === dir); const m = xs.filter(r => r.kind === MONEY).reduce((a, r) => a + r.amt, 0); return [`${xs.length}件`, m ? `うちお金 ${yen(m)}` : ""]; };
    const [a, am] = part("lend"), [b, bm] = part("borrow");
    $("sLend").textContent = a; $("sLendM").textContent = am;
    $("sBorrow").textContent = b; $("sBorrowM").textContent = bm;
  }
  function renderOpen() {
    const list = st.recs.filter(r => !r.ret).map(r => ({ r, s: status(r) }));
    list.sort((x, y) => x.s.rank - y.s.rank || (x.s.rank < 2 ? (x.r.due < y.r.due ? -1 : x.r.due > y.r.due ? 1 : 0) : 0) || (x.r.date < y.r.date ? -1 : x.r.date > y.r.date ? 1 : 0));
    $("openList").replaceChildren(...list.map(x => row(x.r)));
    $("openNone").hidden = !!list.length;
  }
  function renderDone() {
    const list = st.recs.filter(r => r.ret).sort((a, b) => a.ret < b.ret ? 1 : a.ret > b.ret ? -1 : 0);
    $("doneList").replaceChildren(...list.map(row));
    $("doneNone").hidden = !!list.length;
  }
  function renderPeople() {
    const map = new Map();
    st.recs.forEach(r => {
      const k = pkey(r.who);
      if (!map.has(k)) map.set(k, { name: r.who, last: "", recs: [] });
      const p = map.get(k); p.recs.push(r);
      if (r.date >= p.last) { p.last = r.date; p.name = r.who; }
    });
    const people = [...map.values()].map(p => {
      const open = p.recs.filter(r => !r.ret);
      const lendM = open.filter(r => r.dir === "lend" && r.kind === MONEY).reduce((a, r) => a + r.amt, 0);
      const borM = open.filter(r => r.dir === "borrow" && r.kind === MONEY).reduce((a, r) => a + r.amt, 0);
      return { ...p, open, lendM, borM, net: lendM - borM };
    }).sort((a, b) => (b.open.length ? 1 : 0) - (a.open.length ? 1 : 0) || Math.abs(b.net) - Math.abs(a.net) || b.open.length - a.open.length || (a.last < b.last ? 1 : -1));
    $("peopleNone").hidden = !!people.length;
    $("people").replaceChildren(...people.map(p => {
      const c = el("section", "person");
      c.append(el("h3", null, san(p.name)));
      const net = el("p", "net");
      if (p.net > 0) { net.classList.add("plus"); net.textContent = `差し引き ${yen(p.net)} 返してもらう`; }
      else if (p.net < 0) { net.classList.add("minus"); net.textContent = `差し引き ${yen(-p.net)} 返す`; }
      else { net.classList.add("even"); net.textContent = p.lendM ? "お金の貸し借りは差し引き0円" : p.open.length ? "お金の貸し借りはありません" : "すべて返し終わっています"; }
      c.append(net);
      const line = el("div", "p-line");
      const thingsL = p.open.filter(r => r.dir === "lend" && r.kind !== MONEY).length, thingsB = p.open.filter(r => r.dir === "borrow" && r.kind !== MONEY).length;
      if (p.lendM) line.append(el("span", null, `貸したお金 ${yen(p.lendM)}`));
      if (p.borM) line.append(el("span", null, `借りたお金 ${yen(p.borM)}`));
      if (thingsL) line.append(el("span", null, `貸している物 ${thingsL}件`));
      if (thingsB) line.append(el("span", null, `借りている物 ${thingsB}件`));
      line.append(el("span", null, `これまで ${p.recs.length}件`));
      c.append(line);
      if (p.open.length) {
        const ul = el("ul", "p-items");
        p.open.forEach(r => { const li = el("li"); li.append(el("span", "d " + r.dir, r.dir === "lend" ? "貸" : "借"), el("span", null, `${label(r)}（${full(r.date)}）`)); ul.append(li); });
        c.append(ul);
      }
      return c;
    }));
  }
  function render() {
    const any = st.recs.length > 0;
    $("empty").hidden = any; $("sum").hidden = !any; $("tabs").hidden = !any;
    $("openView").hidden = !any || tab !== "open"; $("peopleView").hidden = !any || tab !== "people"; $("doneView").hidden = !any || tab !== "done";
    $("sampleBar").hidden = !st.recs.some(r => r.sample);
    renderSum();
    if (tab === "open") renderOpen(); else if (tab === "done") renderDone(); else renderPeople();
    flashId = null;
  }

  // ---------- 記録 ----------
  let editId = null, kindSel = "";
  const kindFc = window.FreeChoice({
    key: CK, set: "kind", label: "貸し借りした物の種類", max: 20, placeholder: "ゲーム機、カメラ",
    builtins: () => KINDS.map(k => ({ value: k, label: k })),
    onChange: () => renderKinds(),
    onPick: v => { kindSel = v; renderKinds(); syncKind(); }
  });
  function renderKinds() {
    const chip = v => {
      const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "kind"; r.value = v; r.checked = v === kindSel;
      r.addEventListener("click", () => { if (kindSel === v) { kindSel = ""; r.checked = false; } else kindSel = v; syncKind(); });
      l.append(r, el("span", null, v)); return l;
    };
    const own = kindFc.values();
    const nodes = KINDS.map(chip);
    own.forEach(v => nodes.push(kindFc.wrap(chip(v), v)));
    if (kindSel && !KINDS.includes(kindSel) && !own.includes(kindSel)) nodes.push(chip(kindSel)); // 外した候補でも、この記録の値は出す
    $("kindChips").replaceChildren(...nodes, kindFc.root);
  }
  const dirNow = () => document.querySelector("input[name=dir]:checked").value;
  function syncDir() {
    const lend = dirNow() === "lend";
    $("eH").textContent = editId ? "記録を編集" : lend ? "貸したものを記録" : "借りたものを記録";
    $("whoL").firstChild.data = lend ? "誰に" : "誰から";
    $("dateL").textContent = lend ? "貸した日" : "借りた日";
    $("dueL").textContent = lend ? "返してもらう目安" : "返す目安";
    $("fNote").placeholder = lend ? "読み終わったら感想を聞く" : "次の飲み会で返す";
  }
  function syncKind() {
    const money = kindSel === MONEY;
    $("amtF").hidden = !money;
    $("whatReq").hidden = money;
    $("whatF").firstChild.firstChild.data = money ? "何のお金" : "品名";
    $("fWhat").placeholder = money ? "ランチ代" : kindSel === "傘" ? "紺の長傘" : kindSel === "DVD・ゲーム" ? "スプラトゥーン3" : kindSel && kindSel !== "本" && kindSel !== "マンガ" ? "電動ドライバー" : "『三体』の1巻";
    clearErr();
  }
  document.querySelectorAll("input[name=dir]").forEach(r => r.addEventListener("change", syncDir));
  function renderWho() {
    const seen = new Set(), names = [];
    st.recs.slice().sort((a, b) => a.date < b.date ? 1 : -1).forEach(r => { const k = pkey(r.who); if (!seen.has(k)) { seen.add(k); names.push(r.who); } });
    $("whoChips").replaceChildren(...names.slice(0, 8).map(n => { const b = el("button", null, n); b.type = "button"; b.addEventListener("click", () => { $("fWho").value = n; clearErr(); }); return b; }));
  }
  $("dueQuick").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const base = isYmd($("fDate").value) ? $("fDate").value : today;
    $("fDue").value = b.dataset.m ? addMonths(base, Number(b.dataset.m)) : Number(b.dataset.d) ? addDays(base, Number(b.dataset.d)) : "";
  });
  function clearErr() { $("fErr").textContent = ""; ["fWho", "fWhat", "fAmt", "fDue"].forEach(k => $(k).removeAttribute("aria-invalid")); }
  ["fWho", "fWhat", "fAmt"].forEach(k => $(k).addEventListener("input", clearErr));
  function openEdit(dir, id) {
    editId = id || null;
    const r = id ? st.recs.find(x => x.id === id) : null;
    document.querySelector(`input[name=dir][value=${r ? r.dir : dir}]`).checked = true;
    $("fWho").value = r ? r.who : ""; $("fWhat").value = r ? r.what : ""; $("fAmt").value = r && r.amt ? String(r.amt) : "";
    $("fDate").value = r ? r.date : today; $("fDate").max = today; $("fDue").value = r ? r.due : ""; $("fNote").value = r ? r.note : "";
    kindSel = r ? r.kind : ""; kindFc.close(); renderKinds(); renderWho();
    syncDir(); syncKind();
    $("edit").showModal();
    $("fWho").focus();
  }
  $("lendBtn").addEventListener("click", () => openEdit("lend"));
  $("borrowBtn").addEventListener("click", () => openEdit("borrow"));
  $("eCancel").addEventListener("click", () => $("edit").close());
  function fail(id, msg) { $("fErr").textContent = msg; $(id).setAttribute("aria-invalid", "true"); $(id).focus(); }
  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const dir = dirNow(), lend = dir === "lend";
    const who = str($("fWho").value, 20);
    if (!who) return fail("fWho", lend ? "誰に貸したかを入れてください（例：佐藤さん）。" : "誰から借りたかを入れてください（例：佐藤さん）。");
    const money = kindSel === MONEY;
    let amt = 0;
    if (money) { amt = parseYen($("fAmt").value); if (!amt) return fail("fAmt", "金額を数字で入れてください（例：3000）。"); }
    const what = str($("fWhat").value, 30);
    if (!money && !what) return fail("fWhat", lend ? "貸したものの名前を入れてください（例：『三体』の1巻）。" : "借りたものの名前を入れてください（例：紺の長傘）。");
    const date = isYmd($("fDate").value) ? $("fDate").value : today;
    if (date > today) return fail("fDate", "日付は今日以前にしてください。");
    const due = $("fDue").value;
    if (due && isYmd(due) && due < date) return fail("fDue", "返す目安は、貸し借りした日より後にしてください。");
    const snap = snapshot();
    const rec = cleanRec({ id: editId || uid(), dir, who, kind: kindSel, what, amt, date, due, note: $("fNote").value, ret: editId ? st.recs.find(x => x.id === editId).ret : "" });
    if (editId) st.recs[st.recs.findIndex(x => x.id === editId)] = rec; else st.recs.push(rec);
    save(); flashId = rec.id;
    $("edit").close();
    if (!rec.ret && tab === "done") { tab = "open"; document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.tab === "open"))); }
    render();
    toast(editId ? "更新しました。" : lend ? `${san(who)}に「${label(rec)}」を貸した、と記録しました。` : `${san(who)}から「${label(rec)}」を借りた、と記録しました。`, () => { restore(snap); render(); });
  });

  // ---------- 詳細 ----------
  let curId = null;
  function openView(id) {
    const r = st.recs.find(x => x.id === id); if (!r) return;
    curId = id;
    const lend = r.dir === "lend";
    $("vDir").className = "v-dir " + r.dir;
    $("vDir").textContent = lend ? `${san(r.who)}に貸している` : `${san(r.who)}から借りている`;
    if (r.ret) $("vDir").textContent = lend ? `${san(r.who)}に貸していた（返ってきました）` : `${san(r.who)}から借りていた（返しました）`;
    $("vWhat").textContent = label(r);
    const dl = $("vDl"); dl.replaceChildren();
    const add = (k, v) => { if (!v) return; dl.append(el("dt", null, k), el("dd", null, v)); };
    add("種類", r.kind);
    add(lend ? "貸した日" : "借りた日", `${full(r.date)}（${days(r.date, today) ? days(r.date, today) + "日前" : "今日"}）`);
    if (!r.ret) add(lend ? "返してもらう目安" : "返す目安", r.due ? `${full(r.due)}（${status(r).text}）` : "決めていない");
    add("返った日", r.ret ? full(r.ret) : "");
    add("メモ", r.note);
    $("vReturn").textContent = r.ret ? "まだ返っていない" : lend ? "返ってきた" : "返した";
    $("vReturn").className = r.ret ? "btn ghost" : "btn " + r.dir;
    $("vMsg").hidden = !!r.ret;
    $("vMsg").textContent = lend ? "やんわり伝える文" : "返す日の連絡文";
    $("view").showModal();
  }
  $("vClose").addEventListener("click", () => $("view").close());
  $("vEdit").addEventListener("click", () => { const r = st.recs.find(x => x.id === curId); $("view").close(); openEdit(r.dir, r.id); });
  $("vDel").addEventListener("click", () => {
    const r = st.recs.find(x => x.id === curId); if (!r) return;
    const snap = snapshot(); st.recs = st.recs.filter(x => x !== r); save();
    $("view").close(); render();
    toast(`「${label(r)}」の記録を消しました。`, () => { restore(snap); render(); });
  });
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("vReturn").addEventListener("click", () => {
    const r = st.recs.find(x => x.id === curId); if (!r) return;
    const snap = snapshot();
    if (r.ret) { r.ret = ""; save(); $("view").close(); flashId = r.id; render(); toast(`「${label(r)}」を、まだ返っていないことにしました。`, () => { restore(snap); render(); }); return; }
    r.ret = today; save();
    const stamp = el("span", "badge done stamp-pop", "済");
    $("vWhat").append(" ", stamp);
    setTimeout(() => {
      $("view").close(); render();
      toast(r.dir === "lend" ? `「${label(r)}」が返ってきました。` : `「${label(r)}」を返しました。`, () => { restore(snap); render(); });
    }, reduce() ? 0 : 550);
  });

  // ---------- 伝える文 ----------
  const HINTS = { polite: "職場の人や目上の人に。", plain: "知り合いや同僚に。", casual: "友達や家族に。" };
  function message(r, tone) {
    const money = r.kind === MONEY, nm = tone === "casual" ? r.who : san(r.who);
    const thing = money ? (r.what ? `${r.what}の${yen(r.amt)}` : yen(r.amt)) : r.what;
    const old = days(r.date, today) > 14;
    if (r.dir === "lend") {
      if (money) {
        if (tone === "polite") return `${nm}、${r.what ? `${old ? md(r.date) : "先日"}の${thing}` : `${old ? md(r.date) + "に" : "先日"}お貸しした${thing}`}の件でご連絡しました。急ぎではありませんので、ご都合のよいときにお願いできればと思います。細かいことで恐縮ですが、よろしくお願いいたします。`;
        if (tone === "plain") return `${nm}、この前の${thing}、余裕があるときに返してもらえると助かります。急ぎではないので、都合のいいときで大丈夫です。`;
        return `${nm}、この前の${thing}、今度会うときでいいからよろしくね！`;
      }
      const v = verbFor(r.kind);
      if (tone === "polite") return `${nm}、${old ? md(r.date) + "に" : "先日"}お貸しした${thing}の件でご連絡しました。次にお会いするときにでもお返しいただけると助かります。急ぎではありませんので、どうぞよろしくお願いいたします。`;
      if (tone === "plain") return `${nm}、この前貸した${thing}、${v}でいいので、次に会うときに返してもらえると助かります。急ぎではないので、都合のいいときで大丈夫です。`;
      return `${nm}、前に貸した${thing}、${v}でいいから、今度会うとき持ってきてくれるとうれしい！急がないからね。`;
    }
    if (money) {
      if (tone === "polite") return `${nm}、先日は${thing}をありがとうございました。近いうちにお返しします。お渡しの方法（手渡し・振り込みなど）にご希望があれば教えてください。`;
      if (tone === "plain") return `${nm}、この前は${thing}をありがとうございました！近いうちに返します。手渡しと振り込み、どちらがいいですか？`;
      return `${nm}、この前の${thing}ありがとう！今度会うとき返すね。`;
    }
    if (tone === "polite") return `${nm}、お借りしている${thing}、ありがとうございます。近いうちにお返ししたいのですが、ご都合のよい日を教えていただけますか？`;
    if (tone === "plain") return `${nm}、借りていた${thing}、ありがとうございました！近いうちに返したいので、都合のいい日を教えてください。`;
    return `${nm}、借りてた${thing}ありがとう！今度会うとき返すね。いつがいい？`;
  }
  const toneNow = () => document.querySelector("input[name=tone]:checked").value;
  function fillMsg() {
    const r = st.recs.find(x => x.id === curId); if (!r) return;
    $("mText").value = message(r, toneNow());
    $("toneHint").textContent = HINTS[toneNow()];
    $("mOk").textContent = "";
  }
  document.querySelectorAll("input[name=tone]").forEach(x => x.addEventListener("change", fillMsg));
  $("vMsg").addEventListener("click", () => {
    const r = st.recs.find(x => x.id === curId); if (!r) return;
    $("mH").textContent = r.dir === "lend" ? "やんわり伝える文" : "返す日の連絡文";
    $("view").close(); fillMsg(); $("msgDlg").showModal();
  });
  $("mClose").addEventListener("click", () => $("msgDlg").close());
  $("mCopy").addEventListener("click", async () => {
    const t = $("mText").value;
    let done = false;
    try { await navigator.clipboard.writeText(t); done = true; } catch (e) {
      try { $("mText").select(); done = document.execCommand("copy"); } catch (e2) { done = false; }
    }
    $("mOk").textContent = done ? "コピーしました。LINEやメールに貼り付けて送れます。" : "コピーできませんでした。文を長押しして選んでください。";
  });

  // ---------- 例 ----------
  $("sampleBtn").addEventListener("click", () => {
    const snap = snapshot();
    const b = n => addDays(today, -n);
    [
      { dir: "lend", who: "佐藤さん", kind: "本", what: "『三体』の1巻", date: b(40), due: b(10) },
      { dir: "lend", who: "けんた", kind: MONEY, what: "ランチ代", amt: 1200, date: b(6), due: addDays(today, 2) },
      { dir: "borrow", who: "けんた", kind: "傘", what: "紺の長傘", date: b(3) },
      { dir: "lend", who: "母", kind: "道具", what: "電動ドライバー", date: b(20) },
      { dir: "borrow", who: "田中先輩", kind: MONEY, what: "飲み会代", amt: 3500, date: b(2), due: addDays(today, 5) },
      { dir: "lend", who: "佐藤さん", kind: "DVD・ゲーム", what: "スプラトゥーン3", date: b(60), ret: b(30) }
    ].forEach(x => st.recs.push(cleanRec({ ...x, id: uid(), sample: true })));
    save(); render();
    toast("例を追加しました。先頭の記録を開いて「やんわり伝える文」を見てみてください。", () => { restore(snap); render(); });
  });
  $("clearSample").addEventListener("click", () => {
    const snap = snapshot(); st.recs = st.recs.filter(r => !r.sample); save(); render();
    toast("例を消しました。", () => { restore(snap); render(); });
  });

  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // ---------- 引っ越し ----------
  const readCustom = () => { try { const o = JSON.parse(localStorage.getItem(CK) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "kashikari", version: 1, exportedAt: new Date().toISOString(), data: st, custom: readCustom() }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `kashikari-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null, custom = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "kashikari") { data = clean(j.data); custom = j.custom; } } catch (e) { data = null; }
    if (!data || !data.recs.length) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.recs.length && !confirm(`今の記録を、ファイルの${data.recs.length}件と置き換えますか？`)) return;
    const snap = snapshot(), csnap = JSON.stringify(readCustom());
    st = data; save();
    if (custom && Array.isArray(custom.kind)) { try { localStorage.setItem(CK, JSON.stringify({ kind: custom.kind.filter(v => typeof v === "string").slice(0, 60) })); } catch (e) {} }
    renderKinds(); render();
    $("moveMsg").textContent = `${data.recs.length}件を読み込みました。`;
    toast("読み込みました。", () => { restore(snap); try { localStorage.setItem(CK, csnap); } catch (e) {} renderKinds(); render(); });
  });

  renderKinds();
  render();
})();
