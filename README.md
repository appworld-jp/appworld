# App World

AIで作られたアプリが集まるサイトです。https://appworld-1ug.pages.dev

## アプリを掲載したい方
このリポジトリの [Issues](../../issues/new/choose) から「作品を掲載する」を選んで申請してください。
自動チェックの結果がすぐにコメントで返り、運営が確認したあと公開されます。入力した内容は公開されるので、個人情報は書かないでください。
掲載規約は https://appworld-1ug.pages.dev/about.html#terms にあります。

## 安全のために決めていること
- サイトは静的なページだけです。サーバ、データベース、ログインはありません
- JavaScript は、サイト内から配信する自前のもの（球体の表示、一覧の検索、小さな飾り）だけです。ページの内容は JavaScript なしでも読めます
- 掲載は、公式ストアか https の公式サイトへのリンクだけです。ファイルは配布しません
- 外部のスクリプト、フォント、解析タグを読み込みません。フォントもサイト内から配信します（`site/_headers` の CSP で禁止しています）
- 運営が作ったアプリには「運営」と表示します

## 構成
| パス | 内容 |
|---|---|
| `site/apps/*.json` | 掲載 1 件につき 1 ファイル |
| `site/icons/*.svg` | アプリのアイコン（`"icon": true` の掲載） |
| `site/check_listing.py` | 掲載とアイコンの自動チェック |
| `site/build.py` | サイトを `site/dist/` に作る |
| `site/static/` | CSS、JavaScript、フォント（`dist/` にそのままコピー） |
| `automation/intake.py` | 申請フォームの内容を掲載ファイルにする |
| `automation/x_daily_post.py` | 毎朝の X 投稿 |
| `.github/` | 申請フォームと自動化のワークフロー |
| `lab/` | App World Lab（運営が作ったアプリ。別の Pages プロジェクト） |

## ビルド
```sh
python3 site/build.py            # 手元で確認（site/dist/）
python3 site/build.py --production --site-url https://appworld-1ug.pages.dev \
  --submit-url "https://github.com/appworld-jp/appworld/issues/new?template=listing.yml" \
  --contact-url "https://github.com/appworld-jp/appworld/issues/new"
```

## テスト
```sh
(cd site && python3 -m unittest)
(cd automation && PYTHONPATH=../site python3 -m unittest)
```
