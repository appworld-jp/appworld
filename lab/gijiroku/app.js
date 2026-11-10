// 議事録まとめ — rule-based extraction of decisions, action items and open questions. No AI, nothing leaves the device.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "gijiroku.v1";

  const SAMPLE = [
    "11/9 週次定例（Webサイトリニューアル）",
    "参加：佐藤、田中、鈴木、山本",
    "",
    "佐藤：先週の振り返りから始めます。",
    "田中：トップページのデザイン案は2案作りました。",
    "佐藤：A案で進めることに決定しました。",
    "鈴木：問い合わせフォームの項目、もう少し減らせませんか？",
    "山本：必須項目は名前とメールだけにする方向で合意です。",
    "佐藤：田中さん、A案の修正版を11/13までにお願いします。",
    "田中：了解です。修正版は水曜までに提出します。",
    "鈴木：サーバー移行の日程は来週の定例で決めます。",
    "山本：TODO 画像素材の利用許諾を確認する",
    "鈴木：公開日は12月1日に決まりました。",
    "田中：スマホ表示の崩れは鈴木さんが金曜までに対応します。",
    "山本：予算の上限はまだ未定です。",
    "佐藤：議事録は山本さん担当でお願いします。",
    "鈴木：お知らせ欄の更新は誰がやりますか？"
  ].join("\n");

  // ---------- rules ----------
  const RE = {
    bullet: /^\s*(?:[-*・●○◆◇■□▶>＞※]+|\d{1,2}[.)．）]|[（(]\d{1,2}[)）])\s*/,
    time: /^\s*[[［(（]?\d{1,2}:\d{2}(?::\d{2})?[\]］)）]?\s*/,
    speaker: /^([^\s:：、。「」（）()]{1,10}?)\s*[:：]\s*(.*)$/,
    ack: /^(?:はい|了解です|了解しました|承知しました|わかりました|分かりました|OKです|オッケーです)[。、!！\s]*/,
    attendees: /^(?:参加者?|出席者?|メンバー)\s*[:：]\s*(.+)$/,
    head: /^[\s■□◆◇●【\[#＃]*\s*(決定事項|決まったこと|決定|合意事項|TODO|ToDo|やること|宿題|アクション(?:アイテム)?|ネクストアクション|課題|持ち越し|懸案事項?|未決事項?|質問|確認事項)\s*[】\]]?\s*[:：]?\s*$/i,
    decision: /決定|決まっ|決まり|決めました|合意|確定|承認(?:され|しました|です)/,
    notDecided: /決まって(?:い)?ない|決まらな|未決|未定|決定(?:待ち|前)|決めかね/,
    carry: /未定|保留|持ち越し|次回(?:の|に|まで|で)|来週の(?:定例|会議|MTG|打ち合わせ)で|引き続き検討|要検討|要確認|検討中/,
    question: /[？?]\s*$|[？?]\s*[（(]|ですか[。]?$|ますか[。]?$/,
    todoWord: /TODO|ToDo|todo|宿題|担当|対応|までに|まで|お願いします|お願いいたします|お願い|持ち帰/,
    firstPerson: /(?:やります|やっておきます|対応します|確認します|調べます|送ります|作ります|出します|まとめます|担当します|持ち帰ります|共有します|準備します|進めます|直します|連絡します)/,
    explicit: /TODO|ToDo|todo|宿題/,
    name: /([一-龥々ァ-ヶーA-Za-z]{1,6})(?:さん|くん|君|氏|様)/g,
    tanto: /担当\s*(?:[:：]|は)\s*([一-龥々ァ-ヶーA-Za-z]{1,8}?)(?:さん)?(?=[\s、。,）)]|です|$)/,
    at: /[@＠]([^\s、。,]{1,12})/,
    due: new RegExp([
      "(?:\\d{4}[/年])?\\d{1,2}[/月]\\d{1,2}日?(?:\\s*[（(][月火水木金土日][)）])?",
      "(?:再来週|来週|今週)?の?[月火水木金土日]曜(?:日)?",
      "明日|明後日|あさって|本日中|今日中|今週中|来週中|今月中|来月中|今月末|月末|週明け|来週|再来週|来月|次回(?:の(?:定例|会議|MTG))?"
    ].join("|"))
  };
  const NOT_NAMES = new Set(["皆", "みな", "皆様", "みんな", "お客", "各位", "担当者", "先方", "社長"]);

  function strip(line) {
    let s = line.replace(RE.time, "").replace(RE.bullet, "").trim();
    return s;
  }
  function splitSpeaker(s) {
    const m = s.match(RE.speaker);
    if (m && !/^(?:TODO|ToDo|todo|宿題|決定|期限|担当|日時|場所|議題|URL|http)/.test(m[1]) && !/\d/.test(m[1])) return { who: m[1], text: m[2].trim() };
    return { who: "", text: s };
  }
  function findDue(s) {
    const m = s.match(RE.due);
    return m ? m[0] : "";
  }
  function cleanWhat(text, who, due) {
    let s = text.replace(RE.ack, "");
    s = s.replace(/^(?:TODO|ToDo|todo|宿題)\s*[:：]?\s*/, "");
    s = s.replace(RE.at, "");
    if (who) {
      const w = who.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      s = s.replace(new RegExp(w + "(?:さん|くん|君|氏|様)?(?:が|は|に|へ)?[、,]?\\s*", "g"), "");
    }
    s = s.replace(/[（(]\s*担当\s*[:：][^）)]*[）)]/, "").replace(/担当\s*[:：]\s*[^\s、。,）)]+/, "").replace(/(?:の)?担当(?:で|として|です|します)?/, "");
    if (due) s = s.split(due + "までに").join("").split(due + "まで").join("").split(due).join("");
    s = s.replace(/(?:を|の件を?)?\s*(?:よろしく)?お願い(?:します|いたします|できますか)?[。！!]*$/, "");
    s = s.replace(/^(.+?)[はを、]\s*(対応|修正|確認|作成|準備|共有|連絡|提出|調査|送付|報告|更新|手配)(?:します|する|しておきます|をします)?[。．]?$/, "$1の$2");
    s = s.replace(/[（(]\s*[）)]/g, "");
    s = s.replace(/[。．！!\s]+$/, "").replace(/^[、,\s]+/, "").replace(/[はがをにで、,\s]+$/, "");
    return s.trim();
  }

  function analyse(src) {
    const lines = src.split(/\r?\n/);
    const names = new Set();
    // pass 1: collect people
    lines.forEach(raw => {
      const s = strip(raw); if (!s) return;
      const at = s.match(RE.attendees);
      if (at) { at[1].split(/[、,，/\s]+/).forEach(n => { n = n.replace(/(?:さん|様|氏)$/, "").replace(/[（(].*$/, "").trim(); if (n && n.length <= 8) names.add(n); }); return; }
      const sp = splitSpeaker(s); if (sp.who) names.add(sp.who);
      for (const m of s.matchAll(RE.name)) if (!NOT_NAMES.has(m[1])) names.add(m[1]);
    });
    const res = { dec: [], todo: [], carry: [] };
    let section = "";
    lines.forEach(raw => {
      const s0 = strip(raw);
      if (!s0) return;
      const h = s0.match(RE.head);
      if (h) {
        const k = h[1];
        section = /決定|決まった|合意/.test(k) ? "dec" : /課題|持ち越し|懸案|未決|質問|確認事項/.test(k) ? "carry" : "todo";
        return;
      }
      if (RE.attendees.test(s0)) return;
      const isBullet = RE.bullet.test(raw);
      if (section && !isBullet && /^[■【#＃]/.test(raw.trim())) section = "";
      const sp = splitSpeaker(s0);
      const text = sp.text.replace(RE.ack, "").trim();
      if (!text) return;

      // who is mentioned?
      let who = "";
      const t = text.match(RE.tanto), a = text.match(RE.at);
      if (t && !NOT_NAMES.has(t[1])) who = t[1].replace(/さん$/, "");
      else if (a) who = a[1];
      else {
        for (const m of text.matchAll(RE.name)) if (!NOT_NAMES.has(m[1])) { who = m[1]; break; }
        if (!who) for (const n of names) if (n !== sp.who && text.includes(n)) { who = n; break; }
        if (!who && sp.who && RE.firstPerson.test(text)) who = sp.who;
      }
      const due = findDue(text);

      let kind = "";
      if (section && isBullet) kind = section;
      else if (RE.decision.test(text) && !RE.notDecided.test(text) && !RE.question.test(text)) kind = "dec";
      else if (RE.explicit.test(text)) kind = "todo";
      else if (RE.carry.test(text) || RE.question.test(text)) kind = "carry";
      else if (who && (RE.todoWord.test(text) || RE.firstPerson.test(text))) kind = "todo";
      else if (section) kind = section;
      if (!kind) return;

      if (kind === "todo") res.todo.push({ who, what: cleanWhat(text, who, due) || text, due });
      else res[kind].push(text.replace(/^(?:決定|決定事項|合意)\s*[:：]\s*/, "").replace(/[。．]+$/, ""));
    });
    return res;
  }

  // ---------- state & UI ----------
  let state = { title: "", date: "", src: "", res: null, fmt: "text" };
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && typeof r === "object") state = Object.assign(state, r); } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  $("title").value = state.title || "";
  state.date = state.date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("date").value = state.date;
  $("src").value = state.src || "";

  function input(cls, value, label, ph, onInput) {
    const i = document.createElement("input");
    i.type = "text"; i.className = cls; i.value = value; i.placeholder = ph || "";
    i.setAttribute("aria-label", label); i.maxLength = 200;
    i.addEventListener("input", () => { onInput(i.value); save(); renderSummary(); });
    return i;
  }
  function delBtn(label, fn) {
    const b = document.createElement("button"); b.type = "button"; b.className = "del"; b.textContent = "✕";
    b.setAttribute("aria-label", label); b.addEventListener("click", fn); return b;
  }
  function renderLists() {
    const r = state.res;
    $("empty").hidden = !!r; $("results").hidden = !r; $("sumpanel").hidden = !r;
    if (!r) { $("total").textContent = ""; return; }
    ["dec", "carry"].forEach(k => {
      const ul = $("list-" + k); ul.replaceChildren();
      r[k].forEach((txt, i) => {
        const li = document.createElement("li");
        li.append(input("txt", txt, `${k === "dec" ? "決まったこと" : "持ち越し"} ${i + 1}`, "", v => { r[k][i] = v; }),
          delBtn(`${i + 1}行目を消す`, () => { r[k].splice(i, 1); save(); renderAll(); }));
        ul.append(li);
      });
      if (!r[k].length) { const li = document.createElement("li"); li.className = "none"; li.textContent = "なし"; ul.append(li); }
    });
    const ul = $("list-todo"); ul.replaceChildren();
    r.todo.forEach((t, i) => {
      const li = document.createElement("li");
      li.append(
        input("who", t.who, `宿題${i + 1}の担当`, "担当", v => { t.who = v; }),
        input("what", t.what, `宿題${i + 1}のやること`, "やること", v => { t.what = v; }),
        input("due", t.due, `宿題${i + 1}の期限`, "期限", v => { t.due = v; }),
        delBtn(`宿題${i + 1}を消す`, () => { r.todo.splice(i, 1); save(); renderAll(); }));
      ul.append(li);
    });
    if (!r.todo.length) { const li = document.createElement("li"); li.className = "none"; li.textContent = "なし"; ul.append(li); }
    $("n-dec").textContent = r.dec.length; $("n-todo").textContent = r.todo.length; $("n-carry").textContent = r.carry.length;
    $("total").textContent = `決まったこと${r.dec.length}件、宿題${r.todo.length}件、持ち越し${r.carry.length}件を見つけました。違うところは、そのまま書き直せます。`;
  }
  function dateLabel(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) return "";
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return `${+m[1]}年${+m[2]}月${+m[3]}日（${"日月火水木金土"[d.getDay()]}）`;
  }
  function buildSummary() {
    const r = state.res; if (!r) return "";
    const md = state.fmt === "md", out = [];
    const title = state.title.trim() || "会議", date = dateLabel(state.date);
    out.push(md ? `## ${title}の議事録${date ? `（${date}）` : ""}` : `【${title}の議事録】${date}`);
    const sec = (h, arr, fn) => {
      out.push(""); out.push(md ? `### ${h}` : `■ ${h}`);
      const items = arr.filter(x => (typeof x === "string" ? x : x.what || x.who).trim());
      if (!items.length) out.push(md ? "- なし" : "・なし");
      items.forEach(x => out.push(fn(x)));
    };
    sec("決まったこと", r.dec, x => (md ? "- " : "・") + x.trim());
    sec("宿題", r.todo, x => {
      const who = x.who.trim() || "担当未定", due = x.due.trim();
      return md ? `- [ ] **${who}**：${x.what.trim()}${due ? `（期限：${due}）` : ""}` : `・［${who}］${x.what.trim()}${due ? `（期限：${due}）` : ""}`;
    });
    sec("持ち越し", r.carry, x => (md ? "- " : "・") + x.trim());
    return out.join("\n");
  }
  function renderSummary() { $("summary").value = buildSummary(); }
  function renderAll() { renderLists(); renderSummary(); }

  $("run").addEventListener("click", () => {
    state.src = $("src").value;
    if (!state.src.trim()) { $("src").focus(); $("src").setAttribute("aria-invalid", "true"); $("src-err").textContent = "メモが空です。会議のメモを貼ってから押してください。"; return; }
    $("src").removeAttribute("aria-invalid"); $("src-err").textContent = "";
    state.res = analyse(state.src); save(); renderAll();
    document.querySelectorAll(".badge").forEach(b => { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); });
    if (window.matchMedia("(max-width:959px)").matches) $("out-h").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
  });
  $("sample").addEventListener("click", () => {
    $("src").value = SAMPLE; $("title").value = "週次定例"; state.title = "週次定例"; state.src = SAMPLE; save();
    $("run").click();
  });
  $("clear").addEventListener("click", () => {
    if (($("src").value || state.res) && !confirm("メモと結果を消しますか？")) return;
    $("src").value = ""; state.src = ""; state.res = null; save(); renderAll(); $("src").focus();
  });
  $("src").addEventListener("input", () => { state.src = $("src").value; save(); if ($("src-err").textContent && state.src.trim()) { $("src-err").textContent = ""; $("src").removeAttribute("aria-invalid"); } });
  $("title").addEventListener("input", () => { state.title = $("title").value; save(); renderSummary(); });
  $("date").addEventListener("input", () => { state.date = $("date").value; save(); renderSummary(); });
  document.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.add; if (!state.res) return;
    state.res[k].push(k === "todo" ? { who: "", what: "", due: "" } : "");
    save(); renderAll();
    const ul = $("list-" + k), inputs = ul.querySelectorAll("input"); if (inputs.length) inputs[k === "todo" ? inputs.length - 3 : inputs.length - 1].focus();
  }));
  document.querySelectorAll("[data-fmt]").forEach(b => b.addEventListener("click", () => {
    state.fmt = b.dataset.fmt; save();
    document.querySelectorAll("[data-fmt]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    renderSummary();
  }));
  document.querySelectorAll("[data-fmt]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.fmt === state.fmt)));

  $("copy").addEventListener("click", async () => {
    const text = $("summary").value; let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      $("summary").select(); try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
    }
    $("toast").textContent = ok ? "コピーしました。チャットやメールに貼れます。" : "コピーできませんでした。まとめの文を選んでコピーしてください。";
    setTimeout(() => { $("toast").textContent = ""; }, 2500);
  });

  renderAll();
})();
