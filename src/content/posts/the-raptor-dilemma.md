---
title: The Raptor Dilemma
published: 2026-05-02
description: SwiftUI Dreams vs Web Reality
tags: [Swift, SwiftUI, Raptor, SSG, Web]
category: Engineering
draft: false
lang: en
translationKey: the-raptor-dilemma
---

After comparing Astro, Saga, Toucan, Publish, Ignite, and Raptor, I wrote in [Swift for Static Sites](/posts/swift-for-static-sites/) that Swift seemed most useful for content modeling and generation, while HTML, CSS, and JavaScript should remain the UI layer.

That was based partly on reading documentation and examples. Then I built an actual Raptor theme.

Raptor was pleasant while the pages were simple. As soon as I tried to reproduce the details of a custom blog theme, however, I was thinking in Swift and debugging in CSS. That gap—not a particular bug—was the real problem.

## Why Raptor felt good at first

Raptor is more than a static site generator. It provides a Swift-first model for pages, layouts, themes, styles, and components. Instead of writing this:

```html
<article class="post-card">
  <h2>Title</h2>
</article>
```

I could write:

```swift
VStack {
    Text(post.title)
}
.style(PostCardStyle())
```

The appeal is easy to understand: type safety, composability, one implementation language, and a developer experience that resembles SwiftUI. In theory, the same ideas that made SwiftUI productive on Apple platforms can make a website pleasant to build.

For simple pages, they do. These components are concise:

```swift
Text("Hello")
Button("Read more")
```

Landing pages, documentation sites, and basic blogs fit the model well. If most of the interface can be described as:

```plain
Text + Button + Grid + Card
```

Raptor is expressive and fast.

## A custom theme exposes the boundary

The trouble started with ordinary theme details rather than an exotic browser feature.

### A metadata row

In CSS, a row with categories on one side and a timestamp on the other can be expressed directly:

```css
.meta {
  display: flex;
  justify-content: space-between;
}
.meta time {
  float: right;
}
```

The Raptor version rewrites the same intent as a component layout:

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

This version is fine, and arguably cleaner. The abstraction still matches the problem.

### A pseudo-element used for decoration

The next detail was a small accent bar:

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

In Raptor, I represented it as a component:

```swift
RecentInfoAccentBar()
```

That works, but the meaning has changed. CSS treats the bar as a decorative layer attached to an element. The component tree treats it as structure. I was no longer only styling the existing document; I was changing the document structure to reproduce a styling technique.

### A hover relationship

CSS selectors can also describe a relationship between two elements:

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

There was no equally clean expression for this in the Raptor component model. I either had to redesign the interaction or coordinate the relevant styles manually. The browser already understands the parent-hover/descendant relationship; the Swift abstraction did not make that relationship easier to state.

### A negative margin

Even a familiar layout adjustment remains a CSS operation:

```css
.read-more {
  margin-top: -21px;
}
```

Raptor can express it:

```swift
.style(Property.marginTop(.px(-21)))
```

But by this point I had not escaped CSS. I had translated CSS into Swift syntax.

The mismatch can be summarized like this:

```plain
They think in Swift,
but debug in CSS.

They write components,
but fight layout at the DOM level.

They define styles,
but still rely on raw CSS properties.
```

## The theme ended up with two mental models

A typical card began as a useful Swift component:

```swift
PostListItem {
    PostMeta(...)
    PostTitle(...)
    PostExcerpt(...)
    PostReadMore(...)
}
```

Reusable styles kept the first layer tidy:

```swift
.style(PostCardStyle())
```

Then the visual adjustments accumulated:

```swift
.style(Property.marginTop(.px(12)))
.style(Property.paddingLeft(.px(8)))
.style(Property.fontSize(.px(14)))
```

The generated page still runs on HTML, CSS, and JavaScript, so browser behavior remains the source of truth. The working model became:

```plain
Structure → Swift
Styling → CSS concepts
Layout debugging → Browser DevTools
```

The daily experience was therefore:

```plain
Half SwiftUI
Half traditional Web
```

Raptor had moved the complexity, not removed it. I wrote components in Swift, inspected the resulting DOM, and fixed layout using knowledge of CSS.

## Saga keeps the Web boundary visible

Saga takes a different approach. A template can still use Swift for composition while leaving the generated HTML and its classes obvious:

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

The division of responsibility is explicit:

```plain
Swift → structure + composition
HTML → structure
CSS → styling
```

There is less translation between the code I author and the page I debug. For a visually demanding site, I find this easier to reason about than a SwiftUI-style layer over the browser.

## Where I would use Raptor

Swift can express a Web UI; the question is how much distance from the rendering platform is useful.

For a generic interface:

```plain
Abstraction helps
```

For a highly customized interface:

```plain
Abstraction fights the platform
```

Raptor is strongest in the first case: structured pages made from familiar components, where its type safety and composition do real work. It becomes less comfortable in the second, precisely when selectors, pseudo-elements, and small layout adjustments matter most.

The broader stack still has two layers:

```plain
Rendering layer → HTML / CSS / JS
Authoring layer → Swift / React / Astro
```

React and Astro stay relatively close to the rendering layer. Raptor deliberately moves farther away, which gives it a distinctive SwiftUI-like experience but also creates the mismatch I hit while building the theme.

My practical boundary after this project is:

```plain
Swift for logic → great
Swift for UI abstraction → situational
HTML/CSS/JS → still the source of truth
```

I would still choose Raptor for a simple, structured Swift site. For a visual-heavy theme, I would rather use a Saga-style approach and keep the browser’s own UI model visible.
