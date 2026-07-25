---
title: Raptor 的两难
published: 2026-05-02
description: SwiftUI 式理想与 Web 现实
tags: [Swift, SwiftUI, Raptor, SSG, Web]
category: Engineering
draft: false
lang: zh_CN
translationKey: the-raptor-dilemma
---

在[用 Swift 做静态网站](/zh/posts/swift-for-static-sites/)里，我比较了 Astro、Saga、Toucan、Publish、Ignite 和 Raptor。当时的判断是：Swift 更适合负责内容建模和生成逻辑，界面还是应该交给 HTML、CSS 和 JavaScript。

那个判断有一部分来自文档和示例。后来我真的用 Raptor 做了一套主题，问题就具体了很多。

页面简单时，Raptor 写起来确实很舒服；但开始还原一套定制博客主题的细节以后，我经常一边用 Swift 写组件，一边按 CSS 的方式思考，最后再去浏览器里调试。真正让我犹豫的不是某一个 bug，而是这几层之间的距离。

## 一开始为什么很好用

Raptor 不只是把 Markdown 转成 HTML。它给页面、布局、主题、样式和组件都提供了 Swift 优先的表达方式。原本要写：

```html
<article class="post-card">
  <h2>Title</h2>
</article>
```

在 Raptor 里可以写成：

```swift
VStack {
    Text(post.title)
}
.style(PostCardStyle())
```

类型安全、组件组合、统一使用 Swift，再加上接近 SwiftUI 的开发体验，这些优点都很直接。理论上，SwiftUI 在 Apple 平台上带来的那套生产力，也可以延伸到网站开发。

对于简单页面，它也确实做到了。例如：

```swift
Text("Hello")
Button("Read more")
```

用来做 Landing Page、文档站或结构简单的博客都很顺手。如果界面大致可以归纳为：

```plain
Text + Button + Grid + Card
```

Raptor 的抽象既简洁又高效。

## 定制主题开始暴露边界

问题不是从什么偏门的浏览器特性开始的，而是博客主题里很普通的几个细节。

### 元信息横排

例如分类在左、时间在右的布局，用 CSS 可以直接写：

```css
.meta {
  display: flex;
  justify-content: space-between;
}
.meta time {
  float: right;
}
```

换到 Raptor，就是把同一个布局意图改写成组件：

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

这一段没有什么问题，甚至更清楚。此时抽象和实际需求仍然对得上。

### 用伪元素做装饰

接下来是标题下面的一条强调色短线：

```css
.recent-info::after {
  content: '';
  width: 13%;
  height: 5px;
  background: var(--accent);
  position: relative;
  bottom: -6px;
}
```

我在 Raptor 里把它做成了一个真正的组件：

```swift
RecentInfoAccentBar()
```

结果当然能显示，但含义变了。在 CSS 里，它只是附着在现有元素上的装饰层；放进组件树以后，它成了页面结构的一部分。为了复现一种样式写法，我开始调整文档结构，而不只是给已有结构加样式。

### 跨元素的 Hover 状态

CSS 选择器还可以直接描述两个元素之间的关系：

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

Raptor 的组件模型里没有同样干净的表达。我只能重新设计交互，或者手动协调相关样式。浏览器原本就理解“父元素 Hover 时改变后代元素”这件事，换成 Swift 抽象以后反而更难写清楚。

### 负边距

就连很常见的布局微调，本质上也还是 CSS：

```css
.read-more {
  margin-top: -21px;
}
```

Raptor 可以表示同一个属性：

```swift
.style(Property.marginTop(.px(-21)))
```

但写到这里，我并没有摆脱 CSS，只是把 CSS 翻译成了 Swift 语法。

实际出现的错位可以概括成这样：

```plain
They think in Swift,
but debug in CSS.

They write components,
but fight layout at the DOM level.

They define styles,
but still rely on raw CSS properties.
```

## 一套主题，两套思维方式

卡片结构一开始很适合组件化：

```swift
PostListItem {
    PostMeta(...)
    PostTitle(...)
    PostExcerpt(...)
    PostReadMore(...)
}
```

公共样式也可以收进一个类型里：

```swift
.style(PostCardStyle())
```

真正开始对视觉细节时，代码又慢慢变成了这样：

```swift
.style(Property.marginTop(.px(12)))
.style(Property.paddingLeft(.px(8)))
.style(Property.fontSize(.px(14)))
```

生成结果最终仍然运行在 HTML、CSS 和 JavaScript 上，所以浏览器行为才是最后的准则。实际工作时，我脑子里的分工是：

```plain
Structure → Swift
Styling → CSS concepts
Layout debugging → Browser DevTools
```

整个体验也就成了：

```plain
Half SwiftUI
Half traditional Web
```

复杂度没有消失，只是换了位置。我在 Swift 里写组件，去 DOM 里看生成结果，再靠 CSS 知识修布局。

## Saga 的边界更直接

Saga 采用的是另一种做法。它仍然让 Swift 负责组合，但生成的 HTML 和 class 一眼就能看出来：

```swift
article(class: "mx-auto max-w-3xl px-6 py-12") {
  h1(class: "text-4xl font-bold tracking-tight") {
    item.title
  }
  div(class: "prose") {
    raw(item.body)
  }
}
```

分工没有被藏起来：

```plain
Swift → structure + composition
HTML → structure
CSS → styling
```

从源代码到浏览器里实际调试的页面，中间少了一层翻译。对视觉要求高的网站，我觉得这比在 Web 上再套一层 SwiftUI 式模型更容易理解。

## 我现在会把 Raptor 用在哪里

Swift 当然能描述 Web UI，真正要判断的是：离浏览器原生渲染层多远，抽象才仍然值得。

对于通用界面：

```plain
Abstraction helps
```

对于高度定制的界面：

```plain
Abstraction fights the platform
```

Raptor 最适合前一种情况：页面由常见组件组成，结构清楚，类型安全和组合能力都能带来实际收益。到了后一种情况，选择器、伪元素和细小的布局修正越来越重要，它的抽象反而开始碍手。

整个技术栈仍然分成两层：

```plain
Rendering layer → HTML / CSS / JS
Authoring layer → Swift / React / Astro
```

React 和 Astro 离渲染层比较近。Raptor 有意走得更远，因此才有独特的 SwiftUI 式体验，也因此会出现我在做主题时遇到的错位。

做完这个主题以后，我给自己的边界是：

```plain
Swift for logic → great
Swift for UI abstraction → situational
HTML/CSS/JS → still the source of truth
```

结构简单、组件通用的网站，我仍然愿意用 Raptor。要做视觉细节很多的主题，我会更倾向 Saga 这类方案，让浏览器原本的 UI 模型直接露出来。
