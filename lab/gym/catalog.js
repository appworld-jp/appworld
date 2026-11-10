// 種目データを読みこみ、検索用の見出しを作る。通信はしない。
(function (root) {
  "use strict";
  const PARTS = ["胸", "背中", "肩", "腕", "脚", "お尻", "体幹", "有酸素"];
  const PART_WORDS = {
    "胸": ["胸", "むね", "胸筋", "大胸筋", "chest"],
    "背中": ["背中", "せなか", "背筋", "広背筋", "back"],
    "肩": ["肩", "かた", "三角筋", "shoulder", "shoulders"],
    "腕": ["腕", "うで", "二の腕", "上腕", "arm", "arms"],
    "脚": ["脚", "足", "あし", "下半身", "太もも", "legs", "leg"],
    "お尻": ["お尻", "おしり", "尻", "ヒップ", "臀部", "glutes"],
    "体幹": ["体幹", "たいかん", "お腹", "おなか", "腹", "core", "abs"],
    "有酸素": ["有酸素", "ゆうさんそ", "有酸素運動", "cardio"]
  };

  // 全角・半角、カタカナ・ひらがな、大文字・小文字、空白や記号の違いをならす
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFKC").toLowerCase()
      .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s・･\-‐－―_.,、。/／()（）「」'"]/g, "");
  }
  // さらに伸ばす音の違い（ロウ・ロー・ロ）をならす
  function loose(s) {
    return norm(s).replace(/ー/g, "").replace(/([おこそとのほもよろごぞどぼぽょ])う/g, "$1");
  }

  function parse(txt) {
    const list = [];
    let part = null;
    String(txt).split("\n").forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line[0] === "#") { part = line.slice(1).trim(); return; }
      const [name, yomi, syn, kind] = line.split("|");
      const m = /^([wrsm])(\d+(?:\.\d+)?)$/.exec((kind || "").trim());
      list.push({
        name: name.trim(), yomi: (yomi || "").trim(),
        syn: (syn || "").split("、").map(x => x.trim()).filter(Boolean),
        part, type: m ? m[1] : "w", def: m ? Number(m[2]) : 0, i: list.length
      });
    });
    return list;
  }

  // 1種目ぶんの検索キー（重なりは除く）
  function keys(ex) {
    const out = [], seen = new Set();
    [ex.name, ex.yomi].concat(ex.syn).forEach((k, idx) => {
      const l = loose(k);
      if (!l || seen.has(l)) return;
      seen.add(l); out.push({ k: l, label: k, main: idx < 2 });
    });
    return out;
  }

  root.GymCatalog = { PARTS, PART_WORDS, norm, loose, parse, keys };
})(typeof window !== "undefined" ? window : globalThis);
