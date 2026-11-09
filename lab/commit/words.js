// コミット短歌 — hand-written phrases. "[漢字|よみ]" marks a reading; plain text is already kana.
// Every phrase's length (in mora) is computed from the reading at runtime, never trusted from here.
window.TANKA_WORDS = {
  // category detection: conventional-commit prefix first, then keywords
  kinds: [
    ["security", /security|vuln|cve-|xss|csrf|脆弱性|セキュリティ/i, "セキュリティ"],
    ["revert", /^revert\b|\brevert|差し戻|取り消/i, "取り消し"],
    ["merge", /^merge\b|\bmerge\b|マージ/i, "マージ"],
    ["release", /^release\b|\brelease\b|\bbump\b|\bv\d+\.\d+|リリース/i, "リリース"],
    ["deps", /\bdeps?\b|dependenc|upgrade|renovate|dependabot|依存/i, "依存の更新"],
    ["test", /^test|\btests?\b|\bspec\b|テスト/i, "テスト"],
    ["docs", /^docs?\b|\bdocs?\b|readme|documentation|ドキュメント|説明書/i, "ドキュメント"],
    ["perf", /^perf|\bperf\b|speed ?up|faster|optimi[sz]|高速|速く|軽く/i, "高速化"],
    ["style", /^style|\bformat|\blint|prettier|typo|whitespace|誤字|整形|インデント/i, "見た目の整理"],
    ["refactor", /^refactor|refactor|clean ?up|rename|整理|リファクタ/i, "リファクタリング"],
    ["remove", /^(remove|delete|drop)\b|\b(remove|delete|drop)\b|削除|消す|消した/i, "削除"],
    ["ci", /^ci\b|\bci\b|workflow|github actions|pipeline|deploy|デプロイ/i, "CI・デプロイ"],
    ["wip", /\bwip\b|作業中|途中/i, "作業中"],
    ["fix", /^fix|\bfix(e[sd])?\b|\bbug\b|hotfix|修正|直し|直す|不具合|バグ/i, "修正"],
    ["feat", /^feat|\badd(s|ed)?\b|\bnew\b|implement|support|追加|新規|実装|対応/i, "機能追加"]
  ],
  prefix: { fix: "fix", hotfix: "fix", bugfix: "fix", feat: "feat", feature: "feat", refactor: "refactor", docs: "docs", doc: "docs", test: "test", tests: "test", perf: "perf", style: "style", chore: "misc", build: "ci", ci: "ci", revert: "revert", release: "release", deps: "deps", security: "security", wip: "wip" },

  // keyword → noun (display | reading)
  nouns: [
    [/log ?in|sign ?in|ログイン/i, "ログイン"], [/log ?out|sign ?out|ログアウト/i, "ログアウト"],
    [/password|パスワード/i, "パスワード"], [/\btoken|トークン/i, "トークン"], [/\bauth|認証/i, "[認証|にんしょう]"],
    [/button|ボタン/i, "ボタン"], [/\bapi\b/i, "[API|エーピーアイ]"], [/cache|キャッシュ/i, "キャッシュ"],
    [/database|\bdb\b|データベース/i, "データベース"], [/query|クエリ/i, "クエリ"], [/readme/i, "[README|リードミー]"],
    [/typo|誤字/i, "[誤字|ごじ]"], [/\bcss\b|スタイル/i, "スタイル"], [/layout|レイアウト/i, "レイアウト"],
    [/header|ヘッダー/i, "ヘッダー"], [/footer|フッター/i, "フッター"], [/menu|メニュー/i, "メニュー"],
    [/\bform|フォーム/i, "フォーム"], [/modal|dialog|モーダル|ダイアログ/i, "モーダル"], [/image|\bimg\b|画像/i, "[画像|がぞう]"],
    [/icon|アイコン/i, "アイコン"], [/search|検索/i, "[検索|けんさく]"], [/\buser|ユーザー/i, "ユーザー"],
    [/error|エラー/i, "エラー"], [/exception|例外/i, "[例外|れいがい]"], [/crash|クラッシュ/i, "クラッシュ"],
    [/\bnull\b|undefined|\bnil\b/i, "ヌル"], [/timeout|タイムアウト/i, "タイムアウト"], [/memory|leak|メモリ/i, "メモリ"],
    [/\bbuild|ビルド/i, "ビルド"], [/deploy|デプロイ/i, "デプロイ"], [/server|サーバー/i, "サーバー"],
    [/config|setting|設定/i, "[設定|せってい]"], [/version|バージョン/i, "バージョン"], [/dark ?mode|ダークモード/i, "ダークモード"],
    [/mobile|responsive|スマホ/i, "スマホ"], [/\bcart\b|カート/i, "カート"], [/payment|checkout|決済/i, "[決済|けっさい]"],
    [/e-?mail|\bmail\b|メール/i, "メール"], [/notif|通知/i, "[通知|つうち]"], [/\bdate\b|日付/i, "[日付|ひづけ]"],
    [/\blint|eslint/i, "リント"], [/\bbug|バグ/i, "バグ"], [/branch|ブランチ/i, "ブランチ"], [/\blogs?\b|ログ(?!イン|アウト)/i, "ログ"],
    [/i18n|translat|翻訳/i, "[翻訳|ほんやく]"], [/scroll|スクロール/i, "スクロール"], [/\bpages?\b|ページ/i, "ページ"],
    [/animation|アニメ/i, "アニメ"], [/font|フォント/i, "フォント"], [/colou?r|[^景]色/i, "[色|いろ]"], [/\btests?\b|テスト/i, "テスト"],
    [/\bdocs?\b|document|ドキュメント/i, "ドキュメント"], [/upload|アップロード/i, "アップロード"], [/download|ダウンロード/i, "ダウンロード"]
  ],
  fallbackNouns: {
    fix: ["バグ", "エラー"], feat: ["[機能|きのう]", "[新機能|しんきのう]"], refactor: ["コード", "[関数|かんすう]"], docs: ["ドキュメント", "[説明|せつめい]"],
    test: ["テスト"], perf: ["[速度|そくど]"], style: ["[空白|くうはく]", "インデント"], revert: ["[変更|へんこう]"], merge: ["ブランチ"],
    release: ["バージョン"], deps: ["[依存|いぞん]", "パッケージ"], remove: ["コード"], wip: ["コード"], ci: ["ビルド"],
    security: ["[鍵|かぎ]"], misc: ["コミット", "コード"]
  },

  // line 1 (5)
  l1: {
    all: ["[夜|よ]も[更|ふ]けて", "[秋|あき]の[夜|よ]に", "[午前|ごぜん][二時|にじ]", "[締|し]め[切|き]りの", "[月曜|げつよう]の", "コーヒーの", "[金曜|きんよう]の", "[朝焼|あさや]けに", "ターミナル", "[黒|くろ]い[窓|まど]", "[雨|あめ]の[日|ひ]の", "[終電|しゅうでん]の", "[静|しず]かなる"],
    fix: ["[赤|あか]い[文字|もじ]", "[本番|ほんばん]で"], feat: ["[新|あたら]しき", "[芽|め]が[出|で]たり"], refactor: ["[散|ち]らかった"],
    docs: ["[書|か]き[残|のこ]す"], test: ["[緑|みどり]なる"], perf: ["[速|はや]くなれ"], style: ["[空白|くうはく]の"],
    revert: ["[昨日|きのう]へと"], merge: ["[枝|えだ]と[枝|えだ]"], release: ["[旅立|たびだ]ちの"], deps: ["[上流|じょうりゅう]の"],
    remove: ["[消|き]えてゆく"], wip: ["[途中|とちゅう]まで"], ci: ["[緑色|みどりいろ]"], security: ["[鍵|かぎ]かけて"]
  },
  // line 2 (7) = noun + one of these, picked so the total is exactly 7
  l2: {
    all: ["や", "の[夜|よ]", "を[追|お]う", "の[影|かげ]", "を[待|ま]つ", "の[跡|あと]", "を[見|み]つめ", "に[触|ふ]れて", "と[生|い]きる", "の[名|な]を[呼|よ]ぶ", "を[抱|だ]きしめ", "の[夢|ゆめ][見|み]る"],
    fix: ["を[断|た]つ", "を[直|なお]す", "を[退治|たいじ]す"], feat: ["を[足|た]す", "が[生|う]まれ", "を[迎|むか]えて"],
    refactor: ["を[磨|みが]く", "を[整|ととの]え"], docs: ["を[書|か]く"], test: ["を[試|ため]す", "を[確|たし]かめ"],
    perf: ["を[速|はや]め"], style: ["を[揃|そろ]え"], revert: ["を[戻|もど]す"], remove: ["を[消|け]す", "を[消|け]して"],
    release: ["を[送|おく]り"], security: ["を[守|まも]る"]
  },
  // line 3 (5)
  l3: {
    fix: ["[直|なお]しけり", "[傷|きず]を[縫|ぬ]う", "やっと[消|き]え"], feat: ["[一|ひと]つ[増|ふ]え", "[芽|め]を[出|だ]して", "[世|よ]に[放|はな]つ"],
    refactor: ["[形|かたち][変|か]え", "すっきりと"], docs: ["[書|か]き[添|そ]えて", "[言葉|ことば][足|た]す"], test: ["[緑|みどり][点|つ]く", "[確|たし]かめて"],
    perf: ["[風|かぜ]となる", "[一瞬|いっしゅん]で"], style: ["[整|ととの]えて", "[揃|そろ]う[行|ぎょう]"], revert: ["[巻|ま]き[戻|もど]す", "[元|もと]の[道|みち]"],
    merge: ["[一|ひと]つにと", "[交|まじ]わりて"], release: ["[世|よ]に[出|い]でて", "[旅|たび]に[出|で]る"], deps: ["[新|あら]たなる", "[入|い]れ[替|か]えて"],
    remove: ["[手放|てばな]して", "[跡|あと]もなし"], wip: ["まだ[途中|とちゅう]", "[明日|あした]へと"], ci: ["[緑|みどり][点|つ]く", "[走|はし]り[出|だ]す"],
    security: ["[鍵|かぎ]を[掛|か]け", "[穴|あな]ふさぐ"], misc: ["[積|つ]み[重|かさ]ね", "[一歩|いっぽ]ずつ"]
  },
  // line 4 (7)
  l4: {
    all: ["[誰|だれ]も[知|し]らない", "[画面|がめん]の[光|ひかり]", "コミットひとつ", "[差分|さぶん]の[中|なか]に", "[小|ちい]さな[緑|みどり]", "[冷|さ]めたコーヒー", "レビューを[待|ま]ちて", "[指先|ゆびさき]だけが", "[窓|まど]の[外|そと]には"],
    fix: ["[再現|さいげん]しない", "[三日|みっか]かかった"], feat: ["[誰|だれ]かのために"], refactor: ["[動|うご]きは[同|おな]じ"], docs: ["[未来|みらい]の[自分|じぶん]"],
    test: ["[赤|あか]が[緑|みどり]に"], perf: ["[待|ま]たせはしない"], style: ["[誰|だれ]も[気|き]づかぬ"], revert: ["[昨日|きのう]の[僕|ぼく]に"],
    merge: ["[衝突|しょうとつ]もなく"], release: ["[番号|ばんごう]ひとつ"], deps: ["[知|し]らない[誰|だれ]か"], remove: ["[百行|ひゃくぎょう][消|け]えて"],
    wip: ["[続|つづ]きは[明日|あした]"], ci: ["[待|ま]つこと[五分|ごふん]"], security: ["[誰|だれ]も[入|はい]れぬ"]
  },
  // line 5 (7)
  l5: {
    all: ["[今日|きょう]もプッシュす", "[静|しず]かに[眠|ねむ]る", "それでいいのだ", "[帰|かえ]ろう[今日|きょう]は", "また[明日|あした]から", "ログに[残|のこ]して", "[夜|よる]は[明|あ]けゆく", "マージを[待|ま]とう"],
    fix: ["もう[泣|な]かないで"], feat: ["[育|そだ]て[我|わ]が[子|こ]よ"], refactor: ["[部屋|へや]が[片付|かたづ]く"], docs: ["[読|よ]んでくれるか"],
    test: ["[安心|あんしん]の[色|いろ]"], perf: ["[風|かぜ]より[速|はや]く"], style: ["[行|ぎょう]は[揃|そろ]いて"], revert: ["なかったことに"],
    merge: ["[枝|えだ]は[幹|みき]へと"], release: ["[行|い]ってらっしゃい"], deps: ["[動|うご]けばいいな"], remove: ["[軽|かる]くなる[身|み]よ"],
    wip: ["[今日|きょう]はここまで"], ci: ["[緑|みどり]を[祈|いの]る"], security: ["[眠|ねむ]れる[夜|よる]へ"]
  },

  samples: [
    "fix: ログイン後にトップページへ戻されるバグを修正",
    "feat: ダークモードに対応",
    "refactor: 決済まわりの関数を整理",
    "docs: READMEの使い方を追記",
    "test: カートの合計金額のテストを追加",
    "perf: 検索結果をキャッシュして速くする",
    "Revert \"feat: 通知の音を追加\"",
    "chore(deps): bump eslint from 8.57.0 to 9.4.0"
  ]
};
