---
title: Swiftでサイトを作り、結局HTMLとCSSに戻った
published: 2026-05-02
description: Raptorに一つのテキストスタイルを足すところから、WebにおけるSwiftの位置を考え直すまで
tags: [Swift, SwiftUI, Raptor, Astro, SSG, Web]
category: Engineering
draft: false
lang: ja
translationKey: swift-for-static-sites
---

4月下旬、個人サイトをSwiftで書き直そうと本気で試していた。

最初はうまくいきそうだった。ブログは基本的にMarkdownをページへ変換するもので、RaptorにはSwiftUIに近いAPIがある。`VStack`、`HStack`、`Text`でページを組み、テーマ、色、タイポグラフィもSwiftにまとめられる。普段からSwiftUIを書いているので、サイトも同じ言語に寄せるのは自然に思えた。

5月初めには、一つのテキストスタイルを追加するためにフレームワーク内部まで変更し、そのあとテーマ全体を再現するspikeも作っていた。それでも最終的なサイトにはAstroを使った。

当時はこの過程を三つの記事に分け、独自テキストロール、Swift製SSGの比較、Raptorの抽象化で困った点をそれぞれ書いた。しかし今読むと、すべて同じ実験の途中経過だった。Swiftでサイトを作れることは最初から分かっている。知りたかったのは、このサイトにとってSwiftのレイヤーがどこから負担になるかだった。

## Raptorを選んだ理由

当時は [Saga](https://github.com/loopwerk/Saga)、[Toucan](https://github.com/toucansites/toucan)、[Publish](https://github.com/JohnSundell/Publish)、[Ignite](https://github.com/twostraws/Ignite)、[Raptor](https://github.com/raptor-build/raptor) を調べた。どれもSwiftから静的サイトを生成するが、スタックのどこにSwiftを置くかが違う。

SagaとPublishは「SwiftでHTMLを生成する」形に近い。Swiftはコンテンツモデル、パイプライン、テンプレートの合成を担当し、出力されるタグやclassもソースから読み取りやすい。

IgniteはSwiftのコンポーネントとBootstrapを提供する。ドキュメント、ポートフォリオ、構造が単純なブログなら、レスポンシブ対応や基本スタイルを素早く揃えられる。

Raptorはさらに大きなモデルを持っている。`Site`、`Page`、`Layout`、`Theme`、`Style`、`PostWidget`などがあり、Vaporとの統合もできる。ページは次のように書ける。

```swift
VStack {
    Text(post.title)
    Text(post.description)
}
.style(PostCardStyle())
```

ここが特に魅力的だった。RaptorはWebにSwiftUI風のオーサリングレイヤーを作ろうとしており、Swiftはテンプレートを埋める以上の役割を持つ。型安全、コンポーネントの合成、環境に応じたテーマは馴染みがあり、最初のページは実際に気持ちよく書けた。

既存サイトに触る前に、まずテーマのspikeを作った。最初に困ったのは小さな点で、投稿日、ナビゲーション、カテゴリー、タグに別々の文字スタイルが必要だった。

## 最初の回り道：Themeにテキストロールを追加する

Raptorに組み込まれていた主なテキストロールは、`body`、`title1`から`title6`、そして`codeBlock`だった。実際のブログには、見出しでも本文でもないメタ情報やナビゲーションの小さな文字もある。

通常のHTMLなら、ほとんど悩む必要はない。

```html
<span class="post-meta">April 20</span>
<a class="nav-label">Archive</a>
```

```css
.post-meta {
  font-size: 12px;
  color: gray;
}
```

これもRaptorの型システムに含めたいと思い、次のAPIを作った。

```swift
Text("April 20").textRole(.postMeta)
```

Theme側で設定する。

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

テーマ設定、CSS生成、レンダリング処理を変更し、最終的には期待どおりのHTMLが出た。

```html
<p class="text-role-post-meta">April 20</p>
```

ダークモードに対応し、CSSも自動生成され、型チェックも通る。実装としては完成していた。

ただ、使い方には違和感が残った。Raptorの既存APIである

```swift
.font(.title1)
```

は、`<h1>`のような意味を持つタグと見た目の両方に関係する。一方、追加した`textRole`が変えるのはスタイルだけだった。コードは少しずつ次の形になった。

```swift
.tag(.h1)
.textRole(.navLabel)
```

結局、表しているものはこれだった。

```html
<h1 class="nav-label"></h1>
```

フレームワークにAPIを足し、タグとclassを遠回りして再現していた。

Raptorの設計を読み直すと、すでに適切な入口があった。`Style`だ。

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

コンテンツへ直接適用できる。

```swift
Text("April 20")
    .style(PostMetaStyle())
```

Themeはフォント、色、余白といったグローバルなデザイントークンを持ち、`Style`は再利用できる局所的なスタイルをまとめる。必要な機能は最初からあり、私が触る層を間違えていた。

この回り道自体はRaptorの問題ではない。むしろ意図された抽象化を見つけたことで、そのまま実験を続けた。判断が変わったのは、テーマ全体を作り始めてからだった。

## 複雑なテーマで作業の形が変わった

Raptorで素直に表現できるレイアウトも多い。カテゴリーを左、時刻を右に置くなら次のように書ける。

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

スタイルシートに散らばったflexの指定より読みやすく、コンポーネント分割も役に立った。

困ったのは、ブラウザでは普通でもSwiftUIのコンポーネントらしく見えない細部だった。

元のテーマでは、見出しの下の短い線を疑似要素で描いていた。

```css
.recent-info::after {
  content: '';
  width: 13%;
  height: 5px;
  background: var(--accent);
}
```

Raptorでは実体のあるコンポーネントにした。

```swift
RecentInfoAccentBar()
```

表示は合うが、文書構造が変わる。CSSの装飾レイヤーが、`::after`を再現するためだけにコンポーネントツリーへ入っていた。

要素をまたぐHoverも同じだった。

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

ブラウザは親要素と子孫要素の状態関係を最初から理解できる。コンポーネントDSLでは、インタラクションを変えるか、関連するスタイルを別に調整する必要があった。小さな負のマージンまで進むと、コードはこうなる。

```swift
.style(Property.marginTop(.px(-21)))
```

書いている言語はSwiftでも、考えていることはCSSのままだった。

デバッグがSwiftUI Previewになるわけでもない。生成されたページはブラウザで動くため、DevToolsでDOMを開き、セレクターとボックスモデルを確認し、その結果を表すSwiftコードへ戻る。

```plain
ページ構造：Swiftコンポーネント
見た目のルール：CSSの概念
最終デバッグ：DOM + Browser DevTools
```

Raptorのコンポーネントで要件を表せる間は変換も素直だった。範囲を超えると、コードは`Tag + Div + Class + CSS`へ戻るか、CSSプロパティを一つずつSwift modifierに書き換える形になる。Webの知識はそのまま必要で、さらにSwiftからHTML/CSSへの対応も維持することになった。

不足している機能をもう一つ追加しても、ここで感じた迷いは消えない。APIは追加できるし、実装も続けられる。しかしテーマの細部を一つ増やすたび、それをSwiftコンポーネント、Raptorの`Style`、生のCSSのどこへ置くか決めなければならない。個人ブログでは、そのコストに見合う利点がなかった。

## 別のSwift製SSGならどうか

Swiftを使う理由によっては、この問題を一部避けられる。

Sagaは境界が分かりやすい。Swiftはコンテンツモデル、生成処理、合成を担当し、HTMLとCSSはWebの形のまま残る。

```swift
article(class: "mx-auto max-w-3xl px-6 py-12") {
    h1(class: "text-4xl font-bold tracking-tight") {
        item.title
    }
    div(class: "prose") {
        raw(item.body)
    }
}
```

CSSが消えたようには見せない。Tailwindを組み合わせても、テンプレートと最終HTMLの関係は追いやすい。Swiftを使うことが明確な要件なら、今でも最初にSagaを検討すると思う。

Igniteは別の用途に合う。Bootstrapで大半のレイアウトを賄えるなら、Swiftから素早く完成したページを作れる。独自の見た目が増えるほど、あとからBootstrapを上書きする作業も増える。

Raptorにもはっきりした用途がある。Swift中心のコンテンツプラットフォーム、Vaporを活用する動的・静的の混在サイト、規則的なUIを持つプロジェクトなら、広いサイトモデルが利点になる。今回作っていたのは、すでに具体的なビジュアルを持つ個人ブログだった。サーバー統合や大きなコンテンツモデルは、当時解決したい問題ではなかった。

そのため、比較の最後に「最良のSwift SSG」が一つ残ったわけではない。Swiftを加えたことで、そのプロジェクトの何が解決されるかを見るほうが実用的だった。「すべてSwiftで書ける」だけでは、私には十分ではなかった。

## それでもAstroを使った理由

空のディレクトリからサイトを作っていたなら、Sagaはもう少し長く候補に残ったと思う。実際のプロジェクトには、すでに目標に近いテーマがあった。

すでにFuwariを見つけていた。AstroとTailwindで作られたブログテーマで、ページ構造、カード、サイドバー、全体の雰囲気が欲しかったものにかなり近かった。レスポンシブレイアウト、ライト・ダークモード、トランジション、Markdown拡張、目次、Pagefind検索、RSSも揃っていた。

Raptorへの移行では、DOM構造とCSSセレクターを作り直し、レスポンシブ対応、テーマ切り替え、アニメーション、検索、目次、コンテンツ処理、ビルドとデプロイも再構築することになる。いくつかのAstroコンポーネントをSwiftに置き換える規模ではない。完成後に得られるのは同じブログで、その途中にSwiftからWebへの対応が一層増える。

Astroでは変更経路が短かった。構造は`.astro`コンポーネント、見た目はCSSとTailwindにあり、インタラクションが必要な場所だけ小さなSvelteコンポーネントやブラウザスクリプトを使える。DevToolsの要素とソースも対応させやすい。Hoverやブレークポイントを直す前に、フレームワークへどのmodifierを追加するか考える必要がない。

その後の開発でも、この選択は合っていた。サイトには中国語、英語、日本語の記事、言語別ルート、Cloudflareでの優先言語リダイレクト、言語別Pagefindインデックス、RSS、Sitemap、シリーズ、アーカイブ、言語切り替えを追加した。これらは主にルーティング、Content Collections、静的生成、ブラウザ動作の問題だった。Astroはその層を隠さないが、問題が起きている場所でそのまま直せる。

Astroを残した理由は単純だった。既存テーマが必要なフロントエンド作業の大半を終えており、私は記事、多言語対応、検索、読む体験に時間を使いたかった。サイトまでSwiftで書くためにテーマ全体を再実装するほどの価値はなかった。

## この実験で残ったもの

SwiftがWebに向いていないと考えたわけではない。Sagaの直接的な方法には今でも惹かれるし、RaptorのThemeとStyleを調べたことで、デザイントークン、意味を持つスタイル、コンポーネントの境界も考え直せた。Swiftバックエンドや共有コンテンツモデルが必要なサイト、構造が規則的なUIなら、また候補に入れると思う。

ただ、この個人サイトについては答えが出た。保守で難しいのはブラウザ上の細部とコンテンツのワークフローで、Astroはその両方に近かった。

spikeはそこで終わり、サイトはAstroに戻った。Raptorに次の抽象化を足す作業も、そこでやめた。
