// 見積もりくん — rule-based estimate builder. No AI; everything is saved in localStorage on this device only.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "mitsumori.v1";
  const RATES = { eng: 5000, des: 4500, dir: 5500, wri: 3000 };
  const ROLE_NAMES = { eng: "エンジニア", des: "デザイナー", dir: "ディレクター", wri: "ライター", own: "" };

  const SAMPLE = {
    proj: "お店の予約サイト",
    tasks: [
      { name: "トップページのデザイン", size: "M" },
      { name: "予約フォームの画面を作る", size: "L" },
      { name: "予約データを保存するAPI", size: "L" },
      { name: "管理画面（予約一覧）", size: "M" },
      { name: "確認メールの送信", size: "S" },
      { name: "本番サーバーへの公開", size: "h", hours: 3 }
    ]
  };

  // Commonly forgotten work. `hours(ctx)` returns 0 when the rule does not apply.
  const R = h => Math.ceil(h * 2) / 2; // round up to 0.5h
  const match = (ctx, re) => ctx.tasks.filter(t => re.test(t.name));
  const RULES = [
    { id: "mtg", name: "打ち合わせ・連絡", why: "作業時間の1割ほどは、打ち合わせやチャットの返信に使われがちです。", hours: c => c.base ? R(Math.max(1, c.base * 0.10)) : 0 },
    { id: "test", name: "テスト・動作確認", why: "作る時間の2割ほどは、動かして確かめる時間が必要です。", hours: c => c.base ? R(Math.max(1, c.base * 0.20)) : 0 },
    { id: "review", name: "見直し・確認依頼", why: "自分の見直しと、相手に確認してもらう時間です。", hours: c => c.base ? R(Math.max(0.5, c.base * 0.08)) : 0 },
    { id: "fix", name: "修正の対応", why: "確認後に出る修正の時間です。ほぼ必ず発生します。", hours: c => c.base ? R(Math.max(1, c.base * 0.15)) : 0 },
    { id: "release", name: "リリース作業", why: "公開の手順、最終確認、公開後の見守りの時間です。", hours: c => c.base ? 2 : 0 },
    { id: "docs", name: "説明書・引き継ぎ資料", why: "作業が3つ以上あるので、使い方や構成をまとめる時間です。", hours: c => c.tasks.length >= 3 ? R(Math.max(1, c.base * 0.05)) : 0 },
    { id: "design", name: "デザインの確認・修正のやり取り", why: "デザインや画面の作業があるので、見た目の調整のやり取りを見込みます。", hours: c => { const m = match(c, /デザイン|画面|UI|ＵＩ|レイアウト|ロゴ|バナー/); return m.length ? R(Math.max(1, m.reduce((a, t) => a + t.h, 0) * 0.15)) : 0; } },
    { id: "integ", name: "つなぎ込みの確認（結合テスト）", why: "APIや外部との連携があるので、つないだときの確認を見込みます。", hours: c => { const m = match(c, /API|ＡＰＩ|連携|外部|決済|ログイン|認証|メール/i); return m.length ? R(Math.max(2, m.reduce((a, t) => a + t.h, 0) * 0.2)) : 0; } },
    { id: "device", name: "スマホ・ブラウザごとの表示確認", why: "画面を作る作業があるので、端末ごとの見え方を確かめます。", hours: c => match(c, /画面|ページ|サイト|表示|レスポンシブ|スマホ|フォーム/).length ? 2 : 0 },
    { id: "migrate", name: "データ移行のリハーサル", why: "データ移行があるので、本番前の予行演習を見込みます。", hours: c => match(c, /移行|インポート|取り込み|データ移/).length ? 3 : 0 },
    { id: "env", name: "本番環境の準備・設定", why: "公開やサーバーの作業があるので、本番環境を用意する時間です。", hours: c => match(c, /公開|サーバー|サーバ|ドメイン|本番|デプロイ|インフラ/).length ? 3 : 0 },
    { id: "store", name: "ストア審査の対応", why: "アプリの申請があるので、審査での指摘への対応を見込みます。", hours: c => match(c, /申請|ストア|審査|App Store|Google Play/i).length ? 4 : 0 }
  ];

  let st = { proj: "", tasks: [], sizes: { S: 2, M: 6, L: 16 }, role: "eng", rate: 5000, buf: 20, off: [], fmt: "text" };
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (r && typeof r === "object") st = Object.assign(st, r); } catch (e) { /* ignore */ }
  if (!Array.isArray(st.tasks)) st.tasks = [];
  if (!Array.isArray(st.off)) st.off = [];
  if (typeof st.role !== "string" || !st.role.trim()) st.role = "eng";
  st.role = st.role.trim().slice(0, 20);
  if (!st.ownRates || typeof st.ownRates !== "object" || Array.isArray(st.ownRates)) st.ownRates = {};
  // 職種は4つのほか、自分で入れた名前も使える（"own" は前の版の「自分で決める」）
  const roleName = r => Object.prototype.hasOwnProperty.call(ROLE_NAMES, r) ? ROLE_NAMES[r] : r;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

  const yen = n => Math.round(n).toLocaleString("ja-JP") + "円";
  const hrs = n => (Math.round(n * 10) / 10).toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const hrs1 = n => String(Math.round(n * 10) / 10);
  function stamp() {
    const s = $("seal"); s.classList.remove("in"); void s.offsetWidth; s.classList.add("in");
  }
  const taskHours = t => t.size === "h" ? Math.max(0, Number(t.hours) || 0) : (Number(st.sizes[t.size]) || 0);

  function calc() {
    const tasks = st.tasks.map(t => ({ name: (t.name || "").trim() || "（名前のない作業）", size: t.size, h: taskHours(t) }));
    const base = tasks.reduce((a, t) => a + t.h, 0);
    const ctx = { tasks, base };
    const extras = RULES.map(r => ({ id: r.id, name: r.name, why: r.why, h: r.hours(ctx) })).filter(x => x.h > 0);
    const on = extras.filter(x => !st.off.includes(x.id));
    const sub = base + on.reduce((a, x) => a + x.h, 0);
    const buf = R(sub * (st.buf / 100));
    const total = sub + buf;
    const rate = Math.max(0, Number(st.rate) || 0);
    const amount = Math.ceil((total * rate) / 100) * 100;
    const tax = Math.floor(amount * 0.1);
    return { tasks, base, extras, on, sub, buf, total, rate, amount, tax, grand: amount + tax };
  }

  // ---------- tasks ----------
  function renderTasks() {
    const ol = $("tasks"); ol.replaceChildren();
    st.tasks.forEach((t, i) => {
      const li = document.createElement("li"); li.className = "task";
      const name = document.createElement("input");
      name.type = "text"; name.className = "name"; name.value = t.name || ""; name.maxLength = 60;
      name.placeholder = i === 0 ? "ログイン画面を作る" : "作業の名前"; name.setAttribute("aria-label", `作業${i + 1}の名前`);
      name.addEventListener("input", () => { t.name = name.value; save(); update(); });
      const sz = document.createElement("div"); sz.className = "sz"; sz.setAttribute("role", "group"); sz.setAttribute("aria-label", `作業${i + 1}の大きさ`);
      const hin = document.createElement("input");
      hin.type = "number"; hin.className = "hrs"; hin.min = "0"; hin.max = "999"; hin.step = "0.5"; hin.inputMode = "decimal";
      hin.setAttribute("aria-label", `作業${i + 1}の時間`); hin.value = t.size === "h" ? (t.hours ?? "") : "";
      hin.hidden = t.size !== "h";
      hin.addEventListener("input", () => { t.hours = hin.value; save(); update(); });
      const unit = document.createElement("span"); unit.className = "unit"; unit.textContent = "時間"; unit.hidden = t.size !== "h";
      [["S", "S"], ["M", "M"], ["L", "L"], ["h", "手入力"]].forEach(([v, label]) => {
        const b = document.createElement("button"); b.type = "button"; b.textContent = label;
        b.setAttribute("aria-pressed", String(t.size === v));
        b.setAttribute("aria-label", v === "h" ? "時間を手入力" : `${v}（${st.sizes[v]}時間）`);
        b.addEventListener("click", () => {
          t.size = v; if (v === "h" && !t.hours) t.hours = st.sizes.M; save(); renderTasks(); update();
          const q = $("tasks").children[i]; if (q) (v === "h" ? q.querySelector(".hrs") : q.querySelectorAll(".sz button")[["S", "M", "L"].indexOf(v)]).focus();
        });
        sz.append(b);
      });
      sz.append(hin, unit);
      const foot = document.createElement("div"); foot.className = "task-foot";
      const out = document.createElement("span"); out.className = "hours-out"; out.dataset.i = i;
      const del = document.createElement("button"); del.type = "button"; del.className = "del"; del.textContent = "✕";
      del.setAttribute("aria-label", `作業${i + 1}を削除`);
      del.addEventListener("click", () => { if ((t.name || "").trim() && !confirm(`「${t.name.trim()}」を削除しますか？`)) return; st.tasks.splice(i, 1); save(); renderTasks(); update(); });
      foot.append(out, del);
      li.append(name, sz, foot); ol.append(li);
    });
    $("empty").hidden = st.tasks.length > 0;
  }
  $("add").addEventListener("click", () => {
    st.tasks.push({ name: "", size: "M" }); save(); renderTasks(); update();
    const all = $("tasks").querySelectorAll(".name"); all[all.length - 1].focus();
  });
  $("sample").addEventListener("click", () => {
    if (st.tasks.some(t => (t.name || "").trim()) && !confirm("今の作業を消して、例に入れ替えますか？")) return;
    st.proj = SAMPLE.proj; st.tasks = SAMPLE.tasks.map(t => Object.assign({}, t)); st.off = [];
    $("proj").value = st.proj; save(); renderTasks(); update();
  });
  $("proj").value = st.proj || "";
  $("proj").addEventListener("input", () => { st.proj = $("proj").value; save(); update(); });
  ["S", "M", "L"].forEach(k => {
    const inp = $("h" + k); inp.value = st.sizes[k];
    inp.addEventListener("input", () => { const v = Number(inp.value); if (v > 0) { st.sizes[k] = v; save(); update(); } });
  });

  // ---------- rate & buffer ----------
  $("rate").value = st.rate;
  function markRole() { document.querySelectorAll("#roles .rc").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.role === st.role))); }
  function pickRole(r) {
    st.role = r;
    if (RATES[r]) st.rate = RATES[r];
    else if (st.ownRates[r] > 0) st.rate = st.ownRates[r];
    $("rate").value = st.rate;
    markRole(); save(); update();
  }
  document.querySelectorAll("#roles .rc").forEach(b => b.addEventListener("click", () => pickRole(b.dataset.role)));
  window.OwnChoices({
    key: KEY + ".custom", name: "role", host: $("roles"), max: 20,
    builtins: Object.keys(RATES).map(k => ({ value: k, label: ROLE_NAMES[k] })),
    placeholder: "動画編集", inputLabel: "職種を自分で入力", emptyMsg: "職種を入れてから「追加」を押してください。",
    extra: () => st.role === "own" ? [] : [st.role],
    chip: v => {
      const b = document.createElement("button"); b.type = "button"; b.className = "rc"; b.dataset.role = v; b.textContent = v;
      b.setAttribute("aria-pressed", String(st.role === v));
      b.addEventListener("click", () => pickRole(v));
      return b;
    },
    onPick: pickRole
  });
  markRole();
  $("rate").addEventListener("input", () => {
    st.rate = Number($("rate").value) || 0;
    if (!RATES[st.role] && st.role !== "own") st.ownRates[st.role] = st.rate;
    save(); update();
  });
  $("buf").value = st.buf;
  $("buf").addEventListener("input", () => { st.buf = Number($("buf").value); save(); update(); });

  // ---------- output ----------
  function renderExtras(c) {
    const ul = $("extras"); ul.replaceChildren();
    if (!c.extras.length) { const li = document.createElement("li"); li.className = "none"; li.textContent = "作業を追加すると、ここに候補が出ます。"; ul.append(li); return; }
    c.extras.forEach(x => {
      const on = !st.off.includes(x.id);
      const li = document.createElement("li"); li.className = on ? "" : "off";
      const lab = document.createElement("label");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = on;
      cb.addEventListener("change", () => {
        st.off = st.off.filter(id => id !== x.id); if (!cb.checked) st.off.push(x.id);
        save(); update(); const again = [...$("extras").querySelectorAll("input")].find(e => e.dataset.id === x.id); if (again) again.focus();
      });
      cb.dataset.id = x.id;
      const txt = document.createElement("span");
      const b = document.createElement("b"); b.textContent = x.name;
      const s = document.createElement("small"); s.textContent = x.why;
      txt.append(b, s);
      const h = document.createElement("span"); h.className = "h"; h.textContent = `${hrs(x.h)}時間`;
      lab.append(cb, txt, h); li.append(lab); ul.append(li);
    });
  }
  function renderTotals(c) {
    const dl = $("totals"); dl.replaceChildren();
    const row = (k, v, strong) => {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = k; dd.textContent = v; if (strong) { dt.className = dd.className = "strong"; }
      dl.append(dt, dd);
    };
    row("作業の時間", `${hrs(c.base)}時間`);
    row("忘れがちな作業", `${hrs(c.sub - c.base)}時間`);
    row(`予備（${st.buf}%）`, `${hrs(c.buf)}時間`);
    row("合計の時間", `${hrs(c.total)}時間`, true);
    row("時間単価", yen(c.rate));
    row("金額（税抜）", yen(c.amount), true);
    row("消費税（10%）", yen(c.tax));
    $("grand").textContent = yen(c.grand);
    const days = c.total / 6;
    $("grand-sub").textContent = c.total ? `1日6時間なら約${Math.ceil(days * 2) / 2}日分です。金額は100円未満を切り上げています。` : "作業を追加すると、ここに合計が出ます。";
  }
  function table(c) {
    const role = roleName(st.role) || "";
    const title = (st.proj || "").trim() || "（案件名）";
    const d = new Date(), date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const rows = c.tasks.map(t => [t.name, t.h]).concat(c.on.map(x => [x.name, x.h])).concat([[`予備（${st.buf}%）`, c.buf]]);
    if (st.fmt === "tsv") {
      return [["作業", "時間", "単価", "金額"].join("\t")]
        .concat(rows.map(([n, h]) => [n.replace(/\t/g, " "), h, c.rate, Math.round(h * c.rate)].join("\t")))
        .concat([["合計", c.total, "", c.amount].join("\t"), ["消費税（10%）", "", "", c.tax].join("\t"), ["税込合計", "", "", c.grand].join("\t")]).join("\n");
    }
    if (st.fmt === "md") {
      const esc = s => String(s).replace(/\|/g, "\\|");
      return [`### お見積もり：${esc(title)}`, `${date}／時間単価 ${yen(c.rate)}${role ? `（${role}）` : ""}`, "",
        "| 作業 | 時間 | 金額 |", "| --- | ---: | ---: |"]
        .concat(rows.map(([n, h]) => `| ${esc(n)} | ${hrs(h)} | ${yen(h * c.rate)} |`))
        .concat([`| **合計** | **${hrs(c.total)}** | **${yen(c.amount)}** |`, `| 消費税（10%） | | ${yen(c.tax)} |`, `| **税込合計** | | **${yen(c.grand)}** |`]).join("\n");
    }
    const lines = [`お見積もり：${title}`, `${date}／時間単価 ${yen(c.rate)}${role ? `（${role}）` : ""}`, "", "【作業】"];
    c.tasks.forEach(t => lines.push(`・${t.name}　${hrs(t.h)}時間（${yen(t.h * c.rate)}）`));
    if (c.on.length) { lines.push("", "【進めるうえで必要な作業】"); c.on.forEach(x => lines.push(`・${x.name}　${hrs(x.h)}時間（${yen(x.h * c.rate)}）`)); }
    lines.push("", `・予備（${st.buf}%）　${hrs(c.buf)}時間（${yen(c.buf * c.rate)}）`, "",
      `合計：${hrs(c.total)}時間`, `金額（税抜）：${yen(c.amount)}`, `消費税（10%）：${yen(c.tax)}`, `税込合計：${yen(c.grand)}`);
    return lines.join("\n");
  }
  function update() {
    const c = calc();
    document.querySelectorAll(".hours-out").forEach(el => { const t = st.tasks[+el.dataset.i]; el.textContent = t ? `${hrs(taskHours(t))}時間・${yen(taskHours(t) * c.rate)}` : ""; });
    $("bufv").textContent = `${st.buf}%`;
    renderExtras(c); renderTotals(c);
    $("out").value = st.tasks.length ? table(c) : "作業を追加すると、ここに見積もり表ができます。";
    $("legend").textContent = `S＝${hrs1(st.sizes.S)}時間・M＝${hrs1(st.sizes.M)}時間・L＝${hrs1(st.sizes.L)}時間`;
    $("outblock").hidden = !st.tasks.length;
    $("seal").classList.remove("in");
    $("tsv-note").hidden = st.fmt !== "tsv";
  }
  document.querySelectorAll("[data-fmt]").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.fmt === st.fmt));
    b.addEventListener("click", () => {
      st.fmt = b.dataset.fmt; save();
      document.querySelectorAll("[data-fmt]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      update();
    });
  });
  $("copy").addEventListener("click", async () => {
    const text = $("out").value; let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { $("out").select(); try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } }
    $("toast").textContent = ok ? "コピーしました。メールやチャットに貼れます。" : "コピーできませんでした。表を選んでコピーしてください。";
    if (ok) stamp();
    setTimeout(() => { $("toast").textContent = ""; }, 2500);
  });

  renderTasks(); update();
})();
