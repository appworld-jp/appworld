// 英語ひとこと日記のテーマ。{id, ja, q: 英語の問い, qja: 日本語訳, p: [[英語のフレーズ, 日本語の意味], ...]}
// 「〜」は自分の言葉を入れる場所です。
window.THEMES = [
  { id: "breakfast", ja: "朝ごはん", q: "What did you have for breakfast today?", qja: "今朝は何を食べましたか？", p: [
    ["I had ~ for breakfast.", "朝ごはんに〜を食べた。"],
    ["I skipped breakfast today.", "今日は朝ごはんを抜いた。"],
    ["I grabbed something at a convenience store.", "コンビニでさっと買って済ませた。"],
    ["I didn't have time to eat.", "食べる時間がなかった。"],
    ["It really hit the spot.", "まさに食べたかった味だった。"]
  ]},
  { id: "weather", ja: "天気", q: "What was the weather like today?", qja: "今日はどんな天気でしたか？", p: [
    ["It was sunny and warm.", "晴れて暖かかった。"],
    ["It rained on and off all day.", "一日中、降ったりやんだりだった。"],
    ["It's getting chilly in the mornings.", "朝が肌寒くなってきた。"],
    ["It was so humid that ~.", "とても蒸し暑くて〜。"],
    ["I got caught in the rain.", "雨に降られた。"]
  ]},
  { id: "commute", ja: "通勤・通学", q: "How was your commute today?", qja: "今日の通勤・通学はどうでしたか？", p: [
    ["The train was packed.", "電車が満員だった。"],
    ["The train was delayed because of ~.", "〜のせいで電車が遅れた。"],
    ["I managed to get a seat.", "なんとか座れた。"],
    ["I listened to a podcast on the way.", "移動中にポッドキャストを聞いた。"],
    ["I almost missed my train.", "電車に乗り遅れそうになった。"]
  ]},
  { id: "work", ja: "仕事", q: "What did you work on today?", qja: "今日はどんな仕事をしましたか？", p: [
    ["I spent most of the day on ~.", "一日の大半を〜に費やした。"],
    ["I had back-to-back meetings.", "会議が立て続けにあった。"],
    ["I finally finished ~.", "ようやく〜を終えた。"],
    ["Things didn't go as planned.", "予定どおりにいかなかった。"],
    ["I'm behind on ~.", "〜が遅れている。"],
    ["I left work early today.", "今日は早めに退社した。"]
  ]},
  { id: "weekend", ja: "週末の予定", q: "What are you going to do this weekend?", qja: "今週末は何をする予定ですか？", p: [
    ["I'm planning to ~.", "〜するつもりだ。"],
    ["I'm going to take it easy.", "のんびり過ごすつもりだ。"],
    ["I don't have any plans yet.", "まだ予定はない。"],
    ["I'm looking forward to ~.", "〜を楽しみにしている。"],
    ["If the weather is nice, I'll ~.", "天気がよければ〜するつもりだ。"]
  ]},
  { id: "food", ja: "好きな食べ物", q: "What food could you eat every day?", qja: "毎日でも食べられるものは何ですか？", p: [
    ["I could eat ~ every day.", "〜なら毎日でも食べられる。"],
    ["I have a sweet tooth.", "甘いものに目がない。"],
    ["I'm not a big fan of ~.", "〜はあまり好きではない。"],
    ["It reminds me of ~.", "それを食べると〜を思い出す。"],
    ["My go-to dish is ~.", "定番の料理は〜だ。"]
  ]},
  { id: "movie", ja: "最近見た作品", q: "What movie or show have you watched recently?", qja: "最近見た映画やドラマは何ですか？", p: [
    ["I've been watching ~ lately.", "最近〜を見ている。"],
    ["I binge-watched ~.", "〜を一気見した。"],
    ["It was better than I expected.", "思っていたよりよかった。"],
    ["The ending was a bit disappointing.", "結末が少し残念だった。"],
    ["I'd recommend it to anyone who likes ~.", "〜が好きな人にはおすすめだ。"]
  ]},
  { id: "shopping", ja: "買い物", q: "What did you buy recently?", qja: "最近何を買いましたか？", p: [
    ["I bought ~ on sale.", "〜をセールで買った。"],
    ["It was a bit pricey, but worth it.", "少し高かったけれど、買ってよかった。"],
    ["I've been wanting one for a while.", "しばらく前から欲しかった。"],
    ["I ended up buying ~.", "結局〜を買ってしまった。"],
    ["I'm trying not to spend too much.", "使いすぎないようにしている。"]
  ]},
  { id: "hobby", ja: "趣味", q: "What do you like to do in your free time?", qja: "自由な時間には何をするのが好きですか？", p: [
    ["In my free time, I like to ~.", "時間があるときは〜するのが好きだ。"],
    ["I got into ~ last year.", "去年〜にはまった。"],
    ["It helps me relax.", "それをするとリラックスできる。"],
    ["I'm not very good at it, but I enjoy it.", "上手ではないけれど、楽しんでいる。"],
    ["I've been doing it for ~ years.", "〜年続けている。"]
  ]},
  { id: "friends", ja: "友だち", q: "Tell me about a friend you talked to recently.", qja: "最近話した友だちのことを教えてください。", p: [
    ["I caught up with ~.", "〜と近況を話した。"],
    ["We hadn't seen each other in ages.", "ずいぶん久しぶりに会った。"],
    ["We've known each other since ~.", "〜のころからの付き合いだ。"],
    ["We talked for hours.", "何時間も話した。"],
    ["It was good to see her again.", "また会えてうれしかった。"]
  ]},
  { id: "family", ja: "家族", q: "What did you do with your family recently?", qja: "最近家族と何をしましたか？", p: [
    ["I called my parents.", "両親に電話した。"],
    ["We had dinner together.", "一緒に夕食を食べた。"],
    ["My ~ is always there for me.", "〜はいつも私を支えてくれる。"],
    ["We don't see each other very often.", "あまり会う機会がない。"],
    ["I should visit them more often.", "もっと会いに行くべきだ。"]
  ]},
  { id: "tired", ja: "疲れた日", q: "Was today a tiring day?", qja: "今日は疲れる一日でしたか？", p: [
    ["I'm exhausted.", "くたくただ。"],
    ["It's been a long day.", "長い一日だった。"],
    ["I didn't get much done today.", "今日はあまりはかどらなかった。"],
    ["I need a break.", "ひと休みが必要だ。"],
    ["I'm going to bed early tonight.", "今夜は早く寝るつもりだ。"]
  ]},
  { id: "happy", ja: "うれしかったこと", q: "What made you happy today?", qja: "今日うれしかったことは何ですか？", p: [
    ["It made my day.", "おかげで最高の一日になった。"],
    ["I was happy to hear that ~.", "〜と聞いてうれしかった。"],
    ["Something nice happened today.", "今日はいいことがあった。"],
    ["I couldn't stop smiling.", "にやにやが止まらなかった。"],
    ["It's the little things.", "こういう小さなことが大事だ。"]
  ]},
  { id: "mistake", ja: "失敗したこと", q: "Did anything go wrong today?", qja: "今日うまくいかなかったことはありますか？", p: [
    ["I made a silly mistake.", "うっかりミスをした。"],
    ["I forgot to ~.", "〜するのを忘れた。"],
    ["I should have ~.", "〜すればよかった。"],
    ["It wasn't a big deal.", "たいしたことではなかった。"],
    ["Lesson learned.", "いい勉強になった。"]
  ]},
  { id: "season", ja: "季節", q: "What do you like about this season?", qja: "今の季節の好きなところは何ですか？", p: [
    ["~ is my favorite season.", "〜がいちばん好きな季節だ。"],
    ["The leaves are starting to change color.", "葉が色づき始めている。"],
    ["I can't stand the heat.", "暑さには耐えられない。"],
    ["It's the perfect weather for ~.", "〜にぴったりの天気だ。"],
    ["Time flies. It's already ~.", "時がたつのは早い。もう〜だ。"]
  ]},
  { id: "trip", ja: "旅の思い出", q: "What's a trip you remember well?", qja: "よく覚えている旅行はどれですか？", p: [
    ["I went to ~ a few years ago.", "数年前に〜へ行った。"],
    ["It was my first time ~.", "〜するのは初めてだった。"],
    ["The view was breathtaking.", "息をのむほどの景色だった。"],
    ["I'd love to go back someday.", "いつかまた行きたい。"],
    ["We got lost, but it was fun.", "道に迷ったけれど、楽しかった。"]
  ]},
  { id: "dream-place", ja: "行ってみたい場所", q: "Where would you like to go someday?", qja: "いつか行ってみたい場所はどこですか？", p: [
    ["I've always wanted to visit ~.", "ずっと〜を訪れてみたかった。"],
    ["It's on my bucket list.", "死ぬまでにやりたいことのひとつだ。"],
    ["I'd like to see ~ with my own eyes.", "〜を自分の目で見てみたい。"],
    ["I've heard it's ~.", "〜だと聞いている。"],
    ["Maybe next year.", "来年こそは。"]
  ]},
  { id: "exercise", ja: "運動", q: "Did you move your body today?", qja: "今日は体を動かしましたか？", p: [
    ["I went for a walk.", "散歩に出かけた。"],
    ["I walked about ~ steps today.", "今日は〜歩くらい歩いた。"],
    ["I've been trying to exercise more.", "もっと運動するようにしている。"],
    ["My legs are sore.", "足が筋肉痛だ。"],
    ["I took the stairs instead of the elevator.", "エレベーターではなく階段を使った。"]
  ]},
  { id: "cooking", ja: "料理", q: "Did you cook anything today?", qja: "今日は何か料理をしましたか？", p: [
    ["I made ~ for dinner.", "夕食に〜を作った。"],
    ["I tried a new recipe.", "新しいレシピに挑戦した。"],
    ["It turned out pretty well.", "なかなかうまくできた。"],
    ["I burned it a little.", "少し焦がしてしまった。"],
    ["I used up the leftovers.", "残り物を使い切った。"]
  ]},
  { id: "sleep", ja: "睡眠", q: "How did you sleep last night?", qja: "昨夜はよく眠れましたか？", p: [
    ["I slept like a log.", "ぐっすり眠った。"],
    ["I couldn't fall asleep.", "なかなか寝つけなかった。"],
    ["I stayed up too late.", "夜ふかししすぎた。"],
    ["I overslept this morning.", "今朝は寝坊した。"],
    ["I took a short nap.", "少し昼寝をした。"]
  ]},
  { id: "music", ja: "音楽", q: "What have you been listening to lately?", qja: "最近どんな音楽を聞いていますか？", p: [
    ["I've had ~ on repeat.", "〜をずっとくり返し聞いている。"],
    ["This song always cheers me up.", "この曲を聞くといつも元気が出る。"],
    ["I listen to music while I ~.", "〜しながら音楽を聞く。"],
    ["I can't get this song out of my head.", "この曲が頭から離れない。"],
    ["I went to a concert last week.", "先週、コンサートに行った。"]
  ]},
  { id: "reading", ja: "読書", q: "What are you reading now?", qja: "今どんな本を読んでいますか？", p: [
    ["I'm in the middle of ~.", "今〜を読んでいる途中だ。"],
    ["I couldn't put it down.", "読み始めたら止まらなかった。"],
    ["It's a bit hard to get into.", "少し入り込みにくい。"],
    ["I read a few pages before bed.", "寝る前に数ページ読んだ。"],
    ["It made me think about ~.", "〜について考えさせられた。"]
  ]},
  { id: "study", ja: "勉強", q: "What did you learn today?", qja: "今日は何を学びましたか？", p: [
    ["I learned that ~.", "〜ということを知った。"],
    ["I studied English for ~ minutes.", "英語を〜分勉強した。"],
    ["I'm trying to memorize ~.", "〜を覚えようとしている。"],
    ["It finally clicked.", "ようやくわかった。"],
    ["I'm still not sure about ~.", "〜はまだよくわからない。"]
  ]},
  { id: "phone", ja: "スマホ", q: "How much time did you spend on your phone today?", qja: "今日はスマホをどのくらい使いましたか？", p: [
    ["I spent too much time on my phone.", "スマホを使いすぎた。"],
    ["I kept checking my messages.", "何度もメッセージを確認してしまった。"],
    ["I found a useful app for ~.", "〜に便利なアプリを見つけた。"],
    ["My battery died.", "電池が切れた。"],
    ["I'm trying to cut down on screen time.", "画面を見る時間を減らそうとしている。"]
  ]},
  { id: "money", ja: "お金", q: "Did you spend or save money today?", qja: "今日はお金を使いましたか、それとも節約しましたか？", p: [
    ["I'm saving up for ~.", "〜のためにお金を貯めている。"],
    ["I treated myself to ~.", "自分へのご褒美に〜を買った。"],
    ["It was a good deal.", "お買い得だった。"],
    ["I brought my own lunch to save money.", "節約のためにお弁当を持っていった。"],
    ["Prices keep going up.", "物価が上がり続けている。"]
  ]},
  { id: "goal", ja: "小さな目標", q: "What is one small goal for this week?", qja: "今週の小さな目標は何ですか？", p: [
    ["This week, I want to ~.", "今週は〜したい。"],
    ["I'm going to try to ~ every day.", "毎日〜するようにしてみる。"],
    ["I'll start with ~.", "まずは〜から始める。"],
    ["Wish me luck.", "うまくいくといいな。"],
    ["I'll let you know how it goes.", "どうなったか、また報告する。"]
  ]},
  { id: "thanks", ja: "感謝", q: "Who or what are you grateful for today?", qja: "今日は誰に、何に感謝していますか？", p: [
    ["I'm grateful for ~.", "〜に感謝している。"],
    ["~ helped me out a lot.", "〜がとても助けてくれた。"],
    ["I couldn't have done it without ~.", "〜がいなければできなかった。"],
    ["I really appreciate it.", "本当にありがたい。"],
    ["I want to thank ~ for ~.", "〜に、〜のお礼を言いたい。"]
  ]},
  { id: "childhood", ja: "子どものころ", q: "What did you love as a child?", qja: "子どものころ、何が好きでしたか？", p: [
    ["When I was a kid, I used to ~.", "子どものころは、よく〜していた。"],
    ["I was really into ~.", "〜に夢中だった。"],
    ["I was a shy kid.", "人見知りの子どもだった。"],
    ["I still remember ~.", "今でも〜を覚えている。"],
    ["It brings back memories.", "懐かしい思い出がよみがえる。"]
  ]},
  { id: "animals", ja: "動物", q: "Do you have a favorite animal?", qja: "好きな動物はいますか？", p: [
    ["I'm more of a dog person.", "どちらかというと犬派だ。"],
    ["I've always wanted to have a ~.", "ずっと〜を飼ってみたかった。"],
    ["My cat sleeps all day.", "うちの猫は一日中寝ている。"],
    ["I saw a ~ on my way home.", "帰り道で〜を見かけた。"],
    ["It's so cute I can't stand it.", "かわいすぎてたまらない。"]
  ]},
  { id: "tomorrow", ja: "明日のこと", q: "What's on your schedule for tomorrow?", qja: "明日はどんな予定がありますか？", p: [
    ["I have a busy day tomorrow.", "明日は忙しい。"],
    ["I have to get up early.", "早起きしなければならない。"],
    ["I'm meeting ~ for lunch.", "昼に〜と会う。"],
    ["I'm a little nervous about ~.", "〜のことで少し緊張している。"],
    ["Tomorrow is another day.", "明日は明日の風が吹く。"]
  ]},
  { id: "rainy", ja: "雨の日", q: "What do you like to do on rainy days?", qja: "雨の日は何をするのが好きですか？", p: [
    ["I like staying in on rainy days.", "雨の日は家にこもるのが好きだ。"],
    ["I forgot my umbrella.", "傘を忘れた。"],
    ["I got soaked.", "びしょぬれになった。"],
    ["The rain finally stopped.", "ようやく雨がやんだ。"],
    ["It's a good day to ~.", "〜するのにちょうどいい日だ。"]
  ]},
  { id: "cafe", ja: "カフェ", q: "Do you have a favorite café?", qja: "お気に入りのカフェはありますか？", p: [
    ["There's a cozy café near ~.", "〜の近くに居心地のいいカフェがある。"],
    ["I usually order ~.", "いつも〜を頼む。"],
    ["I can focus better at a café.", "カフェのほうが集中できる。"],
    ["It's a great place to unwind.", "ほっとひと息つくのにいい場所だ。"],
    ["I'm a regular there.", "そこの常連だ。"]
  ]},
  { id: "health", ja: "体調", q: "How are you feeling today?", qja: "今日の体調はどうですか？", p: [
    ["I'm feeling great today.", "今日は調子がいい。"],
    ["I think I'm coming down with a cold.", "風邪をひきかけている気がする。"],
    ["I have a slight headache.", "少し頭が痛い。"],
    ["I'm feeling a lot better.", "だいぶよくなった。"],
    ["I need to take better care of myself.", "もっと体を大事にしないといけない。"]
  ]},
  { id: "news", ja: "気になったこと", q: "What caught your attention today?", qja: "今日気になったことは何ですか？", p: [
    ["I came across an article about ~.", "〜についての記事をたまたま見つけた。"],
    ["I was surprised to learn that ~.", "〜と知って驚いた。"],
    ["I'm curious about ~.", "〜に興味がある。"],
    ["It got me thinking.", "考えさせられた。"],
    ["I want to look into it more.", "もっと調べてみたい。"]
  ]}
];
