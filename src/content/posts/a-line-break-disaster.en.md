---
title: "A Line Break Disaster"
published: 2026-08-13
description: "SwiftUI Text could not express the CJK wrapping behavior I needed, so I ran a small spike comparing NSTextField and NSTextView."
tags: [SwiftUI, AppKit, TextKit, macOS]
category: Engineering
draft: false
lang: en
translationKey: a-line-break-disaster
series: bilikit-development-notes
seriesOrder: 2
---

While building the comment body in BiliKit, I ran into a problem that looked small and became surprisingly frustrating. A Chinese sentence wrapped early inside the sidebar and left a conspicuous blank area at the end of the line.

The content and overall layout were intact, but the right edge of the entire comment section had become ragged enough to look chewed up.

I first suspected another width calculation. After checking the parent view, padding, layout priorities, and the surrounding code, the problem led back to an ordinary SwiftUI `Text`.

## `Text` does not expose this control

The original comment body was one line of SwiftUI:

```swift
Text(comment.message)
```

`Text` does not expose character-based wrapping. `lineLimit`, `fixedSize`, and `layoutPriority` affect sizing, but they do not define where CJK text should break at a critical width.

This rarely stands out in a wide view. Inside a narrow sidebar, one awkward break is easy to notice. `Text` works well for short UI copy. In longer content such as comments and descriptions, its limited control over line-breaking semantics becomes much more visible. Similar complaints are common in developer discussions.

More SwiftUI layout adjustments could work around individual examples, but they could not change the line-breaking semantics. I made a small spike to compare `NSTextField` and `NSTextView`.

## `NSTextField` became limiting quickly

`NSTextField` can set character wrapping directly:

```swift
textField.cell?.lineBreakMode = .byCharWrapping
```

The text wrapped correctly immediately. That would have been sufficient for plain comments.

BiliKit comments also need links, with custom emotes planned later. `NSTextField` has no suitable link-click delegate for this use. Identifying the clicked text would require another TextKit layout, followed by custom coordinate and character hit testing.

## Choosing `NSTextView`

`NSTextView` already provides the required pieces: character wrapping, attributed text, link delegation, and a path for attachments later.

The final implementation configures it as a regular text view:

```swift
textView.isEditable = false
textView.isSelectable = true
textView.isVerticallyResizable = true
textView.textContainer?.widthTracksTextView = true
```

The attributed string carries the wrapping rule in its paragraph style:

```swift
let paragraph = NSMutableParagraphStyle()
paragraph.lineBreakMode = .byCharWrapping
```

The `NSTextView` does not scroll. The surrounding comment list stays in SwiftUI, and TextKit's `usedRect` provides the body height.

Links go through `NSTextViewDelegate`:

```swift
func textView(
    _ textView: NSTextView,
    clickedOnLink link: Any,
    at charIndex: Int
) -> Bool
```

During rendering, remote URLs become internal tokens that map back to link targets in the comment model. The app remains responsible for every click action.

I also ran temporary comparisons with 100, 500, and 1,000 comments. The two AppKit options showed no meaningful performance difference, so the later feature requirements determined the choice of `NSTextView`.

## Replacing one small part

The change is limited to the comment body, where `NSViewRepresentable` hosts `NSTextView`. Avatars, metadata, actions, reply lists, and the scrolling container continue to use SwiftUI.

SwiftUI works well for the state and structure of this screen. Loading, pagination, collapsed replies, and list layout can follow data changes directly, and the interface remains easy to split into small views.

`Text` hides the underlying typesetting details. That removes a large amount of code in common cases. Precise wrapping rules, character hit testing, and rich-text attachments need controls that its public API does not currently provide. Changing the outer layout cannot alter the behavior of the text system underneath it.

This implementation gives BiliKit a clear working boundary. State, composition, and page layout stay in SwiftUI. AppKit handles text layout, hit testing, and attributed content. `NSViewRepresentable` connects them while keeping the change inside the comment body.

For similar problems, I now check whether the source is page layout or native control behavior. Layout work stays in SwiftUI. Native-control behavior gets a small AppKit spike before it enters the app.

The corresponding lower layer on iOS would be UIKit through `UIViewRepresentable`.

Links are implemented today. Custom emotes have not entered the rendering layer yet and will use attachments when that work begins.
