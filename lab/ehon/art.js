// えほんメーカーの絵。stories.js の各ページにある「場面の指定」（art）から、絵本の一場面を SVG で組み立てる。
// 構図（ひき・ふつう・よる・アップ）、時間（あさ・ひる・ゆうがた・よる）、主人公のポーズと表情、なかま、小物を描き分ける。
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const W = 320, H = 200;

  // ---------- 小さな道具 ----------
  function E(tag, a, p) { const e = document.createElementNS(NS, tag); if (a) for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  const g0 = (p, t, extra) => E("g", Object.assign({ transform: t || null }, extra || {}), p);
  // 動きのクラスは外側、位置の transform は内側に分ける（CSS の動きが transform 属性を上書きしないように）
  const g = (p, t, extra) => { if (t && extra && extra.class) { const o = g0(p, null, extra); return g0(o, t); } return g0(p, t, extra); };
  const P = (p, d, fill, x) => E("path", Object.assign({ d, fill: fill || "none" }, x || {}), p);
  const C = (p, cx, cy, r, fill, x) => E("circle", Object.assign({ cx, cy, r, fill }, x || {}), p);
  const O = (p, cx, cy, rx, ry, fill, x) => E("ellipse", Object.assign({ cx, cy, rx, ry, fill }, x || {}), p);
  const R = (p, x0, y0, w, h, fill, x) => E("rect", Object.assign({ x: x0, y: y0, width: w, height: h, fill }, x || {}), p);
  const L = (p, d, stroke, w, x) => E("path", Object.assign({ d, fill: "none", stroke, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, x || {}), p);
  function rng(seed) { let s = (seed >>> 0) || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function lin(defs, id, stops, x2, y2) {
    const lg = E("linearGradient", { id, x1: 0, y1: 0, x2: x2 == null ? 0 : x2, y2: y2 == null ? 1 : y2 }, defs);
    stops.forEach((c, i) => E("stop", { offset: stops.length === 1 ? 0 : i / (stops.length - 1), "stop-color": c }, lg));
    return "url(#" + id + ")";
  }
  function rad(defs, id, inner, outer, op) {
    const rg = E("radialGradient", { id }, defs);
    E("stop", { offset: 0, "stop-color": inner, "stop-opacity": op == null ? 1 : op }, rg);
    E("stop", { offset: 1, "stop-color": outer, "stop-opacity": 0 }, rg);
    return "url(#" + id + ")";
  }

  // ---------- 小さなかざり ----------
  const star5 = (p, x, y, r, fill, x2) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1); } return P(p, d + "Z", fill, Object.assign({ "stroke-linejoin": "round" }, x2 || {})); };
  const twinkle = (p, x, y, r, fill, cls) => (x = +x, y = +y, r = +r, P(p, `M${x} ${y - r}Q${x + r * .18} ${y - r * .18} ${x + r} ${y}Q${x + r * .18} ${y + r * .18} ${x} ${y + r}Q${x - r * .18} ${y + r * .18} ${x - r} ${y}Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z`, fill, cls ? { class: cls } : null));
  const heart = (p, x, y, s, fill, cls) => P(p, `M${x} ${y + 6 * s}C${x - 9 * s} ${y}${" "}${x - 7 * s} ${y - 7 * s} ${x} ${y - 3 * s}C${x + 7 * s} ${y - 7 * s} ${x + 9 * s} ${y} ${x} ${y + 6 * s}Z`, fill, cls ? { class: cls } : null);
  const note = (p, x, y, s, fill) => { const n = g(p, `translate(${x} ${y}) scale(${s})`, { class: "float" }); O(n, 0, 0, 4.2, 3.2, fill, { transform: "rotate(-20)" }); L(n, "M3.6 -1V-15l7 3", fill, 1.8); };
  function cloud(p, x, y, s, fill, op) { const c = g(p, `translate(${x} ${y}) scale(${s})`, op != null ? { opacity: op } : null); C(c, -16, 0, 11, fill); C(c, 0, -7, 15, fill); C(c, 16, -1, 11, fill); R(c, -27, -2, 54, 11, fill, { rx: 5.5 }); return c; }
  function tree(p, x, y, s, leaf, leaf2, trunk) { const t = g(p, `translate(${x} ${y}) scale(${s})`); P(t, "M-4 0 L-3 -32 H3 L4 0Z", trunk); C(t, 0, -46, 21, leaf); C(t, -15, -36, 14, leaf); C(t, 15, -37, 14, leaf); C(t, -6, -54, 9, leaf2); C(t, 9, -40, 6, leaf2); return t; }
  function pine(p, x, y, s, col, trunk, snow) { const t = g(p, `translate(${x} ${y}) scale(${s})`); R(t, -3, -9, 6, 9, trunk); P(t, "M0 -66 L19 -8 H-19Z", col); P(t, "M0 -66 L12 -30 Q0 -26 -12 -30Z", "#ffffff", { opacity: snow ? .95 : .12 }); if (snow) P(t, "M-19 -8 Q0 -14 19 -8 L16 -13 Q0 -18 -16 -13Z", "#fff"); return t; }
  function flower(p, x, y, s, col) { const f = g(p, `translate(${x} ${y}) scale(${s})`); L(f, "M0 0V-8", "#5f9c5a", 1.4); [0, 72, 144, 216, 288].forEach(a => C(f, Math.cos(a * Math.PI / 180) * 2.6, -9 + Math.sin(a * Math.PI / 180) * 2.6, 2.1, col)); C(f, 0, -9, 1.5, "#f6d36b"); }
  function grass(p, x, y, s, col) { L(p, `M${x - 3 * s} ${y}q1-5 3-7M${x} ${y}q0-6 0-9M${x + 3 * s} ${y}q-1-5-3-7`, col, 1.3); }
  function house(c, x, s, lit, door) {
    const h = g(c.land, `translate(${x} ${c.G - 4}) scale(${s})`);
    R(h, -26, -40, 52, 40, "#f3dcb4"); P(h, "M-34 -38 L0 -66 L34 -38Z", "#c4604f"); P(h, "M-34 -38 L0 -66 L34 -38", "none", { stroke: "#9c4a3e", "stroke-width": 2 });
    R(h, 14, -64, 7, 16, "#9c6a52"); R(h, -18, -24, 14, 24, door ? "#4a3530" : "#9c6a52", { rx: 6 }); C(h, -7, -12, 1.4, "#f2d27a");
    R(h, 4, -30, 14, 12, "#aac6dc", { rx: 2 }); L(h, "M11 -30v12M4 -24h14", "#fff", 1.2);
    O(h, 0, 1, 40, 4, "rgba(60,40,30,.15)");
    if (lit && c.glow) { const lg = g(c.glow, `translate(${x} ${c.G - 4}) scale(${s})`); R(lg, 4, -30, 14, 12, "#ffe08a", { rx: 2 }); C(lg, 11, -24, 16, c.halo); if (door) { R(lg, -18, -24, 14, 24, "#ffd27a", { rx: 6, opacity: .9 }); P(lg, "M-18 0 L-4 0 L6 14 L-30 14Z", "#ffe7a8", { opacity: .35 }); } }
  }

  // ---------- 主人公（足もとが原点。100×100 の顔の箱を頭の位置にずらして描く） ----------
  const HERO = {
    kuma: { body: "#b07c52", belly: "#e8c9a0", limb: "#9a6a44", foot: "#8a5c3a",
      head(h) { C(h, 28, 28, 13, "#a0704a"); C(h, 72, 28, 13, "#a0704a"); C(h, 28, 28, 6, "#e8c9a0"); C(h, 72, 28, 6, "#e8c9a0"); C(h, 50, 56, 32, "#b07c52"); O(h, 50, 68, 14, 11, "#e8c9a0"); O(h, 50, 62, 5, 4, "#3a2a20"); },
      face: { e: [[38, 50], [62, 50]], r: 3.6, m: [50, 71], ch: [[29, 62], [71, 62]], ink: "#3a2a20" } },
    usagi: { body: "#f7f2ea", line: "#c9bba5", belly: "#ffffff", limb: "#ece2d2", foot: "#e6dccb",
      head(h) { O(h, 37, 24, 8, 22, "#f7f2ea", { stroke: "#c9bba5", "stroke-width": 2 }); O(h, 63, 24, 8, 22, "#f7f2ea", { stroke: "#c9bba5", "stroke-width": 2 }); O(h, 37, 26, 3.5, 14, "#f6b8c4"); O(h, 63, 26, 3.5, 14, "#f6b8c4"); C(h, 50, 60, 28, "#f7f2ea", { stroke: "#c9bba5", "stroke-width": 2 }); P(h, "M47 64l3 3 3-3z", "#e88a9c"); },
      face: { e: [[40, 56], [60, 56]], r: 3.5, m: [50, 71], ch: [[32, 66], [68, 66]], ink: "#3a2a20" },
      tail(b) { C(b, -17, -14, 7, "#ffffff", { stroke: "#c9bba5", "stroke-width": 1.5 }); } },
    neko: { body: "#f2a65a", belly: "#f8d3a8", limb: "#e3944c", foot: "#e3944c",
      head(h) { P(h, "M22 44l4-30 20 16zM78 44l-4-30-20 16z", "#f2a65a"); P(h, "M27 34l2-13 9 8zM73 34l-2-13-9 8z", "#f8d3a8"); C(h, 50, 56, 30, "#f2a65a"); L(h, "M44 29l2 9M50 28v10M56 29l-2 9", "#c97a35", 3); P(h, "M47 63l3 3 3-3z", "#d45d5d"); L(h, "M18 60l14 2M18 68l14-2M82 60l-14 2M82 68l-14-2", "#8a5a30", 1.4); },
      face: { e: [[39, 53], [61, 53]], r: 4, m: [50, 68], ch: [[31, 64], [69, 64]], ink: "#2b3a2b" },
      tail(b) { L(b, "M14 -12 Q34 -10 32 -30 Q31 -42 38 -46", "#e3944c", 7); L(b, "M33 -40 Q34 -44 38 -46", "#c97a35", 7); } },
    pen: { body: "#2d3a55", belly: "#fbf7ee", limb: "#2d3a55", foot: "#f2a43a", fat: true,
      head(h) { C(h, 50, 56, 31, "#2d3a55"); P(h, "M50 33c-13 0-21 9-21 21 0 12 8 20 21 20s21-8 21-20c0-12-8-21-21-21z", "#fbf7ee"); },
      face: { e: [[41, 50], [59, 50]], r: 3.6, m: [50, 59], ch: [[34, 61], [66, 61]], ink: "#1b2234", beak: true } },
    robot: { body: "#9fb4cf", line: "#58677f", belly: "#c9d6e6", limb: "#58677f", foot: "#58677f", robot: true,
      head(h) { L(h, "M50 14v12", "#58677f", 3); C(h, 50, 12, 5, "#f2c94c"); R(h, 10, 46, 8, 18, "#58677f", { rx: 3 }); R(h, 82, 46, 8, 18, "#58677f", { rx: 3 }); R(h, 18, 26, 64, 58, "#9fb4cf", { rx: 14, stroke: "#58677f", "stroke-width": 3 }); R(h, 29, 41, 16, 15, "#24324a", { rx: 4 }); R(h, 55, 41, 16, 15, "#24324a", { rx: 4 }); R(h, 33, 62, 34, 13, "#24324a", { rx: 6 }); },
      face: { e: [[37, 48.5], [63, 48.5]], r: 3, m: [50, 67.5], ch: [[24, 66], [76, 66]], ink: "#bff3ff", robot: true } },
    dragon: { body: "#7cc49a", belly: "#bfe8cd", limb: "#5fae82", foot: "#5fae82",
      head(h) { P(h, "M30 36l-6-22 16 13zM70 36l6-22-16 13z", "#f5e6b8"); P(h, "M12 56l15-7v17zM88 56l-15-7v17z", "#5fae82"); C(h, 50, 58, 30, "#7cc49a"); O(h, 50, 72, 16, 11, "#bfe8cd"); C(h, 45, 69, 1.8, "#2e5a42"); C(h, 55, 69, 1.8, "#2e5a42"); C(h, 34, 38, 3, "#5fae82"); C(h, 66, 40, 2.4, "#5fae82"); },
      face: { e: [[39, 52], [61, 52]], r: 4, m: [50, 77], ch: [[30, 64], [70, 64]], ink: "#24382c" },
      tail(b) { P(b, "M12 -10 Q30 -6 40 -18 L42 -8 Q30 2 12 0Z", "#5fae82"); P(b, "M40 -18 l8 -4 -6 12z", "#f5e6b8"); P(b, "M-12 -40 Q-34 -54 -38 -34 Q-28 -38 -24 -30Z", "#5fae82"); P(b, "M12 -40 Q34 -54 38 -34 Q28 -38 24 -30Z", "#5fae82"); } }
  };
  // ポーズ：脚 [x,y,rx,ry,回転]、手 [左, 右]、体の上下 by、傾き tilt、頭の傾き head
  const POSE = {
    stand: { legs: [[-9, -5], [9, -5]], arms: [[-26, -14], [26, -14]] },
    walk: { legs: [[-11, -9, 7, 6, -25], [10, -4]], arms: [[-22, -26], [27, -12]], tilt: 4, head: -3 },
    tiptoe: { legs: [[-10, -9, 6, 6, -25], [10, -7, 6, 6, 20]], arms: [[-8, -44], [26, -20]], tilt: 6, head: -5, by: -3 },
    jump: { by: -18, legs: [[-12, -7, 7, 6, 30], [12, -7, 7, 6, -30]], arms: [[-30, -62], [30, -62]], shadow: .6, head: -4 },
    raise: { legs: [[-10, -5], [10, -5]], arms: [[-27, -18], [30, -100]], head: -6, by: -2 },
    hug: { legs: [[-9, -5], [9, -5]], arms: [[-5, -26], [5, -24]], head: 6 },
    hold: { legs: [[-9, -5], [9, -5]], arms: [[-26, -14], [27, -22]] },
    offer: { legs: [[-9, -5], [11, -6]], arms: [[22, -30], [34, -34]], tilt: 7, head: 4 },
    sit: { by: 10, legs: [[-12, -12, 9, 5.5], [12, -12, 9, 5.5]], arms: [[-24, -16], [24, -16]], shadow: 1.2 },
    sad: { by: 2, legs: [[-8, -7], [8, -7]], arms: [[-18, -10], [18, -10]], head: 12, tilt: 2 },
    search: { legs: [[-10, -5], [11, -7, 7, 6, 15]], arms: [[-26, -18], [40, -44]], head: 9, tilt: 7 },
    wave: { legs: [[-9, -5], [9, -5]], arms: [[-26, -14], [36, -76]], head: 4 },
    reach: { legs: [[-10, -5], [12, -9, 7, 6, 25]], arms: [[-28, -24], [40, -72]], tilt: -6, head: -8 },
    think: { legs: [[-9, -5], [9, -5]], arms: [[-26, -14], [7, -36]], head: 8 },
    dance: { by: -6, legs: [[-12, -12, 7, 6, -35], [9, -4]], arms: [[-34, -56], [30, -20]], tilt: -7, shadow: .8 },
    lean: { legs: [[-10, -5], [10, -5]], arms: [[-24, -14], [38, -30]], tilt: 11, head: 8 }
  };
  const THING = { fusen: { grip: [31, 58], c: [30, 22], s: .95 }, taiko: { grip: [30, 40], c: [30, 34], s: .62 }, boshi: { grip: [30, 46], c: [30, 34], s: .62 },
    kasa: { grip: [30, 44], c: [30, 26], s: .8 }, bidama: { grip: [30, 34], c: [30, 32], s: .36 }, mafura: { grip: [32, 22], c: [30, 32], s: .62 } };
  function thing(p, id, x, y, s, anchor, rot, cls) {
    const t = THING[id], a = anchor === "c" ? t.c : t.grip;
    const host = cls ? g0(p, `translate(${x} ${y})`) : p, inner = cls ? g0(host, null, { class: cls }) : p;
    return E("use", { href: "#t-" + id, x: -a[0], y: -a[1], width: 60, height: 60, transform: cls ? `rotate(${rot || 0}) scale(${s})` : `translate(${x} ${y}) rotate(${rot || 0}) scale(${s})` }, inner);
  }

  // 表情
  function face(h, F, ex, look) {
    ex = ex || "normal"; const ink = F.ink, r = F.r, lx = (look || 0) * r * .45;
    const cheek = F.robot ? "#ff9f7a" : "#f4a3a3";
    if (/normal|happy|wonder|sleep|sleepy|awake|determined|surprised/.test(ex)) F.ch.forEach(([x, y]) => O(h, x, y, r * 1.5, r * .9, cheek, { opacity: ex === "happy" ? .85 : .55 }));
    F.e.forEach(([x, y], i) => {
      const sg = i ? 1 : -1; x += lx;
      if (ex === "happy") L(h, `M${x - r * 1.3} ${y + r * .5}Q${x} ${y - r * 1.5} ${x + r * 1.3} ${y + r * .5}`, ink, r * .72);
      else if (ex === "sleep") L(h, `M${x - r * 1.3} ${y - r * .1}Q${x} ${y + r * 1.3} ${x + r * 1.3} ${y - r * .1}`, ink, r * .6);
      else if (ex === "cry") { L(h, `M${x + sg * r * 1.1} ${y - r}L${x - sg * r * 1.1} ${y}L${x + sg * r * 1.1} ${y + r}`, ink, r * .6); P(h, `M${x - r * .4} ${y + r * 1.2}q-${r * .7} ${r * 2.4} ${r * .3} ${r * 4}q${r * 1} -${r * 1.6} ${r * .2} -${r * 4}z`, "#8fc8ec"); }
      else if (ex === "sleepy") { P(h, `M${x - r * 1.15} ${y}A${r * 1.15} ${r * 1.15} 0 0 0 ${x + r * 1.15} ${y}Z`, ink); L(h, `M${x - r * 1.5} ${y}L${x + r * 1.5} ${y}`, ink, r * .4); }
      else if (/surprised|wonder|awake/.test(ex)) { C(h, x, y, r * 1.35, ink); C(h, x - r * .45, y - r * .5, r * .48, F.robot ? "#24324a" : "#fff"); if (ex === "wonder") C(h, x + r * .45, y + r * .4, r * .26, F.robot ? "#24324a" : "#fff"); }
      else { C(h, x, y - (ex === "worry" ? r * .25 : 0), r, ink); C(h, x - r * .35, y - r * .45, r * .36, F.robot ? "#24324a" : "#fff"); }
      if (/sad|worry|cry/.test(ex)) L(h, `M${x + sg * r * 1.5} ${y - r * 2.3}L${x - sg * r * 1.1} ${y - r * 3.2}`, ink, r * .45);
      if (ex === "surprised") L(h, `M${x - r * 1.3} ${y - r * 2.6}Q${x} ${y - r * 3.7} ${x + r * 1.3} ${y - r * 2.6}`, ink, r * .4);
      if (ex === "determined") L(h, `M${x + sg * r * 1.5} ${y - r * 3}L${x - sg * r * 1} ${y - r * 2.2}`, ink, r * .45);
    });
    if (ex === "sad") P(h, `M${F.e[0][0] - r * .2} ${F.e[0][1] + r * 1.3}q-${r * .9} ${r * 1.5} 0 ${r * 2.1}q${r * .9} -${r * .6} 0 -${r * 2.1}z`, "#8fc8ec");
    if (F.nomouth) return;
    const [mx, my] = F.m;
    if (F.beak) {
      const open = /happy|surprised|wonder|awake/.test(ex);
      P(h, `M${mx - 7} ${my - 2}h14l-7 ${open ? 5 : 8}z`, "#f2a43a");
      if (open) P(h, `M${mx - 5} ${my + 4}h10l-5 ${ex === "happy" ? 4 : 6}z`, "#d9822a");
      return;
    }
    const sw = r * .55, tongue = F.robot ? F.ink : "#c4544a";
    if (ex === "happy") P(h, `M${mx - 6} ${my - 1}Q${mx} ${my + 9} ${mx + 6} ${my - 1}Z`, tongue, { stroke: ink, "stroke-width": r * .4, "stroke-linejoin": "round" });
    else if (/surprised|wonder/.test(ex)) O(h, mx, my + 1, r * .8, r * 1.05, F.robot ? ink : "#7a3530");
    else if (/awake|sleep|sleepy/.test(ex)) O(h, mx, my + 1, r * .5, r * .42, F.robot ? ink : "#7a3530");
    else if (/sad|worry|cry/.test(ex)) L(h, `M${mx - 4.5} ${my + 3}Q${mx} ${my - 2} ${mx + 4.5} ${my + 3}`, ink, sw);
    else if (ex === "determined") L(h, `M${mx - 5} ${my}Q${mx} ${my + 3} ${mx + 5} ${my}`, ink, sw);
    else L(h, `M${mx - 5} ${my - 1}Q${mx} ${my + 4.5} ${mx + 5} ${my - 1}`, ink, sw);
  }

  function heroHead(p, id, ex, look) { const H0 = HERO[id]; const hd = g(p, "translate(-50 -122)"); H0.head(hd); face(hd, H0.face, ex, look); return hd; }
  function drawHero(p, id, o) {
    const H0 = HERO[id], ps = POSE[o.pose] || POSE.stand, by = ps.by || 0;
    const root = g(p);
    O(root, 0, 0, 22 * (ps.shadow || 1), 4, "rgba(60,40,30,.2)");
    const b = g(root, `translate(0 ${by}) rotate(${ps.tilt || 0} 0 -20)`);
    if (H0.tail) H0.tail(b);
    ps.legs.forEach(([x, y, rx, ry, rot]) => O(b, x, y, rx || 7.5, ry || 6, H0.foot, { transform: rot ? `rotate(${rot} ${x} ${y})` : null }));
    if (H0.robot) { R(b, -18, -44, 36, 38, H0.body, { rx: 9, stroke: H0.line, "stroke-width": 2.5 }); R(b, -10, -36, 20, 14, H0.belly, { rx: 3 }); C(b, -4, -29, 2, "#e8544e"); C(b, 4, -29, 2, "#f2c94c"); }
    else { O(b, 0, -24, H0.fat ? 22 : 19, H0.fat ? 22 : 20, H0.body, H0.line ? { stroke: H0.line, "stroke-width": 1.6 } : null); O(b, 0, -21, H0.fat ? 15 : 12, H0.fat ? 16 : 13, H0.belly); }
    const [aL, aR] = ps.arms, th = o.thing && o.mode;
    const arm = (sx, [hx, hy]) => { const sy = -31; L(b, `M${sx} ${sy}Q${(sx + hx) / 2 + sx * .35} ${(sy + hy) / 2 + 4} ${hx} ${hy}`, H0.limb, H0.fat ? 10 : 9); C(b, hx, hy, H0.robot ? 4.6 : 5.4, H0.robot ? "#3e4a5e" : H0.limb); };
    if (th === "hug") thing(b, o.thing, 0, -28, (THING[o.thing].s) * (o.thing === "fusen" ? .62 : o.thing === "bidama" ? 1.3 : .95), "c", o.thing === "kasa" ? -15 : 0);
    const up = a => a[1] < -50;
    if (up(aL)) arm(-16, aL); if (up(aR)) arm(16, aR);
    const hdG = g(b, `rotate(${ps.head || 0} 0 -44)`);
    heroHead(hdG, id, o.face, o.look);
    if (!up(aL)) arm(-16, aL); if (!up(aR)) arm(16, aR);
    if (th === "hold") thing(b, o.thing, aR[0], aR[1], THING[o.thing].s, "g", o.thing === "fusen" ? -8 : 0);
    if (th === "raise") thing(b, o.thing, aR[0], aR[1], THING[o.thing].s * 1.15, "g", o.thing === "fusen" ? -4 : o.thing === "mafura" ? 20 : 0, "sway");
    if (th === "offer") thing(b, o.thing, aR[0] + 4, aR[1] - 6, THING[o.thing].s * .95, "c", 0);
    return { head: -122 + by, hand: [aR[0], aR[1] + by] };
  }

  // ---------- なかま（ばしょごとに1ぴき。足もとが原点、高さはおよそ56） ----------
  const FR = {
    owl: { top: -60, neck: -30, draw(b) {
      P(b, "M-14 -46 L-18 -60 L-5 -50Z M14 -46 L18 -60 L5 -50Z", "#7a5a3c"); O(b, -17, -24, 6, 13, "#74563a", { transform: "rotate(12 -17 -24)" }); O(b, 17, -24, 6, 13, "#74563a", { transform: "rotate(-12 17 -24)" });
      O(b, 0, -27, 19, 25, "#8d6a4a"); O(b, 0, -19, 12, 15, "#ead8b4"); L(b, "M-5 -22l2 2 2-2M1 -22l2 2 2-2M-2 -14l2 2 2-2", "#c9ad84", 1.2); C(b, -7, -37, 7.5, "#fbf3df"); C(b, 7, -37, 7.5, "#fbf3df"); O(b, -6, -1, 4, 2.5, "#f2a43a"); O(b, 6, -1, 4, 2.5, "#f2a43a");
      P(b, "M-3 -31 L3 -31 L0 -26Z", "#f2a43a"); }, F: { e: [[-7, -37], [7, -37]], r: 3, m: [0, -24], ch: [[-13, -29], [13, -29]], ink: "#3a2a20", nomouth: true } },
    crab: { top: -46, neck: -22, draw(b) {
      L(b, "M-14 -10l-10 10M-18 -14l-12 8M14 -10l10 10M18 -14l12 8", "#c94a3a", 2.4); L(b, "M-16 -20l-10 -8M16 -20l10 -8M-7 -26v-8M7 -26v-8", "#c94a3a", 3);
      O(b, 0, -16, 22, 13, "#e5604d"); C(b, -27, -32, 8, "#e5604d"); C(b, 27, -32, 8, "#e5604d"); P(b, "M-30 -40 l3 7 4 -7z M30 -40 l-3 7 -4 -7z", "#f9d9c0"); C(b, -8, -38, 5, "#fff"); C(b, 8, -38, 5, "#fff"); }, F: { e: [[-8, -38], [8, -38]], r: 2.4, m: [0, -13], ch: [[-13, -14], [13, -14]], ink: "#3a2a20" } },
    bird: { top: -44, neck: -12, draw(b) {
      L(b, "M-4 -5V0M4 -5V0", "#e08a2a", 1.8); P(b, "M-14 -22 L-28 -26 L-24 -14Z", "#e6b02e"); C(b, 0, -20, 17, "#f5c842"); O(b, 0, -14, 11, 8, "#fbe7a0"); O(b, 11, -18, 6, 9, "#e6b02e", { transform: "rotate(-20 11 -18)" });
      P(b, "M-2 -37 Q0 -46 4 -42 Q2 -40 2 -36Z", "#e6b02e"); P(b, "M-3 -20 L3 -20 L0 -15Z", "#f2843a"); }, F: { e: [[-6, -24], [6, -24]], r: 2.3, m: [0, -14], ch: [[-11, -18], [11, -18]], ink: "#3a2a20", nomouth: true } },
    mouse: { top: -56, neck: -24, draw(b) {
      L(b, "M10 -6 Q28 -2 26 -16 Q24 -24 32 -24", "#d8a7ae", 2); C(b, -12, -47, 9, "#b8aea4"); C(b, 12, -47, 9, "#b8aea4"); C(b, -12, -47, 5, "#f3b6c0"); C(b, 12, -47, 5, "#f3b6c0");
      O(b, 0, -16, 14, 16, "#c9c0b6"); O(b, 0, -13, 9, 10, "#e8e2da"); C(b, 0, -36, 13, "#c9c0b6"); C(b, 0, -32, 2.4, "#e88a9c"); L(b, "M-4 -31l-9 -2M-4 -30l-9 2M4 -31l9 -2M4 -30l9 2", "#8a8078", .9); O(b, -6, -1, 5, 2.5, "#b8aea4"); O(b, 6, -1, 5, 2.5, "#b8aea4"); }, F: { e: [[-5, -38], [5, -38]], r: 2.1, m: [0, -28], ch: [[-9, -33], [9, -33]], ink: "#3a2a20" } },
    yuki: { top: -52, neck: -10, draw(b) {
      O(b, -6, -38, 4, 13, "#5fa86a", { transform: "rotate(-14 -6 -38)" }); O(b, 6, -38, 4, 13, "#5fa86a", { transform: "rotate(14 6 -38)" }); L(b, "M-4 -28 L-9 -48M4 -28 L9 -48", "#3f7a4f", 1);
      P(b, "M-23 0 Q-25 -30 0 -32 Q25 -30 23 0Z", "#fbfdff", { stroke: "#cfdbe8", "stroke-width": 1.6 }); O(b, -6, -24, 6, 3, "#ffffff"); }, F: { e: [[-7, -17], [7, -17]], r: 2.6, m: [0, -10], ch: [[-13, -11], [13, -11]], ink: "#c7423c" } },
    ant: { top: -56, neck: -22, draw(b) {
      O(b, 13, -12, 10, 8, "#7e3f33"); L(b, "M-4 -14l-10 6 0 8M4 -14l10 6 0 8M-3 -20l-11 -2M3 -20l11 -2M0 -10v10", "#5c2c24", 2);
      O(b, 0, -19, 8, 9, "#8b4a3c"); C(b, 0, -34, 12, "#9b5a48"); L(b, "M-4 -44 Q-8 -52 -12 -54M4 -44 Q8 -52 12 -54", "#5c2c24", 1.6); C(b, -12, -54, 2.2, "#5c2c24"); C(b, 12, -54, 2.2, "#5c2c24"); }, F: { e: [[-4.5, -35], [4.5, -35]], r: 2.3, m: [0, -28], ch: [[-8, -30], [8, -30]], ink: "#2a1410" } }
  };
  const PLACE_FR = { mori: "owl", umi: "crab", kumo: "bird", machi: "mouse", yuki: "yuki", okashi: "ant" };
  function drawFriend(p, kind, o) {
    const f = FR[kind], root = g(p), lift = o.pose === "jump" ? -12 : o.pose === "sit" ? 3 : 0;
    O(root, 0, 0, 18 * (lift ? .7 : 1), 3.4, "rgba(60,40,30,.2)");
    const b = g(root, `translate(0 ${lift}) rotate(${o.pose === "sad" ? 8 : o.pose === "dance" ? -8 : 0} 0 -10)` + (o.pose === "sit" ? " scale(1.06 .9)" : ""));
    f.draw(b);
    face(b, f.F, o.face, o.look);
    if (o.bow) { const bw = g(b, `translate(${kind === "crab" ? 0 : 6} ${f.top + 6})`); P(bw, "M0 0 l-8 -5 v10z M0 0 l8 -5 v10z", "#e8547a"); C(bw, 0, 0, 2.4, "#c43d5e"); }
    if (o.wear === "boshi") thing(b, "boshi", 0, f.top + 10, .5, "g");
    if (o.wear === "mafura") { O(b, 0, f.neck, 15, 4.5, "#e06a6a"); P(b, `M4 ${f.neck}l6 16h-6l-3 -14z`, "#e06a6a"); L(b, `M-10 ${f.neck - 1}l2 3M-3 ${f.neck}l1 3M5 ${f.neck}l1 3`, "#fff", 1.4); }
    if (o.hold) thing(b, o.hold, 20, -16, THING[o.hold].s * .8, o.hold === "fusen" ? "g" : "c", 0, o.hold === "fusen" ? "sway" : null);
    return { head: f.top + lift };
  }

  // ---------- そら ----------
  const SKY = {
    morning: ["#9fd0ec", "#f9e3cf", "#fcd0ae"], day: ["#83bfe9", "#b9def3", "#e8f4f4"],
    dusk: ["#4e4a8c", "#c9708d", "#f7ae78"], night: ["#0f1640", "#1d2760", "#34417c"]
  };
  const SKY_P = { okashi: { day: ["#f5a9c6", "#fbd0df", "#fde8ee"], morning: ["#f7bcd3", "#fde0e6", "#ffe6cf"] }, kumo: { day: ["#5aa6e6", "#9dcdf3", "#d8ebfb"] }, yuki: { day: ["#98bcdc", "#cbdeee", "#eef4fa"] }, machi: { day: ["#93c4e8", "#d4e6ee", "#f6e3c8"] } };
  // 時間ごとの色のかけ方（地面・建物用と、登場人物用）
  const TINT = {
    morning: { land: "1 0 0 0 .03  0 .98 0 0 .02  0 0 .92 0 0  0 0 0 1 0", cast: "1 0 0 0 .02  0 1 0 0 .01  0 0 .96 0 0  0 0 0 1 0" },
    day: null,
    dusk: { land: ".92 0 0 0 .08  0 .7 0 0 .05  0 0 .66 0 .06  0 0 0 1 0", cast: "1 0 0 0 .03  0 .86 0 0 .02  0 0 .8 0 .03  0 0 0 1 0" },
    night: { land: ".4 0 0 0 .04  0 .46 0 0 .06  0 0 .6 0 .16  0 0 0 1 0", cast: ".6 0 0 0 .03  0 .64 0 0 .05  0 0 .78 0 .12  0 0 0 1 0" },
    lamp: { land: ".86 0 0 0 .04  0 .76 0 0 .03  0 0 .72 0 .06  0 0 0 1 0", cast: ".94 0 0 0 .04  0 .86 0 0 .02  0 0 .8 0 .04  0 0 0 1 0" }
  };
  function sky(c) {
    const st = (SKY_P[c.place] && SKY_P[c.place][c.time]) || SKY[c.time];
    R(c.sky, 0, 0, W, H, lin(c.defs, c.id + "sky", st));
    const r = rng(hash(c.place + c.time));
    if (c.time === "night") {
      for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * (c.hz - 20); C(c.sky, x.toFixed(1), y.toFixed(1), (r() * 1.1 + .5).toFixed(2), "#fff6cf", { class: i % 3 ? null : "twinkle", opacity: (.5 + r() * .5).toFixed(2) }); }
      for (let i = 0; i < 4; i++) twinkle(c.sky, (30 + r() * 260).toFixed(1), (10 + r() * (c.hz * .45)).toFixed(1), 3.2 + r() * 2, "#fff6cf", "twinkle");
      if (!c.noMoon) { const mx = c.moonX || 262, my = c.moonY || 38, mr = c.moonR || 15; C(c.sky, mx, my, mr * 2.6, rad(c.defs, c.id + "mh", "#fff3c0", "#fff3c0", .35)); P(c.sky, `M${mx - mr * .35} ${my - mr * .85}a${mr} ${mr} 0 1 0 ${mr * .7} ${mr * 1.7}a${mr * 1.05} ${mr * 1.05} 0 0 1 -${mr * .7} -${mr * 1.7}z`, "#f6dc8a"); }
    } else if (c.time === "dusk") {
      const sx = c.sunX || 236, sy = c.hz - 4; C(c.sky, sx, sy, 48, rad(c.defs, c.id + "sh", "#ffd08a", "#ffd08a", .7)); C(c.sky, sx, sy, 20, "#ffb46b");
      cloud(c.sky, 70, 40, .9, "#f4a7a0", .7); cloud(c.sky, 190, 26, .7, "#e993a0", .6);
    } else {
      const morning = c.time === "morning", sx = morning ? 58 : 268, sy = morning ? c.hz - 26 : 30;
      if (!c.noSun) { C(c.sky, sx, sy, 34, rad(c.defs, c.id + "sh", "#fff6c8", "#fff6c8", .8)); C(c.sky, sx, sy, 14, morning ? "#ffe0a0" : "#fff2b8"); }
      cloud(c.sky, morning ? 210 : 70, 34, .9, "#ffffff", .85); cloud(c.sky, morning ? 120 : 190, 56, .6, "#ffffff", .7);
    }
  }

  // ---------- ばしょ ----------
  // c.frame: wide（ひき）/ mid（ふつう）/ low（空が大きい）/ close（アップ）。c.G は足もとの高さ、c.hz は地平線。
  const PLACES = {
    mori: {
      land(c) {
        const g0 = c.land, G = c.G, hz = c.hz, k = c.k, r = c.r;
        if (c.frame === "close") {
          P(g0, `M0 ${hz} Q90 ${hz - 18} 170 ${hz - 4} T320 ${hz - 8} V200H0Z`, "#a7cd92");
          for (let i = 0; i < 6; i++) C(g0, 30 + i * 56, hz - 14, 26, "#8cbc7d", { opacity: .7 });
          P(g0, `M0 ${hz + 24} Q120 ${hz + 8} 200 ${hz + 20} T320 ${hz + 16} V200H0Z`, "#8cc078");
          for (let i = 0; i < 9; i++) flower(g0, 14 + i * 36 + r() * 10, 194 - r() * 10, 1.5, ["#f6b8c4", "#fff", "#f6d36b"][i % 3]);
          return;
        }
        P(g0, `M0 ${hz - 6} Q70 ${hz - 34} 140 ${hz - 12} T290 ${hz - 18} T340 ${hz - 10} V200H0Z`, "#a9cf95");
        for (let i = 0; i < 15; i++) pine(g0, 4 + i * 22 + r() * 8, hz - 2 + r() * 6, .3 + r() * .14, i % 2 ? "#6aa36a" : "#5c9a62", "#7a5638");
        P(g0, `M0 ${hz + 6} Q90 ${hz - 6} 170 ${hz + 4} T320 ${hz + 2} V200H0Z`, "#8fc27c");
        P(g0, `M146 ${hz + 4} Q128 ${hz + 20} 150 ${hz + 34} T132 200 H196 Q186 ${hz + 34} 168 ${hz + 20} Q160 ${hz + 10} 158 ${hz + 4}Z`, "#ead9ae");
        tree(g0, 30, G + 10, k * 1.9, "#4f8c5c", "#6fa86a", "#7a5638"); pine(g0, 292, G + 12, k * 1.9, "#3f7a4f", "#7a5638");
        tree(g0, 248, hz + 10, k * 1.1, "#5f9c66", "#7cb478", "#7a5638"); pine(g0, 84, hz + 12, k * 1.2, "#4f8c5c", "#7a5638");
        for (let i = 0; i < 10; i++) { const x = r() * W, y = hz + 14 + r() * (200 - hz - 14); flower(g0, x, y, k * 1.6, ["#f6b8c4", "#fff", "#f6d36b"][i % 3]); }
        for (let i = 0; i < 8; i++) grass(g0, r() * W, hz + 16 + r() * (200 - hz - 16), k * 2, "#6a9c5a");
        if (c.time === "night") for (let i = 0; i < 6; i++) { const x = 20 + r() * 280, y = hz - 30 + r() * 60; C(c.glow, x, y, 5, c.halo); C(c.glow, x, y, 1.4, "#f8f2a0", { class: "twinkle" }); }
      },
      close(c) { // 大きな木と葉っぱの枠
        const g0 = c.front; P(g0, "M-6 0 H46 Q40 60 44 120 Q48 170 30 210 H-6Z", "#8a6040"); L(g0, "M12 30 q6 30 0 60 M26 100 q-6 30 2 60", "#6e4a30", 2.4);
        [[10, -2, 40], [56, -12, 34], [96, -18, 26], [300, -6, 38], [258, -16, 30]].forEach(([x, y, rr], i) => C(g0, x, y, rr, i % 2 ? "#5f9c66" : "#4f8c5c"));
        C(g0, 20, 10, 16, "#6fa86a"); C(g0, 290, 12, 14, "#6fa86a");
      },
      spot(c) { const g0 = c.land; P(g0, "M196 0 H300 Q290 90 300 150 Q308 176 330 186 L320 200 H170 Q196 184 206 160 Q216 110 196 0Z", "#8a6040"); L(g0, "M220 30 q8 40 0 80M262 20 q-8 50 4 110", "#6e4a30", 2.6); P(g0, "M228 182 Q240 150 262 152 Q282 156 284 186Z", "#4a3020"); P(g0, "M150 200 Q190 182 214 178 L206 200Z M296 178 Q320 182 330 200 H296Z", "#7a5236"); },
      wonder(c) { const r = c.r; for (let i = 0; i < 22; i++) { const x = 10 + r() * 300, y = c.hz - 50 + r() * 100; C(c.glow, x, y, 6, c.halo); C(c.glow, x, y, 1.6, "#f8f2a0", { class: i % 2 ? "twinkle" : "float" }); } },
      fest(c) { // 木から木へ ちょうちん
        const y0 = c.frame === "wide" ? c.hz - 20 : 26, d = `M20 ${y0} Q160 ${y0 + 34} 300 ${y0}`; L(c.land, d, "#6e4a30", 1.2);
        for (let i = 1; i < 8; i++) { const t = i / 8, x = 20 + 280 * t, y = y0 + 34 * 2 * t * (1 - t) * 1; lantern(c, x, y + 2, c.frame === "wide" ? .8 : 1.1, ["#e8544e", "#f2a43a", "#f6d36b"][i % 3]); }
      },
      path(c) { L(c.land, `M30 ${c.G + 6} q30 -12 60 -2 q20 6 30 -4M200 ${c.G + 8} q30 -14 70 0`, "#7a5638", 5); }
    },
    umi: {
      land(c) {
        const g0 = c.land, hz = c.hz, k = c.k, r = c.r, close = c.frame === "close";
        const sea = close ? hz - 20 : hz - 20;
        R(g0, 0, sea, W, 60, "#5aa2c8"); R(g0, 0, sea, W, 6, "#7fb9d8");
        for (let j = 0; j < 4; j++) L(g0, `M${-10 + j * 7} ${sea + 12 + j * 10}` + " q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0", "#bfe3f5", 1.6, { opacity: .8 });
        if (!close) { P(g0, `M250 ${sea + 2} l10 -10 6 10z`, "#fff"); R(g0, 248, sea + 2, 20, 3, "#c4604f"); }
        P(g0, `M0 ${hz + 8} Q80 ${hz - 2} 160 ${hz + 6} T320 ${hz + 2} V200H0Z`, "#a8d6e6", { opacity: .9 });
        P(g0, `M0 ${hz + 12} Q90 ${hz + 2} 180 ${hz + 10} T320 ${hz + 8} V200H0Z`, "#f0d9a8");
        P(g0, `M0 ${hz + 12} Q90 ${hz + 2} 180 ${hz + 10} T320 ${hz + 8}`, "none", { stroke: "#fff", "stroke-width": 2.4, opacity: .8 });
        for (let i = 0; i < 9; i++) { const x = r() * W, y = hz + 22 + r() * (186 - hz - 22), s = (close ? 2 : k * 1.6); shell(g0, x, y, s, ["#f6b8c4", "#fff", "#f7d9a8"][i % 3]); }
        if (!close && !(c.d && c.d.house === "left")) { O(g0, 40, c.G + 4, 30 * k * 1.4, 12 * k * 1.4, "#a59b8e"); O(g0, 34, c.G - 2, 18 * k * 1.4, 9 * k * 1.4, "#bdb3a6"); }
        if (c.time === "night") { const mx = c.moonX || 262; for (let j = 0; j < 5; j++) R(c.glow, mx - 14 + j * 3 - (j % 2) * 6, sea + 8 + j * 9, 28 - j * 4, 2.4, "#fff3c0", { rx: 1.2, opacity: .7 - j * .1, class: "twinkle" }); }
      },
      close(c) { const g0 = c.front; shell(g0, 296, 186, 4, "#f6b8c4"); shell(g0, 22, 190, 3.4, "#fff"); P(g0, "M0 200 Q60 182 120 194 L120 200Z", "#e9cf98"); },
      spot(c) { const g0 = c.land; P(g0, `M190 ${c.hz + 30} Q196 ${c.hz - 30} 250 ${c.hz - 36} Q312 ${c.hz - 30} 322 ${c.hz + 30} V200 H182Z`, "#a59b8e"); P(g0, `M206 ${c.hz} Q230 ${c.hz - 26} 270 ${c.hz - 26}`, "none", { stroke: "#c9c0b4", "stroke-width": 5, "stroke-linecap": "round" }); P(g0, `M230 200 Q240 ${c.hz + 30} 268 ${c.hz + 28} Q292 ${c.hz + 30} 300 200Z`, "#6e665c"); },
      wonder(c) { const mx = c.moonX || 262, sea = c.hz - 20; for (let j = 0; j < 8; j++) R(c.glow, mx - 22 + (j % 2) * 8, sea + 4 + j * 6, 40 - j * 4, 2.6, "#fff3c0", { rx: 1.3, opacity: .9 - j * .08, class: "twinkle" }); },
      fest(c) { const y0 = c.frame === "wide" ? c.hz - 6 : 30; L(c.land, `M0 ${y0} Q160 ${y0 + 30} 320 ${y0}`, "#8a6a4a", 1.2); for (let i = 1; i < 12; i++) { const t = i / 12; shell(c.land, 320 * t, y0 + 60 * t * (1 - t) + 6, c.frame === "wide" ? 1.2 : 1.6, ["#f6b8c4", "#fff", "#f6d36b"][i % 3]); } pole(c, 30, "#e8544e"); pole(c, 290, "#4f86d1"); },
      path(c) { for (let i = 0; i < 7; i++) { const x = 40 + i * 40, y = c.G + 10 - (i % 2) * 6; O(c.land, x, y, 4, 2.4, "#d9be88"); O(c.land, x + 6, y - 3, 4, 2.4, "#d9be88"); } }
    },
    kumo: {
      land(c) {
        const g0 = c.land, hz = c.hz, r = c.r, close = c.frame === "close";
        cloud(g0, 60, hz - 50, 1.4, "#ffffff", .6); cloud(g0, 250, hz - 70, 1.1, "#ffffff", .55); cloud(g0, 160, hz - 34, .8, "#ffffff", .5);
        P(g0, `M0 ${hz + 4} q20 -26 50 -14 q16 -26 50 -8 q24 -24 56 0 q28 -20 58 6 q30 -18 60 2 q26 -10 46 0 V200 H0Z`, "#eef4ff");
        P(g0, `M0 ${hz + 18} q30 -24 64 -10 q22 -24 60 0 q30 -20 64 4 q30 -18 60 0 q30 -14 72 2 V200 H0Z`, "#ffffff");
        P(g0, `M0 ${hz + 40} q60 -14 120 -2 t200 -4 V200 H0Z`, "#e3edfc");
        for (let i = 0; i < 6; i++) C(g0, 30 + r() * 260, hz + 26 + r() * 30, 3 + r() * 4, "#d6e4f8", { opacity: .8 });
        if (!close && !(c.d && c.d.fest)) { P(g0, `M210 ${hz - 6} a40 40 0 0 1 80 0`, "none", { stroke: "#f6b8c4", "stroke-width": 4, opacity: .6 }); P(g0, `M216 ${hz - 6} a34 34 0 0 1 68 0`, "none", { stroke: "#f6d36b", "stroke-width": 4, opacity: .6 }); P(g0, `M222 ${hz - 6} a28 28 0 0 1 56 0`, "none", { stroke: "#a8d6c0", "stroke-width": 4, opacity: .6 }); }
      },
      close(c) { cloud(c.front, 10, 192, 2.2, "#ffffff"); cloud(c.front, 300, 196, 2, "#ffffff"); },
      spot(c) { const s = g(c.land, "translate(250 150)"); cloud(s, 0, 0, 3.4, "#ffffff"); cloud(s, -20, 26, 2.6, "#f4f8ff"); O(s, -10, 4, 30, 8, "#e3edfc", { opacity: .6 }); },
      wonder(c) { const r = c.r; for (let i = 0; i < 9; i++) { const x = 16 + r() * 288, y = 12 + r() * (c.hz - 30); C(c.glow, x, y, 9, c.halo); star5(c.glow, x, y, 4 + r() * 4, "#fff3b0", { class: "twinkle" }); } },
      fest(c) { const y0 = c.hz + 6, q = c.frame === "wide" ? .8 : 1, cx = 236; [["#f28a8a", 64], ["#f6c46b", 58], ["#f6e38b", 52], ["#9fd6a8", 46], ["#8fc4ec", 40], ["#b9a3e0", 34]].forEach(([col, rr]) => P(c.land, `M${cx - rr * 1.2 * q} ${y0} A${rr * 1.2 * q} ${rr * q} 0 0 1 ${cx + rr * 1.2 * q} ${y0}`, "none", { stroke: col, "stroke-width": 6 * q })); cloud(c.land, cx - 74 * q, y0, 1.1 * q, "#ffffff"); cloud(c.land, cx + 74 * q, y0, 1.1 * q, "#ffffff"); bunting(c, c.frame === "wide" ? c.hz - 50 : 18); },
      path(c) { [[60, -6], [130, 8], [210, -10], [280, 6]].forEach(([x, dy]) => cloud(c.land, x, c.G + 8 + dy, .9 * c.k, "#ffffff")); }
    },
    machi: {
      land(c) {
        const g0 = c.land, hz = c.hz, G = c.G, k = c.k, close = c.frame === "close", night = c.time === "night";
        if (close) {
          R(g0, 0, 40, W, hz + 26, "#e6b98e"); for (let y = 46; y < hz + 60; y += 12) for (let x = (y / 12) % 2 ? -10 : 0; x < W; x += 24) R(g0, x, y, 22, 10, "#d9a77c", { rx: 1.5 });
          R(g0, 40, 70, 90, 70, "#fff3d6", { rx: 4 }); R(g0, 46, 76, 78, 58, "#a8c8dc", { rx: 3 }); L(g0, "M85 76v58M46 104h78", "#fff3d6", 3);
          P(g0, "M30 66 H140 L132 50 H38Z", "#c4604f"); for (let i = 0; i < 5; i++) P(g0, `M${30 + i * 22} 66 q11 10 22 0`, "#f6efe2");
          R(g0, 190, 54, 100, 100, "#7f8fb0"); C(g0, 240, 92, 24, "#fff7d6", { stroke: "#5a6688", "stroke-width": 4 }); L(g0, "M240 92v-14M240 92h10", "#3a3f5c", 3);
          R(g0, 0, hz + 26, W, 200, "#b9ab98"); for (let x = -10; x < W; x += 30) L(g0, `M${x} ${hz + 26}l-14 ${200 - hz}`, "#a89a86", 1.4);
          if (night) { R(c.glow, 46, 76, 78, 58, "#ffe08a", { rx: 3, opacity: .85 }); C(c.glow, 240, 92, 26, c.halo); }
          return;
        }
        // 遠くの屋根
        for (let i = 0; i < 12; i++) R(g0, i * 28 - 4, hz - 34 - ((i * 37) % 22), 26, 60, "#c9b8c8", { opacity: .6 });
        const B = [[14, 64, 82, "#c9785a", "roof"], [86, 44, 116, "#7f8fb0", "clock"], [138, 66, 74, "#e0a85a", "shop"], [212, 78, 98, "#9c6b8e", "flat"]];
        const q = c.frame === "mid" ? 1 : c.frame === "low" ? .55 : .62;
        for (let off = 0; off < W; off += 300 * q) B.forEach(([x, w, h, col, type], bi) => {
          const bx = off + x * q, bw = w * q, bh = h * q, top = hz + 22 - bh;
          if (bx > W) return;
          R(g0, bx, top, bw, bh, col);
          if (type === "roof") P(g0, `M${bx - 6 * q} ${top + 2} L${bx + bw / 2} ${top - bh * .28} L${bx + bw + 6 * q} ${top + 2}Z`, "#8e4e3c");
          if (type === "clock") { R(g0, bx + bw * .36, top - bh * .18, bw * .28, bh * .18, col); P(g0, `M${bx + bw * .3} ${top - bh * .18} L${bx + bw / 2} ${top - bh * .32} L${bx + bw * .7} ${top - bh * .18}Z`, "#5a6688"); C(g0, bx + bw / 2, top + bh * .16, bw * .2, "#fff7d6", { stroke: "#5a6688", "stroke-width": 1.5 }); L(g0, `M${bx + bw / 2} ${top + bh * .16}v-${bw * .12}h${bw * .1}`, "#3a3f5c", 1.4); }
          if (type === "shop") { P(g0, `M${bx - 4 * q} ${top + bh * .42} H${bx + bw + 4 * q} L${bx + bw} ${top + bh * .3} H${bx}Z`, "#c4604f"); for (let i = 0; i < 4; i++) P(g0, `M${bx - 4 * q + i * (bw + 8 * q) / 4} ${top + bh * .42} q${(bw + 8 * q) / 8} ${5 * q} ${(bw + 8 * q) / 4} 0`, "#f6efe2"); }
          const cols = Math.max(2, Math.round(bw / 18)), rows = Math.max(2, Math.round(bh / 26));
          for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
            if (type === "shop" && j < 2) continue;
            const wx = bx + 6 * q + i * (bw - 12 * q) / cols, wy = top + (type === "clock" ? bh * .38 : 10 * q) + j * (bh * .62) / rows, ww = (bw - 12 * q) / cols - 4 * q, wh = Math.min(12 * q, bh * .62 / rows - 5 * q);
            R(g0, wx, wy, ww, wh, "#fff3b0");
            if (night && ((i * 3 + j * 5 + bi) % 3)) { R(c.glow, wx, wy, ww, wh, "#ffd97a"); C(c.glow, wx + ww / 2, wy + wh / 2, 10 * q, c.halo); }
          }
        });
        R(g0, 0, hz + 22, W, 200, "#b9ab98"); R(g0, 0, hz + 22, W, 4, "#cfc3b1");
        L(g0, `M0 ${G + 8}H320`, "#e8e0d2", 2, { "stroke-dasharray": "14 10" });
        lamp(c, 64, G - 2, k * 1.4); lamp(c, 270, G - 2, k * 1.4);
      },
      close(c) { lamp(c, 18, 200, 2.4); },
      spot(c) { const g0 = c.land; R(g0, 196, 0, 90, 172, "#7f8fb0"); R(g0, 186, 150, 110, 24, "#5a6688"); C(g0, 241, 52, 30, "#fff7d6", { stroke: "#5a6688", "stroke-width": 5 }); L(g0, "M241 52v-18M241 52h14", "#3a3f5c", 3.4); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; C(g0, 241 + Math.cos(a) * 24, 52 + Math.sin(a) * 24, 1.4, "#3a3f5c"); } R(g0, 226, 112, 30, 38, "#4a5476", { rx: 14 }); },
      wonder(c) { const x = 236, top = c.hz - 96, g0 = c.land; R(g0, x - 26, top, 52, c.hz + 24 - top, "#7f8fb0"); R(g0, x - 32, c.hz + 4, 64, 20, "#5a6688"); P(g0, `M${x - 32} ${top + 2} L${x} ${top - 30} L${x + 32} ${top + 2}Z`, "#5a6688"); R(g0, x - 10, c.hz - 14, 20, 30, "#4a5476", { rx: 9 });
        const cy = top + 30; C(c.glow, x, cy, 46, c.halo); C(c.glow, x, cy, 19, "#fff7d6", { stroke: "#5a6688", "stroke-width": 3 }); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; C(c.glow, x + Math.cos(a) * 15, cy + Math.sin(a) * 15, 1, "#3a3f5c"); } L(c.glow, `M${x} ${cy}v-12M${x} ${cy}h9`, "#3a3f5c", 2.2); C(c.glow, x, cy, 1.8, "#3a3f5c"); },
      fest(c) { const y = c.hz + 22; [[24, "#e8544e"], [110, "#4f86d1"], [200, "#f2a43a"]].forEach(([x, col]) => stall(c, x, y, c.k / .82, col)); bunting(c, c.frame === "wide" ? c.hz - 34 : 20); },
      path(c) { R(c.land, 0, 0, 56, 200, "#c9785a"); R(c.land, 264, 0, 56, 200, "#9c6b8e"); for (let j = 0; j < 4; j++) { R(c.land, 14, 20 + j * 44, 18, 22, "#fff3b0"); R(c.land, 282, 30 + j * 44, 18, 22, "#fff3b0"); } L(c.land, "M56 0V200M264 0V200", "#6e4a40", 2); }
    },
    yuki: {
      land(c) {
        const g0 = c.land, hz = c.hz, G = c.G, k = c.k, r = c.r, close = c.frame === "close";
        P(g0, `M-20 ${hz + 10} L70 ${hz - 90} L170 ${hz + 10}Z`, "#e3edf7"); P(g0, `M70 ${hz - 90} L92 ${hz - 64} L80 ${hz - 70} L70 ${hz - 60} L60 ${hz - 70} L48 ${hz - 64}Z`, "#ffffff");
        P(g0, `M130 ${hz + 10} L236 ${hz - 70} L350 ${hz + 10}Z`, "#d4e2f0"); P(g0, `M236 ${hz - 70} L256 ${hz - 52} L246 ${hz - 56} L236 ${hz - 48} L226 ${hz - 56} L216 ${hz - 52}Z`, "#ffffff");
        if (!close) for (let i = 0; i < 9; i++) pine(g0, 8 + i * 36 + r() * 10, hz + 6, .3 + r() * .1, "#5b8a78", "#6e5a48", true);
        P(g0, `M0 ${hz + 4} Q160 ${hz - 16} 320 ${hz + 4} V200 H0Z`, "#ffffff");
        P(g0, `M0 ${hz + 30} Q100 ${hz + 18} 200 ${hz + 28} T320 ${hz + 24}`, "none", { stroke: "#dbe6f2", "stroke-width": 2 });
        if (!close) { pine(g0, 28, G + 12, k * 1.8, "#4f7f6c", "#6e5a48", true); pine(g0, 298, G + 14, k * 2, "#4f7f6c", "#6e5a48", true); snowman(c, 132, hz + 14, k * .7); }
        for (let i = 0; i < 6; i++) O(g0, r() * W, hz + 30 + r() * 60, 10, 2, "#e6eef8");
        if (c.time === "night") for (let i = 0; i < 14; i++) twinkle(c.glow, (r() * W).toFixed(1), (hz + 20 + r() * 70).toFixed(1), 2 + r() * 1.5, "#fff6cf", "twinkle");
      },
      close(c) { P(c.front, "M0 200 Q40 176 90 186 Q120 192 140 200Z", "#ffffff"); P(c.front, "M200 200 Q260 172 330 180 V200Z", "#f4f8fc"); },
      spot(c) { snowman(c, 250, c.G - 6, 2.4); },
      wonder(c) { const r = c.r; for (let i = 0; i < 24; i++) twinkle(c.glow, (r() * W).toFixed(1), (c.hz + 10 + r() * 80).toFixed(1), 2.2 + r() * 2, "#fff6cf", "twinkle"); },
      fest(c) { const n = c.frame === "wide" ? 5 : 3; for (let i = 0; i < n; i++) snowman(c, 30 + i * (260 / (n - 1)), c.hz + 26, c.k * .7, ["#e8544e", "#4f86d1", "#f2a43a", "#5fae82", "#c46ab4"][i]); bunting(c, c.frame === "wide" ? c.hz - 40 : 22); },
      path(c) { for (let i = 0; i < 8; i++) { const x = 20 + i * 38, y = c.G + 10 - (i % 2) * 6; O(c.land, x, y, 5, 2.6, "#d4e0ee"); } }
    },
    okashi: {
      land(c) {
        const g0 = c.land, hz = c.hz, G = c.G, k = c.k, r = c.r, close = c.frame === "close";
        R(g0, 0, hz - 14, W, 40, "#9fd6f0"); L(g0, `M0 ${hz - 4} q20 -4 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`, "#d4f0fb", 1.6);
        O(g0, 70, hz - 10, 40, 22, "#f7a8c4"); O(g0, 250, hz - 8, 46, 26, "#a8dcc0"); O(g0, 160, hz - 6, 30, 16, "#f6d36b");
        P(g0, `M0 ${hz + 8} Q160 ${hz - 16} 320 ${hz + 8} V200 H0Z`, "#f4c98a"); P(g0, `M0 ${hz + 14} Q160 ${hz - 8} 320 ${hz + 14} V200 H0Z`, "#fbe0b0");
        for (let i = 0; i < 26; i++) C(g0, r() * W, hz + 18 + r() * (200 - hz - 18), 1.2, ["#e8544e", "#4f86d1", "#5fae82", "#f2a43a"][i % 4]);
        if (!close) { lolly(c, 34, G + 6, k * 1.8, "#ff8fab"); lolly(c, 290, G + 8, k * 1.7, "#8fd6b0"); lolly(c, 230, hz + 18, k * 1.1, "#f6d36b"); P(g0, `M100 ${hz + 18} l${12 * k * 1.4} -${26 * k * 1.4} l${12 * k * 1.4} ${26 * k * 1.4}z`, "#c98a5a"); C(g0, 100 + 12 * k * 1.4, hz + 18 - 26 * k * 1.4, 4 * k * 1.4, "#fff"); }
      },
      close(c) { lolly(c, 300, 200, 3, "#ff8fab"); const m = g(c.front, "translate(20 196)"); R(m, -14, -18, 30, 22, "#fff4f8", { rx: 9 }); R(m, -14, -18, 30, 22, "none", { rx: 9, stroke: "#f2c4d4", "stroke-width": 1.5 }); },
      spot(c) { const s = g(c.land, `translate(250 ${c.G - 10})`); C(s, 0, 0, 52, "#d9a066"); C(s, 0, 0, 46, "#e8b47a"); for (let i = 0; i < 9; i++) { const a = i * .7; O(s, Math.cos(a) * 28, Math.sin(a) * 28 - 4, 5, 3.4, "#6e3f24"); } },
      wonder(c) { const y = c.hz + 22; P(c.land, `M0 ${y} q40 -10 80 0 t80 0 t80 0 t80 0 V${y + 18} q-40 10 -80 0 t-80 0 t-80 0 t-80 0Z`, "#7b4a2c"); L(c.land, `M0 ${y + 6} q40 -8 80 0 t80 0 t80 0 t80 0`, "#a8704a", 2, { class: "flow" }); },
      fest(c) { stall(c, 40, c.hz + 22, c.k / .82, "#c98a5a", true); stall(c, 210, c.hz + 22, c.k / .82, "#ff8fab", true); bunting(c, c.frame === "wide" ? c.hz - 40 : 20); },
      path(c) { for (let i = 0; i < 6; i++) { const x = 30 + i * 52, y = c.G + 8 - (i % 2) * 8; R(c.land, x - 14, y - 7, 28, 14, "#fff4f8", { rx: 7, stroke: "#f2c4d4", "stroke-width": 1.4 }); } }
    }
  };
  function shell(p, x, y, s, col) { const t = g(p, `translate(${x.toFixed ? x.toFixed(1) : x} ${y.toFixed ? y.toFixed(1) : y}) scale(${s})`); P(t, "M-4 0 Q-5 -6 0 -6 Q5 -6 4 0Z", col); L(t, "M0 0V-5M-2 0l-1 -4M2 0l1 -4", "#d9a0a0", .5); }
  function lantern(c, x, y, s, col) { const t = g(c.land, `translate(${x} ${y}) scale(${s})`); L(t, "M0 -6V-2", "#6e4a30", 1); O(t, 0, 4, 5, 6.5, col); L(t, "M-5 2h10M-5 6h10", "#fff", .5, { opacity: .6 }); R(t, -2.5, -2, 5, 1.6, "#3a2a20"); R(t, -2.5, 10, 5, 1.6, "#3a2a20"); if (c.time === "night" || c.time === "dusk") { C(c.glow, x, y + 4 * s, 12 * s, c.halo); O(c.glow, x, y + 4 * s, 4 * s, 5.5 * s, "#ffd97a", { opacity: .8 }); } }
  function lamp(c, x, y, s) { const t = g(c.land, `translate(${x} ${y}) scale(${s})`); R(t, -1.5, -40, 3, 40, "#3a3f5c"); P(t, "M-6 -40 h12 l-3 -8 h-6z", "#3a3f5c"); R(t, -4, -46, 8, 6, "#fff3b0"); if (c.time !== "day" && c.time !== "morning") { C(c.glow, x, y - 43 * s, 16 * s, c.halo); R(c.glow, x - 4 * s, y - 46 * s, 8 * s, 6 * s, "#ffe08a"); } }
  function pole(c, x, col) { L(c.land, `M${x} ${c.G + 4}V${c.hz - 30}`, "#8a6a4a", 2); P(c.land, `M${x} ${c.hz - 30} l24 6 -24 6z`, col); }
  function stall(c, x, y, s, col, sweet) { const t = g(c.land, `translate(${x} ${y}) scale(${s})`); R(t, 0, -40, 70, 40, "#f3dcb4"); R(t, 6, -24, 58, 10, "#e8c690"); P(t, "M-6 -40 H76 L70 -54 H0Z", col); for (let i = 0; i < 6; i++) P(t, `M${-6 + i * 13.7} -40 q6.85 8 13.7 0`, "#fff8ec"); if (sweet) { C(t, 18, -30, 5, "#ff8fab"); C(t, 35, -30, 5, "#8fd6b0"); C(t, 52, -30, 5, "#f6d36b"); } else { C(t, 20, -30, 4, "#e8544e"); C(t, 35, -31, 4, "#f2a43a"); C(t, 50, -30, 4, "#5fae82"); } lanternRaw(c, x + 4 * s, y - 52 * s, s * .9); lanternRaw(c, x + 66 * s, y - 52 * s, s * .9); }
  function lanternRaw(c, x, y, s) { lantern(c, x, y, s, "#e8544e"); }
  function bunting(c, y) { L(c.land, `M0 ${y} Q160 ${y + 22} 320 ${y}`, "#8a6a4a", 1); const cols = ["#e8544e", "#f6d36b", "#4f86d1", "#5fae82", "#f2a43a", "#c46ab4"]; for (let i = 0; i < 16; i++) { const t = (i + .5) / 16, x = 320 * t, yy = y + 44 * t * (1 - t); P(c.land, `M${x - 6} ${yy} L${x + 6} ${yy} L${x} ${yy + 11}Z`, cols[i % 6]); } }
  function snowman(c, x, y, s, hat) { const t = g(c.land, `translate(${x} ${y}) scale(${s})`); O(t, 0, 2, 18, 3, "rgba(80,100,130,.18)"); C(t, 0, -12, 13, "#fff", { stroke: "#c7d6e6", "stroke-width": 1.4 }); C(t, 0, -32, 9, "#fff", { stroke: "#c7d6e6", "stroke-width": 1.4 }); C(t, -3, -34, 1.3, "#3a3f5c"); C(t, 3, -34, 1.3, "#3a3f5c"); P(t, "M0 -31 l6 1.5 -6 1.5z", "#f2843a"); C(t, 0, -16, 1.3, "#3a3f5c"); C(t, 0, -10, 1.3, "#3a3f5c"); P(t, "M-7 -39 h14 l-2 -9 h-10z", hat || "#58677f"); L(t, "M-12 -14 l-10 -8M12 -14 l10 -8", "#7a5638", 1.6); }
  function lolly(c, x, y, s, col) { const t = g(c.land, `translate(${x} ${y}) scale(${s})`); R(t, -1.6, -34, 3.2, 34, "#fff"); C(t, 0, -40, 11, col); P(t, "M0 -40 m-6 0 a6 6 0 1 0 6 -6", "none", { stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round" }); }

  // ---------- へや（ねる場面・あさの場面） ----------
  function room(c, d) {
    const g0 = c.land, night = c.time === "night";
    R(g0, 0, 0, W, 150, night ? "#e9d2b0" : "#f6e6c8"); R(g0, 0, 0, W, 150, "url(#" + c.id + "wall)");
    R(g0, 0, 146, W, 6, "#c9a77c"); R(g0, 0, 152, W, 48, "#d8b48a"); for (let y = 160; y < 200; y += 12) L(g0, `M0 ${y}H320`, "#c9a077", 1);
    // まどと、そとのけしき
    const wx = 30, wy = 26, ww = 96, wh = 76;
    R(g0, wx - 6, wy - 6, ww + 12, wh + 12, "#fff8ec", { rx: 4 });
    const view = E("svg", { x: wx, y: wy, width: ww, height: wh, viewBox: "60 20 200 150", preserveAspectRatio: "xMidYMid slice" }, g0);
    backdrop(view, Object.assign({}, c, { frame: "wide", sub: true, moonX: 200, moonY: 50, moonR: 13, sunX: 210 }));
    L(g0, `M${wx + ww / 2} ${wy}V${wy + wh}M${wx} ${wy + wh / 2}H${wx + ww}`, "#fff8ec", 4);
    P(g0, `M${wx - 12} ${wy - 12} H${wx + 22} Q${wx + 10} ${wy + 40} ${wx + 16} ${wy + wh + 14} H${wx - 12}Z`, "#e98a8a"); P(g0, `M${wx + ww + 12} ${wy - 12} H${wx + ww - 22} Q${wx + ww - 10} ${wy + 40} ${wx + ww - 16} ${wy + wh + 14} H${wx + ww + 12}Z`, "#e98a8a");
    R(g0, wx - 16, wy - 16, ww + 32, 6, "#b07c52", { rx: 3 });
    // たなと、かざり
    R(g0, 200, 46, 80, 5, "#b07c52"); R(g0, 212, 30, 10, 16, "#5fae82", { rx: 2 }); C(g0, 236, 38, 8, "#e8544e"); R(g0, 254, 26, 16, 20, "#4f86d1", { rx: 2 }); R(g0, 257, 30, 10, 10, "#fff8ec");
    if (d.morning) { P(c.glow, `M${wx + ww} ${wy} L${wx + ww + 130} 200 H${wx + 60} L${wx} ${wy + wh}Z`, "#fff6c8", { opacity: .22 }); O(g0, 214, 176, 78, 13, "#e8a07a"); O(g0, 214, 176, 70, 10, "none", { stroke: "#fbe3c4", "stroke-width": 1.6, "stroke-dasharray": "4 4" }); return; }
    // ふとん
    R(g0, 130, 156, 176, 30, "#fbf7ee", { rx: 10 }); R(g0, 130, 176, 176, 10, "#e9dfcc", { rx: 5 });
    if (night) { P(c.glow, `M${wx + 10} ${wy + wh} L${wx + 120} 200 H${wx + 210} L${wx + ww} ${wy}Z`, "#fff3c0", { opacity: .12 }); const lx = 296, ly = 120; R(g0, lx - 2, ly, 4, 32, "#8a6a4a"); P(g0, `M${lx - 14} ${ly} h28 l-6 -20 h-16z`, "#f6d9a0"); C(c.glow, lx, ly - 8, 46, c.halo); P(c.glow, `M${lx - 14} ${ly} h28 l-6 -20 h-16z`, "#ffe7a8", { opacity: .8 }); }
  }
  function bed(c, d) {
    const id = c.book.hero, pillowX = 170, pillowY = 152, s = .62;
    O(c.cast, pillowX, pillowY, 28, 11, "#ffffff", { stroke: "#e2d6c0", "stroke-width": 1.5 });
    if (d.sitUp) { const t = g(c.cast, `translate(${pillowX + 20} 166) scale(.74)`); drawHero(t, id, { pose: "stand", face: d.face || "awake" }); }
    else { const t = g(c.cast, `translate(${pillowX + 2} ${pillowY - 10}) rotate(-14) scale(${s}) translate(0 64)`); heroHead(t, id, d.face || "sleep"); }
    const bx = d.sitUp ? 150 : 176;
    P(c.cast, `M${bx} 150 Q${bx + 10} ${d.sitUp ? 152 : 138} ${bx + 50} ${d.sitUp ? 150 : 140} Q${bx + 110} 138 302 150 L304 182 Q216 190 ${bx - 4} 182Z`, "url(#" + c.id + "quilt)", { stroke: "#5f7fb0", "stroke-width": 1.2 });
    P(c.cast, `M${bx} 150 Q${bx + 10} ${d.sitUp ? 152 : 138} ${bx + 50} ${d.sitUp ? 150 : 140} Q${bx + 110} 138 302 150`, "none", { stroke: "#fbf7ee", "stroke-width": 5, "stroke-linecap": "round" });
    // すきなもの（ねるときのおき場所）
    const t = c.book.thing, place = d.thingAt;
    if (place === "bed" || place === "beside") {
      const spot = place === "beside" ? { fusen: [124, 150, 0, .85, "g"], taiko: [118, 176, 0, .62, "c"], boshi: [122, 172, -8, .58, "c"], kasa: [116, 176, -30, .7, "c"], bidama: [130, 172, 0, .5, "c"], mafura: [116, 176, 0, .62, "c"] }
        : { fusen: [130, 148, -6, .85, "g"], taiko: [118, 176, 0, .62, "c"], boshi: [236, 74, 0, .6, "c"], kasa: [116, 172, -24, .7, "c"], bidama: [134, 170, 0, .5, "c"], mafura: [252, 150, 0, .64, "c"] };
      const [x, y, rot, sc, an] = spot[t];
      if (place === "bed" && t === "boshi") { L(c.land, "M236 58v6", "#8a6a4a", 2.4); C(c.land, 236, 58, 2.5, "#8a6a4a"); }
      thing(c.cast, t, x, y, sc, an, rot, t === "fusen" ? "sway" : null);
      if (t === "bidama" && c.glow) { C(c.glow, x, y, 14, c.halo); twinkle(c.glow, x + 6, y - 8, 4, "#fff6cf", "twinkle"); }
    }
  }

  // ---------- 動き・きもちの記号 ----------
  function fxDraw(c, list, pos) {
    const fx = c.fx, r = c.r;
    (list || []).forEach(f => {
      const k = typeof f === "string" ? f : f.k, at = pos[(f && f.at) || 0] || pos[0] || { x: 160, y: 80, s: 1 };
      if (k === "hearts") [[-30, 10, .9], [30, -4, 1.1], [40, 26, .7]].forEach(([dx, dy, s]) => heart(fx, at.x + dx * at.s, at.y + dy * at.s, s * at.s * 1.1, "#ef7f8f", "float"));
      if (k === "sparkle") [[-38, 20], [36, 4], [44, 40], [-26, -6]].forEach(([dx, dy], i) => twinkle(fx, at.x + dx * at.s, at.y + dy * at.s, (i % 2 ? 4 : 6) * at.s, "#ffe27a", "twinkle"));
      if (k === "zzz") { const t = g(fx, `translate(${at.x + 26} ${at.y - 12})`, { class: "float" }); [[0, 0, 9], [10, -12, 11], [22, -26, 13]].forEach(([x, y, s]) => L(t, `M${x} ${y}h${s * .7}l-${s * .7} ${s * .7}h${s * .7}`, "#fff6cf", 2)); }
      if (k === "question") [[-26, -4, 1], [24, -14, 1.2]].forEach(([dx, dy, s]) => { const t = g(fx, `translate(${at.x + dx * at.s} ${at.y + dy * at.s}) scale(${s * at.s})`, { class: "float" }); L(t, "M-4 -6 q0 -6 5 -6 q5 0 5 5 q0 4 -5 5 v3", "#7a5a8a", 2.4); C(t, 1, 7, 1.5, "#7a5a8a"); });
      if (k === "bang") { const t = g(fx, `translate(${at.x + 26 * at.s} ${at.y - 4 * at.s}) scale(${at.s})`); L(t, "M0 0 l4 -12M10 4 l10 -8M12 14 l12 -2", "#e8544e", 2.4); }
      if (k === "sob") { const t = g(fx, `translate(${at.x} ${at.y})`, { class: "float" }); L(t, "M-18 -2 q-6 -6 0 -12M-24 4 q-10 -10 0 -22M18 -2 q6 -6 0 -12M24 4 q10 -10 0 -22", "#6aa8d8", 1.8); }
      if (k === "gloom") { const t = g(fx, `translate(${at.x} ${at.y - 16 * at.s}) scale(${at.s * 1.3})`); cloud(t, 0, 0, .7, "#9aa3b8", .9); L(t, "M-8 10 l-2 6M0 10 l-2 6M8 10 l-2 6", "#8fc8ec", 1.6); }
      if (k === "notes") [[40, -10, "#e8544e"], [70, -30, "#4f86d1"], [100, -12, "#5fae82"], [-40, -20, "#f2a43a"]].forEach(([dx, dy, col]) => note(fx, at.x + dx * at.s, at.y + dy * at.s, at.s * 1.1, col));
      if (k === "confetti") for (let i = 0; i < 26; i++) R(fx, (r() * W).toFixed(1), (r() * 120).toFixed(1), 3, 5, ["#e8544e", "#f6d36b", "#4f86d1", "#5fae82", "#c46ab4"][i % 5], { class: i % 2 ? "float" : null });
      if (k === "puffs") [[-24, -2], [-34, -6]].forEach(([dx, dy], i) => C(fx, at.x + dx * at.s, at.foot + dy * at.s, (4 - i) * at.s, "#fff", { opacity: .7 }));
      if (k === "rush") L(fx, `M${at.x + 30 * at.s} ${at.y + 20 * at.s}h${30 * at.s}M${at.x + 34 * at.s} ${at.y + 36 * at.s}h${36 * at.s}M${at.x + 30 * at.s} ${at.y + 52 * at.s}h${26 * at.s}`, "#fff", 2.4, { opacity: .8 });
      if (k === "bubble") { const t = g(fx, `translate(${at.x + 18 * at.s} ${at.y - 18 * at.s}) scale(${at.s})`); R(t, -2, -22, 38, 20, "#fff", { rx: 10, stroke: "#c9bba5", "stroke-width": 1.2 }); P(t, "M6 -3 l-6 10 12 -9z", "#fff"); C(t, 9, -12, 2, "#9a8a7a"); C(t, 17, -12, 2, "#9a8a7a"); C(t, 25, -12, 2, "#9a8a7a"); }
      if (k === "hello") { const t = g(fx, `translate(${at.x - 36 * at.s} ${at.y - 6 * at.s}) scale(${at.s})`); R(t, -24, -20, 34, 20, "#fff", { rx: 10, stroke: "#c9bba5", "stroke-width": 1.2 }); P(t, "M2 -3 l8 8 -2 -10z", "#fff"); P(t, "M-7 -18 l3.5 4 l-3.5 4 l-3.5 -4z", "#f6d36b"); heart(t, -7, -10, .5, "#ef7f8f"); }
      if (k === "nod") L(fx, `M${at.x - 20 * at.s} ${at.y + 8 * at.s}q-4 8 0 16M${at.x + 20 * at.s} ${at.y + 8 * at.s}q4 8 0 16`, "#fff6cf", 1.6);
    });
  }
  // すきなものが、ページの出来事に合わせて動く
  function thingEvent(c, d, pos) {
    const t = c.book.thing, fx = c.fx, hero = pos[0];
    if (d.lost) {
      const mode = { fusen: "fly", boshi: "fly", kasa: "fly", mafura: "fly", bidama: "roll", taiko: "gone" }[t];
      if (mode === "fly") { thing(c.cast, t, 262, 52, THING[t].s * .55, "c", 24, "drift"); L(fx, "M150 70 q30 -20 60 -10 t40 -10M140 96 q40 -16 80 -4M170 120 q30 -14 60 -6", "#ffffff", 2.4, { opacity: .85 }); P(fx, "M196 66 q12 -10 22 0 q6 8 -2 12 q-8 2 -8 -6", "none", { stroke: "#fff", "stroke-width": 2, opacity: .85 }); }
      if (mode === "roll") { thing(c.cast, t, 284, c.G - 4, .3, "c", 0); L(fx, `M200 ${c.G}q20 -14 40 0t40 0`, "#ffffff", 2, { "stroke-dasharray": "3 6", opacity: .9 }); L(fx, `M296 ${c.G - 18}l8 -6M300 ${c.G - 8}h10`, "#ffffff", 2); }
      if (mode === "gone") { const x = hero.x + 52 * hero.s, y = c.G - 14 * hero.s; E("use", { href: "#t-taiko", x: -30, y: -34, width: 60, height: 60, transform: `translate(${x} ${y}) scale(${.62 * hero.s})`, opacity: .18 }, c.cast); O(fx, x, y, 22 * hero.s, 20 * hero.s, "none", { stroke: "#fff", "stroke-width": 2, "stroke-dasharray": "4 5" }); fxDraw(c, [{ k: "question" }], [{ x: x, y: y - 26 * hero.s, s: hero.s }]); }
    }
    if (d.signal) {
      const hx = hero.hand ? hero.hand[0] : hero.x, hy = hero.hand ? hero.hand[1] - 14 * hero.s : hero.foot - 110 * hero.s;
      const kind = { fusen: "float", taiko: "waves", boshi: "swish", kasa: "rays", bidama: "rays", mafura: "swish" }[t];
      if (kind === "waves") for (let i = 1; i < 4; i++) { L(fx, `M${hx + 18 * i} ${hy - 12 * i} a${16 * i} ${16 * i} 0 0 1 0 ${30 * i}`, "#fff6cf", 2.4, { opacity: 1 - i * .2 }); L(fx, `M${hx - 18 * i - 10} ${hy - 12 * i} a${16 * i} ${16 * i} 0 0 0 0 ${30 * i}`, "#fff6cf", 2.4, { opacity: 1 - i * .2 }); }
      if (kind === "rays") { C(fx, hx, hy, 34, c.halo); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; L(fx, `M${hx + Math.cos(a) * 22} ${hy + Math.sin(a) * 22}L${hx + Math.cos(a) * 36} ${hy + Math.sin(a) * 36}`, "#ffe27a", 2.4, { class: "twinkle" }); } }
      if (kind === "swish") L(fx, `M${hx - 28} ${hy - 10} q28 -26 56 0M${hx - 34} ${hy + 2} q34 -32 68 0`, "#ffffff", 2.4, { opacity: .9 });
      if (kind === "float") { L(fx, `M${hx - 20} ${hy - 30} l-8 -8M${hx + 20} ${hy - 30} l8 -8M${hx} ${hy - 44} v-10`, "#e8544e", 2.4); }
    }
    if (d.tfest) {
      const hx = hero.hand ? hero.hand[0] : hero.x, hy = hero.hand ? hero.hand[1] - 10 * hero.s : hero.foot - 110 * hero.s;
      if (t === "fusen") { C(c.glow, hx + 12 * hero.s, hy - 4, 70, c.halo); for (let i = 0; i < 7; i++) C(c.glow, 30 + i * 44, 30 + (i % 2) * 14, 3, ["#ffe27a", "#ff9aa8", "#9fd8f0"][i % 3], { class: "twinkle" }); }
      if (t === "taiko") [[40, -30], [80, -60], [-40, -50], [-80, -20], [110, -20]].forEach(([dx, dy], i) => note(fx, hx + dx, hy - dy * .2 + 10, 1.3, ["#e8544e", "#4f86d1", "#5fae82", "#f2a43a", "#c46ab4"][i]));
      if (t === "boshi") for (let i = 0; i < 6; i++) flower(fx, hx + (i - 2.5) * 5 * hero.s, hy + 2 - (i % 2) * 4, 1.5 * hero.s, ["#f6b8c4", "#fff", "#f6d36b", "#e8544e"][i % 4]);
      if (t === "kasa") O(fx, hx, hero.foot - 4, 120, 18, "none", { stroke: "#fff6cf", "stroke-width": 2, "stroke-dasharray": "2 7", opacity: .9 });
      if (t === "bidama") [[-70, 50], [60, 34], [110, 70], [-110, 30]].forEach(([dx, dy]) => { const t2 = g(fx, `translate(${hx + dx} ${dy})`, { class: "float" }); ["#f28a8a", "#f6d36b", "#9fd6a8", "#8fc4ec"].forEach((col, i) => L(t2, `M${-14 + i * 2} 0 a${14 - i * 2} ${12 - i * 2} 0 0 1 ${28 - i * 4} 0`, col, 2.4)); });
      if (t === "mafura") { const y0 = hero.foot - 10; L(c.cast, `M${hero.x - 150} ${y0 - 4} Q${hero.x - 70} ${y0 + 4} ${hero.x} ${y0} Q${hero.x + 70} ${y0 + 4} ${hero.x + 150} ${y0 - 4}`, "#e06a6a", 4.5); L(c.cast, `M${hero.x - 150} ${y0 - 4} Q${hero.x - 70} ${y0 + 4} ${hero.x} ${y0} Q${hero.x + 70} ${y0 + 4} ${hero.x + 150} ${y0 - 4}`, "#fff", 1.2, { "stroke-dasharray": "2 8" }); }
    }
  }
  function dream(c, what) {
    const fx = c.fx, cx = 236, cy = 44;
    C(fx, 196, 124, 4, "#fff8ec", { opacity: .9 }); C(fx, 206, 104, 6, "#fff8ec", { opacity: .9 });
    const b = g(fx, null, { class: "float" });
    [[-34, 4, 22], [-12, -12, 26], [16, -10, 24], [36, 6, 20], [10, 18, 24], [-18, 18, 22]].forEach(([dx, dy, r]) => C(b, cx + dx, cy + dy, r, "#fff8ec"));
    const clipId = c.id + "dclip"; const cp = E("clipPath", { id: clipId }, c.defs); O(cp, cx, cy + 4, 56, 34, "#fff");
    const inner = g(b, null, { "clip-path": "url(#" + clipId + ")" }); O(inner, cx, cy + 4, 56, 34, "#e9f0fb");
    const fk = PLACE_FR[c.book.place];
    if (what === "family") { const m = g(inner, `translate(${cx - 14} ${cy + 34}) scale(.8)`); drawFriend(m, fk, { face: "happy", bow: true }); const ch = g(inner, `translate(${cx + 20} ${cy + 34}) scale(.5)`); drawFriend(ch, fk, { face: "happy" }); heart(inner, cx + 4, cy - 16, .8, "#ef7f8f"); }
    else if (what === "fest") { for (let i = 0; i < 4; i++) { const x = cx - 36 + i * 24; lanternTo(inner, x, cy - 18 + (i % 2) * 4, ["#e8544e", "#f2a43a", "#f6d36b", "#e8544e"][i]); } const m = g(inner, `translate(${cx} ${cy + 36}) scale(.6)`); drawFriend(m, fk, { face: "happy", pose: "jump" }); }
    else { const m = g(inner, `translate(${cx} ${cy + 34}) scale(.75)`); drawFriend(m, fk, { face: "happy" }); twinkle(inner, cx - 30, cy - 10, 5, "#f6d36b"); twinkle(inner, cx + 30, cy - 4, 4, "#f6d36b"); }
  }
  function lanternTo(p, x, y, col) { L(p, `M${x} ${y - 6}V${y - 2}`, "#6e4a30", 1); O(p, x, y + 4, 5, 6.5, col); R(p, x - 2.5, y - 2, 5, 1.6, "#3a2a20"); R(p, x - 2.5, y + 10, 5, 1.6, "#3a2a20"); }

  // ---------- 背景だけを描く（へやの窓の中にも使う） ----------
  const FRAME = { wide: { G: 160, k: .5, hz: 124 }, mid: { G: 178, k: .8, hz: 138 }, low: { G: 192, k: .44, hz: 166 }, close: { G: 204, k: 1.32, hz: 150 } };
  function backdrop(par, c) {
    const f = FRAME[c.frame];
    const cc = Object.assign({}, c, { G: f.G, k: f.k, hz: f.hz, r: rng(hash(c.place + c.frame + (c.seed || ""))) });
    cc.sky = g(par); cc.land = g(par, null, cc.tint ? { filter: "url(#" + c.id + "fl)" } : null); cc.front = g(par, null, cc.tint ? { filter: "url(#" + c.id + "fl)" } : null);
    cc.glow = c.sub ? g(par) : c.glow;
    if (c.sub) cc.glowOnTop = true;
    sky(cc); const pl = PLACES[c.place]; pl.land(cc);
    if (cc.frame === "close" && pl.close) pl.close(cc);
    return cc;
  }

  // ---------- 一場面を組み立てる ----------
  function draw(svgEl, book, d, opts) {
    svgEl.textContent = "";
    opts = opts || {};
    const id = "s" + (draw.n = (draw.n || 0) + 1) + "-";
    const defs = E("defs", null, svgEl);
    const time = d.time || "day", tint = TINT[d.set === "room" && time === "night" ? "lamp" : time];
    const mkF = (name, m, wob) => { const f = E("filter", { id: id + name, x: "-5%", y: "-5%", width: "110%", height: "110%", "color-interpolation-filters": "sRGB" }, defs); let src = "SourceGraphic"; if (wob) { E("feTurbulence", { type: "fractalNoise", baseFrequency: ".045", numOctaves: 2, seed: 3, result: "n" }, f); E("feDisplacementMap", { in: src, in2: "n", scale: 2.2, result: "d" }, f); src = "d"; } if (m) E("feColorMatrix", { in: src, type: "matrix", values: m }, f); else if (wob) E("feOffset", { in: src }, f); };
    mkF("fl", tint && tint.land, true); mkF("fc", tint && tint.cast, true);
    const pw = E("pattern", { id: id + "wall", width: 24, height: 24, patternUnits: "userSpaceOnUse" }, defs); C(pw, 6, 6, 2, "#e8c99c"); C(pw, 18, 18, 2, "#ecc9b4"); P(pw, "M18 4 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1z", "#e3c08e");
    const pq = E("pattern", { id: id + "quilt", width: 18, height: 18, patternUnits: "userSpaceOnUse" }, defs); R(pq, 0, 0, 18, 18, "#8fb0d8"); star5(pq, 9, 9, 3.4, "#f6d36b"); C(pq, 0, 0, 1.4, "#fff"); C(pq, 18, 18, 1.4, "#fff");
    const halo = rad(defs, id + "halo", "#ffe7a0", "#ffe7a0", .55);
    const c = { id, defs, book, place: book.place, time, frame: d.set === "room" ? "mid" : (d.shot || "mid"), tint: true, halo, seed: d.seed || "" };
    if (d.moon === "big") Object.assign(c, { moonX: 236, moonY: 64, moonR: 34 });
    if (d.house === "right") c.moonX = 70;
    c.d = d;
    const f = FRAME[c.frame]; Object.assign(c, { G: f.G, k: f.k, hz: f.hz });
    const bgLayer = g(svgEl);
    c.glow = g(null); // あとで上にのせる光
    let bc;
    if (d.set === "room") {
      c.sky = g(bgLayer); c.land = g(bgLayer, null, { filter: "url(#" + id + "fl)" }); c.front = g(bgLayer); c.r = rng(hash(book.place + "room"));
      room(c, d); bc = c;
    } else {
      bc = backdrop(bgLayer, c);
      Object.assign(c, { sky: bc.sky, land: bc.land, front: bc.front, r: bc.r });
      const pl = PLACES[book.place];
      if (d.spot && pl.spot) pl.spot(c);
      if (d.wonder && pl.wonder) pl.wonder(c);
      if (d.fest && pl.fest) pl.fest(c);
      if (d.path && pl.path) pl.path(c);
      if (d.house) house(c, d.house === "left" ? 58 : 262, c.k * 1.5, time === "night" || time === "dusk", !!d.door);
    }
    svgEl.appendChild(c.glow);
    c.cast = g(svgEl, null, { filter: "url(#" + id + "fc)" });
    c.fx = g(svgEl);
    const pos = [];
    if (d.set === "room" && d.bed) { bed(c, d); pos.push({ x: 176, y: 120, s: .7, foot: 160 }); }
    (d.cast || []).forEach(e => {
      const x = W * e.x, y = c.G + (e.dy != null ? e.dy : c.frame === "close" && e.who !== "hero" ? -18 : 0), s = c.k * (e.s || 1), fl = e.dir === -1 ? -1 : 1;
      const pose = e.jumpOn && d.path && (book.place === "kumo" || book.place === "okashi") ? "jump" : e.pose;
      const wrap = g0(g0(c.cast, `translate(${x.toFixed(1)} ${y})`), null, { class: e.who === "crowd" ? null : "actor" }), wrapS = g0(wrap, `scale(${(s * fl).toFixed(3)} ${s.toFixed(3)})`);
      let top = -110;
      let hand = null;
      if (e.who === "hero") { const r0 = drawHero(wrapS, book.hero, { pose, face: e.face, thing: e.thing ? book.thing : null, mode: e.thing, look: e.look }); top = r0.head; hand = [x + r0.hand[0] * s * fl, y + r0.hand[1] * s]; }
      else if (e.who === "friend" || e.who === "child" || e.who === "mom") {
        const kind = PLACE_FR[book.place];
        const extra = e.gift ? (book.thing === "boshi" ? { wear: "boshi" } : book.thing === "mafura" ? { wear: "mafura" } : { hold: book.thing }) : {};
        const r0 = drawFriend(wrapS, kind, Object.assign({ pose: e.pose, face: e.face, look: e.look, bow: e.who === "mom" }, extra)); top = r0.head;
      } else if (e.who === "crowd") {
        const others = Object.keys(FR).filter(k => k !== PLACE_FR[book.place]);
        (e.n ? others.slice(0, e.n) : others).forEach((k, i, a) => { const span = e.span || 220, xx = (i - (a.length - 1) / 2) * span / Math.max(1, a.length - 1) / s; const t = g(wrapS, `translate(${xx.toFixed(1)} ${(i % 2) * 6})`, { class: i % 2 ? "hop" : "hop2" }); drawFriend(t, k, { face: e.face || "happy", pose: e.pose || (i % 2 ? "jump" : "stand") }); });
        top = -60;
      }
      pos.push({ x, y: y + top * s, s, foot: y, hand });
    });
    thingEvent(c, d, pos);
    const dr = d.dream || (opts.dreamFriend && d.bed ? "friend" : null);
    if (dr) dream(c, dr);
    fxDraw(c, d.fx, pos);
    // 紙の質感とふちの影
    const gr = E("filter", { id: id + "grain", x: 0, y: 0, width: "100%", height: "100%" }, defs);
    E("feTurbulence", { type: "fractalNoise", baseFrequency: ".85", numOctaves: 2, seed: 7, stitchTiles: "stitch" }, gr);
    E("feColorMatrix", { type: "matrix", values: "0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .22  0 0 0 -1.4 .9" }, gr);
    R(svgEl, 0, 0, W, H, "#000", { filter: "url(#" + id + "grain)", opacity: .2, class: "grain" });
    const vg = E("radialGradient", { id: id + "v2", cx: .5, cy: .5, r: .75 }, defs); E("stop", { offset: .6, "stop-color": "#3a2412", "stop-opacity": 0 }, vg); E("stop", { offset: 1, "stop-color": "#3a2412", "stop-opacity": time === "night" ? .35 : .18 }, vg);
    R(svgEl, 0, 0, W, H, "url(#" + id + "v2)");
    if (opts.cover) {
      R(svgEl, 7, 7, W - 14, H - 14, "none", { rx: 8, stroke: "#fbf5e6", "stroke-width": 3, opacity: .95 });
      R(svgEl, 12, 12, W - 24, H - 24, "none", { rx: 5, stroke: "#fbf5e6", "stroke-width": 1, opacity: .8, "stroke-dasharray": "2 4" });
      [[16, 16], [304, 16], [16, 184], [304, 184]].forEach(([x, y]) => star5(svgEl, x, y, 6, "#f2d27a"));
    }
  }
  window.EHON_ART = { draw };
})();
