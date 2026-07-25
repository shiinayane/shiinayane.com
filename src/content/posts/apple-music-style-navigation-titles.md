---
title: Recreating Apple Music’s Disappearing Navigation Title in SwiftUI
published: 2026-04-03
tags: [SwiftUI, iOS, UI]
category: Engineering
draft: false
lang: en
translationKey: apple-music-style-navigation-titles
---

In Apple Music on iOS 26, scrolling can make the large navigation title and its toolbar content disappear. It does not follow the large-title behavior that iOS has used since iOS 11.

![example in Apple Music](./assets/apple-music-style-navigation-titles/navigation-title-collapse.png)

The usual transition is:

```plain
Large Title
   ↓ scroll
Small Navigation Title
```

Apple Music instead looks more like this:

```plain
Large Title
   ↓ scroll
(no title)
```

There is no public SwiftUI modifier dedicated to this interaction. Depending on how closely the result needs to match, I would use one of two implementations: build a custom header and control it from the scroll position, or hide only the compact title with an empty principal toolbar item.

## The controllable version: own the header

A full implementation can combine:

- a custom top header inserted with `safeAreaInset(edge: .top)`
- scroll detection through `ScrollGeometry`
- separate visibility rules for the title and other toolbar items
- opacity and offset animations

SwiftUI already exposes the pieces:

```swift
.onScrollGeometryChange(...)
.safeAreaInset(...)
.toolbar(...)
```

They are building blocks rather than one navigation-bar option. A minimal version can track the vertical content offset and hide the header after a threshold:

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

This works with content built from `ScrollView`, `List`, or `LazyVStack`, and the header can contain any layout or transition the screen needs. The hiding threshold is also under the app’s control.

The tradeoff is that the app now owns the behavior, including scroll direction, toolbar layout, refresh interactions, and nested navigation-stack edge cases. That is reasonable for a screen that needs a precise result, but excessive if the only goal is to remove the compact title.

## The small shortcut: empty the compact title

For the lighter version, place an empty view in the principal toolbar position:

```swift
.toolbar {
    ToolbarItem(placement: .principal) {
        Text("")
    }
}
```

Keep the normal large title:

```swift
.navigationTitle("Library")
.navigationBarTitleDisplayMode(.large)
```

The resulting transition is:

```plain
Large Title
   ↓ scroll
(empty)
```

The large title still appears at the top of the list. Once it collapses, the principal item supplies an empty compact title:

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

This is enough to make a standard `NavigationStack` resemble Apple Music without introducing scroll state.

## What the shortcut actually changes

SwiftUI normally transitions between these title states:

```plain
Large Navigation Title
        ↓
Compact Navigation Title
```

The principal toolbar item replaces the content shown in the compact position. Making that item empty changes the visible result from:

```plain
Large Title
   ↓
Small Title
```

to:

```plain
Large Title
   ↓
(blank space)
```

The navigation bar has not been removed. Its compact title simply renders no content, which is why the effect looks convincing while requiring almost no code.

That distinction also defines the limits of the trick:

- the navigation bar still exists
- other toolbar items may continue to occupy space
- the result depends on current SwiftUI rendering behavior and may change in a future release

If the whole header and its layout must disappear, the custom scroll-driven version is the appropriate one. If an empty compact title is visually sufficient, the toolbar shortcut is much cheaper.

## An official API may eventually replace both

Apple has introduced UI behavior in system apps before exposing related public APIs. `.searchable`, large navigation titles, and the tab-bar minimization behavior shown in Apple Music followed that general pattern.

A future SwiftUI API could conceivably look like:

```swift
.navigationBarCollapseBehavior(.onScroll)
```

or:

```swift
.toolbarScrollVisibility(.hidden)
```

Those modifiers are only illustrative; SwiftUI does not currently provide them.
