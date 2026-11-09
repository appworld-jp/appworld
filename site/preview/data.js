/* Sample listings shared by the preview pages. They point to the operator's own App World Lab apps. On the real site build.py would write this from site/apps/*.json. */
window.TODAY = "2026-11-05";
window.APPS = [
  {id:"kondate-ai",n:"こんだて帖",t:"手持ちの食材から、晩ごはん3品と買い物リスト",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"冷蔵庫にある食材に印をつけると、内蔵の58品の家庭料理から、手持ちをいちばん使える3品を選びます。作り方と、足りない食材の買い物リストも表示します。",c:"#D9775A",b:true,u:"https://appworld-lab.pages.dev/kondate/"},
  {id:"tsundoku-zero",n:"積読ゼロ",t:"積んだ本を、1日10分ずつに切り分ける読書帳",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"本のタイトルとページ数を入れると、1日10分で読める分量に切り分けます。今日読むページの範囲と、読み終わる日の目安を表示します。読み終えた本は本棚に並びます。",c:"#3E8C84",b:true,u:"https://appworld-lab.pages.dev/tsundoku/"},
  {id:"gym-memo",n:"ジムメモ",t:"前回の重さが入る、片手で使える筋トレ記録",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"種目を選んで、重さと回数を大きなボタンで合わせて記録するだけです。前回の同じセットが最初から入り、記録すると休憩タイマーが動いて音で知らせます。種目ごとの履歴とベストも見られます。",c:"#4C6FD1",b:true,u:"https://appworld-lab.pages.dev/gym/"},
  {id:"review-draft",n:"レビュー下書き",t:"diffを貼ると、ルールで問題を探してレビューの下書きを作る",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"unified diffを貼ると、変更ファイルと行数を数え、デバッグ出力、TODO、長い関数、テスト不足、秘密情報らしき文字列などを決まったルールで探して、チェックリストとコメントの下書きを作ります。AIは使いません。",c:"#6A6F7A",b:true,u:"https://appworld-lab.pages.dev/review/"},
  {id:"ehon-maker",n:"えほんメーカー",t:"3つ選ぶと、ねる前に読む短い絵本ができる",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"しゅじんこう、ばしょ、すきなものを選ぶと、人が書いたお話の型に当てはめて、ページをめくって読む短い絵本ができます。読み上げもできます。",c:"#B9567E",b:true,u:"https://appworld-lab.pages.dev/ehon/"},
  {id:"shift-swap",n:"シフト交換板",t:"シフト交換の依頼文と返事用リンクを、サーバーなしで作る",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"日付、時間、お店、お礼を入れると、LINEやSlackに貼れる依頼文と、内容を入れた共有リンクを作ります。リンクを開いた人は「引き受けます」の返事をすぐ作れます。",b:1,c:"#8A64C8",b:true,u:"https://appworld-lab.pages.dev/shift/"},
  {id:"hitokoto-kanji",n:"ひとこと漢字",t:"読めそうで読めない漢字を、1日1問",p:"Web",g:"遊び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"大人が読み間違えやすい漢字を、4つの読みから選ぶクイズです。今日の1問は、同じ日なら誰でも同じです。間違えた言葉は復習でき、意味も確かめられます。",c:"#C9A13A",b:true,u:"https://appworld-lab.pages.dev/kanji/"},
  {id:"kakei-hitome",n:"家計ひとめ",t:"金額と項目を押すだけの、ひと目でわかる家計簿",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-04",x:"金額を入れて項目を押すだけで記録できます。今月の合計と予算の残り、1日あたりの目安、項目ごとの棒グラフ、日ごとの一覧をひと目で確認できます。",c:"#4E9A6B",b:true,u:"https://appworld-lab.pages.dev/kakei/"},
  {id:"gijiroku",n:"議事録まとめ",t:"会議メモから、決定・宿題・持ち越しを抜き出す",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-04",x:"会議のメモや文字起こしを貼ると、決まったこと、宿題（担当・期限）、持ち越しを決まったルールで抜き出します。結果はその場で直せて、まとめ文としてコピーできます。AIは使いません。",c:"#5A7FA0",b:true,u:"https://appworld-lab.pages.dev/gijiroku/"},
  {id:"nemu-log",n:"ねむログ",t:"「寝る」「起きた」をタップして、睡眠のリズムを見る",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-03",x:"「寝る」「起きた」を押すだけで睡眠を記録し、目覚めを3段階で残せます。1週間の睡眠をグラフで表示し、平均の睡眠時間や寝る時刻のばらつきと、記録に合わせたヒントを出します。",c:"#6C5BB0",b:true,u:"https://appworld-lab.pages.dev/nemu/"},
  {id:"eigo-nikki",n:"英語ひとこと日記",t:"毎日のテーマとフレーズで、英語の一文日記",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-02",x:"毎日ひとつのテーマと、使える英語のフレーズを日本語訳つきで表示します。フレーズを手がかりに英語で一文だけ書き、日付ごとに残せます。添削はしません。",b:1,c:"#C46B4E",b:true,u:"https://appworld-lab.pages.dev/eigo/"},
  {id:"dot-maker",n:"ドット絵メーカー",t:"写真をレトロなドット絵に変えて、PNGで保存",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-01",x:"写真を昔のゲームのようなドット絵に変換します。ドットの数、色の数、レトロなパレット、ディザと輪郭線を選んで、PNG画像で保存できます。",b:1,c:"#3F8FB5",b:true,u:"https://appworld-lab.pages.dev/dot/"},
  {id:"tabi-shiori",n:"旅のしおり",t:"行き先と日程から、予定表と持ち物リストを作成",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-31",x:"行き先、日程、旅のスタイルを選ぶと、書きかえられる日ごとの予定表と、季節や温泉・車などの条件に合わせた持ち物リストを作ります。そのまま印刷もできます。",c:"#5C8FB0",b:true,u:"https://appworld-lab.pages.dev/tabi/"},
  {id:"ohanashi-timer",n:"おはなしタイマー",t:"3分の歯みがきを、お話と場所の案内でサポート",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-30",x:"3分の歯みがきタイマーです。30秒ごとにみがく場所を口の図で知らせ、6つのお話のどれかがひと場面ずつ進みます。読み上げもできます。",c:"#D48FA3",b:true,u:"https://appworld-lab.pages.dev/hamigaki/"},
  {id:"pomodoro-hako",n:"ポモドーロ箱",t:"集中のたびに一言だけ残す、キッチンタイマー風の集中タイマー",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-30",x:"15・25・50分から選んで集中し、終わるたびにやったことを一言だけ記録します。休憩に切り替えられ、今日の記録のコピーと、今週の曜日ごとの合計も見られます。",c:"#C2553F",b:true,u:"https://appworld-lab.pages.dev/pomodoro/"},
  {id:"kotoba-cards",n:"ことばカード",t:"忘れかけたころに出る、自分で作る単語カード",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-29",x:"表と裏を書いてカードを作り、「わかった」「あやしい」「わからない」で答えると、次に出す日を自動で決めます。ビジネス敬語30枚のデッキ付きです。",c:"#7A6BC4",b:true,u:"https://appworld-lab.pages.dev/kotoba/"},
  {id:"sanpo-log",n:"さんぽログ",t:"見たものと気分を残す、さんぽの日記",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-28",x:"さんぽの時間を計り、見たもの、気分、ひとことを記録します。歩いた日がカレンダーで色づき、連続日数と月の合計がわかります。毎日「今日のおさんぽテーマ」も出ます。",c:"#4E9A7B",b:true,u:"https://appworld-lab.pages.dev/sanpo/"},
  {id:"commit-poem",n:"コミット短歌",t:"コミットメッセージを、五七五七七の短歌にする遊び",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-27",x:"コミットメッセージから修正や追加などの種類と単語を拾い、手書きの言葉の型にはめて短歌を作ります。ふりがなと各句の音の数を表示し、「もう一首」で詠み直せます。",c:"#55606E",b:true,u:"https://appworld-lab.pages.dev/commit/"},
  {id:"oekaki-iro",n:"おえかき色見本",t:"写真から3〜8色を取り出して、色見本カードに",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-26",x:"写真から3〜8色の配色を取り出し、HEXとRGBを表示します。気に入った色を固定して残りを作り直したり、色見本カードをPNG画像で保存したりできます。",c:"#C9894A",b:true,u:"https://appworld-lab.pages.dev/palette/"},
  {id:"quiz-yokocho",n:"クイズ横丁",t:"毎日1問の4択早押し。結果をコピーして比べる",p:"Web",g:"遊び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-25",x:"1日1問の4択クイズです。同じ日なら誰でも同じ問題で、答えるまでの秒数を計ります。結果を文字でコピーして、友だちと比べられます。",c:"#B8892E",b:true,u:"https://appworld-lab.pages.dev/quiz/"},
  {id:"mitsumori-kun",n:"見積もりくん",t:"忘れがちな作業と予備を足して、見積もり表を作る",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-24",x:"作業をS・M・Lか時間で並べ、単価と予備の割合を選ぶと、テストや打ち合わせなど忘れがちな作業をルールで足して、合計の時間と金額を出します。表としてコピーできます。",c:"#3F6E9E",b:true,u:"https://appworld-lab.pages.dev/mitsumori/"},
  {id:"mizu-nomu",n:"みずのむ",t:"タップで水分を記録。ボトルが満ちていく",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-23",x:"飲んだ量をコップの大きさで選んで記録します。目標までボトルが満ちていき、取り消しや削除、7日間の棒グラフも見られます。",c:"#3E9AB8",b:true,u:"https://appworld-lab.pages.dev/mizu/"},
  {id:"haiku-camera",n:"俳句カメラ",t:"写真と自作の五七五を、縦書きのカード画像に",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-22",x:"写真を選び、季節と季語を選んで、自分で五・七・五を詠みます。行ごとに音の数を数え、写真と縦書きの句を1枚のPNG画像にします。句は自動で作りません。",c:"#8E6B9E",b:true,u:"https://appworld-lab.pages.dev/haiku/"},
  {id:"bug-hunter",n:"バグ探し練習帳",t:"1日1問、コードからバグのある行を探す練習",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-21",x:"JavaScriptかPythonの短いコードから、バグのある行をタップで当てる練習帳です。答えると原因と直し方がわかります。毎日1問と全41問の練習があります。",c:"#6B7480",b:true,u:"https://appworld-lab.pages.dev/bug/"},
];

/* Name candidates (review only). The choice is remembered per browser so both pages agree. */
(function () {
  const NAMES = ["App World"];   // decided 2026-11-05 (D-016)
  let current = NAMES[0];
  try { const saved = localStorage.getItem("preview-name"); if (NAMES.includes(saved)) current = saved; } catch (e) {}
  const apply = n => {
    document.querySelectorAll(".js-name").forEach(e => { e.textContent = n; });
    document.title = n + " | " + (document.documentElement.dataset.page || "見本");
  };
  const box = document.getElementById("names");
  if (box) NAMES.forEach(n => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = n; b.setAttribute("aria-pressed", n === current ? "true" : "false");
    b.onclick = () => {
      current = n; apply(n);
      try { localStorage.setItem("preview-name", n); } catch (e) {}
      box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    };
    box.append(b, " ");
  });
  apply(current);
})();
