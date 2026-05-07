---
title: From Hating Swift Function Signatures to Actually Enjoying Them
published: 2026-05-07
tags: [Swift, Programming]
category: Engineering
draft: false
lang: en
---

When I first started learning Swift, I absolutely hated reading function signatures.

Opening Apple’s DocC documentation for the first time felt like staring at some kind of ancient spellbook:

```swift
func compactMap<ElementOfResult>(
    _ transform: (Self.Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

My honest reaction was:

> “Why the hell does a single function need to look this terrifying?”

Compared to Python, Swift felt absurdly verbose.

Python APIs looked simple and friendly:

```python
map(func, arr)
filter(func, arr)
```

Meanwhile Swift kept throwing things at me like:

* generics
* Optional
* associated types
* protocol constraints
* throws
* rethrows

all packed into one line.

At first, I completely ignored signatures and jumped straight to example code. I treated the type system as noise.

But somewhere along the way, something changed.

Now I sometimes find myself reading only the function signature and immediately understanding what the API is supposed to do.

That transition felt surprisingly satisfying.

---

## Swift Is Not Trying to Be Complicated

Eventually I realized Swift signatures are not “complex for the sake of complexity.”

Swift is trying to make implicit information explicit.

Take this:

```swift
func map<T>(
    _ transform: (Element) throws -> T
) rethrows -> [T]
```

At first glance, it looks intimidating.

But once you learn how to read it, it becomes incredibly descriptive.

You can almost mechanically decompose it:

* map
* takes an Element
* transforms it into T
* returns [T]
* the closure may throw
* map itself only throws if the closure throws

At some point I realized:

> the type signature itself is documentation.

Sometimes better documentation than paragraphs of prose.

---

## The Moment Things Started Clicking

The real turning point for me was understanding the difference between:

* map
* compactMap
* flatMap

At first I only knew how to use them mechanically.

```swift
arr.map { ... }
```

worked, but I did not really understand the deeper idea behind them.

Then I forced myself to read the signatures carefully.

For example:

```swift
func compactMap<ElementOfResult>(
    _ transform: (Element) throws -> ElementOfResult?
) rethrows -> [ElementOfResult]
```

That was the first time I truly understood:

> compactMap is basically:
>
> “map Optional values, then flatten away nil.”

And then came this monster:

```swift
func flatMap<SegmentOfResult>(
    _ transform: (Element) throws -> SegmentOfResult
) rethrows -> [SegmentOfResult.Element]
where SegmentOfResult : Sequence
```

This one finally made me understand what flatMap actually means.

Not “advanced map.”

Not “magic.”

But simply:

> flattening nested containers.

Like turning:

```plain
[[1], [2,2], [3,3,3]]
```

into:

```plain
[1,2,2,3,3,3]
```

That moment completely changed how I viewed Swift APIs.

---

## Swift’s Type System Is Trying to Tell You a Story

One thing I slowly began to appreciate is that Swift signatures are extremely intentional.

For example:

```swift
func popLast() -> Element?
```

already tells you:

* this operation may fail
* failure is represented safely with Optional
* no crash on empty arrays

without reading a single sentence of explanation.

Or compare:

```swift
removeLast()
```

vs

```swift
popLast()
```

The naming itself communicates risk.

Swift APIs often feel like they were designed not just for machines, but for human reasoning.

---

## Reading Signatures Became More Important Than Reading Tutorials

At some point I noticed a strange shift in how I learn Swift.

I stopped asking:

> “How do I use this API?”

and started asking:

> “What is this type signature trying to express?”

Because once you can read things like:

```swift
(Element) -> T
(Element) -> T?
Sequence<Element>
where T : BinaryInteger
```

you start understanding the relationships between types instead of memorizing syntax.

And that changes everything.

---

## Swift’s “Complexity” Is Really Compile-Time Safety

I think Swift intentionally chooses:

```plain
more complexity during compilation
```

instead of:

```plain
more uncertainty at runtime
```

The language wants invalid states to become difficult — or impossible — to express.

That is why Swift leans so heavily into:

* Optional
* generics
* protocol-oriented design
* type constraints
* explicit error handling

At first it feels exhausting.

But once the mental model clicks, those terrifying signatures start becoming surprisingly readable.

Even elegant.

---

## The Real Shift Was Not Technical

Looking back, the biggest change was not that I suddenly became better at Swift.

It was that I stopped treating the type system as an obstacle.

I started treating it as communication.

And somewhere between:

> “Why is this signature so long?”

and

> “Let me read the signature first.”

I realized I had finally started thinking in Swift.
