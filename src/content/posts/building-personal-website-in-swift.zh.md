---
title: 用 Swift 搭建个人网站
published: 2026-04-21
description: 我以为很简单……直到发现并不是
tags: [Swift, Raptor, SSG, Web]
category: Engineering
draft: false
lang: zh_CN
translationKey: building-personal-website-in-swift
---

用 Raptor 做这个网站时，我想分别设置文章日期、导航标签、分类和其他小字的样式。本来以为只是补几项主题配置，结果一路改到了框架内部，最后才发现：问题不在功能做不出来，而在于我选错了抽象层。

Raptor 是一个用 Swift 编写的静态网站生成器。页面布局不需要写 HTML 模板或 JSX，而是直接用 Swift 描述：

```swift
VStack {
    Text("Hello, world!")
    Text("Welcome to my site")
}
```

字体和颜色则可以放进内置的主题系统：

```swift
.font(.title1)
.fontSize(36, for: .title1)
```

这种写法很直观，也有类型检查。用熟悉的 Swift 写网站本身确实挺有意思，麻烦出在网站开始需要更细的文字样式之后。

## 真实网站不只有标题和正文

Raptor 的排版系统预设了几种固定角色：

- body
- title1 … title6
- codeBlock

但实际页面里还有文章日期与作者、导航标签、标签与分类，以及按钮和链接之类的小型 UI 文字。

换成 Hugo、Hexo 或普通 HTML 模板，这些东西通常不值得专门设计一套框架 API。加上 class，再交给 CSS 就行：

```html
<span class="post-meta">April 20</span>
<a class="nav-label">Archive</a>
```

```css
.post-meta {
  font-size: 12px;
  color: gray;
}
.nav-label {
  font-weight: bold;
}
```

可是 Raptor 现有的文字角色里没有：

```swift
.postMeta
.navLabel
```

于是我最先想到的，是自己把它们加进去。

## 一套能运行的自定义角色

我希望调用方式像这样：

```swift
Text("April 20").textRole(.postMeta)
```

然后在 Theme 里统一配置：

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

生成对应的 CSS：

```css
.text-role-post-meta {
  font-size: 12px;
  font-weight: 500;
}
```

最后把 class 挂到输出的 HTML 上：

```html
<p class="text-role-post-meta">April 20</p>
```

为此我翻了不少框架代码，修改主题配置，补上 CSS 生成，再调整渲染逻辑。它最后的确跑通了：自定义角色可以经过主题系统，支持明暗模式，自动生成 CSS，也会出现在最终 HTML 中。

但能运行不等于这个设计就合适。

首先，描述文字的方式变成了两套：

```swift
.font(.title1)        // built-in
.textRole(.postMeta)  // custom
```

更关键的是，两套 API 管的事情并不相同。Raptor 中的：

```swift
.font(.title1)
```

既会决定 `<h1>` 这样的 HTML 标签，也会应用样式；而我新增的：

```swift
.textRole(.navLabel)
```

只负责样式。HTML 结构和视觉样式本来就是两件事，我却在没有理清这条边界的情况下，又塞进了一套排版 API。

写到后来，调用变成了：

```swift
.tag(.h1)
.textRole(.navLabel)
```

对应的其实还是：

```html
<h1 class="nav-label"></h1>
```

原本想借助类型系统消除复杂度，结果只是绕了一圈重新发明 HTML。

## 真正需要的是 Style

我又去看了其他静态网站生成器怎么处理。比如 Hugo 并不会在框架层为这种需求建立角色系统，它只让你写：

```html
<p class="post-meta"></p>
```

剩下的交给 CSS。

对照着重新阅读 Raptor 的设计和源码后，边界就清楚了：Theme 用来定义字体、颜色、间距等全局设计令牌；“文章元信息”这种带语义的局部样式，并不需要成为 Theme 里的新文字角色。

Raptor 已经为此准备了另一个抽象：`Style`。

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

使用时直接把它应用到内容上：

```swift
Text("April 20")
    .style(PostMetaStyle())
```

它承担的作用相当于：

```html
<p class="post-meta">April 20</p>
```

但仍然是可复用、可组合且类型安全的 Swift 代码。

`Style` 还能读取环境条件，包括明暗模式、当前主题、对比度设置和布局条件。因此，语义样式可以按环境变化，而不用挤进 Theme 的角色系统：

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        if environment.colorScheme == .dark {
            content.foregroundStyle(.gray)
        } else {
            content.foregroundStyle(.secondary)
        }
    }
}
```

我之前漏掉的分工其实很简单：Theme 管全局设计令牌，`Style` 封装可复用的语义样式。需要的能力原本就在 Raptor 里，只是我一开始先改了框架内部，没先找到它为这类问题准备好的入口。
