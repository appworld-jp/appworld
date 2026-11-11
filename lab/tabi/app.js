// 旅のしおり — 予定表と持ち物は、決まった型と条件のルールから組み立てる。通信はしない。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "tabi.v1";
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const pad = n => String(n).padStart(2, "0");
  const WD = "日月火水木金土";
  let S = null;

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && v.cfg && Array.isArray(v.days)) S = v; } catch (e) {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  // ---- 予定表の型 ----
  const go = c => c.plane ? "飛行機で出発" : c.car ? "車で出発" : "電車で出発";
  const T = {
    relax: {
      first: [["12:00", "現地で昼ごはん"], ["13:30", "町をのんびり散策"], ["15:00", "宿にチェックイン"], ["18:30", "宿で夕ごはん"]],
      mid: [["8:00", "朝ごはん"], ["10:00", "近くをゆっくり散歩"], ["12:00", "昼ごはん"], ["14:00", "宿で自由時間"], ["18:30", "夕ごはん"]],
      trip: [["11:00", "町をのんびり散策"], ["13:30", "カフェでひと休み"]]
    },
    sight: {
      first: [["11:00", "到着、観光スタート"], ["12:00", "昼ごはん"], ["13:30", "名所めぐり"], ["16:30", "宿にチェックイン"], ["18:30", "夕ごはん"]],
      mid: [["7:30", "朝ごはん"], ["9:00", "名所めぐり（午前）"], ["12:00", "昼ごはん"], ["13:00", "名所めぐり（午後）"], ["16:30", "宿へ戻る"], ["18:30", "夕ごはん"]],
      trip: [["11:00", "名所めぐり（午前）"], ["13:30", "名所めぐり（午後）"]]
    },
    food: {
      first: [["11:30", "商店街で食べ歩き"], ["14:00", "カフェで休憩"], ["15:30", "宿にチェックイン"], ["18:00", "名物の夕ごはん"]],
      mid: [["8:30", "朝ごはんは軽めに"], ["10:30", "朝市・名物めぐり"], ["13:00", "昼ごはん"], ["15:00", "甘いものでひと休み"], ["18:00", "地元のお店で夕ごはん"]],
      trip: [["11:00", "商店街で食べ歩き"], ["14:00", "甘いものでひと休み"]]
    },
    nature: {
      first: [["10:00", "登山口・散策路に到着"], ["12:00", "景色を見ながら昼ごはん"], ["14:30", "散策を終えて休憩"], ["16:00", "宿にチェックイン"], ["18:30", "夕ごはん"]],
      mid: [["6:30", "朝ごはん"], ["7:30", "出発、ハイキング"], ["12:00", "お弁当の昼ごはん"], ["15:00", "宿に戻って休憩"], ["18:30", "夕ごはん"]],
      trip: [["10:30", "ハイキング開始"], ["14:00", "下山、ひと休み"]]
    }
  };
  // 自分で入れたスタイル（"my:" + 言葉）は、その言葉を予定に入れた型にする
  const MY = "my:";
  const myLabel = style => (typeof style === "string" && style.startsWith(MY) ? style.slice(MY.length) : "");
  function myTemplate(w) {
    return {
      first: [["12:00", "現地で昼ごはん"], ["13:30", w], ["15:30", "宿にチェックイン"], ["18:30", "夕ごはん"]],
      mid: [["8:00", "朝ごはん"], ["9:30", `${w}（午前）`], ["12:00", "昼ごはん"], ["13:30", `${w}（午後）`], ["16:30", "宿でひと休み"], ["18:30", "夕ごはん"]],
      trip: [["11:00", w], ["13:30", "カフェでひと休み"]]
    };
  }
  const mins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

  function buildDays(c) {
    const st = myLabel(c.style) ? myTemplate(myLabel(c.style)) : T[c.style] || T.relax, n = c.days, out = [];
    const extra = (arr, kind) => {
      if (c.onsen) arr.push(kind === "last" ? ["7:00", "朝の温泉"] : kind === "trip" ? ["16:00", "日帰り温泉"] : ["20:30", "ゆっくり温泉"]);
      if (c.sea && kind !== "last") arr.push(["14:30", "海・プールで遊ぶ"]);
      if (c.kids && kind !== "last") arr.push(["15:30", "おやつ休憩"]);
      return arr;
    };
    if (n === 1) {
      out.push(extra([["8:00", go(c)], ["10:30", `${c.dest}に到着`], ...st.trip, ["12:00", "昼ごはん"], ["15:30", "お土産を買う"], ["17:00", "帰路へ"], ["19:00", "帰宅"]], "trip"));
    } else {
      for (let i = 0; i < n; i++) {
        if (i === 0) out.push(extra([[c.style === "nature" ? "7:00" : "8:30", go(c)], ...st.first], "first"));
        else if (i === n - 1) out.push(extra([["8:00", "朝ごはん"], ["10:00", "チェックアウト"], ["10:30", "最後にもう一か所"], ["12:00", "昼ごはん"], ["13:30", "お土産を買う"], ["15:00", "帰路へ"], ["18:00", "帰宅"]], "last"));
        else out.push(extra(st.mid.slice(), "mid"));
      }
    }
    return out.map(d => d.sort((a, b) => mins(a[0]) - mins(b[0])).map(([t, x]) => ({ t, x })));
  }

  // ---- 持ち物のルール ----
  function season(c) {
    const m = new Date(c.start + "T00:00:00").getMonth() + 1;
    return m >= 6 && m <= 9 ? "summer" : m === 12 || m <= 2 ? "winter" : "mid";
  }
  function buildPack(c) {
    const L = [], add = (g, list, why) => list.forEach(n => {
      const hit = L.find(x => x.n === n);
      if (hit) return;
      L.push({ g, n, why: why || "", done: false });
    });
    const nights = c.days - 1, m = new Date(c.start + "T00:00:00").getMonth() + 1;
    add("貴重品", ["財布", "交通系ICカード", "保険証（マイナ保険証）", "スマートフォン"]);
    if (c.car) add("貴重品", ["運転免許証"], "車");
    if (c.plane) add("貴重品", ["搭乗券（スマホでも可）", "本人確認書類"], "飛行機");
    if (nights > 0) add("貴重品", ["宿の予約の控え"]);
    add("身の回り", ["ハンカチ・ティッシュ", "常備薬", "折りたたみ傘", "エコバッグ", "ビニール袋（ぬれた物・ごみ用）"]);
    add("電子機器", ["スマホの充電器・ケーブル", "モバイルバッテリー"]);
    if (nights > 0) {
      add("衣類", [`下着・靴下（${nights}泊分）`, `着替えの服（${nights}日分）`, "寝間着（宿にあれば不要）"]);
      add("洗面・身支度", ["歯ブラシ", "洗顔料・スキンケア", "ヘアブラシ", "コンタクト用品・眼鏡"]);
    }
    const s = season(c);
    if (s === "summer") add("季節", ["帽子", "日焼け止め", "汗ふきシート", "水筒・飲み物", "虫よけ"], m === 6 ? "梅雨・夏" : "夏");
    else if (s === "winter") add("季節", ["厚手の上着", "手袋・マフラー", "カイロ", "リップクリーム"], "冬");
    else add("季節", ["羽織るもの（朝晩の冷え対策）"], m <= 5 ? "春" : "秋");
    if (m === 6) add("季節", ["替えの靴下"], "梅雨");
    if (c.style === "nature") add("山歩き", ["歩きやすい靴（トレッキングシューズ）", "雨具（レインウェア）", "リュック", "行動食と水", "タオル"], "自然");
    if (c.style === "sight") add("観光", ["歩きやすい靴", "行きたい場所のメモ・地図"], "観光");
    if (c.style === "food") add("食べ歩き", ["ウェットティッシュ", "小銭", "胃腸薬"], "食べ歩き");
    if (c.style === "relax") add("のんびり", ["本・音楽", "ゆったりした部屋着"], "のんびり");
    if (myLabel(c.style)) add(myLabel(c.style), [`「${myLabel(c.style)}」に必要なもの`]);
    (c.mine || []).forEach(o => add(o, [`「${o}」に必要なもの`]));
    if (c.onsen) add("温泉", ["脱ぎ着しやすい服", "ヘアゴム", "ぬれたタオル用の袋", "化粧水・乳液"], "温泉");
    if (c.sea) add("海・プール", ["水着", "ラッシュガード", "ビーチサンダル", "大きめのタオル", "日焼け止め"], "海");
    if (c.kids) {
      add("子ども", ["子どもの着替え（多め）", "子どもの保険証・医療証", "おやつ", "おもちゃ・絵本", "ウェットティッシュ"], "子ども");
      if (c.plane) add("子ども", ["耳抜き用の飲み物・あめ"], "飛行機");
    }
    if (c.plane) add("飛行機", ["イヤホン", "機内に持ち込む液体の確認（国際線は100ml以下）"], "飛行機");
    if (c.car) add("車", ["ETCカード", "車用の充電ケーブル", "ごみ袋"], "車");
    return L;
  }

  // ---- 表示 ----
  function dayLabel(i) {
    const d = new Date(S.cfg.start + "T00:00:00"); d.setDate(d.getDate() + i);
    return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  }
  function renderCover() {
    if (!S) { const h = $("cover-title"); h.textContent = ""; h.append(el("span", "ln", "どこへ"), el("span", "ln", "行きますか？")); const c2 = $("cover-sub"); c2.textContent = ""; c2.append(el("span", "ln", "行き先と日にちを入れるだけで、"), el("span", "ln", "旅の予定表と持ち物リストができます。")); return; }
    const c = S.cfg, n = c.days;
    $("cover-title").textContent = `${c.dest}の旅`;
    $("cover-sub").textContent = `${dayLabel(0)}${n > 1 ? "〜" + dayLabel(n - 1) : ""}　${n === 1 ? "日帰り" : `${n - 1}泊${n}日`}`;
    document.title = `${c.dest}の旅｜旅のしおり`;
  }

  function renderDays() {
    const box = $("days-out"); box.textContent = "";
    S.days.forEach((items, di) => {
      const sec = el("section", "day"), h = el("h3");
      h.append(el("span", "no", S.days.length === 1 ? "日帰り" : `${di + 1}日目`), el("small", null, dayLabel(di)));
      const ul = el("ul", "items");
      items.forEach((it, ii) => {
        const li = el("li", "item");
        const t = el("input", "time"); t.type = "text"; t.value = it.t; t.maxLength = 8; t.setAttribute("aria-label", `${di + 1}日目 ${ii + 1}番目の時刻`);
        t.addEventListener("input", () => { it.t = t.value; save(); });
        const x = el("input"); x.type = "text"; x.value = it.x; x.maxLength = 60; x.setAttribute("aria-label", `${di + 1}日目 ${ii + 1}番目の予定`);
        x.addEventListener("input", () => { it.x = x.value; save(); });
        const ctrl = el("span", "ctrl");
        const up = btn("↑", `「${it.x}」を上へ`, () => move(di, ii, -1, 0)), dn = btn("↓", `「${it.x}」を下へ`, () => move(di, ii, 1, 1));
        up.disabled = ii === 0; dn.disabled = ii === items.length - 1;
        const rm = btn("×", `「${it.x}」を削除`, () => { items.splice(ii, 1); save(); renderDays(); focusDay(di); }); rm.classList.add("rm");
        ctrl.append(up, dn, rm);
        li.append(t, x, ctrl); ul.append(li);
      });
      const add = el("button", "add-item", "＋ 予定を追加"); add.type = "button";
      add.addEventListener("click", () => {
        items.push({ t: "", x: "" }); save(); renderDays();
        const rows = $("days-out").querySelectorAll(".day")[di].querySelectorAll(".item input");
        if (rows.length > 1) rows[rows.length - 2].focus();
      });
      sec.append(h, ul, add); box.append(sec);
    });
  }
  function btn(txt, label, fn) { const b = el("button", null, txt); b.type = "button"; b.setAttribute("aria-label", label); b.addEventListener("click", fn); return b; }
  function move(di, ii, d, which) {
    const a = S.days[di], j = ii + d; if (j < 0 || j >= a.length) return;
    [a[ii], a[j]] = [a[j], a[ii]]; save(); renderDays();
    const b = $("days-out").querySelectorAll(".day")[di].querySelectorAll(".item")[j].querySelectorAll(".ctrl button")[which];
    if (b && !b.disabled) b.focus();
  }
  function focusDay(di) { const d = $("days-out").querySelectorAll(".day")[di]; if (d) d.querySelector(".add-item").focus(); }

  function renderPack() {
    const box = $("pack-out"); box.textContent = "";
    const groups = [];
    S.pack.forEach(p => { if (!groups.includes(p.g)) groups.push(p.g); });
    groups.forEach(g => {
      const div = el("div", "pack-group"), ul = el("ul");
      div.append(el("h4", null, g));
      S.pack.filter(p => p.g === g).forEach(p => {
        const li = el("li"), lab = el("label"), cb = el("input"); cb.type = "checkbox"; cb.checked = !!p.done;
        cb.addEventListener("change", () => { p.done = cb.checked; save(); count(); });
        lab.append(cb, el("span", null, p.n));
        if (p.why) lab.append(el("span", "why", p.why));
        li.append(lab); ul.append(li);
      });
      div.append(ul); box.append(div);
    });
    count();
  }
  function count() {
    const done = S.pack.filter(p => p.done).length;
    const all = S.pack.length > 0 && done === S.pack.length;
    $("pack-count").textContent = all ? `${S.pack.length}点、全て準備できました。いってらっしゃい！` : `準備済み：${done}／${S.pack.length}点。カバンに入れたものに印を付けます。`;
    $("ready").classList.toggle("on", all);
  }

  function renderAll() {
    renderCover();
    $("setup").hidden = !!S; $("plan").hidden = !S; $("cancel").hidden = true;
    if (!S) return;
    renderDays(); renderPack(); $("memo").value = S.memo || "";
  }

  function readForm() {
    return {
      dest: $("dest").value.trim().slice(0, 30), start: $("start").value, days: +$("days").value,
      style: (document.querySelector("input[name=style]:checked") || {}).value || "relax",
      onsen: $("o-onsen").checked, sea: $("o-sea").checked, kids: $("o-kids").checked, plane: $("o-plane").checked, car: $("o-car").checked,
      mine: [...document.querySelectorAll("#opts-mine input:checked")].map(i => i.value)
    };
  }
  function fillForm(c) {
    $("dest").value = c.dest; $("start").value = c.start; $("days").value = String(c.days);
    renderMine(c.style, c.mine || []);
    const r = [...document.querySelectorAll("input[name=style]")].find(i => i.value === c.style); if (r) r.checked = true;
    ["onsen", "sea", "kids", "plane", "car"].forEach(k => { $("o-" + k).checked = !!c[k]; });
  }

  $("setup").addEventListener("submit", ev => {
    ev.preventDefault();
    const c = readForm();
    $("dest-err").textContent = c.dest ? "" : "行き先を入れてください。";
    $("start-err").textContent = c.start ? "" : "出発日を選んでください。";
    if (!c.dest) { $("dest").focus(); return; }
    if (!c.start) { $("start").focus(); return; }
    if (S && !confirm("作り直すと、書き換えた予定と持ち物のチェックは元に戻ります。作り直しますか？")) return;
    S = { cfg: c, days: buildDays(c), pack: buildPack(c), memo: S ? S.memo : "" };
    save(); renderAll();
    $("cover-title").scrollIntoView({ block: "start" });
  });
  $("edit").addEventListener("click", () => {
    fillForm(S.cfg); $("setup").hidden = false; $("plan").hidden = true; $("cancel").hidden = false; $("dest").focus();
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("今のしおりを消して、新しく作りますか？")) return;
    S = null; try { localStorage.removeItem(KEY); } catch (e) {}
    $("setup").reset(); setDefaultDate(); document.title = "旅のしおり"; renderAll(); $("dest").focus();
  });
  $("cancel").addEventListener("click", () => { renderAll(); $("edit").focus(); });
  $("dest").addEventListener("input", () => { $("dest-err").textContent = ""; });
  $("start").addEventListener("input", () => { $("start-err").textContent = ""; });
  $("print").addEventListener("click", () => window.print());
  $("add-pack").addEventListener("submit", ev => {
    ev.preventDefault();
    const v = $("pack-new").value.trim().slice(0, 30); if (!v) return;
    S.pack.push({ g: "追加したもの", n: v, why: "", done: false }); save(); renderPack(); $("pack-new").value = ""; $("pack-new").focus();
  });
  $("memo").addEventListener("input", () => { S.memo = $("memo").value; save(); });

  // ---- 自分で入力（スタイル・あてはまるもの） ----
  const FC = window.FreeChips;
  const myStyles = FC.store("tabi.styles.custom"), myOpts = FC.store("tabi.opts.custom");
  const BUILT_STYLES = { "のんびり": "relax", "観光めぐり": "sight", "食べ歩き": "food", "自然・山歩き": "nature" };
  const BUILT_OPTS = { "温泉に入る": "onsen", "海・プール": "sea", "子どもと一緒": "kids", "飛行機で行く": "plane", "車で行く": "car" };
  function chip(type, name, value, checked) {
    const lab = el("label"), inp = el("input"); inp.type = type; inp.value = value; inp.checked = checked;
    if (type === "radio") inp.name = "style";
    lab.append(inp, el("span", null, name));
    return lab;
  }
  function wrap(node, name, onRemove) { const d = el("div", "fc-item"); d.append(node, FC.remover(name, onRemove)); return d; }
  // style: いま選ばれているスタイル、opts: いまチェックされている自分の項目
  function renderMine(style, opts) {
    const sBox = $("style-mine"); sBox.textContent = "";
    const sNames = myStyles.all();
    if (myLabel(style) && !sNames.includes(myLabel(style))) sNames.push(myLabel(style));
    sNames.forEach(n => {
      const c = chip("radio", n, MY + n, style === MY + n);
      sBox.append(myStyles.has(n) ? wrap(c, n, () => { const cur = readForm(); myStyles.remove(n); renderMine(cur.style === MY + n ? "" : cur.style, cur.mine); if (cur.style === MY + n) $("style").querySelector("input").checked = true; }) : c);
    });
    const oBox = $("opts-mine"); oBox.textContent = "";
    const oNames = myOpts.all();
    opts.forEach(o => { if (!oNames.includes(o)) oNames.push(o); });
    oNames.forEach(n => {
      const c = chip("checkbox", n, n, opts.includes(n));
      oBox.append(myOpts.has(n) ? wrap(c, n, () => { const cur = readForm(); myOpts.remove(n); renderMine(cur.style, cur.mine.filter(x => x !== n)); }) : c);
    });
  }
  function adders() {
    const sa = FC.adder({ label: "＋ 自分で入力", aria: "旅のスタイルを入力", placeholder: "例：美術館めぐり", max: 16, ok: "決定", btnClass: "chip-add",
      empty: "旅のスタイルを入れてから「決定」を押してください。",
      submit: v => {
        const cur = readForm();
        if (BUILT_STYLES[v]) { renderMine(cur.style, cur.mine); $("style").querySelector(`input[value=${BUILT_STYLES[v]}]`).checked = true; return; }
        myStyles.add(v); renderMine(MY + v, cur.mine);
      } });
    $("style").append(sa.btn); $("style-add").append(sa.form);
    const oa = FC.adder({ label: "＋ 自分で入力", aria: "当てはまるものを入力", placeholder: "例：釣りをする", max: 16, ok: "追加", btnClass: "chip-add",
      empty: "当てはまるものを入れてから「追加」を押してください。",
      submit: v => {
        const cur = readForm();
        if (BUILT_OPTS[v]) { $("o-" + BUILT_OPTS[v]).checked = true; return; }
        myOpts.add(v); renderMine(cur.style, cur.mine.concat(v));
      } });
    document.querySelector(".opts").append(oa.btn); $("opts-add").append(oa.form);
  }
  adders(); renderMine("", []);

  function setDefaultDate() { const d = new Date(); d.setDate(d.getDate() + 7); $("start").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  setDefaultDate();
  load(); renderAll();
})();
