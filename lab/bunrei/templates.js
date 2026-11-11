// メールの文例。{key} は入力した値（空なら【項目名】）、{{#key}}…{{/key}} は入力があるときだけ、{{^key}}…{{/key}} は空のときだけ入る。
// tones: polite（ていねい）/ normal（ふつう）/ internal（社内向け）/ casual（親しい人へ）
window.TONES = {
  polite: { name: "丁寧", desc: "社外の方・目上の方へ" },
  normal: { name: "普通", desc: "やりとりの多い取引先・知人へ" },
  internal: { name: "社内向け", desc: "同じ会社の人へ" },
  casual: { name: "親しい人へ", desc: "家族・友達へ" }
};

window.TEMPLATES = [
  { id: "orei", name: "打ち合わせのお礼", group: "お礼・お詫び", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "date", label: "いつ", ph: "本日", chips: ["本日", "昨日", "先日"] },
      { k: "topic", label: "何の打ち合わせ", ph: "新サービスのご提案" },
      { k: "extra", label: "一言（任意）", ph: "具体的なお話をうかがえて、進め方がはっきりしました。", type: "area", opt: true },
      { k: "next", label: "今後の予定（任意）", ph: "来週中にお見積もりをお送りいたします。", type: "area", opt: true }
    ],
    subject: {
      polite: ["{date}のお打ち合わせのお礼", "【お礼】{topic}のお打ち合わせについて"],
      normal: ["{date}の打ち合わせのお礼", "{topic}の件、ありがとうございました"],
      internal: ["{date}の打ち合わせのお礼"]
    },
    body: {
      polite: "{date}はお忙しいところ、貴重なお時間をいただき誠にありがとうございました。\n{topic}について直接お話しする機会をいただき、大変ありがたく存じます。\n{{#extra}}{extra}\n{{/extra}}{{#next}}\n今後につきましては、{next}\n{{/next}}",
      normal: "{date}はお時間をいただき、ありがとうございました。\n{topic}について直接お話しでき、とても有意義な時間になりました。\n{{#extra}}{extra}\n{{/extra}}{{#next}}\n今後は、{next}\n{{/next}}",
      internal: "{date}は打ち合わせに時間をとっていただき、ありがとうございました。\n{topic}について、方向性をすり合わせられてよかったです。\n{{#extra}}{extra}\n{{/extra}}{{#next}}\n次は、{next}\n{{/next}}"
    },
    close: { polite: "今後ともどうぞよろしくお願い申し上げます。" } },

  { id: "owabi", name: "お詫び（ミス・遅れ）", group: "お礼・お詫び", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "what", label: "何についてのお詫び", ph: "請求書の金額の誤り", chips: ["納品の遅れ", "ご連絡の遅れ", "請求書の金額の誤り"] },
      { k: "cause", label: "原因（任意）", ph: "確認不足", opt: true },
      { k: "fix", label: "どう対応するか", ph: "正しい請求書を、本日あらためてお送りいたします。", type: "area" },
      { k: "prevent", label: "今後の対策（任意）", ph: "送る前に二人で確認する", opt: true }
    ],
    subject: {
      polite: ["{what}についてのお詫び", "【お詫び】{what}について"],
      normal: ["{what}についてのお詫び"],
      internal: ["{what}のお詫び"]
    },
    body: {
      polite: "このたびは{what}により、ご迷惑をおかけしましたことを深くお詫び申し上げます。\n{{#cause}}原因は、私どもの{cause}によるものです。\n{{/cause}}{fix}\n{{#prevent}}今後は{prevent}など、再発防止に努めてまいります。\n{{/prevent}}",
      normal: "このたびは{what}により、ご迷惑をおかけして申し訳ございません。\n{{#cause}}原因は、こちらの{cause}です。\n{{/cause}}{fix}\n{{#prevent}}今後は{prevent}など、同じことが起きないよう気を付けてまいります。\n{{/prevent}}",
      internal: "{what}の件で、ご迷惑をおかけして申し訳ありません。\n{{#cause}}原因は、私の{cause}です。\n{{/cause}}{fix}\n{{#prevent}}今後は{prevent}ようにします。\n{{/prevent}}"
    },
    close: {
      polite: "本来であれば直接お詫びに伺うべきところ、まずはメールにてご連絡いたしました。\nこのたびは誠に申し訳ございませんでした。",
      normal: "このたびは申し訳ございませんでした。\n今後ともよろしくお願いいたします。",
      internal: "お手数をおかけしますが、よろしくお願いします。"
    } },

  { id: "okurimono", name: "贈り物のお礼", group: "お礼・お詫び", tones: ["polite", "normal", "casual"],
    fields: [
      { k: "occasion", label: "何として", ph: "お歳暮", chips: ["お歳暮", "お中元", "お祝い", "お土産"] },
      { k: "gift", label: "いただいた物", ph: "みかん" },
      { k: "impression", label: "感想（任意）", ph: "甘くてみずみずしく、家族みんなでおいしくいただいています。", type: "area", opt: true }
    ],
    subject: {
      polite: ["{occasion}の御礼"],
      normal: ["{occasion}のお礼"],
      casual: ["ありがとう！"]
    },
    body: {
      polite: "このたびは{occasion}に{gift}をお送りいただき、誠にありがとうございました。\n{{#impression}}{impression}\n{{/impression}}いつもお心にかけていただき、心より感謝申し上げます。\n{seasonP}",
      normal: "このたびは{occasion}に{gift}を送っていただき、ありがとうございました。\n{{#impression}}{impression}\n{{/impression}}いつもお気遣いいただき、本当にうれしいです。\n{seasonN}",
      casual: "{gift}、届いたよ！ 本当にありがとう。\n{{#impression}}{impression}\n{{/impression}}気を遣ってくれてありがとうね。\n{seasonC}"
    },
    close: { polite: "略儀ながら、メールにて御礼申し上げます。", normal: "取り急ぎ、お礼まで。", casual: "" } },

  { id: "irai", name: "お願い（依頼）", group: "お願い・確認", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "what", label: "お願いしたいこと", ph: "先日の会議資料の送付", chips: ["資料の送付", "内容のご確認", "お見積もりの作成"] },
      { k: "why", label: "理由（任意）", ph: "社内で共有したい", opt: true },
      { k: "deadline", label: "期限（任意）", ph: "11月20日（木）", opt: true },
      { k: "detail", label: "補足（任意）", ph: "PDFでお送りいただけますと助かります。", type: "area", opt: true }
    ],
    subject: {
      polite: ["{what}のお願い"],
      normal: ["{what}のお願い"],
      internal: ["{what}のお願い"]
    },
    body: {
      polite: "{what}をお願いしたく、ご連絡いたしました。\n{{#why}}{why}ため、{{/why}}お忙しいところ恐縮ですが、{{#deadline}}{deadline}までに{{/deadline}}ご対応いただけますでしょうか。\n{{#detail}}{detail}\n{{/detail}}\nご不明な点がございましたら、お気軽にお問い合わせください。",
      normal: "{what}をお願いしたく、ご連絡しました。\n{{#why}}{why}ので、{{/why}}{{#deadline}}{deadline}までに{{/deadline}}ご対応いただけると助かります。\n{{#detail}}{detail}\n{{/detail}}\n分からない点があれば、お気軽にお聞きください。",
      internal: "{what}をお願いできますか。\n{{#why}}{why}ので、{{/why}}{{#deadline}}{deadline}までに{{/deadline}}対応していただけると助かります。\n{{#detail}}{detail}\n{{/detail}}"
    } },

  { id: "saisoku", name: "催促（返事・提出物）", group: "お願い・確認", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "sentDate", label: "いつお願いしたか", ph: "11月5日" },
      { k: "thing", label: "何を", ph: "お見積書の送付", chips: ["お見積書の送付", "資料のご確認", "日程のご回答"] },
      { k: "deadline", label: "いつまでに欲しいか（任意）", ph: "11月14日（金）", opt: true },
      { k: "reason", label: "急ぐ理由（任意）", ph: "社内の会議で使う", opt: true }
    ],
    subject: {
      polite: ["【ご確認】{thing}の件", "{sentDate}にお願いした{thing}について"],
      normal: ["{thing}の件"],
      internal: ["{thing}の件"]
    },
    body: {
      polite: "{sentDate}にお願いしておりました{thing}の件につきまして、その後いかがでしょうか。\n{{#deadline}}{{#reason}}{reason}ため、{{/reason}}恐れ入りますが、{deadline}までにご対応いただけますと幸いです。\n{{/deadline}}{{^deadline}}お忙しいところ恐れ入りますが、ご確認いただけますと幸いです。\n{{/deadline}}\nなお、本メールと行き違いでご対応いただいている場合は、ご容赦ください。",
      normal: "{sentDate}にお願いした{thing}の件、その後いかがでしょうか。\n{{#deadline}}{{#reason}}{reason}ため、{{/reason}}{deadline}までにご対応いただけると助かります。\n{{/deadline}}{{^deadline}}お忙しいところすみませんが、ご確認いただけると助かります。\n{{/deadline}}\n行き違いでしたら、申し訳ありません。",
      internal: "{sentDate}にお願いした{thing}の件、進み具合はいかがでしょうか。\n{{#deadline}}{{#reason}}{reason}ため、{{/reason}}{deadline}までにお願いできると助かります。\n{{/deadline}}\n行き違いでしたら、すみません。"
    } },

  { id: "nyukin", name: "入金の確認", group: "お願い・確認", tones: ["polite", "normal"],
    fields: [
      { k: "invDate", label: "請求書を送った日", ph: "10月31日" },
      { k: "invNo", label: "請求書の番号（任意）", ph: "No.2026-118", opt: true },
      { k: "amount", label: "請求金額", ph: "55,000円（税込）" },
      { k: "due", label: "支払い期限", ph: "11月10日" }
    ],
    subject: {
      polite: ["【ご確認】{invDate}付の請求書について", "ご入金の確認のお願い"],
      normal: ["{invDate}付の請求書の件"]
    },
    body: {
      polite: "{invDate}にお送りいたしました請求書{{#invNo}}（{invNo}）{{/invNo}}につきまして、ご確認をお願いしたくご連絡いたしました。\nお支払い期限の{due}を過ぎておりますが、本日時点でご入金を確認できておりません。\n\n請求金額：{amount}\n\nお手数ですが、ご確認いただけますでしょうか。\nなお、本メールと行き違いでお手続きいただいている場合は、ご容赦ください。",
      normal: "{invDate}にお送りした請求書{{#invNo}}（{invNo}）{{/invNo}}の件でご連絡しました。\nお支払い期限の{due}を過ぎていますが、まだご入金を確認できておりません。\n\n請求金額：{amount}\n\nお手数ですが、ご確認いただけますか。\n行き違いでしたら、申し訳ありません。"
    } },

  { id: "nittei", name: "日程調整（候補を送る）", group: "お願い・確認", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "purpose", label: "何の打ち合わせ", ph: "新サービスのご説明" },
      { k: "cands", label: "候補日（1行に1つ）", ph: "11月18日（火）10:00〜12:00\n11月19日（水）14:00〜17:00\n11月21日（金）終日", type: "lines" },
      { k: "duration", label: "所要時間（任意）", ph: "1時間ほど", opt: true },
      { k: "place", label: "場所・方法（任意）", ph: "オンライン（Zoom）", opt: true, chips: ["オンライン", "貴社に伺います", "弊社にお越しください"] },
      { k: "replyBy", label: "いつまでに返事が欲しいか（任意）", ph: "11月14日（金）", opt: true }
    ],
    subject: {
      polite: ["{purpose}のお打ち合わせ日程のご相談", "【日程調整】{purpose}の件"],
      normal: ["{purpose}の打ち合わせ日程について"],
      internal: ["{purpose}の打ち合わせ日程について"]
    },
    body: {
      polite: "{purpose}のお打ち合わせについて、日程をご相談したくご連絡いたしました。\n下記の候補のうち、ご都合のよい日時をお知らせいただけますでしょうか。\n\n■候補日\n{cands}\n\n{{#duration}}所要時間：{duration}\n{{/duration}}{{#place}}場所：{place}\n{{/place}}\nいずれも難しい場合は、ご都合のよい日時をいくつかお知らせいただけますと幸いです。\n{{#replyBy}}恐れ入りますが、{replyBy}までにお返事をいただけますでしょうか。\n{{/replyBy}}",
      normal: "{purpose}の打ち合わせについて、日程をご相談させてください。\n下記のうち、ご都合のよい日時を教えていただけますか。\n\n■候補日\n{cands}\n\n{{#duration}}所要時間：{duration}\n{{/duration}}{{#place}}場所：{place}\n{{/place}}\nどれも難しければ、ご都合のよい日をお知らせください。\n{{#replyBy}}{replyBy}までにお返事いただけると助かります。\n{{/replyBy}}",
      internal: "{purpose}の打ち合わせの日程を決めたいので、下記から都合のよい時間を教えてください。\n\n■候補日\n{cands}\n\n{{#duration}}所要時間：{duration}\n{{/duration}}{{#place}}場所：{place}\n{{/place}}\nどれも難しければ、空いている時間を教えてください。\n{{#replyBy}}{replyBy}までに返信をもらえると助かります。\n{{/replyBy}}"
    } },

  { id: "toiawase", name: "問い合わせ", group: "お願い・確認", tones: ["polite", "normal", "internal"], first: true, toDefault: "ご担当者",
    fields: [
      { k: "about", label: "何について", ph: "法人向けプラン" },
      { k: "how", label: "知ったきっかけ（任意）", ph: "貴社のホームページ", opt: true, tones: ["polite", "normal"] },
      { k: "qs", label: "聞きたいこと（1行に1つ）", ph: "10名で使う場合の料金\n請求書払いができるか\n申し込みから使えるまでの期間", type: "lines" },
      { k: "replyBy", label: "いつまでに返事が欲しいか（任意）", ph: "11月20日", opt: true }
    ],
    subject: {
      polite: ["{about}についてのお問い合わせ"],
      normal: ["{about}についてのお問い合わせ"],
      internal: ["{about}について質問です"]
    },
    body: {
      polite: "{{#how}}{how}を拝見し、{{/how}}{about}について伺いたいことがあり、ご連絡いたしました。\n\n{qs}\n\n{{#replyBy}}恐れ入りますが、{replyBy}ごろまでにご回答いただけますと幸いです。\n{{/replyBy}}{{^replyBy}}お忙しいところ恐れ入りますが、ご回答いただけますと幸いです。\n{{/replyBy}}",
      normal: "{{#how}}{how}を見て、{{/how}}{about}について教えていただきたいことがあり、ご連絡しました。\n\n{qs}\n\n{{#replyBy}}{replyBy}ごろまでにお返事いただけると助かります。\n{{/replyBy}}{{^replyBy}}お手数ですが、ご回答いただけると助かります。\n{{/replyBy}}",
      internal: "{about}について教えていただきたいことがあり、ご連絡しました。\n\n{qs}\n\n{{#replyBy}}{replyBy}ごろまでに教えていただけると助かります。\n{{/replyBy}}{{^replyBy}}お手すきのときに教えていただけると助かります。\n{{/replyBy}}"
    } },

  { id: "kotowari", name: "お断り", group: "お返事", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "what", label: "何を断るか", ph: "展示会への出展のご案内", chips: ["お見積もり", "ご提案", "お誘い"] },
      { k: "reason", label: "理由（「〜ため」「〜ず」で。任意）", ph: "今期は予算の都合がつかず", opt: true },
      { k: "alt", label: "代わりの一言（任意）", ph: "来年度にあらためてご相談させてください。", type: "area", opt: true }
    ],
    subject: {
      polite: ["{what}について（お返事）", "{what}の件"],
      normal: ["{what}の件"],
      internal: ["{what}の件"]
    },
    body: {
      polite: "このたびは{what}をいただき、誠にありがとうございます。\n社内で慎重に検討いたしましたが、{{#reason}}{reason}、{{/reason}}誠に恐縮ながら、今回は見送らせていただくことになりました。\n{{#alt}}{alt}\n{{/alt}}せっかくお声がけいただきましたのに、ご期待に沿えず申し訳ございません。",
      normal: "このたびは{what}をいただき、ありがとうございます。\n検討しましたが、{{#reason}}{reason}、{{/reason}}今回は見送らせていただきます。\n{{#alt}}{alt}\n{{/alt}}せっかくお声がけいただいたのに、申し訳ありません。",
      internal: "{what}の件、声をかけていただきありがとうございます。\n検討しましたが、{{#reason}}{reason}、{{/reason}}今回は見送らせてください。\n{{#alt}}{alt}\n{{/alt}}せっかく声をかけていただいたのに、申し訳ありません。"
    },
    close: { polite: "今後とも変わらぬお付き合いのほど、よろしくお願い申し上げます。", normal: "またの機会がありましたら、よろしくお願いいたします。", internal: "また機会があれば、よろしくお願いします。" } },

  { id: "taishoku", name: "退職のあいさつ", group: "あいさつ", tones: ["polite", "normal", "internal"], to: { internal: "皆さま" },
    fields: [
      { k: "lastDay", label: "最終出社日", ph: "11月28日" },
      { k: "successor", label: "後任（任意）", ph: "同じ部署の佐藤", opt: true },
      { k: "memory", label: "一言（任意）", ph: "入社以来、温かくご指導いただいたことは忘れません。", type: "area", opt: true }
    ],
    subject: {
      polite: ["退職のごあいさつ（{{#myCompany}}{myCompany} {{/myCompany}}{myName}）"],
      normal: ["退職のごあいさつ（{myName}）"],
      internal: ["退職のごあいさつ（{myName}）"]
    },
    body: {
      polite: "私事で恐縮ですが、{lastDay}をもちまして{myCompanyOr}を退職することになりました。\n在職中は大変お世話になり、心より御礼申し上げます。\n{{#memory}}{memory}\n{{/memory}}{{#successor}}今後の業務は{successor}が引き継ぎます。後日あらためて後任からご連絡いたしますので、変わらぬご指導のほど、よろしくお願い申し上げます。\n{{/successor}}\n本来であれば直接ごあいさつに伺うべきところ、メールでのごあいさつとなりましたことをお詫び申し上げます。\n末筆ながら、貴社のますますのご発展と、{toSama}のご健勝を心よりお祈り申し上げます。",
      normal: "私事ですが、{lastDay}で{myCompanyOr}を退職することになりました。\n在職中は大変お世話になり、本当にありがとうございました。\n{{#memory}}{memory}\n{{/memory}}{{#successor}}今後は{successor}が担当しますので、引き続きよろしくお願いいたします。\n{{/successor}}\nメールでのごあいさつとなり、失礼いたします。\n{toSama}のますますのご活躍をお祈りしております。",
      internal: "私事で恐縮ですが、{lastDay}をもって退職することになりました。\n{{#memory}}{memory}\n{{/memory}}在職中は大変お世話になり、本当にありがとうございました。\n{{#successor}}担当していた業務は、{successor}さんに引き継ぎます。\n{{/successor}}\n直接ごあいさつできなかった方には、メールでのごあいさつとなり失礼いたします。\n皆さまのますますのご活躍をお祈りしています。"
    },
    close: { polite: "", normal: "", internal: "" } },

  { id: "hikitsugi", name: "引き継ぎ・担当変更", group: "あいさつ", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "reason", label: "変わる理由", ph: "社内の人事異動", chips: ["人事異動", "退職", "担当地域の変更"], tones: ["polite", "normal"] },
      { k: "date", label: "いつから", ph: "12月1日" },
      { k: "successor", label: "後任の名前", ph: "佐藤 花子" },
      { k: "contact", label: "後任の連絡先（任意）", ph: "電話：03-1234-5678\nメール：sato@example.co.jp", type: "area", opt: true, tones: ["polite", "normal"] },
      { k: "task", label: "引き継ぐ業務", ph: "A社の請求処理", tones: ["internal"] },
      { k: "notes", label: "引き継ぎ事項（1行に1つ）", ph: "毎月25日までに請求書を送る\n先方の窓口は経理部の田中さん\n過去のやりとりは共有フォルダにあります", type: "lines", tones: ["internal"] },
      { k: "place", label: "資料の場所（任意）", ph: "共有フォルダの「A社」", opt: true, tones: ["internal"] }
    ],
    subject: {
      polite: ["担当者変更のお知らせ", "【ご案内】{date}からの担当者について"],
      normal: ["担当者変更のお知らせ"],
      internal: ["{task}の引き継ぎについて"]
    },
    body: {
      polite: "このたび、{reason}に伴い、{date}より貴社の担当を{successor}に引き継ぐことになりました。\nこれまで格別のご配慮をいただき、心より御礼申し上げます。\n引き継ぎは責任をもって進めてまいりますので、ご安心いただけますと幸いです。\n{{#contact}}\n{successor}の連絡先は次のとおりです。\n{contact}\n{{/contact}}\n後日あらためて、{successor}よりご連絡いたします。",
      normal: "{reason}のため、{date}から貴社の担当が{successor}に代わることになりました。\nこれまで大変お世話になり、ありがとうございました。\nしっかり引き継ぎをしておりますので、ご安心ください。\n{{#contact}}\n{successor}の連絡先は次のとおりです。\n{contact}\n{{/contact}}\n近いうちに{successor}からもご連絡いたします。",
      internal: "{date}から、{task}を{successor}さんに引き継ぎます。\n主な引き継ぎ事項は次のとおりです。\n\n{notes}\n\n{{#place}}資料は{place}にまとめてあります。\n{{/place}}分からないことがあれば、遠慮なく聞いてください。"
    },
    close: { polite: "今後とも変わらぬご愛顧のほど、よろしくお願い申し上げます。", normal: "今後ともよろしくお願いいたします。" } },

  { id: "nenmatsu", name: "年末のあいさつ", group: "あいさつ", tones: ["polite", "normal", "internal"],
    fields: [
      { k: "thanks", label: "今年の一言（任意）", ph: "今年は新サービスの立ち上げで、大変お世話になりました。", type: "area", opt: true },
      { k: "offFrom", label: "休みの初日", ph: "12月27日（土）" },
      { k: "offTo", label: "休みの最終日", ph: "1月4日（日）" },
      { k: "reopen", label: "仕事始め（任意）", ph: "1月5日（月）", opt: true }
    ],
    subject: {
      polite: ["年末のごあいさつと休業期間のお知らせ", "年末年始休業のお知らせ"],
      normal: ["年末のごあいさつ"],
      internal: ["年末のごあいさつ"]
    },
    body: {
      polite: "本年も格別のお引き立てを賜り、誠にありがとうございました。\n{{#thanks}}{thanks}\n{{/thanks}}\n誠に勝手ながら、弊社は下記の期間を年末年始休業とさせていただきます。\n\n休業期間：{offFrom}〜{offTo}\n\n{{#reopen}}休業中にいただいたご連絡には、{reopen}以降に順次お返事いたします。\n{{/reopen}}\n来年も変わらぬご愛顧を賜りますよう、よろしくお願い申し上げます。\nどうぞよいお年をお迎えください。",
      normal: "今年も大変お世話になり、ありがとうございました。\n{{#thanks}}{thanks}\n{{/thanks}}\n年末年始は、{offFrom}から{offTo}までお休みをいただきます。\n{{#reopen}}お休み中のご連絡には、{reopen}以降にお返事いたします。\n{{/reopen}}\n来年もどうぞよろしくお願いいたします。\nよいお年をお迎えください。",
      internal: "今年一年、大変お世話になりました。\n{{#thanks}}{thanks}\n{{/thanks}}\n{offFrom}から{offTo}まで休みをいただきます。\n{{#reopen}}{reopen}から出社します。\n{{/reopen}}\n来年もよろしくお願いします。よいお年をお迎えください。"
    },
    close: { polite: "", normal: "", internal: "" } },

  { id: "nenshi", name: "年始のあいさつ", group: "あいさつ", tones: ["polite", "normal", "internal"],
    open: { polite: "", normal: "", internal: "" },
    fields: [
      { k: "start", label: "営業開始日（任意）", ph: "1月5日（月）", opt: true, tones: ["polite", "normal"] },
      { k: "word", label: "今年の一言（任意）", ph: "本年も皆さまのお役に立てるよう努めてまいります。", type: "area", opt: true }
    ],
    subject: {
      polite: ["新年のごあいさつ{{#myCompany}}（{myCompany}）{{/myCompany}}"],
      normal: ["新年のごあいさつ"],
      internal: ["新年のごあいさつ"]
    },
    body: {
      polite: "謹んで新年のお慶びを申し上げます。\n旧年中は格別のお引き立てを賜り、厚く御礼申し上げます。\n{{#start}}弊社は{start}より通常どおり営業しております。\n{{/start}}{{#word}}{word}\n{{/word}}\n本年も変わらぬご愛顧のほど、よろしくお願い申し上げます。",
      normal: "あけましておめでとうございます。\n昨年は大変お世話になり、ありがとうございました。\n{{#start}}{start}から通常どおり営業しております。\n{{/start}}{{#word}}{word}\n{{/word}}\n本年もどうぞよろしくお願いいたします。",
      internal: "あけましておめでとうございます。\n昨年はいろいろとお世話になり、ありがとうございました。\n{{#word}}{word}\n{{/word}}\n今年もよろしくお願いします。"
    },
    close: { polite: "", normal: "", internal: "" } },

  { id: "yasumi", name: "休みの連絡（社内）", group: "社内", tones: ["internal"],
    fields: [
      { k: "day", label: "いつ", ph: "本日", chips: ["本日", "明日"] },
      { k: "reason", label: "理由", ph: "体調不良", chips: ["体調不良", "子どもの発熱", "通院", "私用"] },
      { k: "urgent", label: "急ぎの仕事の対応（任意）", ph: "A社への見積もりの送付は、佐藤さんにお願いしてあります。", type: "area", opt: true },
      { k: "reach", label: "連絡がつくか（任意）", ph: "午後は電話に出られます。", opt: true }
    ],
    subject: { internal: ["【休みの連絡】{day}（{myName}）", "{day}のお休みについて"] },
    body: { internal: "{reason}のため、{day}はお休みをいただきたく、ご連絡しました。\n{{#urgent}}{urgent}\n{{/urgent}}{{#reach}}{reach}\n{{/reach}}" },
    close: { internal: "ご迷惑をおかけしますが、よろしくお願いいたします。" } }
];

// 季節のひとこと（月ごと）
window.SEASON = {
  P: ["寒い日が続きますので、どうぞご自愛ください。", "寒い日が続きますので、どうぞご自愛ください。", "季節の変わり目ですので、どうぞご自愛ください。", "季節の変わり目ですので、どうぞご自愛ください。", "季節の変わり目ですので、どうぞご自愛ください。", "梅雨の時期ですので、どうぞご自愛ください。", "暑い日が続きますので、どうぞご自愛ください。", "暑い日が続きますので、どうぞご自愛ください。", "まだ暑さが残りますので、どうぞご自愛ください。", "朝晩冷え込むようになりましたので、どうぞご自愛ください。", "朝晩冷え込むようになりましたので、どうぞご自愛ください。", "寒さが厳しくなってまいりましたので、どうぞご自愛ください。"],
  N: ["寒い日が続きますので、お体に気を付けてお過ごしください。", "寒い日が続きますので、お体に気を付けてお過ごしください。", "季節の変わり目ですので、お体に気を付けてお過ごしください。", "季節の変わり目ですので、お体に気を付けてお過ごしください。", "季節の変わり目ですので、お体に気を付けてお過ごしください。", "じめじめした日が続きますので、お体に気を付けてお過ごしください。", "暑い日が続きますので、お体に気を付けてお過ごしください。", "暑い日が続きますので、お体に気を付けてお過ごしください。", "まだ暑い日もありますので、お体に気を付けてお過ごしください。", "朝晩冷えるようになりましたので、お体に気を付けてお過ごしください。", "朝晩冷えるようになりましたので、お体に気を付けてお過ごしください。", "寒くなってきましたので、お体に気を付けてお過ごしください。"],
  C: ["寒いから、体に気を付けてね。", "寒いから、体に気を付けてね。", "季節の変わり目だから、体に気を付けてね。", "季節の変わり目だから、体に気を付けてね。", "季節の変わり目だから、体に気を付けてね。", "じめじめするけど、体に気を付けてね。", "暑いから、体に気を付けてね。", "暑いから、体に気を付けてね。", "まだ暑いから、体に気を付けてね。", "朝晩冷えるから、体に気を付けてね。", "朝晩冷えるから、体に気を付けてね。", "寒くなってきたから、体に気を付けてね。"]
};
