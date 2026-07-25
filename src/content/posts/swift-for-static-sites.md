---
title: Swift for Static Sites
published: 2026-05-01
description: SwiftUI Purism vs Web-Native Reality
tags: [Swift, SwiftUI, SSG, Web]
category: Engineering
draft: false
lang: en
translationKey: swift-for-static-sites
---

I recently tried to answer a practical question: if I move a visually complex blog theme to a Swift static site generator, which one should I use?

I went through [Saga](https://github.com/loopwerk/Saga), [Toucan](https://github.com/toucansites/toucan), [Publish](https://github.com/JohnSundell/Publish), [Ignite](https://github.com/twostraws/Ignite), and [Raptor](https://github.com/raptor-build/raptor), then compared them with Web-native tools such as [Astro](https://github.com/withastro/astro), [Hexo](https://github.com/hexojs/hexo), [Hugo](https://github.com/gohugoio/hugo), and [Jekyll](https://github.com/jekyll/jekyll).

After reading their source and examples and trying them myself, I found that the choice depends less on feature count than on where Swift sits in the stack. A SwiftUI-like component API and a Swift program that generates ordinary HTML may look similar in a small demo, but they behave very differently once the design needs custom CSS.

## The browser is the UI runtime

SwiftUI works on iOS because its abstractions connect to a system UI runtime:

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

A SwiftUI `Button` is connected to platform behavior including accessibility, focus, animation, and input. A button declared through Raptor or Ignite eventually becomes:

```html
<button class="...">Save</button>
```

plus CSS. The browser does not know about the Swift component that produced it; it only receives HTML, CSS, and JavaScript.

This is not an argument against declarative UI. React, Vue, and Astro are declarative too. The important difference is the object being declared and how closely it matches the browser's own model.

| Framework      | What you declare                  | Distance from the platform |
| -------------- | --------------------------------- | -------------------------- |
| SwiftUI        | Native UI tree                    | Very close                 |
| React / Vue    | DOM / component tree              | Very close                 |
| Astro          | HTML + islands                    | Very close                 |
| Saga / Publish | HTML output tree                  | Close                      |
| Ignite         | Swift components (Bootstrap-like) | Medium                     |
| Raptor         | SwiftUI-like UI + style system    | Farther                    |

SwiftUI maps closely to its platform. React still models the DOM, and Astro treats HTML as a first-class part of the component. Ignite and Raptor move the working model farther upward into a Swift component tree. That can be pleasant for a simple page, but the extra translation becomes visible in a heavily customized theme.

## Where the component DSL stops helping

Ignite-style components are convenient for straightforward UI:

```swift
Text("Hello")
Button("Read More")
Grid {
  Card { ... }
}
```

With Bootstrap underneath, layout, spacing, responsiveness, and basic visual hierarchy arrive quickly. That is a good fit for documentation, portfolios, basic blogs, and other sites that can stay near the framework's built-in vocabulary.

A migrated visual theme is usually less cooperative. It may depend on CSS such as:

```css
.card::before
.sidebar:has(.active)
grid-template-columns: minmax(0, 1fr) 18rem
position: sticky
backdrop-filter
mask-image
container queries
```

Once the built-in components no longer express the design, the Swift code falls back to lower-level HTML wrappers:

```swift
Tag("aside") { ... }
.class("layout-shell__sidebar")
```

The CSS still has to be written. The page is now split between a SwiftUI-style vocabulary and direct HTML and CSS, so the abstraction no longer removes much work.

The useful range for this approach is still real:

```plain
Simple sites
Docs
Portfolios
Basic blogs
Bootstrap-like layouts
```

The difficulty begins when a theme originally built in Astro or Hexo relies on precise selectors, pseudo-elements, layout rules, and browser-specific behavior. This is a boundary of the abstraction, not a defect in declarative UI or in the frameworks themselves.

## Saga keeps the boundary visible

Saga takes a different route. It uses Swift for the parts where Swift is useful and leaves browser concerns in Web-native forms:

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

A template can look like this:

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

This is Swift generating HTML, not an attempt to reproduce SwiftUI in a browser. The division remains easy to inspect:

```plain
Swift-native:
Types, functions, composition

Web-native:
HTML, CSS, browser semantics
```

For this kind of project, that directness matters more than having a larger UI abstraction.

## Tailwind makes Saga more practical

Without Tailwind, a Saga template resembles conventional HTML with named CSS classes:

```swift
article(class: "post-card") {
  h2(class: "post-card__title") {
    item.title
  }
}
```

With Tailwind, the layout and styling remain next to the generated HTML:

```swift
article(class: "group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg") {
  h2(class: "text-2xl font-semibold tracking-tight") {
    a(href: post.url) {
      post.title
    }
  }
}
```

There is no need to translate each CSS concept into a Swift modifier API. Tailwind is still CSS, expressed through utility classes, so the browser-facing model stays recognizable.

## Raptor and Ignite fit different jobs

Raptor is more ambitious than a conventional static site generator. It defines a broad site model:

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

It also integrates with Vapor for server-side rendering. That makes it interesting for Swift-first content platforms, static and dynamic hybrid sites, and projects that need backend integration.

The site model does not automatically make a complex front end easier to express, however. When the theme exceeds its UI and style system, the implementation returns to:

```plain
Tag + Div + Class + CSS
```

At that point I would want the higher-level model to solve a separate problem—content architecture or server integration, for example—because it is no longer reducing the front-end work.

Ignite makes a more pragmatic trade:

```plain
Swift API + Bootstrap
```

It is fast for a small site, portfolio, or documentation project. The trade-off is that Bootstrap's structure and visual assumptions become harder to hide when the site needs a distinctive theme.

## Why I would still use Astro for the complex theme

If Swift is not itself a project requirement, Astro remains the safer choice for this particular job:

- HTML, CSS, and JavaScript are first-class;
- its components stay close to browser primitives;
- Tailwind integration is straightforward;
- Content Collections provide structure;
- the ecosystem is mature.

That does not make Swift incapable of building websites. It means the cost of the Swift abstraction has to buy something the project needs.

The two Swift approaches I compared can be summarized as:

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

For a highly customized visual site, I prefer the second model. Swift still provides types, functions, composition, content modeling, and generation logic, while HTML, CSS, and JavaScript retain control of the UI.

My practical shortlist after the comparison is:

```plain
Not using Swift: Astro + Tailwind
Using Swift seriously: Saga + Tailwind
Quick Swift site: Ignite
Exploring Swift Web frameworks: Raptor
```
