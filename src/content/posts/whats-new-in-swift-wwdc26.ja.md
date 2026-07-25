---
title: "Swift の新機能：WWDC26 メモ"
published: 2026-06-11
description: "WWDC26 の「What's New in Swift」を見ながらまとめた、Swift 6.3 と 6.4 の変更点。"
tags: [Swift, WWDC, Programming]
category: Engineering
draft: false
lang: ja
translationKey: whats-new-in-swift-wwdc26
---

今年の *What's New in Swift* を見たので、あとで確認しそうな内容をまとめておく。

Becca と Evan による Swift 6.3、6.4 のセッションで、細かい構文の変更から Android、Wasm、所有権まですごい量だった。リファレンスとして使いたいので、コード例もそのまま残している。

## 普段のコードに関係する変更

### `some` と `any` の Optional

`some` や `any` を Optional にするとき、外側の括弧が不要になった。

```swift
// Before
func delegate() -> (any Renderer)?

// After
func delegate() -> any Renderer?
```

小さい変更だけど、こちらのほうが読みやすい。

### `weak let`

これまで弱参照は `var` にする必要があったため、`Sendable` な型では扱いづらく、`@unchecked Sendable` で回避するケースもあった。

Swift 6.4 では不変の弱参照を `weak let` として宣言できる。

### `~Sendable`

`~Sendable` を使うと、その型自体が `Sendable` ではないことを明示しつつ、サブクラスが `Sendable` になる可能性は残せる。

### Task のエラーを無視した場合の警告

`Task` から投げられたエラーを無視すると警告が出るようになった。非構造化 Task のエラーは気づかないまま消えやすいので、これは普通に助かる。

### `defer` から async 関数を呼べる

`defer` ブロック内で `async` 関数を呼べるようになった。

### 2 つの memberwise initializer

`internal` と `private` の stored property が混在する struct では、それぞれのアクセスレベルに対応する 2 つの memberwise initializer を合成できる。可視性が違うという理由だけで initializer を手書きする必要がなくなる。

### `@diagnose`

`@diagnose` は、特定の宣言に対して 1 つの診断レベルを変更する属性。

```swift
@diagnose(DeprecatedDeclaration, as: ignored, reason: "Flying with surplus hardware")
func makeApolloSoyuzMission() -> Mission { ... }

@diagnose(StrictMemorySafety, as: warning)
func uplinkCommand(from receiver: inout Receiver, to computer: inout Computer) { ... }

@diagnose(ErrorInFutureSwiftVersion, as: error)
func fetchPosition() -> (x: Double, y: Double, z: Double) { ... }
```

今回の細かい変更では、個人的にこれが一番好き。特殊な call site のためにプロジェクト全体の警告設定を変えなくて済むし、`reason:` に例外の理由も残せる。

### モジュールセレクタ `::`

Swift 6.3 では、複数モジュールの同名シンボルを区別するための `::` が追加された。

```swift
import Rocket
import GiftShopToys

let r1 = SaturnV()          // ambiguous
let r2 = Rocket::SaturnV()  // Rocket モジュールの型
```

メンバーにも使える。たとえば `technician.HumanResources::fire()` のようにモジュールを指定できる。

## ライブラリ

### 標準ライブラリ

- `withTaskCancellationShield { ... }`：外側の Task がキャンセルされても、クリティカルな処理を最後まで実行する。セッションでは最後の SOS パケット送信が例として使われていた。
- `Dictionary.mapKeyedValues`：value の変換時に key も参照できる。

  ```swift
  missions.mapKeyedValues { mission, window in
      makeDisplayName(for: mission, in: window)
  }
  ```

- `FilePath`：構造化された `components` を持つクロスプラットフォームのパス型。

  ```swift
  var path: FilePath = "/var/www/static"
  path.components.append("WWDC")
  // [ "var", "www", "static", "WWDC" ]
  ```

### Swift Testing

- `Issue.record(..., severity: .warning)` はテストを失敗させずに警告を記録する。
- `try Test.cancel("reason")` は、該当しないパラメータ化テストを理由つきで終了できる。
- `swift test` で、設定した最大回数までテストを pass または fail するまで繰り返せる。不安定なテストを調べるときに使えそう。
- `XCTestCase` 内で `#expect` が使えるようになり、XCTest の assertion failure も Swift Testing の Issue として表示される。既存テストを一気に移行しなくてもよい。

### Subprocess 1.0

`Subprocess` パッケージが 1.0 になった。API とエラー処理が整理され、クロスプラットフォームで出力を 1 行ずつストリーミングできる。

```swift
let result = try await Subprocess.run(
    .name("ls"),
    input: .none,
    output: .sequence,
    error: .string(limit: 4096)
) { execution in
    execution.standardOutput.strings().filter { $0.hasSuffix(".obj") }
}
```

プラットフォームごとの file descriptor や終了ステータスの違いはパッケージ側で吸収される。

### Foundation の `ProgressManager`

`ProgressManager` は `async`／`await` 向けの新しい進捗 API。親は `subprogress(assigningCount:)` で全体の一部を子に割り当て、子は親の合計値を知らなくても自分のステージだけを報告できる。

```swift
let manager = ProgressManager(totalCount: 100)
try await rocket.launch(manager.subprogress(assigningCount: 100))

extension Rocket {
    func launch(_ progress: consuming Subprogress? = nil) async throws {
        let stage = progress?.start(totalCount: 3)
        try await ignite();          stage?.complete(count: 1)
        try await liftoff();         stage?.complete(count: 1)
        try await stageSeparation(); stage?.complete(count: 1)
    }
}
```

Foundation の Pure Swift 化も続いている。`Data` の処理と bridging の高速化、`NSURL`／`CFURL` の背後にある Swift 実装の統一が紹介された。

## Apple プラットフォーム以外

### `anyAppleOS`

Apple OS をすべて並べていた availability を短く書ける。

```swift
// Before
@available(macOS 27, iOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func showStatus() { ... }

// After
@available(anyAppleOS 27, *)
func showStatus() { ... }
```

`#if os(anyAppleOS)` でも使用できる。

### `@C`

`@C` は Swift 関数を C に公開し、Swift で C 関数を実装する場合にも使える。整数、ポインタ、import した C struct、raw-value enum など、C 互換の型を使う必要がある。

```swift
@C
func averageLaunchWindowLength(_ windows: Span<LaunchWindow>) -> TimeInterval { ... }
```

### Java と Android

Java から Swift の `async` 関数と throwing 関数を呼べるようになり、Java クラスから Swift protocol に準拠することもできる。swift.org では公式の Swift SDK for Android も公開された。

### WebAssembly

Swift はオープンソースのツールチェーンで Wasm にコンパイルできる。JavaScriptKit の型安全な bridge は、dynamic な経路より **35〜40 倍**高速になった。セッションでは、Goodnotes がネイティブ iOS アプリの Swift コードを Wasm 経由で Web に持っていった事例が紹介された。

### Embedded Swift

Embedded Swift では existential type、untyped `throws`、制約のあるハードウェアで coredump を調査するための DWARF debug info が追加された。新しい `EmbeddedRestrictions` 警告グループは、組み込み環境で利用できない機能を知らせる。

### エディタ

Swift VS Code extension はツールチェーン管理用の Swiftly を統合し、OpenVSX でも公開された。Cursor や VSCodium からも利用でき、初心者向けの getting-started checklist も追加されている。

## パフォーマンスと所有権

### オプティマイザへのヒント

- `@inline(always)` が正式にサポートされた。クラスメソッドでは `final` と組み合わせる。
- Swift 6.3 の `@specialized` は、よく使われる具体的な型に対して generic function を事前に特殊化できる。

  ```swift
  @specialized(where Values == [UInt8])
  func histogram<Values>(of values: Values) -> [256 of Int]
      where Values: Sequence<UInt8> { ... }
  ```

### 標準ライブラリの所有権対応

`Equatable`、`Comparable`、`Hashable` が noncopyable type に対応した。`Equatable` と `Comparable` は non-escapable type にも対応し、associated type には `~Copyable` または `~Escapable` を指定できる。

新しい `Iterable` protocol の `for` loop は、要素をコピーせず borrow する。

カスタムの `borrow`／`mutate` accessor を使うと、container からもこのセマンティクスを公開できる。

```swift
public struct UniqueBox<Value: ~Copyable>: ~Copyable {
    private let valuePointer: UnsafeMutablePointer<Value>

    public var value: Value {
        borrow { valuePointer.pointee }
        mutate { &valuePointer.pointee }
    }
}
```

### 新しい低オーバーヘッド型

- `UniqueBox`／`UniqueArray`：参照カウントのコストがない noncopyable storage。
- `Continuation`：1 回だけ resume されることをコンパイル時に検証する。`CheckedContinuation` と同じ安全性で、コストは `UnsafeContinuation` 相当。
- `Ref`／`MutableRef`：collection 内の要素を安全に borrow する。

  ```swift
  var countRef = MutableRef(&counts[key, default: 0])
  countRef.value += 1
  ```

- `withTemporaryAllocation` は `UnsafeMutableBufferPointer` の代わりに `OutputSpan` を渡す。

自分が先に使いそうなのは `@diagnose`、Task のエラー警告、Swift Testing の変更あたり。所有権関係の型は面白いけど、実際のプロジェクトでちょうどいい問題が出てきてから試したい。

> セッション全編：[What's new in Swift — WWDC26](https://developer.apple.com/videos/play/wwdc2026/262/)。
