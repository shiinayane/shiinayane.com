---
title: 用 Swift 生成静态网站
published: 2026-05-01
description: SwiftUI 式抽象与 Web 原生实现之间的取舍
tags: [Swift, SwiftUI, SSG, Web]
category: Engineering
draft: false
lang: zh_CN
translationKey: swift-for-static-sites
---

我最近想把一个视觉细节很多的博客主题迁移到 Swift 静态网站生成器，于是实际看了一遍 [Saga](https://github.com/loopwerk/Saga)、[Toucan](https://github.com/toucansites/toucan)、[Publish](https://github.com/JohnSundell/Publish)、[Ignite](https://github.com/twostraws/Ignite) 和 [Raptor](https://github.com/raptor-build/raptor)，也拿它们和 [Astro](https://github.com/withastro/astro)、[Hexo](https://github.com/hexojs/hexo)、[Hugo](https://github.com/gohugoio/hugo)、[Jekyll](https://github.com/jekyll/jekyll) 这些成熟的 Web 原生工具做了比较。

一开始只是想选个工具，实际读过源码和示例、自己试过以后，问题却变成了 Swift 应该放在 Web 技术栈的哪一层。小页面里，SwiftUI 风格的组件 API 和“用 Swift 生成普通 HTML”看起来差别不大；等主题开始依赖大量定制 CSS，这两条路线的摩擦就完全不同了。

## 浏览器才是 UI 的运行时

SwiftUI 在 iOS 上好用，是因为它的抽象直接接到了系统 UI 运行时：

```plain
iOS:
System UI runtime
→ SwiftUI Button / VStack / NavigationStack
→ Your Swift code
Web:
Browser runtime (DOM + CSS + JS)
→ HTML <button> / <div> / <article>
→ CSS grid / flex / selectors
→ Your HTML/CSS/JS
```

SwiftUI 的 `Button` 会直接获得系统平台的无障碍、焦点、动画和输入行为。换成 Raptor 或 Ignite，Swift 里的按钮最后还是会变成：

```html
<button class="...">Save</button>
```

再加上一些 CSS。浏览器并不知道生成它的 Swift 组件是什么，只会执行最后收到的 HTML、CSS 和 JavaScript。

问题并不在声明式 UI 本身。React、Vue 和 Astro 也都是声明式的，区别在于“声明的对象”离浏览器实际运行的模型有多远。

| 框架           | 实际声明的内容                    | 与平台的距离 |
| -------------- | --------------------------------- | ------------ |
| SwiftUI        | 原生 UI 树                        | 很近         |
| React / Vue    | DOM / 组件树                      | 很近         |
| Astro          | HTML + Islands                    | 很近         |
| Saga / Publish | HTML 输出树                       | 近           |
| Ignite         | Swift 组件（类似 Bootstrap）      | 中等         |
| Raptor         | SwiftUI 风格 UI + 自有样式系统    | 更远         |

SwiftUI 的抽象与它所在的平台一致；React 仍然围绕 DOM 工作；Astro 则直接把 HTML 当作组件的一等内容。Ignite 和 Raptor 又向上加了一层 Swift 组件树。简单页面里这层抽象很舒服，但主题越定制，来回翻译的成本就越明显。

## 组件 DSL 从哪里开始失效

Ignite 这类组件在普通页面里写起来很快：

```swift
Text("Hello")
Button("Read More")
Grid {
  Card { ... }
}
```

底层有 Bootstrap，布局、间距、响应式和基本视觉层级都不用从零开始。文档站、作品集、普通博客，以及本来就接近 Bootstrap 风格的页面都很适合。

但从现有视觉主题迁移时，真正要还原的往往是这些 CSS：

```css
.card::before
.sidebar:has(.active)
grid-template-columns: minmax(0, 1fr) 18rem
position: sticky
backdrop-filter
mask-image
container queries
```

内置组件表达不了以后，Swift 代码又会退回到底层 HTML 包装：

```swift
Tag("aside") { ... }
.class("layout-shell__sidebar")
```

CSS 依然得单独写。结果是一半 SwiftUI 风格、一半 HTML 包装器，抽象没有少掉多少工作，反而把一个页面拆成了两套表达方式。

这套路线当然有明确的舒适区：

```plain
Simple sites
Docs
Portfolios
Basic blogs
Bootstrap-like layouts
```

真正困难的是高度定制的主题，尤其是原来就用 Astro 或 Hexo 编写、依赖精确选择器、伪元素、布局规则和浏览器行为的页面。这是抽象的适用边界，不等于框架本身做错了。

## Saga 把边界留在明面上

Saga 的取舍不一样。Swift 负责擅长的部分，浏览器相关的内容继续用 Web 原生方式表达：

```plain
Swift:
Content model
Pipeline
Generation logic
Type safety

Web:
HTML structure
CSS styling
JavaScript behavior
```

模板大概会写成这样：

```swift
article(class: "mx-auto max-w-3xl px-6 py-12") {
  h1(class: "text-4xl font-bold tracking-tight") {
    item.title
  }
  div(class: "prose prose-slate dark:prose-invert") {
    raw(item.body)
  }
}
```

这不是把 SwiftUI 搬进浏览器，而是老老实实用 Swift 生成 HTML。两边各自负责什么也很直观：

```plain
Swift-native:
Types, functions, composition

Web-native:
HTML, CSS, browser semantics
```

对这次的博客主题来说，这种直接性比再做一层完整的 UI 抽象更有用。

## Tailwind 让 Saga 更顺手

不用 Tailwind 时，Saga 模板就是比较传统的 HTML 加命名 class：

```swift
article(class: "post-card") {
  h2(class: "post-card__title") {
    item.title
  }
}
```

加上 Tailwind 后，布局和样式可以直接留在生成 HTML 的位置：

```swift
article(class: "group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg") {
  h2(class: "text-2xl font-semibold tracking-tight") {
    a(href: post.url) {
      post.title
    }
  }
}
```

这里不需要把每个 CSS 概念重新翻译成一套 Swift modifier。Tailwind 仍然是 CSS，只是换成 utility class 来写，最后面对浏览器时还是熟悉的模型。

## Raptor 和 Ignite 适合的任务不同

Raptor 想做的比普通 SSG 更多。它定义了一整套站点模型：

```plain
Site
Page
PostPage
CategoryPage
Layout
Theme
Style
PostWidget
```

它还集成了 Vapor，可以做服务端渲染。对于 Swift-first 的内容平台、动静态混合站点，或者本来就需要后端集成的项目，这些能力很有价值。

不过，站点模型并不会自动解决前端表达问题。主题一旦超出它的 UI 与样式系统，最后还是会回到：

```plain
Tag + Div + Class + CSS
```

走到这里时，我会希望上层抽象至少解决了另一个明确问题，比如内容架构或服务端集成，因为它已经没有替我减少前端工作了。

Ignite 的取舍更务实：

```plain
Swift API + Bootstrap
```

拿它快速做小型网站、作品集或文档站很合适。代价是当网站需要很强的视觉个性时，Bootstrap 的结构和默认审美会越来越难藏。

## 为什么复杂主题我还是会选 Astro

如果项目本身没有“必须使用 Swift”这个条件，这次的复杂视觉主题我仍然会优先选 Astro：

- HTML、CSS、JavaScript 都是一等公民；
- 组件仍然贴近浏览器原语；
- Tailwind 集成顺手；
- Content Collections 能提供内容结构；
- 生态已经比较成熟。

这并不是说 Swift 不能做网站，而是使用 Swift 带来的抽象成本，应该换回项目真正需要的东西。

这次比较的两条 Swift 路线可以简单写成：

### SwiftUI 风格的 Web DSL（Raptor / Ignite）

```plain
Swift expresses UI
→ translated into HTML/CSS
```

### Swift 原生生成 + Web 原生 UI（Saga）

```plain
Swift handles logic and structure
HTML/CSS/JS express the UI
```

对于高度定制的视觉网站，我更愿意用第二种。Swift 继续提供类型、函数、组合、内容建模和生成逻辑，UI 则交给 HTML、CSS 和 JavaScript。

最后留下的实际选型很简单：

```plain
Not using Swift: Astro + Tailwind
Using Swift seriously: Saga + Tailwind
Quick Swift site: Ignite
Exploring Swift Web frameworks: Raptor
```
