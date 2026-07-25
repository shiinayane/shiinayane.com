---
title: Raptorでぶつかったジレンマ
published: 2026-05-02
description: SwiftUIのような理想とWebの現実
tags: [Swift, SwiftUI, Raptor, SSG, Web]
category: Engineering
draft: false
lang: ja
translationKey: the-raptor-dilemma
---

[Swiftで静的サイトを作る](/ja/posts/swift-for-static-sites/)では、Astro、Saga、Toucan、Publish、Ignite、Raptorを比較した。その時点での結論は、Swiftはコンテンツのモデル化と生成処理を担当し、UIはHTML、CSS、JavaScriptに任せるのがよさそう、というものだった。

ただし、その判断にはドキュメントやサンプルを読んだ印象も含まれていた。そのあとRaptorで実際にテーマを一つ作ってみると、引っかかっていた点がもっとはっきりした。

ページが単純なうちは、とても書きやすい。ところが独自のブログテーマを細部まで再現し始めると、Swiftでコンポーネントを書き、CSSで考え、最後はブラウザでデバッグすることになった。特定のバグではなく、この距離そのものが問題だった。

## 最初はうまくいった

Raptorは単にMarkdownからHTMLを生成するだけではない。ページ、レイアウト、テーマ、スタイル、コンポーネントをSwift中心で組み立てるモデルを提供している。通常なら次のように書く部分を、

```html
<article class="post-card">
  <h2>Title</h2>
</article>
```

Raptorではこう書ける。

```swift
VStack {
    Text(post.title)
}
.style(PostCardStyle())
```

型安全で、部品を組み合わせやすく、実装言語をSwiftに揃えられる。開発体験もSwiftUIに近い。SwiftUIがAppleプラットフォームにもたらした書きやすさを、Webにも持ち込めそうに見える。

単純なページなら、その期待どおりに動く。

```swift
Text("Hello")
Button("Read more")
```

ランディングページ、ドキュメントサイト、基本的なブログは素早く作れる。UIの大半が次の要素に収まるなら、

```plain
Text + Button + Grid + Card
```

Raptorの抽象化は簡潔で使いやすい。

## 独自テーマで境界が見えた

困ったのは特殊なブラウザ機能ではなく、ブログテーマではよくある細部だった。

### メタ情報の横並び

カテゴリーを左、時刻を右に置くレイアウトは、CSSならそのまま表現できる。

```css
.meta {
  display: flex;
  justify-content: space-between;
}
.meta time {
  float: right;
}
```

Raptorでは、同じ意図をコンポーネントの配置に置き換える。

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

これは問題ない。むしろ見通しがよく、抽象化と目的がきちんと一致している。

### 装飾用の疑似要素

次は見出しの下に置く短いアクセントバーだった。

```css
.recent-info::after {
  content: '';
  width: 13%;
  height: 5px;
  background: var(--accent);
  position: relative;
  bottom: -6px;
}
```

Raptorでは実体のあるコンポーネントにした。

```swift
RecentInfoAccentBar()
```

表示結果は作れるが、意味は変わる。CSSでは既存要素に付随する装飾レイヤーだったものが、コンポーネントツリーでは構造の一部になる。スタイルを再現するために、文書の構造を組み替えることになった。

### 要素をまたぐHover

CSSセレクターは、二つの要素の関係も直接表現できる。

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

Raptorのコンポーネントモデルには、これと同じくらい素直な書き方がなかった。インタラクションを設計し直すか、関係するスタイルを手作業で連携させる必要がある。「親がHoverされたら子孫の見た目を変える」という関係はブラウザなら最初から理解できるのに、Swiftの抽象化を通すと表しにくくなる。

### 負のマージン

よくある細かな位置調整も、結局はCSSの操作だ。

```css
.read-more {
  margin-top: -21px;
}
```

Raptorでも同じ値は指定できる。

```swift
.style(Property.marginTop(.px(-21)))
```

ここまで来ると、CSSから離れたのではなく、CSSをSwiftの構文に訳しているだけだった。

このずれを短くまとめると、次のようになる。

```plain
They think in Swift,
but debug in CSS.

They write components,
but fight layout at the DOM level.

They define styles,
but still rely on raw CSS properties.
```

## 一つのテーマに二つの考え方

カードの構造自体は、Swiftのコンポーネントとしてきれいに書ける。

```swift
PostListItem {
    PostMeta(...)
    PostTitle(...)
    PostExcerpt(...)
    PostReadMore(...)
}
```

共通のスタイルもまとめられる。

```swift
.style(PostCardStyle())
```

しかし見た目を詰めていくと、指定は少しずつ増えていった。

```swift
.style(Property.marginTop(.px(12)))
.style(Property.paddingLeft(.px(8)))
.style(Property.fontSize(.px(14)))
```

生成後のページが動くのはHTML、CSS、JavaScriptの上なので、最終的な正解はブラウザの挙動で決まる。実際の作業は次のように分かれた。

```plain
Structure → Swift
Styling → CSS concepts
Layout debugging → Browser DevTools
```

感覚としてはこうなる。

```plain
Half SwiftUI
Half traditional Web
```

複雑さがなくなったわけではなく、場所が移っただけだ。Swiftでコンポーネントを書き、生成されたDOMを確認し、CSSの知識でレイアウトを直していた。

## Sagaは境界を隠さない

Sagaは別の方向を選んでいる。Swiftで構造を組み立てながら、生成されるHTMLとclassもコードからすぐ読み取れる。

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

役割分担はそのまま見えている。

```plain
Swift → structure + composition
HTML → structure
CSS → styling
```

書いたコードとブラウザで調べるページの間にある翻訳が少ない。見た目を細かく作り込むサイトでは、Webの上にSwiftUI風のレイヤーを置くより、こちらのほうが理解しやすかった。

## Raptorを使う範囲

SwiftでWeb UIを表現すること自体はできる。考えるべきなのは、レンダリング環境からどこまで離れると抽象化の利点が消えるかだ。

汎用的なUIでは、

```plain
Abstraction helps
```

高度にカスタマイズしたUIでは、

```plain
Abstraction fights the platform
```

Raptorが強いのは前者だ。一般的なコンポーネントで構成されたページなら、型安全と合成のしやすさがそのまま利点になる。後者では、セレクター、疑似要素、小さなレイアウト調整が重要になるほど、抽象化が扱いにくくなる。

スタック全体には、やはり二つの層がある。

```plain
Rendering layer → HTML / CSS / JS
Authoring layer → Swift / React / Astro
```

ReactやAstroはレンダリング層との距離が比較的近い。Raptorは意図的にそこから離れることでSwiftUIらしい体験を作っているが、その距離が今回のテーマ制作ではずれとして現れた。

このテーマを作ったあと、自分の中では次の境界に落ち着いた。

```plain
Swift for logic → great
Swift for UI abstraction → situational
HTML/CSS/JS → still the source of truth
```

構造が単純で、汎用コンポーネントが中心のサイトなら、今でもRaptorを選べる。視覚的な細部が多いテーマなら、Sagaのような方法でブラウザ本来のUIモデルを見えるままにしておきたい。
