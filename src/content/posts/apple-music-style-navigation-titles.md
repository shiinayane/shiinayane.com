---
title: Recreating Apple Music–Style Collapsing Navigation Titles in SwiftUI
published: 2026-04-03
tags: [English, SwiftUI]
category: Tech
draft: false
---

In the iOS 26, some system apps like Apple Music introduced a subtle UI pattern: **the navigation title and toolbar area disappear completely when scrolling.**

This is different from the classic **large-title collapse behavior** that has existed since iOS 11.

![example in Apple Music](/images/Picsew_20260403230045.PNG)

Traditional behavior:

```plain
Large Title
   ↓ scroll
Small Navigation Title
```

New behavior seen in Apple Music:

```plain
Large Title
   ↓ scroll
(no title)
```

The entire header area visually disappears, leaving more room for content.

Naturally, many developers started looking for a SwiftUI modifier that enables this behavior.

At the moment, however, there is no public SwiftUI API that directly exposes this interaction.

## How Apple Might Be Implementing This

From observing system apps and experimenting with SwiftUI, the effect likely relies on a combination of:

- Custom top headers inserted via `safeAreaInset(edge: .top)`
- Scroll detection using `ScrollGeometry`
- Separate visibility logic for different toolbar elements
- Animated opacity / offset transitions

SwiftUI already provides pieces that could support this architecture:

```swift
.onScrollGeometryChange(...)
.safeAreaInset(...)
.toolbar(...)
```

But these are **low-level building** blocks, not a dedicated modifier.

For example, if you wanted to recreate the behavior in a robust way, you could do something like this.

## A Proper Implementation Approach

The most flexible way is to track the scroll position and adjust the header visibility.

A simplified version might look like this:

```swift
struct CollapsingHeaderView: View {

    @State private var headerHidden = false

    var body: some View {
        ScrollView {
            VStack {
                ForEach(0..<50) { i in
                    Text("Row \(i)")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
        }
        .onScrollGeometryChange(for: CGFloat.self) { geometry in
            geometry.contentOffset.y
        } action: { _, offset in
            headerHidden = offset > 40
        }
        .safeAreaInset(edge: .top) {
            header
                .opacity(headerHidden ? 0 : 1)
                .animation(.easeInOut, value: headerHidden)
        }
    }

    private var header: some View {
        HStack {
            Text("Library")
                .font(.largeTitle.bold())

            Spacer()

            Image(systemName: "person.crop.circle")
        }
        .padding()
        .background(.ultraThinMaterial)
    }
}
```

This approach has a few advantages:

- Works with `ScrollView`, `List`, or `LazyVStack`
- Allows fully custom header layouts
- Gives precise control over when the header hides
- Supports animations and complex transitions

It also reflects how many developers believe Apple internally structures similar UI patterns.

However, this approach comes with a downside: **you now own the scroll logic.**

That means managing:

- scroll thresholds
- scroll direction
- toolbar layout
- edge cases with refreshable
- nested navigation stacks

For some apps this is perfectly fine, but it may feel heavy for simple layouts.

## A Surprisingly Simple Trick

While experimenting with SwiftUI navigation bars, I discovered a much simpler trick.

If you add an empty principal toolbar title, the collapsed navigation title becomes invisible.

```swift
.toolbar {
    ToolbarItem(placement: .principal) {
        Text("")
    }
}
```

Used together with a large navigation title:

```swift
.navigationTitle("Library")
.navigationBarTitleDisplayMode(.large)
```

the visual behavior becomes:

```plain
Large Title
   ↓ scroll
(empty)
```

In other words, the collapsed title still exists — it just renders nothing.

Example:

```swift
NavigationStack {
    List(items) { item in
        Text(item.title)
    }
    .navigationTitle("Library")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .principal) {
            Text("")
        }
    }
}
```

This produces a surprisingly convincing effect that resembles the Apple Music collapsing header.

## Why This Works

SwiftUI navigation bars internally transition between two states:

```plain
Large Navigation Title
        ↓
Compact Navigation Title
```

By replacing the compact title with an empty view, the collapsed state effectively becomes invisible.

So instead of seeing:

```plain
Large Title
   ↓
Small Title
```

you get:

```plain
Large Title
   ↓
(blank space)
```

The navigation bar itself still exists, but visually it looks like the header disappeared.

## Limitations

This trick works because of how SwiftUI currently renders navigation titles, but it has a few caveats:

- The navigation bar is still present.
- Toolbar items may still occupy layout space.
- It relies on current SwiftUI behavior and could change in future versions.

In other words, this is a visual shortcut, not a full reimplementation of the Apple Music UI.

## Will Apple Provide an Official API?

Possibly.

Apple often ships new UI patterns in system apps first and exposes them publicly later.

Examples include:

- `.searchable`
- large navigation titles
- tab bar minimization behavior (as shown in Apple Music)

So it would not be surprising if a future SwiftUI release introduced something like:

```swift
.navigationBarCollapseBehavior(.onScroll)
```

or

```swift
.toolbarScrollVisibility(.hidden)
```

Until then, developers can either:

1. Implement a custom collapsing header with scroll detection
2. Use the small toolbar trick above for a lightweight approximation

Both approaches can achieve a very similar user experience.
