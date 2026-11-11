/* コミット清書 — rules and templates only (no AI). Pure functions, shared by 書く and 直す. */
(function () {
  "use strict";

  var TYPES = [
    { id: "feat", label: "機能を追加", when: "使う人から見て、できることが増えたとき",
      ja: "feat(cart): 送料無料までの残り金額を表示", jaDesu: "feat(cart): 送料無料までの残り金額を表示しました", en: "feat(cart): show amount left for free shipping" },
    { id: "fix", label: "バグを修正", when: "おかしな動きを直したとき",
      ja: "fix(auth): ログイン後にトップへ戻される問題を修正", jaDesu: "fix(auth): ログイン後にトップへ戻される問題を修正しました", en: "fix(auth): keep users on the same page after login" },
    { id: "docs", label: "ドキュメント", when: "READMEやコメントなど、文書だけを変えたとき",
      ja: "docs: READMEにセットアップ手順を追記", jaDesu: "docs: READMEにセットアップ手順を追記しました", en: "docs: add setup steps to README" },
    { id: "style", label: "コードの整形", when: "空白やインデントなど、動きが変わらない書式の変更",
      ja: "style: インデントをスペース2つに統一", jaDesu: "style: インデントをスペース2つに統一しました", en: "style: format files with prettier" },
    { id: "refactor", label: "作りの整理", when: "動きは同じまま、コードの中身を書き直したとき",
      ja: "refactor(api): 日付の変換処理を共通化", jaDesu: "refactor(api): 日付の変換処理を共通化しました", en: "refactor(api): extract date parsing into a helper" },
    { id: "perf", label: "速くする", when: "速さや軽さを良くしたとき",
      ja: "perf(search): 検索結果をキャッシュして再検索を高速化", jaDesu: "perf(search): 検索結果をキャッシュして再検索を高速化しました", en: "perf(search): cache results for repeated queries" },
    { id: "test", label: "テスト", when: "テストを足したり直したりしたとき",
      ja: "test(cart): 割引計算のテストを追加", jaDesu: "test(cart): 割引計算のテストを追加しました", en: "test(cart): add tests for discount calculation" },
    { id: "build", label: "ビルド・依存関係", when: "ビルドの設定やパッケージを変えたとき",
      ja: "build: Viteを6.0に更新", jaDesu: "build: Viteを6.0に更新しました", en: "build: bump vite to 6.0" },
    { id: "ci", label: "CIの設定", when: "GitHub ActionsなどCIの設定を変えたとき",
      ja: "ci: プルリクエストでテストを自動実行", jaDesu: "ci: プルリクエストでテストを自動実行するように変更しました", en: "ci: run tests on pull requests" },
    { id: "chore", label: "その他の雑務", when: "上のどれにも当てはまらない作業",
      ja: "chore: .gitignoreにログファイルを追加", jaDesu: "chore: .gitignoreにログファイルを追加しました", en: "chore: ignore log files" }
  ];
  var TYPE_IDS = TYPES.map(function (t) { return t.id; });
  function typeInfo(id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; return null; }

  var ALIAS = {
    feat: "feat", feature: "feat", features: "feat", new: "feat",
    fix: "fix", fixed: "fix", fixes: "fix", bugfix: "fix", hotfix: "fix", bug: "fix",
    docs: "docs", doc: "docs", documentation: "docs", readme: "docs",
    style: "style", styles: "style", format: "style", formatting: "style",
    refactor: "refactor", refactoring: "refactor", refact: "refactor", cleanup: "refactor",
    perf: "perf", performance: "perf",
    test: "test", tests: "test", testing: "test",
    build: "build", deps: "build", dep: "build",
    ci: "ci",
    chore: "chore", misc: "chore"
  };
  var JA_TAG = { "修正": "fix", "バグ修正": "fix", "不具合修正": "fix", "追加": "feat", "機能追加": "feat", "新機能": "feat",
    "ドキュメント": "docs", "文書": "docs", "整形": "style", "リファクタ": "refactor", "リファクタリング": "refactor",
    "高速化": "perf", "テスト": "test", "ビルド": "build", "CI": "ci", "雑務": "chore", "その他": "chore" };
  var GITMOJI = { bug: "fix", ambulance: "fix", sparkles: "feat", tada: "feat", memo: "docs", pencil: "docs", art: "style",
    lipstick: "style", recycle: "refactor", zap: "perf", white_check_mark: "test", rotating_light: "style",
    construction_worker: "ci", green_heart: "ci", wrench: "chore", package: "build", arrow_up: "build", hammer: "build",
    fire: "refactor", truck: "refactor", pencil2: "fix" };
  var EMOJI = { "🐛": "fix", "🚑": "fix", "✨": "feat", "🎉": "feat", "📝": "docs", "🎨": "style", "💄": "style", "♻": "refactor",
    "⚡": "perf", "✅": "test", "👷": "ci", "💚": "ci", "🔧": "chore", "📦": "build", "⬆": "build", "🔨": "build", "🔥": "refactor", "🚚": "refactor" };

  /* words that hint at a type: [type, weight, words...]. English words match whole words; Japanese match anywhere. */
  var HINTS = [
    ["docs", 3, "readme", "changelog", "docs", "documentation", "jsdoc", "ドキュメント", "README", "説明書", "手順書", "コメントを", "追記", "CHANGELOG", ".md"],
    ["test", 3, "test", "tests", "spec", "specs", "e2e", "coverage", "jest", "pytest", "vitest", "テスト"],
    ["ci", 3, "ci", "workflow", "workflows", "actions", "pipeline", "circleci", "ワークフロー", "GitHub Actions", ".github"],
    ["build", 3, "deps", "dependency", "dependencies", "bump", "webpack", "vite", "dockerfile", "package.json", "依存", "パッケージ", "ビルド", "ライブラリを更新", "バージョンを上げ"],
    ["style", 3, "prettier", "whitespace", "indent", "indentation", "formatting", "lint", "eslint", "整形", "フォーマット", "インデント", "空白", "セミコロン", "コードスタイル"],
    ["perf", 3, "perf", "performance", "faster", "speed", "optimize", "optimise", "cache", "lazy", "高速化", "速く", "軽く", "パフォーマンス", "キャッシュ", "遅い"],
    ["refactor", 3, "refactor", "refactoring", "rename", "extract", "simplify", "restructure", "cleanup", "リファクタ", "共通化", "整理", "分割", "名前を変更", "書き直"],
    ["fix", 2, "fix", "fixes", "fixed", "bug", "bugs", "crash", "error", "broken", "typo", "hotfix", "修正", "直す", "直し", "直した", "バグ", "不具合", "エラー", "落ちる", "誤字", "解消", "表示崩れ", "効かない", "動かない"],
    ["feat", 1, "add", "adds", "added", "new", "implement", "support", "introduce", "allow", "enable", "feature", "追加", "実装", "できるように", "新しく", "新規", "対応"],
    ["chore", 1, "chore", "config", "gitignore", "release", "設定", ".gitignore", "雑務"]
  ];

  function guessType(text) {
    var lower = String(text).toLowerCase();
    var best = null;
    HINTS.forEach(function (h) {
      var type = h[0], w = h[1], score = 0, hit = null;
      for (var i = 2; i < h.length; i++) {
        var word = h[i];
        var ascii = /^[\x00-\x7f]+$/.test(word);
        var found = ascii && /^[a-z0-9]+$/i.test(word)
          ? new RegExp("(^|[^a-z0-9])" + word.toLowerCase() + "($|[^a-z0-9])").test(lower)
          : lower.indexOf(word.toLowerCase()) >= 0;
        if (found) { score += w; if (!hit) hit = word; }
      }
      if (score && (!best || score > best.score)) best = { type: type, score: score, word: hit };
    });
    return best ? { type: best.type, word: best.word } : { type: "chore", word: null };
  }

  /* ---------- width (full-width counts as 2) ---------- */
  function cw(cp) {
    return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
      (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) ||
      (cp >= 0x20000 && cp <= 0x3fffd) ? 2 : 1;
  }
  function width(s) { var w = 0; for (var ch of String(s)) w += cw(ch.codePointAt(0)); return w; }
  /* split a string at a column: [fits, rest] */
  function cut(s, col) {
    var w = 0, i = 0, out = "";
    for (var ch of String(s)) { var c = cw(ch.codePointAt(0)); if (w + c > col) break; w += c; out += ch; i += ch.length; }
    return [out, String(s).slice(i)];
  }
  function hasJa(s) { return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s); }

  /* ---------- wrapping (spaces for English, any character for Japanese, with simple kinsoku) ---------- */
  var NO_START = "、。，．,.)）」』】〕〉》！？!?:：;；ーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々…‥・";
  var NO_END = "(（「『【〔〈《";
  function isWideChar(ch) { return cw(ch.codePointAt(0)) === 2; }
  function tokenize(s) {
    var toks = [], buf = "";
    for (var ch of s) {
      if (ch === " ") { if (buf) toks.push(buf); buf = ""; toks.push(" "); }
      else if (isWideChar(ch)) { if (buf) toks.push(buf); buf = ""; toks.push(ch); }
      else buf += ch;
    }
    if (buf) toks.push(buf);
    return toks;
  }
  function skipLine(line) { return /^( {4}|\t)/.test(line) || /^\s*\S*:\/\/\S+\s*$/.test(line) || /^\s*[|>]/.test(line); }
  function wrapLine(line, max) {
    max = max || 72;
    if (width(line) <= max || skipLine(line)) return [line];
    var m = /^(\s*(?:[-*+•・]|\d+[.)])\s+)/.exec(line);
    var indent = m ? " ".repeat(width(m[1])) : (/^\s*/.exec(line)[0]);
    var first = m ? m[1] : indent;
    var toks = tokenize(line.slice(first.length));
    var lines = [], cur = [], curW = width(first), prefix = first;
    function flush() {
      while (cur.length && cur[cur.length - 1] === " ") cur.pop();
      lines.push(prefix + cur.join(""));
      prefix = indent; cur = []; curW = width(indent);
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], tw = width(t);
      if (t === " " && !cur.length) continue;
      if (curW + tw > max && cur.length) {
        if (t === " ") { flush(); continue; }
        var carry = [];
        /* do not start a line with 、。」 etc.: pull the previous character down */
        if (NO_START.indexOf(t[0]) >= 0 && cur.length > 1 && cur[cur.length - 1] !== " ") carry.push(cur.pop());
        /* do not end a line with 「（ */
        while (cur.length > 1 && NO_END.indexOf(cur[cur.length - 1]) >= 0) carry.unshift(cur.pop());
        flush();
        carry.forEach(function (c) { cur.push(c); curW += width(c); });
      }
      cur.push(t); curW += tw;
    }
    if (cur.length) flush();
    return lines;
  }
  function wrapText(text, max) {
    var out = [], fence = false;
    String(text).split("\n").forEach(function (line) {
      if (/^\s*```/.test(line)) { fence = !fence; out.push(line); return; }
      if (fence) { out.push(line); return; }
      wrapLine(line, max).forEach(function (l) { out.push(l); });
    });
    return out.join("\n");
  }

  /* ---------- English: imperative mood ---------- */
  var VERBS = ("add fix update remove change improve refactor implement create delete move rename bump upgrade replace clean make " +
    "write handle allow enable disable support introduce convert merge prevent correct revert simplify extract optimize document " +
    "test ignore use adjust resolve drop split migrate configure install build run show hide display keep avoid reduce increase " +
    "set apply include exclude limit sort format release prepare tweak restore return validate check catch log export import " +
    "speed").split(" ");
  var IRREG = { make: "made", write: "wrote", set: "set", split: "split", build: "built", run: "ran", keep: "kept", catch: "caught" };
  var DOUBLE = { drop: 1, set: 1, run: 1, split: 1, stop: 1, plan: 1, wrap: 1, ship: 1, bump: 0 };
  var FORMS = {};
  VERBS.forEach(function (b) {
    var last = b[b.length - 1], dbl = DOUBLE[b] === 1;
    var past = IRREG[b] || (last === "e" ? b + "d" : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + "ied" : dbl ? b + last + "ed" : b + "ed");
    var s = /(s|x|z|ch|sh)$/.test(b) ? b + "es" : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + "ies" : b + "s";
    var ing = /[^e]e$/.test(b) ? b.slice(0, -1) + "ing" : dbl ? b + last + "ing" : b + "ing";
    [past, s, ing].forEach(function (f) { if (f !== b) FORMS[f] = b; });
  });
  var BASE = {}; VERBS.forEach(function (b) { BASE[b] = 1; });
  /* returns null when nothing to change */
  function enFix(desc) {
    var m = /^([A-Za-z]+)(.*)$/.exec(desc);
    if (!m) return null;
    var w = m[1], low = w.toLowerCase();
    if (FORMS[low] && !BASE[low]) return { text: FORMS[low] + m[2], kind: "mood", from: w, to: FORMS[low] };
    if (BASE[low] && w !== low && w !== w.toUpperCase()) return { text: low + m[2], kind: "case", from: w, to: low };
    return null;
  }

  /* ---------- Japanese: sentence endings ---------- */
  var SURU = ("追加 修正 削除 変更 更新 改善 対応 実装 整理 導入 廃止 統一 調整 移動 置換 分割 統合 作成 追記 記載 表示 設定 回避 解消 " +
    "刷新 改名 移行 対策 反映 修整 訂正 適用 許可 禁止 制限 保存 復元 除外 抽出 共通化 高速化 最適化 自動化 簡略化 " +
    "アップデート リファクタ リファクタリング リネーム インストール アップグレード 実行 確認 検証 作成 記録 計算 通知 改修 " +
    "整形 書き換え 置き換え 差し替え 見直し 切り出し 作り直し 書き直し 洗い出し 取り込み").split(" ");
  var JA_POLITE = /(しました|します|しています|いたしました|でした|です|ました|ます)$/;
  var JA_PLAIN = /([一-龠々ァ-ヶー]{2,})(した|する)$/;
  function endsWithSuru(s) {
    for (var i = 0; i < SURU.length; i++) if (s.slice(-SURU[i].length) === SURU[i]) return true;
    return /[一-龠々]化$/.test(s);
  }
  /* returns {ok:boolean, text?:string} for the chosen style */
  function jaCheck(desc, style) {
    var s = desc.replace(/[。．.]+$/, "");
    if (style === "desu") {
      if (JA_POLITE.test(s)) return { ok: true };
      if (JA_PLAIN.test(s)) return { ok: false, text: s.replace(/(した|する)$/, "しました") };
      if (endsWithSuru(s)) return { ok: false, text: s + "しました" };
      return { ok: false, text: null };
    }
    var m = /(しました|します|しています|いたしました|した|する)$/.exec(s);
    if (m) {
      var stem = s.slice(0, -m[0].length);
      if (/[一-龠々ァ-ヶー]{2}$/.test(stem) || endsWithSuru(stem)) return { ok: false, text: stem };
      return { ok: false, text: null };
    }
    if (/(でした|です|ました|ます)$/.test(s)) return { ok: false, text: null };
    return { ok: true };
  }

  /* ---------- issue refs and footers ---------- */
  var REF_KW = /^(close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?|see|issue|related(?: to)?|関連|参照)$/i;
  function kwNorm(k) {
    k = String(k || "").toLowerCase();
    if (/^close/.test(k)) return "Closes";
    if (/^fix/.test(k)) return "Fixes";
    if (/^resolve/.test(k)) return "Resolves";
    return "Refs";
  }
  var REF_RE = "((?:[\\w.-]+\\/[\\w.-]+)?#\\d+)";
  var GOOD_REF = new RegExp("^(Closes|Fixes|Resolves|Refs) " + REF_RE + "(, ?" + REF_RE + ")*$");
  var LOOSE_REF = new RegExp("^\\s*(?:(close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?|see|issue|related(?: to)?|関連|参照)\\s*[:：]?\\s*)?((?:[\\w.-]+\\/[\\w.-]+)?#?\\d+(?:\\s*[,、]\\s*(?:[\\w.-]+\\/[\\w.-]+)?#?\\d+)*)\\s*$", "i");
  var TRAILER = /^([A-Za-z][A-Za-z-]*-by|BREAKING[ -]CHANGE|Closes|Fixes|Resolves|Refs|Reviewed-on|Change-Id)\s*: ?/i;
  function looseRef(line) {
    var m = LOOSE_REF.exec(line);
    if (!m) return null;
    if (!m[1] && !/#/.test(m[2])) return null; /* a bare number is not an issue */
    if (/^\s*#\d+\s*$/.test(line) || m[1] || /#/.test(m[2])) {
      var nums = m[2].split(/\s*[,、]\s*/).map(function (n) { return /#/.test(n) ? n : "#" + n; });
      return { kw: kwNorm(m[1]), refs: nums };
    }
    return null;
  }
  function parseIssues(text) {
    var out = [], re = /(?:([\w.-]+\/[\w.-]+))?#?(\d+)/g, m;
    while ((m = re.exec(String(text)))) out.push((m[1] || "") + "#" + m[2]);
    return out.filter(function (v, i) { return out.indexOf(v) === i; });
  }

  /* ---------- header ---------- */
  var STRICT = /^([A-Za-z]+)(?:\(([^()\s][^()]*)\))?(!)?: (\S.*)$/;
  function parseHeader(h) {
    var m = STRICT.exec(h);
    return m ? { type: m[1], scope: m[2] || "", bang: !!m[3], desc: m[4] } : null;
  }

  /* ---------- lint ---------- */
  function lint(msg, opts) {
    opts = opts || {};
    var text = String(msg).replace(/\r\n?/g, "\n").replace(/\s+$/, "");
    var checks = [];
    function add(level, text2, fix) { checks.push({ level: level, text: text2, fix: fix || null }); }
    if (!text.trim()) return { checks: checks, header: null };
    var lines = text.split("\n");
    var header = lines[0];
    var p = parseHeader(header);
    var desc = p ? p.desc : header;
    if (!p) {
      if (/^[A-Za-z]+(\([^)]*\))?!?：/.test(header)) add("error", "「：」が全角です。半角の「:」にします。", "header");
      else if (/^[A-Za-z]+(\([^)]*\))?!?:\S/.test(header)) add("error", "「:」のあとに半角スペースを1つ入れます。", "header");
      else if (/^[A-Za-z]+(\([^)]*\))?!? +:/.test(header)) add("error", "「:」の前のスペースはいりません。", "header");
      else if (/^[A-Za-z]+\(\)/.test(header)) add("error", "範囲のかっこが空です。範囲を書くか、かっこごと消します。", "header");
      else if (/^\s/.test(header)) add("error", "1行目の先頭に空白があります。", "header");
      else add("error", "先頭に種類がありません。「fix: 」のように書きます。", "header");
    } else {
      var t = typeInfo(p.type.toLowerCase());
      if (p.type !== p.type.toLowerCase()) add("error", "種類は小文字で書きます（" + p.type + " → " + p.type.toLowerCase() + "）。", "header");
      else if (!t && (opts.own || []).indexOf(p.type) >= 0) add("ok", "種類は「" + p.type + "」（自分で追加した種類）です。");
      else if (!t) add("warn", "「" + p.type + "」はよく使う種類ではありません。早見表の10種類から選べます。", "header");
      else add("ok", "種類は「" + t.id + "」（" + t.label + "）です。");
      if (/\s{2,}/.test(p.desc)) add("warn", "要約にスペースが2つ続いているところがあります。", "header");
    }
    var w = width(header);
    if (w <= 50) add("ok", "1行目は半角で" + w + "文字分です（50まで）。");
    else if (w <= 72) add("warn", "1行目が半角で" + w + "文字分です。50までに収めると、一覧で切れずに読めます。");
    else add("error", "1行目が半角で" + w + "文字分あります。72を超えると、GitHubなどで途中から切れます。");
    if (/[.。．]$/.test(header)) add("error", "1行目の最後には「" + header.slice(-1) + "」を付けません。", "period");
    if (/(^|[^(])#\d+\b(?!\))/.test(desc) || /\b(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?)\s*:?\s*#\d+/i.test(desc))
      add("warn", "issue番号は1行目ではなく、最後の行に「Refs #12」の形で書きます。", "footer");

    var lang = opts.lang || (hasJa(desc) ? "ja" : "en");
    if (p && lang === "ja" && hasJa(desc)) {
      var jc = jaCheck(desc, opts.jaStyle || "taigen");
      var styleName = opts.jaStyle === "desu" ? "です・ます" : "体言止め";
      if (jc.ok) add("ok", "文末は" + styleName + "でそろっています。");
      else if (opts.jaStyle === "desu") add("warn", "文末を「です・ます」にそろえます（例：「〜を追加しました」）。", jc.text ? "style" : null);
      else add("warn", "文末を体言止めにそろえます（例：「〜を追加しました」→「〜を追加」）。", jc.text ? "style" : null);
    } else if (p && !hasJa(desc)) {
      var ef = enFix(desc);
      if (ef && ef.kind === "mood") add("warn", "動詞は命令形にします（" + ef.from + " → " + ef.to + "）。", "style");
      else if (ef && ef.kind === "case") add("warn", "「:」のあとは小文字で始めるのが一般的です（" + ef.from + " → " + ef.to + "）。", "style");
      else if (/^[a-z]/.test(desc)) add("ok", "要約は小文字の命令形で始まっています。");
    }

    if (lines.length > 1) {
      if (lines[1].trim() !== "") add("error", "1行目と本文のあいだに、空行を1行入れます。", "blank");
      var rest = lines.slice(1);
      var over = 0, fence = false, hashLine = false, badRef = false, badBreak = false, hasBreak = false, goodRef = false;
      rest.forEach(function (l) {
        if (/^\s*```/.test(l)) fence = !fence;
        if (!fence && width(l) > 72 && !skipLine(l)) over++;
        if (/^#/.test(l)) hashLine = true;
        if (/^BREAKING[ -]CHANGE: \S/.test(l)) hasBreak = true;
        else if (/^breaking[ -]change\s*:/i.test(l)) badBreak = true;
        if (GOOD_REF.test(l)) goodRef = true;
        else if (looseRef(l)) badRef = true;
      });
      var bodyLines = rest.filter(function (l) { return l.trim(); }).length;
      if (over) add("warn", "本文の" + over + "行が、半角72文字分を超えています。", "wrap");
      else if (bodyLines) add("ok", "本文は72文字分で折り返されています。");
      if (hashLine) add("warn", "「#」で始まる行は、エディタで書くとgitに消されます。", "footer");
      if (badBreak) add("error", "「BREAKING CHANGE:」は大文字で書きます。", "footer");
      if (badRef) add("warn", "issue番号は「Closes #12」や「Refs #12」の形で書きます。", "footer");
      else if (goodRef && !hashLine) add("ok", "issue番号の書き方は正しい形です。");
      if (p && p.bang && !hasBreak) add("warn", "「!」を付けたら、何が変わるかを「BREAKING CHANGE:」の行で書くと親切です。");
      if (hasBreak && p && !p.bang) add("ok", "互換性が壊れる変更として書かれています。");
    } else if (p && p.bang) {
      add("warn", "「!」を付けたら、何が変わるかを「BREAKING CHANGE:」の行で書くと親切です。");
    }
    return { checks: checks, header: p };
  }

  /* ---------- clean up a pasted message ---------- */
  function clean(msg, opts) {
    opts = opts || {};
    var changes = [];
    var text = String(msg).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    var lines = text.split("\n").map(function (l) { return l.replace(/\s+$/, ""); });
    while (lines.length && !lines[0].trim()) lines.shift();
    if (!lines.length) return null;
    var header = lines.shift().trim();
    var rest = lines;
    var hint = null, scope = "", bang = false, desc = header, type = null, guessedFrom = null;

    /* gitmoji / emoji prefix */
    var gm = /^:([a-z0-9_+-]+):\s*/.exec(desc);
    if (gm) { hint = GITMOJI[gm[1]] || null; desc = desc.slice(gm[0].length); changes.push("先頭の絵文字コード「:" + gm[1] + ":」を外しました。"); }
    else {
      var first = Array.from(desc)[0] || "";
      var base = first.replace(/️/g, "");
      if (EMOJI[base] || /\p{Extended_Pictographic}/u.test(first)) {
        hint = EMOJI[base] || null;
        desc = desc.slice(first.length).replace(/^️?\s*/, "");
        changes.push("先頭の絵文字を外しました。");
      }
    }
    /* 【修正】 or [fix] style tag */
    var tag = /^[【\[［]\s*([^\]】］]+?)\s*[\]】］]\s*[:：]?\s*/.exec(desc);
    if (tag) {
      var tv = JA_TAG[tag[1]] || ALIAS[tag[1].toLowerCase()];
      if (tv) { hint = tv; desc = desc.slice(tag[0].length); changes.push("「" + tag[0].trim() + "」を種類に置き換えました。"); }
    }
    var lm = /^([A-Za-z]+)\s*(?:\(\s*([^)]*?)\s*\))?\s*(!)?\s*[:：]\s*(.*)$/.exec(desc);
    var ownT = lm && (opts.own || []).indexOf(lm[1].toLowerCase()) >= 0 ? lm[1].toLowerCase() : null;
    if (lm && (ALIAS[lm[1].toLowerCase()] || ownT)) {
      var raw = lm[1];
      type = ownT || ALIAS[raw.toLowerCase()];
      scope = (lm[2] || "").trim();
      bang = !!lm[3];
      desc = lm[4];
      if (raw !== type) changes.push("種類「" + raw + "」を「" + type + "」にしました。");
      else if (!/^[a-z]+(\([^)]*\))?!?: /.test(header.replace(/^\S*\s*(?=[a-z]+[(:!])/, "")) && !gm && !tag) changes.push("「:」の前後の書き方をそろえました。");
    } else {
      /* "Fix login bug" — first English word is a type alias */
      var wm = /^([A-Za-z]+)\s+(.*)$/.exec(desc);
      if (!hint && wm && ALIAS[wm[1].toLowerCase()] && FORMS[wm[1].toLowerCase()] === undefined && !BASE[wm[1].toLowerCase()]) {
        type = ALIAS[wm[1].toLowerCase()];
      }
    }
    if (!type && hint) type = hint;
    if (!type) {
      var g = guessType(desc + " " + rest.join(" "));
      type = g.type; guessedFrom = g.word;
      changes.push(g.word ? "「" + g.word + "」から、種類を「" + type + "」と考えました。" : "決め手になる言葉がないので、種類を「chore」にしました。");
    }
    if (opts.type && opts.type !== type) { type = opts.type; guessedFrom = null; }

    var footers = [], body = [];
    /* refs at the end of the header */
    var refMoved = false;
    for (;;) {
      var rm = new RegExp("[\\s,、(（]*(?:(close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs?|see)\\s*:?\\s*)?" + REF_RE + "[)）]?\\s*$", "i").exec(desc);
      if (!rm || rm.index === 0) break;
      if (!rm[1] && /^\s*[(（]#\d+[)）]\s*$/.test(rm[0]) && !/[,、]/.test(rm[0])) break; /* "(#123)" = PR number, keep */
      footers.push(kwNorm(rm[1]) + " " + rm[2]);
      desc = desc.slice(0, rm.index);
      refMoved = true;
    }
    if (refMoved) changes.push("issue番号を最後の行に移しました。");
    desc = desc.replace(/\s{2,}/g, " ").trim();

    /* several sentences in the header → the rest goes to the body */
    var sm = /^(.+?[。．]|.+?\. (?=[A-Z])|.+?;\s)(.+)$/.exec(desc);
    if (sm && sm[2].trim()) {
      desc = sm[1].trim(); body.push(sm[2].trim()); body.push("");
      changes.push("1行目の2文目からを本文に移しました。");
    }
    if (/[.。．]$/.test(desc)) { desc = desc.replace(/[.。．;]+$/, ""); changes.push("1行目の最後の句点を消しました。"); }

    var ja = hasJa(desc);
    if (ja) {
      var jc = jaCheck(desc, opts.jaStyle || "taigen");
      if (!jc.ok && jc.text) { desc = jc.text; changes.push(opts.jaStyle === "desu" ? "文末を「です・ます」にそろえました。" : "文末を体言止めにそろえました。"); }
    } else {
      var ef = enFix(desc);
      if (ef) { desc = ef.text; changes.push(ef.kind === "mood" ? "「" + ef.from + "」を命令形の「" + ef.to + "」にしました。" : "「" + ef.from + "」を小文字にしました。"); }
    }

    /* body and footers */
    var breaking = null, fence = false, movedRef = false, fixedBreak = false, trailers = [];
    rest.forEach(function (l) {
      if (/^\s*```/.test(l)) fence = !fence;
      if (!fence) {
        var bm = /^\s*breaking[ -_]?changes?\s*[:：]\s*(.*)$/i.exec(l);
        if (bm) { breaking = bm[1]; if (!/^BREAKING[ -]CHANGE: /.test(l)) fixedBreak = true; return; }
        var lr = looseRef(l);
        if (lr) { if (!GOOD_REF.test(l)) movedRef = true; lr.refs.forEach(function (r) { footers.push(lr.kw + " " + r); }); return; }
        if (TRAILER.test(l) && !/^BREAKING/i.test(l)) { trailers.push(l.trim()); return; }
      }
      body.push(l);
    });
    if (movedRef) changes.push("issue番号を「" + footers[footers.length - 1] + "」の形にしました。");
    if (fixedBreak) changes.push("「BREAKING CHANGE:」の書き方を直しました。");
    if (breaking !== null && !bang) { bang = true; changes.push("互換性が壊れる変更なので、種類に「!」を付けました。"); }
    /* tidy blank lines */
    var tidy = [];
    body.forEach(function (l) { if (!l.trim() && (!tidy.length || !tidy[tidy.length - 1].trim())) return; tidy.push(l); });
    while (tidy.length && !tidy[tidy.length - 1].trim()) tidy.pop();
    if (rest.length && rest[0].trim() && tidy.length) changes.push("1行目のあとに空行を入れました。");
    var before = tidy.join("\n");
    var wrapped = wrapText(before, 72);
    if (wrapped !== before) changes.push("本文を72文字分で折り返しました。");

    var head = type + (scope ? "(" + scope + ")" : "") + (bang ? "!" : "") + ": " + desc;
    var foot = [];
    if (breaking !== null) foot.push(wrapText("BREAKING CHANGE: " + (breaking || "（何が変わるかを書きます）"), 72));
    footers.filter(function (v, i) { return footers.indexOf(v) === i; }).forEach(function (f) { foot.push(f); });
    trailers.forEach(function (t) { foot.push(t); });
    var out = head + (wrapped ? "\n\n" + wrapped : "") + (foot.length ? "\n\n" + foot.join("\n") : "");
    if (!desc) changes.push("要約が空です。何をしたかを1行で書き足します。");
    return { text: out, type: type, guessedFrom: guessedFrom, changes: changes };
  }

  /* ---------- assemble a message from the form ---------- */
  function assemble(s) {
    var summary = String(s.summary || "").replace(/\s+/g, " ").trim();
    var head = s.type + (s.scope ? "(" + s.scope.trim() + ")" : "") + (s.breaking ? "!" : "") + ": " + summary;
    var parts = [];
    var why = String(s.why || "").replace(/\s+$/, "").replace(/^\n+/, "");
    if (why.trim()) parts.push(why);
    var what = String(s.what || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean)
      .map(function (l) { return /^[-*•・]\s*/.test(l) ? "- " + l.replace(/^[-*•・]\s*/, "") : "- " + l; });
    if (what.length) parts.push(what.join("\n"));
    var body = parts.join("\n\n");
    if (s.wrap) body = wrapText(body, 72);
    var foot = [];
    if (s.breaking && String(s.breakNote || "").trim()) {
      var bn = "BREAKING CHANGE: " + String(s.breakNote).replace(/\s+/g, " ").trim();
      foot.push(s.wrap ? wrapText(bn, 72) : bn);
    }
    parseIssues(s.issues || "").forEach(function (r) { foot.push((s.issueKw || "Refs") + " " + r); });
    return head + (body ? "\n\n" + body : "") + (foot.length ? "\n\n" + foot.join("\n") : "");
  }

  function shellQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

  window.CommitRules = {
    TYPES: TYPES, TYPE_IDS: TYPE_IDS, typeInfo: typeInfo, guessType: guessType, width: width, cut: cut, hasJa: hasJa,
    wrapText: wrapText, enFix: enFix, jaCheck: jaCheck, lint: lint, clean: clean, assemble: assemble,
    parseIssues: parseIssues, shellQuote: shellQuote
  };
})();
