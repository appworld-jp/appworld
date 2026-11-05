/* Sample listings shared by the preview pages (all fictional). On the real site build.py would write this from site/apps/*.json. */
window.TODAY = "2026-11-05";
window.APPS = [
  {n:"こんだてAI",t:"冷蔵庫の写真から、今夜の献立を3つ提案",p:"Web",g:"暮らし",a:"Claude Code",m:"ゆう",d:"2026-11-05",c:"#D9775A"},
  {n:"積読ゼロ",t:"買ったまま読んでいない本を、1日10分ずつ消化",p:"iPhone",g:"学び",a:"Cursor",m:"mori",d:"2026-11-05",c:"#3E8C84"},
  {n:"ジムメモ",t:"セット間の休憩中に、片手で記録できる筋トレメモ",p:"Android",g:"健康・運動",a:"Codex",m:"ken",d:"2026-11-05",c:"#4C6FD1"},
  {n:"レビュー下書き",t:"プルリクの差分から、レビューの観点を自動で下書き",p:"Web",g:"開発者向け",a:"Claude Code",m:"tanaka",d:"2026-11-05",c:"#6A6F7A"},
  {n:"えほんメーカー",t:"子どもの好きなものから、寝る前のお話を作る",p:"Web",g:"創作",a:"v0",m:"さき",d:"2026-11-05",c:"#B9567E"},
  {n:"シフト交換板",t:"バイト仲間どうしで、シフトの交換相手をすぐ探せる",p:"Web",g:"仕事・効率化",a:"Lovable",m:"ryo",d:"2026-11-05",c:"#8A64C8"},
  {n:"ひとこと漢字",t:"通勤の1駅で1問、大人の読めそうで読めない漢字",p:"iPhone",g:"遊び",a:"Replit",m:"hana",d:"2026-11-05",c:"#C9A13A"},
  {n:"家計ひとめ",t:"レシートを撮るだけで、今月の使いすぎがひと目で分かる",p:"iPhone",g:"暮らし",a:"Claude Code",m:"natsu",d:"2026-11-04",c:"#4E9A6B"},
  {n:"議事録まとめ",t:"会議の録音から、決まったことと宿題だけを抜き出す",p:"Web",g:"仕事・効率化",a:"Cursor",m:"kei",d:"2026-11-04",c:"#5A7FA0"},
  {n:"ねむログ",t:"寝る前の3タップで、睡眠のリズムを記録する",p:"Android",g:"健康・運動",a:"Gemini",m:"aoi",d:"2026-11-03",c:"#6C5BB0"},
  {n:"英語ひとこと日記",t:"今日の出来事を一文書くと、自然な英語に直してくれる",p:"iPhone",g:"学び",a:"Claude Code",m:"rin",d:"2026-11-02",c:"#C46B4E"},
  {n:"ドット絵メーカー",t:"写真を、ゲーム風のドット絵に変換して保存できる",p:"Web",g:"創作",a:"Bolt",m:"sho",d:"2026-11-01",c:"#3F8FB5"}
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
