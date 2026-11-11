// 選択肢のとなりに「＋ 自分で入力」を足す小さな部品。入れた言葉はこの端末に覚えて、次から候補に並べる。
(function () {
  "use strict";
  const tidy = s => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const read = key => { try { const o = JSON.parse(localStorage.getItem(key) || "null"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const write = (key, o) => { try { localStorage.setItem(key, JSON.stringify(o)); return true; } catch (e) { return false; } };
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // opt: key, name, host, chip(value) -> Element, onPick(value), builtins [{value,label}],
  //      extra() -> [value...]（候補にないが、いま選ばれている値）, max, addLabel, placeholder, inputLabel,
  //      parse(text, second) -> {value} | {error}, second {label, placeholder, max}, label(value), limit
  window.OwnChoices = function (opt) {
    const max = opt.max || 20, limit = opt.limit || 30;
    const host = opt.host;
    const label = opt.label || (v => v);
    const list = () => {
      const a = read(opt.key)[opt.name];
      return Array.isArray(a) ? a.filter(v => typeof v === "string" && tidy(v)).slice(0, limit) : [];
    };
    const setList = a => { const o = read(opt.key); o[opt.name] = a; return write(opt.key, o); };

    let nodes = [], open = false, msgTimer = 0;
    const addBtn = mk("button", "own-add " + (opt.addClass || ""), opt.addLabel || "＋ 自分で入力");
    addBtn.type = "button";
    addBtn.setAttribute("aria-expanded", "false");
    const form = mk("span", "own-form"); form.hidden = true;
    const inp = mk("input", "own-in"); inp.type = "text"; inp.maxLength = max; inp.autocomplete = "off";
    inp.placeholder = opt.placeholder || ""; inp.setAttribute("aria-label", opt.inputLabel || "自分で入力");
    if (opt.inputMode) inp.inputMode = opt.inputMode;
    let inp2 = null;
    if (opt.second) {
      inp2 = mk("input", "own-in own-in2"); inp2.type = "text"; inp2.maxLength = opt.second.max || 30; inp2.autocomplete = "off";
      inp2.placeholder = opt.second.placeholder || ""; inp2.setAttribute("aria-label", opt.second.label);
    }
    const ok = mk("button", "own-ok", opt.okLabel || "追加"); ok.type = "button";
    const cancel = mk("button", "own-cancel", "×"); cancel.type = "button"; cancel.setAttribute("aria-label", "やめる");
    form.append(inp); if (inp2) form.append(inp2); form.append(ok, cancel);
    const err = mk("span", "own-err"); err.setAttribute("role", "alert");
    const msg = mk("span", "own-msg"); msg.setAttribute("role", "status");
    const id = "own-" + opt.name.replace(/[^\w-]/g, "") + "-" + Math.random().toString(36).slice(2, 7);
    err.id = id; inp.setAttribute("aria-describedby", id);

    function showForm(on) {
      open = on; form.hidden = !on; addBtn.hidden = on; addBtn.setAttribute("aria-expanded", String(on));
      err.textContent = ""; inp.removeAttribute("aria-invalid");
      if (on) { inp.value = ""; if (inp2) inp2.value = ""; inp.focus(); }
    }
    addBtn.addEventListener("click", () => showForm(true));
    cancel.addEventListener("click", () => { showForm(false); addBtn.focus(); });
    const onKey = e => {
      if (e.key === "Enter") { e.preventDefault(); if (e.isComposing || e.keyCode === 229) return; commit(); }
      else if (e.key === "Escape") { e.preventDefault(); showForm(false); addBtn.focus(); }
    };
    inp.addEventListener("keydown", onKey); if (inp2) inp2.addEventListener("keydown", onKey);
    inp.addEventListener("input", () => { if (err.textContent) { err.textContent = ""; inp.removeAttribute("aria-invalid"); } });
    ok.addEventListener("click", commit);

    function fail(t, target) { err.textContent = t; (target || inp).setAttribute("aria-invalid", "true"); (target || inp).focus(); }
    function commit() {
      const text = tidy(inp.value), second = inp2 ? tidy(inp2.value) : "";
      if (!text) return fail(opt.emptyMsg || "言葉を入れてから「追加」を押してください。");
      let value = text.slice(0, max);
      if (opt.parse) {
        const r = opt.parse(value, second);
        if (r.error) return fail(r.error, r.second ? inp2 : inp);
        value = r.value;
      }
      const hit = (opt.builtins || []).find(b => b.value === value || b.label === value);
      showForm(false);
      if (hit) { opt.onPick(hit.value); render(); flash("「" + hit.label + "」は、はじめからある候補です。"); focusValue(hit.value); return; }
      const a = list();
      if (!a.includes(value)) {
        a.push(value);
        if (a.length > limit) a.shift();
        if (!setList(a)) flash("候補に覚えられませんでした。今回だけ使います。");
      }
      render(); opt.onPick(value); focusValue(value);
    }
    function focusValue(v) {
      const n = nodes.find(x => x.ownValue === v);
      const f = n && n.querySelector("button, input");
      if (f) f.focus(); else addBtn.focus();
    }
    function flash(t, undo) {
      msg.replaceChildren(document.createTextNode(t));
      if (undo) {
        const u = mk("button", "own-undo", "元に戻す"); u.type = "button";
        u.addEventListener("click", () => { undo(); msg.replaceChildren(); clearTimeout(msgTimer); });
        msg.append(u);
      }
      clearTimeout(msgTimer); msgTimer = setTimeout(() => msg.replaceChildren(), 6000);
    }
    function remove(v) {
      const a = list(), i = a.indexOf(v); if (i < 0) return;
      a.splice(i, 1); setList(a); render(); addBtn.focus();
      flash("「" + label(v) + "」を候補から外しました。記録はそのまま残ります。", () => {
        const b = list(); if (!b.includes(v)) { b.splice(Math.min(i, b.length), 0, v); setList(b); } render();
      });
      if (opt.onRemove) opt.onRemove(v);
    }
    function render() {
      nodes.forEach(n => n.remove()); nodes = [];
      const saved = list();
      const isBuiltin = v => (opt.builtins || []).some(b => b.value === v);
      const extra = (opt.extra ? opt.extra() : []).filter(v => v && !isBuiltin(v) && !saved.includes(v));
      const frag = document.createDocumentFragment();
      saved.concat(extra).forEach(v => {
        const w = mk("span", "own-chip"); w.ownValue = v;
        w.append(opt.chip(v));
        if (saved.includes(v)) {
          const x = mk("button", "own-x", "×"); x.type = "button";
          x.setAttribute("aria-label", "「" + label(v) + "」を候補から外す");
          x.addEventListener("click", () => remove(v));
          w.append(x);
        } else w.classList.add("own-once");
        nodes.push(w); frag.append(w);
      });
      if (addBtn.parentNode !== host) {
        const anchor = opt.before && opt.before.parentNode === host ? opt.before : null;
        [addBtn, form, err, msg].forEach(n => host.insertBefore(n, anchor));
      }
      host.insertBefore(frag, addBtn);
    }
    render();
    return { render, list, isOpen: () => open };
  };
})();
