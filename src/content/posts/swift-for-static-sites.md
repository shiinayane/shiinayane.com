---
title: Swift for Static Sites
published: 2026-05-01
description: SwiftUI Purism vs Web-Native Reality
tags: [English, Swift, SwiftUI, SSG]
category: Tech
draft: false
---

Recently I went through a number of static site generators in the Swift ecosystem — [Saga](https://github.com/loopwerk/Saga), [Toucan](https://github.com/toucansites/toucan), [Publish](https://github.com/JohnSundell/Publish), [Ignite](https://github.com/twostraws/Ignite), and [Raptor](https://github.com/raptor-build/raptor) — and compared them with more mature Web-native tools like [Astro](https://github.com/withastro/astro), [Hexo](https://github.com/hexojs/hexo), [Hugo](https://github.com/gohugoio/hugo), and [Jekyll](https://github.com/jekyll/jekyll).

At first, my question was simple:

> If I want to migrate a complex visual blog theme into a Swift SSG, which tool works best?

But after reading source code, examples, and trying them in practice, the real question became:

> **Where should Swift actually live in the Web stack?**

Should we try to express UI using Swift components (like SwiftUI), or should we accept that the Web is fundamentally HTML, CSS, and JavaScript — and let Swift focus on modeling and generation?

This question turns out to be fundamental.

## The Web Already Has a Native Runtime

SwiftUI works on iOS because it maps directly to a system UI runtime.

You can think of it like this:

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

A SwiftUI Button is not a simulation — it connects directly to platform behaviors: accessibility, focus, animation, input.

But a Button in Raptor or Ignite ultimately becomes:

```html
<button class="...">Save</button>
```

plus CSS.

The browser has no idea what a Swift Button is. It only understands HTML, CSS, and JS.

So the issue is not whether declarative UI is good — React, Vue, and Astro are all declarative.

The difference is what you are declaring.

## What Are You Actually Declaring?

Let’s compare:

| Framework      | What you declare                  | Distance from the platform |
| -------------- | --------------------------------- | -------------------------- |
| SwiftUI        | Native UI tree                    | Very close                 |
| React / Vue    | DOM / component tree              | Very close                 |
| Astro          | HTML + islands                    | Very close                 |
| Saga / Publish | HTML output tree                  | Close                      |
| Ignite         | Swift components (Bootstrap-like) | Medium                     |
| Raptor         | SwiftUI-like UI + style system    | Farther                    |

This table doesn’t say which is better — it shows how closely your mental model matches what the browser actually runs.

SwiftUI works because the abstraction matches the platform.

React works because it still models the DOM.

Astro works because it embraces HTML as a first-class citizen.

Raptor and Ignite, however, try to move the abstraction upward — into a Swift component tree.

That works beautifully for simple pages.

But when the UI becomes complex, friction appears.

## The Sweet Spot — and the Cliff

Frameworks like Ignite shine when the UI is simple:

```swift
Text("Hello")
Button("Read More")
Grid {
  Card { ... }
}
```

Bootstrap gives you layout, spacing, responsiveness, and visual hierarchy for free.

But real-world visual themes often require things like:

```css
.card::before
.sidebar:has(.active)
grid-template-columns: minmax(0, 1fr) 18rem
position: sticky
backdrop-filter
mask-image
container queries
```

Once you go beyond built-in components, you often fall back to:

```swift
Tag("aside") { ... }
.class("layout-shell__sidebar")
```

and then write CSS anyway.

At that point, the abstraction becomes fragmented:

> half SwiftUI-style, half HTML wrapper.

The issue isn’t that Raptor or Ignite are flawed.

It’s that their abstraction sweet spot is:

```plain
Simple sites
Docs
Portfolios
Basic blogs
Bootstrap-like layouts
```

When your goal is a highly customized visual theme, especially one originally written in Astro or Hexo, the abstraction starts to break.

## Saga: Swift Purism, Not SwiftUI Purism

Saga takes a very different approach.

Instead of trying to replace Web primitives, it divides responsibilities cleanly:

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

A Saga template might look like:

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

This is not SwiftUI.

It does not pretend to be.

It is simply Swift generating HTML — with full respect for Web primitives.

That’s why Saga feels more “native” in both worlds:

```plain
Swift-native:
Types, functions, composition

Web-native:
HTML, CSS, browser semantics
```

## Tailwind Changes the Experience

Without Tailwind, Saga feels like classic HTML + CSS:

```swift
article(class: "post-card") {
  h2(class: "post-card__title") {
    item.title
  }
}
```

With Tailwind:

```swift
article(class: "group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg") {
  h2(class: "text-2xl font-semibold tracking-tight") {
    a(href: post.url) {
      post.title
    }
  }
}
```

Now you’re controlling layout, spacing, and style directly at the HTML level.

No translation needed.

This avoids one of the biggest problems in SwiftUI-style DSLs:

> translating CSS concepts into Swift modifiers.

Instead, Tailwind remains CSS — just expressed differently.

## Raptor: Ambitious, but Friction-Prone for Complex UI

Raptor aims higher than a typical SSG.

It defines:

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

It even integrates with Vapor for server-side rendering.

This is powerful — especially for:

* Swift-first content platforms
* Static + dynamic hybrid sites
* Backend integration

But it doesn’t automatically solve front-end expression.

In fact, once UI becomes complex, you often end up writing:

```plain
Tag + Div + Class + CSS
```

again.

Which raises a fundamental question:

> If complex UI still requires Web-native expression, what value does the abstraction add?

## Ignite: Fast, but Opinionated

Ignite is more pragmatic.

It embraces:

```plain
Swift API + Bootstrap
```

This makes it great for:

* quick sites
* portfolios
* documentation

But Bootstrap becomes visible.

If your goal is a highly customized visual identity, the built-in structure can become limiting.

## Astro: Still the Most Stable Choice

If we ignore Swift entirely and ask:

> *What is the most stable tool for complex visual static sites?*

The answer is still Astro.

Because:

* HTML/CSS/JS are first-class
* Components are native to the platform
* Tailwind integration is smooth
* Content Collections provide structure
* Ecosystem is mature

Astro doesn’t fight the Web.

It grows from it.

## The Real Question

This entire exploration leads to a clearer conclusion:

>**The real question is not “Can Swift build websites?”**
>
>**It is “Where should Swift be used?”**

## Final Perspective

There are two fundamentally different philosophies:

### SwiftUI-style Web DSL (Raptor / Ignite)

```plain
Swift expresses UI
→ translated into HTML/CSS
```

### Swift-native generation + Web-native UI (Saga)

```plain
Swift handles logic and structure
HTML/CSS/JS express the UI
```

For complex visual sites, the second model is more stable.

Not because it is more powerful —
but because it respects the platform.

## Final Takeaway

> **Swift should not compete with HTML/CSS/JS.**
>
> **It should complement them.**

When Swift tries to replace the UI layer, abstraction costs rise quickly.

When Swift focuses on modeling and generation, its strengths — type safety, composition, and tooling — shine.

## TL;DR

```plain
Not using Swift: Astro + Tailwind
Using Swift seriously: Saga + Tailwind
Quick Swift site: Ignite
Exploring Swift Web frameworks: Raptor
```
