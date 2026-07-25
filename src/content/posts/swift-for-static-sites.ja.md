---
title: Swiftで静的サイトを作る
published: 2026-05-01
description: SwiftUI風の抽象化とWebネイティブな実装の間で分かったこと
tags: [Swift, SwiftUI, SSG, Web]
category: Engineering
draft: false
lang: ja
translationKey: swift-for-static-sites
---

複雑な見た目のブログテーマをSwift製の静的サイトジェネレーターへ移すなら、どれを選ぶべきか。[Saga](https://github.com/loopwerk/Saga)、[Toucan](https://github.com/toucansites/toucan)、[Publish](https://github.com/JohnSundell/Publish)、[Ignite](https://github.com/twostraws/Ignite)、[Raptor](https://github.com/raptor-build/raptor)を一通り調べ、[Astro](https://github.com/withastro/astro)、[Hexo](https://github.com/hexojs/hexo)、[Hugo](https://github.com/gohugoio/hugo)、[Jekyll](https://github.com/jekyll/jekyll)のようなWebネイティブのツールとも比べてみた。

ソースコードやサンプルを読み、実際に触って分かったのは、機能の数より「SwiftをWebスタックのどこに置くか」のほうが重要だということだった。小さなページでは、SwiftUI風のコンポーネントAPIも、Swiftから普通のHTMLを生成する方法も似て見える。それが独自CSSを多用するテーマになると、両者の違いがはっきり出る。

## UIのランタイムはブラウザ

SwiftUIがiOSで自然に使えるのは、その抽象化がシステムのUIランタイムへ直接つながっているからだ。

```plain
iOS:
System UI runtime
→ SwiftUI Button / VStack / NavigationStack
→ Your Swift code
Web:
Browser runtime (DOM + CSS + JS)
→ HTML <button> / <div> / <article>
→ CSS grid / flex / selectors
→ Your HTML/CSS/JS
```

SwiftUIの`Button`は、アクセシビリティ、フォーカス、アニメーション、入力といったプラットフォームの挙動に結びついている。一方、RaptorやIgniteで宣言したボタンが最終的に生成するものは、

```html
<button class="...">Save</button>
```

とCSSだ。ブラウザは元のSwiftコンポーネントを知らず、受け取ったHTML、CSS、JavaScriptだけを実行する。

宣言的UIが問題なのではない。React、Vue、Astroも宣言的であり、違うのは何を宣言しているか、そしてブラウザ本来のモデルからどれだけ離れているかだ。

| フレームワーク | 宣言するもの                         | プラットフォームとの距離 |
| -------------- | ------------------------------------ | ------------------------ |
| SwiftUI        | ネイティブUIツリー                   | とても近い               |
| React / Vue    | DOM / コンポーネントツリー           | とても近い               |
| Astro          | HTML + Islands                       | とても近い               |
| Saga / Publish | HTML出力ツリー                       | 近い                     |
| Ignite         | Swiftコンポーネント（Bootstrap風）   | 中程度                   |
| Raptor         | SwiftUI風UI + 独自スタイルシステム   | より遠い                 |

SwiftUIはプラットフォームのモデルとよく一致する。ReactはDOMを扱い、AstroはHTMLをコンポーネントの第一級要素として扱う。IgniteとRaptorは、そこからさらに上にSwiftのコンポーネントツリーを置く。簡単なページでは便利だが、デザインの独自性が高くなるほど変換コストが表に出てくる。

## コンポーネントDSLが楽ではなくなる地点

IgniteのようなAPIは、単純なUIなら素早く書ける。

```swift
Text("Hello")
Button("Read More")
Grid {
  Card { ... }
}
```

Bootstrapによってレイアウト、余白、レスポンシブ対応、基本的な視覚階層が最初から用意される。ドキュメント、ポートフォリオ、一般的なブログなど、組み込みの語彙で表現できるサイトにはよく合う。

ところが、既存のビジュアルテーマを移植しようとすると、次のようなCSSが必要になる。

```css
.card::before
.sidebar:has(.active)
grid-template-columns: minmax(0, 1fr) 18rem
position: sticky
backdrop-filter
mask-image
container queries
```

組み込みコンポーネントで表現できなくなると、Swift側も結局は低レベルなHTMLラッパーへ戻る。

```swift
Tag("aside") { ... }
.class("layout-shell__sidebar")
```

CSSは別途書かなければならない。ページの半分がSwiftUI風の語彙、残りがHTMLのラッパーになり、抽象化によって減る作業が少なくなってしまう。

もちろん、この方法が扱いやすい範囲は明確にある。

```plain
Simple sites
Docs
Portfolios
Basic blogs
Bootstrap-like layouts
```

難しくなるのは、AstroやHexoで作られたテーマのように、細かなセレクター、疑似要素、レイアウト規則、ブラウザ固有の挙動に依存する場合だ。これは宣言的UIや各フレームワークの欠陥ではなく、抽象化の適用範囲だと思う。

## Sagaは境界を隠さない

Sagaは別の方針を採る。Swiftが得意な部分をSwiftに任せ、ブラウザ側の関心事はWeb本来の形で残す。

```plain
Swift:
Content model
Pipeline
Generation logic
Type safety

Web:
HTML structure
CSS styling
JavaScript behavior
```

テンプレートは次のようになる。

```swift
article(class: "mx-auto max-w-3xl px-6 py-12") {
  h1(class: "text-4xl font-bold tracking-tight") {
    item.title
  }
  div(class: "prose prose-slate dark:prose-invert") {
    raw(item.body)
  }
}
```

これはSwiftUIをブラウザに再現するものではなく、SwiftでHTMLを生成しているだけだ。役割分担も読み取りやすい。

```plain
Swift-native:
Types, functions, composition

Web-native:
HTML, CSS, browser semantics
```

今回のようなテーマでは、大きなUI抽象化を追加することより、この直接性のほうが役に立つ。

## Tailwindを組み合わせると扱いやすい

Tailwindを使わないSagaのテンプレートは、名前付きクラスを使う従来のHTMLに近い。

```swift
article(class: "post-card") {
  h2(class: "post-card__title") {
    item.title
  }
}
```

Tailwindを使えば、レイアウトとスタイルをHTML生成箇所のすぐそばに置ける。

```swift
article(class: "group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg") {
  h2(class: "text-2xl font-semibold tracking-tight") {
    a(href: post.url) {
      post.title
    }
  }
}
```

CSSの概念を一つずつSwiftのmodifier APIへ置き換える必要がない。Tailwindはutility classで表現したCSSなので、ブラウザ側のモデルも見失わずに済む。

## RaptorとIgniteは向いている仕事が違う

Raptorは一般的なSSGより広い範囲を扱おうとしており、次のようなサイトモデルを持つ。

```plain
Site
Page
PostPage
CategoryPage
Layout
Theme
Style
PostWidget
```

さらにVaporと統合してサーバーサイドレンダリングもできる。Swift中心のコンテンツプラットフォーム、静的・動的ページの混在するサイト、バックエンド統合が必要なプロジェクトなら面白い選択肢になる。

ただし、このサイトモデルだけで複雑なフロントエンドを簡単に表現できるわけではない。UIとスタイルシステムの範囲を超えると、実装は再び、

```plain
Tag + Div + Class + CSS
```

に戻る。この段階では、上位の抽象化がコンテンツ設計やサーバー統合など別の問題を解決しているかどうかを確認したい。フロントエンドの作業量は、もう減っていないからだ。

Igniteはもっと現実的な組み合わせを選んでいる。

```plain
Swift API + Bootstrap
```

小規模サイト、ポートフォリオ、ドキュメントを短時間で作る用途には向いている。一方、独自のビジュアルを追求すると、Bootstrapの構造や見た目を隠すのが次第に難しくなる。

## 複雑なテーマなら今もAstroを選ぶ

Swiftを使うこと自体が要件でなければ、今回のような複雑なビジュアルテーマではAstroが最も安定した選択だと思う。

- HTML、CSS、JavaScriptを第一級の要素として扱える
- コンポーネントがブラウザのプリミティブに近い
- Tailwindを素直に統合できる
- Content Collectionsでコンテンツを構造化できる
- エコシステムが成熟している

SwiftでWebサイトを作れないという意味ではない。Swiftによる抽象化のコストに対して、プロジェクトが必要とする価値を得られるかどうかが重要になる。

今回比べた二つの方向性は、次のように整理できる。

### SwiftUI風のWeb DSL（Raptor / Ignite）

```plain
Swift expresses UI
→ translated into HTML/CSS
```

### Swiftネイティブ生成 + WebネイティブUI（Saga）

```plain
Swift handles logic and structure
HTML/CSS/JS express the UI
```

見た目を細かく作り込むサイトなら、私は後者を選ぶ。型、関数、合成、コンテンツモデル、生成ロジックにはSwiftを使い、UIはHTML、CSS、JavaScriptに任せる。

用途ごとの候補は次のようになった。

```plain
Not using Swift: Astro + Tailwind
Using Swift seriously: Saga + Tailwind
Quick Swift site: Ignite
Exploring Swift Web frameworks: Raptor
```
