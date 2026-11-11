// レシピの分量換算 — 材料を1行ずつ読み、倍率をかけ、必要なら g ⇄ 大さじ・小さじ に直す。
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const KEY = "lab-bunryo-v1";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const EGG_G = 50; // 卵（M）1個の中身の目安

  // ---------- 材料の読み取り ----------
  const DENS = [];
  (window.BUNRYO_DENSITY || []).forEach(([names, tsp, tbsp, cup, label]) => names.forEach(n => DENS.push({ n, tsp, tbsp, cup, label })));
  DENS.sort((a, b) => b.n.length - a.n.length);
  function densityFor(name) {
    const n = name.normalize("NFKC");
    const hit = DENS.find(d => n.includes(d.n));
    return hit && hit.tbsp ? hit : null;
  }
  const isEgg = name => /(卵|たまご|玉子|タマゴ)/.test(name) && !/(卵黄|卵白|黄身|白身|うずら)/.test(name);

  const N = "(?:\\d+(?:\\.\\d+)?と\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|\\.\\d+)";
  const RANGE = `(${N})(?:\\s*[〜~\\-–]\\s*(${N}))?`;
  const UNIT = "kg|g|グラム|キロ|ml|cc|l|リットル|カップ|合|個|本|枚|切れ|切|片|かけ|玉|袋|缶|束|株|房|粒|尾|匹|杯|丁|パック|cm|センチ|つ|箱|尾";
  const KEEP = /(?:各\s*)?(?:少々|適量|適宜|少量|ひとつまみ|ひとつかみ|お好みで|好みで|お好みの量|適当|たっぷり|ふたつまみ)$/;
  const RE_SPOON = new RegExp(`(各\\s*|約\\s*)?(大さじ|小さじ|大匙|小匙|カップ)\\s*(?:${RANGE}|(半分|半))\\s*杯?\\s*(強|弱|程度|くらい|ほど)?$`);
  const RE_AFTER = new RegExp(`(各\\s*|約\\s*)?${RANGE}\\s*(${UNIT})(半)?\\s*(強|弱|程度|くらい|ほど|分)?$`, "i");
  const RE_HALF = new RegExp(`(各\\s*)?(半分|半)\\s*(${UNIT})?$`);
  const RE_BARE = new RegExp(`(各\\s*|約\\s*)?${RANGE}$`);
  const UNIT_ALIAS = { "グラム": "g", "キロ": "kg", "cc": "ml", "リットル": "L", "l": "L", "大匙": "大さじ", "小匙": "小さじ", "切": "切れ", "センチ": "cm" };

  function num(s) {
    if (s == null) return null;
    let m = s.match(/^(\d+(?:\.\d+)?)と(\d+)\/(\d+)$/);
    if (m) return +m[1] + (+m[2] / +m[3] || 0);
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return +m[2] ? +m[1] / +m[2] : NaN;
    return parseFloat(s);
  }
  function normLine(s) {
    return s.normalize("NFKC").replace(/\u2044/g, "/").replace(/[～〜~]/g, "〜").replace(/\s+/g, " ").trim()
      .replace(/\(/g, "（").replace(/\)/g, "）").replace(/\.{3,}/g, "…").replace(/:/g, "：");
  }
  const SEP_RE = /[\s.…・:：]+$/;
  function splitName(head) {
    const m = head.match(SEP_RE);
    return m ? { name: head.slice(0, m.index), sep: m[0] } : { name: head, sep: "" };
  }

  // 1行 → { type, name, sep, amt, paren }
  function parseLine(raw) {
    const line = normLine(raw);
    if (!line) return { type: "blank" };
    let body = line, paren = "";
    const pm = body.match(/^(.*\S)\s*([(（][^()（）]*[)）])$/);
    if (pm && /\d|少々|適量/.test(pm[1])) { body = pm[1]; paren = pm[2]; }
    const keep = body.match(KEEP);
    if (keep) { const s = splitName(body.slice(0, keep.index)); if (s.name) return { type: "keep", name: s.name, sep: s.sep || " ", word: keep[0], paren }; }
    let m, amt = null, idx = -1;
    if ((m = body.match(RE_SPOON))) {
      idx = m.index;
      const half = m[5];
      amt = { pre: (m[1] || "").trim(), unit: UNIT_ALIAS[m[2]] || m[2], a: half ? 0.5 : num(m[3]), b: half ? null : num(m[4]), post: m[6] || "" };
    } else if ((m = body.match(RE_AFTER))) {
      idx = m.index;
      const u = m[4];
      const unit = UNIT_ALIAS[u] || UNIT_ALIAS[u.toLowerCase()] || (u.toLowerCase() === "ml" ? "ml" : u.toLowerCase() === "g" ? "g" : u.toLowerCase() === "kg" ? "kg" : u);
      const a = num(m[2]) + (m[5] ? 0.5 : 0), b = m[3] ? num(m[3]) + (m[5] ? 0.5 : 0) : null;
      amt = { pre: (m[1] || "").trim(), unit, a, b, post: m[6] === "分" ? "" : (m[6] || "") };
    } else if ((m = body.match(RE_HALF))) {
      idx = m.index;
      amt = { pre: (m[1] || "").trim(), unit: m[3] ? (UNIT_ALIAS[m[3]] || m[3]) : "", a: 0.5, b: null, post: "", halfWord: !m[3] };
    } else if ((m = body.match(RE_BARE))) {
      idx = m.index;
      const before = body.slice(0, idx);
      // 「18cm丸型」「2人分」のような数字は材料の量ではない
      if (!/[\s.…・:：]$/.test(before) && before) amt = null;
      else amt = { pre: (m[1] || "").trim(), unit: "", a: num(m[2]), b: m[3] ? num(m[3]) : null, post: "" };
    }
    if (amt && (isNaN(amt.a) || amt.a <= 0 || (amt.b != null && isNaN(amt.b)))) amt = null;
    if (!amt) return { type: "head", text: line };
    const s = splitName(body.slice(0, idx));
    let parenAmt = null;
    if (paren) {
      const inner = paren.slice(1, -1).trim();
      const pr = parseLine("x " + inner);
      if (pr.type === "item" && pr.name === "x") parenAmt = { amt: pr.amt, open: paren[0], close: paren[paren.length - 1] };
    }
    return { type: "item", name: s.name, sep: s.sep || " ", amt, paren, parenAmt };
  }

  // ---------- 数の書き方 ----------
  const FR = { 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" };
  function frac(v, step) {
    const r = Math.round(v / step) * step;
    const i = Math.floor(r + 1e-9), f = Math.round((r - i) * 100) / 100;
    if (!f) return String(i);
    const fs = FR[f] || String(f);
    return i ? `${i}と${fs}` : fs;
  }
  const trim0 = s => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  function grams(v) {
    if (v < 1) return trim0((Math.round(v * 10) / 10).toFixed(1));
    if (v < 10) return trim0((Math.round(v * 2) / 2).toFixed(1));
    if (v < 100) return String(Math.round(v));
    return String(Math.round(v / 5) * 5);
  }
  function weight(v, unit) {
    let g = unit === "kg" ? v * 1000 : v;
    if (g >= 1000 && unit === "kg") return `${trim0((Math.round(g / 10) / 100).toFixed(2))}kg`;
    return `${grams(g)}${unit === "kg" ? "g" : unit}`;
  }
  function volumeMl(v, unit) {
    let ml = unit === "L" ? v * 1000 : v;
    if (unit === "L" && ml >= 1000) return `${trim0((Math.round(ml / 10) / 100).toFixed(2))}L`;
    return `${grams(ml)}ml`;
  }
  // 量（ml）を、大さじ・小さじのいちばん自然な書き方にする
  function spoon(ml) {
    const tsp = ml / 5;
    if (tsp < 0.19) return "少々";
    if (tsp < 1) { const r = Math.max(0.25, Math.round(tsp * 4) / 4); return r >= 1 ? "小さじ1" : `小さじ${frac(r, 0.25)}`; }
    // 量が多いほど、細かい端数は丸める
    const step = tsp < 6 ? 0.5 : tsp < 12 ? 1 : 1.5;
    const t = Math.round(tsp / step) * step;
    if (t < 3) return `小さじ${frac(t, 0.5)}`;
    const big = Math.floor(t / 3 + 1e-9), rem = Math.round((t - big * 3) * 2) / 2;
    if (!rem) return `大さじ${big}`;
    if (rem === 1.5) return `大さじ${big}と1/2`;
    return `大さじ${big}と小さじ${frac(rem, 0.5)}`;
  }
  function cups(c) {
    if (c * 200 < 50) return spoon(c * 200);
    return `${frac(c, 0.25)}カップ`;
  }
  function count(v, unit, halfWord) {
    const step = v < 1 ? 0.25 : 0.5;
    const r = Math.max(0.25, Math.round(v / step) * step);
    if (!unit && halfWord) return r === 0.5 ? "半分" : r < 1 ? frac(r, step) : `${frac(r, step)}つ分`;
    return `${frac(r, step)}${unit}`;
  }
  const roundedCount = v => { const step = v < 1 ? 0.25 : 0.5; return Math.max(0.25, Math.round(v / step) * step); };
  function fmtOne(v, unit, halfWord) {
    switch (unit) {
      case "g": case "kg": return weight(v, unit);
      case "ml": case "L": return volumeMl(v, unit);
      case "大さじ": return spoon(v * 15);
      case "小さじ": return spoon(v * 5);
      case "カップ": return cups(v);
      case "cm": return `${trim0((Math.round(v * 2) / 2).toFixed(1))}cm`;
      default: return count(v, unit, halfWord);
    }
  }
  function fmtAmt(a) {
    let s;
    if (a.b != null) {
      const x = fmtOne(a.a, a.unit, false), y = fmtOne(a.b, a.unit, false);
      const lead = (x.match(/^(大さじ|小さじ)/) || [""])[0];
      const tail = (x.match(/[^\d/]+$/) || [""])[0];
      if (lead && y.startsWith(lead) && !x.includes("と小さじ") && !y.includes("と小さじ")) s = `${x}〜${y.slice(lead.length)}`;
      else if (!lead && tail && y.endsWith(tail) && /\d$/.test(x.slice(0, -tail.length))) s = `${x.slice(0, -tail.length)}〜${y}`;
      else s = `${x}〜${y}`;
    } else s = fmtOne(a.a, a.unit, a.halfWord);
    return `${a.pre}${s}${a.post}`;
  }
  const show = v => Number.isInteger(Math.round(v * 4e6) / 1e6) ? frac(v, 0.25) : trim0(v.toFixed(2));
  const origText = a => {
    const n = a.b != null ? `${show(a.a)}〜${show(a.b)}` : (a.halfWord ? "半分" : show(a.a));
    return /^(大さじ|小さじ)$/.test(a.unit) ? `${a.pre}${a.unit}${n}${a.post}` : `${a.pre}${n}${a.unit}${a.post}`;
  };

  // ---------- 換算 ----------
  const SPOONISH = { "大さじ": 1, "小さじ": 1, "カップ": 1 };
  function toGrams(v, unit, d) {
    if (unit === "大さじ") return v * d.tbsp;
    if (unit === "小さじ") return v * d.tsp;
    if (unit === "カップ") return d.cup ? v * d.cup : v * 200 * d.tbsp / 15;
    const ml = unit === "L" ? v * 1000 : v;
    return ml * d.tbsp / 15;
  }
  function gramsToSpoon(g, d) {
    const ml = g / (d.tbsp / 15);
    if (ml >= 50 && d.cup) return cups(g / d.cup);
    return spoon(ml);
  }
  function convertItem(it, factor, unitMode) {
    const a = it.amt;
    const sa = { ...a, a: a.a * factor, b: a.b != null ? a.b * factor : null };
    const out = { name: it.name, sep: it.sep, orig: origText(a), note: "", changed: factor !== 1 };
    const d = densityFor(it.name);
    if (unitMode === "g" && SPOONISH[a.unit]) {
      if (d) {
        const g1 = toGrams(sa.a, a.unit, d), g2 = sa.b != null ? toGrams(sa.b, a.unit, d) : null;
        out.text = `${a.pre}${grams(g1)}${g2 != null ? `〜${grams(g2)}` : ""}g${a.post}`;
        out.changed = true;
        out.conv = true;
      } else out.note = "重さの目安がない材料なので、そのままにしています。";
    } else if (unitMode === "spoon" && (a.unit === "g" || a.unit === "kg")) {
      if (d) {
        const k = a.unit === "kg" ? 1000 : 1;
        const s1 = gramsToSpoon(sa.a * k, d), s2 = sa.b != null ? gramsToSpoon(sa.b * k, d) : null;
        out.text = `${a.pre}${s1}${s2 != null ? `〜${s2}` : ""}${a.post}`;
        out.changed = true; out.conv = true;
      } else out.note = "スプーンで量る目安がない材料なので、gのままにしています。";
    }
    if (!out.text) out.text = fmtAmt(sa);
    if (out.text === out.orig) out.changed = false;
    if (isEgg(it.name) && a.unit === "個" && factor !== 1) {
      const exact = sa.a, r = roundedCount(exact);
      if (Math.abs(r - exact) > 0.01 || r % 1) out.note = `卵は溶いて量ると正確です。1個約${EGG_G}gとして、約${Math.round(exact * EGG_G)}g${sa.b != null ? `〜${Math.round(sa.b * EGG_G)}g` : ""}。`;
    }
    if (it.parenAmt) {
      const p = it.parenAmt.amt;
      out.paren = `${it.parenAmt.open}${fmtAmt({ ...p, a: p.a * factor, b: p.b != null ? p.b * factor : null })}${it.parenAmt.close}`;
    } else out.paren = it.paren || "";
    return out;
  }

  // ---------- 状態 ----------
  const SHAPES = { round: "丸型", square: "角型", pound: "パウンド型" };
  const PAN_DEFAULT = { round: { shape: "round", a: 18, b: 18, h: 6 }, square: { shape: "square", a: 18, b: 18, h: 5 }, pound: { shape: "pound", a: 18, b: 8, h: 6 } };
  const fresh = () => ({ title: "", text: "", mode: "serv", serv: { from: 4, to: 2 }, pan: { from: { ...PAN_DEFAULT.round }, to: { ...PAN_DEFAULT.round, a: 15, b: 15 } }, mult: "1.5", unit: "keep" });
  const pos = (v, d) => typeof v === "number" && isFinite(v) && v > 0 && v < 1000 ? v : d;
  function cleanCur(c) {
    const f = fresh();
    if (!c || typeof c !== "object") return f;
    const pan = p => {
      const sh = p && SHAPES[p.shape] ? p.shape : "round", d = PAN_DEFAULT[sh];
      return { shape: sh, a: pos(p && p.a, d.a), b: pos(p && p.b, d.b), h: pos(p && p.h, d.h) };
    };
    return {
      title: typeof c.title === "string" ? c.title.slice(0, 40) : "",
      text: typeof c.text === "string" ? c.text.slice(0, 5000) : "",
      mode: ["serv", "pan", "mult"].includes(c.mode) ? c.mode : "serv",
      serv: { from: pos(c.serv && c.serv.from, 4), to: pos(c.serv && c.serv.to, 2) },
      pan: { from: pan(c.pan && c.pan.from), to: pan(c.pan && c.pan.to) },
      mult: typeof c.mult === "string" ? c.mult.slice(0, 10) : "1.5",
      unit: ["keep", "g", "spoon"].includes(c.unit) ? c.unit : "keep"
    };
  }
  function clean(raw) {
    if (!raw || typeof raw !== "object") return null;
    const saved = Array.isArray(raw.saved) ? raw.saved.slice(0, 200).map(s => {
      const c = cleanCur(s);
      return c.text ? { ...c, id: typeof s.id === "string" ? s.id.slice(0, 20) : uid(), title: c.title || "名前のないレシピ" } : null;
    }).filter(Boolean) : [];
    return { v: 1, cur: cleanCur(raw.cur), saved };
  }
  let st = null;
  try { st = clean(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { st = null; }
  if (!st) st = { v: 1, cur: fresh(), saved: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const snapshot = () => JSON.stringify(st);
  const restore = s => { st = JSON.parse(s); save(); };

  // ---------- 倍率 ----------
  const panArea = p => p.shape === "round" ? Math.PI * (p.a / 2) ** 2 : p.a * p.b;
  function factor() {
    const c = st.cur;
    if (c.mode === "serv") return { f: c.serv.to / c.serv.from, why: `${trim0(String(c.serv.from))}人分 → ${trim0(String(c.serv.to))}人分` };
    if (c.mode === "pan") {
      const { from, to } = c.pan;
      const vol = from.shape === "pound" || to.shape === "pound";
      const f = vol ? (panArea(to) * to.h) / (panArea(from) * from.h) : panArea(to) / panArea(from);
      return { f, why: vol ? "型の容積の比" : "型の底の面積の比" };
    }
    const v = num(c.mult.normalize("NFKC").trim());
    return { f: v > 0 && v < 100 ? v : NaN, why: "倍率" };
  }
  const fmtF = f => f >= 10 ? f.toFixed(1) : f >= 1 ? trim0(f.toFixed(2)) : trim0(f.toFixed(2));

  // ---------- 画面 ----------
  const lastResult = { lines: [] };
  function render() {
    const c = st.cur;
    document.querySelectorAll("#modeSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === c.mode)));
    document.querySelectorAll("#unitSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.u === c.unit)));
    $("mServ").hidden = c.mode !== "serv"; $("mPan").hidden = c.mode !== "pan"; $("mMult").hidden = c.mode !== "mult";
    renderPans();
    const { f, why } = factor();
    const box = $("out"); box.replaceChildren();
    const fb = $("factor");
    if (!(f > 0 && f < 100)) {
      fb.textContent = "倍率を数字で入れてください（例：1.5、2/3）。"; fb.className = "factor bad";
      lastResult.lines = []; $("copyBtn").disabled = true; return;
    }
    fb.className = "factor";
    fb.replaceChildren(el("span", "f-x", `×${fmtF(f)}`), el("span", "f-why", why));
    const lines = c.text.split(/\r?\n/).slice(0, 200).map(parseLine);
    const items = lines.filter(l => l.type === "item" || l.type === "keep");
    $("outEmpty").hidden = items.length > 0;
    $("copyBtn").disabled = items.length === 0;
    $("outWrap").classList.toggle("has", items.length > 0);
    lastResult.lines = [];
    lines.forEach(l => {
      if (l.type === "blank") { lastResult.lines.push(""); return; }
      if (l.type === "head") {
        let t = l.text;
        if (c.mode === "serv") t = t.replace(/(\d+(?:\.\d+)?)\s*(人分|人前)/, `${trim0(String(c.serv.to))}$2`);
        if (c.mode === "pan") {
          const to = c.pan.to, lab = to.shape === "round" ? `${trim0(String(to.a))}cm丸型` : `${trim0(String(to.a))}×${trim0(String(to.b))}cm${SHAPES[to.shape]}`;
          t = t.replace(/\d+(?:\.\d+)?(?:[×x]\d+(?:\.\d+)?)*\s*cm\s*(丸型|角型|パウンド型)/, lab);
        }
        box.append(el("li", "o-head", t)); lastResult.lines.push(t); return;
      }
      const li = el("li", "o-item");
      const nm = el("span", "o-name", l.name);
      if (l.type === "keep") {
        li.classList.add("keep");
        li.append(nm, el("span", "o-amt", l.word + (l.paren || "")), el("span", "o-tag", "そのまま"));
        lastResult.lines.push(`${l.name}${l.sep}${l.word}${l.paren || ""}`);
        box.append(li); return;
      }
      const r = convertItem(l, f, c.unit);
      const amt = el("span", "o-amt"); amt.append(el("b", null, r.text));
      if (r.paren) amt.append(el("span", "o-paren", r.paren));
      li.append(nm, amt);
      if (r.changed) li.append(el("span", "o-was", `元：${r.orig}`)); else li.classList.add("same");
      if (r.note) li.append(el("span", "o-note", r.note));
      lastResult.lines.push(`${l.name}${l.sep}${r.text}${r.paren}`);
      box.append(li);
    });
    $("copyMsg").textContent = "";
  }

  function panEditor(side) {
    const p = st.cur.pan[side];
    const box = el("div", "pan");
    box.append(el("p", "pan-t", side === "from" ? "レシピの型" : "使う型"));
    const seg = el("div", "seg small");
    Object.entries(SHAPES).forEach(([k, label]) => {
      const b = el("button", null, label); b.type = "button";
      b.setAttribute("aria-pressed", String(p.shape === k));
      b.addEventListener("click", () => { st.cur.pan[side] = { ...PAN_DEFAULT[k], ...(side === "to" && k === "round" ? { a: 15 } : {}) }; save(); render(); });
      seg.append(b);
    });
    box.append(seg);
    const dims = el("div", "pan-dims");
    const other = st.cur.pan[side === "from" ? "to" : "from"];
    const needH = p.shape === "pound" || other.shape === "pound";
    const fields = p.shape === "round" ? [["a", "直径"]] : p.shape === "square" ? [["a", "縦"], ["b", "横"]] : [["a", "長さ"], ["b", "幅"]];
    if (needH) fields.push(["h", "高さ"]);
    fields.forEach(([k, label]) => {
      const lab = el("label", "pf");
      lab.append(el("span", null, label));
      const w = el("span", "in-u");
      const inp = el("input"); inp.type = "text"; inp.inputMode = "decimal"; inp.value = trim0(String(p[k])); inp.autocomplete = "off";
      inp.setAttribute("aria-label", `${side === "from" ? "レシピの型" : "使う型"}の${label}（cm）`);
      inp.addEventListener("input", () => {
        const v = parseFloat(inp.value.normalize("NFKC"));
        if (v > 0 && v < 200) { p[k] = v; inp.removeAttribute("aria-invalid"); save(); renderSoft(); } else inp.setAttribute("aria-invalid", "true");
      });
      w.append(inp, el("i", null, "cm")); lab.append(w); dims.append(lab);
    });
    box.append(dims);
    const pv = el("div", "pan-pv"); pv.setAttribute("aria-hidden", "true");
    const shp = el("span", `shape ${p.shape}`); pv.append(shp); box.append(pv);
    box._shape = shp;
    return box;
  }
  let panBoxes = null, panKey = "";
  function renderPans() {
    if (st.cur.mode !== "pan") return;
    const key = `${st.cur.pan.from.shape}|${st.cur.pan.to.shape}`;
    if (panKey !== key || !panBoxes) {
      panKey = key;
      const wrap = $("pans"); wrap.replaceChildren();
      panBoxes = { from: panEditor("from"), to: panEditor("to") };
      wrap.append(panBoxes.from, el("span", "pan-arrow", "→"), panBoxes.to);
    }
    // 同じ縮尺で形を描く
    const { from, to } = st.cur.pan;
    const size = p => p.shape === "round" ? [p.a, p.a] : p.shape === "square" ? [p.b, p.a] : [p.a, p.b];
    const max = Math.max(...size(from), ...size(to));
    [["from", from], ["to", to]].forEach(([k, p]) => {
      const [w, h] = size(p);
      panBoxes[k]._shape.style.width = `${(w / max) * 96}px`;
      panBoxes[k]._shape.style.height = `${(h / max) * 96}px`;
    });
  }
  function renderSoft() { render(); }

  // 入力
  $("text").addEventListener("input", () => {
    st.cur.text = $("text").value;
    if (st.cur.mode === "serv" && !servTouched) {
      const m = st.cur.text.normalize("NFKC").match(/(\d+(?:\.\d+)?)\s*(人分|人前)/);
      if (m && +m[1] > 0 && +m[1] < 100) { st.cur.serv.from = +m[1]; $("sFrom").value = m[1]; }
    }
    save(); render();
  });
  $("title").addEventListener("input", () => { st.cur.title = $("title").value.slice(0, 40); save(); });
  let servTouched = false;
  function servInput(id, k) {
    const inp = $(id);
    inp.addEventListener("input", () => {
      const v = num(inp.value.normalize("NFKC").trim());
      servTouched = true;
      if (v > 0 && v < 1000) { st.cur.serv[k] = v; inp.removeAttribute("aria-invalid"); save(); render(); }
      else inp.setAttribute("aria-invalid", "true");
    });
  }
  servInput("sFrom", "from"); servInput("sTo", "to");
  document.querySelectorAll(".step").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.k, d = +b.dataset.d;
    const v = Math.max(1, Math.round(st.cur.serv[k]) + d);
    st.cur.serv[k] = v; servTouched = true; $(k === "from" ? "sFrom" : "sTo").value = String(v); save(); render();
  }));
  $("mult").addEventListener("input", () => { st.cur.mult = $("mult").value.slice(0, 10); save(); render(); syncMultChips(); });
  function syncMultChips() { document.querySelectorAll("#multChips button[data-v], #myMults button[data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === st.cur.mult.trim()))); }
  const pickMult = v => { st.cur.mult = v; $("mult").value = v; save(); render(); syncMultChips(); };
  document.querySelectorAll("#multChips button").forEach(b => b.addEventListener("click", () => pickMult(b.dataset.v)));
  // 自分で入れた倍率は、次からボタンで選べる（入れ終わったとき＝change で覚える）
  const FC = window.FreeChips;
  const BUILT_MULT = [...document.querySelectorAll("#multChips button")].map(b => b.dataset.v);
  const myMults = FC.store("lab-bunryo-mult.custom", { limit: 6, valid: v => typeof v === "string" && num(v) > 0 && num(v) < 100 });
  function renderMyMults() {
    const box = $("myMults"); box.replaceChildren();
    myMults.all().forEach(v => {
      const w = el("span", "fc-item");
      const b = el("button", null, `${v}倍`); b.type = "button"; b.dataset.v = v;
      b.addEventListener("click", () => pickMult(v));
      w.append(b, FC.remover(`${v}倍`, () => { myMults.remove(v); renderMyMults(); }));
      box.append(w);
    });
    box.hidden = !myMults.all().length;
    syncMultChips();
  }
  $("mult").addEventListener("change", () => {
    const v = $("mult").value.normalize("NFKC").trim().replace(/倍$/, "");
    const f = num(v);
    if (!(f > 0 && f < 100) || f === 1 || BUILT_MULT.some(x => num(x) === f) || myMults.all().some(x => num(x) === f)) return;
    myMults.add(v); renderMyMults();
  });
  renderMyMults();
  document.querySelectorAll("#modeSeg button").forEach(b => b.addEventListener("click", () => { st.cur.mode = b.dataset.m; save(); panKey = ""; render(); }));
  document.querySelectorAll("#unitSeg button").forEach(b => b.addEventListener("click", () => { st.cur.unit = b.dataset.u; save(); render(); }));

  function fillInputs() {
    const c = st.cur;
    $("text").value = c.text; $("title").value = c.title;
    $("sFrom").value = trim0(String(c.serv.from)); $("sTo").value = trim0(String(c.serv.to));
    $("mult").value = c.mult; syncMultChips();
    document.querySelectorAll("#app [aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    panKey = "";
  }

  // 例
  const SAMPLES = {
    nikujaga: { title: "肉じゃが", mode: "serv", serv: { from: 4, to: 3 }, unit: "keep",
      text: "材料（4人分）\n牛こま切れ肉 200g\nじゃがいも 3個\n玉ねぎ 1個\nにんじん 1/2本\nしらたき 1袋\nサラダ油 大さじ1\n水 300ml\n砂糖 大さじ2\nしょうゆ 大さじ3\nみりん 大さじ2\n酒 大さじ2\n塩 少々" },
    sponge: { title: "スポンジケーキ", mode: "pan", pan: { from: { ...PAN_DEFAULT.round }, to: { ...PAN_DEFAULT.round, a: 15, b: 15 } }, unit: "keep",
      text: "18cm丸型1台分\n卵 3個\nグラニュー糖 90g\n薄力粉 90g\nバター 20g\n牛乳 大さじ1\nバニラオイル 少々" }
  };
  document.querySelectorAll("[data-sample]").forEach(b => b.addEventListener("click", () => {
    const s = SAMPLES[b.dataset.sample];
    st.cur = cleanCur({ ...st.cur, ...s }); servTouched = true;
    save(); fillInputs(); render();
    $("result").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }));
  $("clearBtn").addEventListener("click", () => {
    if (!st.cur.text) return;
    const snap = snapshot();
    st.cur.text = ""; st.cur.title = ""; servTouched = false; save(); fillInputs(); render(); $("text").focus();
    toast("材料を消しました。", () => { restore(snap); fillInputs(); render(); });
  });

  // コピー
  $("copyBtn").addEventListener("click", async () => {
    const text = (st.cur.title ? `${st.cur.title}\n` : "") + lastResult.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) { try { const ta = el("textarea"); ta.value = text; ta.className = "offscreen"; document.body.append(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch (e) { ok = false; } }
    $("copyMsg").textContent = ok ? "コピーしました。メモやメッセージに貼り付けられます。" : "コピーできませんでした。一覧を長押しして選んでください。";
  });

  // 保存したレシピ
  function renderSaved() {
    const ul = $("savedList"); ul.replaceChildren();
    $("savedN").textContent = st.saved.length ? `（${st.saved.length}）` : "";
    $("savedNone").hidden = st.saved.length > 0;
    st.saved.forEach(s => {
      const li = el("li");
      const open = el("button", "sv-open"); open.type = "button";
      open.append(el("b", null, s.title), el("small", null, s.mode === "serv" ? `${trim0(String(s.serv.from))}人分 → ${trim0(String(s.serv.to))}人分` : s.mode === "pan" ? `${SHAPES[s.pan.from.shape]} → ${SHAPES[s.pan.to.shape]}` : `×${s.mult}`));
      open.addEventListener("click", () => {
        st.cur = cleanCur(s); servTouched = true; save(); fillInputs(); render();
        $("text").scrollIntoView({ block: "center" });
        toast(`「${s.title}」を開きました。`);
      });
      const del = el("button", "sv-del", "削除"); del.type = "button";
      del.setAttribute("aria-label", `${s.title}を削除`);
      del.addEventListener("click", () => {
        const snap = snapshot();
        st.saved = st.saved.filter(x => x.id !== s.id); save(); renderSaved();
        toast(`「${s.title}」を削除しました。`, () => { restore(snap); renderSaved(); });
      });
      li.append(open, del); ul.append(li);
    });
  }
  $("saveBtn").addEventListener("click", () => {
    const c = st.cur;
    if (!c.text.trim()) { $("saveMsg").textContent = "先に材料を入れてください。"; $("text").focus(); return; }
    if (!c.title.trim()) { $("saveMsg").textContent = "保存するには、レシピの名前を入れてください。"; $("title").focus(); return; }
    const ex = st.saved.find(s => s.title === c.title.trim());
    const item = { ...cleanCur(c), title: c.title.trim(), id: ex ? ex.id : uid() };
    st.saved = ex ? st.saved.map(s => s.id === ex.id ? item : s) : [item, ...st.saved];
    save(); renderSaved();
    $("saveMsg").textContent = ex ? `「${item.title}」を上書きしました。` : `「${item.title}」を保存しました。下の「保存したレシピ」から開けます。`;
  });
  $("title").addEventListener("input", () => { $("saveMsg").textContent = ""; });

  // お知らせ
  let toastTimer = 0, undoFn = null;
  function toast(msg, undo) {
    $("toastMsg").textContent = msg; undoFn = undo || null;
    $("toastUndo").hidden = !undo; $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 6000);
  }
  $("toastUndo").addEventListener("click", () => { if (undoFn) undoFn(); undoFn = null; $("toast").hidden = true; });

  // 引っ越し
  const pad = n => String(n).padStart(2, "0");
  const d0 = new Date(), today = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "bunryo", version: 1, exportedAt: new Date().toISOString(), data: st }, null, 1)], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = el("a"); a.href = u; a.download = `bunryo-${today}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
    $("moveMsg").textContent = "書き出しました。新しい端末で「ファイルを読み込む」を押すと、そのまま使えます。";
  });
  $("impFile").addEventListener("change", async () => {
    const f = $("impFile").files[0]; $("impFile").value = "";
    if (!f) return;
    let data = null;
    try { if (f.size > 5e6) throw 0; const j = JSON.parse(await f.text()); if (j && j.app === "bunryo") data = clean(j.data); } catch (e) { data = null; }
    if (!data || (!data.saved.length && !data.cur.text)) { $("moveMsg").textContent = "読み込めませんでした。このアプリで書き出したファイルを選んでください。"; return; }
    if (st.saved.length && !confirm(`保存したレシピを、ファイルの${data.saved.length}件に置き換えますか？`)) return;
    const snap = snapshot();
    st = data; save(); fillInputs(); render(); renderSaved();
    $("moveMsg").textContent = `${data.saved.length}件のレシピを読み込みました。`;
    toast("読み込みました。", () => { restore(snap); fillInputs(); render(); renderSaved(); });
  });

  // 目安の表
  const tb = $("densBody");
  (window.BUNRYO_DENSITY || []).filter(r => r[4]).forEach(([, tsp, tbsp, cup, label]) => {
    const tr = el("tr");
    tr.append(el("th", null, label), el("td", null, `${tsp}g`), el("td", null, `${tbsp}g`), el("td", null, cup ? `${cup}g` : "—"));
    tb.append(tr);
  });

  window.__bunryo = { parseLine, convertItem, spoon, fmtAmt };
  fillInputs(); render(); renderSaved();
})();
