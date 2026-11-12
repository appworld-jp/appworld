(() => {
  "use strict";
  const KEY = "bichiku.v1";
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const PEOPLE = [
    { k: "adult", label: "大人", sub: "" },
    { k: "child", label: "子ども", sub: "ごはんを食べる年齢" },
    { k: "infant", label: "赤ちゃん", sub: "ミルク・おむつ" },
    { k: "elder", label: "高齢者", sub: "" },
    { k: "pet", label: "ペット", sub: "犬・猫" }
  ];
  // 種類ごとの単位と、よくあるもの
  const KINDS = [
    { k: "water", label: "水", unit: "L", perUnit: true, presets: [["2Lの水", 2, 6], ["500mLの水", 0.5, 24], ["長期保存水（2L）", 2, 6]] },
    { k: "staple", label: "主食", unit: "食", presets: [["パックご飯", 1, 6], ["アルファ米", 1, 5], ["カップ麺", 1, 3], ["乾パン", 1, 2], ["パスタ（1食分）", 1, 4]] },
    { k: "side", label: "おかず", unit: "食", presets: [["缶詰（魚・肉）", 1, 6], ["レトルトカレー", 1, 4], ["レトルトのおかず", 1, 4], ["フリーズドライのみそ汁", 1, 10]] },
    { k: "toilet", label: "簡易トイレ", unit: "回", perUnit: true, presets: [["簡易トイレ（50回分）", 50, 1], ["簡易トイレ（10回分）", 10, 1]] },
    { k: "gas", label: "カセットボンベ", unit: "本", presets: [["カセットボンベ", 1, 3]] },
    { k: "diaper", label: "紙おむつ", unit: "枚", need: "infant", presets: [["紙おむつ", 1, 40]] },
    { k: "petfood", label: "ペットフード", unit: "日分", need: "pet", presets: [["ドライフード", 1, 7], ["ウェットフード", 1, 7]] }
  ];
  const KIND = Object.fromEntries(KINDS.map(k => [k.k, k]));
  // 自分で入れた種類は k を "own" にして、名前を kl に持つ。必要な量の計算には入れず、期限だけ見る。
  const ownKind = label => ({ k: "own", label, unit: "個", presets: [], own: true });
  const kindOf = it => it.k === "own" ? ownKind(it.kl || "そのほか") : KIND[it.k];
  const OTHER = [
    { id: "light", t: "懐中電灯・ランタン" }, { id: "batt", t: "乾電池" }, { id: "mobile", t: "モバイルバッテリー" },
    { id: "radio", t: "携帯ラジオ" }, { id: "stove", t: "カセットコンロ" }, { id: "med", t: "常備薬とお薬手帳のコピー" },
    { id: "paper", t: "トイレットペーパー・ティッシュ" }, { id: "wet", t: "ウェットティッシュ" }, { id: "bag", t: "ゴミ袋・ポリ袋" },
    { id: "wrap", t: "ラップ・紙皿・割りばし" }, { id: "tank", t: "給水袋・ポリタンク" }, { id: "san", t: "生理用品" },
    { id: "cash", t: "小銭を含む現金" }, { id: "glove", t: "軍手・スリッパ" },
    { id: "milk", t: "粉ミルク・液体ミルク", need: "infant" }, { id: "bottle", t: "哺乳瓶（使い捨ても）", need: "infant" },
    { id: "baby", t: "離乳食・おしりふき", need: "infant" },
    { id: "soft", t: "やわらかい食品・介護食", need: "elder" }, { id: "denture", t: "入れ歯の洗浄剤", need: "elder" },
    { id: "aid", t: "老眼鏡・補聴器の電池", need: "elder" },
    { id: "petw", t: "ペットの水", need: "pet" }, { id: "carrier", t: "キャリー・リード", need: "pet" },
    { id: "pett", t: "ペットのトイレ用品", need: "pet" }, { id: "petrec", t: "ワクチンの記録・写真", need: "pet" }
  ];

  // ---------- 日付 ----------
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3], 12); return d.getMonth() === +m[2] - 1 ? d : null; };
  const today = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12); })();
  const daysTo = s => Math.round((parse(s) - today) / 864e5);
  const jd = s => { const d = parse(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
  const num = n => (Math.round(n * 10) / 10).toLocaleString("ja-JP");

  // ---------- 保存 ----------
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const ppl = {};
    for (const p of PEOPLE) { const v = raw.ppl && Number(raw.ppl[p.k]); ppl[p.k] = Number.isFinite(v) ? Math.max(0, Math.min(20, Math.round(v))) : 0; }
    const items = Array.isArray(raw.items) ? raw.items.slice(0, 300).map(it => {
      if (!it || !(KIND[it.k] || (it.k === "own" && typeof it.kl === "string" && it.kl.trim()))) return null;
      const n = Math.round(Number(it.n)), per = Number(it.per);
      if (!(n >= 1 && n <= 9999) || !(per > 0 && per <= 999)) return null;
      const name = typeof it.name === "string" ? it.name.trim().slice(0, 30) : "";
      const kl = it.k === "own" ? it.kl.trim().slice(0, 20) : "";
      const o = { id: typeof it.id === "string" && /^[\w-]{1,30}$/.test(it.id) ? it.id : uid(), k: it.k, name: name || kl || KIND[it.k].label, n, per, exp: parse(it.exp) ? it.exp : "" };
      if (kl) o.kl = kl;
      return o;
    }).filter(Boolean) : [];
    const checks = {};
    if (raw.checks && typeof raw.checks === "object") {
      for (const o of OTHER) if (raw.checks[o.id] === true) checks[o.id] = true;
      for (const id of Object.keys(raw.checks).slice(0, 200)) if (id[0] === "~" && id.length <= 21 && raw.checks[id] === true) checks[id] = true;
    }
    return { v: 1, ppl, days: raw.days === 7 ? 7 : 3, items, checks };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, ppl: { adult: 2, child: 0, infant: 0, elder: 0, pet: 0 }, days: 3, items: [], checks: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snap = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  // ---------- 必要な量 ----------
  function needs() {
    const p = st.ppl, d = st.days;
    const eaters = p.adult + p.child + p.elder;
    const all = eaters + p.infant;
    return {
      water: 3 * all * d,
      staple: 3 * eaters * d,
      side: 3 * eaters * d,
      toilet: 5 * eaters * d,
      gas: Math.ceil(eaters * 6 * d / 7),
      diaper: 8 * p.infant * d,
      petfood: p.pet * Math.max(d, 5)
    };
  }
  const NOTE = {
    water: () => `1人1日3L × ${st.ppl.adult + st.ppl.child + st.ppl.elder + st.ppl.infant}人 × ${st.days}日`,
    staple: () => `1日3食 × ${st.ppl.adult + st.ppl.child + st.ppl.elder}人 × ${st.days}日`,
    side: () => `1食に1品 × ${st.ppl.adult + st.ppl.child + st.ppl.elder}人 × ${st.days}日`,
    toilet: () => `1日5回 × ${st.ppl.adult + st.ppl.child + st.ppl.elder}人 × ${st.days}日`,
    gas: () => `1人1週間で約6本`,
    diaper: () => `1日8枚 × ${st.ppl.infant}人 × ${st.days}日`,
    petfood: () => `${st.ppl.pet}匹 × ${Math.max(st.days, 5)}日分${st.days < 5 ? "（ペットは最低5日分）" : ""}`
  };
  const valid = it => !it.exp || daysTo(it.exp) >= 0;
  const have = k => st.items.filter(it => it.k === k && valid(it)).reduce((a, it) => a + it.n * it.per, 0);
  const relevant = () => KINDS.filter(k => !k.need || st.ppl[k.need] > 0);

  // ---------- 家族 ----------
  function renderPeople() {
    const box = $("steppers"); box.textContent = "";
    for (const p of PEOPLE) {
      const row = el("div", "stp");
      const lab = el("p", "stp-l"); lab.append(el("b", null, p.label)); if (p.sub) lab.append(el("small", null, p.sub));
      const minus = el("button", "stp-b", "−"); minus.type = "button"; minus.setAttribute("aria-label", `${p.label}を1減らす`);
      const val = el("output", "stp-v", String(st.ppl[p.k])); val.setAttribute("aria-label", `${p.label}の人数`);
      const plus = el("button", "stp-b", "+"); plus.type = "button"; plus.setAttribute("aria-label", `${p.label}を1増やす`);
      minus.disabled = st.ppl[p.k] <= 0; plus.disabled = st.ppl[p.k] >= 20;
      minus.addEventListener("click", () => { st.ppl[p.k] = Math.max(0, st.ppl[p.k] - 1); save(); renderAll(); $("steppers").querySelectorAll(".stp")[PEOPLE.indexOf(p)].querySelector(".stp-b").focus(); });
      plus.addEventListener("click", () => { st.ppl[p.k] = Math.min(20, st.ppl[p.k] + 1); save(); renderAll(); $("steppers").querySelectorAll(".stp")[PEOPLE.indexOf(p)].querySelectorAll(".stp-b")[1].focus(); });
      const ctl = el("div", "stp-c"); ctl.append(minus, val, plus);
      row.append(lab, ctl); box.append(row);
    }
    document.querySelectorAll(".day").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.d === st.days)));
  }
  document.querySelectorAll(".day").forEach(b => b.addEventListener("click", () => { st.days = +b.dataset.d; save(); renderAll(); }));

  // ---------- メーター ----------
  function renderMeters() {
    const nd = needs();
    const box = $("meters"); box.textContent = "";
    const ks = relevant().filter(k => nd[k.k] > 0);
    let ok = 0;
    if (!ks.length) { box.append(el("p", "empty-h", "家族の人数を入れると、必要な量を計算します。")); $("score").textContent = ""; return; }
    for (const k of ks) {
      const need = nd[k.k], h = have(k.k);
      const pct = Math.min(100, need ? h / need * 100 : 0);
      const full = h >= need;
      if (full) ok++;
      const m = el("div", "meter" + (full ? " full" : ""));
      const top = el("div", "m-top");
      top.append(el("b", "m-name", k.label), el("span", "m-num", `${num(h)} / ${num(need)}${k.unit}`));
      const bar = el("div", "m-bar"); bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", `${k.label}：必要な${num(need)}${k.unit}のうち${num(h)}${k.unit}`);
      const fill = el("i"); fill.style.width = `${pct}%`; bar.append(fill);
      const st2 = el("p", "m-st", full ? "足りています" : `あと${num(need - h)}${k.unit}`);
      m.append(top, bar, st2, el("p", "m-note", NOTE[k.k]()));
      box.append(m);
    }
    $("score").textContent = ok === ks.length ? `${ks.length}項目すべてそろっています！` : `${ks.length}項目中${ok}項目がそろっています`;
    $("score").classList.toggle("all", ok === ks.length);
  }

  // ---------- 期限 ----------
  function expTag(it) {
    if (!it.exp) return { cls: "none", t: "期限なし" };
    const d = daysTo(it.exp);
    if (d < 0) return { cls: "bad", t: "期限切れ" };
    if (d === 0) return { cls: "warn", t: "今日まで" };
    if (d <= 90) return { cls: "warn", t: `あと${d}日` };
    return { cls: "ok", t: `${jd(it.exp)}まで` };
  }
  const amount = it => {
    const k = kindOf(it);
    if (k.perUnit) return `${num(it.per)}${k.unit} × ${it.n}${k.k === "water" ? "本" : "個"} ＝ ${num(it.n * it.per)}${k.unit}`;
    return `${num(it.n * it.per)}${k.unit}`;
  };
  function itemRow(it, compact) {
    const li = el("li", "it");
    const tag = expTag(it);
    li.dataset.exp = tag.cls;
    const main = el("div", "it-main");
    const head = el("p", "it-h");
    head.append(el("span", "it-k" + (it.k === "own" ? " own" : ""), kindOf(it).label), el("b", "it-name", it.name));
    const sub = el("p", "it-sub");
    sub.append(el("span", null, amount(it)), el("span", "it-exp " + tag.cls, tag.t));
    main.append(head, sub);
    li.append(main);
    const acts = el("div", "it-acts");
    if (tag.cls === "bad") {
      const gone = el("button", "it-b", "処分した"); gone.type = "button"; gone.setAttribute("aria-label", `${it.name}を処分した`);
      gone.addEventListener("click", () => { const s = snap(); st.items = st.items.filter(y => y.id !== it.id); save(); renderAll(); toast(`${it.name}を一覧から外しました。`, () => { restore(s); renderAll(); }); });
      acts.append(gone);
      if (compact) { li.append(acts); return li; }
    }
    const use = el("button", "it-b", "1つ使う"); use.type = "button"; use.setAttribute("aria-label", `${it.name}を1つ使う`);
    if (tag.cls === "bad") use.hidden = true;
    use.addEventListener("click", () => {
      const s = snap();
      const x = st.items.find(y => y.id === it.id); if (!x) return;
      x.n -= 1;
      if (x.n <= 0) st.items = st.items.filter(y => y.id !== it.id);
      save(); renderAll();
      toast(x.n <= 0 ? `${it.name}を使い切りました。買い足したら追加してください。` : `${it.name}を1つ使いました。`, () => { restore(s); renderAll(); });
    });
    acts.append(use);
    if (!compact) {
      const del = el("button", "it-b del", "削除"); del.type = "button"; del.setAttribute("aria-label", `${it.name}を削除`);
      del.addEventListener("click", () => { const s = snap(); st.items = st.items.filter(y => y.id !== it.id); save(); renderAll(); toast(`${it.name}を削除しました。`, () => { restore(s); renderAll(); }); });
      acts.append(del);
    }
    li.append(acts);
    return li;
  }
  const byExp = (a, b) => (a.exp || "9999") < (b.exp || "9999") ? -1 : (a.exp || "9999") > (b.exp || "9999") ? 1 : 0;
  function renderItems() {
    const soon = st.items.filter(it => it.exp && daysTo(it.exp) <= 90).sort(byExp);
    $("soonBox").hidden = !soon.length;
    const sl = $("soonList"); sl.textContent = "";
    soon.forEach(it => sl.append(itemRow(it, true)));
    const ul = $("items"); ul.textContent = "";
    $("stockEmpty").hidden = st.items.length > 0;
    const ord = it => it.k === "own" ? KINDS.length : KINDS.indexOf(KIND[it.k]);
    st.items.slice().sort((a, b) => ord(a) - ord(b) || (a.kl || "").localeCompare(b.kl || "", "ja") || byExp(a, b)).forEach(it => ul.append(itemRow(it, false)));
  }

  // ---------- 追加 ----------
  // curKind は決まった種類のキーか、自分で入れた種類の "~名前"
  let curKind = "water";
  const kindFree = window.FreeChoice({
    key: KEY + ".custom", set: "kind", label: "種類", max: 20, placeholder: "マスク、電池、常備薬",
    builtins: () => KINDS.map(k => ({ value: k.k, label: k.label })),
    onChange: () => renderKinds(),
    onPick: v => { curKind = KIND[v] ? v : "~" + v; renderKinds(); setKind(curKind); $("aName").focus(); }
  });
  const kindList = () => relevant().concat(kindFree.values().map(v => Object.assign(ownKind(v), { key: "~" + v })));
  const keyOf = k => k.key || k.k;
  const curK = () => curKind[0] === "~" ? ownKind(curKind.slice(1)) : KIND[curKind];
  function renderKinds() {
    const box = $("kinds"); box.textContent = "";
    const ks = kindList();
    if (!ks.some(k => keyOf(k) === curKind)) curKind = "water";
    for (const k of ks) {
      const b = el("button", "kind" + (k.own ? " own" : ""), k.label); b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(keyOf(k) === curKind));
      b.tabIndex = keyOf(k) === curKind ? 0 : -1;
      b.addEventListener("click", () => { setKind(keyOf(k)); });
      b.addEventListener("keydown", e => {
        const i = ks.indexOf(k);
        const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (j == null) return;
        e.preventDefault(); const n = ks[(j + ks.length) % ks.length]; setKind(keyOf(n)); box.querySelectorAll(".kind")[(j + ks.length) % ks.length].focus();
      });
      box.append(k.own ? kindFree.wrap(b, k.label) : b);
    }
    box.append(kindFree.root);
    renderPresets();
  }
  function setKind(k) {
    curKind = k;
    const ks = kindList();
    $("kinds").querySelectorAll(".kind").forEach((b, i) => { const on = keyOf(ks[i]) === k; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
    $("aName").value = ""; $("aN").value = ""; $("addErr").textContent = "";
    renderPresets();
  }
  function renderPresets() {
    const k = curK();
    const box = $("presets"); box.textContent = "";
    if (k.own) {
      box.append(el("span", "pre-l", `「${k.label}」は必要な量の計算には入りません。数と期限を控えておけます。`));
      $("aName").placeholder = k.label; $("aPer").value = 1; $("aN").placeholder = "1";
      document.querySelector(".f-per").hidden = true;
      document.querySelector(".f-n span").textContent = "数";
      return;
    }
    box.append(el("span", "pre-l", "よくある物"));
    for (const [name, per, n] of k.presets) {
      const b = el("button", "pre", name); b.type = "button";
      b.addEventListener("click", () => { $("aName").value = name; $("aPer").value = per; $("aN").value = n; $("aN").focus(); $("aN").select(); });
      box.append(b);
    }
    $("aName").placeholder = k.presets[0][0];
    $("aPer").value = k.presets[0][1];
    document.querySelector(".f-per").hidden = !k.perUnit;
    $("aPerL").textContent = `1つあたり（${k.unit}）`;
    $("aN").placeholder = String(k.presets[0][2]);
    document.querySelector(".f-n span").textContent = k.perUnit ? "数" : `数（${k.unit}）`;
  }
  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const k = curK();
    const n = Math.round(Number($("aN").value));
    const per = k.perUnit ? Number($("aPer").value) : 1;
    if (!$("aN").value || !(n >= 1 && n <= 9999)) { $("addErr").textContent = "数を1以上で入れてください。"; $("aN").focus(); return; }
    if (!(per > 0 && per <= 999)) { $("addErr").textContent = `1つあたりの量（${k.unit}）を入れてください。`; $("aPer").focus(); return; }
    const exp = $("aExp").value;
    if (exp && !parse(exp)) { $("addErr").textContent = "期限の日付を確かめてください。"; $("aExp").focus(); return; }
    const name = $("aName").value.trim().slice(0, 30) || (k.own ? k.label : k.presets[0][0]);
    $("addErr").textContent = "";
    const item = { id: uid(), k: k.k, name, n, per, exp: exp || "" };
    if (k.own) item.kl = k.label;
    st.items.push(item); save();
    $("aName").value = ""; $("aN").value = ""; $("aExp").value = "";
    renderAll();
    const msg = exp && daysTo(exp) < 0 ? `${name}を追加しました。期限が切れているので、数には入れていません。` : `${name}を追加しました。`;
    toast(msg);
  });

  // ---------- ほかの持ち物 ----------
  // 自分で足したものは id を "~名前" にして、チェックの状態を同じ st.checks に持つ
  const checkFree = window.FreeChoice({
    key: KEY + ".custom", set: "check", label: "備える物", max: 20, placeholder: "予備のメガネ",
    builtins: () => OTHER.map(o => ({ value: o.id, label: o.t })),
    onChange: () => renderChecks(),
    onPick: v => { const id = OTHER.some(o => o.id === v) ? v : "~" + v; st.checks[id] = true; save(); renderChecks(); }
  });
  const checkList = () => OTHER.filter(o => !o.need || st.ppl[o.need] > 0).concat(checkFree.values().map(v => ({ id: "~" + v, t: v, own: true })));
  function renderChecks() {
    const ul = $("checks"); ul.textContent = "";
    const list = checkList();
    for (const o of list) {
      const li = el("li", o.own ? "own" : null);
      const lab = el("label", "ck");
      const cb = el("input"); cb.type = "checkbox"; cb.checked = !!st.checks[o.id];
      cb.addEventListener("change", () => { if (cb.checked) st.checks[o.id] = true; else delete st.checks[o.id]; save(); renderChecksCount(); });
      lab.append(cb, el("span", null, o.t)); li.append(lab);
      if (o.own) li.append(checkFree.removeButton(o.t));
      ul.append(li);
    }
    const li = el("li", "fc-li"); li.append(checkFree.root); ul.append(li);
    renderChecksCount();
  }
  function renderChecksCount() {
    const list = checkList();
    const n = list.filter(o => st.checks[o.id]).length;
    $("otherCount").textContent = `家にある物にチェックを入れてください。${list.length}個中${n}個あります。`;
  }

  function renderAll() { renderPeople(); renderMeters(); renderItems(); renderKinds(); renderChecks(); }

  // ---------- 書き出し・読み込み ----------
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "bichiku", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = `bichiku-${ymd(today)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押してください。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 2e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "bichiku") data = clean(j.data); } catch (e) { data = null; }
    if (!data) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.items.length && !confirm(`今の記録（${st.items.length}品）を、ファイルの${data.items.length}品に置き換えますか？`)) return;
    const s = snap();
    st = data; save(); renderAll();
    $("moveMsg").textContent = `${data.items.length}品を読み込みました。`;
    toast("読み込みました。", () => { restore(s); renderAll(); });
  });

  // ---------- トースト ----------
  let tt = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg;
    $("toastUndo").hidden = !undo;
    $("toastUndo").onclick = () => { if (undo) undo(); $("toast").hidden = true; };
    $("toast").hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { $("toast").hidden = true; }, 5000);
  }

  renderAll();
})();
