---
title: swift-format 全配置解析：每个选项到底改变了什么
published: 2026-09-21
description: 逐条拆开 swift-format 的配置项和规则，每条给出最小代码对比，并说明我在自己的 iOS 项目里选了什么
tags: [Swift, swift-format, Xcode, Tooling]
category: Engineering
draft: false
lang: zh_CN
translationKey: swift-format-configuration
---

给我自己的 iOS 项目 Atofolio 写 `.swift-format` 的时候，我发现官方文档对每个选项只有一句话的描述。像 `prioritizeKeepingFunctionOutputTogether` 这种名字，读完那句话我依然不知道它会把代码改成什么样。

所以我把每个选项都跑了一遍：默认值格式化一次，改过的值格式化一次，看两边的 diff。这篇文章是那次实验的记录。

本文所有输出都来自 Xcode 27 自带的 swift-format（`xcrun --find swift-format`，`--version` 报告为 `main`），macOS 27，Swift 6.4。swift-format 的行为跟版本绑定得很紧，如果你用的是 Swift Package Manager 单独装的版本，个别规则的输出可能不一样。

## 先看结果

这是同一段代码在两份配置下的输出。前一段是默认值（2 空格、不省略 `return`、参数尽量挤在一行），后一段是我的配置：

```swift
// 默认配置
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
// 我的配置
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

两段代码的语义完全一样，差别全部来自配置。下面逐条拆。

## 实验方法

如果你想自己验证，方法很简单。先导出默认配置作为基准：

```bash
xcrun swift-format dump-configuration > default.json
```

然后用 `jq` 改掉一个键，对两份配置的输出做 diff：

```bash
jq '.indentation.spaces = 4' default.json > patched.json
diff <(xcrun swift-format format --configuration default.json a.swift) \
     <(xcrun swift-format format --configuration patched.json a.swift)
```

有一点很容易踩：**swift-format 的规则分两类**。一类会改写代码（format rule），另一类只报告问题（lint-only rule）。如果你只跑 `format`，会发现 `NeverForceUnwrap` 这样的规则"什么都没做"，并误以为它无效。它们只在 `swift-format lint` 下出现：

```bash
xcrun swift-format lint --configuration patched.json a.swift
```

下面每一条我都标了它属于哪一类。

---

## 一、排版类选项

### lineLength

一行最多多少个字符。超过就触发换行策略。

```diff
+// lineLength: 80
-let view = makeRow(title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
+let view = makeRow(
+  title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
```

**我的选择：100（默认值）。** Swift 的类型名和参数标签本来就长，80 会让 SwiftUI 的 view 代码碎成一片。100 是 Google Swift Style Guide 的值，也是 swift-format 的默认值。

### indentation

一级缩进用什么。可以写 `{"spaces": N}` 或 `{"tabs": N}`。

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

**我的选择：`{"spaces": 4}`。** swift-format 默认 2 空格，但 Xcode 的默认编辑器设置是 4 空格，Apple 自家的示例代码也是 4。我不想让「Xcode 里手敲的缩进」和「格式化后的缩进」不一致。

### tabWidth

这个选项的名字有误导性。它不是"缩进宽度"，而是**一个 tab 字符在计算行长时算几列**。

如果 `indentation` 用的是空格，这个值完全不影响输出。只有用 tab 缩进时才有区别 —— 下面两段是同一份代码、同样的 `lineLength: 60`、同样的 tab 缩进，只差 `tabWidth`：

```swift
// tabWidth: 8 —— 两层 tab 被算作 16 列，剩余空间不够，于是换行
func outer() {
	func inner() {
		let r = compute(
			alpha: 1, beta: 2, gamma: 3,
			delta: 44)
	}
}

// tabWidth: 4 —— 两层 tab 只算 8 列，一行放得下
func outer() {
	func inner() {
		let r = compute(alpha: 1, beta: 2, gamma: 3, delta: 44)
	}
}
```

**我的选择：4，但说实话这一条在我的配置里不起作用。** 因为我用空格缩进，swift-format 根本不会遇到需要折算宽度的 tab。我留着它只是为了和编辑器设置保持一致，不留也一样。

### indentBlankLines

空行要不要补上当前层级的缩进（也就是留下一串尾随空格）。

```diff
 func f() {
     let a = 1
-
+    ⎵⎵⎵⎵
     let b = 2
 }
```

（上面的 `⎵` 是实际产生的空格。）

**我的选择：false（默认值）。** 打开它会制造尾随空白，和大多数编辑器的「保存时删除行尾空格」以及 git diff 的习惯冲突。

### maximumBlankLines

允许连续几个空行，多的折叠掉。

```diff
 let a = 1
 
-
 let b = 2
```

（上面是 `2` 改回默认 `1` 的效果。）

**我的选择：1（默认值）。** 我用空行分隔逻辑块，但不需要两行以上的间隔来表示"更大的分隔"——那是标题注释该干的事。

### spacesBeforeEndOfLineComments

行尾 `//` 注释前面留几个空格。

```diff
-let a = 1  // one
-let bb = 22  // two
+let a = 1 // one
+let bb = 22 // two
```

（上面是改成 `1` 的效果。）注意它不做对齐，只保证固定数量的空格。

**我的选择：2（默认值）。** 一个空格时注释和代码贴得太近，两个空格视觉上能分开。

### spacesAroundRangeFormationOperators

`...` 和 `..<` 两边加不加空格。

```diff
-let r = 0..<10
-let c = 1...5
+let r = 0 ..< 10
+let c = 1 ... 5
```

**我的选择：false（默认值）。** `0..<10` 我读成一个整体，加空格反而像三个独立的词。

### indentConditionalCompilationBlocks

`#if` / `#endif` 里面的代码要不要多缩进一层。

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

（默认 true 就是右边的样子。）

**我的选择：true（默认值）。** `#if` 是一个有开有合的结构，内容缩进一层符合直觉。

### indentSwitchCaseLabels

`case` 要不要相对 `switch` 缩进。

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

**我的选择：false（默认值）。** 这是 Swift 社区的主流写法，Apple 文档也是这么排的。打开之后 switch 会整体往右推两层，在已经嵌套的代码里很占地方。

---

## 二、换行策略

这一组决定了「一行放不下的时候，从哪里断开」。

### respectsExistingLineBreaks

要不要尊重你已经手写的换行。

```diff
-let a = compute(
-  x: 1,
-  y: 2
-)
+let a = compute(x: 1, y: 2)
 let b = 1 + 2
```

（上面是改成 false 的效果：所有能合并的都合并。）

**我的选择：true（默认值）。** 这是我认为最重要的一条。关掉它，swift-format 会变成一个「最大化行密度」的机器，你为了表达分组而手动拆开的参数列表会被无情合并。打开它，手写的换行只要不违反规则就保留 —— 格式化工具负责下限，人负责表达。

### lineBreakBeforeEachArgument

当参数列表一行放不下时：是尽量塞满每一行，还是每个参数单独一行。

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

函数声明也一样：

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

**我的选择：true。** 默认的塞满式换行有个实际问题：加一个参数会让后面所有参数重新排列，diff 里看起来像改了五行，其实只加了一个。一参数一行之后，加参数就是加一行。SwiftUI 的初始化器参数又多又长，这个差别在 code review 里很明显。

代价是竖向行数变多。我接受。

### lineBreakBeforeEachGenericRequirement

同一件事，作用在 `where` 子句上。

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

注意：只有 `where` 子句长到放不下时才会触发，短的不受影响。

**我的选择：true。** 和上一条同一个理由，保持一致。实际上我的项目里还没有长到需要换行的 `where` 子句，这一条目前是写给未来的。

### lineBreakBeforeControlFlowKeywords

`else` / `catch` 这类关键字要不要另起一行。

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

**我的选择：false（默认值）。** `} else {` 是 Swift 的通用写法，改成 Allman 风格会让代码在任何 Swift 项目里都显得突兀。

### lineBreakBetweenDeclarationAttributes

多个属性要不要各占一行。

```diff
-@MainActor @preconcurrency final class Store {
+@MainActor
+@preconcurrency
+final class Store {
   var value = 0
 }
```

**我的选择：false（默认值）。** SwiftUI 里 `@State private var` 这种组合太常见了，强制拆行会让属性声明区域变成一片竖条。而且这个选项是全局的，没法只对「长属性」生效。

### lineBreakAroundMultilineExpressionChainComponents

链式调用放不下时，是在方法名之间断开，还是在参数括号里断开。

```diff
-let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted().joined(
-  separator: ", ")
+let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted()
+  .joined(separator: ", ")
```

**我的选择：false（默认值）。** 这条我犹豫过。打开之后链式调用的断点更符合语义（在 `.` 处断），但它的行为是「强制在多行链的每个组件前后换行」，一旦某条链被判定为多行，整条链都会散开。默认值的输出在我的代码里够用，暂时不动。

### prioritizeKeepingFunctionOutputTogether

函数签名放不下时，优先保住哪部分。这是本文里我最喜欢的一条。

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

默认值（false）会把返回类型甩到下一行，然后因为签名跨行，左花括号也被迫单独占一行 —— 结果是三行签名加一个孤零零的 `{`。打开之后，参数列表被拆开，但 `) throws -> Configuration {` 保持在一起。

**我的选择：true。** 返回类型是函数签名里信息量最大的部分之一，把它和参数列表切散没有道理。另外那个孤立的 `{` 在一堆 4 空格缩进的代码里特别扎眼。

---

## 三、尾随逗号

两个选项，后者会覆盖前者。

### multiElementCollectionTrailingCommas

多元素的数组/字典字面量，最后一个元素后面加不加逗号。

```diff
 let colors = [
   "red",
   "green",
-  "blue"
+  "blue",
 ]
```

单元素的集合不受影响 —— `["only"]` 拆成多行时不会加逗号。

**我的选择：true（默认值），但它在我的配置里已经不起作用了。** 原因见下一条。

### multilineTrailingCommaBehavior

作用范围更大：参数列表、元组等所有「对称分隔的逗号列表」，也包括集合字面量。三个取值：

- `keptAsWritten`（默认）：你写了就保留，没写就不加，集合字面量交给上一个选项处理
- `alwaysUsed`：多行列表一律补上
- `neverUsed`：一律删掉

```diff
 let view = makeRow(
   title: "Title",
   subtitle: "Subtitle",
-  icon: iconName,
+  icon: iconName
 )
```

**我的选择：`neverUsed`。**

我一开始设的是 `alwaysUsed`。理由是尾随逗号能让最后一个元素和其他元素一样容易增删、重排，加一个参数只动一行 diff。这个理由本身没错，但它有个覆盖不到的地方：`multilineTrailingCommaBehavior` 顾名思义只管**多行**列表。单行的 `makeRow(title: "a", subtitle: "b")` 永远不会被加上逗号。

于是 `alwaysUsed` 实际得到的是「多行有、单行没有」的分裂规则——同一个调用，因为长度跨过 100 列就换一种写法。`neverUsed` 则是一条规则管所有情况：任何地方都没有尾随逗号。我后来换成了后者。

代价是放弃了 diff 上的那点好处。换来的是不用再去想「这个列表现在是单行还是多行」。

**两个连带影响。**

一是 `neverUsed` 会覆盖 `multiElementCollectionTrailingCommas`。即使后者仍然是 `true`，集合字面量的尾随逗号照样被删掉：

```swift
// multiElementCollectionTrailingCommas: true + multilineTrailingCommaBehavior: neverUsed
let colors = [
    "red",
    "green",
    "blue"
]
```

也就是说 `multiElementCollectionTrailingCommas` 这一行在我的配置里现在是空转的。留着是为了将来改回 `keptAsWritten` 时不用重新想，但它确实不影响任何输出。

二是编译器版本要求消失了。参数列表里的尾随逗号是 [SE-0439](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0439-trailing-comma-lists.md) 引入的语法，**需要 Swift 6.1 及以上的编译器**（我实测过，它不受语言模式限制，用 `-swift-version 5` 也能编译，只要编译器够新）。选 `alwaysUsed` 意味着产出的代码在旧工具链上编译不过；选 `neverUsed` 就没有这个问题。

**顺便一个 bug。** 手写的单行尾随逗号语法上是合法的（`makeRow(title: "a", subtitle: "b",)` 和 `[1, 2, 3,]` 都能编译），但 swift-format 处理得不干净。`neverUsed` 删掉逗号后会留下一个空格，要跑第二遍才收敛：

```swift
// 输入
let v = makeRow(title: "a", subtitle: "b",)

// 第一遍
let v = makeRow(title: "a", subtitle: "b" )

// 第二遍
let v = makeRow(title: "a", subtitle: "b")
```

默认的 `keptAsWritten` 更糟：它把 `("b", )` 原样留着，跑多少遍都不变。集合字面量没有这个问题。实际写代码时不太会手打单行尾随逗号，但如果你是从别的项目迁移过来的，值得跑两遍格式化再提交。

### reflowMultilineStringLiterals

多行字符串字面量里，超长的行要不要用 `\` 续行重排。

```swift
// never（默认）
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

第三个取值 `always` 的文档说明是「总是重排，忽略已有的转义换行」。在我试过的几个例子里，它和 `onlyLinesOverLength` 的输出一致 —— 它不会把短行合并起来。区别应该只在已经含有 `\` 续行的字面量上。

**我的选择：`onlyLinesOverLength`。** 我不希望字符串字面量成为唯一能突破 100 列的地方（那会让 `lineLength` 形同虚设），但也不想让格式化工具去动那些我按行写好的短文本。这个中间值刚好。

---

## 四、带参数的三个选项

### fileScopedDeclarationPrivacy

文件级的私有声明统一用 `private` 还是 `fileprivate`。对应 `FileScopedDeclarationPrivacy` 规则。

```diff
-fileprivate let cache = 1
-fileprivate func helper() {}
+private let cache = 1
+private func helper() {}
```

在文件作用域，这两个关键字的语义完全相同，所以这纯粹是统一写法。

**我的选择：`private`（默认值）。** 短，而且和类型内部的 `private` 视觉一致。

### noAssignmentInExpressions

`NoAssignmentInExpressions` 规则的白名单：哪些函数允许在参数里写赋值。

默认值是 `["XCTAssertNoThrow"]`，因为 `XCTAssertNoThrow(x = try compute())` 是测试里的常见写法。清空白名单后，这一行就会被报告：

```text
warning: [NoAssignmentInExpressions] move this assignment expression into its own statement
```

**我的选择：保持默认的 `["XCTAssertNoThrow"]`。** 我的项目用 Swift Testing 而不是 XCTest，所以这个白名单目前是空转的。留着默认值没有成本。

### orderedImports

`OrderedImports` 规则的两个开关。

`shouldGroupImports`（默认 true）：把不同种类的 import 分组，中间空一行。

```diff
 import Foundation
+import UIKit
+
+import enum Swift.Optional
+
 @testable import MyApp
-import UIKit
```

顺序是：普通 import → 单个符号的 import（`import enum Swift.Optional`）→ `@testable` import，组内按字母序。关掉之后全部混在一起，只按字母序排。

`includeConditionalImports`（默认 false）：`#if` 块里的 import 要不要也排序。

```diff
 #if canImport(Combine)
-  import Combine
   import Accelerate
+  import Combine
 #endif
```

**我的选择：两个都保持默认（分组 = true，条件编译 = false）。** 分组让 `@testable` 一眼可见。条件编译块里的 import 顺序有时候是有意义的（比如依赖关系），我不想让工具去动它。

---

## 五、我额外打开的 10 条规则

以下规则默认是关闭的，我打开了。

### AlwaysUseLiteralForEmptyCollectionInit（会改写）

```diff
-var names = [String]()
-var lookup = [String: Int]()
+var names: [String] = []
+var lookup: [String: Int] = [:]
```

**为什么开：** 两种写法等价，但后者把类型写在类型的位置上。类型标注在声明的左边，值在右边，这和 `var x: Int = 0` 的形状一致。

### BeginDocumentationCommentWithOneLineSummary（只报告）

要求文档注释的第一句是独立的一行摘要。

```swift
/// Returns the sum of two integers. This function is very simple. It adds them.
func add(_ a: Int, _ b: Int) -> Int { a + b }
```

```text
warning: [BeginDocumentationCommentWithOneLineSummary]
add a blank comment line after this sentence: "Returns the sum of two integers."
```

**为什么开：** Xcode 的 Quick Help 和 DocC 都只取第一段作为摘要。摘要写成三句话，快速查看里就会看到一大坨。

### NeverForceUnwrap / NeverUseForceTry / NeverUseImplicitlyUnwrappedOptionals（都只报告）

```text
warning: [NeverForceUnwrap] do not force unwrap 'Int(s!)'
warning: [NeverUseForceTry] do not use force try
warning: [NeverUseImplicitlyUnwrappedOptionals] use 'String' or 'String?' instead of 'String!'
```

**为什么开：** Atofolio 是个导入外部数据的归档应用 —— Bangumi、Steam、Apple Music 的字段随时可能缺失或变形。项目的第一原则是「不编造缺失的信息，未知就保持未知」。`!` 是和这条原则最直接冲突的语法：它把「这里可能没有值」变成「这里没有值就崩溃」。

这三条只在 `lint` 下报告，不会改写代码 —— 也不该改写，因为正确的修法（`guard let`、`do/catch`、改类型）取决于上下文。

代价是会有一些无法避免的报告。UIKit 的 `@IBOutlet` 按设计就是隐式解包的，`Bundle.main.url(forResource:)` 这类「资源一定在 app 包里」的调用也很难不写 `!`。这种时候用一行注释单点豁免：

```swift
// swift-format-ignore: NeverUseImplicitlyUnwrappedOptionals
var label: String!
```

这条指令只对紧随其后的那个声明生效，后面的声明照常检查。整个文件豁免用 `// swift-format-ignore-file`。

### NoEmptyLinesOpeningClosingBraces（会改写）

```diff
 struct S {
-
   var x = 1
-
 }
```

**为什么开：** 紧贴花括号的空行不表达任何分组，只是敲回车时留下的痕迹。

### OmitExplicitReturns（会改写）

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

**为什么开：** SwiftUI 的 `body` 和大量计算属性都是单表达式。既然语言已经允许省略，就让工具统一省掉，而不是让每个人凭习惯决定。配合下面这条默认规则 `UseSingleLinePropertyGetter`（它会去掉多余的 `get { }`），计算属性能一路简化到只剩表达式本身。

这条我保留一点怀疑：省掉 `return` 之后，单表达式函数和闭包在视觉上更难区分。但在 SwiftUI 代码里收益更大。

### UseEarlyExits（会改写）

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

**为什么开：** `guard` 把「不满足条件就退出」的意图写在前面，主逻辑留在最外层缩进。这是 Swift 里少见的、工具能可靠自动完成的语义级改写。

注意它只处理 `else` 分支只有一个退出语句的情况，不会乱动复杂分支。

### UseWhereClausesInForLoops（会改写）

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

**为什么开：** 少一层缩进，而且 `where` 把「筛选」和「处理」在语法上分开了。

### ValidateDocumentationComments（只报告）

检查文档注释的参数列表和实际签名是否一致。

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

**为什么开：** 文档注释和签名不同步是最难发现的一类错误，因为它不影响编译也不影响运行，只会误导下一个读代码的人（通常是我自己）。

---

## 六、默认就开着的规则

这些规则 swift-format 默认开启，我全部保留。按作用分组，每条一个最小例子。

### 自动改写类

**DoNotUseSemicolons** —— 分号换成换行。

```diff
-let a = 1; let b = 2;
+let a = 1
+let b = 2
```

**FullyIndirectEnum** —— 所有 case 都 `indirect` 时，提升到 enum 上。

```diff
-enum Tree {
-  indirect case node(Tree, Tree)
-  indirect case leaf(Tree)
+indirect enum Tree {
+  case node(Tree, Tree)
+  case leaf(Tree)
 }
```

**GroupNumericLiterals** —— 长数字字面量加下划线分组。

```diff
-let big = 1000000
-let hex = 0xFFFFFFFF
+let big = 1_000_000
+let hex = 0xFFFF_FFFF
 let bin = 0b11110000
```

注意最后一行没被改：8 位的二进制字面量在阈值内。

**NoAccessLevelOnExtensionDeclaration** —— 访问级别从 extension 移到成员上。

```diff
-public extension String {
-  func shout() -> String { uppercased() }
+extension String {
+  public func shout() -> String { uppercased() }
 }
```

**NoAssignmentInExpressions** —— 把表达式里的赋值拆成独立语句。

```diff
 func f() -> Int {
   var x = 0
-  return x = 5
+  x = 5
+  return
 }
```

（这个例子里的原始代码本来就可疑，改写结果也不一定能编译。这条规则的价值在于它逼你去看那一行。）

**NoCasesWithOnlyFallthrough** —— 合并只有 `fallthrough` 的 case。

```diff
-  case 1:
-    fallthrough
-  case 2:
+  case 1, 2:
     print("small")
```

**NoEmptyTrailingClosureParentheses** —— 尾随闭包前的空括号。

```diff
-  UIView.animate() {
+  UIView.animate {
```

**NoLabelsInCasePatterns** —— case 模式里多余的标签。

```diff
-  case .a(x: let x, y: let y):
+  case .a(let x, let y):
```

**NoParensAroundConditions** —— 条件外面的括号。

```diff
-  if (x > 0) {
+  if x > 0 {
-  while (x < 10) { break }
+  while x < 10 { break }
```

**NoVoidReturnOnFunctionSignature** —— 函数签名上显式的 `-> Void`。

```diff
-func f() -> Void {}
-func g() -> () {}
+func f() {}
+func g() {}
```

**ReturnVoidInsteadOfEmptyTuple** —— 闭包类型里的 `()` 换成 `Void`。

```diff
-let handler: (Int) -> () = { _ in }
+let handler: (Int) -> Void = { _ in }
```

和上一条方向相反，但不矛盾：函数签名上的返回类型直接删掉，类型标注里的则写成 `Void`。

**OneCasePerLine** —— 带关联值或原始值的 case 单独成行。

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

注意不带值的 `case a, b` 被保留在一行。

**OneVariableDeclarationPerLine** —— 一行一个变量。

```diff
-let a = 1, b = 2, c = 3
+let a = 1
+let b = 2
+let c = 3
```

**UseExplicitNilCheckInConditions** —— 丢弃绑定值的 `if let _` 换成 nil 比较。

```diff
-  if let _ = x {
+  if x != nil {
```

**UseLetInEveryBoundCaseVariable** —— `case let .a(x, y)` 换成每个绑定都写 `let`。

```diff
-  case let .a(x, y):
+  case .a(let x, let y):
```

**UseShorthandTypeNames** —— 泛型写法换成简写。

```diff
-var a: Array<Int> = []
-var b: Optional<String> = nil
-var c: Dictionary<String, Int> = [:]
+var a: [Int] = []
+var b: String? = nil
+var c: [String: Int] = [:]
```

**UseSingleLinePropertyGetter** —— 只读属性里多余的 `get { }`。

```diff
   var x: Int {
-    get {
-      return 1
-    }
+    return 1
   }
```

**UseTripleSlashForDocumentationComments** —— 块注释文档换成 `///`。

```diff
-/**
- * A documented function.
- */
+/// A documented function.
 func f() {}
```

**FileScopedDeclarationPrivacy** 和 **OrderedImports** 前面已经讲过（它们各自有配置项）。

### 只报告类

这些规则不会改代码，只在 `lint` 下报告。

| 规则 | 触发例子 | 报告内容 |
| --- | --- | --- |
| AlwaysUseLowerCamelCase | `let Max_Count = 10` | rename the constant 'Max_Count' using lowerCamelCase |
| TypeNamesShouldBeCapitalized | `struct myStruct {}` | rename the struct 'myStruct' using UpperCamelCase |
| DontRepeatTypeInStaticProperties | `static let redColor = Color()` | remove the suffix 'Color' from the name of the variable 'redColor' |
| IdentifiersMustBeASCII | `let café = 1` | remove non-ASCII characters from 'café': é |
| AmbiguousTrailingClosureOverload | 两个只差标签的闭包参数重载 | rename 'f(a:)' so it is no longer ambiguous when called with a trailing closure |
| AvoidRetroactiveConformances | `extension URL: @retroactive Identifiable` | do not declare retroactive conformances |
| NoBlockComments | `/* comment */` | replace this block comment with line comments |
| NoPlaygroundLiterals | `#colorLiteral(...)` | replace '#colorLiteral' with a call to an initializer on 'NSColor' or 'UIColor' |
| OnlyOneTrailingClosureArgument | 同时用闭包参数和尾随闭包 | revise this function call to avoid using both closure arguments and a trailing closure |
| ReplaceForEachWithForLoop | `xs.forEach { ... }` | replace use of '.forEach { ... }' with for-in loop |
| UseSynthesizedInitializer | 与编译器合成版完全一致的 init | remove this explicit initializer |

这一组我没有特别的意见，它们报告的都是实打实的问题。唯一想提一句的是 `ReplaceForEachWithForLoop`：`forEach` 里不能用 `break`/`continue`，`return` 的语义也和直觉不同（它只退出当前一次闭包调用），换成 `for-in` 确实更安全。

## 七、我保持关闭的两条

这两条 swift-format 默认就是关闭的，我也没有打开。

**AllPublicDeclarationsHaveDocumentation** —— 要求每个 public 声明都有文档注释。

```text
warning: [AllPublicDeclarationsHaveDocumentation] add a documentation comment for 'S'
```

**为什么关：** Atofolio 是个 app，不是库。App target 里的 `public` 大多是跨模块的技术需要，不是给外部使用者看的 API。强制写文档只会产出「`/// The title.`」这种复述名字的注释。如果哪天我把数据层拆成独立的 package，会在那个 package 里单独打开它。

**NoLeadingUnderscores** —— 禁止下划线开头的标识符。

```text
warning: [NoLeadingUnderscores] remove the leading '_' from the name '_internalValue'
```

**为什么关：** 前导下划线在 Swift 里是有语法含义的。`@State var x` 会生成一个叫 `_x` 的 property wrapper 实例，自己实现 property wrapper 时也经常用 `_` 开头的名字表示底层存储。打开这条会和语言特性打架。

---

## 八、一些实际使用上的坑

**配置文件的查找方式。** 不带 `--configuration` 运行时，swift-format 从被格式化的文件所在目录开始向上找 `.swift-format`，找到第一个就用。我实测过深层子目录里的文件也能找到仓库根目录的配置，所以放一份在根目录就够了。（Xcode 内置的格式化功能是不是完全同一套查找逻辑，我没有能脚本化验证的办法，没有下结论。）

**未知的键不会报错。** 写错一个顶层键名（比如 `lineLenght`），swift-format 会静默忽略，你会以为设置生效了其实没有。但写错**规则名**会警告：

```text
warning: Configuration contains an unrecognized rule: BogusRule
```

所以配置文件最好用 `dump-configuration` 生成，再改具体的值，而不是手写。

**规则列表和工具链绑定。** 我这份配置的规则列表和 Xcode 27 自带的 swift-format 完全一致。但 swift-format 的 `main` 分支已经有了新规则（比如 `SwiftTestingNamingConventions`），它们不在这份配置里 —— 缺失的规则会使用默认值。换工具链之后值得重新 `dump-configuration` 一次，对比有没有新条目。

**`format` 和 `lint` 是两个命令。** 前面反复提到：会改写的规则在 `format` 下生效，只报告的规则要跑 `lint` 才看得到。CI 里两个都要跑，否则 `NeverForceUnwrap` 这一类规则等于没开。

```bash
xcrun swift-format lint --strict --recursive --parallel Sources
xcrun swift-format format --in-place --recursive --parallel Sources
```

---

## 完整配置

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

上面只是我改动过的部分。完整文件里还有其余 31 条默认开启的规则，值都是 `true`，可以用 `xcrun swift-format dump-configuration` 生成后合并。

归纳一下我的取舍标准，其实只有三条：

一是**让 diff 稳定**——一参数一行、一行一个变量，都是为了「改一个东西只动一行」。尾随逗号本来也在这一类，最后没留住，因为它做不到所有情况一致。

二是**让工具管下限，人管表达**——`respectsExistingLineBreaks: true` 是这一条的核心，我不想要一个把所有手工换行抹平的格式化器。

三是**把项目的原则写进配置**——Atofolio 的原则是不编造缺失信息，那 `NeverForceUnwrap` 这一组就应该是开的。配置文件是能执行的项目约定，不只是排版偏好。

这三条偶尔会互相冲突。尾随逗号那一条就是：diff 稳定和规则一致撞在一起，我选了后者。
