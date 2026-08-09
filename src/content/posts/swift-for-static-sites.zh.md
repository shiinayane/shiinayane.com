---
title: 用 Swift 写网站，最后还是回到了 HTML 和 CSS
published: 2026-05-02
description: 从给 Raptor 补一个文字样式，到重新理解 Swift 在 Web 技术栈里的位置
tags: [Swift, SwiftUI, Raptor, Astro, SSG, Web]
category: Engineering
draft: false
lang: zh_CN
translationKey: swift-for-static-sites
---

4 月下旬，我认真试了一次用 Swift 重写个人网站。

这件事最开始看起来很顺：博客本来就是把 Markdown 变成页面，Raptor 又提供了接近 SwiftUI 的 API。页面结构可以写成 `VStack`、`HStack` 和 `Text`，主题、颜色、字体也都能留在 Swift 里。既然我平时就在写 SwiftUI，用同一套语言把网站也接过来，似乎没什么问题。

到 5 月初，我已经从一个文字样式改到了框架内部，又做了一套完整主题的 spike。最后这个网站还是落在了 Astro 上。

之前我把这段过程拆成了三篇文章，分别写自定义文字角色、Swift SSG 选型和 Raptor 的抽象问题。现在回头看，它们其实是同一次实验的三个阶段。Swift 当然能写网站。我现在更想记录的是，写到什么程度以后，这层 Swift 抽象开始不再省事。

## 一开始为什么会选 Raptor

我当时看了 [Saga](https://github.com/loopwerk/Saga)、[Toucan](https://github.com/toucansites/toucan)、[Publish](https://github.com/JohnSundell/Publish)、[Ignite](https://github.com/twostraws/Ignite) 和 [Raptor](https://github.com/raptor-build/raptor)。它们都能用 Swift 生成静态网站，但做法差别很大。

Saga 和 Publish 更接近“用 Swift 生成 HTML”。Swift 负责内容模型、处理流程和模板组合，页面最后是什么标签、挂什么 class，代码里基本都能直接看出来。

Ignite 往前走了一步，提供 Swift 组件和 Bootstrap。做文档站、作品集或者结构简单的博客会很快，很多响应式和基础样式不需要自己处理。

Raptor 的目标更完整。它有 `Site`、`Page`、`Layout`、`Theme`、`Style` 和 `PostWidget` 等站点模型，还能和 Vapor 放在一起。页面可以这样写：

```swift
VStack {
    Text(post.title)
    Text(post.description)
}
.style(PostCardStyle())
```

这也是我最感兴趣的地方。Raptor 试着给 Web 建一套 SwiftUI 风格的创作层，Swift 在这里已经不只是模板语言。类型安全、组件组合、主题环境都很熟悉，刚开始写的时候确实很舒服。

我先做了一套主题 spike，没有直接替换现有网站。第一个遇到的问题很小：文章日期、导航文字、分类和标签要有各自的排版样式。

## 第一个弯路：给 Theme 增加文字角色

Raptor 当时内置的文字角色主要是 `body`、`title1` 到 `title6`，再加上 `codeBlock`。但真实博客里还有不少介于标题和正文之间的小字，例如文章元信息和导航标签。

普通 HTML 里，这件事基本没有讨论价值：

```html
<span class="post-meta">April 20</span>
<a class="nav-label">Archive</a>
```

```css
.post-meta {
  font-size: 12px;
  color: gray;
}
```

我当时想把它也纳入 Raptor 的类型系统，于是设计了一套自定义角色：

```swift
Text("April 20").textRole(.postMeta)
```

Theme 里再统一设置：

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

为了让它工作，我改了主题配置、CSS 生成和渲染逻辑。最后生成的 HTML 也符合预期：

```html
<p class="text-role-post-meta">April 20</p>
```

明暗模式能切，CSS 会自动生成，类型也都对得上。单看实现，这个功能已经完成了。

但用起来总有点别扭。Raptor 原来的：

```swift
.font(.title1)
```

既会影响 `<h1>` 这样的语义标签，也会应用视觉样式；我补的 `textRole` 只管样式。后来调用开始变成：

```swift
.tag(.h1)
.textRole(.navLabel)
```

翻译成 HTML，其实就是：

```html
<h1 class="nav-label"></h1>
```

我花时间给框架加了一套 API，最后表达的还是标签加 class。

再回去读 Raptor 的设计，才发现它本来就有更合适的入口：`Style`。

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

使用时直接写：

```swift
Text("April 20")
    .style(PostMetaStyle())
```

Theme 负责全局字体、颜色和间距这些设计令牌，`Style` 用来包装可以复用的局部样式。我要的能力原本就在框架里，是我一开始找错了层。

这个弯路本身不算 Raptor 的问题，反而让我继续做了下去。真正改变判断的是后面的完整主题。

## 主题一复杂，问题就从 API 变成了工作方式

一些布局用 Raptor 表达得很好。比如分类在左、时间在右：

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

它比一段散在样式表里的 flex 规则更容易读，组件拆分也很自然。

麻烦出现在那些对浏览器来说很普通、但不太像 SwiftUI 组件的细节上。

例如标题下面的一条装饰线，原主题用伪元素完成：

```css
.recent-info::after {
  content: '';
  width: 13%;
  height: 5px;
  background: var(--accent);
}
```

我在 Raptor 里把它写成了真正的组件：

```swift
RecentInfoAccentBar()
```

画面能对上，但页面结构变了。CSS 里的装饰层进入了组件树，只是为了复现一个 `::after`。

跨元素的 Hover 也类似：

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

浏览器本来就理解父元素和后代元素之间的状态关系，换到组件 DSL 后，我要么重新设计交互，要么另外协调样式。再到负边距这样的微调：

```swift
.style(Property.marginTop(.px(-21)))
```

我写的是 Swift，脑子里想的还是 CSS。

实际调试流程也没有变成 SwiftUI Preview。页面最终运行在浏览器里，所以我还是要打开 DevTools，看生成后的 DOM，确认具体选择器和盒模型，再回 Swift 里改一层描述。

```plain
页面结构：Swift 组件
视觉规则：CSS 概念
最终调试：DOM + Browser DevTools
```

如果 Raptor 的组件刚好能覆盖需求，这层转换很顺。超出以后，代码会逐渐退回 `Tag + Div + Class + CSS`，或者把 CSS 属性逐项改写成 Swift modifier。原来的 Web 知识一点没少，还要额外维护 Swift 到 HTML/CSS 的映射。

到这里，继续补某个功能已经解决不了我的犹豫。框架可以继续加 API，我自己也能继续写。但这套主题每增加一个细节，我都要先判断它应该属于 Swift 组件、Raptor Style，还是原始 CSS。对个人博客来说，这个成本没有换回足够多的东西。

## 其他 Swift SSG 能不能绕开这个问题

可以绕开一部分，但取决于使用 Swift 的目的。

Saga 的边界最直接：Swift 做内容模型、生成流程和组合，HTML/CSS 继续按 Web 的方式写。

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

这种写法不会假装 CSS 已经消失。配合 Tailwind 后，模板和最终 HTML 的关系也比较直观。如果项目明确要求用 Swift，我现在还是会先看 Saga。

Ignite 则适合另一类任务。Bootstrap 已经覆盖了大部分版式时，用 Swift 很快就能搭出完整页面。网站越需要独特的视觉细节，后面覆盖 Bootstrap 的工作就越多。

Raptor 的价值也很明确。Swift-first 的内容平台、需要 Vapor 的动静态混合站点，或者 UI 本身比较规整的项目，都可能从它完整的站点模型中受益。只是我这次做的是一个已经有具体视觉语言的个人博客，服务端能力和更大的内容模型都不是当时的主要问题。

所以最后并没有一个统一的“Swift SSG 最佳选择”。更实际的问法是：把 Swift 加进来以后，它具体替这个项目解决了什么？如果答案只是“所有文件都能写成 Swift”，吸引力对我来说还不够。

## 为什么最后还是用了 Astro

如果当时是在空目录里从头做一个网站，Saga 可能还会继续留在候选里。实际项目已经有了一套很接近目标的现成主题。

我已经找到了 Fuwari。它是现成的 Astro + Tailwind 博客主题，页面结构、卡片、侧栏和整体视觉已经很接近我想要的效果。响应式布局、明暗模式、过渡动画、Markdown 扩展、目录、Pagefind 搜索和 RSS 也都已经有了。

“迁移到 Raptor”需要重做整套 DOM 结构和 CSS 选择器，还有响应式、主题切换、动画、搜索、目录、内容处理和构建部署，远远不止把几个 Astro 组件翻译成 Swift。完成以后得到的仍然是同一个博客，只是中间多了一层 Swift 到 Web 的映射。

Astro 这边的修改路径短很多。页面结构就在 `.astro` 组件里，样式仍然是 CSS/Tailwind，需要交互时再放一点 Svelte 或浏览器脚本。DevTools 里看到的元素和源码基本能直接对应，调整一个 Hover 或断点时不用先判断框架该提供哪个 modifier。

后来的开发也验证了这一点。这个站继续加了中英日三种内容、按语言生成的路由、Cloudflare 边缘语言跳转、不同语言的 Pagefind 索引、RSS、Sitemap、系列、归档和语言切换。这些问题基本都落在路由、Content Collections、静态生成和浏览器行为上。Astro 没有替我隐藏它们，但改起来都在问题实际发生的那一层。

我最后留下 Astro，理由其实很朴素：现成主题已经完成了大部分我真正需要的前端工作，而我更想把时间花在文章、多语言、搜索和阅读体验上。为了让网站也使用 Swift，把这一整套重新实现一遍，收益不够。

## 这次实验留下了什么

我没有因为这次尝试就觉得 Swift 不适合 Web。Saga 的做法仍然很有吸引力，Raptor 的 Theme 和 Style 也让我重新想了一遍设计令牌、语义样式和组件之间的边界。以后碰到需要 Swift 后端、共享内容模型，或者结构比较固定的网站，我还是会重新考虑它们。

但个人网站已经给出了答案。这里最难维护的一直是浏览器里的页面细节和内容工作流，Astro 离这两件事都更近。

于是 spike 到这里结束，网站回到 Astro。我也没再继续给 Raptor 加下一层抽象。
