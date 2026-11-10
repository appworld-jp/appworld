/* 学年・年齢早見 — 計算のしくみ（画面とテストで共通） */
(function (root) {
  "use strict";

  // 元号の始まり（グレゴリオ暦）。明治は改暦後の明治6年1月1日から扱う。
  const ERAS = [
    { name: "令和", start: [2019, 5, 1], y0: 2019 },
    { name: "平成", start: [1989, 1, 8], y0: 1989 },
    { name: "昭和", start: [1926, 12, 25], y0: 1926 },
    { name: "大正", start: [1912, 7, 30], y0: 1912 },
    { name: "明治", start: [1873, 1, 1], y0: 1868 }
  ];
  const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const BRANCH_YOMI = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];
  const SIGNS = [ // [月, 日] から始まる
    [1, 20, "みずがめ座"], [2, 19, "うお座"], [3, 21, "おひつじ座"], [4, 20, "おうし座"],
    [5, 21, "ふたご座"], [6, 22, "かに座"], [7, 23, "しし座"], [8, 23, "おとめ座"],
    [9, 23, "てんびん座"], [10, 24, "さそり座"], [11, 23, "いて座"], [12, 22, "やぎ座"]
  ];
  const IWAI = [
    { age: 60, name: "還暦", yomi: "かんれき", note: "生まれた年の干支に還る年。満60歳（数えで61歳）で祝います。", man: true },
    { age: 66, name: "緑寿", yomi: "ろくじゅ", note: "2002年に百貨店の業界団体が提唱した新しい祝い。満66歳。", man: true },
    { age: 70, name: "古希", yomi: "こき", note: "杜甫の詩「人生七十古来稀なり」から。" },
    { age: 77, name: "喜寿", yomi: "きじゅ", note: "「喜」の草書体が七十七に見えることから。" },
    { age: 80, name: "傘寿", yomi: "さんじゅ", note: "「傘」の略字が八十に見えることから。" },
    { age: 88, name: "米寿", yomi: "べいじゅ", note: "「米」の字が八十八に分けられることから。" },
    { age: 90, name: "卒寿", yomi: "そつじゅ", note: "「卒」の略字「卆」が九十に見えることから。" },
    { age: 99, name: "白寿", yomi: "はくじゅ", note: "「百」から「一」を取ると「白」になることから。" },
    { age: 100, name: "百寿", yomi: "ひゃくじゅ", note: "紀寿（きじゅ）とも。" }
  ];

  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

  function parse(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1873 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > dim(y, mo)) return null;
    return [y, mo, d];
  }
  const pad = n => String(n).padStart(2, "0");
  const fmt = a => `${a[0]}-${pad(a[1])}-${pad(a[2])}`;
  const fromDate = dt => [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];

  // 和暦（日付）
  function wareki(a) {
    for (const e of ERAS) {
      if (cmp(a, e.start) >= 0) {
        const n = a[0] - e.y0 + 1;
        return { era: e.name, year: n, text: `${e.name}${n === 1 ? "元" : n}年` };
      }
    }
    return null;
  }
  // 和暦（年だけ）。改元の年は2つ返す。
  function warekiYear(y) {
    const out = [];
    for (const e of ERAS) {
      const endsAfterStart = y >= e.start[0];
      if (!endsAfterStart) continue;
      const n = y - e.y0 + 1;
      out.push(`${e.name}${n === 1 ? "元" : n}年`);
      if (!(e.start[1] === 1 && e.start[2] === 1) && y === e.start[0]) continue; // 年の途中で始まった元号 → 前の元号も
      break;
    }
    return out.reverse();
  }

  function eto(y) {
    const i = ((y - 4) % 60 + 60) % 60;
    return { kanshi: STEMS[i % 10] + BRANCHES[i % 12], shi: BRANCHES[i % 12], yomi: BRANCH_YOMI[i % 12] };
  }
  function sign(m, d) {
    let s = SIGNS[11][2];
    for (const [sm, sd, name] of SIGNS) if (m > sm || (m === sm && d >= sd)) s = name;
    return s;
  }

  // 満年齢（誕生日が来たら1つ増える。2月29日生まれは平年では3月1日に増える）
  function age(b, t) {
    if (cmp(t, b) < 0) return -1;
    let n = t[0] - b[0];
    if (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) n--;
    return n;
  }
  const kazoe = (b, t) => t[0] - b[0] + 1;

  // 学年の「生まれ年度」：4月2日〜翌年4月1日生まれが同じ学年。
  // 法律では誕生日の前日に年をとるため、4月1日生まれは前の学年（早生まれ）。
  function birthFY(b) { return (b[1] > 4 || (b[1] === 4 && b[2] >= 2)) ? b[0] : b[0] - 1; }
  // ある日が属する学校の年度（4月1日〜翌年3月31日）
  function schoolYear(t) { return t[1] >= 4 ? t[0] : t[0] - 1; }
  const hayaumare = b => birthFY(b) !== b[0];

  // 学年の段（g）：0=小1 … 5=小6、6〜8=中1〜3、9〜11=高1〜3、12〜15=大1〜4、-1=年長、-2=年中、-3=年少
  function gradeLabel(g) {
    if (g >= 0 && g <= 5) return { short: `小${g + 1}`, long: `小学${g + 1}年生`, stage: "小学校" };
    if (g >= 6 && g <= 8) return { short: `中${g - 5}`, long: `中学${g - 5}年生`, stage: "中学校" };
    if (g >= 9 && g <= 11) return { short: `高${g - 8}`, long: `高校${g - 8}年生`, stage: "高校" };
    if (g >= 12 && g <= 15) return { short: `大${g - 11}`, long: `大学${g - 11}年生`, stage: "大学" };
    if (g === -1) return { short: "年長", long: "年長（5歳児クラス）", stage: "幼稚園・保育園" };
    if (g === -2) return { short: "年中", long: "年中（4歳児クラス）", stage: "幼稚園・保育園" };
    if (g === -3) return { short: "年少", long: "年少（3歳児クラス）", stage: "幼稚園・保育園" };
    if (g >= -6 && g <= -4) { const c = g + 6; return { short: `${c}歳児`, long: `${c}歳児クラス`, stage: "保育園" }; }
    if (g < -6) return { short: "", long: "", stage: "" };
    return { short: "卒業", long: "大学卒業の年代", stage: "" };
  }
  function grade(b, t) { return schoolYear(t) - (birthFY(b) + 7); }

  function schools(b) {
    const fy = birthFY(b);
    return [
      { name: "小学校", in: fy + 7, out: fy + 13 },
      { name: "中学校", in: fy + 13, out: fy + 16 },
      { name: "高校", in: fy + 16, out: fy + 19 },
      { name: "大学（4年制）", in: fy + 19, out: fy + 23 }
    ];
  }

  // 年祝い：満で祝う年と、数えで祝う年（数え年 = その年 − 生まれ年 + 1）
  function iwai(b) {
    return IWAI.map(x => ({ ...x, manYear: b[0] + x.age, kazoeYear: b[0] + x.age - 1 }));
  }

  // その年度の学年と生まれた期間（年度の早見表）
  function gradeTable(sy) {
    const rows = [];
    for (let g = -3; g <= 15; g++) {
      const fy = sy - 7 - g;
      rows.push({ g, label: gradeLabel(g), from: [fy, 4, 2], to: [fy + 1, 4, 1] });
    }
    return rows;
  }
  // 生まれ年ごとの年齢（その年の誕生日を過ぎたあとの満年齢）
  function yearTable(y, span) {
    const rows = [];
    for (let by = y; by >= y - span; by--) rows.push({ by, wareki: warekiYear(by), eto: eto(by), man: y - by, kazoe: y - by + 1 });
    return rows;
  }

  function daysUntilBirthday(b, t) {
    const toUTC = a => Date.UTC(a[0], a[1] - 1, a[2]);
    const next = y => {
      if (b[1] === 2 && b[2] === 29 && !isLeap(y)) return [y, 3, 1];
      return [y, b[1], b[2]];
    };
    let n = next(t[0]);
    if (cmp(n, t) < 0) n = next(t[0] + 1);
    return Math.round((toUTC(n) - toUTC(t)) / 864e5);
  }

  const api = { ERAS, parse, fmt, fromDate, cmp, wareki, warekiYear, eto, sign, age, kazoe, birthFY, schoolYear, hayaumare, grade, gradeLabel, schools, iwai, gradeTable, yearTable, daysUntilBirthday };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NenreiCalc = api;
})(this);
