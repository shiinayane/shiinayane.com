---
title: "swift-format 全設定の解説：どの項目が何を変えるのか"
published: 2026-09-21
description: "swift-formatの設定キーとルールを一つずつ、最小の変更例つきで確認し、自分のiOSプロジェクトで選んだ値とその理由をまとめる。"
tags: [Swift, swift-format, Xcode, Tooling]
category: Engineering
draft: false
lang: ja
translationKey: swift-format-configuration
---

自分のiOSプロジェクトAtofolioに`.swift-format`を書いていて、公式ドキュメントが各項目に一文しか説明を付けていないことに気づいた。`prioritizeKeepingFunctionOutputTogether`のような名前は、その一文を読んでもコードがどう変わるのか分からない。

そこで全部試した。デフォルト値で一度フォーマットし、変更後の値でもう一度フォーマットして、その差分を見る。この記事はその実験の記録である。

以下の出力はすべてXcode 27に同梱のswift-format（`xcrun --find swift-format`、`--version`は`main`と表示される）、macOS 27、Swift 6.4で得たもの。swift-formatの挙動はバージョンと強く結びついているので、Swift Package Managerで個別に入れたものを使っている場合、一部のルールの出力は違うかもしれない。

## まず結果から

同じコードを2つの設定でフォーマットした結果。前半がデフォルト（2スペース、`return`を省略しない、引数をなるべく詰める）、後半が自分の設定である。

```swift
// デフォルト設定
private struct LibraryRow: View {
  var title: String {
    return item.displayName
  }

  var body: some View {
    return HStack(spacing: 12) {
      Text(title)
      Spacer()
    }
  }

  func rebuild(from items: [LibraryItem], selection: Set<LibraryItem.ID>, sorted: Bool)
    -> [LibraryRow]
  {
    var rows = [LibraryRow]()
    for item in items {
      if selection.contains(item.id) {
        rows.append(LibraryRow(item: item, isSelected: true, onSelect: onSelect))
      }
    }
    return rows
  }
}
```

```swift
// 自分の設定
private struct LibraryRow: View {
    var title: String {
        item.displayName
    }

    var body: some View {
        HStack(spacing: 12) {
            Text(title)
            Spacer()
        }
    }

    func rebuild(
        from items: [LibraryItem],
        selection: Set<LibraryItem.ID>,
        sorted: Bool
    ) -> [LibraryRow] {
        var rows: [LibraryRow] = []
        for item in items where selection.contains(item.id) {
            rows.append(LibraryRow(item: item, isSelected: true, onSelect: onSelect))
        }
        return rows
    }
}
```

2つのコードは意味的に完全に同じで、違いはすべて設定から来ている。以下、一つずつ見ていく。

## 確認の方法

自分で試したい場合、手順は簡単である。まずデフォルト設定を基準として書き出す。

```bash
xcrun swift-format dump-configuration > default.json
```

`jq`でキーを一つ変え、2つの出力を比較する。

```bash
jq '.indentation.spaces = 4' default.json > patched.json
diff <(xcrun swift-format format --configuration default.json a.swift) \
     <(xcrun swift-format format --configuration patched.json a.swift)
```

ここで一つ引っかかりやすい点がある。**swift-formatのルールは2種類に分かれる。** コードを書き換えるもの（format rule）と、問題を報告するだけのもの（lint-only rule）である。`format`だけを実行すると、`NeverForceUnwrap`のようなルールは「何もしない」ように見えて、効いていないと誤解してしまう。これらは`swift-format lint`でしか現れない。

```bash
xcrun swift-format lint --configuration patched.json a.swift
```

以下、各ルールがどちらに属するかを明記している。

---

## 一、レイアウト系の設定

### lineLength

1行の最大文字数。これを超えると改行の処理が入る。

```diff
+// lineLength: 80
-let view = makeRow(title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
+let view = makeRow(
+  title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
```

**選んだ値：100（デフォルト）。** Swiftは型名も引数ラベルも元々長く、80だとSwiftUIのview部分が細切れになる。100はGoogle Swift Style Guideの値であり、swift-format自身のデフォルトでもある。

### indentation

1段のインデントを何で作るか。`{"spaces": N}`か`{"tabs": N}`を書く。

```diff
 struct Point {
-  var x: Int
-  func move() {
-    x += 1
-  }
+    var x: Int
+    func move() {
+        x += 1
+    }
 }
```

**選んだ値：`{"spaces": 4}`。** swift-formatのデフォルトは2スペースだが、Xcodeのエディタ既定値は4スペースで、Appleのサンプルコードも4である。Xcodeで手で打ったインデントとフォーマット後のインデントが食い違うのは避けたい。

### tabWidth

この名前は誤解を招く。「インデント幅」ではなく、**行の長さを測るときにタブ1文字を何桁として数えるか**である。

`indentation`がスペースなら、この値は出力にまったく影響しない。タブでインデントしている場合にだけ差が出る。以下は同じコード、同じ`lineLength: 60`、同じタブインデントで、`tabWidth`だけが違う。

```swift
// tabWidth: 8 —— タブ2段が16桁と数えられ、残りが足りず改行される
func outer() {
	func inner() {
		let r = compute(
			alpha: 1, beta: 2, gamma: 3,
			delta: 44)
	}
}

// tabWidth: 4 —— タブ2段は8桁なので1行に収まる
func outer() {
	func inner() {
		let r = compute(alpha: 1, beta: 2, gamma: 3, delta: 44)
	}
}
```

**選んだ値：4。ただし正直なところ、自分の設定では効いていない。** スペースでインデントしているので、swift-formatが幅を換算すべきタブに出会うことがない。エディタの設定と揃えるために残しているだけで、消しても結果は変わらない。

### indentBlankLines

空行に現在の段のインデントを入れるか（つまり行末に空白を残すか）。

```diff
 func f() {
     let a = 1
-
+    ⎵⎵⎵⎵
     let b = 2
 }
```

（上の`⎵`は実際に生成される空白である。）

**選んだ値：false（デフォルト）。** 有効にすると行末空白ができ、多くのエディタの「保存時に行末空白を削除」やgit diffの読み方と衝突する。

### maximumBlankLines

連続する空行を何行まで許すか。それ以上は畳まれる。

```diff
 let a = 1
 
-
 let b = 2
```

（上は`2`からデフォルトの`1`に戻したときの効果。）

**選んだ値：1（デフォルト）。** 空行で論理的な塊を分けはするが、「より大きな区切り」を表すために2行以上を使う必要はない。それは見出しコメントの仕事である。

### spacesBeforeEndOfLineComments

行末の`//`コメントの前に空白をいくつ置くか。

```diff
-let a = 1  // one
-let bb = 22  // two
+let a = 1 // one
+let bb = 22 // two
```

（上は`1`にしたときの効果。）揃えはしない。固定個数の空白を保証するだけである。

**選んだ値：2（デフォルト）。** 1個だとコメントがコードに近すぎる。2個あれば視覚的に離れる。

### spacesAroundRangeFormationOperators

`...`と`..<`の前後に空白を入れるか。

```diff
-let r = 0..<10
-let c = 1...5
+let r = 0 ..< 10
+let c = 1 ... 5
```

**選んだ値：false（デフォルト）。** `0..<10`は一つのまとまりとして読んでいる。空白を入れると3つの独立した語のように見える。

### indentConditionalCompilationBlocks

`#if` / `#endif`の中身をもう1段インデントするか。

```diff
 func f() {
   #if DEBUG
-  let a = 1
-  print(a)
+    let a = 1
+    print(a)
   #endif
 }
```

（デフォルトのtrueが右側。）

**選んだ値：true（デフォルト）。** `#if`は開きと閉じを持つ構造なので、中身を1段下げるのは直感に合う。

### indentSwitchCaseLabels

`case`を`switch`に対してインデントするか。

```diff
 switch v {
-case 1:
-  print(1)
-default:
-  break
+  case 1:
+    print(1)
+  default:
+    break
 }
```

**選んだ値：false（デフォルト）。** Swiftコミュニティの主流であり、Appleのドキュメントもこの形である。有効にするとswitch全体が2段右に寄り、すでにネストしたコードでは場所を取りすぎる。

---

## 二、改行の方針

このグループは「1行に収まらないとき、どこで折るか」を決める。

### respectsExistingLineBreaks

手で書いた改行を尊重するかどうか。

```diff
-let a = compute(
-  x: 1,
-  y: 2
-)
+let a = compute(x: 1, y: 2)
 let b = 1 + 2
```

（上はfalseにしたときの効果。結合できるものはすべて結合される。）

**選んだ値：true（デフォルト）。** ファイル中で最も重要な項目だと思っている。これを切るとswift-formatは「行の密度を最大化する機械」になり、グループを表現するために手で分けた引数リストが容赦なく1行にまとめられる。有効なら、ルールに違反しない限り手書きの改行は残る。フォーマッタは下限を担保し、表現は人が持つ。

### lineBreakBeforeEachArgument

引数リストが1行に収まらないとき、各行をできるだけ詰めるか、1引数につき1行にするか。

```diff
 let view = makeRow(
-  title: "Title", subtitle: "Subtitle", icon: iconName, action: handler, isEnabled: true)
+  title: "Title",
+  subtitle: "Subtitle",
+  icon: iconName,
+  action: handler,
+  isEnabled: true
+)
```

関数宣言も同じである。

```diff
 func makeRow(
-  title: String, subtitle: String, iconName: String, action: @escaping () -> Void, isEnabled: Bool,
+  title: String,
+  subtitle: String,
+  iconName: String,
+  action: @escaping () -> Void,
+  isEnabled: Bool,
   badgeCount: Int
 ) -> Row {
```

**選んだ値：true。** デフォルトの詰め込み方式には実用上の問題がある。引数を1つ足すと後ろの引数がすべて並び替わり、実際は1つ追加しただけなのにdiffでは5行変わったように見える。1引数1行なら、引数の追加は行の追加で済む。SwiftUIのイニシャライザは引数が多く長いので、この差はコードレビューではっきり出る。

代償は縦に長くなること。それは受け入れる。

### lineBreakBeforeEachGenericRequirement

同じ考え方を`where`句に適用したもの。

```diff
 func merge<A, B>(_ a: A, _ b: B) -> [A.Element]
 where
-  A: Sequence, B: Sequence, A.Element == B.Element, A.Element: Hashable, B.Element: Comparable,
-  A: Codable, B: Codable, A: Sendable
+  A: Sequence,
+  B: Sequence,
+  A.Element == B.Element,
+  A.Element: Hashable,
+  B.Element: Comparable,
+  A: Codable,
+  B: Codable,
+  A: Sendable
 {
```

`where`句が折り返しを要する長さになったときだけ働く。短いものは影響を受けない。

**選んだ値：true。** 前の項目と同じ理由で揃えた。実際には自分のプロジェクトにはまだ折り返すほど長い`where`句がないので、今のところ将来のために書いてある。

### lineBreakBeforeControlFlowKeywords

`else`や`catch`のようなキーワードを行頭に置くか。

```diff
   if condition {
     print(a)
-  } else {
+  }
+  else {
     print(0)
   }
 }
```

**選んだ値：false（デフォルト）。** `} else {`はSwiftで広く使われる書き方であり、Allmanスタイルに変えるとどのSwiftプロジェクトでも浮く。

### lineBreakBetweenDeclarationAttributes

複数の属性をそれぞれ1行にするか。

```diff
-@MainActor @preconcurrency final class Store {
+@MainActor
+@preconcurrency
+final class Store {
   var value = 0
 }
```

**選んだ値：false（デフォルト）。** SwiftUIでは`@State private var`のような組み合わせが多く、強制的に分けるとプロパティ宣言の領域が縦一列になる。しかもこの項目は全体に効くので、「長い属性のときだけ」という指定はできない。

### lineBreakAroundMultilineExpressionChainComponents

メソッドチェーンが収まらないとき、メソッド名の間で折るか、引数の括弧の中で折るか。

```diff
-let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted().joined(
-  separator: ", ")
+let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted()
+  .joined(separator: ", ")
```

**選んだ値：false（デフォルト）。** これは迷った。有効にすると折る位置が意味的に自然になる（`.`で折れる）が、実際の挙動は「複数行のチェーンの各要素の前後で強制的に改行する」なので、あるチェーンが複数行と判定された時点で全体がばらける。デフォルトの出力で自分のコードには足りているので、今は触らない。

### prioritizeKeepingFunctionOutputTogether

関数シグネチャが収まらないとき、どの部分を守るか。この記事で一番気に入っている項目である。

```diff
-func loadConfiguration(from url: URL, using decoder: JSONDecoder, strict: Bool) throws
-  -> Configuration
-{
+func loadConfiguration(
+  from url: URL, using decoder: JSONDecoder, strict: Bool
+) throws -> Configuration {
   try decoder.decode(Configuration.self, from: Data(contentsOf: url))
 }
```

デフォルト（false）は戻り値の型を次の行へ送り、シグネチャが複数行になった結果、開き波括弧まで単独行に追いやられる。シグネチャ3行と孤立した`{`ができあがる。有効にすると引数リストのほうが分割され、`) throws -> Configuration {`はまとまったまま残る。

**選んだ値：true。** 戻り値の型は関数シグネチャの中でも情報量の多い部分で、引数リストから切り離す理由がない。孤立した`{`も、4スペースでインデントされたコードの中ではやけに目立つ。

---

## 三、末尾のカンマ

2つの項目があり、後者が前者を上書きする。

### multiElementCollectionTrailingCommas

要素が複数ある配列・辞書リテラルで、最後の要素の後ろにカンマを置くか。

```diff
 let colors = [
   "red",
   "green",
-  "blue"
+  "blue",
 ]
```

単一要素のコレクションは影響を受けない。`["only"]`を複数行に開いてもカンマは付かない。

**選んだ値：true（デフォルト）。ただし自分の設定ではすでに効いていない。** 理由は次の項目にある。

### multilineTrailingCommaBehavior

適用範囲がより広い。引数リスト、タプルなど「対称に区切られたカンマ区切りのリスト」すべてで、コレクションリテラルも含む。値は3つ。

- `keptAsWritten`（デフォルト）：書いてあれば残し、なければ足さない。コレクションリテラルは前の項目に任せる
- `alwaysUsed`：複数行のリストには必ず付ける
- `neverUsed`：すべて削除する

```diff
 let view = makeRow(
   title: "Title",
   subtitle: "Subtitle",
-  icon: iconName,
+  icon: iconName
 )
```

**選んだ値：`neverUsed`。**

最初は`alwaysUsed`にしていた。末尾カンマがあれば最後の要素も他の要素と同じように追加・削除・並び替えができ、引数を1つ足してもdiffは1行で済む、という理由である。この理由自体は間違っていないが、カバーできない範囲がある。名前のとおり`multilineTrailingCommaBehavior`は**複数行の**リストしか扱わない。1行の`makeRow(title: "a", subtitle: "b")`にカンマが付くことは決してない。

つまり`alwaysUsed`で実際に得られるのは「複数行にはある、1行にはない」という分裂したルールである。同じ呼び出しが、100桁を超えたかどうかで書き方を変える。`neverUsed`なら一つのルールですべてを覆える。どこにも末尾カンマは付かない。それで後者に変えた。

代償はdiff上の利点を手放すこと。得られるのは「このリストは今1行なのか複数行なのか」を考えなくて済むことである。

**2つの波及。**

一つ目は、`neverUsed`が`multiElementCollectionTrailingCommas`を上書きすること。後者が`true`のままでも、コレクションリテラルの末尾カンマは削除される。

```swift
// multiElementCollectionTrailingCommas: true + multilineTrailingCommaBehavior: neverUsed
let colors = [
    "red",
    "green",
    "blue"
]
```

つまり`multiElementCollectionTrailingCommas`の行は、自分の設定では今は空回りしている。将来`keptAsWritten`に戻すときに考え直さなくて済むよう残しているが、出力には一切影響しない。

二つ目は、コンパイラのバージョン要件が消えること。引数リストの末尾カンマは[SE-0439](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0439-trailing-comma-lists.md)で導入された構文で、**Swift 6.1以降のコンパイラが必要**である（実際に確かめたが、言語モードによる制限ではない。コンパイラさえ新しければ`-swift-version 5`でも通る）。`alwaysUsed`を選ぶと古いツールチェーンでビルドできないコードが生成される。`neverUsed`ならこの問題は起きない。

**ついでに一つバグ。** 手書きの1行末尾カンマは構文上は正しい（`makeRow(title: "a", subtitle: "b",)`も`[1, 2, 3,]`もコンパイルできる）が、swift-formatの処理は綺麗ではない。`neverUsed`はカンマを削除した後に空白を残し、収束するには2回目の実行が必要になる。

```swift
// 入力
let v = makeRow(title: "a", subtitle: "b",)

// 1回目
let v = makeRow(title: "a", subtitle: "b" )

// 2回目
let v = makeRow(title: "a", subtitle: "b")
```

デフォルトの`keptAsWritten`はさらに悪く、`("b", )`をそのまま残し、何度実行しても変わらない。コレクションリテラルにこの問題はない。自分で1行の末尾カンマを打つことはあまりないだろうが、他のプロジェクトからコードを移してきた場合は、コミット前に2回フォーマットしておく価値がある。

### reflowMultilineStringLiterals

複数行文字列リテラルの中で、長すぎる行を`\`の継続で折り返すかどうか。

```swift
// never（デフォルト）
let message = """
  This line is short.
  This particular line is quite long and definitely goes past the configured maximum line length limit of one hundred columns.
  """

// onlyLinesOverLength
let message = """
  This line is short.
  This particular line is quite long and definitely goes past the configured maximum line length \
  limit of one hundred columns.
  """
```

3つ目の値`always`の説明は「既存のエスケープ改行を無視して常に再整形する」である。試したいくつかの例では`onlyLinesOverLength`と同じ出力になった。短い行を結合することはない。違いが出るのは、すでに`\`の継続を含むリテラルだけだと思われる。

**選んだ値：`onlyLinesOverLength`。** 文字列リテラルだけが100桁を超えられる場所になるのは避けたい（それでは`lineLength`が形骸化する）が、行ごとに整えた短いテキストをフォーマッタに触られるのも困る。この中間の値がちょうどよい。

---

## 四、引数を取る3つの項目

### fileScopedDeclarationPrivacy

ファイルスコープの非公開宣言を`private`と`fileprivate`のどちらに揃えるか。`FileScopedDeclarationPrivacy`ルールに対応する。

```diff
-fileprivate let cache = 1
-fileprivate func helper() {}
+private let cache = 1
+private func helper() {}
```

ファイルスコープではこの2つのキーワードの意味は完全に同じなので、純粋に書き方を揃えるだけの設定である。

**選んだ値：`private`（デフォルト）。** 短く、型の内部で使う`private`と見た目が揃う。

### noAssignmentInExpressions

`NoAssignmentInExpressions`ルールの許可リスト。どの関数なら引数の中に代入を書いてよいか。

デフォルトは`["XCTAssertNoThrow"]`で、`XCTAssertNoThrow(x = try compute())`がテストでよくある書き方だからである。許可リストを空にすると、この行が報告される。

```text
warning: [NoAssignmentInExpressions] move this assignment expression into its own statement
```

**選んだ値：デフォルトの`["XCTAssertNoThrow"]`のまま。** 自分のプロジェクトはXCTestではなくSwift Testingを使っているので、この許可リストは今のところ空回りしている。デフォルトを残しておくコストはない。

### orderedImports

`OrderedImports`ルールの2つのスイッチ。

`shouldGroupImports`（デフォルトtrue）：種類の違うimportをグループに分け、間に空行を入れる。

```diff
 import Foundation
+import UIKit
+
+import enum Swift.Optional
+
 @testable import MyApp
-import UIKit
```

順序は、通常のimport → 単一シンボルのimport（`import enum Swift.Optional`）→ `@testable` importで、グループ内はアルファベット順。無効にするとすべて混ざり、アルファベット順のみになる。

`includeConditionalImports`（デフォルトfalse）：`#if`ブロック内のimportも並べ替えるか。

```diff
 #if canImport(Combine)
-  import Combine
   import Accelerate
+  import Combine
 #endif
```

**選んだ値：どちらもデフォルトのまま（グループ化 = true、条件付き = false）。** グループ化されていれば`@testable`が一目で分かる。条件付きコンパイルブロック内のimportの順序には意味がある場合（依存関係など）があるので、ツールに触らせたくない。

---

## 五、追加で有効にした10のルール

以下はデフォルトで無効なルールで、自分で有効にしたものである。

### AlwaysUseLiteralForEmptyCollectionInit（書き換える）

```diff
-var names = [String]()
-var lookup = [String: Int]()
+var names: [String] = []
+var lookup: [String: Int] = [:]
```

**有効にした理由：** どちらの書き方も等価だが、後者は型を型の位置に書いている。宣言の左に型注釈、右に値という形は`var x: Int = 0`と同じである。

### BeginDocumentationCommentWithOneLineSummary（報告のみ）

ドキュメントコメントの最初の文を、独立した1行の要約にすることを求める。

```swift
/// Returns the sum of two integers. This function is very simple. It adds them.
func add(_ a: Int, _ b: Int) -> Int { a + b }
```

```text
warning: [BeginDocumentationCommentWithOneLineSummary]
add a blank comment line after this sentence: "Returns the sum of two integers."
```

**有効にした理由：** XcodeのQuick HelpもDocCも、最初の段落だけを要約として取る。3文の要約を書くと、Quick Helpに塊のまま表示される。

### NeverForceUnwrap / NeverUseForceTry / NeverUseImplicitlyUnwrappedOptionals（いずれも報告のみ）

```text
warning: [NeverForceUnwrap] do not force unwrap 'Int(s!)'
warning: [NeverUseForceTry] do not use force try
warning: [NeverUseImplicitlyUnwrappedOptionals] use 'String' or 'String?' instead of 'String!'
```

**有効にした理由：** Atofolioは外部データを取り込むアーカイブアプリで、Bangumi、Steam、Apple Musicのフィールドはいつ欠けても形が変わってもおかしくない。プロジェクトの第一原則は「欠けている情報を捏造しない、不明は不明のまま残す」である。`!`はこの原則と最も直接的に衝突する構文で、「ここには値がないかもしれない」を「ここに値がなければクラッシュする」に変えてしまう。

この3つは`lint`でしか報告されず、コードを書き換えない。書き換えるべきでもない。正しい直し方（`guard let`、`do/catch`、型の変更）は文脈によって変わるからである。

代償として、避けられない報告がいくらか出る。UIKitの`@IBOutlet`は設計上、暗黙的アンラップである。`Bundle.main.url(forResource:)`のような「リソースは必ずappバンドルに入っている」呼び出しも`!`なしで書くのは難しい。その場合は一行のコメントで個別に免除する。

```swift
// swift-format-ignore: NeverUseImplicitlyUnwrappedOptionals
var label: String!
```

この指示は直後の宣言にだけ効き、それ以降の宣言は通常どおり検査される。ファイル全体を免除するには`// swift-format-ignore-file`を使う。

### NoEmptyLinesOpeningClosingBraces（書き換える）

```diff
 struct S {
-
   var x = 1
-
 }
```

**有効にした理由：** 波括弧に接した空行は何のグループも表さない。改行キーを押した痕跡でしかない。

### OmitExplicitReturns（書き換える）

```diff
 func double(_ x: Int) -> Int {
-  return x * 2
+  x * 2
 }
 var squared: Int {
-  return 4
+  4
 }
```

**有効にした理由：** SwiftUIの`body`も多くの計算プロパティも単一の式である。言語が省略を許している以上、各自の習慣に任せるのではなくツールに統一して省かせる。後述のデフォルトルール`UseSingleLinePropertyGetter`（余分な`get { }`を取り除く）と組み合わせると、計算プロパティは式そのものだけまで簡略化される。

これについては少し疑いを残している。`return`を省くと、単一式の関数とクロージャが視覚的に区別しにくくなる。ただしSwiftUIのコードでは利点のほうが大きい。

### UseEarlyExits（書き換える）

```diff
 func f(_ x: Int?) {
-  if let x = x {
-    print(x)
-  } else {
+  guard let x = x else {
     return
   }
+  print(x)
   print("done")
 }
```

**有効にした理由：** `guard`は「条件を満たさなければ抜ける」という意図を先頭に置き、主な処理を最も外側のインデントに残す。Swiftでは珍しい、ツールが確実に実行できる意味レベルの書き換えである。

`else`節が単一の脱出文だけの場合しか扱わないので、複雑な分岐が勝手に変えられることはない。

### UseWhereClausesInForLoops（書き換える）

```diff
 func f(_ xs: [Int]) {
-  for x in xs {
-    if x > 0 {
-      print(x)
-    }
+  for x in xs where x > 0 {
+    print(x)
   }
 }
```

**有効にした理由：** インデントが1段減り、`where`が「絞り込み」と「処理」を構文レベルで分けてくれる。

### ValidateDocumentationComments（報告のみ）

ドキュメントコメントの引数リストが実際のシグネチャと一致しているか検査する。

```swift
/// Returns the sum.
///
/// - Parameters:
///   - a: first
///   - c: wrong name
/// - Returns: the sum
func add(a: Int, b: Int) -> Int { a + b }
```

```text
warning: [ValidateDocumentationComments]
change the parameters of the documentation of 'add' to match its parameters
```

**有効にした理由：** ドキュメントコメントとシグネチャのずれは、最も気づきにくい種類の誤りである。コンパイルにも実行にも影響せず、次にコードを読む人（たいてい自分）を誤解させるだけだからである。

---

## 六、デフォルトで有効なルール

swift-formatがデフォルトで有効にしていて、自分もすべてそのまま残しているものである。働きごとに分け、最小の例を一つずつ挙げる。

### 書き換える側

**DoNotUseSemicolons** —— セミコロンを改行にする。

```diff
-let a = 1; let b = 2;
+let a = 1
+let b = 2
```

**FullyIndirectEnum** —— すべてのcaseが`indirect`ならenum側に引き上げる。

```diff
-enum Tree {
-  indirect case node(Tree, Tree)
-  indirect case leaf(Tree)
+indirect enum Tree {
+  case node(Tree, Tree)
+  case leaf(Tree)
 }
```

**GroupNumericLiterals** —— 長い数値リテラルにアンダースコアの区切りを入れる。

```diff
-let big = 1000000
-let hex = 0xFFFFFFFF
+let big = 1_000_000
+let hex = 0xFFFF_FFFF
 let bin = 0b11110000
```

最後の行が変わっていないことに注意。8桁の2進数リテラルは閾値の内側である。

**NoAccessLevelOnExtensionDeclaration** —— アクセスレベルをextensionからメンバーへ移す。

```diff
-public extension String {
-  func shout() -> String { uppercased() }
+extension String {
+  public func shout() -> String { uppercased() }
 }
```

**NoAssignmentInExpressions** —— 式の中の代入を独立した文に分ける。

```diff
 func f() -> Int {
   var x = 0
-  return x = 5
+  x = 5
+  return
 }
```

（この例は元のコードからして怪しく、書き換えた結果もコンパイルできるとは限らない。このルールの価値は、その行を見直させることにある。）

**NoCasesWithOnlyFallthrough** —— `fallthrough`だけのcaseを統合する。

```diff
-  case 1:
-    fallthrough
-  case 2:
+  case 1, 2:
     print("small")
```

**NoEmptyTrailingClosureParentheses** —— トレイリングクロージャの前の空の括弧。

```diff
-  UIView.animate() {
+  UIView.animate {
```

**NoLabelsInCasePatterns** —— caseパターン内の余分なラベル。

```diff
-  case .a(x: let x, y: let y):
+  case .a(let x, let y):
```

**NoParensAroundConditions** —— 条件式を囲む括弧。

```diff
-  if (x > 0) {
+  if x > 0 {
-  while (x < 10) { break }
+  while x < 10 { break }
```

**NoVoidReturnOnFunctionSignature** —— 関数シグネチャ上の明示的な`-> Void`。

```diff
-func f() -> Void {}
-func g() -> () {}
+func f() {}
+func g() {}
```

**ReturnVoidInsteadOfEmptyTuple** —— クロージャ型の`()`を`Void`にする。

```diff
-let handler: (Int) -> () = { _ in }
+let handler: (Int) -> Void = { _ in }
```

前のルールと向きが逆だが矛盾はしていない。関数シグネチャ上の戻り値の型は削除し、型注釈の中では`Void`と書く。

**OneCasePerLine** —— 関連値や生の値を持つcaseを独立した行にする。

```diff
 enum E {
-  case a, b, c(Int)
-  case d = 1, e = 2
+  case a, b
+  case c(Int)
+  case d = 1
+  case e = 2
 }
```

値を持たない`case a, b`は1行のまま残ることに注意。

**OneVariableDeclarationPerLine** —— 1行に1つの変数。

```diff
-let a = 1, b = 2, c = 3
+let a = 1
+let b = 2
+let c = 3
```

**UseExplicitNilCheckInConditions** —— 束縛を捨てる`if let _`をnil比較にする。

```diff
-  if let _ = x {
+  if x != nil {
```

**UseLetInEveryBoundCaseVariable** —— `case let .a(x, y)`を各束縛に`let`を書く形にする。

```diff
-  case let .a(x, y):
+  case .a(let x, let y):
```

**UseShorthandTypeNames** —— ジェネリクス表記を短縮形にする。

```diff
-var a: Array<Int> = []
-var b: Optional<String> = nil
-var c: Dictionary<String, Int> = [:]
+var a: [Int] = []
+var b: String? = nil
+var c: [String: Int] = [:]
```

**UseSingleLinePropertyGetter** —— 読み取り専用プロパティの余分な`get { }`。

```diff
   var x: Int {
-    get {
-      return 1
-    }
+    return 1
   }
```

**UseTripleSlashForDocumentationComments** —— ブロックコメントのドキュメントを`///`にする。

```diff
-/**
- * A documented function.
- */
+/// A documented function.
 func f() {}
```

**FileScopedDeclarationPrivacy**と**OrderedImports**は、それぞれ設定項目を持つため前述した。

### 報告のみ

コードを変更せず、`lint`で報告するだけのルールである。

| ルール | 引っかかる例 | 報告内容 |
| --- | --- | --- |
| AlwaysUseLowerCamelCase | `let Max_Count = 10` | rename the constant 'Max_Count' using lowerCamelCase |
| TypeNamesShouldBeCapitalized | `struct myStruct {}` | rename the struct 'myStruct' using UpperCamelCase |
| DontRepeatTypeInStaticProperties | `static let redColor = Color()` | remove the suffix 'Color' from the name of the variable 'redColor' |
| IdentifiersMustBeASCII | `let café = 1` | remove non-ASCII characters from 'café': é |
| AmbiguousTrailingClosureOverload | ラベルだけが違うクロージャ引数のオーバーロード | rename 'f(a:)' so it is no longer ambiguous when called with a trailing closure |
| AvoidRetroactiveConformances | `extension URL: @retroactive Identifiable` | do not declare retroactive conformances |
| NoBlockComments | `/* comment */` | replace this block comment with line comments |
| NoPlaygroundLiterals | `#colorLiteral(...)` | replace '#colorLiteral' with a call to an initializer on 'NSColor' or 'UIColor' |
| OnlyOneTrailingClosureArgument | クロージャ引数とトレイリングクロージャの併用 | revise this function call to avoid using both closure arguments and a trailing closure |
| ReplaceForEachWithForLoop | `xs.forEach { ... }` | replace use of '.forEach { ... }' with for-in loop |
| UseSynthesizedInitializer | 合成されるものと同一のinit | remove this explicit initializer |

このグループには特に意見はない。報告される内容はどれも実際の問題である。一つだけ触れておくと`ReplaceForEachWithForLoop`で、`forEach`の中では`break`も`continue`も使えず、`return`の意味も直感と違う（そのクロージャ呼び出しを抜けるだけである）ので、`for-in`のほうが確かに安全である。

## 七、無効のままにした2つ

この2つはswift-formatがデフォルトで無効にしていて、自分も有効にしていない。

**AllPublicDeclarationsHaveDocumentation** —— すべてのpublic宣言にドキュメントコメントを求める。

```text
warning: [AllPublicDeclarationsHaveDocumentation] add a documentation comment for 'S'
```

**無効にした理由：** Atofolioはアプリであって、ライブラリではない。アプリターゲット内の`public`の多くはモジュールをまたぐための技術的な都合で、外部の利用者向けのAPIではない。強制すると`/// The title.`のような、名前を言い換えただけのコメントが増える。いつかデータ層を独立したパッケージに切り出すなら、そのパッケージの中で有効にする。

**NoLeadingUnderscores** —— アンダースコアで始まる識別子を禁止する。

```text
warning: [NoLeadingUnderscores] remove the leading '_' from the name '_internalValue'
```

**無効にした理由：** 先頭のアンダースコアはSwiftでは構文上の意味を持つ。`@State var x`は`_x`という名前のproperty wrapperのインスタンスを生成するし、自分でproperty wrapperを実装するときも内部の格納に`_`始まりの名前をよく使う。有効にすると言語機能と喧嘩する。

---

## 八、実際に使う上での落とし穴

**設定ファイルの探し方。** `--configuration`を付けずに実行すると、swift-formatはフォーマット対象のファイルがあるディレクトリから上へ遡って`.swift-format`を探し、最初に見つかったものを使う。深い階層のファイルでもリポジトリ直下の設定を見つけることは実際に確認した。したがってルートに1つ置けば足りる。（Xcode内蔵のフォーマット機能がまったく同じ探索をするかどうかは、スクリプトで検証する手段がないので断定していない。）

**未知のキーはエラーにならない。** トップレベルのキー名を打ち間違えると（たとえば`lineLenght`）、swift-formatは黙って無視する。設定が効いていると思い込んだまま、実際には効いていない状態になる。ただし**ルール名**を間違えた場合は警告が出る。

```text
warning: Configuration contains an unrecognized rule: BogusRule
```

したがって設定ファイルは手で書くのではなく、`dump-configuration`で生成してから値を変えるのがよい。

**ルール一覧はツールチェーンに紐づく。** 自分の設定のルール一覧は、Xcode 27同梱のswift-formatと完全に一致している。ただしswift-formatの`main`ブランチにはすでに新しいルール（`SwiftTestingNamingConventions`など）があり、この設定には含まれていない。欠けているルールはデフォルト値が使われる。ツールチェーンを変えたら、あらためて`dump-configuration`して新しい項目がないか比べる価値がある。

**`format`と`lint`は別のコマンドである。** 繰り返しになるが、書き換えるルールは`format`で働き、報告するだけのルールは`lint`でなければ見えない。CIでは両方を走らせる必要がある。そうしないと`NeverForceUnwrap`のようなルールは無効も同然である。

```bash
xcrun swift-format lint --strict --recursive --parallel Sources
xcrun swift-format format --in-place --recursive --parallel Sources
```

---

## 設定ファイル全体

```json
{
  "version": 1,
  "lineLength": 100,
  "indentation": { "spaces": 4 },
  "tabWidth": 4,
  "maximumBlankLines": 1,
  "indentBlankLines": false,
  "spacesBeforeEndOfLineComments": 2,
  "spacesAroundRangeFormationOperators": false,
  "indentConditionalCompilationBlocks": true,
  "indentSwitchCaseLabels": false,

  "respectsExistingLineBreaks": true,
  "lineBreakBeforeEachArgument": true,
  "lineBreakBeforeEachGenericRequirement": true,
  "lineBreakBeforeControlFlowKeywords": false,
  "lineBreakBetweenDeclarationAttributes": false,
  "lineBreakAroundMultilineExpressionChainComponents": false,
  "prioritizeKeepingFunctionOutputTogether": true,

  "multiElementCollectionTrailingCommas": true,
  "multilineTrailingCommaBehavior": "neverUsed",
  "reflowMultilineStringLiterals": "onlyLinesOverLength",

  "fileScopedDeclarationPrivacy": { "accessLevel": "private" },
  "noAssignmentInExpressions": { "allowedFunctions": ["XCTAssertNoThrow"] },
  "orderedImports": { "includeConditionalImports": false, "shouldGroupImports": true },

  "rules": {
    "AlwaysUseLiteralForEmptyCollectionInit": true,
    "BeginDocumentationCommentWithOneLineSummary": true,
    "NeverForceUnwrap": true,
    "NeverUseForceTry": true,
    "NeverUseImplicitlyUnwrappedOptionals": true,
    "NoEmptyLinesOpeningClosingBraces": true,
    "OmitExplicitReturns": true,
    "UseEarlyExits": true,
    "UseWhereClausesInForLoops": true,
    "ValidateDocumentationComments": true,

    "AllPublicDeclarationsHaveDocumentation": false,
    "NoLeadingUnderscores": false
  }
}
```

これは変更した部分だけである。実際のファイルにはデフォルトで有効な残り31のルールも入っていて、値はすべて`true`になる。`xcrun swift-format dump-configuration`で生成して統合すればよい。

判断の基準をまとめると、結局3つしかない。

一つ目は**diffを安定させること**。1引数1行、1行1変数はどちらも「一つ変えたら一行だけ動く」ためのものである。末尾カンマも元はこの分類にいたが、最後は残らなかった。すべての場合で一貫させられなかったからである。

二つ目は**下限はツールに、表現は人に任せること**。`respectsExistingLineBreaks: true`がその中心で、手書きの改行をすべて均してしまうフォーマッタは望んでいない。

三つ目は**プロジェクトの原則を設定に書き込むこと**。Atofolioの原則が「欠けている情報を捏造しない」である以上、`NeverForceUnwrap`のグループは有効であるべきだ。設定ファイルは実行できるプロジェクトの約束であって、体裁の好みだけではない。

この3つはときどき衝突する。末尾カンマがまさにその例で、diffの安定とルールの一貫性がぶつかり、後者を選んだ。
