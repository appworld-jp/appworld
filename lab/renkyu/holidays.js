// 日本の祝日（国民の祝日・振替休日・国民の休日）を計算する。対象は2020〜2099年。
// 春分・秋分は1980〜2099年に使える近似式で求める（国立天文台の暦要項で毎年2月に正式に決まる）。
(function (root) {
  "use strict";
  const MIN = 2020, MAX = 2099;
  const pad = n => (n < 10 ? "0" : "") + n;
  const key = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  // m月の第n月曜日
  const nthMonday = (y, m, n) => {
    const first = new Date(y, m - 1, 1).getDay();
    return 1 + ((8 - first) % 7) + (n - 1) * 7;
  };
  const shunbun = y => Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
  const shubun = y => Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));

  // 法律で決まった「国民の祝日」だけ
  function national(y) {
    const h = [];
    const add = (m, d, name) => h.push([m, d, name]);
    add(1, 1, "元日");
    add(1, nthMonday(y, 1, 2), "成人の日");
    add(2, 11, "建国記念の日");
    add(2, 23, "天皇誕生日");
    add(3, shunbun(y), "春分の日");
    add(4, 29, "昭和の日");
    add(5, 3, "憲法記念日");
    add(5, 4, "みどりの日");
    add(5, 5, "こどもの日");
    if (y === 2020) { add(7, 23, "海の日"); add(7, 24, "スポーツの日"); add(8, 10, "山の日"); }
    else if (y === 2021) { add(7, 22, "海の日"); add(7, 23, "スポーツの日"); add(8, 8, "山の日"); }
    else { add(7, nthMonday(y, 7, 3), "海の日"); add(8, 11, "山の日"); add(10, nthMonday(y, 10, 2), "スポーツの日"); }
    add(9, nthMonday(y, 9, 3), "敬老の日");
    add(9, shubun(y), "秋分の日");
    add(11, 3, "文化の日");
    add(11, 23, "勤労感謝の日");
    return h;
  }

  // { "2026-05-06": "振替休日", ... } の形で返す
  function holidays(y) {
    if (!(y >= MIN && y <= MAX)) return {};
    const out = {};
    const nat = national(y);
    nat.forEach(([m, d, n]) => { out[key(y, m, d)] = n; });
    const isNat = dt => !!out[key(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())] && dt.getFullYear() === y;
    // 振替休日：祝日が日曜なら、その後でいちばん近い祝日でない日
    nat.forEach(([m, d]) => {
      const dt = new Date(y, m - 1, d);
      if (dt.getDay() !== 0) return;
      const t = new Date(y, m - 1, d + 1);
      while (isNat(t)) t.setDate(t.getDate() + 1);
      const k = key(t.getFullYear(), t.getMonth() + 1, t.getDate());
      if (t.getFullYear() === y && !out[k]) out[k] = "振替休日";
    });
    // 国民の休日：前日と翌日が国民の祝日で、その日が祝日でない日
    const natSet = {};
    nat.forEach(([m, d]) => { natSet[key(y, m, d)] = true; });
    nat.forEach(([m, d]) => {
      const mid = new Date(y, m - 1, d + 1), nx = new Date(y, m - 1, d + 2);
      const km = key(mid.getFullYear(), mid.getMonth() + 1, mid.getDate());
      const kn = key(nx.getFullYear(), nx.getMonth() + 1, nx.getDate());
      if (natSet[kn] && !natSet[km] && !out[km]) out[km] = "国民の休日";
    });
    return out;
  }

  const api = { holidays, national, shunbun, shubun, nthMonday, key, MIN, MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Holidays = api;
})(typeof window !== "undefined" ? window : this);
