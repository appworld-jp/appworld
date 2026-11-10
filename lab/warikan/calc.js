// 立て替え精算の計算。金額はすべて整数（円）で扱い、合計がかならず一致するようにする。
(function (root) {
  "use strict";
  const MAX_AMOUNT = 10000000;

  // 「１，２００円」「¥1,200」なども読む。整数の円だけを受けつける。
  function parseAmount(s) {
    const t = String(s == null ? "" : s).normalize("NFKC").replace(/[\s,、¥円]/g, "");
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    return n >= 1 && n <= MAX_AMOUNT ? n : null;
  }
  // 割合（0.5、2 など）。0より大きく100以下。小数は2けたまで。
  function parseWeight(s) {
    const t = String(s == null ? "" : s).normalize("NFKC").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    const n = Number(t);
    return n > 0 && n <= 100 ? n : null;
  }

  // amount を ids に weights の比で分ける。端数は小数部の大きい順に1円ずつ配る（最大剰余法）。
  function split(amount, ids, weights) {
    const w = ids.map(id => Math.round(((weights && weights[id]) || 1) * 100));
    const W = w.reduce((a, b) => a + b, 0);
    const out = {};
    if (!ids.length || W <= 0) return out;
    let given = 0;
    const rem = ids.map((id, i) => {
      const q = Math.floor(amount * w[i] / W);
      out[id] = q; given += q;
      return { id, r: (amount * w[i]) % W, i };
    });
    rem.sort((a, b) => b.r - a.r || a.i - b.i);
    for (let k = 0; k < amount - given; k++) out[rem[k].id] += 1;
    return out;
  }

  // 各人の 払った額・負担額・差額（プラスは受けとる側）
  function balances(ev) {
    const paid = {}, owed = {};
    ev.members.forEach(m => { paid[m.id] = 0; owed[m.id] = 0; });
    ev.pays.forEach(p => {
      const ids = p.for.filter(id => id in owed);
      if (!(p.by in paid) || !ids.length) return;
      paid[p.by] += p.amount;
      const sh = split(p.amount, ids, p.w);
      ids.forEach(id => { owed[id] += sh[id]; });
    });
    const bal = {};
    ev.members.forEach(m => { bal[m.id] = paid[m.id] - owed[m.id]; });
    return { paid, owed, bal };
  }

  // 差額を unit 円単位にそろえる。そろえた分の差は absorber がまとめて持つ。
  function roundBalances(bal, unit, absorber) {
    const ids = Object.keys(bal);
    const r = {};
    if (!ids.length) return { rounded: r, absorber: null, diff: 0 };
    if (!(absorber in bal)) absorber = ids.reduce((a, b) => (bal[b] > bal[a] ? b : a), ids[0]);
    let sum = 0;
    ids.forEach(id => {
      if (id === absorber) return;
      const v = bal[id], s = v < 0 ? -1 : 1;
      r[id] = (unit > 1 ? s * Math.round(Math.abs(v) / unit) * unit : v) || 0;
      sum += r[id];
    });
    r[absorber] = -sum || 0;
    return { rounded: r, absorber, diff: bal[absorber] - r[absorber] };
  }

  // 送金の回数がいちばん少なくなる組み合わせ。
  // 合計0になるグループに分けられるだけ分け、各グループの中で大きい順に組み合わせる（人数−グループ数 回）。
  function settle(bal) {
    const items = Object.keys(bal).filter(id => bal[id] !== 0).map(id => ({ id, v: bal[id] }));
    const groups = [];
    const m = items.length;
    if (m > 0 && m <= 16) {
      const N = 1 << m, sum = new Float64Array(N), dp = new Int8Array(N);
      for (let mask = 1; mask < N; mask++) {
        const low = mask & -mask, i = 31 - Math.clz32(low);
        sum[mask] = sum[mask ^ low] + items[i].v;
        let best = 0;
        for (let j = 0; j < m; j++) if (mask & (1 << j)) { const d = dp[mask ^ (1 << j)]; if (d > best) best = d; }
        dp[mask] = best + (sum[mask] === 0 ? 1 : 0);
      }
      const order = [];
      let mask = N - 1;
      while (mask) {
        const need = dp[mask] - (sum[mask] === 0 ? 1 : 0);
        for (let j = 0; j < m; j++) if ((mask & (1 << j)) && dp[mask ^ (1 << j)] === need) { order.push(j); mask ^= 1 << j; break; }
      }
      order.reverse();
      let cur = [], s = 0;
      order.forEach(j => { cur.push(items[j]); s += items[j].v; if (s === 0) { groups.push(cur); cur = []; } });
      if (cur.length) groups.push(cur);
    } else if (m) groups.push(items);
    const out = [];
    groups.forEach(g => {
      const cred = g.filter(x => x.v > 0).map(x => ({ id: x.id, v: x.v })).sort((a, b) => b.v - a.v);
      const debt = g.filter(x => x.v < 0).map(x => ({ id: x.id, v: -x.v })).sort((a, b) => b.v - a.v);
      let i = 0, j = 0;
      while (i < debt.length && j < cred.length) {
        const a = Math.min(debt[i].v, cred[j].v);
        if (a > 0) out.push({ from: debt[i].id, to: cred[j].id, amount: a });
        debt[i].v -= a; cred[j].v -= a;
        if (debt[i].v === 0) i++;
        if (cred[j].v === 0) j++;
      }
    });
    return out;
  }

  const api = { parseAmount, parseWeight, split, balances, roundBalances, settle, MAX_AMOUNT };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WarikanCalc = api;
})(typeof window !== "undefined" ? window : this);
