// ジムメモの種目データ。1行に1つ：名前|よみ（名前がかなだけなら空）|ほかの呼び方（、区切り）|記録のしかた
// 記録のしかた：w=重さと回数、r=回数だけ（自重）、s=時間（秒）、m=時間（分）と距離。後ろの数字は、はじめて選んだときに入る値（kg・回・秒・分）。
// 「#部位」の行から下が、その部位の種目です。
window.EXERCISES_TXT = String.raw`
#胸
ベンチプレス||ベンチ、バーベルベンチプレス、bench press、BP|w20
インクラインベンチプレス||インクラインベンチ、インクラインプレス、incline bench press|w20
デクラインベンチプレス||デクラインベンチ、デクラインプレス、decline bench press|w20
スミスマシンベンチプレス||スミスベンチ、スミスベンチプレス、smith machine bench press|w20
スミスマシンインクラインプレス||スミスインクライン、スミスインクラインベンチプレス|w20
ダンベルベンチプレス||ダンベルプレス、DBプレス、dumbbell bench press、dumbbell press|w10
インクラインダンベルプレス||インクラインダンベルベンチプレス、incline dumbbell press|w10
ダンベルフライ||dumbbell fly、dumbbell flye|w8
インクラインダンベルフライ||incline dumbbell fly|w8
チェストプレス||マシンチェストプレス、チェストプレスマシン、chest press|w20
ペックフライ||ペックデック、バタフライ、マシンフライ、pec deck、pec fly|w20
ケーブルフライ||ケーブルクロスオーバー、クロスオーバー、cable fly、cable crossover|w10
ダンベルプルオーバー||プルオーバー、pullover|w10
腕立て伏せ|うでたてふせ|プッシュアップ、腕立て、うでたて、push up、pushup|r10
膝つき腕立て伏せ|ひざつきうでたてふせ|膝つきプッシュアップ、ニープッシュアップ、knee push up|r10
デクラインプッシュアップ||足上げ腕立て伏せ、あしあげうでたてふせ、decline push up|r10
インクラインプッシュアップ||incline push up|r10
ディップス||ディップ、チェストディップス、dips|r10

#背中
デッドリフト||デッド、バーベルデッドリフト、deadlift|w40
ラックプル||rack pull|w40
懸垂|けんすい|チンニング、プルアップ、チンアップ、pull up、chin up、chinning|r8
斜め懸垂|ななめけんすい|インバーテッドロウ、inverted row|r10
アシスト懸垂|あしすとけんすい|アシストチンニング、アシストプルアップ、assisted pull up|r10
ラットプルダウン||ラットプル、ラットプルダウンマシン、lat pulldown、lat pull down|w30
ストレートアームプルダウン||ストレートアームラットプルダウン、straight arm pulldown|w10
シーテッドロウ||シーテッドケーブルロウ、ケーブルロウ、seated row、seated cable row|w30
マシンロウ||ロウマシン、machine row|w20
チェストサポーテッドロウ||インクラインダンベルロウ、chest supported row|w10
ベントオーバーロウ||ベントロウ、バーベルロウ、ベントオーバーローイング、bent over row、barbell row|w20
ペンドレイロウ||pendlay row|w20
ワンハンドダンベルロウ||ダンベルロウ、ワンハンドロウ、ワンハンドローイング、one arm dumbbell row、dumbbell row|w10
Tバーロウ|てぃーばーろう|t bar row|w20
シュラッグ||バーベルシュラッグ、ダンベルシュラッグ、shrug|w20
バックエクステンション||ハイパーエクステンション、back extension、hyperextension|r15
スーパーマン||superman|r10
デッドハング||ぶら下がり、ぶらさがり、dead hang|s30

#肩
ショルダープレス||オーバーヘッドプレス、ミリタリープレス、バーベルショルダープレス、OHP、shoulder press、overhead press|w20
ダンベルショルダープレス||DBショルダープレス、dumbbell shoulder press|w8
マシンショルダープレス||ショルダープレスマシン、machine shoulder press|w20
スミスマシンショルダープレス||スミスショルダープレス、smith machine shoulder press|w20
バックプレス||ビハインドネックプレス、behind the neck press|w20
プッシュプレス||push press|w20
アーノルドプレス||arnold press|w8
ランドマインプレス||landmine press|w10
サイドレイズ||ラテラルレイズ、ダンベルサイドレイズ、lateral raise、side raise|w5
ケーブルサイドレイズ||ケーブルラテラルレイズ、cable lateral raise|w5
フロントレイズ||ダンベルフロントレイズ、front raise|w5
リアレイズ||リアデルトレイズ、ベントオーバーラテラルレイズ、rear delt raise、rear raise|w5
リアデルトフライ||リアデルト、リバースフライ、リバースペックフライ、rear delt fly、reverse fly|w15
フェイスプル||face pull|w10
アップライトロウ||upright row|w20
パイクプッシュアップ||pike push up|r10
逆立ち腕立て伏せ|さかだちうでたてふせ|ハンドスタンドプッシュアップ、handstand push up|r5

#腕
アームカール||バーベルカール、arm curl、barbell curl、biceps curl|w20
ダンベルカール||dumbbell curl|w8
ハンマーカール||hammer curl|w8
インクラインダンベルカール||インクラインカール、incline curl|w6
コンセントレーションカール||concentration curl|w6
プリーチャーカール||プリチャーカール、スコットカール、preacher curl|w10
EZバーカール|いーじーばーかーる|EZカール、ez bar curl|w15
ケーブルカール||cable curl|w10
マシンアームカール||マシンカール、アームカールマシン、machine curl|w15
リバースカール||reverse curl|w10
リストカール||wrist curl|w8
トライセプスエクステンション||トライセップスエクステンション、オーバーヘッドエクステンション、フレンチプレス、triceps extension、french press|w8
ケーブルオーバーヘッドエクステンション||ケーブルフレンチプレス、cable overhead extension|w10
ライイングトライセプスエクステンション||スカルクラッシャー、ライイングエクステンション、skull crusher、lying triceps extension|w15
トライセプスプッシュダウン||プッシュダウン、ケーブルプッシュダウン、プレスダウン、triceps pushdown、pushdown|w15
キックバック||ダンベルキックバック、トライセプスキックバック、triceps kickback|w5
ナローベンチプレス||ナローベンチ、クローズグリップベンチプレス、close grip bench press|w20
ベンチディップス||ベンチディップ、リバースディップス、bench dips|r12
ダイヤモンドプッシュアップ||ナロープッシュアップ、diamond push up|r10

#脚
スクワット||バーベルスクワット、バックスクワット、squat、back squat|w20
フロントスクワット||front squat|w20
スミスマシンスクワット||スミススクワット、smith squat、smith machine squat|w20
ハックスクワット||hack squat|w20
ゴブレットスクワット||goblet squat|w10
自重スクワット|じじゅうすくわっと|エアスクワット、ノーマルスクワット、air squat、bodyweight squat|r15
ワイドスクワット||スモウスクワット、相撲スクワット、sumo squat、wide squat|w0
ジャンプスクワット||jump squat|r10
ブルガリアンスクワット||ブルガリアンスプリットスクワット、bulgarian split squat|w0
スプリットスクワット||split squat|w0
シシースクワット||sissy squat|r10
ピストルスクワット||片脚スクワット、かたあしすくわっと、pistol squat|r5
ランジ||フォワードランジ、ダンベルランジ、lunge|w0
ウォーキングランジ||walking lunge|w0
サイドランジ||side lunge|w0
ステップアップ||ボックスステップアップ、step up|w0
ボックスジャンプ||box jump|r10
レッグプレス||leg press|w40
レッグエクステンション||leg extension|w20
レッグカール||ライイングレッグカール、シーテッドレッグカール、leg curl|w20
ルーマニアンデッドリフト||ルーマニアン、RDL、romanian deadlift|w20
シングルレッグデッドリフト||片脚デッドリフト、かたあしでっどりふと、single leg deadlift|w8
スティッフレッグデッドリフト||スティッフレッグド、SLDL、stiff leg deadlift|w20
スモウデッドリフト||スモウデッド、相撲デッドリフト、sumo deadlift|w40
トラップバーデッドリフト||ヘックスバーデッドリフト、trap bar deadlift、hex bar deadlift|w40
グッドモーニング||good morning|w20
ノルディックハムストリングカール||ノルディックカール、ノルディックハム、nordic curl|r5
アダクション||アダクター、ヒップアダクション、内転筋マシン、adductor、hip adduction|w20
カーフレイズ||スタンディングカーフレイズ、かかと上げ、かかとあげ、calf raise|w0
シーテッドカーフレイズ||seated calf raise|w20
ウォールシット||空気椅子、くうきいす、wall sit|s60

#お尻
ヒップスラスト||バーベルヒップスラスト、hip thrust|w20
スミスマシンヒップスラスト||スミスヒップスラスト、smith machine hip thrust|w20
ヒップリフト||グルートブリッジ、hip lift、glute bridge|r15
片脚ヒップリフト|かたあしひっぷりふと|シングルレッグヒップリフト、single leg glute bridge|r10
アブダクション||アブダクター、ヒップアブダクション、外転筋マシン、abductor、hip abduction|w20
ケーブルキックバック||グルートキックバック、cable glute kickback|w10
ドンキーキック||donkey kick|r15
ファイヤーハイドラント||fire hydrant|r15
クラムシェル||clamshell|r15
サイドレッグレイズ||サイドライイングレッグレイズ、side leg raise|r15
ケトルベルスイング||スイング、kettlebell swing|w12

#体幹
プランク||フロントプランク、エルボープランク、plank|s60
サイドプランク||side plank|s30
ホローボディ||ホローボディホールド、hollow body hold|s30
クランチ||crunch|r20
シットアップ||上体起こし、じょうたいおこし、腹筋、ふっきん、sit up、situp|r20
腹筋ローラー|ふっきんろーらー|アブローラー、アブホイール、ab roller、ab wheel|r10
レッグレイズ||ライイングレッグレイズ、leg raise|r15
ハンギングレッグレイズ||hanging leg raise|r10
トゥーズトゥバー||toes to bar|r10
リバースクランチ||reverse crunch|r15
バイシクルクランチ||bicycle crunch|r20
ロシアンツイスト||russian twist|r20
ヒールタッチ||heel touch|r20
Vアップ|ぶいあっぷ|Vシットアップ、v up|r10
ドラゴンフラッグ||dragon flag|r5
マウンテンクライマー||mountain climber|r20
デッドバグ||dead bug|r10
バードドッグ||bird dog|r10
ケーブルクランチ||cable crunch|w20
アブドミナルクランチ||アブクランチ、腹筋マシン、ab crunch machine|w20
サイドベント||サイドベンド、ダンベルサイドベント、side bend|w10
プランクタップ||ショルダータップ、plank shoulder tap|r20
パロフプレス||pallof press|w5

#有酸素
ランニングマシン||トレッドミル、ルームランナー、treadmill|m20
インクラインウォーキング||坂道ウォーキング、さかみちうぉーきんぐ、incline walking|m20
エアロバイク||バイク、フィットネスバイク、スピンバイク、exercise bike、stationary bike|m20
クロストレーナー||エリプティカル、cross trainer、elliptical|m20
ステアクライマー||ステアマスター、ステップマシン、階段マシン、stair climber、stairmaster|m15
ローイングマシン||ローイング、ロウイングマシン、ローイングエルゴ、rowing machine、rower|m10
ランニング||ジョギング、ジョグ、running、jogging|m30
ウォーキング||walking|m30
エアロビクス||エアロビ、aerobics|m30
サイクリング||自転車、じてんしゃ、cycling|m30
水泳|すいえい|スイミング、swimming|m30
縄跳び|なわとび|ロープジャンプ、jump rope|m10
踏み台昇降|ふみだいしょうこう|ステップ運動、step exercise|m15
バーピー||バーピージャンプ、burpee|r10
ジャンピングジャック||jumping jack|r30
`;
