---
title: "一个换行引发的惨案"
published: 2026-08-13
description: "发现 SwiftUI Text 无法控制中文的换行语义后，我在 NSTextField 和 NSTextView 之间做了一次小型 spike。"
tags: [SwiftUI, AppKit, TextKit, macOS]
category: Engineering
draft: false
lang: zh_CN
translationKey: a-line-break-disaster
series: bilikit-development-notes
seriesOrder: 2
---

BiliKit 做到评论正文时，我遇到了一个看似很小但实际很头疼的问题：一段中文在侧栏里提前换行，行尾留下了一块明显的空白。

内容和大体布局没什么问题，但整个评论区的行尾已经像“狗啃的”一样参差不齐了。

一开始我以为又是哪层宽度算错了。检查了父视图、内边距和布局优先级，又排查了一圈相关代码，才发现问题落在最普通的 `Text` 上。

## `Text` 没有这个开关

评论正文原本就是一行 SwiftUI：

```swift
Text(comment.message)
```

`Text` 没有公开的按字符换行选项。`lineLimit`、`fixedSize` 和 `layoutPriority` 可以影响尺寸，却不能指定中文在临界宽度下应该在哪里断行。

这个区别平时不明显。但放进窄侧栏以后，一次不合适的断行就足够扎眼。`Text` 用来显示 UI 说明等短文字时已经够用，放到评论区、简介这类长文本里，换行语义的限制就会被放大。类似的吐槽在开发者社区里也不少。

继续调整 SwiftUI 布局只能绕开某些例子，不能解决换行语义本身。我于是做了一个很小的 spike，比较 `NSTextField` 和 `NSTextView`。

## `NSTextField` 很快变得不够用

`NSTextField` 可以直接设置：

```swift
textField.cell?.lineBreakMode = .byCharWrapping
```

换行立刻正常了。对于纯文本评论，这已经足够。

评论正文还要处理链接，之后也会接入自定义表情。`NSTextField` 本身没有合适的链接点击回调。为了知道用户点中了哪段文字，我需要额外维护一套 TextKit 布局，再自己做坐标和字符位置的命中测试。

## 最后选了 `NSTextView`

`NSTextView` 提供了评论正文需要的能力：按字符换行、富文本、链接代理，以及以后插入 attachment 的空间。

最终实现把它当成一个普通文本控件使用：

```swift
textView.isEditable = false
textView.isSelectable = true
textView.isVerticallyResizable = true
textView.textContainer?.widthTracksTextView = true
```

换行模式放在 attributed string 的 paragraph style 中：

```swift
let paragraph = NSMutableParagraphStyle()
paragraph.lineBreakMode = .byCharWrapping
```

`NSTextView` 不负责滚动。外层仍然是 SwiftUI 的评论列表，正文高度通过 TextKit 的 `usedRect` 计算。

链接直接走 `NSTextViewDelegate`：

```swift
func textView(
    _ textView: NSTextView,
    clickedOnLink link: Any,
    at charIndex: Int
) -> Bool
```

渲染时先把远程 URL 转成内部 token，再映射回评论模型里的链接目标。点击行为由应用统一处理。

我也用 100、500 和 1000 条评论做过临时对比。两种 AppKit 方案没有拉开有意义的性能差距，最后就按后续功能选择了 `NSTextView`。

## 只换这一小块

本次改动范围限定在评论正文，通过 `NSViewRepresentable` 接入 `NSTextView`。头像、楼层、操作区、回复列表和滚动容器继续使用 SwiftUI。

SwiftUI 很适合组织评论区的状态和页面结构。加载、分页、折叠回复和列表布局都可以沿着数据变化直接更新，代码也容易拆成小视图。

`Text` 把底层排版细节收了起来。大多数时候这能减少很多代码，遇到精确的换行规则、字符命中和富文本附件时，可用的控制项就不够了。继续调整外层布局也无法改变底层文本系统的行为。

这次实现明确了项目里使用 SwiftUI 和 AppKit 的边界。状态、组合和页面布局继续使用 SwiftUI，文本布局、命中测试和富文本交给 AppKit。`NSViewRepresentable` 把两部分接在一起，改动可以停在评论正文内部。

以后遇到类似问题，我会先确认问题来自页面布局还是原生控件能力。前者继续在 SwiftUI 中处理，后者先用 AppKit 做一个小范围 spike，再决定是否接入。

iOS 上对应的选择会是 UIKit 和 `UIViewRepresentable`，判断方式没有太大区别。

目前链接已经接通。自定义表情尚未进入渲染层，后续会通过 attachment 接入。
