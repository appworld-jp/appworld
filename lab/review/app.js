// レビュー下書き — rule-based unified-diff checker. No AI, nothing is sent or stored.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);

  // ---------- parse ----------
  function parse(text) {
    const files = []; let cur = null, oRem = 0, nRem = 0, oN = 0, nN = 0;
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const strip = p => p.replace(/^"|"$/g, "").replace(/^[ab]\//, "").replace(/\t.*$/, "");
    const start = (a, b) => { cur = { path: b || a, old: a || b, status: "M", add: 0, del: 0, added: [], removed: [], hunks: 0, binary: false }; files.push(cur); };
    for (const line of lines) {
      if (oRem > 0 || nRem > 0) {
        const c = line[0];
        if (c === "+") { cur.add++; cur.added.push({ n: nN, t: line.slice(1) }); nN++; nRem--; continue; }
        if (c === "-") { cur.del++; cur.removed.push({ n: oN, t: line.slice(1) }); oN++; oRem--; continue; }
        if (c === " " || line === "") { oN++; nN++; oRem--; nRem--; continue; }
        if (c === "\\") continue;
        oRem = nRem = 0; // malformed counts: fall through to header handling
      }
      if (line.startsWith("diff --git ")) {
        const m = /^diff --git ("?a\/.+?"?) ("?b\/.+"?)$/.exec(line);
        start(m ? strip(m[1]) : "", m ? strip(m[2]) : line.slice(11)); cur.git = true; continue;
      }
      if (line.startsWith("\\")) continue;
      if (/^new file mode/.test(line) && cur) { cur.status = "A"; continue; }
      if (/^deleted file mode/.test(line) && cur) { cur.status = "D"; continue; }
      if (/^rename from /.test(line) && cur) { cur.status = "R"; cur.old = line.slice(12); continue; }
      if (/^rename to /.test(line) && cur) { cur.path = line.slice(10); continue; }
      if (/^Binary files /.test(line) && cur) { cur.binary = true; continue; }
      if (line.startsWith("--- ")) {
        const p = line.slice(4);
        if (!cur || cur.hunks > 0 || !cur.git) start(strip(p), strip(p));
        if (p.startsWith("/dev/null")) cur.status = "A"; else cur.old = strip(p);
        continue;
      }
      if (line.startsWith("+++ ")) {
        const p = line.slice(4);
        if (!cur) start("", strip(p));
        if (p.startsWith("/dev/null")) cur.status = "D"; else cur.path = strip(p);
        continue;
      }
      const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (h) {
        if (!cur) start("", "（不明なファイル）");
        cur.hunks++; oN = +h[1]; nN = +h[3];
        oRem = h[2] === undefined ? 1 : +h[2]; nRem = h[4] === undefined ? 1 : +h[4];
      }
    }
    return files.filter(f => f.path);
  }

  // ---------- rules ----------
  const ext = p => (p.match(/\.([A-Za-z0-9]+)$/) || [, ""])[1].toLowerCase();
  const CODE = new Set(["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "py", "rb", "go", "java", "kt", "kts", "swift", "php", "rs", "c", "h", "cc", "cpp", "hpp", "cs", "scala", "dart", "sh"]);
  const isTest = p => /(^|\/)(tests?|__tests__|spec|specs)\//i.test(p) || /[._-](test|spec)s?\.[a-z]+$/i.test(p) || /(^|\/)test_[^/]+\.py$/.test(p) || /_test\.(go|py|rb|exs?)$/.test(p) || /Tests?\.(java|kt|swift|cs)$/.test(p);
  const isGenerated = p => /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Gemfile\.lock|Cargo\.lock|go\.sum|composer\.lock)$/.test(p) || /\.min\.(js|css)$/.test(p) || /(^|\/)(dist|build|vendor)\//.test(p);
  const isCode = p => CODE.has(ext(p)) && !isGenerated(p);
  const hashComment = p => ["py", "rb", "sh"].includes(ext(p));
  const baseName = p => p.split("/").pop().replace(/\.[^.]+$/, "").replace(/([._-](test|spec)s?|Tests?)$/i, "").replace(/^test_/, "").toLowerCase();

  const DEBUG = {
    js: /\bconsole\.(log|debug|trace|dir|table)\s*\(|\bdebugger\s*;?/, py: /^\s*print\s*\(|\bpdb\.set_trace\s*\(|\bbreakpoint\s*\(\s*\)|\bic\s*\(/,
    go: /\bfmt\.Print(ln|f)?\s*\(|\bspew\.Dump\(/, java: /\bSystem\.(out|err)\.print(ln)?\s*\(|\.printStackTrace\s*\(\)/, kt: /^\s*println\s*\(/,
    rb: /\bbinding\.pry\b|^\s*(p|pp|puts)\s+\S/, php: /\b(var_dump|print_r|dd|dump)\s*\(/, rs: /\bdbg!\s*\(|^\s*println!\s*\(/, swift: /^\s*(print|debugPrint|dump)\s*\(/,
    cs: /\bConsole\.Write(Line)?\s*\(|\bDebug\.Log\s*\(/, dart: /^\s*print\s*\(/, c: /\bprintf\s*\(\s*"DEBUG/
  };
  const debugRe = p => {
    const e = ext(p);
    if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte"].includes(e)) return DEBUG.js;
    if (e === "kts") return DEBUG.kt; if (["cc", "cpp", "h", "hpp"].includes(e)) return DEBUG.c;
    return DEBUG[e] || null;
  };
  const SECRETS = [
    [/AKIA[0-9A-Z]{16}/, "AWSのアクセスキー"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "秘密鍵"],
    [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHubのトークン"],
    [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "Slackのトークン"],
    [/\bsk_(live|test)_[A-Za-z0-9]{16,}/, "決済サービスの秘密キー"],
    [/\bsk-[A-Za-z0-9_-]{20,}/, "APIキー"],
    [/\bAIza[0-9A-Za-z_-]{35}/, "Google APIキー"],
    [/(?:api[_-]?key|apikey|secret|token|passwd|password|private[_-]?key|access[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/i, "鍵・パスワード"],
    [/:\/\/[^\s:/@]+:[^\s@/]{4,}@/, "URLに埋め込まれたパスワード"]
  ];
  const TODO_RE = /\b(TODO|FIXME|XXX|HACK)\b/;
  function commentBody(p, t) {
    const s = t.trim();
    let m = /^\/\/+\s?(.*)$/.exec(s) || /^\/\*+\s?(.*?)\s*(\*\/)?$/.exec(s) || /^\*\s(.*)$/.exec(s);
    if (!m && hashComment(p)) m = /^#(?![!])\s?(.*)$/.exec(s);
    if (!m && ext(p) === "sh") return null;
    return m ? m[1] : null;
  }
  const looksLikeCode = s => /^(const|let|var|if|else|for|while|return|function|def|import|from|class|await|try|catch|print|console\.|self\.|this\.)\b/.test(s.trim()) ||
    /[;{}]\s*$/.test(s) || /^[A-Za-z_$][\w$.]*\s*\(.*\)\s*;?$/.test(s.trim()) || /^[A-Za-z_$][\w$.]*\s*=\s*[^=]/.test(s.trim());
  const FN_RE = /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(|^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)|^\s*(?:async\s+)?def\s+(\w+)|^\s*func\s+(?:\([^)]*\)\s*)?(\w+)|^\s*(?:pub\s+)?fn\s+(\w+)|^\s*(?:(?:public|private|protected|static|final|override|suspend|async)\s+)+[\w<>\[\],\s]*?\b(\w+)\s*\([^;]*\)\s*\{?\s*$|^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/;
  const FN_LIMIT = 40, FILE_LIMIT = 300, PR_LIMIT = 600;
  function magicNumbers(t) {
    let s = t.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\/.*$|#.*$|\/\*.*?\*\//g, "");
    if (/^\s*(?:export\s+)?(?:const|final|static\s+final|#define|readonly)\s+[A-Z][A-Z0-9_]*\b/.test(s) || /^\s*[A-Z][A-Z0-9_]+\s*[:=]/.test(s)) return [];
    if (/^\s*(import|from|#include|package|version|"version")\b/.test(s)) return [];
    const out = [];
    for (const m of s.matchAll(/(?<![\w$.\]])(\d+(?:\.\d+)?|\.\d+)(?![\w$])/g)) {
      const v = m[1], num = Number(v);
      if ([0, 1, 2, -1, 10, 100].includes(num)) continue;
      const before = s.slice(0, m.index);
      if (/\[\s*$/.test(before)) continue; // index access
      out.push(v);
    }
    return out;
  }

  function analyse(files) {
    const F = { debug: [], todo: [], secret: [], commented: [], magic: [], bigfile: [], bigfn: [], notest: [], lesstest: [] };
    const tests = files.filter(f => isTest(f.path));
    const testBases = new Set(tests.map(f => baseName(f.path)));
    let total = 0;
    files.forEach(f => {
      total += f.add + f.del;
      if (f.binary || isGenerated(f.path)) return;
      const code = isCode(f.path), test = isTest(f.path), dre = debugRe(f.path);
      let run = null; // commented-out block
      const flushRun = () => { if (run && run.count >= 1) F.commented.push(run); run = null; };
      f.added.forEach((l, i) => {
        const t = l.t;
        for (const [re, label] of SECRETS) {
          const m = t.match(re);
          if (m) { F.secret.push({ f: f.path, n: l.n, t: maskSecret(t, m[0]), label }); break; }
        }
        if (TODO_RE.test(t)) F.todo.push({ f: f.path, n: l.n, t: t.trim(), label: t.match(TODO_RE)[1] });
        if (!code) return;
        const body = commentBody(f.path, t);
        if (body !== null) {
          const prev = f.added[i - 1];
          if (body.trim() && looksLikeCode(body) && !TODO_RE.test(body)) {
            if (run && prev && prev.n === l.n - 1) { run.count++; run.last = l.n; }
            else { flushRun(); run = { f: f.path, n: l.n, last: l.n, count: 1, t: t.trim() }; }
          }
          return;
        }
        flushRun();
        if (dre && dre.test(t)) F.debug.push({ f: f.path, n: l.n, t: t.trim() });
        if (!test) {
          const nums = magicNumbers(t);
          if (nums.length) F.magic.push({ f: f.path, n: l.n, t: t.trim(), nums });
        }
      });
      flushRun();
      if (f.add >= FILE_LIMIT) F.bigfile.push({ f: f.path, n: null, t: `+${f.add}行` });
      if (code) {
        // long functions: count consecutive added lines from a function start
        let fn = null;
        const close = () => { if (fn && fn.len > FN_LIMIT) F.bigfn.push({ f: f.path, n: fn.n, t: `${fn.name}（追加${fn.len}行）`, name: fn.name, len: fn.len }); fn = null; };
        f.added.forEach((l, i) => {
          const prev = f.added[i - 1];
          if (fn && (!prev || prev.n !== l.n - 1)) close();
          const m = FN_RE.exec(l.t);
          if (m && !/^\s*(if|for|while|switch|catch|return)\b/.test(l.t)) {
            const indent = l.t.match(/^\s*/)[0].length;
            if (!fn || indent <= fn.indent) { close(); fn = { name: m.slice(1).find(Boolean) || "無名関数", n: l.n, len: 0, indent }; }
          }
          if (fn) fn.len++;
        });
        close();
      }
      if (code && !test && !/(^|\/)(config|constants?|settings|types?|index)\.[a-z]+$|\.d\.ts$/i.test(f.path) && f.status !== "D" && f.add > 0 && !testBases.has(baseName(f.path))) F.notest.push({ f: f.path, n: null, t: tests.length ? "対応するテストファイルの変更が見当たりません" : "このdiffにはテストの変更がありません" });
      if (test && f.del > f.add) F.lesstest.push({ f: f.path, n: null, t: f.status === "D" ? "テストファイルが削除されています" : `テストが${f.del - f.add}行減っています` });
    });
    return { F, total };
  }
  function maskSecret(line, hit) {
    // hide the value itself, keep a few leading characters so the reviewer can find it
    const toks = hit.match(/[^"'`\s:=@\/]{8,}/g) || [hit];
    const val = toks.sort((a, b) => b.length - a.length)[0];
    return line.trim().split(val).join(val.slice(0, 4) + "…（伏せ字）");
  }

  const META = {
    secret: { sev: "high", title: "秘密情報らしき文字列", why: "鍵やパスワードがコードに入ると、履歴に残り続けます。環境変数や秘密情報の管理機能に移しましょう。", check: "鍵・パスワードがコードに入っていない", comment: h => `${h.label}らしき値が直接書かれているようです。公開されると取り消せないので、環境変数などに移し、もし本物なら鍵の作り直しも検討してください。` },
    debug: { sev: "warn", title: "デバッグ出力の消し忘れ", why: "確認用の出力は、本番でログを汚したり情報を漏らしたりします。", check: "デバッグ用の出力を消した", comment: () => "デバッグ用の出力が残っているようです。不要なら消して、必要ならロガーを使いませんか？" },
    todo: { sev: "info", title: "TODO・FIXMEの追加", why: "あとでやることは、課題として登録しておくと忘れません。", check: "追加したTODO・FIXMEを課題に登録した", comment: h => `${h.label}が追加されています。このプルリクエストで対応しますか？ あとに回す場合は、課題を作ってリンクを書いておくと追いやすいです。` },
    bigfn: { sev: "warn", title: `長い関数（${FN_LIMIT}行超）`, why: "長い関数は読みにくく、テストもしにくくなります。役割ごとに分けられないか見てみましょう。", check: "長い関数を分けられないか検討した", comment: h => `\`${h.name}\`が${h.len}行あります。役割ごとに小さな関数に分けると、読みやすく、テストもしやすくなりそうです。` },
    bigfile: { sev: "info", title: `大きな変更（1ファイル${FILE_LIMIT}行以上）`, why: "変更が大きいと、レビューの見落としが増えます。", check: "大きな変更は分けられないか検討した", comment: () => "このファイルの変更が大きいので、いくつかのプルリクエストに分けられると見やすいです。" },
    notest: { sev: "warn", title: "テストのない変更", why: "ふるまいを変えたなら、テストも足すか直すのが安全です。", check: "変更したソースにテストを足した（または不要な理由を書いた）", comment: () => "変更に対応するテストが見当たりません。テストを足すか、不要ならその理由を説明に書いてもらえると助かります。" },
    lesstest: { sev: "info", title: "テストが減っている", why: "テストを消すときは、理由を説明に書いておきましょう。", check: "テストを減らした理由を説明に書いた", comment: () => "テストが減っています。消した理由を教えてください。" },
    commented: { sev: "info", title: "コメントアウトされたコード", why: "使わないコードは消しても履歴に残ります。コメントで残すと読み手が迷います。", check: "コメントアウトしたコードを消した", comment: h => `コメントアウトされたコードが${h.count > 1 ? `${h.count}行` : ""}あります。不要なら消してしまいませんか？（履歴には残ります）` },
    magic: { sev: "info", title: "名前のない数値", why: "数値に名前をつけると、意味と変える場所がはっきりします。", check: "数値に名前（定数）をつけた", comment: h => `\`${h.nums.join("`、`")}\`に名前をつけて定数にすると、何の数か伝わりやすく、変えるときも楽です。` }
  };
  const ORDER = ["secret", "debug", "notest", "bigfn", "bigfile", "todo", "commented", "magic", "lesstest"];
  const SEV = { high: "要対応", warn: "注意", info: "確認" };

  // ---------- render ----------
  let last = null;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const loc = h => h.n ? `${h.f}:${h.n}` : h.f;

  function render(files) {
    const { F, total } = analyse(files);
    const add = files.reduce((a, f) => a + f.add, 0), del = files.reduce((a, f) => a + f.del, 0);
    const nFind = ORDER.reduce((a, k) => a + F[k].length, 0);
    $("welcome").hidden = true; $("report").hidden = false;
    $("stat-line").textContent = `${files.length}ファイル・+${add}／−${del}・指摘${nFind}件`;
    const bySev = { high: 0, warn: 0, info: 0 };
    ORDER.forEach(k => { bySev[META[k].sev] += F[k].length; });
    const v = $("verdict"); v.className = "verdict " + (bySev.high ? "high" : bySev.warn ? "warn" : "ok");
    v.textContent = bySev.high ? `要対応${bySev.high}件。まず、ここから直しましょう。` : bySev.warn ? `要対応はなし。注意${bySev.warn}件を見ておきましょう。` : nFind ? `確認${bySev.info}件。軽く見ておけば大丈夫です。` : "気になる行はありませんでした。";

    const st = $("stats"); st.replaceChildren();
    [["", files.length, "ファイル"], ["add", "+" + add, "追加行"], ["del", "−" + del, "削除行"], [nFind ? "warn" : "", nFind, "見つかったこと"]].forEach(([c, v, l]) => {
      const d = el("div", "stat " + c); d.append(el("b", "", String(v)), el("span", "", l)); st.append(d);
    });

    const ul = $("files"); ul.replaceChildren();
    files.forEach(f => {
      const li = el("li");
      li.append(el("span", "st " + f.status, f.status));
      const p = el("span", "path", f.status === "R" ? `${f.old} → ${f.path}` : f.path);
      if (isTest(f.path)) p.append(el("span", "tag", "テスト"));
      if (isGenerated(f.path)) p.append(el("span", "tag", "自動生成"));
      if (f.binary) p.append(el("span", "tag", "バイナリ"));
      li.append(p);
      const d = el("span", "delta"); d.append(el("span", "p", "+" + f.add), el("span", "m", "−" + f.del));
      const bars = el("span", "bars"); bars.setAttribute("aria-hidden", "true");
      const sum = f.add + f.del, na = sum ? Math.round((f.add / sum) * 5) : 0, nd = sum ? 5 - na : 0;
      for (let i = 0; i < 5; i++) bars.append(el("i", i < na ? "a" : i < na + nd ? "d" : ""));
      d.append(bars); li.append(d); ul.append(li);
    });

    const box = $("findings"); box.replaceChildren();
    $("n-find").textContent = `（${nFind}件）`;
    if (total > PR_LIMIT) {
      const p = el("p", "fine", `変更が合計${total}行あります。${PR_LIMIT}行を超えるときは、プルリクエストを分けるとレビューしやすくなります。`); p.style.padding = "0 0 8px"; box.append(p);
    }
    if (!nFind) box.append(el("p", "ok", "✓ 気になる行は見つかりませんでした。"));
    ORDER.forEach(k => {
      const hits = F[k]; if (!hits.length) return;
      const m = META[k], d = el("details", "find " + m.sev); d.open = m.sev !== "info" || hits.length <= 3;
      const s = el("summary"); s.append(el("span", "sev", SEV[m.sev]), el("span", "ttl", m.title), el("span", "cnt", `${hits.length}件`));
      d.append(s, el("p", "why", m.why));
      const hl = el("ul", "hits");
      hits.slice(0, 30).forEach(h => {
        const li = el("li"); li.append(el("span", "loc", loc(h)));
        li.append(el("code", "code" + (h.n ? "" : " neutral"), h.t)); hl.append(li);
      });
      if (hits.length > 30) hl.append(el("li", "fine", `ほか${hits.length - 30}件`));
      d.append(hl); box.append(d);
    });

    // checklist
    const items = [];
    ORDER.forEach(k => { if (F[k].length) items.push({ t: META[k].check, from: `${F[k].length}件` }); });
    ["変更の目的と背景がプルリクエストの説明に書かれている", "動作確認の手順と結果が書かれている", "エラーや空のデータのときの動きを確かめた", "名前（変数・関数）が中身を表している", "画面の変更ならスクリーンショットがある"].forEach(t => items.push({ t }));
    const cl = $("check"); cl.replaceChildren();
    items.forEach((it, i) => {
      const li = el("li"), lab = el("label"), cb = el("input"); cb.type = "checkbox"; cb.id = "ck" + i;
      const sp = el("span", "", it.t); if (it.from) sp.append(el("span", "from", it.from));
      lab.append(cb, sp); li.append(lab); cl.append(li);
    });
    last = { items };

    // draft comments
    const out = ["## レビューコメント（下書き）", "", `変更：${files.length}ファイル（+${add} −${del}）`, ""];
    if (!nFind) out.push("ざっと見た範囲では、気になる点はありませんでした。動作確認の結果だけ教えてください。");
    ORDER.forEach(k => {
      const hits = F[k]; if (!hits.length) return;
      out.push(`### ${META[k].title}`);
      if (k === "notest") { out.push(`- ${hits.map(h => "`" + h.f + "`").join("、")}：${META.notest.comment()}`, ""); return; }
      const seen = new Set();
      hits.slice(0, 15).forEach(h => {
        const key = k === "notest" ? h.f : loc(h); if (seen.has(key)) return; seen.add(key);
        out.push(`- \`${loc(h)}\`：${META[k].comment(h)}`);
      });
      if (hits.length > 15) out.push(`- ほか${hits.length - 15}か所あります。`);
      out.push("");
    });
    out.push("以上です。ご確認をお願いします。");
    $("draft").value = out.join("\n");
  }

  async function copy(text, msg) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = el("textarea", "sr"); ta.value = text; document.body.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove();
    }
    $("toast").textContent = ok ? msg : "コピーできませんでした。下書きを選んでコピーしてください。";
    setTimeout(() => { $("toast").textContent = ""; }, 2500);
  }

  $("run").addEventListener("click", () => {
    const txt = $("diff").value;
    const files = parse(txt);
    if (!txt.trim() || !files.length) {
      $("welcome").hidden = false; $("report").hidden = true;
      $("stat-line").textContent = "";
      $("err").textContent = txt.trim() ? "diffとして読めませんでした。「diff --git」や「@@」で始まる行も含めて貼ってください。" : "diffが空です。git diffの出力を貼ってから押してください。";
      $("diff").setAttribute("aria-invalid", "true"); $("diff").focus(); return;
    }
    $("err").textContent = ""; $("diff").removeAttribute("aria-invalid");
    render(files);
    if (matchMedia("(max-width:999px)").matches) $("out-h").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
  });
  $("sample").addEventListener("click", () => { $("diff").value = window.REVIEW_SAMPLE || ""; $("run").click(); });
  $("clear").addEventListener("click", () => { $("diff").value = ""; $("err").textContent = ""; $("welcome").hidden = false; $("report").hidden = true; $("stat-line").textContent = ""; $("diff").focus(); });
  $("copy").addEventListener("click", () => copy($("draft").value, "下書きをコピーしました。"));
  $("copy-check").addEventListener("click", () => {
    if (!last) return;
    const boxes = $("check").querySelectorAll("input");
    copy(last.items.map((it, i) => `- [${boxes[i] && boxes[i].checked ? "x" : " "}] ${it.t}`).join("\n"), "チェックリストをコピーしました。");
  });
})();
