---
title: "Swift 新特性：WWDC26 笔记"
published: 2026-06-11
description: "WWDC26《What's New in Swift》笔记，记录 Swift 6.3 与 6.4 中我之后可能会用到的变化。"
tags: [Swift, WWDC, Programming]
category: Engineering
draft: false
lang: zh_CN
translationKey: whats-new-in-swift-wwdc26
---

看完今年的 *What's New in Swift*，顺手把之后可能会查的内容记一下。

这场由 Swift 团队的 Becca 和 Evan 主讲，讲的是 Swift 6.3 和 6.4。内容很多，从几处语法小改动，一路讲到 Android、Wasm 和所有权。下面基本按照 Session 的顺序整理，代码示例也保留下来了。

## 日常写 Swift 能碰到的改动

### `some` 和 `any` 外面的 Optional 括号可以省略

```swift
// 以前
func delegate() -> (any Renderer)?

// 现在
func delegate() -> any Renderer?
```

改动很小，不过后者确实更好读。

### `weak let`

过去弱引用只能写成 `var`，放在 `Sendable` 类型里比较麻烦，有时最后只能用 `@unchecked Sendable` 绕过去。

Swift 6.4 允许不可变弱引用使用 `weak let`，这种情况终于可以正常表达 `Sendable` 了。

### `~Sendable`

`~Sendable` 可以明确标记一个类型本身不是 `Sendable`，同时不妨碍它的子类自行成为 `Sendable`。

### 忽略 Task 错误会收到警告

如果直接忽略 `Task` 抛出的错误，Swift Concurrency 现在会给警告。非结构化任务里的错误确实很容易就这样丢掉，这个检查早该有了。

### `defer` 中可以调用异步函数

之前不能在 `defer` 里调用 `async` 函数的限制已经移除。

### 两个成员初始化器

结构体同时包含 `internal` 和 `private` 存储属性时，编译器可以按照对应的访问级别合成两个成员初始化器。不用再因为属性可见性不同，专门手写一个初始化器。

### `@diagnose`

`@diagnose` 可以只调整某个声明上的一项诊断：

```swift
@diagnose(DeprecatedDeclaration, as: ignored, reason: "Flying with surplus hardware")
func makeApolloSoyuzMission() -> Mission { ... }

@diagnose(StrictMemorySafety, as: warning)
func uplinkCommand(from receiver: inout Receiver, to computer: inout Computer) { ... }

@diagnose(ErrorInFutureSwiftVersion, as: error)
func fetchPosition() -> (x: Double, y: Double, z: Double) { ... }
```

这是这批小改动里我最喜欢的一个。碰到特殊调用点，不用再修改整个项目的警告级别，`reason:` 也可以顺便解释为什么这里要例外处理。

### 模块选择器 `::`

Swift 6.3 新增的 `::` 用来解决不同模块中的同名符号：

```swift
import Rocket
import GiftShopToys

let r1 = SaturnV()          // 有歧义
let r2 = Rocket::SaturnV()  // 使用 Rocket 模块中的类型
```

成员也可以这样选择，例如 `technician.HumanResources::fire()`。

## 库更新

### 标准库

- `withTaskCancellationShield { ... }`：即使外围任务已经取消，里面的关键操作仍然会完成。Session 里的例子是发送最后一条 SOS 数据包。
- `Dictionary.mapKeyedValues`：转换字典值时也能拿到对应的键：

  ```swift
  missions.mapKeyedValues { mission, window in
      makeDisplayName(for: mission, in: window)
  }
  ```

- `FilePath`：跨平台的路径类型，可以直接操作结构化的 `components`：

  ```swift
  var path: FilePath = "/var/www/static"
  path.components.append("WWDC")
  // [ "var", "www", "static", "WWDC" ]
  ```

### Swift Testing

- `Issue.record(..., severity: .warning)` 可以记录警告，但不会让测试失败。
- `try Test.cancel("reason")` 可以在参数化用例不适用时带着原因退出。
- `swift test` 可以在指定次数内重复运行测试，直到通过或失败。查偶发测试问题时应该挺实用。
- `XCTestCase` 里现在可以使用 `#expect`，XCTest 的断言失败也会显示成 Swift Testing Issue，所以旧测试不需要一次性全部迁移。

### Subprocess 1.0

`Subprocess` 包正式到了 1.0。新版整理了 API 和错误处理，也支持跨平台逐行读取输出：

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

不同平台的文件描述符和进程退出状态由包内部处理。

### Foundation 的 `ProgressManager`

`ProgressManager` 是针对 `async`／`await` 设计的新进度 API。父任务通过 `subprogress(assigningCount:)` 把总进度的一部分分给子任务，子任务只管自己的几个阶段，不需要知道外面的总数：

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

Foundation 还在继续迁移到纯 Swift 实现。Session 里提到了更快的 `Data` 操作和桥接，以及 `NSURL`／`CFURL` 背后统一的 Swift 实现。

## Apple 平台之外

### `anyAppleOS`

以前要把 Apple 平台全部列出来：

```swift
// 以前
@available(macOS 27, iOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func showStatus() { ... }

// 现在
@available(anyAppleOS 27, *)
func showStatus() { ... }
```

`anyAppleOS` 也可以写在 `#if os(anyAppleOS)` 里。

### `@C`

`@C` 可以把 Swift 函数直接暴露给 C，也可以让 Swift 实现一个 C 函数。签名需要使用整数、指针、导入的 C 结构体和 raw-value 枚举等 C 兼容类型：

```swift
@C
func averageLaunchWindowLength(_ windows: Span<LaunchWindow>) -> TimeInterval { ... }
```

### Java 和 Android

Java 现在可以调用 Swift 的 `async` 和 `throws` 函数，Java 类也可以遵循 Swift 协议。另外，swift.org 已经提供官方 Swift Android SDK。

### WebAssembly

Swift 可以通过开源工具链编译成 Wasm。JavaScriptKit 的类型安全桥接路径现在比动态路径快 **35–40 倍**。Session 中举的例子是 Goodnotes，它把原生 iOS App 里的 Swift 代码通过 Wasm 带到了 Web。

### Embedded Swift

Embedded Swift 新增了 existential type、无类型 `throws`，以及用于受限设备 coredump 调试的 DWARF 信息。新的 `EmbeddedRestrictions` 警告组会标出不能在嵌入式环境里使用的功能。

### 编辑器支持

Swift VS Code 扩展集成了 Swiftly，可以管理工具链，并且已经发布到 OpenVSX。Cursor、VSCodium 之类的编辑器也能直接使用；扩展里还加了新手入门检查清单。

## 性能和所有权

### 优化器提示

- `@inline(always)` 现在是正式支持的属性。用在类方法上时应当配合 `final`。
- Swift 6.3 的 `@specialized` 可以针对已知的热点类型预特化泛型函数：

  ```swift
  @specialized(where Values == [UInt8])
  func histogram<Values>(of values: Values) -> [256 of Int]
      where Values: Sequence<UInt8> { ... }
  ```

### 标准库里的所有权支持

`Equatable`、`Comparable` 和 `Hashable` 现在支持 noncopyable 类型；`Equatable` 和 `Comparable` 也支持 non-escapable 类型。关联类型可以声明为 `~Copyable` 或 `~Escapable`。

新的 `Iterable` 协议会在 `for` 循环中借用元素，而不是复制。

自定义 `borrow` 和 `mutate` 访问器可以把这种语义暴露给容器：

```swift
public struct UniqueBox<Value: ~Copyable>: ~Copyable {
    private let valuePointer: UnsafeMutablePointer<Value>

    public var value: Value {
        borrow { valuePointer.pointee }
        mutate { &valuePointer.pointee }
    }
}
```

### 新的低开销类型

- `UniqueBox` 和 `UniqueArray`：没有引用计数开销的 noncopyable 存储。
- `Continuation`：在编译期检查只恢复一次，安全性相当于 `CheckedContinuation`，成本相当于 `UnsafeContinuation`。
- `Ref` 和 `MutableRef`：安全借用集合中的某个位置：

  ```swift
  var countRef = MutableRef(&counts[key, default: 0])
  countRef.value += 1
  ```

- `withTemporaryAllocation` 现在给闭包提供 `OutputSpan`，不再直接暴露 `UnsafeMutableBufferPointer`。

我大概会先用到 `@diagnose`、Task 错误警告和 Swift Testing 的几个改动。所有权相关的新类型更有意思，不过还是得等项目里真的碰到对应问题再说。

> 完整 Session：[What's new in Swift — WWDC26](https://developer.apple.com/videos/play/wwdc2026/262/)。
