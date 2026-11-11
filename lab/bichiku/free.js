// 選択肢に「自分で入力」を足す小さな部品。入れた言葉はこの端末に覚えて、次から候補に出します。
(function () {
  "use strict";
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const loadAll = key => { try { const o = JSON.parse(localStorage.getItem(key) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const same = s => String(s).normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  const tidy = s => String(s).replace(/\s+/g, " ").trim();
  let seq = 0;

  // o: key（保存先）, set（選択肢の名前）, label（「行事」など）, max, placeholder, builtins()（既存の選択肢 {value, label}）,
  //    onPick(value, isNew)（選んだときの処理）, onChange()（候補が増減したとき）, onCancel()（入力をやめたとき）,
  //    validate(v)（だめなら理由を返す）, transform(v)（覚える形にそろえる）,
  //    list（自分で入れた候補を×付きで並べる。セレクトと組み合わせるとき。"open" なら入力中だけ）, noOpenButton（開くボタンを出さない）
  function FreeChoice(o) {
    const max = o.max || 20;
    const read = () => { const a = loadAll(o.key)[o.set]; return Array.isArray(a) ? [...new Set(a.filter(v => typeof v === "string" && tidy(v)).map(v => tidy(v).slice(0, max)))].slice(0, 60) : []; };
    const write = list => { try { const all = loadAll(o.key); all[o.set] = list; localStorage.setItem(o.key, JSON.stringify(all)); } catch (e) {} };
    const builtins = () => o.builtins ? o.builtins() : [];

    const root = mk("div", "fc");
    const chips = mk("div", "fc-list"); chips.hidden = true;
    const open = mk("button", "fc-open", o.openText || "＋ 自分で入力"); open.type = "button";
    open.setAttribute("aria-expanded", "false");
    const row = mk("div", "fc-row"); row.hidden = true;
    const input = mk("input", "fc-in"); input.type = "text"; input.maxLength = max; input.autocomplete = "off";
    input.setAttribute("enterkeyhint", "done");
    input.setAttribute("aria-label", `${o.label}を入力`);
    if (o.placeholder) input.placeholder = o.placeholder;
    const addB = mk("button", "fc-add", "追加"); addB.type = "button";
    const noB = mk("button", "fc-no", "やめる"); noB.type = "button";
    row.append(input, addB, noB);
    const err = mk("p", "fc-err"); err.setAttribute("role", "alert"); err.id = "fc-err-" + (++seq);
    const note = mk("p", "fc-note"); note.setAttribute("role", "status"); note.hidden = true;
    const noteTxt = document.createTextNode("");
    const undoB = mk("button", "fc-undo", "元に戻す"); undoB.type = "button";
    note.append(noteTxt, undoB);
    if (o.noOpenButton) open.hidden = true;
    root.append(chips, open, row, err, note);

    const changed = () => { renderList(); if (o.onChange) o.onChange(); };
    function showRow(on) {
      row.hidden = !on; open.hidden = on || !!o.noOpenButton; open.setAttribute("aria-expanded", String(on));
      err.textContent = ""; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby");
      if (o.list === "open") renderList();
      if (on) { input.value = ""; input.focus(); }
    }
    function fail(msg) { err.textContent = msg; input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", err.id); input.focus(); }
    function add() {
      let v = tidy(input.value);
      if (!v) return fail(`${o.label}を入れてください。`);
      if (v.length > max) return fail(`${max}文字までで入れてください。`);
      if (o.validate) { const m = o.validate(v); if (m) return fail(m); }
      if (o.transform) v = o.transform(v);
      const list = read();
      const b = builtins().find(x => same(x.label) === same(v));
      const mine = list.find(x => same(x) === same(v));
      const isNew = !b && !mine;
      if (isNew) { list.push(v); write(list); }
      showRow(false);
      if (isNew) changed();
      o.onPick(b ? b.value : mine || v, isNew);
    }
    const cancel = () => { showRow(false); if (o.onCancel) o.onCancel(); else open.focus(); };
    open.addEventListener("click", () => showRow(true));
    addB.addEventListener("click", add);
    noB.addEventListener("click", cancel);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); if (e.isComposing || e.keyCode === 229) return; add(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
    });
    input.addEventListener("input", () => { if (err.textContent) { err.textContent = ""; input.removeAttribute("aria-invalid"); } });

    let undoTimer = 0;
    function remove(v) {
      const list = read(); const i = list.indexOf(v); if (i < 0) return;
      list.splice(i, 1); write(list); changed();
      noteTxt.data = `「${v}」を候補から外しました。記録はそのまま残ります。`;
      note.hidden = false;
      undoB.onclick = () => { const l = read(); if (!l.includes(v)) { l.splice(Math.min(i, l.length), 0, v); write(l); changed(); } note.hidden = true; };
      clearTimeout(undoTimer); undoTimer = setTimeout(() => { note.hidden = true; }, 8000);
      undoB.focus();
    }
    function removeButton(v) {
      const b = mk("button", "fc-del", "×"); b.type = "button";
      b.setAttribute("aria-label", `「${v}」を候補から外す`);
      b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); remove(v); });
      return b;
    }
    function wrap(chip, v) { const s = mk("div", "fc-chip"); s.append(chip, removeButton(v)); return s; }
    function renderList() {
      if (!o.list) return;
      const list = read();
      chips.replaceChildren(...list.map(v => { const s = mk("div", "fc-tag"); s.append(document.createTextNode(v), removeButton(v)); return s; }));
      chips.hidden = !list.length || (o.list === "open" && row.hidden);
      if (list.length) chips.prepend(mk("small", "fc-list-h", o.listLabel || "自分で入れた候補"));
    }
    renderList();
    const api = {
      root, values: read, has: v => read().some(x => same(x) === same(v)),
      removeButton, wrap, open: () => showRow(true), close: () => showRow(false), refresh: renderList,
      // セレクトに、決まった選択肢・自分で入れた候補・「＋ 自分で入力…」を並べる。prefix は自分の候補の値の頭につける印。
      fillSelect(sel, value, prefix, extra, fallback) {
        const own = read(); if (extra && !own.includes(extra)) own.push(extra);
        const opts = builtins().map(b => { const x = mk("option", null, b.label); x.value = b.value; return x; });
        own.forEach(v => { const x = mk("option", null, v); x.value = prefix + v; opts.push(x); });
        const f = mk("option", null, "＋ 自分で入力…"); f.value = "__free"; opts.push(f);
        sel.replaceChildren(...opts); sel.value = value; if (sel.value !== value) { if (fallback != null) sel.value = fallback; if (sel.selectedIndex < 0) sel.selectedIndex = 0; }
      }
    };
    return api;
  }
  window.FreeChoice = FreeChoice;
})();
