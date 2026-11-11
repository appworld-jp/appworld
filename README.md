# App World

AIで作られたアプリが集まるサイトです。https://appworld-1ug.pages.dev

## アプリを掲載したい方
このリポジトリの [Issues](../../issues/new/choose) から「作品を掲載する」を選んで申請してください。
自動チェックの結果がすぐにコメントで返り、運営が確認したあと公開されます。入力した内容は公開されるので、個人情報は書かないでください。
掲載規約は https://appworld-1ug.pages.dev/about.html#terms にあります。

## 安全のために決めていること
- サイトは静的なページだけです。サーバ、データベース、ログインはありません
- JavaScript は、サイト内から配信する自前のもの（球体の表示、一覧の検索、小さな飾り、オフライン用の service worker と「ホーム画面に追加」の案内）だけです。ページの内容は JavaScript なしでも読めます
- 掲載は、公式ストアか https の公式サイトへのリンクだけです。ファイルは配布しません
- 外部のスクリプト、フォント、解析タグを読み込みません。フォントもサイト内から配信します（`site/_headers` の CSP で禁止しています）
- 運営が作ったアプリには「運営」と表示します

## 構成
| パス | 内容 |
|---|---|
| `site/apps/*.json` | 掲載 1 件につき 1 ファイル |
| `site/icons/*.svg` | アプリのアイコン（`"icon": true` の掲載） |
| `site/og/*.png` | シェア用の画像（1200×630。`default.png` と掲載ごとの `<id>.png`） |
| `site/check_listing.py` | 掲載とアイコンの自動チェック |
| `site/build.py` | サイトを `site/dist/` に作る |
| `tools/make_og.mjs` | シェア用の画像を作る（掲載を追加したときに手元で実行） |
| `tools/make_site_icons.mjs` | サイト自体のホーム画面用アイコン（`site/static/icon-*.png`、`apple-touch-icon.png`）を `favicon.svg` から作る |
| `site/sw.js` | service worker のひな形（`build.py` が版と事前キャッシュの一覧を入れて `dist/sw.js` に書き出す） |
| `site/static/` | CSS、JavaScript、フォント（`dist/` にそのままコピー） |
| `automation/intake.py` | 申請フォームの内容を掲載ファイルにする |
| `automation/x_daily_post.py` | 毎朝の X 投稿 |
| `.github/` | 申請フォームと自動化のワークフロー |
| `lab/` | App World Lab（運営が作ったアプリ。別の Pages プロジェクト） |
| `tools/make_pwa.mjs` | Lab のアプリをホーム画面に追加でき、オフラインでも使えるようにする |

## ビルド
```sh
python3 site/build.py            # 手元で確認（site/dist/）
python3 site/build.py --production --site-url https://appworld-1ug.pages.dev \
  --submit-url "https://github.com/appworld-jp/appworld/issues/new?template=listing.yml" \
  --contact-url "https://github.com/appworld-jp/appworld/issues/new"
```

## サイトをホーム画面に追加できるようにする
サイトは `manifest.webmanifest` と `sw.js`（`build.py` が毎回作る）でホーム画面に追加でき、一度開いたページはオフラインでも開けます。`sw.js` はネットワーク優先で、版は事前キャッシュするファイルの内容のハッシュです。スマホでは `site/static/site.js` が下にタブを出し、「ホーム画面に追加」の案内を 1 回だけ出します（閉じたことを localStorage に覚えます）。`favicon.svg` を変えたら、`node tools/make_site_icons.mjs` でアイコンを作り直してコミットしてください。

## シェア用の画像
X や LINE でページを共有したときに大きく出る画像（og:image）は `site/og/` にあります。掲載を追加・変更したら、作り直してから一緒にコミットしてください。

```sh
node tools/make_og.mjs            # アイコンのある掲載すべてと default.png
node tools/make_og.mjs atta gomi  # 指定した掲載だけ（default.png も作り直す）
```

Playwright（Chromium）で、サイト内のフォント（Zen Kaku Gothic New）とアイコンから描きます。ビルド（`site/build.py`）は画像をコピーするだけで、画像のない掲載は `default.png` を使います。

## Lab のアプリをホーム画面に追加できるようにする
`lab/<アプリ>/` を追加・変更したら、`lab/index.html` に載せたあとで実行して、一緒にコミットしてください。何度実行しても同じ結果になります（キャッシュ名のハッシュだけが内容に合わせて変わります）。

```sh
node tools/make_pwa.mjs              # lab/index.html に載っていて index.html のあるアプリすべて
node tools/make_pwa.mjs dot gomi     # 指定したアプリだけ
```

アプリごとに `manifest.webmanifest`、`icon-180.png`（iPhone 用）、`icon-192.png`、`icon-512.png`、`icon-maskable-512.png`（`icon.svg` から Playwright で描く）、`sw.js` を作り、`index.html` に manifest・アイコンのタグと `<script src="../pwa.js">` を足します。`lab/pwa.js` は共通の登録スクリプトで、スマホでは開いて 3 秒後に、画面の下に「ホーム画面に追加」の小さな帯を出します（下にスクロールすると隠れ、閉じるか追加すると以後は出しません）。`sw.js` はネットワーク優先で、つながっていれば常に最新を出し、オフラインのときはキャッシュから開きます。`sw.js` を手で直さないこと。

## テスト
```sh
(cd site && python3 -m unittest)
(cd automation && PYTHONPATH=../site python3 -m unittest)
```

## ライセンス
オープンソースではありません。アプリをブラウザで使うのは無料です。コードを複製・改変して使う、公開・配布する、自分のアプリに組み込むには、有料の利用許諾が必要です。詳しくは [LICENSE.md](LICENSE.md) をご覧ください。

## 毎朝の作り直し
`.github/workflows/daily-rebuild.yml` が毎日 0:01（日本時間）に Cloudflare Pages の作り直しを頼みます。公開日が来た掲載は、こうして push なしでもトップに並びます。Cloudflare のデプロイフックの URL を、GitHub の秘密情報 `CF_DEPLOY_HOOK` に保存するまでは何もしません。
