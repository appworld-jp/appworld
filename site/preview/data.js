/* Sample listings shared by the preview pages. They point to the operator's own App World Lab apps. On the real site build.py would write this from site/apps/*.json. */
window.TODAY = "2026-11-05";
window.APPS = [
  {id:"kondate-ai",n:"こんだて帖",t:"冷蔵庫の食材から、今夜の3品が決まる",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"家にある食材を選ぶと、手持ちをいちばん使える晩ごはんを3品選びます。足りない食材は買い物リストにまとめて、コピーもできます。",c:"#D9775A",b:true,u:"https://appworld-lab.pages.dev/kondate/"},
  {id:"tsundoku-zero",n:"積読ゼロ",t:"積んだ本を、1日10分ずつ読み切れる",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"積んだままの本を、1日10分ずつ読み切る。今日読むページがひと目でわかり、読み終えた本は本棚に並びます。",c:"#3E8C84",b:true,u:"https://appworld-lab.pages.dev/tsundoku/"},
  {id:"gym-memo",n:"ジムメモ",t:"前回の数字が入っていて、押すだけで記録",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"前回の重さと回数が最初から入るので、ジムではボタンを押すだけ。記録すると休憩タイマーが動き、種目ごとのベストもわかります。",c:"#4C6FD1",b:true,u:"https://appworld-lab.pages.dev/gym/"},
  {id:"review-draft",n:"レビュー下書き",t:"git diffを貼るだけで、レビューの指摘と下書き",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"git diffを貼るだけで、消し忘れのconsole.logやTODO、テスト不足、鍵の書き込みなどを決まったルールで探し、チェックリストとレビューコメントの下書きを作ります。",c:"#6A6F7A",b:true,u:"https://appworld-lab.pages.dev/review/"},
  {id:"ehon-maker",n:"えほんメーカー",t:"3つ選ぶと、寝る前に読む絵本ができる",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"主人公と場所と好きなものを選ぶだけで、人が書いたお話の型から、寝る前に読む6ページの絵本ができます。読み上げもできます。",c:"#B9567E",b:true,u:"https://appworld-lab.pages.dev/ehon/"},
  {id:"shift-swap",n:"シフト交換板",t:"日時を入れるだけで、シフト交代の依頼文とリンク",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"シフトを代わってほしいとき、日にちと時間を入れるだけでグループに貼れる依頼文とリンクができます。リンクを開いた人は、名前を入れるだけで返事を作れます。",b:1,c:"#8A64C8",b:true,u:"https://appworld-lab.pages.dev/shift/"},
  {id:"hitokoto-kanji",n:"ひとこと漢字",t:"読み間違えやすい漢字を、一日一問",p:"Web",g:"遊び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-05",x:"大人が読み間違えやすい漢字を、一日一問。四択で答えて、意味もいっしょに覚えられます。間違えた言葉は復習できます。",c:"#C9A13A",b:true,u:"https://appworld-lab.pages.dev/kanji/"},
  {id:"kakei-hitome",n:"家計ひとめ",t:"金額と項目を押すだけの家計簿",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-04",x:"金額を入れて項目を押すだけの家計簿。今月いくら使ったか、予算の残りと1日に使える額がすぐわかります。",c:"#4E9A6B",b:true,u:"https://appworld-lab.pages.dev/kakei/"},
  {id:"gijiroku",n:"議事録まとめ",t:"会議メモを貼るだけで、決定・宿題・持ち越しに分類",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-04",x:"会議のメモを貼るだけで、決まったこと・宿題（担当・期限）・持ち越しに分けて、チャットに貼れるまとめを作ります。AIは使わず、言葉の決まりで分けます。",c:"#5A7FA0",b:true,u:"https://appworld-lab.pages.dev/gijiroku/"},
  {id:"nemu-log",n:"ねむログ",t:"寝る・起きたを押すだけで眠りが見える",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-03",x:"寝るときと起きたときに押すだけの睡眠記録。1週間の眠りを帯グラフで見られて、記録が3日分になると傾向に合わせたヒントが出ます。",c:"#6C5BB0",b:true,u:"https://appworld-lab.pages.dev/nemu/"},
  {id:"eigo-nikki",n:"英語ひとこと日記",t:"フレーズを見ながら、英語で一文日記",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-02",x:"毎日ひとつのテーマで、英語の日記を一文だけ。使えるフレーズ付きなので書き出しに迷いません。添削はしません。",b:1,c:"#C46B4E",b:true,u:"https://appworld-lab.pages.dev/eigo/"},
  {id:"dot-maker",n:"ドット絵メーカー",t:"写真を昔のゲーム風ドット絵に",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-11-01",x:"写真を選ぶだけで、昔のゲーム風のドット絵になります。細かさや色づかい、網目やふちどりを選んで、画像で保存できます。",b:1,c:"#3F8FB5",b:true,u:"https://appworld-lab.pages.dev/dot/"},
  {id:"tabi-shiori",n:"旅のしおり",t:"行き先と日にちで、旅のしおりができる",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-31",x:"行き先と日程、旅のスタイルを選ぶと、日ごとの予定表と持ち物リストができます。予定は書きかえられ、そのまま印刷もできます。",c:"#5C8FB0",b:true,u:"https://appworld-lab.pages.dev/tabi/"},
  {id:"ohanashi-timer",n:"おはなしタイマー",t:"3分みがくと、お話が1つ聞ける歯みがきタイマー",p:"Web",g:"暮らし",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-30",x:"子どもと使う3分の歯みがきタイマー。30秒ごとにみがく場所を図で教え、オリジナルのお話がひと場面ずつ進みます。読み上げもできます。",c:"#D48FA3",b:true,u:"https://appworld-lab.pages.dev/hamigaki/"},
  {id:"pomodoro-hako",n:"ポモドーロ箱",t:"スタートひとつで、集中と休憩を交互に計るタイマー",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-30",x:"キッチンタイマーのような集中タイマー。集中と休憩を交互に計り、終わるたびにやったことを一言残せます。今日の記録と今週の合計も見られます。",c:"#C2553F",b:true,u:"https://appworld-lab.pages.dev/pomodoro/"},
  {id:"kotoba-cards",n:"ことばカード",t:"忘れかけたころに出る、自分の単語カード",p:"Web",g:"学び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-29",x:"覚えたい言葉をカードにすると、忘れかけたころにもう一度出てきます。答えの手ごたえで次の日が決まります。ビジネス敬語30枚入り。",c:"#7A6BC4",b:true,u:"https://appworld-lab.pages.dev/kotoba/"},
  {id:"sanpo-log",n:"さんぽログ",t:"歩いた日にスタンプ、見つけたものを日記に",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-28",x:"散歩の時間を計って、見たものと気分をひとことと一緒に残す日記。歩いた日はカレンダーにスタンプが押され、続けるほど緑が濃くなります。位置情報は使いません。",c:"#4E9A7B",b:true,u:"https://appworld-lab.pages.dev/sanpo/"},
  {id:"commit-poem",n:"コミット短歌",t:"コミットメッセージが、五七五七七の短歌になる",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-27",x:"コミットメッセージを貼るだけで、五・七・五・七・七の短歌になります。用意した言葉の型にメッセージの単語をはめて詠む遊びで、音の数とよみがなも表示します。",c:"#55606E",b:true,u:"https://appworld-lab.pages.dev/commit/"},
  {id:"oekaki-iro",n:"おえかき色見本",t:"写真の色が、そのまま色見本カードに",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-26",x:"写真を選ぶだけで、その写真の色が3〜8色の色見本になります。気に入った色を固定して作り直したり、色コードのコピーやカード画像の保存もできます。",c:"#C9894A",b:true,u:"https://appworld-lab.pages.dev/palette/"},
  {id:"quiz-yokocho",n:"クイズ横丁",t:"毎日1問の早押し4択、秒数を友だちと比べる",p:"Web",g:"遊び",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-25",x:"毎日1問の早押し4択クイズ。今日の問題はみんな同じなので、答えた秒数を友だちと比べられます。練習問題もあります。",c:"#B8892E",b:true,u:"https://appworld-lab.pages.dev/quiz/"},
  {id:"mitsumori-kun",n:"見積もりくん",t:"作業を並べるだけで、忘れがちな作業込みの見積もり",p:"Web",g:"仕事・効率化",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-24",x:"作業をS・M・Lで並べるだけで、テストや打ち合わせなど忘れがちな作業と予備の時間を足し、税込の金額まで出します。文章・Markdown・表計算用でコピーできます。",c:"#3F6E9E",b:true,u:"https://appworld-lab.pages.dev/mitsumori/"},
  {id:"mizu-nomu",n:"みずのむ",t:"タップで記録、ボトルが満ちていく水分記録",p:"Web",g:"健康・運動",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-23",x:"飲んだ量をコップのボタンで記録すると、ボトルに水がたまっていきます。1日の目標までの残りと、7日間の記録がわかります。",c:"#3E9AB8",b:true,u:"https://appworld-lab.pages.dev/mizu/"},
  {id:"haiku-camera",n:"俳句カメラ",t:"写真に一句添えて、縦書きの俳句カードに",p:"Web",g:"創作",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-22",x:"写真に自分で詠んだ一句を添えて、縦書きの俳句カードに。音の数を数えながら詠めて、画像で保存できます。句は自動では作りません。",c:"#8E6B9E",b:true,u:"https://appworld-lab.pages.dev/haiku/"},
  {id:"bug-hunter",n:"バグ探し練習帳",t:"1日1問、バグのある行を当てる練習帳",p:"Web",g:"開発者向け",a:"Claude Code",m:"App World Lab（運営）",d:"2026-10-21",x:"1日1問、JavaScriptかPythonの短いコードからバグのある行を当てる練習帳。答えると、原因と直し方、実際に起きる事故がわかります。全41問。",c:"#6B7480",b:true,u:"https://appworld-lab.pages.dev/bug/"},
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
