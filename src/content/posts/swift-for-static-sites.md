---
title: I Built a Website in Swift, Then Went Back to HTML and CSS
published: 2026-05-02
description: From adding one text style to reconsidering where Swift belongs in a Web stack
tags: [Swift, SwiftUI, Raptor, Astro, SSG, Web]
category: Engineering
draft: false
lang: en
translationKey: swift-for-static-sites
---

In late April, I made a serious attempt to rewrite my personal website in Swift.

It looked straightforward at first. A blog mostly turns Markdown into pages, and Raptor offered an API that felt close to SwiftUI. I could describe layouts with `VStack`, `HStack`, and `Text`, while keeping themes, colors, and typography in Swift. I already spent much of my time writing SwiftUI, so bringing the website into the same language sounded reasonable.

By early May, one missing text style had led me into the framework internals, followed by a spike that recreated the whole theme. The website still ended up on Astro.

I originally wrote three separate posts about this period: one about custom text roles, one comparing Swift static site generators, and one about the limits I encountered in Raptor. They were really three stages of the same experiment. Swift could obviously build the website. What I wanted to understand was when the additional Swift layer stopped making this particular website easier to build.

## Why Raptor was appealing

I looked at [Saga](https://github.com/loopwerk/Saga), [Toucan](https://github.com/toucansites/toucan), [Publish](https://github.com/JohnSundell/Publish), [Ignite](https://github.com/twostraws/Ignite), and [Raptor](https://github.com/raptor-build/raptor). They all generate static sites with Swift, but they place Swift at different points in the stack.

Saga and Publish are closer to “generate HTML with Swift.” Swift handles content models, pipelines, and template composition, while the tags and classes in the output remain visible in the source.

Ignite goes further by providing Swift components backed by Bootstrap. That is convenient for documentation, portfolios, and straightforward blogs because much of the responsive layout and basic styling is already handled.

Raptor aims for a more complete model. It provides concepts such as `Site`, `Page`, `Layout`, `Theme`, `Style`, and `PostWidget`, along with Vapor integration. A page can look like this:

```swift
VStack {
    Text(post.title)
    Text(post.description)
}
.style(PostCardStyle())
```

That was the part I found most interesting. Raptor was building a SwiftUI-like authoring layer for the Web, with Swift doing much more than filling in templates. The type safety, composition, and environment-aware themes all felt familiar, and the first pages were pleasant to write.

I built a theme spike before touching the existing site. The first problem was tiny: post dates, navigation labels, categories, and tags needed distinct typographic styles.

## My first wrong turn: adding text roles to Theme

Raptor's built-in text roles were mainly `body`, `title1` through `title6`, and `codeBlock`. A real blog also has small text that is neither a heading nor body copy, such as metadata and navigation labels.

In plain HTML, this barely qualifies as a design problem:

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

I wanted those roles to participate in Raptor's type system, so I designed an API like this:

```swift
Text("April 20").textRole(.postMeta)
```

The theme would configure it globally:

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

To make that work, I changed the theme configuration, CSS generation, and rendering logic. It eventually produced the expected HTML:

```html
<p class="text-role-post-meta">April 20</p>
```

Dark mode worked, CSS was generated automatically, and everything remained type checked. As an implementation task, it was complete.

It still felt awkward in use. Raptor's existing API:

```swift
.font(.title1)
```

affected both a semantic tag such as `<h1>` and its visual styling. My `textRole` only changed the style. Calls gradually became:

```swift
.tag(.h1)
.textRole(.navLabel)
```

which was an elaborate way to express:

```html
<h1 class="nav-label"></h1>
```

I had added a framework API only to recreate tags and classes.

Reading Raptor's design again revealed the better entry point that was already there: `Style`.

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

It could be applied directly:

```swift
Text("April 20")
    .style(PostMetaStyle())
```

Theme held global design tokens such as typography, colors, and spacing. `Style` packaged reusable local styling. The framework already supported what I needed; I had started in the wrong layer.

That detour was not a failure of Raptor. If anything, finding the intended abstraction encouraged me to continue. My opinion changed during the full-theme spike.

## A complex theme changed the working model

Some layouts translated very well. Putting categories on the left and a timestamp on the right was clear in Raptor:

```swift
HStack {
    categories
    Spacer().axis(.horizontal)
    time
}
.style(Property.width(.percent(100)))
```

I found that easier to read than a few flex rules scattered through a stylesheet, and the component boundaries were useful.

The friction appeared in details that are ordinary in a browser but do not naturally look like SwiftUI components.

The original theme drew a short accent line with a pseudo-element:

```css
.recent-info::after {
  content: '';
  width: 13%;
  height: 5px;
  background: var(--accent);
}
```

In Raptor, I represented it as a real component:

```swift
RecentInfoAccentBar()
```

The pixels matched, but the document structure had changed. A decorative CSS layer had entered the component tree solely to reproduce `::after`.

Cross-element hover state had the same problem:

```css
.card:hover .read-more {
  background-color: var(--bg-hover);
}
```

The browser already understands this relationship between an ancestor and a descendant. In the component DSL, I either had to redesign the interaction or coordinate the styles separately. Even a small negative-margin adjustment eventually looked like this:

```swift
.style(Property.marginTop(.px(-21)))
```

The source was Swift, but the idea in my head was still CSS.

Debugging did not move into a SwiftUI Preview either. The generated page ran in a browser, so I still opened DevTools, inspected the DOM, checked selectors and the box model, and then went back to edit another description of that result in Swift.

```plain
Page structure: Swift components
Visual rules: CSS concepts
Final debugging: DOM + Browser DevTools
```

When Raptor's components covered a requirement, the translation was smooth. Once they did not, the code drifted toward `Tag + Div + Class + CSS`, or toward CSS properties rewritten one by one as Swift modifiers. None of my Web knowledge disappeared, and I also had to maintain the mapping from Swift to HTML and CSS.

Adding one more missing feature would not settle my concern. More APIs could be added, and I could keep writing them. Every visual detail still required a new decision: did it belong in a Swift component, a Raptor `Style`, or raw CSS? For a personal blog, that cost was not buying enough in return.

## Could another Swift SSG avoid this?

Partly, depending on why the project needs Swift.

Saga keeps the boundary especially direct. Swift handles content models, generation, and composition, while HTML and CSS remain visibly Web-native:

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

It does not pretend CSS is gone. With Tailwind, the connection between a template and its final HTML is still easy to follow. If a future project explicitly requires Swift, Saga would still be my first candidate.

Ignite fits a different job. When Bootstrap already covers most of the layout, it can build a complete site quickly. The more distinctive the visual design becomes, the more work goes into overriding Bootstrap later.

Raptor also has a clear place. A Swift-first content platform, a static and dynamic site that benefits from Vapor, or a project with a regular UI can all gain from its broader site model. My project was an existing personal blog with a specific visual language. Server integration and a richer content platform were not the problems I needed to solve.

There was therefore no single “best Swift SSG” at the end of the comparison. The more useful question was what Swift solved after being added to a particular project. “Every file can be Swift” was not enough of an answer for me.

## Why I still used Astro

Saga might have remained in consideration if I had been starting from an empty directory. The actual project already had an existing theme close to the result I wanted.

I had already found Fuwari, an Astro and Tailwind blog theme whose page structure, cards, sidebar, and overall visual direction were close to what I wanted. It already included responsive layouts, light and dark modes, transitions, Markdown extensions, a table of contents, Pagefind search, and RSS.

Moving to Raptor meant rebuilding the DOM structure and CSS selectors, along with responsive behavior, theme switching, animation, search, the table of contents, content processing, and the build and deployment path. It was much larger than translating a few Astro components into Swift. The result would still be the same blog, with an extra Swift-to-Web mapping in the middle.

Astro gave me a much shorter modification path. Structure lived in `.astro` components, styling remained CSS and Tailwind, and interactive pieces could use a small Svelte component or browser script. Elements in DevTools mapped closely to the source. Fixing a hover state or breakpoint did not begin with deciding which modifier the framework ought to expose.

The work that came later reinforced that choice. The site gained Chinese, English, and Japanese content; localized routes; Cloudflare preferred-language redirects; locale-specific Pagefind indexes; RSS; a sitemap; series; archives; and a language switcher. Those problems mostly belonged to routing, Content Collections, static generation, and browser behavior. Astro did not hide those layers, but it let me work where each problem actually occurred.

The reason I kept Astro was ultimately mundane: an existing theme had already completed most of the front-end work I needed, and I wanted to spend my time on writing, multilingual content, search, and the reading experience. Reimplementing the entire theme so the website could also be written in Swift did not offer enough value.

## What I kept from the experiment

I did not leave the experiment thinking Swift was unsuitable for the Web. Saga's direct approach still appeals to me, and Raptor's distinction between Theme and Style made me reconsider the boundaries between design tokens, semantic styles, and components. I would revisit these tools for a site that needed a Swift backend, shared content models, or a more regular interface.

This personal site had already answered the practical question. Its difficult parts were browser-facing details and the content workflow, and Astro sat closer to both.

The spike ended there. The website went back to Astro, and I stopped adding another abstraction to Raptor.
