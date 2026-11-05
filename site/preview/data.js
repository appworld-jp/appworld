/* Sample listings shared by the preview pages (all fictional). On the real site build.py would write this from site/apps/*.json. */
window.TODAY = "2026-11-05";
window.APPS = [
  {id:"kondate-ai",n:"こんだてAI",t:"冷蔵庫の写真から、今夜の献立を3つ提案",p:"Web",g:"暮らし",a:"Claude Code",m:"ゆう",d:"2026-11-05",x:"冷蔵庫の中を撮ると、使い切りたい食材を優先して献立を3つ出します。買い物リストもまとめて作れます。平日の「今日なに作ろう」を、10秒で終わらせるために作りました。",c:"#D9775A"},
  {id:"tsundoku-zero",n:"積読ゼロ",t:"買ったまま読んでいない本を、1日10分ずつ消化",p:"iPhone",g:"学び",a:"Cursor",m:"mori",d:"2026-11-05",x:"買ったまま読んでいない本を登録すると、1日10分で読める量に分けて毎朝お知らせします。読み終えた本は本棚に並び、少しずつ積読が減っていくのが見えます。",c:"#3E8C84"},
  {id:"gym-memo",n:"ジムメモ",t:"セット間の休憩中に、片手で記録できる筋トレメモ",p:"Android",g:"健康・運動",a:"Codex",m:"ken",d:"2026-11-05",x:"セット間の休憩中に、片手で重さと回数を記録できる筋トレメモです。前回の記録が最初から入っているので、変わったところだけ直せば終わります。",c:"#4C6FD1"},
  {id:"review-draft",n:"レビュー下書き",t:"プルリクの差分から、レビューの観点を自動で下書き",p:"Web",g:"開発者向け",a:"Claude Code",m:"tanaka",d:"2026-11-05",x:"プルリクエストの差分を貼ると、レビューで見るべき観点（命名、例外処理、テストの抜け）を下書きします。レビューの最初の5分を短くするための道具です。",c:"#6A6F7A"},
  {id:"ehon-maker",n:"えほんメーカー",t:"子どもの好きなものから、寝る前のお話を作る",p:"Web",g:"創作",a:"v0",m:"さき",d:"2026-11-05",x:"子どもの好きなもの（恐竜、電車、いちごなど）を3つ選ぶと、寝る前に読める短いお話を作ります。読み聞かせの声の速さも選べます。",c:"#B9567E"},
  {id:"shift-swap",n:"シフト交換板",t:"バイト仲間どうしで、シフトの交換相手をすぐ探せる",p:"Web",g:"仕事・効率化",a:"Lovable",m:"ryo",d:"2026-11-05",x:"同じ職場のバイト仲間どうしで、交換したいシフトを出し合える掲示板です。店長への連絡文も自動で作ります。",c:"#8A64C8"},
  {id:"hitokoto-kanji",n:"ひとこと漢字",t:"通勤の1駅で1問、大人の読めそうで読めない漢字",p:"iPhone",g:"遊び",a:"Replit",m:"hana",d:"2026-11-05",x:"通勤の1駅のあいだに1問、大人が読めそうで読めない漢字を出題します。間違えた漢字は翌週にもう一度出ます。",c:"#C9A13A"},
  {id:"kakei-hitome",n:"家計ひとめ",t:"レシートを撮るだけで、今月の使いすぎがひと目で分かる",p:"iPhone",g:"暮らし",a:"Claude Code",m:"natsu",d:"2026-11-04",x:"レシートを撮るだけで、食費・日用品・外食に自動で分けます。今月どこで使いすぎているかが、ひと目で分かります。",c:"#4E9A6B"},
  {id:"gijiroku",n:"議事録まとめ",t:"会議の録音から、決まったことと宿題だけを抜き出す",p:"Web",g:"仕事・効率化",a:"Cursor",m:"kei",d:"2026-11-04",x:"会議の録音を読み込むと、決まったことと、誰がいつまでに何をするかだけを抜き出します。長い議事録を読む時間をなくします。",c:"#5A7FA0"},
  {id:"nemu-log",n:"ねむログ",t:"寝る前の3タップで、睡眠のリズムを記録する",p:"Android",g:"健康・運動",a:"Gemini",m:"aoi",d:"2026-11-03",x:"寝る前に3回タップするだけで、寝た時刻と起きた時刻、眠りの深さの感覚を記録します。1週間ごとにリズムをグラフで返します。",c:"#6C5BB0"},
  {id:"eigo-nikki",n:"英語ひとこと日記",t:"今日の出来事を一文書くと、自然な英語に直してくれる",p:"iPhone",g:"学び",a:"Claude Code",m:"rin",d:"2026-11-02",x:"今日の出来事を日本語か英語で一文書くと、自然な英語に直し、使った表現をひとつだけ解説します。続けると自分の表現集ができます。",c:"#C46B4E"},
  {id:"dot-maker",n:"ドット絵メーカー",t:"写真を、ゲーム風のドット絵に変換して保存できる",p:"Web",g:"創作",a:"Bolt",m:"sho",d:"2026-11-01",x:"写真を選ぶと、ゲーム風のドット絵に変換します。色数と粗さを選べて、アイコンやSNSの画像として保存できます。",c:"#3F8FB5"}
];

/* Name candidates (review only). The choice is remembered per browser so both pages agree. */
(function () {
  const NAMES = ["NOA", "ORBIS", "MIRA", "ARC", "LUMEN", "AO", "EIRA"];
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
