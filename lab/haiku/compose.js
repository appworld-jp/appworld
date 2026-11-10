// 俳句カメラの句づくり。写真の色と明るさを数え、人が書いた季語と言葉（words.js）を組み合わせて五・七・五にします。
// AI は使いません。すべてこの端末の中で計算します。
(function (root) {
  "use strict";
  const KIGO = root.KIGO || {};
  const W = root.HAIKU_WORDS || { kigo: {}, scenes: [], openers: [], places: [] };
  const TARGET = [5, 7, 5];

  // ---------- 音の数（モーラ）：「ゃゅょぁぃぅぇぉゎ」は数えず、「っ」「ん」「ー」は1音
  const SMALL = new Set([..."ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ"]);
  function mora(kana) {
    let n = 0;
    for (const ch of kana) { if (SMALL.has(ch)) continue; if (/[ぁ-ゖァ-ヺー]/.test(ch)) n++; }
    return n;
  }
  // "[漢字|よみ]かな" → 区切り
  function segs(s) {
    const out = [], re = /\[([^|\]]+)\|([^\]]+)\]|([^[]+)/g; let m;
    while ((m = re.exec(s))) out.push(m[3] ? { t: m[3], r: m[3] } : { t: m[1], r: m[2], ruby: true });
    return out;
  }
  const reading = s => segs(s).map(x => x.r).join("");
  const plain = s => segs(s).map(x => x.t).join("");
  const M = s => mora(reading(s));
  const kanaOnly = s => [...reading(s)].every(ch => /[ぁ-ゖァ-ヺー]/.test(ch));

  // ---------- 季語の見つけ方：歳時記の言葉を長いものから順に探す
  const ALL_KIGO = [];
  Object.keys(KIGO).forEach(se => KIGO[se].forEach(([w, r]) => ALL_KIGO.push({ w, r, se })));
  const BY_LEN = ALL_KIGO.slice().sort((a, b) => b.w.length - a.w.length);
  function kigoIn(text) {
    const found = [];
    for (let i = 0; i < text.length;) {
      const hit = BY_LEN.find(k => text.startsWith(k.w, i));
      if (hit) { found.push(hit.w); i += hit.w.length; } else i++;
    }
    return found;
  }
  // 情景の言葉に入れない、季節を感じさせる言葉（季語が二つにならないように）
  const SEASONAL = ["春", "夏", "秋", "冬", "花", "桜", "雪", "霧", "虹", "夕焼", "涼", "暑", "寒", "冷", "暖", "紅葉", "蝉", "天の川", "稲妻", "蜻蛉", "朧", "陽炎", "炎天", "氷", "霞", "霜", "露", "月", "若葉", "青葉", "緑", "落葉", "枯", "時雨", "梅雨", "椿", "菜", "燕", "蛍", "汗", "夕立", "爽", "渡り鳥", "鰯雲", "野分", "台風", "日永", "短夜", "夜長", "星月夜", "木の実", "梅", "柿", "菊", "萩", "芒", "すすき", "蛙", "囀", "日傘", "あたたか", "すずし", "さむ", "つめた", "花火", "祭", "凩", "炬燵", "焚火"];
  const seasonFree = s => { const t = plain(s); return !SEASONAL.some(w => t.includes(w)) && kigoIn(t).length === 0; };

  // ---------- データを確かめる：音の数が合わないもの、季節の言葉が混じるものは使わない
  const dropped = [];
  const keep = (s, n, where, free) => {
    const ok = M(s) === n && (!free || seasonFree(s));
    if (!ok) dropped.push(`${where}: ${plain(s)}（${M(s)}音）`);
    return ok;
  };
  const asForm = f => typeof f === "string" ? { t: f } : f;
  const KG = {};
  Object.keys(W.kigo).forEach(se => {
    KG[se] = [];
    const known = new Map((KIGO[se] || []).map(([w, r]) => [w, r]));
    Object.keys(W.kigo[se]).forEach(w => {
      const d = W.kigo[se][w], r = known.get(w);
      if (!r) { dropped.push(`季語が見つかりません: ${w}`); return; }
      const okForm = (f, where) => {
        const good = M(f.t) === 5 && plain(f.t).includes(w) && reading(f.t).includes(r) && kigoIn(plain(f.t)).length === 1 && kigoIn(plain(f.t))[0] === w;
        if (!good) dropped.push(`${where} ${w}: ${plain(f.t)}（${M(f.t)}音）`);
        return good;
      };
      const top = (d.top || []).map(asForm).filter(f => okForm(f, "上五"));
      const bot = (d.bot || []).map(asForm).filter(f => okForm(f, "下五"));
      if (top.length || bot.length) KG[se].push({ w, r, se, tags: d.tags || [], time: d.time || "any", wx: d.w || "any", in: !!d.in, k: d.k || "", top, bot });
    });
  });
  const SCENES = W.scenes.map((g, i) => ({
    i, tags: g.tags || [], need: g.need || null, time: g.time || "any", wx: g.w || "any", place: g.place || "any",
    m: g.m.filter(s => keep(s, 7, "中七", true)), e: g.e.filter(s => keep(s, 5, "下五", true))
  })).filter(g => g.m.length && g.e.length);
  const OPENERS = W.openers.map(asForm).filter(o => keep(o.t, 5, "上五", true));
  const PLACES = W.places.filter(p => keep(p.t, 7, "中七", true)).map(p => ({ ...p, tags: p.tags || [], time: p.time || "any", wx: p.w || "any" }));
  const phraseCount = Object.values(KG).reduce((a, l) => a + l.reduce((b, k) => b + k.top.length + k.bot.length, 0), 0)
    + SCENES.reduce((a, g) => a + g.m.length + g.e.length, 0) + OPENERS.length + PLACES.length;

  // ---------- 合わせてよいか
  const NEAR = { morning: ["morning", "day"], day: ["day", "morning", "dusk"], dusk: ["dusk", "day"], night: ["night"] };
  const timeOk = (a, b) => a === "any" || b === "any" || NEAR[a].includes(b);
  const wxOk = (a, b) => a === "any" || b === "any" || a === b;
  const CUT = /(や|かな|けり|なり|ぬ|よ|たり|めり)$/;
  const DUP = [..."窓町街空道駅川海山坂灯影雲音声光風星夜白赤青夕鳥石橋森人朝日水雨色波草木葉子茜息家店丘野"];
  const DUP_R = ["あかり", "ひかり"];
  const SAME = [/灯|あかり|明り/, /光|ひかり/]; // 同じものを指す言葉
  function natural(lines) {
    const P = lines.map(plain), R = lines.map(reading);
    if (P.filter(l => CUT.test(l)).length > 1) return false; // 切れ字はひとつまで
    for (const c of DUP) if (P.filter(l => l.includes(c)).length > 1) return false; // 同じ言葉をくり返さない
    for (const c of DUP_R) if (R.filter(l => l.includes(c)).length > 1) return false;
    for (const re of SAME) if (P.filter(l => re.test(l)).length > 1) return false;
    return true;
  }

  // ---------- 写真を読む（RGBA の配列から）
  // px: { w, h, data }（LabImg.pixels の戻り値と同じ形）
  function analyze(px) {
    const data = px.data, W0 = px.w, h = px.h, len = W0 * h;
    let n = 0, sumY = 0, sumY2 = 0, sumS = 0, warm = 0, cool = 0;
    const b = { red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, purple: 0, white: 0, dark: 0 };
    let topY = 0, topN = 0, botY = 0, botN = 0, topBlue = 0, botBlue = 0;
    for (let i = 0; i < len; i++) {
      if (data[i * 4 + 3] < 128) continue;
      const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, bl = data[i * 4 + 2] / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
      const s = mx ? d / mx : 0, Y = 0.299 * r + 0.587 * g + 0.114 * bl;
      let hue = 0;
      if (d) { hue = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; hue = (hue * 60 + 360) % 360; }
      n++; sumY += Y; sumY2 += Y * Y; sumS += s;
      const row = Math.floor(i / W0);
      const isBlue = s > 0.25 && mx > 0.2 && hue >= 165 && hue < 260;
      if (row < h / 3) { topY += Y; topN++; if (isBlue) topBlue++; }
      else if (row >= (2 * h) / 3) { botY += Y; botN++; if (isBlue) botBlue++; }
      if (Y < 0.2) b.dark++;
      if (Y > 0.78 && s < 0.18) b.white++;
      if (s > 0.28 && mx > 0.2) {
        if (hue < 15 || hue >= 340) b.red++; else if (hue < 45) b.orange++; else if (hue < 70) b.yellow++;
        else if (hue < 165) b.green++; else if (hue < 200) b.cyan++; else if (hue < 260) b.blue++; else b.purple++;
        if (hue < 70 || hue >= 330) warm++; else if (hue >= 165 && hue < 270) cool++;
      }
    }
    n = n || 1;
    const f = {};
    Object.keys(b).forEach(k => { f[k] = b[k] / n; });
    f.y = sumY / n; f.sat = sumS / n; f.contrast = Math.sqrt(Math.max(0, sumY2 / n - f.y * f.y));
    f.topY = topN ? topY / topN : f.y; f.botY = botN ? botY / botN : f.y;
    f.topBlue = topN ? topBlue / topN : 0; f.botBlue = botN ? botBlue / botN : 0;
    f.warm = warm / n; f.cool = cool / n;
    f.hues = ["red", "orange", "yellow", "green", "cyan", "blue", "purple"].filter(k => f[k] > 0.06).length;
    return f;
  }
  const MOOD_NAMES = { night: "夜", dusk: "夕焼け", sky: "青空", water: "水", green: "緑", white: "白", red: "赤", quiet: "静か", lively: "にぎやか" };
  function moods(f) {
    const s = {};
    s.night = f.y < 0.36 ? Math.min(1, (0.36 - f.y) / 0.2) * 1.4 + f.dark * 0.6 : 0;
    s.dusk = (f.orange * 2.4 + f.yellow * 0.9 + f.red * 0.6) * (f.warm > f.cool ? 1 : 0.4) * (f.y > 0.15 ? 1 : 0.5);
    s.sky = f.topBlue * 2.2 * (f.topY >= f.botY - 0.05 ? 1 : 0.5) * (f.y > 0.3 ? 1 : 0.3);
    s.water = (f.cyan * 1.6 + f.botBlue * 1.6 + f.blue * 0.5);
    s.green = f.green * 2.6;
    s.white = f.white * 2.2 + (f.sat < 0.15 && f.y > 0.7 ? 0.5 : 0);
    s.red = (f.red * 2.8 + f.purple * 0.6);
    // 暗い写真では、色よりも「夜」を先に読む
    const lit = f.y < 0.22 ? 0.45 : f.y < 0.32 ? 0.75 : 1;
    ["dusk", "sky", "water", "green", "white", "red"].forEach(k => { s[k] *= lit; });
    s.quiet = 0.3 + (f.sat < 0.25 ? 0.35 : 0) + (f.contrast < 0.12 ? 0.25 : 0);
    s.lively = (f.hues >= 4 ? 0.5 : f.hues >= 3 ? 0.2 : 0) + (f.sat > 0.5 ? 0.35 : 0) + (f.contrast > 0.28 ? 0.15 : 0);
    const order = Object.keys(s).sort((a, b) => s[b] - s[a]);
    const top = s[order[0]] || 1, weights = {};
    order.forEach((k, i) => { weights[k] = i < 3 ? (s[k] / top) * [3, 1.6, 0.8][i] : 0; });
    if (order[0] === "white" && f.sat < 0.2) weights.snow = weights.white; // 白くて色の少ない写真は雪や霜を選びやすく
    const time = s.night >= 0.7 && s.night >= s.dusk ? "night" : s.dusk >= 0.6 && f.y < 0.7 ? "dusk" : "day";
    const wx = s.sky >= 0.5 && time === "day" ? "clear" : "any";
    const main = order.filter((k, i) => i < 2 && s[k] >= 0.3 && s[k] >= top * 0.45);
    return { score: s, order, weights, time, wx, main, labels: main.map(k => MOOD_NAMES[k]) };
  }

  // ---------- 乱数（同じ写真なら同じ句から始まる）
  function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hashPixels(data) { let h = 2166136261 >>> 0; for (let i = 0; i < data.length; i += 4) { h ^= (data[i] >> 3) | ((data[i + 1] >> 3) << 5) | ((data[i + 2] >> 3) << 10); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  function wpick(R, items, wf) {
    const ws = items.map(wf), sum = ws.reduce((a, b) => a + b, 0);
    if (!sum) return pick(R, items);
    let x = R() * sum;
    for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  }
  const fit = (tags, wts) => Math.pow(tags.reduce((a, t, i) => a + (wts[t] || 0) * (i ? 0.6 : 1), 0), 1.5); // 先に書いた印ほど強く

  // ---------- 一句つくる
  // mood: moods() の結果（写真がないときは null）／first: その写真の最初の一句
  function compose(season, mood, seed, avoid, first) {
    const sharp = x => first ? x * x : x; // 最初の一句は、写真にいちばん合う言葉を選びやすく
    const md = mood || { weights: {}, time: "any", wx: "any" };
    const R = rng(hash("s" + seed));
    const avoidSet = new Set(avoid || []);
    const all = KG[season] || [];
    for (let relax = 0; relax < 3; relax++) {
      const pt = relax >= 2 ? "any" : md.time, pw = relax >= 1 ? "any" : md.wx;
      let ks = all.filter(k => timeOk(k.time, pt) && wxOk(k.wx, pw));
      if (!ks.length) ks = all;
      for (let tries = 0; tries < 120; tries++) {
        const k = wpick(R, ks, x => sharp(0.08 + fit(x.tags, md.weights)));
        const useB = k.bot.length && (!k.top.length || R() < 0.3);
        let lines = null;
        if (!useB) {
          const forms = k.top.filter(f => timeOk(f.time || k.time, pt));
          if (!forms.length) continue;
          const f = pick(R, forms), ft = f.time || k.time;
          const gs = SCENES.filter(g => timeOk(g.time, ft) && timeOk(g.time, pt) && wxOk(g.wx, k.wx) && wxOk(g.wx, pw) && (k.in ? g.place !== "out" : g.place !== "in") && (!g.need || g.need.some(t => k.tags.includes(t))));
          if (!gs.length) continue;
          const g = wpick(R, gs, x => sharp(0.06 + fit(x.tags, md.weights)));
          lines = [f.t, pick(R, g.m), pick(R, g.e)];
        } else {
          if (k.in) continue;
          const forms = k.bot.filter(f => timeOk(f.time || k.time, pt));
          if (!forms.length) continue;
          const f = pick(R, forms), ft = f.time || k.time;
          const ps = PLACES.filter(p => p.acc.includes(k.k) && timeOk(p.time, ft) && timeOk(p.time, pt) && wxOk(p.wx, k.wx) && wxOk(p.wx, pw));
          if (!ps.length) continue;
          const p = wpick(R, ps, x => sharp(0.3 + fit(x.tags, md.weights)));
          const os = OPENERS.filter(o => !(o.out && p.room) && (!o.in || p.view));
          lines = [pick(R, os).t, p.t, f.t];
        }
        if (lines.some((l, i) => M(l) !== TARGET[i])) continue; // 音の数がちがう句は出さない
        const found = kigoIn(lines.map(plain).join(""));
        if (found.length !== 1 || found[0] !== k.w) continue; // 季語はひとつだけ
        if (!natural(lines)) continue;
        const key = lines.map(plain).join("/");
        if (avoidSet.has(key) && tries < 100) continue;
        return { lines: lines.map(l => ({ t: plain(l), r: reading(l), src: l })), kigo: [k.w, k.r], season, key };
      }
    }
    return null;
  }

  root.HaikuEngine = { mora, segs, reading, plain, M, kanaOnly, kigoIn, analyze, moods, compose, hash, hashPixels, MOOD_NAMES, dropped, phraseCount, seasons: Object.keys(KG), _kg: KG };
})(typeof window !== "undefined" ? window : globalThis);
