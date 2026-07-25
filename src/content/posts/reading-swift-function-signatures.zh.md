---
title: 我是怎么学会读 Swift 函数签名的
published: 2026-05-07
tags: [Swift, Programming]
category: Engineering
draft: false
lang: zh_CN
translationKey: reading-swift-function-signatures
---

刚开始学 Swift 时，我打开 Apple 的 DocC 文档，只要看到下面这种东西，就会直接往下翻示例：

```swift
func compactMap<ElementOfResult>(
    _ transform: (Self.Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

当时最真实的想法就是：一个函数为什么非得写得这么吓人？

我之前更习惯 Python 这种看起来很直接的 API：

```python
map(func, arr)
filter(func, arr)
```

而 Swift 会把泛型、`Optional`、关联类型、协议约束、`throws` 和 `rethrows` 一起塞进函数签名里。我把它们都当成了妨碍阅读的语法，能跳过就跳过。照着示例抄代码当然没问题，但一旦碰到不熟悉的 API，这种读法就不太够用了。

## 先找输入和输出

后来我给自己定了一个很简单的读法：先别管尖括号里有多少东西，只看值从哪里进、变成什么、又从哪里出来。

比如 `map`：

```swift
func map<T>(
    _ transform: (Element) throws -> T
) rethrows -> [T]
```

沿着箭头拆开，就是：

- 闭包每次接收一个 `Element`；
- 它把这个元素转换成某种类型 `T`；
- `map` 把所有结果收集成 `[T]`；
- 闭包可以抛出错误；
- `rethrows` 表示只有传入的闭包抛错时，`map` 才会抛错。

`T` 到底是什么，要到调用时才知道。但输入元素和输出结果不必同型，这件事已经写在签名里了。

读得多了以后，我发现不少吓人的签名不过是在组合几种常见形状：

```swift
(Element) -> T
(Element) -> T?
Sequence<Element>
where T : BinaryInteger
```

它们分别表示“把 `Element` 变成 `T` 的函数”、“可能产生 `T` 的函数”、“元素类型为 `Element` 的序列”，以及“必须符合 `BinaryInteger` 协议的泛型 `T`”。先认出这些零件，比背住某一个调用示例更有用；标准库和第三方 API 都会反复使用同样的类型关系。

## 把 `map`、`compactMap` 和 `flatMap` 放在一起看

我最初只记得 `map` 的调用方式：

```swift
arr.map { ... }
```

真正分清这三个方法，是把闭包的返回类型和方法的返回类型放在一起比较之后。

`compactMap` 最关键的信息，就是闭包返回值上的那个 `?`：

```swift
func compactMap<ElementOfResult>(
    _ transform: (Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

转换闭包可以得到一个 `ElementOfResult`，也可以得到 `nil`；最终数组里却只有非可选的 `ElementOfResult`。所以它会尝试转换每个输入，并丢掉结果为 `nil` 的项。以前我只笼统地记成“遇到 Optional 就用它”，签名表达得其实更准确。

`flatMap` 针对序列的这个重载要长一些：

```swift
func flatMap<SegmentOfResult>(
    _ transform: (Element) throws -> SegmentOfResult
) rethrows -> [SegmentOfResult.Element]
where SegmentOfResult : Sequence
```

`where` 子句要求每次转换得到的 `SegmentOfResult` 本身也是一个 `Sequence`。再看返回类型：结果不是“序列组成的数组”，而是“这些内部序列的元素组成的数组”。

于是，这样的嵌套值：

```plain
[[1], [2,2], [3,3,3]]
```

可以被摊平成：

```plain
[1,2,2,3,3,3]
```

看懂这层关系以后，`flatMap` 就不再是什么“高级版 map”。至少对这个重载而言，它做的是把每个元素转换成序列，再把这些序列合成一个数组。

## 返回类型也会写出边界条件

函数签名不一定要很长才有用。下面这一行已经把空集合怎么处理写清楚了：

```swift
func popLast() -> Element?
```

返回值是可选类型，集合为空时会得到 `nil`。调用者不需要猜“没有最后一个元素”是不是一种正常结果。

再比较这两个名字：

```swift
removeLast()
```

和：

```swift
popLast()
```

`removeLast()` 要求集合非空，否则会触发运行时错误；`popLast()` 则用 `nil` 表示空集合。命名给出了提示，可选返回值又把这条规则明确写进了类型。

## 复杂度没有消失，只是提前了

Swift 经常要求我接受：

```plain
more complexity during compilation
```

而不是把更多不确定性留到运行时：

```plain
more uncertainty at runtime
```

这不是绝对的交换，不过编译器和类型系统确实能提前发现或表示其中一部分不确定性。

`Optional`、泛型、面向协议的 API、类型约束和显式错误处理，都会让函数签名变长，也正是这些东西最初让我不想读它。它们不能消灭所有非法状态，函数签名也替代不了完整文档；但输入、输出、失败方式和类型之间的关系，通常在运行代码之前就能看到。

现在遇到陌生类型，我还是会打开示例。只是顺序变成了先读签名，形成一个判断，再用示例确认自己有没有理解错。
