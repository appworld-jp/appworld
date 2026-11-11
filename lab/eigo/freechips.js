// 選択肢に「自分で入力」を足すための小さな部品。データはこの端末の localStorage にだけ保存する。
(function () {
  "use strict";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tidy = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

  // 自分で入れた値の一覧。opts.valid で読み込み時に形を確かめ、opts.same で同じものかを判断する。
  function store(key, opts) {
    opts = opts || {};
    const limit = opts.limit || 30;
    const valid = opts.valid || (v => typeof v === "string" && tidy(v) !== "");
    const same = opts.same || ((a, b) => JSON.stringify(a) === JSON.stringify(b));
    let list = [];
    try { const v = JSON.parse(localStorage.getItem(key) || "[]"); if (Array.isArray(v)) list = v.filter(valid); } catch (e) { list = []; }
    const write = () => { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* 保存できなくても、この画面では使える */ } };
    return {
      all: () => list.slice(),
      has: v => list.some(x => same(x, v)),
      add(v) { if (list.some(x => same(x, v))) return false; list.push(v); while (list.length > limit) list.shift(); write(); return true; },
      remove(v) { const i = list.findIndex(x => same(x, v)); if (i >= 0) { list.splice(i, 1); write(); } return i; },
      insert(v, i) { if (list.some(x => same(x, v))) return; list.splice(Math.max(0, Math.min(i, list.length)), 0, v); write(); }
    };
  }

  // 「＋ 自分で入力」のボタンと、その場で開く入力欄。
  // opts: label（ボタンの文字）, placeholder, max, ok（決定ボタンの文字）, aria（入力欄の名前）,
  //       empty（空のときの文）, submit(value) → エラー文 or なし, btnClass, formClass, inputmode
  function adder(opts) {
    const btn = el("button", "fc-add" + (opts.btnClass ? " " + opts.btnClass : ""), opts.label || "＋ 自分で入力");
    btn.type = "button"; btn.setAttribute("aria-expanded", "false");
    const form = el("div", "fc-form" + (opts.formClass ? " " + opts.formClass : "")); form.hidden = true;
    form.setAttribute("role", "group"); form.setAttribute("aria-label", opts.aria || "自分で入力");
    const row = el("div", "fc-row");
    const input = el("input", "fc-in"); input.type = "text"; input.maxLength = opts.max || 20; input.autocomplete = "off";
    input.enterKeyHint = "done"; input.setAttribute("aria-label", opts.aria || "自分で入力");
    if (opts.inputmode) input.inputMode = opts.inputmode;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    const ok = el("button", "fc-ok", opts.ok || "追加"); ok.type = "button";
    const no = el("button", "fc-no", "やめる"); no.type = "button";
    const err = el("p", "fc-err"); err.setAttribute("role", "alert");
    const errId = "fc" + Math.random().toString(36).slice(2, 8); err.id = errId; input.setAttribute("aria-describedby", errId);
    row.append(input, ok, no); form.append(row, err);
    let composing = false;
    const open = () => { form.hidden = false; btn.setAttribute("aria-expanded", "true"); err.textContent = ""; input.removeAttribute("aria-invalid"); input.focus(); };
    const close = (back) => { form.hidden = true; btn.setAttribute("aria-expanded", "false"); input.value = ""; err.textContent = ""; input.removeAttribute("aria-invalid"); if (back) btn.focus(); };
    const fail = msg => { err.textContent = msg; input.setAttribute("aria-invalid", "true"); input.focus(); };
    const go = () => {
      const v = tidy(input.value).slice(0, opts.max || 20);
      if (!v) { fail(opts.empty || "言葉を入れてから「" + (opts.ok || "追加") + "」を押してください。"); return; }
      const bad = opts.submit(v);
      if (bad) { fail(bad); return; }
      close(false);
    };
    btn.addEventListener("click", () => { if (form.hidden) open(); else close(true); });
    ok.addEventListener("click", go);
    no.addEventListener("click", () => close(true));
    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => { composing = false; });
    input.addEventListener("input", () => { if (err.textContent) { err.textContent = ""; input.removeAttribute("aria-invalid"); } });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { if (composing || e.isComposing || e.keyCode === 229) return; e.preventDefault(); go(); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
    });
    return { btn, form, input, open, close };
  }

  // 自分で入れた候補を外す「×」。記録そのものは消さない。
  function remover(name, onRemove, cls) {
    const b = el("button", "fc-x" + (cls ? " " + cls : ""), "×"); b.type = "button";
    b.setAttribute("aria-label", "「" + name + "」を候補から外す");
    b.addEventListener("click", e => {
      e.stopPropagation();
      if (!confirm("「" + name + "」を候補から外しますか？\nこれまでの記録は、そのまま残ります。")) return;
      onRemove();
    });
    return b;
  }

  window.FreeChips = { store, adder, remover, tidy };
})();
