---
title: "一つの改行から始まった惨事"
published: 2026-08-13
description: "SwiftUI Textでは中国語の改行規則を制御できず、NSTextFieldとNSTextViewを比較する小さなspikeを行った。"
tags: [SwiftUI, AppKit, TextKit, macOS]
category: Engineering
draft: false
lang: ja
translationKey: a-line-break-disaster
series: bilikit-development-notes
seriesOrder: 2
---

BiliKitのコメント本文を実装していたとき、一見小さいが実際にはかなり厄介な問題が起きた。中国語の文章がsidebarの中で早めに改行され、行末に目立つ空白が残った。

内容と全体のレイアウトに問題はなかったが、コメント欄の行末が犬にかじられたように不揃いになった。

最初は幅の計算をまた間違えたと思った。親View、padding、layout priority、周辺のコードを一通り確認すると、原因は普通のSwiftUI `Text`にあった。

## `Text`にはこの設定がない

コメント本文は、もともとSwiftUIの1行だけだった。

```swift
Text(comment.message)
```

`Text`には文字単位の改行を指定する公開APIがない。`lineLimit`、`fixedSize`、`layoutPriority`でサイズへの影響は変えられるが、幅がぎりぎりのときにCJKテキストをどこで改行するかは指定できない。

広いViewでは目立ちにくい。狭いsidebarに入ると、不自然な改行が一つあるだけで気になる。`Text`はUIの説明など短い文字列には十分使いやすい。コメントや概要のような長い文章では、改行規則を細かく制御できない点が目立ってくる。開発者コミュニティでも同様の不満はよく見かける。

SwiftUI側のレイアウト調整を続ければ個別の例は回避できる。しかし改行規則そのものは変わらない。そこで、`NSTextField`と`NSTextView`を比較する小さなspikeを作った。

## `NSTextField`ではすぐに足りなくなった

`NSTextField`なら文字単位の改行を直接設定できる。

```swift
textField.cell?.lineBreakMode = .byCharWrapping
```

これで改行はすぐに直った。プレーンテキストだけなら十分だった。

BiliKitのコメント本文にはリンクがあり、今後はカスタム絵文字も入る。`NSTextField`には今回の用途に合うリンククリックのdelegateがない。クリックされた文字を特定するには、別のTextKitレイアウトを用意し、座標と文字位置のhit testを自前で実装する必要があった。

## `NSTextView`を選んだ

`NSTextView`には、文字単位の改行、attributed text、リンクのdelegate、将来attachmentを挿入するための経路がそろっている。

実装では通常のテキストViewとして設定した。

```swift
textView.isEditable = false
textView.isSelectable = true
textView.isVerticallyResizable = true
textView.textContainer?.widthTracksTextView = true
```

改行規則はattributed stringのparagraph styleに設定する。

```swift
let paragraph = NSMutableParagraphStyle()
paragraph.lineBreakMode = .byCharWrapping
```

`NSTextView`自身はスクロールしない。外側のコメント一覧はSwiftUIのままにし、本文の高さはTextKitの`usedRect`から計算する。

リンクは`NSTextViewDelegate`で受け取る。

```swift
func textView(
    _ textView: NSTextView,
    clickedOnLink link: Any,
    at charIndex: Int
) -> Bool
```

描画時にリモートURLを内部tokenへ変換し、コメントmodelのリンク先へ対応付ける。クリック後の処理はアプリ側で一括して扱う。

100件、500件、1000件のコメントを使った一時的な比較も行った。二つのAppKit案に意味のある性能差は出なかったため、後続機能に合わせて`NSTextView`を選んだ。

## この部分だけを置き換える

変更範囲はコメント本文に限定し、`NSViewRepresentable`で`NSTextView`を組み込んだ。アバター、メタデータ、操作、返信一覧、スクロールコンテナは引き続きSwiftUIで構成している。

SwiftUIは、この画面の状態と構造を扱いやすい。読み込み、pagination、返信の折りたたみ、一覧のレイアウトはデータの変化に沿って更新でき、Viewも小さく分けられる。

`Text`は下位の組版処理を隠している。通常の表示では実装量を大きく減らせる。細かな改行規則、文字位置のhit test、rich text attachmentが必要になると、公開APIだけでは制御が足りない。外側のレイアウトを調整しても、下位のテキストシステムの動作は変わらない。

今回の実装で、BiliKit内のSwiftUIとAppKitの境界が明確になった。状態、Viewの組み立て、ページレイアウトはSwiftUIで扱う。テキストレイアウト、hit test、attributed contentはAppKitに任せる。`NSViewRepresentable`で接続することで、変更はコメント本文の内部に収まる。

同じような問題では、まずページレイアウトとネイティブcontrolのどちらに原因があるかを確認する。レイアウトはSwiftUIで扱い、controlの動作は小さなAppKit spikeで確かめてから組み込む。

iOSでは、UIKitを`UIViewRepresentable`経由で使う形が対応する。

リンクは現在の実装に入っている。カスタム絵文字はまだ描画層に入っておらず、今後attachmentとして接続する。
