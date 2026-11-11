// 休みの日を並べて、有給を何日足すと何連休になるかを数える。
(function (root) {
  "use strict";
  const H = root.Holidays || (typeof require === "function" ? require("./holidays.js") : null);
  const DAY = 86400000;
  const pad = n => (n < 10 ? "0" : "") + n;
  const keyOf = dt => dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);

  // 日ごとの情報 { key, date, off, kind: holiday|week|company|work|normal, label, holiday }
  function days(year, set, padDays) {
    padDays = padDays == null ? 21 : padDays;
    const hol = Object.assign({}, H.holidays(year - 1), H.holidays(year), H.holidays(year + 1));
    const offWeek = set.offWeek || [];
    const marks = {};
    (set.marks || []).forEach(m => {
      const a = parse(m.from), b = parse(m.to || m.from);
      if (!a || !b || b < a) return;
      for (let d = a; d <= b; d = addDays(d, 1)) marks[keyOf(d)] = m;
    });
    const start = addDays(new Date(year, 0, 1), -padDays), end = addDays(new Date(year, 11, 31), padDays);
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const k = keyOf(d), h = hol[k] || "", m = marks[k];
      let off = false, kind = "normal", label = "";
      if (m && m.type === "work") { kind = "work"; label = m.name || "出勤日"; }
      else if (m) { off = true; kind = "company"; label = m.name || "会社の休み"; }
      else if (h && set.holidaysOff !== false) { off = true; kind = "holiday"; label = h; }
      else if (offWeek.indexOf(d.getDay()) >= 0) { off = true; kind = "week"; }
      out.push({ key: k, date: d, off, kind, label, holiday: h });
    }
    return out;
  }

  // 有給 k 日で取れる連休の候補をすべて出す
  function candidates(ds, maxK) {
    const W = [];
    ds.forEach((d, i) => { if (!d.off) W.push(i); });
    const res = [];
    for (let k = 1; k <= maxK; k++) {
      for (let j = 1; j + k < W.length; j++) {
        const s = W[j - 1] + 1, e = W[j + k] - 1;
        res.push({ k, s, e, len: e - s + 1, take: W.slice(j, j + k) });
      }
    }
    return res;
  }

  // 曜日の休みだけのときに、有給 k 日で取れる最長
  function plainBest(offWeek, maxK) {
    const ds = [];
    const base = new Date(2001, 0, 1); // 月曜
    for (let i = 0; i < 42; i++) { const d = addDays(base, i); ds.push({ off: offWeek.indexOf(d.getDay()) >= 0 }); }
    const best = [0];
    for (let k = 1; k <= maxK; k++) best[k] = k;
    candidates(ds, maxK).forEach(c => { if (c.len > best[c.k]) best[c.k] = c.len; });
    if (offWeek.length >= 7) for (let k = 1; k <= maxK; k++) best[k] = 0;
    return best;
  }

  // 連休の案を、祝日などのかたまりごとにまとめる
  function plans(year, set, maxK) {
    const ds = days(year, set);
    const base = plainBest(set.offWeek || [], maxK);
    const y0 = new Date(year, 0, 1), y1 = new Date(year, 11, 31);
    const groups = {};
    candidates(ds, maxK).forEach(c => {
      if (c.len <= base[c.k]) return;
      // 連休の中で、祝日・会社の休みを含むいちばん長い休みのかたまりを「軸」にする
      let best = null, i = c.s;
      while (i <= c.e) {
        if (!ds[i].off) { i++; continue; }
        let j = i, special = false;
        while (j <= c.e && ds[j].off) { if (ds[j].kind === "holiday" || ds[j].kind === "company") special = true; j++; }
        if (special && (!best || j - i > best.e - best.s + 1)) best = { s: i, e: j - 1 };
        i = j;
      }
      if (!best) return;
      if (c.take.some(i => ds[i].date < y0 || ds[i].date > y1)) return; // 有給はその年の日だけ
      const gk = ds[best.s].key;
      const g = groups[gk] || (groups[gk] = { key: gk, anchor: best, rows: {} });
      const cur = g.rows[c.k];
      if (!cur || c.len > cur.len) g.rows[c.k] = c;
    });
    const list = Object.keys(groups).sort().map(gk => {
      const g = groups[gk];
      const rows = [];
      let last = 0;
      for (let k = 1; k <= maxK; k++) { const r = g.rows[k]; if (r && r.len > last) { rows.push(r); last = r.len; } }
      return { key: gk, name: groupName(ds, g.anchor), anchor: g.anchor, rows };
    }).filter(g => g.rows.length);
    return { days: ds, groups: list, base };
  }

  function groupName(ds, a) {
    const names = [];
    let gw = false, ny = false;
    for (let i = a.s; i <= a.e; i++) {
      const d = ds[i];
      if (d.holiday === "憲法記念日" || d.holiday === "こどもの日") gw = true;
      if (d.holiday === "元日") ny = true;
      if ((d.kind === "holiday" || d.kind === "company") && d.label && names.indexOf(d.label) < 0) names.push(d.label);
    }
    if (gw) return "ゴールデンウィーク";
    if (ny) return "年末年始";
    const pure = names.filter(n => n !== "振替休日" && n !== "国民の休日");
    return (pure.length ? pure : names).slice(0, 2).join("・");
  }

  const api = { days, candidates, plainBest, plans, keyOf, parse, addDays, DAY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Plan = api;
})(typeof window !== "undefined" ? window : this);
