---
title: The Raptor Dilemma
published: 2026-05-01
description: SwiftUI Dreams vs Web Reality
tags: [English, Swift, SwiftUI, SSG]
category: Tech
draft: false
---

## Introduction

In my previous post, I explored a simple but fundamental question:

> **Where should Swift live in the Web stack?**

After comparing tools like Astro, Saga, Toucan, Publish, Ignite, and Raptor, I came to a preliminary conclusion:

> **Swift is best suited for modeling content and generation logic,**
>
> **while HTML, CSS, and JavaScript remain the native layer of UI expression.**

However, after actually building a site with Raptor — not just reading docs, but implementing a real theme — I ran into something more concrete.

Not a bug.
Not a limitation.

**A dilemma.**

## What Raptor Is Trying to Do

Raptor is not just a static site generator.

It defines a Swift-first model of the Web:

* Pages
* Layouts
* Themes
* Styles
* Components

Instead of writing:

```html
<article class="post-card">
  <h2>Title</h2>
</article>
```

You write:

```swift
VStack {
    Text(post.title)
}
.style(PostCardStyle())
```

The promise is appealing:

* Type safety
* Composability
* A unified language (Swift)
* A SwiftUI-like developer experience

In theory, this brings the same productivity gains SwiftUI brought to iOS.

## The Sweet Spot

For simple pages, this works extremely well.

You can write:

```swift
Text("Hello")
Button("Read more")
```

And quickly build:

* landing pages
* documentation sites
* simple blogs

The abstraction feels clean, expressive, and productive.

If your UI fits into:

```plain
Text + Button + Grid + Card
```

Raptor feels great.

## Where It Starts to Break

But real-world UI rarely stays simple.

Especially if your goal is to build a **custom visual theme**.

Let’s take a very common pattern from blog themes:

### Example 1: Meta row layout

In CSS:

```css
.meta {
  display: flex;
  justify-content: space-between;
}
.meta time {
  float: right;
}
```

In Raptor, you end up rewriting the intent:

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

This is fine — even cleaner.

But now consider more complex cases.

### Example 2: Pseudo-elements (::after)

In CSS:

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

In Raptor:

```swift
RecentInfoAccentBar()
```

You replace a CSS pseudo-element with a real component.

That’s not inherently bad — but it changes how you think:

* CSS: decorative layer
* Raptor: structural element

You are no longer “styling”, you are rebuilding structure.

### Example 3: Hover interactions across elements

In CSS:

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

In Raptor:

There is no clean equivalent unless:

* you redesign the interaction
* or manually coordinate styles

Because:

> **CSS selectors express relationships that Raptor’s component model does not.**

## Example 4: Negative margins and layout hacks

In CSS:

```css
.read-more {
  margin-top: -21px;
}
```

In Raptor:

```swift
.style(Property.marginTop(.px(-21)))
```

At this point, you are not escaping CSS.

You are **translating it**.

## The Core Dilemma

This leads to the central issue:

> **Raptor tries to replace Web UI with Swift abstractions,**
>
> **but it still runs on a platform that only understands HTML, CSS, and JavaScript.**

So developers end up in a strange position:

```plain
They think in Swift,
but debug in CSS.

They write components,
but fight layout at the DOM level.

They define styles,
but still rely on raw CSS properties.
```

The abstraction doesn’t remove complexity.

It **relocates it**.

## The Practical Reality

In practice, building a real theme feels like this:

### Step 1: Swift abstraction

```swift
PostListItem {
    PostMeta(...)
    PostTitle(...)
    PostExcerpt(...)
    PostReadMore(...)
}
```

### Step 2: Style layer

```swift
.style(PostCardStyle())
```

### Step 3: Eventually…

```swift
.style(Property.marginTop(.px(12)))
.style(Property.paddingLeft(.px(8)))
.style(Property.fontSize(.px(14)))
```

At this point:

You are writing CSS again — just in Swift syntax.

## The Fragmentation Problem

You end up with a split mental model:

```plain
Structure → Swift
Styling → CSS concepts
Layout debugging → Browser DevTools
```

This creates a workflow that feels:

```plain
Half SwiftUI
Half traditional Web
```

Not fully one or the other.

## Comparison: Saga

This is where Raptor differs sharply from Saga.

Saga does not try to replace Web UI.

It embraces it.

Example:

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

Here:

```plain
Swift → structure + composition
HTML → structure
CSS → styling
```

No translation layer.

No abstraction mismatch.

## Why This Matters

The problem is not whether Swift can express UI.

It can.

The problem is:

> **Should it?**

For simple UI:

```plain
Abstraction helps
```

For complex UI:

```plain
Abstraction fights the platform
```

## A Key Insight

After building a real site, the conclusion becomes clearer:

> **Raptor’s abstraction is strongest where UI is generic,**
>
> **and weakest where UI is highly customized.**

Which is exactly where you need control the most.

## A More General Perspective

This is not just about Raptor.

It’s about **layers**.

```plain
Rendering layer → HTML / CSS / JS
Authoring layer → Swift / React / Astro
```

React and Astro work well because they remain close to the rendering layer.

Raptor moves further away.

That distance is both its strength and its weakness.

## Conclusion

Raptor is an ambitious attempt to bring SwiftUI-style thinking to the Web.

But the Web already has its own native UI system.

The dilemma is not about capability.

It’s about boundaries.

> **When Swift tries to replace Web UI,**
>
> **the abstraction cost grows quickly.**
>
> **When Swift complements Web UI,**
>
> **its strengths actually shine.**

In the end:

> **The Web tends to win.**

## Final Takeaway

```plain
Swift for logic → great
Swift for UI abstraction → situational
HTML/CSS/JS → still the source of truth
```

## TL;DR

* Raptor shines for simple, structured UI
* It struggles with complex, highly customized layouts
* CSS concepts inevitably leak through
* Saga-style approaches feel more stable for visual-heavy sites
* The real question is not “Can Swift build UI?” but:

> **"Where should Swift stop?"**
