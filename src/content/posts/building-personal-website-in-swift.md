---
title: Building a Personal Website in Swift
published: 2026-04-21
description: I Thought It Was Easy… Until It Wasn’t
tags: [Swift, Raptor, SSG, Web]
category: Engineering
draft: false
lang: en
translationKey: building-personal-website-in-swift
---

While building this site with Raptor, I needed distinct styles for post dates, navigation labels, tags, and other small pieces of text. I expected this to be a minor theme change. Instead, I ended up modifying the framework before realizing that I was working in the wrong layer.

Raptor is a static site generator written in Swift. Its layouts use Swift rather than HTML templates or JSX:

```swift
VStack {
    Text("Hello, world!")
    Text("Welcome to my site")
}
```

It also provides a theme system for typography and colors:

```swift
.font(.title1)
.fontSize(36, for: .title1)
```

That felt expressive and type-safe, and using Swift for a site was genuinely fun. The trouble started when the design needed more than the built-in text roles.

## The roles missing from a real site

Raptor's typography system has a fixed set of roles:

- body
- title1 … title6
- codeBlock

A real site also has post metadata, navigation labels, tags, categories, buttons, and links. In Hugo, Hexo, or a hand-written template, I would give those elements class names and move on:

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

Raptor had no equivalent built-in roles for:

```swift
.postMeta
.navLabel
```

My first reaction was to add them.

## Extending Theme

I designed an API that looked like this:

```swift
Text("April 20").textRole(.postMeta)
```

The theme would configure each custom role:

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

Raptor would then generate:

```css
.text-role-post-meta {
  font-size: 12px;
  font-weight: 500;
}
```

and attach the class to the rendered HTML:

```html
<p class="text-role-post-meta">April 20</p>
```

After digging through the framework, I modified the theme configuration, updated CSS generation, and patched the rendering logic. The implementation worked: custom roles went through the theme system, supported light and dark mode, generated CSS automatically, and appeared in the final HTML.

The code was functional, but the model still felt wrong.

First, it created two competing ways to describe text:

```swift
.font(.title1)        // built-in
.textRole(.postMeta)  // custom
```

Second, the two APIs did not carry the same meaning. In Raptor:

```swift
.font(.title1)
```

selects an HTML tag such as `<h1>` and applies its styling. My custom API:

```swift
.textRole(.navLabel)
```

only applied styling. HTML structure and visual style are separate concerns, but I had added another typography API without resolving that distinction.

Eventually I was writing:

```swift
.tag(.h1)
.textRole(.navLabel)
```

which was just a more elaborate way to express:

```html
<h1 class="nav-label"></h1>
```

The type-safe API was no longer removing complexity. It was recreating HTML concepts with extra steps.

## The abstraction was already there

I checked other static site generators to see whether they modeled this problem at the framework level. Hugo, for example, simply allows:

```html
<p class="post-meta"></p>
```

and leaves the rest to CSS.

That comparison sent me back into Raptor's design and source code. Theme is meant for global design tokens such as typography, colors, and spacing. A semantic style like “post metadata” does not need to become another global text role.

Raptor already has a separate abstraction for that: `Style`.

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

It can be applied directly to the content:

```swift
Text("April 20")
    .style(PostMetaStyle())
```

This serves the same purpose as:

```html
<p class="post-meta">April 20</p>
```

but keeps the implementation reusable, composable, and type-safe.

`Style` also receives environment conditions, including the light or dark color scheme, active theme, contrast settings, and layout conditions. A semantic style can therefore adapt without becoming part of the theme's role system:

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

The boundary I had missed was simple: Theme defines global tokens; `Style` packages reusable semantic styling. The framework already supported what I wanted—I had just started by changing its internals instead of using the abstraction intended for the job.
