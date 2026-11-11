// 洗濯表示の記号データ（JIS L 0001:2014 / ISO 3758 に対応、2016年12月から）と、旧表示（JIS L 0217、2016年11月まで）。
// 意味（mean）は JIS の定義をやさしく言いかえたもの。do は実際にどうすればいいか。
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  const CATS = [
    { id: "wash", name: "洗濯", shape: "おけの形", note: "数字は洗う水の温度の上限（℃）。下の線が増えるほど、やさしく洗います。" },
    { id: "bleach", name: "漂白", shape: "三角", note: "漂白剤を使えるかどうか。塩素系と酸素系で分かれます。" },
    { id: "tumble", name: "タンブル乾燥", shape: "四角に丸", note: "乾燥機（回転させて温風で乾かす）を使えるかどうか。点の数は温度です。" },
    { id: "dry", name: "自然乾燥", shape: "四角に線", note: "干し方。縦線はつり干し、横線は平干し、2本はぬれたまま、左上の斜線は日陰です。" },
    { id: "iron", name: "アイロン", shape: "アイロンの形", note: "点の数がアイロンの温度。点が多いほど高温にできます。" },
    { id: "pro", name: "クリーニング", shape: "丸", note: "クリーニング店での処理。PとFはドライクリーニング、Wはプロの水洗い（ウエット）です。" }
  ];

  // k: 描き方。bars: 下線の数。x: バツ。
  const S = [
    // 洗濯（家庭洗濯）
    { id: "w95", cat: "wash", k: "tub", t: "95", name: "95℃まで・洗濯機", mean: "液温は95℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。熱いお湯で洗えるほど丈夫な、綿の白物などに付く記号です。" },
    { id: "w70", cat: "wash", k: "tub", t: "70", name: "70℃まで・洗濯機", mean: "液温は70℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。" },
    { id: "w60", cat: "wash", k: "tub", t: "60", name: "60℃まで・洗濯機", mean: "液温は60℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。" },
    { id: "w60b", cat: "wash", k: "tub", t: "60", bars: 1, name: "60℃まで・弱く", mean: "液温は60℃を上限に、洗濯機で弱く洗えます。", do: "洗濯機の弱いコース（おしゃれ着・ドライ・手洗いなどの名前のコース）で洗います。" },
    { id: "w50", cat: "wash", k: "tub", t: "50", name: "50℃まで・洗濯機", mean: "液温は50℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。" },
    { id: "w50b", cat: "wash", k: "tub", t: "50", bars: 1, name: "50℃まで・弱く", mean: "液温は50℃を上限に、洗濯機で弱く洗えます。", do: "洗濯機の弱いコース（おしゃれ着・ドライ・手洗いなどの名前のコース）で洗います。" },
    { id: "w40", cat: "wash", k: "tub", t: "40", name: "40℃まで・洗濯機", mean: "液温は40℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。お風呂の残り湯くらいの温度までなら大丈夫です。" },
    { id: "w40b", cat: "wash", k: "tub", t: "40", bars: 1, name: "40℃まで・弱く", mean: "液温は40℃を上限に、洗濯機で弱く洗えます。", do: "洗濯機の弱いコース（おしゃれ着・ドライ・手洗いなどの名前のコース）で洗います。洗濯ネットに入れると安心です。" },
    { id: "w40c", cat: "wash", k: "tub", t: "40", bars: 2, name: "40℃まで・とても弱く", mean: "液温は40℃を上限に、洗濯機でとても弱く洗えます。", do: "洗濯機のいちばん弱いコースで、洗濯ネットに入れて洗います。おしゃれ着用の中性洗剤がおすすめです。" },
    { id: "w30", cat: "wash", k: "tub", t: "30", name: "30℃まで・洗濯機", mean: "液温は30℃を上限に、洗濯機で普通に洗えます。", do: "洗濯機の標準コースで洗えます。お湯は使わず、水かぬるま湯で。" },
    { id: "w30b", cat: "wash", k: "tub", t: "30", bars: 1, name: "30℃まで・弱く", mean: "液温は30℃を上限に、洗濯機で弱く洗えます。", do: "洗濯機の弱いコース（おしゃれ着・ドライ・手洗いなどの名前のコース）で、水かぬるま湯で洗います。" },
    { id: "w30c", cat: "wash", k: "tub", t: "30", bars: 2, name: "30℃まで・とても弱く", mean: "液温は30℃を上限に、洗濯機でとても弱く洗えます。", do: "洗濯機のいちばん弱いコースで、洗濯ネットに入れて水で洗います。おしゃれ着用の中性洗剤がおすすめです。" },
    { id: "whand", cat: "wash", k: "hand", name: "手洗い", mean: "液温は40℃を上限に、手洗いができます。", do: "手でやさしく押し洗いします。もんだり、こすったりは避けます。洗濯機の「手洗いコース」を使うなら、洗濯機の説明書で確かめてから。" },
    { id: "wno", cat: "wash", k: "tub", x: true, name: "家で洗えない", mean: "家庭での洗濯はできません。", do: "家では洗わず、クリーニング店に出します。下のクリーニングの記号も確認してください。" },
    // 漂白
    { id: "b_any", cat: "bleach", k: "tri", name: "漂白剤OK", mean: "塩素系と酸素系、どちらの漂白剤も使えます。", do: "どの漂白剤でも使えます。塩素系は色柄物の色を抜くので、使うのは白物だけにします。" },
    { id: "b_oxy", cat: "bleach", k: "tri", oxy: true, name: "酸素系だけOK", mean: "酸素系の漂白剤は使えますが、塩素系は使えません。", do: "「酸素系」「色柄物にも使える」と書かれた漂白剤を使います。「塩素系」と書かれたものは使いません。" },
    { id: "b_no", cat: "bleach", k: "tri", x: true, name: "漂白剤NG", mean: "漂白剤は使えません（塩素系も酸素系も）。", do: "漂白剤は使いません。漂白剤入りの洗剤にも気を付けます。" },
    // タンブル乾燥
    { id: "t2", cat: "tumble", k: "tumble", dots: 2, name: "乾燥機OK", mean: "乾燥機が使えます（排気温度の上限は80℃）。", do: "乾燥機を普通の温度で使えます。" },
    { id: "t1", cat: "tumble", k: "tumble", dots: 1, name: "乾燥機は低温で", mean: "低い温度なら乾燥機が使えます（排気温度の上限は60℃）。", do: "乾燥機は「低温」「おしゃれ着」などの設定で。コインランドリーの乾燥機は熱くなりやすいので避けます。" },
    { id: "t_no", cat: "tumble", k: "tumble", x: true, name: "乾燥機NG", mean: "乾燥機（タンブル乾燥）は使えません。", do: "乾燥機は使わず、干して乾かします。ドラム式洗濯機の乾燥もオフにします。縮みや傷みのもとになります。" },
    // 自然乾燥
    { id: "d_line", cat: "dry", k: "sq", v: 1, name: "つり干し", mean: "つり干しで乾かすのがおすすめです。", do: "脱水してから、ハンガーなどにつるして干します。" },
    { id: "d_line_s", cat: "dry", k: "sq", v: 1, shade: true, name: "日陰でつり干し", mean: "日陰でのつり干しがおすすめです。", do: "脱水してから、日の当たらない場所か部屋の中でつるして干します。色あせを防げます。" },
    { id: "d_drip", cat: "dry", k: "sq", v: 2, name: "ぬれつり干し", mean: "ぬれたまま（絞らずに）つり干しするのがおすすめです。", do: "脱水も手で絞ることもせず、ぬれたままハンガーにつるして干します。しわが付きにくくなります。" },
    { id: "d_drip_s", cat: "dry", k: "sq", v: 2, shade: true, name: "日陰でぬれつり干し", mean: "日陰で、ぬれたまま（絞らずに）つり干しするのがおすすめです。", do: "脱水も絞ることもせず、ぬれたまま日陰か部屋の中でつるして干します。" },
    { id: "d_flat", cat: "dry", k: "sq", h: 1, name: "平干し", mean: "平干しで乾かすのがおすすめです。", do: "脱水してから、平干しネットなどに平らに広げて干します。つるすと重みで伸びる服（ニットなど）に付きます。" },
    { id: "d_flat_s", cat: "dry", k: "sq", h: 1, shade: true, name: "日陰で平干し", mean: "日陰での平干しがおすすめです。", do: "脱水してから、日の当たらない場所で平らに広げて干します。" },
    { id: "d_dripf", cat: "dry", k: "sq", h: 2, name: "ぬれ平干し", mean: "ぬれたまま（絞らずに）平干しするのがおすすめです。", do: "脱水も絞ることもせず、ぬれたまま平らに広げて干します。形を手で整えておくと、きれいに乾きます。" },
    { id: "d_dripf_s", cat: "dry", k: "sq", h: 2, shade: true, name: "日陰でぬれ平干し", mean: "日陰で、ぬれたまま（絞らずに）平干しするのがおすすめです。", do: "脱水も絞ることもせず、ぬれたまま日陰で平らに広げて干します。" },
    // アイロン
    { id: "i3", cat: "iron", k: "iron", dots: 3, name: "アイロン高温", mean: "アイロンの底の温度200℃までで、アイロンがかけられます。", do: "アイロンの「高」でかけられます。綿や麻に多い記号です。" },
    { id: "i2", cat: "iron", k: "iron", dots: 2, name: "アイロン中温", mean: "アイロンの底の温度150℃までで、アイロンがかけられます。", do: "アイロンの「中」でかけます。" },
    { id: "i1", cat: "iron", k: "iron", dots: 1, name: "アイロン低温・スチームなし", mean: "アイロンの底の温度110℃まで、スチームを使わずにアイロンがかけられます。", do: "アイロンの「低」で、スチームは使わずにかけます。当て布をすると安心です。" },
    { id: "i_no", cat: "iron", k: "iron", x: true, name: "アイロンNG", mean: "アイロンはかけられません。", do: "アイロンは使いません。しわは、干すときに手で伸ばしておきます。" },
    // クリーニング（ドライ）
    { id: "p", cat: "pro", k: "circ", t: "P", name: "ドライ（P）", mean: "パークロロエチレンや石油系の溶剤で、ドライクリーニングができます。", do: "クリーニング店でドライクリーニングに出せます。" },
    { id: "pb", cat: "pro", k: "circ", t: "P", bars: 1, name: "ドライ（P）・弱く", mean: "パークロロエチレンや石油系の溶剤で、弱いドライクリーニングができます。", do: "クリーニング店に出すとき、タグを見せて「弱い処理で」と伝えると確実です。" },
    { id: "f", cat: "pro", k: "circ", t: "F", name: "ドライ（F）", mean: "石油系の溶剤で、ドライクリーニングができます。", do: "クリーニング店でドライクリーニングに出せます（石油系の溶剤で）。" },
    { id: "fb", cat: "pro", k: "circ", t: "F", bars: 1, name: "ドライ（F）・弱く", mean: "石油系の溶剤で、弱いドライクリーニングができます。", do: "クリーニング店に出すとき、タグを見せて「弱い処理で」と伝えると確実です。" },
    { id: "pno", cat: "pro", k: "circ", x: true, name: "ドライNG", mean: "ドライクリーニングはできません。", do: "クリーニング店に出すときは、ドライではない方法（ウエットなど）になります。お店に伝えます。" },
    { id: "wcl", cat: "pro", k: "circ", t: "W", name: "ウエット", mean: "ウエットクリーニング（クリーニング店による特別な水洗い）ができます。", do: "クリーニング店で、プロの水洗いに出せます。家で洗えるという意味ではありません。" },
    { id: "wclb", cat: "pro", k: "circ", t: "W", bars: 1, name: "ウエット・弱く", mean: "弱い操作で、ウエットクリーニングができます。", do: "クリーニング店で、弱い操作のウエットクリーニングに出せます。" },
    { id: "wclc", cat: "pro", k: "circ", t: "W", bars: 2, name: "ウエット・とても弱く", mean: "とても弱い操作で、ウエットクリーニングができます。", do: "クリーニング店で、とても弱い操作のウエットクリーニングに出せます。" },
    { id: "wclno", cat: "pro", k: "circ", t: "W", x: true, name: "ウエットNG", mean: "ウエットクリーニングはできません。", do: "クリーニング店でのウエット（水洗い）はできません。" }
  ];

  // 旧表示（JIS L 0217）。絵柄を正確に描ける記号だけ描き、ほかは文字で示す。
  const OLD = [
    { id: "o95", k: "otub", t: ["95"], name: "95℃まで", mean: "液温は95℃を上限に、洗濯ができます。" },
    { id: "o60", k: "otub", t: ["60"], name: "60℃まで", mean: "液温は60℃を上限に、洗濯機で洗えます。" },
    { id: "o40", k: "otub", t: ["40"], name: "40℃まで", mean: "液温は40℃を上限に、洗濯機で洗えます。" },
    { id: "o40w", k: "otub", t: ["弱", "40"], name: "弱 40", mean: "液温は40℃を上限に、洗濯機の弱水流か、弱い手洗いで洗います。" },
    { id: "o30w", k: "otub", t: ["弱", "30"], sub: "中性", name: "弱 30 中性", mean: "液温は30℃を上限に、洗濯機の弱水流か、弱い手洗いで。洗剤は中性洗剤を使います。" },
    { id: "ohand", k: "otub", t: ["手洗イ", "30"], sub: "中性", name: "手洗イ 30 中性", mean: "液温は30℃を上限に、弱い手洗いで。洗濯機は使えません。洗剤は中性洗剤を使います。" },
    { id: "ono", k: "otub", x: true, name: "水洗いできない", mean: "水洗いはできません。" },
    { id: "ocl", k: "flask", name: "エンソサラシ", mean: "塩素系の漂白剤で漂白できます。" },
    { id: "oclno", k: "flask", x: true, name: "エンソサラシにバツ", mean: "塩素系の漂白剤は使えません。" },
    { id: "oih", k: "oiron", t: "高", name: "アイロン 高", mean: "アイロンは210℃まで（180〜210℃）でかけられます。" },
    { id: "oim", k: "oiron", t: "中", name: "アイロン 中", mean: "アイロンは160℃まで（140〜160℃）でかけられます。" },
    { id: "oil", k: "oiron", t: "低", name: "アイロン 低", mean: "アイロンは120℃まで（80〜120℃）でかけられます。" },
    { id: "oiw", k: "oiron", t: "中", wave: true, name: "下に波線", mean: "アイロン記号の下に波線があるときは、当て布をしてかけます。" },
    { id: "oino", k: "oiron", x: true, name: "アイロンにバツ", mean: "アイロンはかけられません。" },
    { id: "odry", k: "word", t: ["ドライ"], name: "ドライ", mean: "ドライクリーニングができます（溶剤はパークロロエチレンか石油系）。" },
    { id: "odryp", k: "word", t: ["ドライ", "セキユ系"], name: "ドライ セキユ系", mean: "石油系の溶剤でのドライクリーニングができます。" },
    { id: "oshibo", k: "word", t: ["ヨワク"], name: "絞り方 ヨワク", mean: "手で絞るなら弱く、脱水するなら短い時間で。" },
    { id: "ohoshi", k: "word", t: ["日陰", "つり干し"], name: "干し方", mean: "シャツの形の記号に「つり干し」「平干し」「日陰」などと書かれ、干し方を示します。" }
  ];

  // ---------- 描画 ----------
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  }
  function txt(g, x, y, s, size, weight) {
    const t = mk("text", { x, y, "text-anchor": "middle", "font-size": size, "font-weight": weight || 700, fill: "currentColor", stroke: "none", "font-family": "Hiragino Sans, Noto Sans JP, Arial, sans-serif" }, g);
    t.textContent = s; return t;
  }
  function bars(g, n, y0) {
    for (let i = 0; i < n; i++) mk("line", { x1: 12, y1: y0 + i * 5.5, x2: 52, y2: y0 + i * 5.5 }, g);
  }
  function cross(g, x1, y1, x2, y2) {
    mk("line", { x1, y1, x2, y2, "stroke-width": 3.4 }, g);
    mk("line", { x1: x2, y1, x2: x1, y2, "stroke-width": 3.4 }, g);
  }
  const TUB = "M6 10 L11.5 47 H52.5 L58 10";
  const WAVE = "M7.2 17 q4.8 -5 9.6 0 t9.6 0 t9.6 0 t9.6 0 t9.6 0";
  const IRON = "M7 46 C8 33 13 25 24 24 H50 L54 46 Z M28 24 C29 17 31 14 36 14 H52 V24";

  function draw(s, size) {
    const svg = mk("svg", { viewBox: "0 0 64 64", width: size || 56, height: size || 56, "aria-hidden": "true", focusable: "false", class: "sym" });
    const g = mk("g", { fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    switch (s.k) {
      case "tub":
        mk("path", { d: TUB }, g); mk("path", { d: WAVE }, g);
        if (s.t) txt(g, 32, 41, s.t, 17);
        if (s.bars) bars(g, s.bars, 53);
        if (s.x) cross(g, 8, 8, 56, 49);
        break;
      case "hand":
        mk("path", { d: TUB }, g); mk("path", { d: WAVE }, g);
        // 上から入れた手（指先を左下に向けた手）
        mk("path", { d: "M55 3 L36 14 C31 17 26 21 23 25 C21 28 24 31 27 29 L35 24 M27 29 C25 32 28 35 31 33 L38 28 M31 33 C30 36 33 38 36 36 L41 32 M36 14 L33 9 C31 6 27 7 28 11 L31 19", "stroke-width": 2.6 }, g);
        break;
      case "tri":
        mk("path", { d: "M32 7 L58 52 H6 Z" }, g);
        if (s.oxy) { mk("line", { x1: 22, y1: 49, x2: 36.5, y2: 23.5 }, g); mk("line", { x1: 31, y1: 49, x2: 42.5, y2: 29 }, g); }
        if (s.x) cross(g, 9, 13, 55, 57);
        break;
      case "tumble":
        mk("rect", { x: 8, y: 8, width: 48, height: 48 }, g);
        mk("circle", { cx: 32, cy: 32, r: 18 }, g);
        if (s.dots === 1) mk("circle", { cx: 32, cy: 32, r: 3.4, fill: "currentColor", stroke: "none" }, g);
        if (s.dots === 2) { mk("circle", { cx: 26, cy: 32, r: 3.4, fill: "currentColor", stroke: "none" }, g); mk("circle", { cx: 38, cy: 32, r: 3.4, fill: "currentColor", stroke: "none" }, g); }
        if (s.x) cross(g, 5, 5, 59, 59);
        break;
      case "sq":
        mk("rect", { x: 8, y: 8, width: 48, height: 48 }, g);
        if (s.v === 1) mk("line", { x1: 32, y1: 14, x2: 32, y2: 50 }, g);
        if (s.v === 2) { mk("line", { x1: 27, y1: 14, x2: 27, y2: 50 }, g); mk("line", { x1: 37, y1: 14, x2: 37, y2: 50 }, g); }
        if (s.h === 1) mk("line", { x1: 15, y1: 32, x2: 49, y2: 32 }, g);
        if (s.h === 2) { mk("line", { x1: 15, y1: 27, x2: 49, y2: 27 }, g); mk("line", { x1: 15, y1: 37, x2: 49, y2: 37 }, g); }
        if (s.shade) mk("line", { x1: 8, y1: 21, x2: 21, y2: 8 }, g);
        break;
      case "iron":
        mk("path", { d: IRON }, g);
        if (s.dots) { const xs = { 1: [31], 2: [26, 36], 3: [22, 31, 40] }[s.dots]; xs.forEach(x => mk("circle", { cx: x, cy: 36, r: 3, fill: "currentColor", stroke: "none" }, g)); }
        if (s.x) cross(g, 8, 10, 56, 56);
        break;
      case "circ":
        mk("circle", { cx: 32, cy: 28, r: 21 }, g);
        if (s.t) txt(g, 32, 37, s.t, 24);
        if (s.bars) bars(g, s.bars, 55);
        if (s.x) cross(g, 12, 8, 52, 48);
        break;
      // 旧表示
      case "otub":
        mk("path", { d: TUB }, g); mk("path", { d: WAVE }, g);
        if (s.t && s.t.length === 1) txt(g, 32, 40, s.t[0], 16);
        if (s.t && s.t.length === 2) { txt(g, 32, 31, s.t[0], s.t[0].length > 1 ? 9 : 11); txt(g, 32, 44, s.t[1], 12); }
        if (s.sub) txt(g, 32, 60, s.sub, 10);
        if (s.x) cross(g, 8, 8, 56, 49);
        break;
      case "flask":
        mk("path", { d: "M25 5 H39 M28 5 V20 L8 57 H56 L36 20 V5" }, g);
        if (!s.x) { txt(g, 32, 43, "エンソ", 8.5); txt(g, 32, 53, "サラシ", 8.5); }
        if (s.x) cross(g, 9, 9, 55, 57);
        break;
      case "oiron":
        mk("path", { d: IRON }, g);
        if (s.t) txt(g, 31, 42, s.t, 15);
        if (s.wave) mk("path", { d: "M8 55 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0" }, g);
        if (s.x) cross(g, 8, 10, 56, 56);
        break;
      case "word": {
        mk("rect", { x: 5, y: 14, width: 54, height: 36, rx: 4, "stroke-dasharray": "4 4", "stroke-width": 2 }, g);
        if (s.t.length === 1) txt(g, 32, 37, s.t[0], s.t[0].length > 3 ? 11 : 13);
        else { txt(g, 32, 30, s.t[0], 11); txt(g, 32, 44, s.t[1], 10); }
        break;
      }
    }
    return svg;
  }

  window.SENTAKU = { CATS, S, OLD, draw };
})();
