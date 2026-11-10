// バグ探し練習帳の問題。bug は0から数えた行番号、ok は正解として認める行（省略時は bug のみ）。
window.BUG_PUZZLES = [
{ id: "js-sum", lang: "JavaScript", title: "配列の金額を合計する", bug: 2,
code: `function sum(prices) {
  let total = 0;
  for (let i = 0; i <= prices.length; i++) {
    total += prices[i];
  }
  return total;
}`,
fix: `  for (let i = 0; i < prices.length; i++) {`,
why: "「<=」だと i が prices.length まで進み、最後に存在しない prices[prices.length]（undefined）を足します。数値に undefined を足すと NaN になり、合計全体が NaN になります。",
incident: "カートの合計金額や売上レポートに「NaN」と表示される。境界が1つずれる「off-by-one」は、もっとも多いバグの一つです。" },

{ id: "js-sort", lang: "JavaScript", title: "最高点を取り出す", bug: 1,
code: `const scores = [10, 9, 100, 25];
scores.sort();
const best = scores[scores.length - 1];
console.log("最高点:", best);`,
fix: `scores.sort((a, b) => a - b);`,
why: "比較関数を渡さない sort() は、要素を文字列にして辞書順に並べます。結果は [10, 100, 25, 9] になり、最後の要素は 9 です。",
incident: "ランキングや価格の並べ替えで、100 が 25 より前に来るなど順位が崩れる。テストのデータが1桁だけだと気づけません。" },

{ id: "js-assign", lang: "JavaScript", title: "管理者だけに削除を許す", bug: 1,
code: `function canDelete(user) {
  if (user.role = "admin") {
    return true;
  }
  return false;
}`,
fix: `  if (user.role === "admin") {`,
why: "「=」は比較ではなく代入です。user.role に \"admin\" を入れ、その値（空でない文字列）が真とみなされるため、誰に対しても true を返します。元のロールまで書き換わります。",
incident: "一般の利用者が管理者の操作をできてしまう「権限昇格」。データも書き換わるので、あとから原因を追いにくくなります。" },

{ id: "js-await", lang: "JavaScript", title: "全部保存してから完了を伝える", bug: 3,
code: `// db.save() は Promise を返す
async function saveAll(items) {
  for (const item of items) {
    db.save(item);
  }
  showMessage("保存しました");
}`,
fix: `    await db.save(item);`,
why: "await がないので保存の完了を待たずに次へ進み、保存が終わる前に「保存しました」が表示されます。保存に失敗しても、その例外は saveAll に届きません。",
incident: "「保存しました」と出たのですぐ画面を閉じたら、データが消えていた。失敗はエラーとして記録もされません。" },

{ id: "js-var", lang: "JavaScript", title: "ボタンごとに番号を表示する", bug: 1,
code: `const buttons = document.querySelectorAll("button");
for (var i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener("click", () => {
    alert(i + "番目のボタンです");
  });
}`,
fix: `for (let i = 0; i < buttons.length; i++) {`,
why: "var で宣言した i はループ全体で1つだけです。クリックされるころにはループが終わっていて、i は buttons.length のまま。どのボタンでも同じ番号が出ます。let ならループの1回ごとに別の i が作られます。",
incident: "一覧のどの「削除」ボタンを押しても、存在しない行が対象になり何も起きない、または違う行が消える。" },

{ id: "js-parseint", lang: "JavaScript", title: "文字列の数字を合計する", bug: 1,
code: `const input = ["10", "10", "10"];
const nums = input.map(parseInt);
const total = nums.reduce((a, b) => a + b, 0);
console.log(total);`,
fix: `const nums = input.map(s => parseInt(s, 10));`,
why: "map はコールバックに（要素, 添字, 配列）を渡します。parseInt の第2引数は基数なので、parseInt(\"10\", 1) は NaN、parseInt(\"10\", 2) は 2 になり、合計は NaN です。",
incident: "CSV を取り込むと、1行目は正しいのに2行目以降の数字だけが壊れる。集計表が NaN だらけになります。" },

{ id: "js-float", lang: "JavaScript", title: "合計が予算ちょうどか調べる", bug: 2, ok: [1, 2],
code: `const budget = 0.3; // ドル
const total = 0.1 + 0.2;
if (total === budget) {
  checkout();
}`,
fix: `if (Math.abs(total - budget) < Number.EPSILON) {`,
why: "0.1 や 0.2 は2進数の小数で正確に表せないため、0.1 + 0.2 は 0.30000000000000004 になります。=== で比べると false です。小数は差がごく小さいかで比べるか、そもそも金額はセントなどの整数で持ちます。",
incident: "ぴったりの金額なのに「金額が一致しません」と決済が止まる。お金は円やセントなど最小単位の整数で扱うのが定石です。" },

{ id: "js-month", lang: "JavaScript", title: "その年の12月25日を作る", bug: 1,
code: `function christmas(year) {
  return new Date(year, 12, 25);
}
const d = christmas(2026);
console.log(d.getMonth() + 1, "月");`,
fix: `  return new Date(year, 11, 25);`,
why: "Date の月は0から数えます（1月が0、12月が11）。12を渡すとあふれて、翌年の1月25日になります。",
incident: "予約日やイベントの日付が1か月ずれる。12月の場合は年までずれ、カレンダーに出てこなくなります。" },

{ id: "js-foreach", lang: "JavaScript", title: "IDでユーザーを探す", bug: 1, ok: [1, 2],
code: `function findUser(users, id) {
  users.forEach(u => {
    if (u.id === id) return u;
  });
  return null;
}`,
fix: `  return users.find(u => u.id === id) ?? null;`,
why: "forEach に渡した関数の中の return は、その関数を抜けるだけで findUser からは抜けません。見つかっても最後の return null まで進みます。",
incident: "登録済みのユーザーが「見つかりません」になり、ログインや検索がいつも失敗する。" },

{ id: "js-json", lang: "JavaScript", title: "保存したカートを読み込む", bug: 2, ok: [2, 3],
code: `function cartCount() {
  const saved = localStorage.getItem("cart");
  const items = JSON.parse(saved);
  return items.length;
}`,
fix: `  const items = JSON.parse(saved) ?? [];`,
why: "初めての人の端末には \"cart\" が保存されていないので、getItem は null を返します。JSON.parse(null) は null になり、null.length で TypeError が出ます。",
incident: "初めて来た人にだけ画面が真っ白になる。開発者の端末には保存済みのデータがあるので再現しません。" },

{ id: "js-concat", lang: "JavaScript", title: "2つの入力欄の数を足す", bug: 2,
code: `const a = document.querySelector("#a").value;
const b = document.querySelector("#b").value;
const sum = a + b;
result.textContent = sum;`,
fix: `const sum = Number(a) + Number(b);`,
why: "input 要素の value は常に文字列です。\"1\" + \"2\" は足し算ではなく文字列の連結になり、\"12\" になります。",
incident: "数量に1と2を入れたら、合計12個で注文が入る。" },

{ id: "js-indexof", lang: "JavaScript", title: "選んだ項目を一覧から消す", bug: 2,
code: `const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const selected = { id: 2 };
const index = items.indexOf(selected);
items.splice(index, 1);`,
fix: `const index = items.findIndex(x => x.id === selected.id);`,
why: "indexOf はオブジェクトを「同じもの（同じ参照）か」で比べます。中身が同じでも別のオブジェクトなので見つからず -1 になり、splice(-1, 1) は最後の要素を消します。",
incident: "2番目を消したつもりが、最後の項目が消える。消えたのは別の人のデータかもしれません。" },

{ id: "js-innerhtml", lang: "JavaScript", title: "コメントを一覧に追加する", bug: 2,
code: `function addComment(text) {
  const li = document.createElement("li");
  li.innerHTML = text;
  list.appendChild(li);
}`,
fix: `  li.textContent = text;`,
why: "innerHTML に利用者の入力を入れると、HTML として解釈されます。<img src=x onerror=\"…\"> のような文字列で、任意のスクリプトが動きます。",
incident: "クロスサイトスクリプティング（XSS）。ほかの利用者のログイン状態を盗まれたり、勝手に投稿されたりします。" },

{ id: "js-regex-g", lang: "JavaScript", title: "数字だけの入力か調べる", bug: 0,
code: `const digits = /^\\d+$/g;
function isNumber(s) {
  return digits.test(s);
}
isNumber("123"); // true
isNumber("456"); // なぜか false`,
fix: `const digits = /^\\d+$/;`,
why: "g フラグ付きの正規表現は lastIndex（前回一致した位置）を覚えていて、test() はその続きから調べます。2回目は4文字目から探すので失敗します。",
incident: "同じ値なのに入力チェックが通ったり弾かれたりを交互にくり返す。再現しにくい不具合として報告されます。" },

{ id: "js-switch", lang: "JavaScript", title: "地域ごとの送料を決める", bug: 4, ok: [4, 5],
code: `function shippingFee(region) {
  let fee = 0;
  switch (region) {
    case "local":
      fee = 500;
    case "remote":
      fee = 1200;
      break;
  }
  return fee;
}`,
fix: `      fee = 500;
      break;`,
why: "case の終わりに break がないと、次の case に流れ落ちます（フォールスルー）。\"local\" でも fee = 1200 が実行され、上書きされます。",
incident: "近くの地域のお客さんに、遠方の送料を請求してしまう。" },

{ id: "js-this", lang: "JavaScript", title: "1秒ごとにカウントを増やす", bug: 3, ok: [3, 4],
code: `class Counter {
  constructor() { this.count = 0; }
  start() {
    setInterval(function () {
      this.count++;
    }, 1000);
  }
}`,
fix: `    setInterval(() => {`,
why: "function で書いた関数の this は、呼ばれ方で決まります。setInterval から呼ばれると this は Counter のインスタンスではありません（ブラウザでは window）。アロー関数なら外側の this をそのまま使います。",
incident: "経過時間がいつまでも0のまま。代わりに window.count に NaN が入るなど、思わぬ場所が書き換わります。" },

{ id: "js-date-eq", lang: "JavaScript", title: "同じ日時の予約がないか調べる", bug: 3,
code: `function isSameTime(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x === y;
}`,
fix: `  return x.getTime() === y.getTime();`,
why: "=== はオブジェクトが同じものかどうかを比べます。別々に作った Date は、中身が同じ日時でも別のオブジェクトなので、常に false になります。",
incident: "同じ時間帯に予約が二重に入る。重複チェックが一度も働いていなかったと、あとで判明します。" },

{ id: "js-or-zero", lang: "JavaScript", title: "音量の設定を読む", bug: 2,
code: `function getVolume(settings) {
  // 音量は 0〜100。未設定なら 50
  return settings.volume || 50;
}`,
fix: `  return settings.volume ?? 50;`,
why: "|| は左側が「偽とみなされる値」なら右側を返します。0 も偽とみなされるので、音量を0にした人も50になります。?? なら null と undefined のときだけ既定値を使います。",
incident: "ミュートにしたはずの通知音が、会議中に大きな音で鳴る。「0個」「0円」でも同じ事故が起きます。" },

{ id: "js-tofixed", lang: "JavaScript", title: "税込み価格に送料を足す", bug: 1, ok: [1, 2],
code: `function totalWithShipping(price) {
  const taxed = (price * 1.1).toFixed(0);
  return taxed + 500;
}`,
fix: `  const taxed = Math.round(price * 1.1);`,
why: "toFixed は数値ではなく文字列を返します。\"1100\" + 500 は文字列の連結になり、\"1100500\" になります。",
incident: "1,100円の商品が「1,100,500円」と表示される。そのまま決済に回ると大問題です。" },

{ id: "js-date-utc", lang: "JavaScript", title: "締め切りの日付を表示する", bug: 0,
code: `const d = new Date("2026-11-09");
const label = (d.getMonth() + 1) + "/" + d.getDate();
show("締め切り " + label);`,
fix: `const d = new Date(2026, 10, 9); // 端末の時刻で作る`,
why: "\"YYYY-MM-DD\" だけの文字列は、UTC の0時として解釈されます。日本（UTC+9）では9日の9時ですが、アメリカなど UTC より遅れた地域では8日の夜になり、getDate() は 8 を返します。",
incident: "海外の利用者にだけ、締め切りや誕生日が1日前に表示される。日本でテストしている限り気づけません。" },

{ id: "js-fill", lang: "JavaScript", title: "3行の表を作る", bug: 0,
code: `const rows = new Array(3).fill([]);
rows[0].push("A");
console.log(rows[1].length); // 1`,
fix: `const rows = Array.from({ length: 3 }, () => []);`,
why: "fill([]) は1つの配列を作って、同じものを3か所に入れます。rows[0] に追加すると、rows[1] と rows[2] からも同じ要素が見えます。",
incident: "1行目に入力した内容が、表のすべての行に表示される。" },

{ id: "js-arrow", lang: "JavaScript", title: "税込み価格の一覧を作る", bug: 2, ok: [1, 2],
code: `const prices = [100, 200, 300];
const taxed = prices.map(p => {
  Math.round(p * 1.1);
});
console.log(taxed);`,
fix: `  return Math.round(p * 1.1);`,
why: "アロー関数で { } を使うと、本体はブロックになります。return を書かないと undefined を返すので、結果は [undefined, undefined, undefined] です。",
incident: "税込み価格の列がすべて空欄になる。" },

{ id: "py-default", lang: "Python", title: "カートに商品を入れる", bug: 0,
code: `def add_item(item, cart=[]):
    cart.append(item)
    return cart

a = add_item("りんご")
b = add_item("みかん")  # ["みかん"] のはず`,
fix: `def add_item(item, cart=None):
    if cart is None:
        cart = []`,
why: "既定値の [] は、関数を定義したときに1回だけ作られます。呼び出しのたびに同じリストが使い回されるので、2回目には前回の「りんご」が残っています。",
incident: "前のお客さんの商品が、次のお客さんのカートに混ざる。サーバーで動くと、利用者をまたいでデータが漏れます。" },

{ id: "py-range", lang: "Python", title: "平均点を出す", bug: 2,
code: `def average(scores):
    total = 0
    for i in range(1, len(scores)):
        total += scores[i]
    return total / len(scores)`,
fix: `    for i in range(len(scores)):`,
why: "range(1, n) は1から始まるので、先頭の scores[0] が足されません。Python の添字は0から始まります。",
incident: "平均点がいつも少し低く出る。1件目のデータだけが集計から漏れます。" },

{ id: "py-remove", lang: "Python", title: "\"b\" をすべて消す", bug: 1, ok: [1, 3],
code: `users = ["a", "b", "b", "c"]
for u in users:
    if u == "b":
        users.remove(u)
print(users)`,
fix: `users = [u for u in users if u != "b"]`,
why: "ループ中のリストから要素を消すと、後ろの要素が前に詰まり、次の要素が1つ飛ばされます。2つ続いた \"b\" の2つ目は調べられずに残り、結果は [\"a\", \"b\", \"c\"] です。",
incident: "退会者の一括削除で一部のアカウントだけが残り、案内メールが届き続ける。" },

{ id: "py-lambda", lang: "Python", title: "ボタンごとの処理を作る", bug: 2,
code: `handlers = []
for name in ["保存", "読込"]:
    handlers.append(lambda: print(name))
handlers[0]()  # 保存 と出てほしい`,
fix: `    handlers.append(lambda name=name: print(name))`,
why: "lambda の中の name は、作ったときではなく呼ばれたときの値を見ます。ループが終わると name は最後の \"読込\" なので、どれを呼んでも \"読込\" と表示されます。",
incident: "「保存」ボタンを押したら読み込みが走り、編集中の内容が消える。" },

{ id: "py-except", lang: "Python", title: "通知メールを送る", bug: 3, ok: [3, 4],
code: `def notify(user):
    try:
        send_mail(user.email)
    except:
        pass`,
fix: `    except Exception:
        logger.exception("メールの送信に失敗しました")`,
why: "何も指定しない except はすべての例外を受け止め、pass で何もしません。user.email の書き間違いのようなバグまで隠れ、失敗しても誰も気づきません。Ctrl+C（KeyboardInterrupt）まで止めてしまいます。",
incident: "パスワード再設定のメールが何週間も送られていなかったのに、エラーが1件も記録されていない。" },

{ id: "py-input", lang: "Python", title: "年齢で購入できるか判定する", bug: 0, ok: [0, 1],
code: `age = input("年齢を入力: ")
if age >= 20:
    print("購入できます")`,
fix: `age = int(input("年齢を入力: "))`,
why: "input() は常に文字列を返します。Python 3 では文字列と数値を >= で比べられず、TypeError になります。",
incident: "年齢確認の画面で例外が出て、購入手続きが進まなくなる。" },

{ id: "py-round", lang: "Python", title: "ポイントを四捨五入で付ける", bug: 2,
code: `def points(amount):
    # 購入額の5%を、四捨五入でポイントにする
    return round(amount * 0.05)

points(50)  # 3 のはずが 2`,
fix: `    return (amount * 5 + 50) // 100`,
why: "Python の round() は、ちょうど .5 のときに偶数のほうへ丸めます（偶数丸め）。round(2.5) は 2、round(3.5) は 4 です。四捨五入したいときは整数の計算か decimal モジュールを使います。",
incident: "ポイントや税額の端数が仕様と1ずれて、問い合わせや会計の差異になる。" },

{ id: "py-grid", lang: "Python", title: "3×3の座席表を作る", bug: 0,
code: `seats = [[0] * 3] * 3
seats[0][0] = 1  # 1列目の1番を予約
print(seats)`,
fix: `seats = [[0] * 3 for _ in range(3)]`,
why: "外側の * 3 は、同じ内側のリストへの参照を3つ並べるだけです。1か所を変えると、3行すべてが変わって [[1, 0, 0], [1, 0, 0], [1, 0, 0]] になります。",
incident: "1席予約しただけで、各列の1番の席がすべて埋まったように表示される。" },

{ id: "py-sql", lang: "Python", title: "名前でユーザーを探す", bug: 1, ok: [1, 2],
code: `def find_user(cur, name):
    sql = f"SELECT * FROM users WHERE name = '{name}'"
    cur.execute(sql)
    return cur.fetchone()`,
fix: `    cur.execute("SELECT * FROM users WHERE name = ?", (name,))
    # ? は sqlite3 の書き方。ドライバーによっては %s`,
why: "入力をそのまま SQL の文字列に埋め込んでいます。name に ' OR '1'='1 のような値を入れると、条件そのものが書き換わります。プレースホルダーを使えば、入力は値としてだけ扱われます。",
incident: "SQLインジェクション。ログインを突破されたり、顧客データを抜き取られたり消されたりします。" },

{ id: "py-div", lang: "Python", title: "真ん中の要素を取り出す", bug: 1,
code: `def middle(items):
    return items[len(items) / 2]`,
fix: `    return items[len(items) // 2]`,
why: "Python 3 の / は、割り切れても float を返します（4 / 2 は 2.0）。リストの添字に float は使えず、TypeError になります。",
incident: "Python 2 から移したコードが、本番で突然 TypeError を出して止まる。" },

{ id: "py-rstrip", lang: "Python", title: "ファイル名から拡張子を外す", bug: 1,
code: `name = "report_text.txt"
base = name.rstrip(".txt")
print(base)  # report_text のはず`,
fix: `base = name.removesuffix(".txt")  # Python 3.9 以降`,
why: "rstrip の引数は「取り除く文字の集まり」で、文字列としての一致ではありません。末尾が '.'、't'、'x' のどれかである限り削り続けるので、結果は \"report_te\" です。",
incident: "書き出したファイル名が途中で切れ、別のファイルを上書きしてしまう。" },

{ id: "py-version", lang: "Python", title: "いちばん新しいバージョンを選ぶ", bug: 1,
code: `versions = ["1.9", "1.10", "1.2"]
latest = max(versions)
print(latest)  # 1.10 のはず`,
fix: `latest = max(versions, key=lambda v: tuple(map(int, v.split("."))))`,
why: "文字列どうしは1文字ずつ辞書順で比べます。\"1.9\" と \"1.10\" では3文字目の '9' と '1' を比べるので、\"1.9\" のほうが大きいと判断されます。",
incident: "自動更新が 1.10 を古いと判断して配布しない。あるいは古い版に戻してしまう。" },

{ id: "py-or", lang: "Python", title: "「はい」の返事だけ実行する", bug: 1,
code: `answer = input("全件削除しますか？ (y/n) ")
if answer == "y" or "yes":
    delete_all()`,
fix: `if answer in ("y", "yes"):`,
why: "この条件は (answer == \"y\") or (\"yes\") と解釈されます。空でない文字列 \"yes\" は常に真なので、n と答えても条件が成り立ちます。",
incident: "「n」と答えたのに全件削除が実行される。" },

{ id: "py-dict", lang: "Python", title: "期限切れのキャッシュを消す", bug: 0, ok: [0, 2],
code: `for key in cache:
    if is_expired(key):
        del cache[key]`,
fix: `for key in list(cache):`,
why: "辞書をループで回しながら要素を消すと、RuntimeError: dictionary changed size during iteration が出ます。先にキーの一覧をコピーしてから回します。",
incident: "掃除の処理が最初の1件目で止まり、キャッシュがたまり続けてメモリが足りなくなる。" },

{ id: "py-page", lang: "Python", title: "1ページに10件ずつ表示する", bug: 2,
code: `def page(items, n, size=10):
    # n は 1 から始まるページ番号
    start = n * size
    return items[start:start + size]`,
fix: `    start = (n - 1) * size`,
why: "1ページ目なのに start が10になり、最初の10件（0〜9番）が飛ばされます。",
incident: "一覧の先頭10件が、どのページにも表示されない。" },

{ id: "py-xor", lang: "Python", title: "アップロードの上限を1MBにする", bug: 0,
code: `MAX_BYTES = 2 ^ 20  # 1MB
def check(data):
    if len(data) > MAX_BYTES:
        raise ValueError("ファイルが大きすぎます")`,
fix: `MAX_BYTES = 2 ** 20  # 1MB`,
why: "Python（JavaScript も同じ）の ^ は、べき乗ではなくビットごとの排他的論理和（XOR）です。2 ^ 20 は 22 なので、上限が22バイトになります。べき乗は ** です。",
incident: "小さな画像すらアップロードできなくなる。逆の書き間違いでは上限が効かず、巨大なファイルでサーバーが止まります。" },

{ id: "py-log-w", lang: "Python", title: "ログをファイルに書き足す", bug: 1,
code: `def log(msg):
    with open("app.log", "w") as f:
        f.write(msg + "\\n")`,
fix: `    with open("app.log", "a") as f:`,
why: "\"w\" モードは、開くたびにファイルの中身を空にします。書くたびに前のログが消え、最後の1行しか残りません。書き足すなら \"a\" です。",
incident: "障害の原因を調べようとログを開いたら、最後の1行しか残っていない。" },

{ id: "py-copy", lang: "Python", title: "既定の設定をコピーして変える", bug: 1,
code: `default = {"theme": "light", "tags": ["a"]}
mine = default.copy()
mine["tags"].append("b")
print(default["tags"])  # ["a"] のはず`,
fix: `mine = copy.deepcopy(default)  # 先頭で import copy`,
why: "dict.copy() は浅いコピーで、中のリストは元と同じものを指したままです。mine の tags に追加すると、default の tags も [\"a\", \"b\"] になります。",
incident: "1人が設定を変えただけで、全員の既定の設定が書き換わる。" },

{ id: "py-now", lang: "Python", title: "時刻つきでログを出す", bug: 1,
code: `from datetime import datetime
def log(msg, at=datetime.now()):
    print(at, msg)`,
fix: `def log(msg, at=None):
    if at is None:
        at = datetime.now()`,
why: "引数の既定値は、関数を定義したときに1回だけ評価されます。datetime.now() はプログラムを起動したときの時刻で固定され、何度呼んでも同じ時刻が出ます。",
incident: "ログの時刻がすべて起動した時刻になり、障害の調査で順番を追えない。" }
];
