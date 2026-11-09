// Sample diff for レビュー下書き. Hunk headers are recomputed below so the line counts are always right.
// The "key" in config.js is a made-up placeholder, not a real credential.
(function () {
  const raw = String.raw`diff --git a/src/cart.js b/src/cart.js
index 3f2a1c4..8b7d9e0 100644
--- a/src/cart.js
+++ b/src/cart.js
@@ -1,6 +1,6 @@
 import { formatPrice } from "./format.js";
+import { sendOrder } from "./api.js";

 export function cartTotal(items) {
-  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
+  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
+  console.log("subtotal", subtotal);
+  // TODO: 送料のルールを設定ファイルに移す
+  const shipping = subtotal >= 5000 ? 0 : 550;
+  return Math.round(subtotal * 1.1) + shipping;
 }

 export function cartCount(items) {
@@ -20,3 +20,3 @@ export function cartCount(items) {
   return items.length;
 }
+
+export async function checkout(cart, user) {
+  if (!user) {
+    throw new Error("ログインしてください");
+  }
+  if (cart.items.length === 0) {
+    throw new Error("カートが空です");
+  }
+  const total = cartTotal(cart.items);
+  if (total > 300000) {
+    throw new Error("一度に注文できる金額を超えています");
+  }
+  const lines = [];
+  for (const it of cart.items) {
+    if (it.qty <= 0) continue;
+    if (it.stock < it.qty) {
+      throw new Error(it.name + " の在庫が足りません");
+    }
+    lines.push({
+      id: it.id,
+      qty: it.qty,
+      price: it.price,
+    });
+  }
+  const order = {
+    user: user.id,
+    lines,
+    total,
+    createdAt: Date.now(),
+  };
+  let tries = 0;
+  while (tries < 3) {
+    try {
+      const res = await sendOrder(order);
+      // console.log(res);
+      return res;
+    } catch (e) {
+      tries++;
+      await new Promise(r => setTimeout(r, 1500));
+    }
+  }
+  // FIXME: 失敗したときの表示を決める
+  return null;
+}
diff --git a/src/config.js b/src/config.js
index 1a2b3c4..5d6e7f8 100644
--- a/src/config.js
+++ b/src/config.js
@@ -1,4 +1,5 @@
 export const config = {
   apiBase: "/api",
+  api_key: "demo-9f3a7c2e1b8d4f60a5e7",
   currency: "JPY",
 };
diff --git a/src/legacy.js b/src/legacy.js
index 7e8f9a0..0b1c2d3 100644
--- a/src/legacy.js
+++ b/src/legacy.js
@@ -8,4 +8,8 @@ export function oldTotal(items) {
   const total = calc(items);
+  // const before = calcOld(items);
+  // if (before !== total) {
+  //   report(before, total);
+  // }
   return total;
 }
diff --git a/README.md b/README.md
index 2222222..3333333 100644
--- a/README.md
+++ b/README.md
@@ -3,3 +3,4 @@
 ## 使い方

 npm start で起動します。
+注文処理は src/cart.js の checkout を使います。
`;
  // recompute "@@ -a,b +c,d @@" counts from the hunk bodies
  const out = [], lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(lines[i]);
    if (!m) { out.push(lines[i]); continue; }
    let o = 0, n = 0;
    for (let j = i + 1; j < lines.length && !/^(@@|diff --git )/.test(lines[j]); j++) {
      const c = lines[j][0];
      if (c === " " || lines[j] === "") { if (j === lines.length - 1) break; o++; n++; }
      else if (c === "-") o++;
      else if (c === "+") n++;
    }
    out.push(`@@ -${m[1]},${o} +${m[2]},${n} @@${m[3]}`);
  }
  window.REVIEW_SAMPLE = out.join("\n");
})();
