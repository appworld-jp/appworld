// 俳句カメラの言葉。すべて人が書いたもので、「[漢字|よみ]」で読みを付けています。
// 音の数は app 側で読みから数え直し、5・7・5に合わないものは使いません。
// 気分の印：night 夜 / dusk 夕焼け / sky 青空 / water 水 / green 緑 / white 白 / red 赤 / quiet 静か / lively にぎやか
// need：この印のある季語のときだけ使う（snow は雪・霜）
// time：day 昼 / morning 朝 / dusk 夕方 / night 夜 / any いつでも
// w（空模様）：clear 晴れ / rain 雨 / haze かすみ / any
window.HAIKU_WORDS = {
  // 季語ごとの使い方。top は上五（5音）、bot は下五（5音）に置く形。
  // k は下五に置くときの性質（どの場所に続けられるか）。
  kigo: {
    "春": {
      "春風": { tags: ["sky", "green", "lively"], time: "day", top: ["[春風|はるかぜ]や"] },
      "桜": { tags: ["white", "red", "lively"], time: "day", k: "plant", top: ["[桜|さくら][咲|さ]く", "[桜|さくら][散|ち]る"], bot: ["[桜|さくら]かな"] },
      "梅": { tags: ["white", "red", "quiet"], time: "day", k: "plant", top: ["[梅|うめ]の[花|はな]", "[梅|うめ][白|しろ]し"], bot: ["[梅|うめ]の[花|はな]"] },
      "菜の花": { tags: ["green", "dusk", "lively"], time: "day", top: ["[菜|な]の[花|はな]や"] },
      "蛙": { tags: ["water", "green", "night", "quiet"], time: "any", top: ["[蛙|かわず][鳴|な]く"] },
      "蝶": { tags: ["green", "lively", "sky"], time: "day", k: "creature", top: ["[蝶|ちょう]ひとつ"], bot: ["[蝶|ちょう]ひとつ"] },
      "霞": { tags: ["white", "quiet", "sky"], time: "day", w: "haze", k: "weather", top: ["[霞|かすみ][立|た]つ"], bot: ["[霞|かすみ]かな"] },
      "朧月": { tags: ["night", "quiet"], time: "night", w: "haze", k: "sky", top: ["[朧月|おぼろづき]"], bot: ["[朧月|おぼろづき]"] },
      "春雨": { tags: ["water", "quiet"], time: "any", w: "rain", top: ["[春雨|はるさめ]や"] },
      "雛祭": { tags: ["red", "lively"], time: "any", in: true, top: ["[雛祭|ひなまつり]"] },
      "燕": { tags: ["sky", "lively"], time: "day", k: "creature", top: ["[燕|つばめ][来|く]る"], bot: ["[燕|つばめ]かな"] },
      "花見": { tags: ["lively", "white", "red"], time: "day", k: "event", top: ["[花見|はなみ][客|きゃく]"], bot: ["[花見|はなみ]かな"] },
      "若草": { tags: ["green", "quiet"], time: "day", top: ["[若草|わかくさ]や"] },
      "長閑": { tags: ["quiet", "sky", "green"], time: "day", top: ["[長閑|のどか]さや"] },
      "雪解": { tags: ["water", "white"], time: "day", top: ["[雪解|ゆきどけ]や"] },
      "鶯": { tags: ["green", "quiet"], time: "day", top: ["[鶯|うぐいす]や"] },
      "蒲公英": { tags: ["green", "lively", "dusk"], time: "day", top: ["[蒲公英|たんぽぽ]や"] },
      "山笑う": { tags: ["green", "sky", "lively"], time: "day", top: ["[山笑|やまわら]う"] }
    },
    "夏": {
      "風鈴": { tags: ["quiet", "sky"], time: "any", top: ["[風鈴|ふうりん]や"] },
      "蛍": { tags: ["night", "water", "green", "quiet"], time: "night", k: "creature", top: ["[蛍|ほたる][飛|と]ぶ"], bot: ["[蛍|ほたる]かな"] },
      "蝉": { tags: ["green", "lively", "sky"], time: "day", k: "creature", top: ["[蝉|せみ]の[声|こえ]"], bot: ["[蝉|せみ]の[声|こえ]"] },
      "夕立": { tags: ["water", "quiet"], time: "day", w: "rain", top: ["[夕立|ゆうだち]や"] },
      "夕焼": { tags: ["dusk", "red"], time: "dusk", top: ["[夕焼|ゆうやけ]や"] },
      "向日葵": { tags: ["lively", "sky", "dusk"], time: "day", top: ["[向日葵|ひまわり]や"] },
      "五月雨": { tags: ["water", "quiet"], time: "any", w: "rain", top: ["[五月雨|さみだれ]や"] },
      "紫陽花": { tags: ["water", "quiet", "green"], time: "day", top: ["[紫陽花|あじさい]や"] },
      "金魚": { tags: ["red", "water"], time: "any", in: true, top: ["[金魚|きんぎょ][鉢|ばち]"] },
      "青葉": { tags: ["green"], time: "day", k: "plant", bot: ["[青葉|あおば]かな"] },
      "夏草": { tags: ["green"], time: "day", top: ["[夏草|なつくさ]や"] },
      "風薫る": { tags: ["green", "sky"], time: "day", top: ["[風|かぜ][薫|かお]る"] },
      "若葉": { tags: ["green", "sky"], time: "day", k: "plant", top: ["[若葉|わかば][風|かぜ]"], bot: ["[若葉|わかば]かな"] },
      "麦茶": { tags: ["quiet"], time: "any", in: true, top: ["[麦茶|むぎちゃ][飲|の]む"] },
      "打水": { tags: ["water", "quiet"], time: "day", top: ["[打水|うちみず]や"] },
      "団扇": { tags: ["white", "quiet"], time: "any", in: true, top: ["[白|しろ][団扇|うちわ]"] },
      "新緑": { tags: ["green", "sky"], time: "day", top: ["[新緑|しんりょく]や"] },
      "冷奴": { tags: ["white", "quiet"], time: "any", in: true, top: ["[冷奴|ひややっこ]"] }
    },
    "秋": {
      "月": { tags: ["night", "quiet"], time: "night", w: "clear", k: "sky", top: ["[月|つき][明|あか]り", "[月|つき][今宵|こよい]"], bot: ["[月|つき]ひとつ"] },
      "名月": { tags: ["night"], time: "night", w: "clear", top: ["[名月|めいげつ]や"] },
      "紅葉": { tags: ["red", "dusk", "lively"], time: "day", k: "plant", top: [{ t: "[夕|ゆう][紅葉|もみじ]", time: "dusk" }], bot: ["[紅葉|もみじ]かな"] },
      "赤蜻蛉": { tags: ["red", "dusk", "sky"], time: "day", k: "creature", top: ["[赤蜻蛉|あかとんぼ]"], bot: ["[赤蜻蛉|あかとんぼ]"] },
      "秋風": { tags: ["quiet", "sky"], time: "any", top: ["[秋風|あきかぜ]や"] },
      "虫の音": { tags: ["night", "quiet"], time: "night", top: ["[虫|むし]の[音|ね]や"] },
      "稲穂": { tags: ["dusk", "green"], time: "day", k: "plant", top: ["[稲穂|いなほ][波|なみ]"], bot: ["[稲穂|いなほ]かな"] },
      "鈴虫": { tags: ["night", "quiet"], time: "night", top: ["[鈴虫|すずむし]や"] },
      "朝顔": { tags: ["water", "quiet", "sky"], time: "morning", top: ["[朝顔|あさがお]や"] },
      "柿": { tags: ["red", "dusk"], time: "day", k: "plant", top: ["[柿|かき]ひとつ"], bot: ["[柿|かき]ひとつ"] },
      "秋刀魚": { tags: ["lively"], time: "any", in: true, top: ["[秋刀魚|さんま][焼|や]く"] },
      "天高し": { tags: ["sky"], time: "day", w: "clear", top: ["[天|てん][高|たか]し"] },
      "露": { tags: ["water", "white", "quiet"], time: "morning", top: ["[露|つゆ]の[玉|たま]"] },
      "菊": { tags: ["white", "quiet", "dusk"], time: "day", k: "plant", top: ["[菊|きく]の[香|か]や"], bot: ["[菊|きく]の[花|はな]"] },
      "芒": { tags: ["white", "dusk", "quiet"], time: "any", k: "plant", top: ["[芒|すすき][原|はら]"], bot: ["[芒|すすき]かな"] },
      "新米": { tags: ["white"], time: "any", in: true, top: ["[新米|しんまい]や"] },
      "夜長": { tags: ["night", "quiet"], time: "night", k: "time", top: ["[夜長|よなが]の[灯|ひ]"], bot: ["[夜長|よなが]かな"] },
      "流れ星": { tags: ["night", "sky"], time: "night", w: "clear", k: "sky", top: ["[流|なが]れ[星|ぼし]"], bot: ["[流|なが]れ[星|ぼし]"] }
    },
    "冬": {
      "雪": { tags: ["white", "quiet", "snow"], time: "any", k: "weather", top: [{ t: "[雪|ゆき]の[朝|あさ]", time: "morning" }, "[雪|ゆき][深|ふか]し", { t: "[雪|ゆき]の[夜|よ]や", time: "night" }], bot: [{ t: "[雪|ゆき]あかり", time: "night" }] },
      "木枯らし": { tags: ["quiet", "dusk", "night"], time: "any", top: ["[木枯|こが]らしや"] },
      "時雨": { tags: ["water", "quiet"], time: "any", w: "rain", k: "weather", top: [{ t: "[夕|ゆう][時雨|しぐれ]", time: "dusk" }], bot: ["[時雨|しぐれ]かな"] },
      "炬燵": { tags: ["quiet", "red"], time: "any", in: true, top: ["[炬燵|こたつ][出|で]て"] },
      "霜": { tags: ["white", "quiet", "snow"], time: "morning", top: ["[霜|しも]の[朝|あさ]", "[霜|しも][白|しろ]し"] },
      "冬木立": { tags: ["quiet", "white", "green"], time: "any", k: "plant", top: ["[冬木立|ふゆこだち]"], bot: ["[冬木立|ふゆこだち]"] },
      "枯野": { tags: ["quiet", "dusk"], time: "day", k: "plant", top: ["[大|おお][枯野|かれの]"], bot: ["[枯野|かれの]かな"] },
      "落葉": { tags: ["dusk", "red", "quiet"], time: "day", k: "plant", top: ["[落葉|おちば][掃|は]く"], bot: ["[落葉|おちば]かな"] },
      "大根": { tags: ["green", "white"], time: "day", top: ["[大根|だいこん]や"] },
      "息白し": { tags: ["white", "quiet"], time: "any", top: ["[息|いき][白|しろ]し"] },
      "寒椿": { tags: ["red"], time: "day", k: "plant", top: ["[寒椿|かんつばき]"], bot: ["[寒椿|かんつばき]"] },
      "冬の月": { tags: ["night", "quiet"], time: "night", w: "clear", k: "sky", top: ["[冬|ふゆ]の[月|つき]"], bot: ["[冬|ふゆ]の[月|つき]"] },
      "小春": { tags: ["sky", "quiet"], time: "day", k: "time", top: ["[小春|こはる][日|び]や"], bot: ["[小春|こはる]かな"] },
      "焚火": { tags: ["red", "dusk"], time: "any", k: "event", bot: ["[焚火|たきび]かな"] },
      "手袋": { tags: ["red", "lively"], time: "any", top: ["[手袋|てぶくろ]や"] },
      "水仙": { tags: ["white", "quiet"], time: "day", top: ["[水仙|すいせん]や"] },
      "年の暮": { tags: ["lively", "night"], time: "any", k: "time", top: ["[年|とし]の[暮|くれ]"], bot: ["[年|とし]の[暮|くれ]"] },
      "冬至": { tags: ["quiet"], time: "any", k: "time", top: ["[冬至|とうじ]の[日|ひ]"], bot: ["[冬至|とうじ]かな"] }
    },
    "新年": {
      "初日": { tags: ["dusk", "red", "sky"], time: "morning", w: "clear", k: "sky", top: ["[初日|はつひ]の[出|で]"], bot: ["[初日|はつひ]かな"] },
      "元日": { tags: ["sky", "quiet"], time: "any", top: ["[元日|がんじつ]や"] },
      "初詣": { tags: ["lively", "red"], time: "day", k: "event", top: ["[初詣|はつもうで]"], bot: ["[初詣|はつもうで]"] },
      "門松": { tags: ["green"], time: "day", top: ["[門松|かどまつ]や"] },
      "雑煮": { tags: ["white"], time: "any", in: true, top: ["[雑煮|ぞうに][食|く]う"] },
      "書初": { tags: ["white", "quiet"], time: "any", in: true, top: ["[書初|かきぞめ]や"] },
      "初夢": { tags: ["night", "quiet"], time: "night", in: true, top: ["[初夢|はつゆめ]や"] },
      "羽子板": { tags: ["red", "lively"], time: "any", in: true, top: ["[羽子板|はごいた]や"] },
      "お年玉": { tags: ["lively"], time: "any", in: true, top: ["お[年玉|としだま]"] }
    }
  },

  // 型A：季語の上五のあとに続ける、中七＋下五の情景。
  // ひとつの組の中では、どの中七とどの下五を合わせても文になるように書いています。
  // place：out 屋外だけ / any 窓からでも
  scenes: [
    // 夜
    { tags: ["night"], time: "night", place: "out", m: ["[遠|とお]くの[町|まち]の", "[駅|えき]のホームの"], e: ["[灯|ひ]のひとつ", "[灯|ひ]のにじむ", "[灯|あか]りかな"] },
    { tags: ["night", "quiet"], time: "night", place: "any", m: ["[眠|ねむ]れぬ[窓|まど]の"], e: ["[灯|ひ]のひとつ", "[灯|あか]りかな"] },
    { tags: ["night", "quiet"], time: "night", place: "out", m: ["[闇|やみ]にしずもる", "[夜|よる]にしずもる"], e: ["[屋根|やね]の[群|む]れ", "[石|いし]の[橋|はし]", "[町|まち]の[音|おと]"] },
    { tags: ["night", "sky"], time: "night", w: "clear", place: "out", m: ["[星|ほし]をかぞえて", "[空|そら]を[見上|みあ]げて"], e: ["[帰|かえ]りけり", "[立|た]ちどまる", "[歩|ある]きだす"] },
    { tags: ["night", "quiet"], time: "night", place: "any", m: ["[灯|あか]りを[消|け]して", "[窓|まど]をひらけば"], e: ["[夜|よる]の[音|おと]", "[闇|やみ]ふかし"] },
    { tags: ["night", "lively", "red"], time: "night", place: "out", m: ["[眠|ねむ]らぬ[町|まち]の", "[夜|よ]ふけの[街|まち]の"], e: ["[灯|ひ]のあふれ", "[人|ひと]の[声|こえ]", "ネオンの[灯|ひ]"] },
    { tags: ["night", "water"], time: "night", place: "out", m: ["[川面|かわも]にゆれる", "[水|みず]にうつれる"], e: ["[街|まち]あかり", "[窓|まど]あかり"] },
    { tags: ["night", "quiet"], time: "night", place: "any", m: ["[遠|とお]くを[走|はし]る"], e: ["[夜汽車|よぎしゃ]かな", "[車|くるま]の[灯|ひ]"] },
    // 夕焼け
    { tags: ["dusk", "sky"], time: "dusk", place: "any", m: ["[茜|あかね]の[空|そら]を", "[暮|く]れゆく[空|そら]を"], e: ["[帰|かえ]る[鳥|とり]", "[鳥|とり]がゆく"] },
    { tags: ["dusk"], time: "dusk", place: "out", m: ["[夕日|ゆうひ]のなかを", "[夕日|ゆうひ]の[町|まち]を"], e: ["[帰|かえ]る[人|ひと]", "ゆく[電車|でんしゃ]"] },
    { tags: ["dusk", "red"], time: "dusk", place: "any", m: ["[窓|まど]いっぱいの", "[山|やま]の[端|は]そめる"], e: ["[夕日|ゆうひ]かな", "[茜|あかね][色|いろ]"] },
    { tags: ["dusk", "quiet"], time: "dusk", place: "out", m: ["[長|なが]き[影|かげ]ひく", "[影|かげ]ふたつ[行|ゆ]く"], e: ["[帰|かえ]り[道|みち]", "[坂|さか]の[道|みち]"] },
    { tags: ["dusk", "lively"], time: "dusk", place: "out", m: ["[夕餉|ゆうげ]の[匂|にお]う"], e: ["[路地|ろじ]の[奥|おく]", "[家|いえ]の[前|まえ]"] },
    { tags: ["dusk", "quiet"], time: "dusk", place: "any", m: ["[一日|ひとひ]の[果|は]ての"], e: ["[空|そら]の[色|いろ]", "[茜|あかね][色|いろ]"] },
    // 青空
    { tags: ["sky"], time: "day", w: "clear", place: "any", m: ["[雲|くも]ひとつなき", "[果|は]てなく[青|あお]き"], e: ["[空|そら]の[色|いろ]", "[空|そら]の[下|した]"] },
    { tags: ["sky", "quiet"], time: "day", w: "clear", place: "out", m: ["[空|そら]の[青|あお]さを"], e: ["[胸|むね]に[吸|す]う", "[仰|あお]ぎけり"] },
    { tags: ["sky", "green"], time: "day", place: "out", m: ["[遠|とお]くの[山|やま]を"], e: ["[仰|あお]ぎけり", "[見|み]て[歩|ある]く"] },
    { tags: ["sky", "lively", "white"], time: "day", place: "any", m: ["[白|しろ]い[雲|くも]ゆく", "[雲|くも]の[流|なが]れる"], e: ["[空|そら]の[青|あお]", "[屋根|やね]の[上|うえ]", "[丘|おか]の[上|うえ]"] },
    { tags: ["sky", "white"], time: "day", w: "clear", place: "any", m: ["[飛行機雲|ひこうきぐも]の"], e: ["[白|しろ]き[線|せん]", "ほどけゆく", "[消|き]えにけり"] },
    { tags: ["sky", "lively"], time: "day", w: "clear", place: "out", m: ["[洗濯物|せんたくもの]の"], e: ["はためけり", "ゆれる[庭|にわ]"] },
    // 緑
    { tags: ["green"], time: "day", place: "out", m: ["[木|こ]もれ[日|び]ゆれる", "[光|ひかり]こぼれる"], e: ["[森|もり]の[道|みち]", "[石|いし]だたみ", "[木|き]のベンチ"] },
    { tags: ["green", "quiet"], time: "day", place: "out", m: ["[木々|きぎ]のあいだを", "[森|もり]の[小道|こみち]を"], e: ["[歩|ある]きけり", "ぬけてゆく", "[風|かぜ]が[行|ゆ]く"] },
    { tags: ["green", "quiet"], time: "day", place: "out", m: ["[苔|こけ]むす[石|いし]に"], e: ["[日|ひ]のひかり", "[影|かげ]うごく"] },
    { tags: ["green", "quiet"], time: "any", place: "any", m: ["[木々|きぎ]の[葉|は]ずれの"], e: ["[音|おと]ばかり", "[音|おと]やさし"] },
    { tags: ["green", "lively"], time: "day", place: "out", m: ["[草|くさ]の[匂|にお]いの"], e: ["[風|かぜ]が[吹|ふ]く", "[道|みち]をゆく", "[野|の]の[小道|こみち]"] },
    { tags: ["green", "sky"], time: "day", place: "out", m: ["[丘|おか]をのぼれば"], e: ["[町|まち]が[見|み]ゆ", "[風|かぜ]ひとつ"] },
    // 水
    { tags: ["water", "sky"], time: "day", place: "out", m: ["[水面|みなも]にうつる", "[川|かわ]にうつれる"], e: ["[空|そら]の[色|いろ]", "[雲|くも]の[影|かげ]", "[橋|はし]の[影|かげ]"] },
    { tags: ["water", "lively"], time: "any", place: "out", m: ["[寄|よ]せては[返|かえ]す"], e: ["[波|なみ]の[音|おと]", "[波|なみ]がしら"] },
    { tags: ["water", "quiet"], time: "any", place: "out", m: ["[波|なみ]の[音|おと]だけ"], e: ["[聞|き]こえけり", "[残|のこ]りけり"] },
    { tags: ["water", "sky"], time: "day", place: "any", m: ["[遠|とお]くの[海|うみ]の"], e: ["[青|あお]さかな", "ひかりかな", "[光|ひか]る[波|なみ]"] },
    { tags: ["water", "quiet"], time: "any", w: "rain", place: "any", m: ["[雨|あめ]のしずくの", "[軒|のき]の[雫|しずく]の"], e: ["ひとつずつ", "[音|おと]ばかり"] },
    { tags: ["water", "quiet"], time: "any", place: "out", m: ["[川|かわ]の[流|なが]れの"], e: ["[音|おと]ばかり", "[速|はや]さかな"] },
    { tags: ["water", "quiet"], time: "any", w: "rain", place: "any", m: ["[傘|かさ]をたたいて"], e: ["[雨|あめ]の[音|おと]", "[雨|あめ]が[降|ふ]る"] },
    // 白
    { tags: ["white"], time: "day", place: "any", m: ["[白|しろ]き[光|ひかり]の"], e: ["[満|み]ちにけり", "まぶしさよ"] },
    { tags: ["white", "quiet"], time: "any", place: "any", m: ["[音|おと]のひとつも"], e: ["なかりけり", "なき[世界|せかい]"] },
    { tags: ["white", "quiet"], time: "any", place: "out", need: ["snow"], m: ["[白|しろ][一色|いっしょく]の"], e: ["[町|まち]となる", "[道|みち]となる", "[野|の]となりぬ"] },
    { tags: ["white", "quiet"], time: "any", place: "out", m: ["[足跡|あしあと]ひとつ"], e: ["[続|つづ]きけり", "[白|しろ]き[道|みち]"] },
    { tags: ["white", "quiet"], time: "any", place: "any", m: ["[息|いき]をひそめて"], e: ["[眠|ねむ]る[町|まち]", "[待|ま]つ[夜明|よあ]け"] },
    { tags: ["white", "sky"], time: "day", place: "any", m: ["[真白|ましろ]き[雲|くも]の"], e: ["ふくらめり", "[大|おお]きさよ"] },
    // 赤
    { tags: ["red", "quiet"], time: "day", place: "out", m: ["[赤|あか]き[鳥居|とりい]の", "[赤|あか]いポストの"], e: ["[影|かげ]ひとつ", "あざやかさ"] },
    { tags: ["red", "lively"], time: "day", place: "out", m: ["[赤|あか]い[傘|かさ]さす"], e: ["[子|こ]の[背中|せなか]", "[少女|しょうじょ]かな"] },
    { tags: ["red", "dusk"], time: "day", place: "any", need: ["red"], m: ["[燃|も]えるがごとき"], e: ["[色|いろ]の[中|なか]", "[赤|あか]さかな"] },
    { tags: ["red", "night", "lively"], time: "night", place: "out", m: ["[赤|あか]い[灯|ひ]ともる"], e: ["[路地|ろじ]の[奥|おく]", "[店|みせ]の[前|まえ]"] },
    { tags: ["red", "quiet"], time: "day", place: "any", m: ["[頬|ほお]を[赤|あか]らめ"], e: ["[子|こ]が[笑|わら]う", "[子|こ]が[走|はし]る"] },
    // 静か
    { tags: ["quiet"], time: "any", place: "out", m: ["[人影|ひとかげ]のない"], e: ["[田舎|いなか][駅|えき]", "[浜|はま]の[道|みち]", "[石|いし]だたみ"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["しずかに[時|とき]の"], e: ["[過|す]ぎにけり", "[流|なが]れけり"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["ひとりで[座|すわ]る", "だまって[座|すわ]る"], e: ["[石|いし]の[上|うえ]", "[窓|まど]のそば", "[川|かわ]のそば"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["[遠|とお]くで[犬|いぬ]の"], e: ["[鳴|な]く[声|こえ]す", "[声|こえ]がする"] },
    { tags: ["quiet", "white"], time: "any", place: "in", m: ["[湯気|ゆげ]たちのぼる"], e: ["[茶碗|ちゃわん]かな", "[白|しろ]き[椀|わん]"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["[窓|まど]の[向|む]こうの"], e: ["[空|そら]の[色|いろ]", "[町|まち]しずか"] },
    { tags: ["quiet"], time: "any", place: "in", m: ["[本|ほん]を[閉|と]じれば", "[手紙|てがみ]を[書|か]けば"], e: ["[風|かぜ]の[音|おと]", "[時計|とけい][鳴|な]る"] },
    // にぎやか
    { tags: ["lively"], time: "day", place: "out", m: ["[子|こ]どもの[声|こえ]の"], e: ["[弾|はず]む[道|みち]", "ひびく[町|まち]"] },
    { tags: ["lively"], time: "any", place: "out", m: ["[人|ひと]の[行|ゆ]き[交|か]う"], e: ["[橋|はし]の[上|うえ]", "[駅|えき]の[前|まえ]", "[町|まち]の[角|かど]"] },
    { tags: ["lively", "red"], time: "day", place: "out", m: ["[色|いろ]とりどりの"], e: ["[屋根|やね]の[町|まち]", "[旗|はた]ゆれる", "[店|みせ]ならぶ"] },
    { tags: ["lively"], time: "any", place: "any", m: ["[笑|わら]いさざめく"], e: ["[人|ひと]の[群|む]れ", "[声|こえ]の[中|なか]"] },
    { tags: ["lively", "green"], time: "day", place: "out", m: ["[自転車|じてんしゃ]こいで"], e: ["[坂|さか]くだる", "[風|かぜ]になる"] },
    // どの写真にも
    { tags: [], time: "any", place: "any", m: ["[風|かぜ]のゆくえを"], e: ["[見|み]ていたり", "[追|お]いかける"] },
    { tags: ["white", "sky"], time: "day", place: "any", m: ["[光|ひかり]の[粒|つぶ]の"], e: ["こぼれけり", "まぶしさよ"] },
    { tags: ["sky"], time: "any", place: "any", m: ["[遠|とお]くの[空|そら]に"], e: ["[目|め]をやりぬ", "[鳥|とり]ひとつ"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["[忘|わす]れたころに"], e: ["[鐘|かね]が[鳴|な]る", "[便|たよ]り[来|く]る"] },
    { tags: ["quiet"], time: "any", place: "any", m: ["[母|はは]の[背中|せなか]の"], e: ["[小|ちい]ささよ", "やさしさよ"] }
  ],

  // 型B：上五（ここから始める言葉）＋中七（場所＋の）＋季語の下五。
  // out：外にいるときの言葉（窓の内からの場所には続けない）／in：家の中の言葉（遠くを眺める場所にだけ続ける）
  openers: [
    "ふりむけば", "[窓|まど]あけて", { t: "[立|た]ちどまる", out: true }, "[目|め]をあげて", { t: "ひとり[来|き]て", out: true }, "[気|き]がつけば",
    { t: "[旅|たび]に[出|で]て", out: true }, { t: "[坂|さか]のぼる", out: true }, { t: "[夢|ゆめ]さめて", in: true }, { t: "[会|あ]いにゆく", out: true },
    { t: "[帰|かえ]り[道|みち]", out: true }, "[母|はは]と[見|み]る", "しずかなり"
  ],
  // acc：続けられる季語の性質／view：遠くを眺める場所／room：窓の内から見る場所
  places: [
    { t: "[遠|とお]くの[町|まち]の", view: true, tags: [], time: "any", acc: ["sky", "weather", "time", "creature", "plant", "event"] },
    { t: "[駅|えき]のホームの", tags: ["quiet"], time: "any", acc: ["sky", "weather", "time", "creature", "plant"] },
    { t: "[川|かわ]のほとりの", tags: ["water", "green"], time: "any", acc: ["sky", "weather", "time", "creature", "plant", "event"] },
    { t: "[山|やま]のむこうの", view: true, tags: ["sky", "green"], time: "any", acc: ["sky", "weather"] },
    { t: "[海|うみ]のむこうの", view: true, tags: ["water", "sky"], time: "any", acc: ["sky", "weather"] },
    { t: "[坂|さか]の[途中|とちゅう]の", tags: ["quiet"], time: "any", acc: ["plant", "creature", "weather"] },
    { t: "[古|ふる]き[社|やしろ]の", tags: ["red", "green", "quiet"], time: "any", acc: ["sky", "plant", "creature", "weather", "event"] },
    { t: "[森|もり]の[小道|こみち]の", tags: ["green", "quiet"], time: "any", acc: ["plant", "creature", "weather"] },
    { t: "[窓|まど]の[向|む]こうの", view: true, room: true, tags: ["quiet"], time: "any", acc: ["sky", "weather", "plant", "creature"] },
    { t: "[橋|はし]のたもとの", tags: ["water"], time: "any", acc: ["plant", "creature", "weather", "event"] },
    { t: "[白|しろ]き[家並|やなみ]の", tags: ["white"], time: "any", acc: ["sky", "weather", "time"] },
    { t: "[暮|く]れゆく[町|まち]の", tags: ["dusk"], time: "dusk", acc: ["sky", "weather"] },
    { t: "[灯|ひ]ともる[町|まち]の", tags: ["night", "dusk", "lively"], time: "night", acc: ["sky", "weather", "time"] },
    { t: "[眠|ねむ]れる[町|まち]の", tags: ["night", "quiet"], time: "night", acc: ["sky", "weather", "time"] },
    { t: "にぎわう[町|まち]の", tags: ["lively", "red"], time: "any", acc: ["sky", "time", "event"] },
    { t: "[雲|くも]なき[空|そら]の", view: true, tags: ["sky"], time: "any", w: "clear", acc: ["sky", "time"] },
    { t: "[田|た]んぼの[道|みち]の", tags: ["green"], time: "any", acc: ["plant", "creature", "weather"] }
  ]
};
