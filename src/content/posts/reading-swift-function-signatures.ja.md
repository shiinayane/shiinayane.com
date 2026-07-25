---
title: Swift の関数シグネチャを読めるようになるまで
published: 2026-05-07
tags: [Swift, Programming]
category: Engineering
draft: false
lang: ja
translationKey: reading-swift-function-signatures
---

Swift を学び始めた頃、Apple の DocC を開いてこんな記述が出てくると、そのまま使用例までスクロールしていた。

```swift
func compactMap<ElementOfResult>(
    _ transform: (Self.Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

率直に言えば、「一つの関数が、どうしてこんなに怖い見た目になるのか」と思っていた。

それまで慣れていた Python の API は、もっと素直に見えた。

```python
map(func, arr)
filter(func, arr)
```

Swift はジェネリクス、`Optional`、関連型、プロトコル制約、`throws`、`rethrows` を一行に詰め込んでくる。私はそれらを読むべき情報ではなく、使用例へたどり着くまでのノイズとして扱っていた。サンプルを真似するだけならそれでもよかったが、知らない API は自力で読めないままだった。

## まず短いシグネチャで考える

長いジェネリック関数より先に、次のような短いものを見ると、型が何を伝えているのかわかりやすい。

```swift
func popLast() -> Element?
```

戻り値が Optional なので、コレクションが空なら `nil` になる。「最後の要素がない」という状態をどう扱うのかが、一行の中に書かれている。

そこで、次の二つを比べてみる。

```swift
removeLast()
```

そして：

```swift
popLast()
```

`removeLast()` はコレクションが空でないことを前提とし、空なら実行時エラーになる。`popLast()` は空の場合を `nil` で扱う。名前も違いを示しているが、Optional の戻り値を見れば、呼び出し側が処理すべき条件までわかる。

## 長い場合は値の流れを追う

この読み方をジェネリック関数に広げるきっかけになったのが `map` だった。

```swift
func map<T>(
    _ transform: (Element) throws -> T
) rethrows -> [T]
```

記号を端から全部理解しようとせず、クロージャの矢印から追う。

- 一つの `Element` がクロージャに入る
- そこから何らかの型 `T` が返る
- `map` は結果を `[T]` にまとめる
- クロージャはエラーを投げてもよい
- `rethrows` なので、そのクロージャが投げた場合に限って `map` もエラーを投げる

`T` の実体は呼び出し方によって変わる。それでも、入力と出力が同じ型である必要はない、とシグネチャだけで判断できる。

よく出てくる部品も、実際にはそれほど多くない。

```swift
(Element) -> T
(Element) -> T?
Sequence<Element>
where T : BinaryInteger
```

上から順に、`Element` を `T` に変える関数、結果がない場合もある関数、要素型が `Element` のシーケンス、`BinaryInteger` への準拠を要求される型 `T` と読める。一つの使用例を暗記するより、この関係を読めるほうが標準ライブラリでもサードパーティ製 API でも使い回しが利く。

## 三つの変換メソッドを型で区別する

以前の私は、`map` を次の形で使うことしか覚えていなかった。

```swift
arr.map { ... }
```

`map`、`compactMap`、`flatMap` の違いが腑に落ちたのは、クロージャとメソッドの戻り値を見比べてからだった。

`compactMap` では、一つの `?` が動作を決めている。

```swift
func compactMap<ElementOfResult>(
    _ transform: (Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

変換クロージャは `ElementOfResult` または `nil` を返せる。一方、最終的な配列の要素は Optional ではない。つまり各入力を変換し、`nil` になった結果を除外する。「Optional のときに使うもの」という覚え方より、こちらのほうが正確だった。

シーケンス向けの `flatMap` オーバーロードはさらに長い。

```swift
func flatMap<SegmentOfResult>(
    _ transform: (Element) throws -> SegmentOfResult
) rethrows -> [SegmentOfResult.Element]
where SegmentOfResult : Sequence
```

`where` 節により、変換後の `SegmentOfResult` 自体が `Sequence` に制約されている。戻り値はシーケンスの配列ではなく、その内側の要素を集めた配列だ。

そのため、次のような入れ子の値を：

```plain
[[1], [2,2], [3,3,3]]
```

次の形にできる：

```plain
[1,2,2,3,3,3]
```

この型の関係がわかると、`flatMap` を「高度な map」のように考えずに済む。このオーバーロードがしているのは、要素をシーケンスへ変換し、それらを一つの配列へ平坦化することだ。

## コンパイル時に引き受けるもの

Swift はしばしば：

```plain
more complexity during compilation
```

を受け入れる代わりに、実行時の：

```plain
more uncertainty at runtime
```

を減らそうとする。完全な交換条件ではないが、その一部はコンパイラで早めに検出したり、型として明示したりできる。

`Optional`、ジェネリクス、プロトコル指向の API、型制約、明示的なエラー処理は、どれもシグネチャを長くする要因であり、最初に私が読むのを嫌がった部分でもある。これだけですべての不正な状態を防げるわけではなく、シグネチャだけで文書が不要になるわけでもない。それでも、入力、出力、失敗の扱い、型同士の関係は、コードを実行する前からかなり読み取れる。

知らない型に出会えば、今でも使用例は開く。ただし、まずシグネチャから動作を予想し、その理解が合っているかを例で確かめるようになった。
