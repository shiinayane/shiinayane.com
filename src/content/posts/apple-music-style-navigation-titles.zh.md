---
title: 在 SwiftUI 中复现 Apple Music 的滚动隐藏导航标题
published: 2026-04-03
tags: [SwiftUI, iOS, UI]
category: Engineering
draft: false
lang: zh_CN
translationKey: apple-music-style-navigation-titles
---

iOS 26 的 Apple Music 里有一个挺细的变化：向下滚动后，大标题不会像以往那样缩成小标题，而是连同相关的工具栏内容一起从视觉上消失。

![Apple Music 中的效果](./assets/apple-music-style-navigation-titles/navigation-title-collapse.png)

iOS 11 以来常见的是：

```plain
Large Title
   ↓ scroll
Small Navigation Title
```

Apple Music 现在看起来更接近：

```plain
Large Title
   ↓ scroll
(no title)
```

SwiftUI 目前没有一个公开的 modifier 可以直接打开这种效果。实际实现时可以分成两种情况：要准确控制整个顶部区域，就自己做 header 并监听滚动；只是想让折叠后的小标题不显示，则有一个很省事的办法。

## 需要完整控制时，自己管理 header

比较完整的实现可以由几部分组成：

- 用 `safeAreaInset(edge: .top)` 放置自定义 header
- 通过 `ScrollGeometry` 读取滚动位置
- 分别控制标题和其他工具栏元素的显示状态
- 用 opacity、offset 完成过渡动画

SwiftUI 已经提供了这些基础能力：

```swift
.onScrollGeometryChange(...)
.safeAreaInset(...)
.toolbar(...)
```

只是它们还没有被封装成一个专门的导航栏选项。最简化的写法，是记录纵向 offset，超过阈值后隐藏 header：

```swift
struct CollapsingHeaderView: View {

    @State private var headerHidden = false

    var body: some View {
        ScrollView {
            VStack {
                ForEach(0..<50) { i in
                    Text("Row \(i)")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
        }
        .onScrollGeometryChange(for: CGFloat.self) { geometry in
            geometry.contentOffset.y
        } action: { _, offset in
            headerHidden = offset > 40
        }
        .safeAreaInset(edge: .top) {
            header
                .opacity(headerHidden ? 0 : 1)
                .animation(.easeInOut, value: headerHidden)
        }
    }

    private var header: some View {
        HStack {
            Text("Library")
                .font(.largeTitle.bold())

            Spacer()

            Image(systemName: "person.crop.circle")
        }
        .padding()
        .background(.ultraThinMaterial)
    }
}
```

这种方式可以配合 `ScrollView`、`List` 或 `LazyVStack` 使用。header 的布局、隐藏时机和动画都能自己定，页面需要更复杂的转场时也容易继续扩展。

代价也很直接：滚动逻辑从此要由应用负责。阈值、滚动方向、工具栏排版、下拉刷新，以及嵌套 `NavigationStack` 的边界情况，都可能需要单独处理。对于确实要还原整个顶部交互的页面，这些成本可以接受；如果只是不想显示小标题，就有点重了。

## 只想隐藏小标题时，可以把 principal 留空

在 `.principal` 位置放一个空标题：

```swift
.toolbar {
    ToolbarItem(placement: .principal) {
        Text("")
    }
}
```

同时保留普通的大标题设置：

```swift
.navigationTitle("Library")
.navigationBarTitleDisplayMode(.large)
```

滚动时看到的结果就会变成：

```plain
Large Title
   ↓ scroll
(empty)
```

列表顶部的大标题照常显示；进入折叠状态后，principal item 提供的是一个空的小标题：

```swift
NavigationStack {
    List(items) { item in
        Text(item.title)
    }
    .navigationTitle("Library")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .principal) {
            Text("")
        }
    }
}
```

不需要增加任何滚动状态，普通的 `NavigationStack` 就能做出很接近 Apple Music 的视觉效果。

## 这个办法隐藏了什么

SwiftUI 的导航标题通常会在两个状态之间切换：

```plain
Large Navigation Title
        ↓
Compact Navigation Title
```

principal toolbar item 会替换紧凑状态下显示的内容。把它留空，相当于把原来的：

```plain
Large Title
   ↓
Small Title
```

变成：

```plain
Large Title
   ↓
(blank space)
```

所以导航栏并没有真的消失，只是紧凑标题不再渲染任何内容。这也解释了为什么几行代码就能得到相当接近的效果，以及它为什么不能代替完整实现。

具体限制有三点：

- 导航栏仍然存在
- 其他 toolbar item 仍可能占据空间
- 它依赖 SwiftUI 当前的渲染行为，未来版本可能改变

如果需求是让整个 header 和相关布局一起消失，应该用前面的滚动监听方案；如果空白的小标题已经满足视觉要求，这个 toolbar 小技巧会轻得多。

## 以后也许会有正式 API

Apple 过去确实有过先在系统应用里使用交互，再开放相关 API 的情况，例如 `.searchable`、大标题导航栏，以及 Apple Music 里出现的标签栏最小化行为。

以后 SwiftUI 也许会提供类似这样的接口：

```swift
.navigationBarCollapseBehavior(.onScroll)
```

或者：

```swift
.toolbarScrollVisibility(.hidden)
```

这两个 modifier 只是用于说明可能的 API 形态，目前并不存在。
