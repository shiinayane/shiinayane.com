---
title: Building a Personal Website in Swift
published: 2026-04-21
description: I Thought It Was Easy… Until It Wasn’t
tags: [English, Swift, SwiftUI, SSG]
category: Tech
draft: false
---

## Introduction

I recently started building my personal website using Swift.

**Not JavaScript. Not Hugo. Not a typical static site generator.**

Instead, I chose a Swift-based SSG called Raptor. The idea was simple: if I already write Swift every day, why not use it for my website too?

At first, everything felt surprisingly smooth. Writing layouts in Swift felt expressive, type-safe, and honestly… kind of fun.

But then I ran into a problem I didn’t expect.

And that problem turned out to be much deeper than I thought.

## What is Raptor?

Before going further, a quick explanation.

Raptor is a static site generator written in Swift. Instead of writing HTML templates or JSX, you describe your site using Swift code:

```swift
VStack {
    Text("Hello, world!")
    Text("Welcome to my site")
}
```

It also has a built-in theme system, where you can define typography and colors:

```swift
.font(.title1)
.fontSize(36, for: .title1)
```

So far, so good.

## The Problem: Real-World Themes Are Messy

When you build a real website (not just a demo), you quickly realize something:

Not all text is just “title” or “body”.

You also have things like:

- post metadata (dates, authors)
- navigation labels
- tags and categories
- small UI text like buttons or links

In traditional static site generators (like Hugo or Hexo), this is trivial:

```html
<span class="post-meta">April 20</span>
<a class="nav-label">Archive</a>
```

And then in CSS:

```css
.post-meta {
  font-size: 12px;
  color: gray;
}
.nav-label {
  font-weight: bold;
}
```

You just invent class names and move on.

## Why This Felt Hard in Swift

In Raptor, typography is built around a fixed set of roles:

- body
- title1 … title6
- codeBlock

But there’s no built-in way to express:

```swift
.postMeta
.navLabel
```

So I started thinking:

“Why can’t I define my own text roles?”

## My First Idea: Extend the Theme System

I tried adding a custom concept like this:

```swift
Text("April 20").textRole(.postMeta)
```

And in the theme:

```swift
.fontSize(12, for: .postMeta)
.fontWeight(.medium, for: .postMeta)
```

Then generate CSS like:

```css
.text-role-post-meta {
  font-size: 12px;
  font-weight: 500;
}
```

And attach it to HTML:

```html
<p class="text-role-post-meta">April 20</p>
```

## It Worked… Technically

After quite a bit of digging into the framework:

- modifying theme configuration
- updating CSS generation
- patching rendering logic

I actually got it working.

Custom text roles could:

- go through the theme system
- support light/dark mode
- generate CSS automatically
- appear in HTML

So… problem solved?

Not really.

## Something Felt Off

Even though it worked, the system started to feel… weird.

Here’s why.

1. **Two Competing Systems**

    Now I had:

    ```swift
    .font(.title1)        // built-in
    .textRole(.postMeta)  // custom
    ```

    Two ways to describe text.

    That’s already a smell.

2. **Tag vs Style Confusion**

    In Raptor:

    ```swift
    .font(.title1)
    ```

    does two things:

    - decides the HTML tag (`<h1>`)
    - applies styling

    But in my system:

    ```swift
    .textRole(.navLabel)
    ```

    only affects styling.

    That made me realize:

    HTML tag and text style are actually two different things.

    But the framework treats them as one.

3. **It Started to Feel Like Writing HTML Anyway**

    At some point I found myself writing things like:

    ```swift
    .tag(.h1)
    .textRole(.navLabel)
    ```

    Which is basically:

    ```html
    <h1 class="nav-label"></h1>
    ```

    At that moment I had a thought:

    “Wait… am I just reinventing HTML with extra steps?”

## Looking at Other Tools

I checked how other SSGs handle this.

Hugo, for example (written in Go), does not solve this problem at the framework level.

It simply lets you write:

```html
<p class="post-meta"></p>
```

and handle everything in CSS.

No type system. No abstraction. Just freedom.

## So… What’s the Real Problem?

The problem is not “we need a unified role system”.

The real problem is:

**I was trying to solve this in the wrong layer.**

After digging deeper into Raptor’s design (and even its source code), I realized something important:

- Theme is designed for **global design tokens** (typography, colors, spacing)
- But **semantic styles are not meant to live in Theme**

Instead, Raptor already provides a dedicated abstraction for this:

> **Style**

And I had completely overlooked it.

## The Actual Solution (That I Missed)

It turns out Raptor already has the right abstraction for this problem.

Not `textRole`.

Not extending Theme.

But this:

```swift
struct PostMetaStyle: Style {
    func style(content: Content, environment: EnvironmentConditions) -> Content {
        content
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

And then:

```swift
Text("April 20")
    .style(PostMetaStyle())
```

That’s it.

This is effectively:

```html
<p class="post-meta">April 20</p>
```

But expressed in a reusable, composable, and type-safe way.

Even better, `Style` can access environment conditions:

- light / dark mode
- active theme
- contrast settings
- layout conditions

Which means you can write:

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

So instead of:

- trying to extend Theme
- or inventing a new role system

The intended model is:

- **Theme → defines global tokens**
- **Style → defines reusable semantic styles**

In other words, Raptor already supports exactly what I wanted — just not in the place I was looking.

## What I Learned

This little experiment taught me a few things:

1. **“Elegant” abstractions can be misleading**

    A unified system looks great on paper, but may not fit the existing architecture.

2. **Not everything needs to be in the type system**

    Traditional SSGs work fine by leaving some flexibility to CSS.

    Trying to encode everything in Swift may not always be worth it.

3. **The real challenge is understanding the abstraction boundary**

    The key isn’t:

    “How do I define more roles?”

    But:

    **“Which layer should own semantic styles?”**

    In Raptor’s case, the answer is:

    - Theme → tokens
    - Style → semantics

## Closing Thoughts

I started this thinking:

“I just need a way to define custom text styles.”

And ended up questioning:

The most surprising part?

The framework already had the answer.

I just didn’t understand it yet.

- how theme systems should be designed
- how much abstraction is too much
- and where Swift should (and shouldn’t) replace CSS

I’m still building my site in Swift — and I still like it.

But now I have a much clearer idea of where the real complexity lies.
