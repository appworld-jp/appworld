/* Sample listings shared by the preview pages (all fictional). On the real site build.py would write this from site/apps/*.json. */
window.TODAY = "2026-11-05";
window.APPS = [
  {id:"kondate-ai",n:"こんだてAI",t:"冷蔵庫の写真から、今夜の献立を3つ提案",p:"Web",g:"暮らし",a:"Claude Code",m:"ゆう",d:"2026-11-05",x:"冷蔵庫の中を撮ると、使い切りたい食材を優先して献立を3つ出します。買い物リストもまとめて作れます。平日の「今日なに作ろう」を、10秒で終わらせるために作りました。",c:"#D9775A"},
  {id:"tsundoku-zero",n:"積読ゼロ",t:"買ったまま読んでいない本を、1日10分ずつ消化",p:"iPhone",g:"学び",a:"Cursor",m:"mori",d:"2026-11-05",x:"買ったまま読んでいない本を登録すると、1日10分で読める量に分けて毎朝お知らせします。読み終えた本は本棚に並び、少しずつ積読が減っていくのが見えます。",c:"#3E8C84"},
  {id:"gym-memo",n:"ジムメモ",t:"セット間の休憩中に、片手で記録できる筋トレメモ",p:"Android",g:"健康・運動",a:"Codex",m:"ken",d:"2026-11-05",x:"セット間の休憩中に、片手で重さと回数を記録できる筋トレメモです。前回の記録が最初から入っているので、変わったところだけ直せば終わります。",c:"#4C6FD1"},
  {id:"review-draft",n:"レビュー下書き",t:"プルリクの差分から、レビューの観点を自動で下書き",p:"Web",g:"開発者向け",a:"Claude Code",m:"tanaka",d:"2026-11-05",x:"プルリクエストの差分を貼ると、レビューで見るべき観点（命名、例外処理、テストの抜け）を下書きします。レビューの最初の5分を短くするための道具です。",c:"#6A6F7A"},
  {id:"ehon-maker",n:"えほんメーカー",t:"子どもの好きなものから、寝る前のお話を作る",p:"Web",g:"創作",a:"v0",m:"さき",d:"2026-11-05",x:"子どもの好きなもの（恐竜、電車、いちごなど）を3つ選ぶと、寝る前に読める短いお話を作ります。読み聞かせの声の速さも選べます。",c:"#B9567E"},
  {id:"shift-swap",n:"シフト交換板",t:"バイト仲間どうしで、シフトの交換相手をすぐ探せる",p:"Web",g:"仕事・効率化",a:"Lovable",m:"ryo",d:"2026-11-05",x:"同じ職場のバイト仲間どうしで、交換したいシフトを出し合える掲示板です。店長への連絡文も自動で作ります。",b:1,c:"#8A64C8"},
  {id:"hitokoto-kanji",n:"ひとこと漢字",t:"通勤の1駅で1問、大人の読めそうで読めない漢字",p:"iPhone",g:"遊び",a:"Replit",m:"hana",d:"2026-11-05",x:"通勤の1駅のあいだに1問、大人が読めそうで読めない漢字を出題します。間違えた漢字は翌週にもう一度出ます。",c:"#C9A13A"},
  {id:"kakei-hitome",n:"家計ひとめ",t:"レシートを撮るだけで、今月の使いすぎがひと目で分かる",p:"iPhone",g:"暮らし",a:"Claude Code",m:"natsu",d:"2026-11-04",x:"レシートを撮るだけで、食費・日用品・外食に自動で分けます。今月どこで使いすぎているかが、ひと目で分かります。",c:"#4E9A6B"},
  {id:"gijiroku",n:"議事録まとめ",t:"会議の録音から、決まったことと宿題だけを抜き出す",p:"Web",g:"仕事・効率化",a:"Cursor",m:"kei",d:"2026-11-04",x:"会議の録音を読み込むと、決まったことと、誰がいつまでに何をするかだけを抜き出します。長い議事録を読む時間をなくします。",c:"#5A7FA0"},
  {id:"nemu-log",n:"ねむログ",t:"寝る前の3タップで、睡眠のリズムを記録する",p:"Android",g:"健康・運動",a:"Gemini",m:"aoi",d:"2026-11-03",x:"寝る前に3回タップするだけで、寝た時刻と起きた時刻、眠りの深さの感覚を記録します。1週間ごとにリズムをグラフで返します。",c:"#6C5BB0"},
  {id:"eigo-nikki",n:"英語ひとこと日記",t:"今日の出来事を一文書くと、自然な英語に直してくれる",p:"iPhone",g:"学び",a:"Claude Code",m:"rin",d:"2026-11-02",x:"今日の出来事を日本語か英語で一文書くと、自然な英語に直し、使った表現をひとつだけ解説します。続けると自分の表現集ができます。",b:1,c:"#C46B4E"},
  {id:"dot-maker",n:"ドット絵メーカー",t:"写真を、ゲーム風のドット絵に変換して保存できる",p:"Web",g:"創作",a:"Bolt",m:"sho",d:"2026-11-01",x:"写真を選ぶと、ゲーム風のドット絵に変換します。色数と粗さを選べて、アイコンやSNSの画像として保存できます。",b:1,c:"#3F8FB5"},
  {id:"tabi-shiori",n:"旅のしおり",t:"行き先と日数を入れると、旅程表と持ち物リストを作る",p:"Web",g:"暮らし",a:"Claude Code",m:"yuki",d:"2026-10-31",x:"行き先と日数、行きたい場所をいくつか入れると、移動時間を考えた旅程表と持ち物リストを作ります。同行者と共有できます。",c:"#5C8FB0"},
  {id:"ohanashi-timer",n:"おはなしタイマー",t:"子どもの歯みがきを、お話を聞きながら3分続ける",p:"iPhone",g:"暮らし",a:"Cursor",m:"mio",d:"2026-10-30",x:"歯みがきの3分間、キャラクターがお話を読み聞かせます。毎日少しずつ続くお話なので、子どもが自分から歯みがきをしたがります。",c:"#D48FA3"},
  {id:"pomodoro-hako",n:"ポモドーロ箱",t:"25分ごとに、今やったことを一言だけ記録する集中タイマー",p:"Web",g:"仕事・効率化",a:"v0",m:"taku",d:"2026-10-30",x:"25分の集中が終わるたびに、やったことを一言だけ残します。1日の終わりに、その一言を並べた振り返りができます。",c:"#C2553F"},
  {id:"kotoba-cards",n:"ことばカード",t:"覚えたい単語を、忘れかけたころにもう一度出す暗記カード",p:"Android",g:"学び",a:"Claude Code",m:"nao",d:"2026-10-29",x:"覚えたい言葉を登録すると、忘れかけたタイミングを計算して出題します。英単語でも資格の用語でも使えます。",c:"#7A6BC4"},
  {id:"sanpo-log",n:"さんぽログ",t:"歩いた道を地図に塗って、近所の未踏の道を見つける",p:"iPhone",g:"健康・運動",a:"Codex",m:"ta",d:"2026-10-28",x:"散歩した道が地図に塗られていきます。まだ歩いていない道がひと目で分かるので、いつもの散歩に少しの冒険が足せます。",c:"#4E9A7B"},
  {id:"commit-poem",n:"コミット短歌",t:"コミットの差分を、五七五七七にまとめてくれる",p:"Web",g:"開発者向け",a:"Claude Code",m:"dev_k",d:"2026-10-27",x:"コミットの差分を読み込んで、変更の内容を短歌にします。チームのチャットに流すと、少しだけ空気がやわらぎます。",c:"#55606E"},
  {id:"oekaki-iro",n:"おえかき色見本",t:"写真から、絵に使える5色の配色を取り出す",p:"Web",g:"創作",a:"Bolt",m:"iro",d:"2026-10-26",x:"写真を選ぶと、絵やデザインに使いやすい5色を取り出します。色の名前とコードもまとめてコピーできます。",c:"#C9894A"},
  {id:"quiz-yokocho",n:"クイズ横丁",t:"友だちと同じ時間に解く、1日1問の早押しクイズ",p:"Android",g:"遊び",a:"Gemini",m:"kai",d:"2026-10-25",x:"毎晩9時に1問だけ出題され、友だちと早押しで競います。1日1問なので、続けやすく、話のきっかけにもなります。",c:"#B8892E"},
  {id:"mitsumori-kun",n:"見積もりくん",t:"作業の内容を書くと、工数の見積もりと内訳を下書きする",p:"Web",g:"仕事・効率化",a:"Cursor",m:"sora",d:"2026-10-24",x:"作業の内容を書くと、作業ごとの工数と、見落としやすい作業を含めた内訳を下書きします。見積もりの最初のたたき台に。",c:"#3F6E9E"},
  {id:"mizu-nomu",n:"みずのむ",t:"飲んだ水を、ボトルの写真から自動で記録する",p:"iPhone",g:"健康・運動",a:"Replit",m:"hiro",d:"2026-10-23",x:"ボトルの写真を撮るだけで、残りの量から飲んだ量を記録します。1日の目安に届かない日は、夕方にそっと知らせます。",c:"#3E9AB8"},
  {id:"haiku-camera",n:"俳句カメラ",t:"撮った写真から、季語入りの一句を詠む",p:"iPhone",g:"創作",a:"Claude Code",m:"shiki",d:"2026-10-22",x:"写真を撮ると、写っているものと季節から季語を選び、一句を詠みます。気に入った句は写真と一緒に保存できます。",c:"#8E6B9E"},
  {id:"bug-hunter",n:"バグ探し練習帳",t:"わざとバグを入れたコードで、レビューの目を鍛える",p:"Web",g:"開発者向け",a:"Codex",m:"rev",d:"2026-10-21",x:"わざとバグを仕込んだ短いコードが毎日出題されます。どこが危ないかを答えると、解説と、実務で起きた例が読めます。",c:"#6B7480"}
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
