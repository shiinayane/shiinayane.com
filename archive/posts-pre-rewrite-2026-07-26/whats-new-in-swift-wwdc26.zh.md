---
title: "Swift 新特性：WWDC26 笔记"
published: 2026-06-11
description: "WWDC26《What's New in Swift》摘要：Swift 6.3 与 6.4 在语法体验、标准库、跨平台和性能方面的变化。"
tags: [Swift, WWDC, Programming]
category: Engineering
draft: false
lang: zh_CN
translationKey: whats-new-in-swift-wwdc26
---

每年的 *What's New in Swift* 都是我会看两遍的 Session。第一遍关注大功能，第二遍寻找那些不显眼、却能消除日常摩擦的小改进。WWDC26 的分享由 Swift 团队的 Becca 和 Evan 主讲，覆盖 **Swift 6.3 与 6.4**，内容可以分成四组：日常语法体验、库更新、跨平台能力和性能。

下面是我按照自己真正会回头查阅的方式重新整理的笔记。

---

## 1. 日常语法体验

这些改动不会成为发布会标题，却会从第一天开始减少普通代码里的噪声。

### `some`／`any` 外层的 Optional 括号可以省略

把 `some` 或 `any` 类型包装为 Optional 时，不再需要额外括号：

```swift
// 以前
func delegate() -> (any Renderer)?

// 现在
func delegate() -> any Renderer?
```

变化很小，但消除了几乎每个 Swift 开发者都遇到过的语法硌手感。

### 用 `weak let` 替代 `@unchecked Sendable`

过去弱引用必须声明为 `var`，这让 `Sendable` 一致性很难表达，也经常迫使开发者使用 `@unchecked Sendable`。Swift 6.4 允许不可变弱引用使用 `weak let`，类型可以在没有逃生舱的情况下真正满足 `Sendable`。

### `~Sendable`

现在可以明确声明一个类型是非 `Sendable`，同时不阻止其子类自行成为 `Sendable`。与其依赖“没有写一致性”来隐含表达意图，现在可以直接把决定写进类型系统。

### 不再静默吞掉 Task 错误

Swift Concurrency 现在会在你忽略 `Task` 抛出的错误时发出警告。被静默丢弃的任务错误造成过不少真实 Bug，这项检查早该存在。

### `defer` 可以调用异步函数

过去不能在 `defer` 中调用 `async` 函数的限制已经移除。

### 两个成员初始化器

当结构体混合了 `internal` 与 `private` 存储属性时，编译器现在会分别合成两个对应访问级别的成员初始化器，不再迫使你手写。

### `@diagnose`：按声明控制诊断级别

这是我最喜欢的一项语法改进。现在可以在单个声明上提升或降低某项诊断：

```swift
@diagnose(DeprecatedDeclaration, as: ignored, reason: "Flying with surplus hardware")
func makeApolloSoyuzMission() -> Mission { ... }

@diagnose(StrictMemorySafety, as: warning)
func uplinkCommand(from receiver: inout Receiver, to computer: inout Computer) { ... }

@diagnose(ErrorInFutureSwiftVersion, as: error)
func fetchPosition() -> (x: Double, y: Double, z: Double) { ... }
```

无需再为了一个特殊调用点修改整个项目的警告设置，`reason:` 也顺便为后来者留下了解释。

### 模块选择器 `::`（Swift 6.3）

两个导入模块导出同名符号时，Swift 过去往往需要借助 typealias 绕开冲突。Swift 6.3 新增 `::`，可以明确指定符号所属模块：

```swift
import Rocket
import GiftShopToys

let r1 = SaturnV()          // 有歧义
let r2 = Rocket::SaturnV()  // 明确使用 Rocket 模块
```

它同样适用于成员，例如 `technician.HumanResources::fire()`。

---

## 2. 库更新

### 标准库

- **`withTaskCancellationShield { ... }`**：即使外围任务被取消，也能保证关键区段完成，例如发送最后一条 SOS 数据包。
- **`Dictionary.mapKeyedValues`**：转换字典值时仍可访问键：

  ```swift
  missions.mapKeyedValues { mission, window in
      makeDisplayName(for: mission, in: window)
  }
  ```

- **`FilePath`**：真正跨平台、拥有结构化 `components` 的路径类型：

  ```swift
  var path: FilePath = "/var/www/static"
  path.components.append("WWDC")
  // [ "var", "www", "static", "WWDC" ]
  ```

### Swift Testing

- **Issue 严重级别**：`Issue.record(..., severity: .warning)` 可以记录问题而不让测试失败。
- **`try Test.cancel("reason")`**：参数化用例不适用时，可以带原因干净退出。
- **重复执行不稳定测试**：`swift test` 可以在指定次数内反复运行测试，直到成功或失败，适合追踪间歇性问题。
- **XCTest 互操作**：可以在 `XCTestCase` 中使用 `#expect`，XCTest 断言失败也会显示为 Swift Testing Issue。迁移不再必须一次完成。

### Subprocess 1.0

`Subprocess` 包正式到达 **1.0**。API 更简洁、错误处理更完整，并支持跨平台逐行流式读取输出：

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

### Foundation：`ProgressManager`

新的进度类型专为 `async`／`await` 设计，关键在于把“进度组合”与“进度报告”分开。父任务通过 `subprogress(assigningCount:)` 分配总进度的一部分，子任务只需报告自己的局部阶段：

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

Foundation 也继续迁移到纯 Swift 实现，包括更快的 `Data` 操作与桥接，以及 `NSURL`／`CFURL` 背后的统一 Swift 实现。

---

## 3. 跨平台能力

这是近几年增长最明显的部分。Swift 正在认真面对 Apple 平台之外的使用场景。

### `anyAppleOS`：压缩可用性样板代码

过去需要列出六个平台的 `@available`，现在可以统一表达：

```swift
// 以前
@available(macOS 27, iOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func showStatus() { ... }

// 现在
@available(anyAppleOS 27, *)
func showStatus() { ... }
```

它也可以用于 `#if os(anyAppleOS)`。

### `@C`：从 C 调用 Swift

只要签名使用整数、指针、导入的 C 结构体或 raw-value 枚举等 C 兼容类型，`@C` 就可以把 Swift 函数直接暴露给 C，也可以让 Swift 实现一个 C 函数：

```swift
@C
func averageLaunchWindowLength(_ windows: Span<LaunchWindow>) -> TimeInterval { ... }
```

### Swift–Java 与 Android

Java 现在可以调用 Swift 的 `async` 和 `throws` 函数，Java 类也可以遵循 Swift 协议。更重要的是，swift.org 已提供官方 Swift Android SDK。

### WebAssembly

Swift 可以通过开源工具链编译为 Wasm。JavaScriptKit 的类型安全桥接路径现在比动态路径快 **35–40 倍**。Session 中还提到 Goodnotes 将原生 iOS 的 Swift 代码通过 Wasm 直接带到 Web。

### Embedded Swift

嵌入式子集继续扩展，同时保持较小二进制体积：支持 existential type、无类型 `throws`，以及用于受限设备 coredump 调试的 DWARF 信息。新的 `EmbeddedRestrictions` 警告组会标记无法用于嵌入式环境的能力。

### 编辑器支持

Swift VS Code 扩展现在集成 Swiftly 工具链管理，并发布到 OpenVSX，因此 Cursor、VSCodium 等编辑器也能获得一等 Swift 支持，同时还为新用户提供入门检查清单。

---

## 4. 性能

性能部分的主线，是给予开发者更明确的控制，并把 Swift 的所有权模型扩展到更多标准库能力。

### 优化器提示

- **`@inline(always)`** 现在是正式支持的属性；用于类方法时应配合 `final`。
- **`@specialized`**（Swift 6.3）可以针对已知热点具体类型预特化泛型函数：

  ```swift
  @specialized(where Values == [UInt8])
  func histogram<Values>(of values: Values) -> [256 of Int]
      where Values: Sequence<UInt8> { ... }
  ```

### 所有权进入标准库

`Equatable`、`Comparable` 和 `Hashable` 现在支持 **noncopyable** 类型；`Equatable` 与 `Comparable` 也扩展到 **non-escapable** 类型。关联类型可以声明为 `~Copyable` 或 `~Escapable`。新的 `Iterable` 协议会让 `for` 循环借用元素，而不是复制。

新的自定义访问器让这些能力可以真正用于容器：

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

- **`UniqueBox`／`UniqueArray`**：没有引用计数开销的 noncopyable 存储。
- **`Continuation`**：在编译期验证只恢复一次，拥有 `CheckedContinuation` 的安全性和 `UnsafeContinuation` 的成本。
- **`Ref`／`MutableRef`**：安全借用集合中的某个位置：

  ```swift
  var countRef = MutableRef(&counts[key, default: 0])
  countRef.value += 1
  ```

- **`withTemporaryAllocation`** 现在提供 `OutputSpan`，不再直接暴露 `UnsafeMutableBufferPointer`。

---

## 贯穿整场 Session 的主线

完整看下来，这次更新与 Swift 近年的方向一致：**让安全、明确的写法同时成为最容易的写法。**

`@diagnose` 明确警告意图，`~Sendable` 和 `weak let` 明确并发意图，所有权能力则把编译期保证带进普通类型，而不是把责任留给 `Unsafe*` 逃生口。Android、Wasm、`@C` 与 `anyAppleOS` 也说明 Swift 正在安静但坚定地把自己定位为通用系统语言，而不仅仅是编写 iOS App 的语言。

这些变化没有哪一项特别炫目，却都减少了开发者转向不安全方案的理由。这正是我喜欢的发布类型。

> 完整 Session：[What's new in Swift — WWDC26](https://developer.apple.com/videos/play/wwdc2026/262/)。
