---
title: Swiftで個人サイトを作る
published: 2026-04-21
description: 簡単だと思っていた……実際にやってみるまでは
tags: [Swift, Raptor, SSG, Web]
category: Engineering
draft: false
lang: ja
translationKey: building-personal-website-in-swift
---

Raptorでこのサイトを作っているとき、記事の日付、ナビゲーション、タグなどに個別のスタイルが必要になりました。テーマの設定を少し足せば済むと思っていたのですが、気づけばフレームワークの内部まで変更していました。しかも最後に分かったのは、機能が足りなかったのではなく、使うべき抽象を間違えていたということでした。

RaptorはSwiftで書かれた静的サイトジェネレーターです。HTMLテンプレートやJSXの代わりに、レイアウトもSwiftで記述します。

```swift
VStack {
    Text("Hello, world!")
    Text("Welcome to my site")
}
```

タイポグラフィや色には、組み込みのテーマ機構を使えます。

```swift
.font(.title1)
.fontSize(36, for: .title1)
```

記述は分かりやすく、型安全です。普段使っているSwiftでサイトを書くのも素直に楽しかったのですが、組み込みの役割だけでは実際のデザインを表現しきれなくなりました。

## 実際のサイトには細かなテキストがある

Raptorのタイポグラフィには、次の役割が用意されています。

- body
- title1 … title6
- codeBlock

しかし、サイトには本文と見出し以外にも、投稿日や著者、ナビゲーション、タグ、カテゴリー、ボタン、リンクといったテキストがあります。

HugoやHexo、通常のHTMLテンプレートなら、classを付けてCSSを書けば終わる話です。

```html
<span class="post-meta">April 20</span>
<a class="nav-label">Archive</a>
```

```css
.post-meta {
  font-size: 12px;
  color: gray;
}
.nav-label {
  font-weight: bold;
}
```

一方、Raptorには次のような組み込みの役割はありません。

```swift
.postMeta
.navLabel
```

そこで最初は、独自のテキストロールを追加しようと考えました。

## Themeを拡張してみる

目指したAPIは次のようなものです。

```swift
Text("April 20").textRole(.postMeta)
```

Theme側でロールごとの設定を書きます。

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

そこからCSSを生成し、

```css
.text-role-post-meta {
  font-size: 12px;
  font-weight: 500;
}
```

最終的なHTMLにclassを付与します。

```html
<p class="text-role-post-meta">April 20</p>
```

フレームワークを調べながら、テーマ設定、CSS生成、レンダリング処理に手を入れました。実装自体は動きました。独自ロールがテーマ機構を通り、ライト・ダークモードに対応し、CSSが自動生成され、HTMLにも反映されるようになりました。

ただし、設計には違和感が残りました。

まず、テキストを表す方法が二つに分かれます。

```swift
.font(.title1)        // built-in
.textRole(.postMeta)  // custom
```

しかも、この二つは責務が同じではありません。Raptorの

```swift
.font(.title1)
```

は、`<h1>`のようなHTMLタグを決めると同時にスタイルも適用します。それに対して、追加した

```swift
.textRole(.navLabel)
```

が変えるのはスタイルだけです。HTMLの構造と見た目は別の関心事なのに、その区別を整理しないまま新しいタイポグラフィAPIを足してしまいました。

結局、コードは次のようになります。

```swift
.tag(.h1)
.textRole(.navLabel)
```

表しているものは、ほぼこれと同じです。

```html
<h1 class="nav-label"></h1>
```

型安全なAPIで複雑さを減らすはずが、手順を増やしてHTMLを作り直しているだけでした。

## すでにあったStyleという答え

ほかの静的サイトジェネレーターも確認しました。たとえばHugoは、この問題をフレームワークの役割として抽象化せず、

```html
<p class="post-meta"></p>
```

と書いて、残りをCSSに任せます。

この比較をきっかけにRaptorの設計とソースコードを読み直すと、役割分担が見えてきました。Themeはタイポグラフィ、色、余白などのグローバルなデザイントークンを定義するものです。「記事メタデータ」のような意味を持つスタイルを、Themeの新しいテキストロールにする必要はありません。

Raptorには、そのための`Style`がすでに用意されていました。

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

コンテンツには次のように適用できます。

```swift
Text("April 20")
    .style(PostMetaStyle())
```

役割としては、

```html
<p class="post-meta">April 20</p>
```

と同じですが、Swiftのまま再利用、合成でき、型安全性も保てます。

さらに`Style`は、ライト・ダークモード、現在のテーマ、コントラスト設定、レイアウト条件などの環境情報を参照できます。意味を持つスタイルをテーマのロールに追加しなくても、環境に応じた見た目を定義できます。

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        if environment.colorScheme == .dark {
            content.foregroundStyle(.gray)
        } else {
            content.foregroundStyle(.secondary)
        }
    }
}
```

見落としていた境界は単純でした。Themeはグローバルなデザイントークンを定義し、`Style`は再利用できる意味的なスタイルをまとめます。欲しかった機能は最初からRaptorにあり、探す場所を間違えていただけでした。
