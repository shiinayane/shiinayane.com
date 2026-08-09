---
title: "Building a Native Danmaku Renderer on macOS"
published: 2026-08-10
description: "From segmented scheduling, the player timeline, and collision-free lanes to a CATextLayer spike, lifecycle control, and the point where Metal may become worthwhile."
tags: [Swift, macOS, Core Animation, Danmaku]
category: Engineering
draft: false
lang: en
translationKey: native-danmaku-renderer
---

The danmaku module in BiliKit currently contains 1,852 lines of Swift. Its tests are larger: 2,802 lines.

It supports scrolling, top, and bottom comments, follows playback, pause, rate changes, and seeking, and handles segmented loading, lane collisions, window resizing, speed, opacity, display area, and density settings.

At first I thought danmaku would be simple: take some text, place it over the player, and move it from right to left.

Drawing the text turned out to be the final step. Before that, I had to decide when data should load, which clock controls presentation, whether comments moving at different speeds will catch one another, how old animations are removed after a seek, and whether macOS can still composite the surface with hundreds of text layers alive at once.

## Separating data, scheduling, and rendering

The current path through BiliKit looks roughly like this:

```text
Protobuf Segment
    ↓
DanmakuSession
    ↓
DanmakuScheduler
    ↓
DanmakuPresentationController
    ↓
DanmakuLaneAllocator
    ↓
CoreAnimationDanmakuRenderer
    ↓
AVPlayerView.contentOverlayView
```

The remote API returns danmaku in six-minute segments. The session asks for the current segment and the next one, allows at most two concurrent requests, and retains at most three segments in memory.

Decoding has its own limits. A segment may contain at most 20,000 events and 1,000,000 characters in total, while one event may contain at most 4,096 characters. The renderer boundary is tighter: text longer than 512 UTF-16 code units is rejected before text layout begins.

Those limits keep resource use bounded. Every accepted string eventually reaches Core Text and Core Animation. Trusting arbitrary remote lengths would let one malformed segment create a large amount of main-thread text layout and layer allocation.

## Following the player's timeline

The danmaku system does not have its own timer.

The player publishes timeline snapshots containing the current item, position, rate, state, and discontinuity generation:

```swift
PlaybackTimelineSnapshot(
    identity: ...,
    positionSeconds: ...,
    rate: ...,
    state: ...,
    discontinuityGeneration: ...
)
```

For each pair of continuous snapshots, the scheduler delivers events that appear for the first time in this interval:

```text
(previousPosition, currentPosition]
```

No new events enter while playback is paused. At a higher playback rate, media time advances faster. A forward seek does not spray several skipped minutes of comments onto the screen. A discontinuity clears the current presentation, and scheduling continues from the new position.

This matters once animation begins. With a separate wall-clock timer, pause, buffering, and rate changes would all need their own compensation, and the player and danmaku would gradually become two different clocks.

Core Animation still performs the scrolling motion, but the root layer's local time follows the player. Pausing sets `speed` to 0 and preserves `timeOffset`. Resuming or changing rate continues from that local time.

There is no need to update the positions of hundreds of comments manually on every frame.

## The renderer spike took a detour

I started M4.4 with a non-mergeable spike.

The first plan compared two approaches:

- a reusable `CATextLayer`
- a layer-backed `NSTextField`

Both candidates would use the same `NSAttributedString`, Core Text measurements, and Core Animation movement. The comparison would then look at frame intervals, memory, and lifecycle behavior.

To make the result sufficiently “trustworthy,” the first spike contract grew to include three random seeds, six event rates, several window sizes, fullscreen transitions, repeated resizing, an external watchdog, process-group isolation, result schemas, and a 30-minute soak.

In retrospect, it was obviously too much. Before the renderer comparison had started, the experiment harness was already close to becoming another project.

The repository did contain a visible-window preflight using a real `NSWindow`. It placed a `CATextLayer` and `NSTextField` on the same surface and checked presentation-layer movement, pause and resume, fullscreen transitions, and object release. The AppKit test host was later judged insufficient for a valid route decision, so the commit remains under a Git ref containing `preflight-invalid` and was not used as performance evidence.

The spike was then reduced to two phases.

Phase 0 tested only the simplest `CATextLayer` route:

- 20 events/s to confirm that the text displayed correctly
- 40 events/s as the target load
- 80 events/s as the headroom load
- with an eight-second lifetime, roughly 320 and 640 active objects

Phase 1 would begin only if `CATextLayer` repeatedly showed a performance or memory problem at both 40 and 80 events/s, and the problem appeared to come from text rasterization.

The Phase 1 candidate was no longer `NSTextField`. It became a bitmap produced with Core Text and carried by an ordinary `CALayer`. That comparison would answer the narrower question of whether `CATextLayer` text rendering was the source of the failure.

During the test, severe stuttering was associated with per-layer compositor shadows. Asking Core Animation to composite a separate shadow for every comment became expensive once hundreds of layers were on screen.

The final route moved the shadow into the attributed string as an `NSShadow` and kept the carrier layer's shadow disabled:

```swift
textLayer.shadowOpacity = 0
```

After that change, `CATextLayer` completed two runs each at 40 and 80 events/s. The runs with 319 and 639 active layers remained visibly smooth, resource counts stayed stable, and the final owner-release check passed.

Phase 1 was never started. The production implementation selected `CATextLayer` directly.

It did not even keep the layer pool from the original proposal. Each comment currently creates a `CATextLayer`, an animation completion relay, and a `CABasicAnimation`. There was no evidence that object allocation was the main bottleneck, while pooling would immediately add reuse, reset, and stale-callback problems.

## Preventing scrolling comments from catching up

Fixed comments are relatively simple. If a lane is occupied, the allocator tries the next one.

Scrolling comments also depend on text width and velocity. BiliKit currently has five base speed levels, with an additional adjustment based on text length. Animation duration can be expressed as:

```text
duration = (surfaceWidth + textWidth) / pointSpeed
```

Before admitting a new comment, the allocator calculates the previous comment's current right edge and the actual speeds of both comments.

The previous comment must already have left the minimum horizontal gap. If the new comment is faster, the allocator also calculates how long it would take to catch up. The lane is safe only when the previous comment will have left the screen before that happens.

Resizing adds another detail.

A comment's speed was determined using the surface width at admission. Recalculating an existing comment with a new window width would make its trajectory jump. Each placement therefore stores `surfaceWidthAtAdmission`. Comments already moving keep their original animation, while newly admitted comments use the new size.

Top comments are re-centered horizontally after a resize, and bottom comments move with the height change. Resizing the window no longer requires clearing the whole danmaku surface.

## Old callbacks must not touch a new player

Cleanup is one of the harder parts of the renderer.

The current implementation has three separate identity checks.

`DanmakuSession` uses a generation to prevent an old segment request from writing back after switching videos or stopping the session.

`CoreAnimationDanmakuRenderer` uses `renderEpoch + objectIdentity`. Even if comments from two different periods happen to share an ID, an old animation completion cannot delete a newly created layer.

The overlay host has its own `ownerID`. When SwiftUI or AVKit rebuilds a view, a late resize or detach from the old host cannot clear the new host's surface.

These checks are almost invisible during normal playback. Missing one can produce intermittent failures: old comments reappearing after a seek, animation callbacks arriving after the page closes, or a newly attached player being detached by an old view.

## Dropping comments when capacity is full

The renderer has a hard limit of 640 active objects. A single update will also attempt at most 640 new events.

When no safe lane exists or the limit is reached, the new comment is dropped immediately. There is no delayed queue. A comment that finally appears several seconds late is already attached to the wrong point in the video.

On July 23, 2026, I ran a synthetic 80 events/s load for 30 minutes:

```text
emitted:             144000
admitted:             38410
dropped-no-lane:     105590
peak-active:            140
active-after-stop:        0
layers-after-stop:        0
```

Most events were dropped because no safe lane was available. The active-object peak stayed at 140, and the controller, text layers, and root attachment all returned to zero after stopping.

This shows that object counts and cleanup remained bounded in that run. It does not establish that the renderer has no memory problems. The 30-minute record did not include a complete physical-footprint series. The current probe records RSS once per minute, but RSS and physical footprint are different measurements, so a long-term memory claim still needs a new run.

The numbers also came from the display-area and density configuration used at the time. The current implementation can allow up to three overlap levels. Its high-density boundary needs separate validation rather than inheriting the old result.

## Where the current implementation can improve

The renderer is still simple enough that its likely costs are easy to locate.

Each candidate comment currently goes through roughly these operations:

1. Create an attributed string.
2. Create a `CTFramesetter` and measure the text.
3. If lane admission succeeds, create the attributed string again.
4. Create a `CATextLayer`, completion relay, and animation.
5. Commit the layer to Core Animation.

One practical optimization is already visible: text preparation happens once for measurement and again for rendering.

Lane admission needs the text width first, so Core Text measurement also happens for comments that are eventually dropped because no safe lane exists. During an extreme burst, one update may measure as many as 640 events and admit only a small fraction of them.

If profiling shows this path becoming expensive, I would first make text preparation produce a short-lived object containing:

- the attributed string
- the measured bounds
- the color and shadow information needed by the renderer

The presentation controller could release rejected objects as soon as admission finishes, while the renderer consumes the already prepared content. This removes duplicate layout without introducing a long-lived text cache.

A bounded layer pool would come later. It is useful only if Instruments shows that `CATextLayer` and animation allocation account for a meaningful part of the cost. The pool also needs a hard limit, and reuse must clear the string, animation, delegate, position, and old completion state. It is not as free as it first appears.

A bitmap-backed `CALayer` remains a possible intermediate route. It separates Core Text rasterization from Core Animation's text layer, although full comment strings rarely repeat, so a whole-line bitmap cache may have a low hit rate. A glyph atlas could be more effective, but it also has to handle the CJK glyph set, font fallback, color emoji, Retina scale, and cache invalidation.

## When Metal becomes worthwhile

Metal can address the compositing cost of large numbers of independent layers and animation objects.

Core Text could shape the glyphs, a texture atlas could store them, and all visible comments could be submitted as batches of quads to one `MTKView`:

```text
DanmakuEvent
    ↓
Core Text shaping
    ↓
Glyph / texture atlas
    ↓
Position calculation
    ↓
Batched Metal draw
```

Hundreds of comments would no longer mean hundreds of Core Animation layers. That can reduce work in WindowServer and the compositor.

The renderer would also have to take ownership of more behavior:

- calculating positions from media time on every frame
- pause, rate changes, and seeking
- surface resizing and backing scale
- font fallback and emoji
- texture upload and reclamation
- shadows, opacity, and color
- the lifecycle of generations, old surfaces, and GPU resources

Core Text shaping does not disappear because Metal is involved. Metal mainly changes the latter half of the pipeline: batching, drawing, and compositing.

The current scheduler, lane allocator, and presentation controller do not know about concrete layer types. If BiliKit eventually moves to Metal, the segmented data path, player timeline, filters, lanes, and drop policy can stay. The renderer backend and corresponding AppKit host are the parts that need replacement.

There is not enough evidence to do that yet. The next useful step is to run Instruments on the lowest target Mac with genuinely dense videos:

- if Core Text layout is expensive, combine the two text-preparation passes;
- if object allocation is expensive, test a bounded layer pool;
- if Core Animation, WindowServer, or GPU compositing degrades with layer count, start a bitmap or Metal spike.

The `CATextLayer` route works today. Performance data can decide when it is time to replace it.
