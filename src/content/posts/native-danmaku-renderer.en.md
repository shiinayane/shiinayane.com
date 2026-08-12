---
title: "Building a Native Danmaku Renderer on macOS"
published: 2026-08-10
description: "From segmented scheduling, the player timeline, and collision-free lanes to a CATextLayer spike, lifecycle control, and the point where Metal may become worthwhile."
tags: [Swift, macOS, Core Animation, Danmaku]
category: Engineering
draft: false
lang: en
translationKey: native-danmaku-renderer
series: bilikit-development-notes
seriesOrder: 1
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

## From remote Protobuf to local events

BiliKit currently fetches segmented danmaku from `/x/v2/dm/wbi/web/seg.so`. The request carries the video's `cid` and `segment_index`, is signed with WBI, and returns Protobuf. A single response is capped at 2 MiB.

The networking layer does not pass generated Protobuf types directly into the scheduler. `BiliDanmakuRepository` first converts them into the project's own `DanmakuEvent` model:

```swift
DanmakuEvent(
    id: id,
    timeSeconds: Double(progressMilliseconds) / 1_000,
    mode: mode,
    text: text,
    fontSize: normalizedFontSize,
    colorRGB: colorRGB,
    weight: weight
)
```

Remote modes 1, 2, and 3 all become scrolling comments, mode 4 is bottom, and mode 5 is top. Other advanced modes are ignored for now. Font size is clamped to the range 12 through 64, and color is reduced to the basic 24-bit RGB value. Gradients, sender information, and private remote fields are not copied into the domain model merely because they may become useful one day.

This conversion also keeps the `BiliDanmaku` target independent of the networking implementation and Protobuf. It sees only stable `DanmakuEvent`, `DanmakuSegment`, and `PlaybackItemIdentity` values. A future remote protocol change can stop at the API adapter.

### The session owns both starting and stopping work

`DanmakuSession` is the actual owner of this path. It subscribes to the player timeline, determines the required segments, creates loading tasks, and synchronously hands scheduler output to the presentation controller.

The current policy is deliberately small:

- prefetch the current segment and the next one;
- load at most two concurrently;
- retain at most three in the scheduler;
- do not retry a failed segment on every timeline update for the same identity;
- cancel the timeline task and every load task on Stop.

Every Start and Stop advances the session's own generation. When a request finishes, checking task cancellation is followed by another comparison of the generation and playback identity:

```swift
guard self.generation == requestGeneration,
      self.identity == identity
else { return }
```

This handles an ordinary race: the user switches videos before the old video's request returns. Task cancellation alone is insufficient because the underlying operation may already have completed and its continuation can still enter the actor. The final identity and generation check is the write-back boundary.

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

If the previous snapshot is at 10.00 seconds and the next is at 10.08, events with timestamps greater than 10.00 and less than or equal to 10.08 enter that batch. One open edge and one closed edge ensure that two consecutive windows cannot contain the same event.

The scheduler also sorts by `(timeSeconds, id)` and remembers delivered IDs by segment. If the remote response repeats an event in neighboring segments, it is still displayed once. The deduplication sets are trimmed with playback position just like the segment cache, rather than retaining every ID from an entire video forever.

No new events enter while playback is paused. At a higher playback rate, media time advances faster. A forward seek does not spray several skipped minutes of comments onto the screen. A discontinuity clears the current presentation, and scheduling continues from the new position.

This matters once animation begins. With a separate wall-clock timer, pause, buffering, and rate changes would all need their own compensation, and the player and danmaku would gradually become two different clocks.

Core Animation still performs the scrolling motion, but the root layer's local time follows the player. Pausing sets `speed` to 0 and preserves `timeOffset`. Resuming or changing rate continues from that local time.

There is no need to update the positions of hundreds of comments manually on every frame.

The timeline itself is published through an `AsyncStream` with `bufferingNewest(1)`. The renderer does not need to replay every player-observer callback that has already become stale; it needs the latest media fact. The optional danmaku batch stream used for observation is bounded as well, while production presentation avoids another asynchronous queue and calls the presentation sink during the same MainActor timeline update.

## The presentation controller is the admission boundary

The session never creates layers directly. It sends `DanmakuPresentationController` a value update containing the current snapshot, an optional batch, and clear semantics.

The controller processes it in a fixed order:

1. Verify that snapshot and batch identities and discontinuity generations match.
2. Clear the allocator and renderer together when identity, generation, or clear semantics change.
3. Synchronize the player rate to the renderer.
4. Measure the batch text and create `DanmakuLaneRequest` values.
5. Ask the allocator which placements expired, were admitted, or were dropped.
6. Remove expired objects before creating new layers.

This separates whether an event may appear from how it is drawn. The allocator handles only numbers and media time, so it can run in tests without a window or AppKit. The renderer does not need to know why a comment belongs in lane 3; it consumes the final placement.

The boundary is also the replacement point for a future renderer. A Metal backend would not need to reimplement segmentation, filtering, deduplication, or collision rules. It would consume the same placements. The platform host would still change with the renderer, though. The current host mounts a `CALayer`; the code did not prebuild a supposedly universal surface for backends that do not exist yet.

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

The spike ultimately answered a narrow question: on that Mac, with one fixed surface and synthetic input, the simplest system text layer was sufficient and the bitmap route did not need to begin. It did not establish the capacity of the lowest supported Mac, or validate future font sizes, colored comments, and high-overlap density.

That was the right place to stop. Once the experiment had enough evidence to change the next action, work could return to the production implementation. A more polished benchmark matrix would not necessarily have changed the route.

## Preventing scrolling comments from catching up

Fixed comments are relatively simple. If a lane is occupied, the allocator tries the next one.

Scrolling comments also depend on text width and velocity. BiliKit currently has five base speed levels, with an additional adjustment based on text length. Animation duration can be expressed as:

```text
duration = (surfaceWidth + textWidth) / pointSpeed
```

Before admitting a new comment, the allocator calculates the previous comment's current right edge and the actual speeds of both comments.

For a comment already in the lane:

```text
previousSpeed =
    (oldSurfaceWidth + previousTextWidth) / previousDuration

previousRightEdge =
    oldSurfaceWidth - previousSpeed × elapsed + previousTextWidth
```

The new comment uses the current surface:

```text
newSpeed =
    (currentSurfaceWidth + newTextWidth) / newDuration
```

The previous comment must already have left the minimum horizontal gap. If the new comment is faster, the allocator also calculates how long it would take to catch up. The lane is safe only when the previous comment will have left the screen before that happens.

Resizing adds another detail.

A comment's speed was determined using the surface width at admission. Recalculating an existing comment with a new window width would make its trajectory jump. Each placement therefore stores `surfaceWidthAtAdmission`. Comments already moving keep their original animation, while newly admitted comments use the new size.

Top comments are re-centered horizontally after a resize, and bottom comments move with the height change. Resizing the window no longer requires clearing the whole danmaku surface.

### Each mode keeps its own lane state

Scrolling, top, and bottom comments maintain separate lane occupancy. A scrolling comment and a top comment may occupy the same vertical position; collision checks apply within the same mode.

The display-area setting is also more than a crop from the top. Scrolling and top comments allocate downward from the upper edge, while bottom comments allocate upward from the lower edge. At 50%, the two regions meet at the middle. At 75%, they overlap through the center. At 100%, every mode can use the complete surface.

There are currently three density levels:

| Density | Minimum horizontal gap | Maximum overlap depth |
| --- | ---: | ---: |
| Normal | 24 pt | 1 |
| Increased | 12 pt | 1 |
| Overlapping | 0 pt | 3 |

Overlapping density is enabled only when the display area is 100%. A smaller region falls back to normal collision rules, avoiding three layers of comments inside an already restricted vertical area.

When a setting changes, placements already on screen keep their geometry and motion, while new comments use the new policy. It is the same rule used for resizing: changing a setting should not make the content currently being watched jump.

## What `CATextLayer` actually does

After receiving a placement, the renderer creates a `CATextLayer`, assigns its attributed string, `contentsScale`, bounds, and initial position, then commits one animation.

A scrolling comment has one linear `position.x` animation, beginning beyond the right edge and ending after the text has completely left the left edge. Top and bottom comments use a constant opacity animation, which lets Core Animation provide the same completion mechanism after a fixed lifetime.

Text measurement uses `CTFramesetterSuggestFrameSizeWithConstraints`. The measured size is rounded up at the backing scale and receives eight physical pixels of padding. In addition to the text-length limit, final bounds have a local 8192×512 pixel cap. An invalid result is rejected before layer creation.

The current style is 24 pt system semibold. Colored comments are checked for relative luminance: dark text gets a white content shadow, while other colors get a black one. Black and dark-blue comments remain legible in dark video regions without restoring per-layer compositor shadows.

The renderer's root layer also owns global opacity and playback rate. Changing opacity touches one root layer instead of iterating through every active text layer. Pause and rate changes similarly convert layer local time only once.

## Old callbacks must not touch a new player

Cleanup is one of the harder parts of the renderer.

The current implementation has three separate identity checks.

`DanmakuSession` uses a generation to prevent an old segment request from writing back after switching videos or stopping the session.

`CoreAnimationDanmakuRenderer` uses `renderEpoch + objectIdentity`. Even if comments from two different periods happen to share an ID, an old animation completion cannot delete a newly created layer.

The overlay host has its own `ownerID`. When SwiftUI or AVKit rebuilds a view, a late resize or detach from the old host cannot clear the new host's surface.

The animation completion does not strongly retain the renderer either. `AnimationCompletionRelay` keeps a weak owner reference. In Core Animation's nonisolated callback it copies only the event ID, object identity, and epoch, then returns through `Task { @MainActor in ... }`.

The renderer checks again immediately before deletion:

```swift
guard completionEpoch == renderEpoch,
      let entry = entries[eventID],
      entry.objectIdentity == objectIdentity
else { return }
```

Consider a small but real case. An old comment A is about to finish when the user seeks. The renderer clears its surface and advances the epoch. The new position then produces another comment whose ID is also A. If the old completion deletes by event ID alone, it removes the new layer. Epoch and object identity independently reject the wrong period and the wrong object.

### Where the overlay is mounted

The platform layer creates a non-interactive `NSView` and mounts the renderer's root layer in `AVPlayerView.contentOverlayView`. Danmaku follows AVKit's actual video-content surface instead of sitting in an unrelated SwiftUI view outside the player.

That choice matters during fullscreen transitions and resizing. When overlay bounds change, only the current `ownerID` may publish a new size. Even if an old view calls `detachSurface()` late, the controller rejects it because ownership no longer matches.

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

## Why the tests are longer than the implementation

`BiliDanmaku` currently has 2,802 lines of tests for 1,852 lines of production code. Much of that code does not check whether a string was drawn. It fixes time and lifecycle boundaries.

Scheduler tests use virtual media time to cover:

- pause and playback rates;
- six-minute segment boundaries;
- clearing and re-emission after forward and backward seeks;
- duplicate IDs in neighboring segments;
- bounded caches and delivered-ID sets;
- avoiding backfill after disabling and re-enabling danmaku.

Allocator tests do not launch AppKit. They provide a surface, text widths, durations, and media time directly. That makes the catch-up formula, fixed-comment expiration, mirrored display areas, overlap depths, and the hard limit of 640 deterministic.

The presentation controller's fake backend records `measure`, `render`, `remove`, `clearAll`, and rate changes. It can construct lifecycle failures such as a completion from an old generation, old and new objects sharing an ID, a surface-owner replacement, and a burst that must be rejected before creating `CATextLayer` objects.

Only after those tests comes the load probe with a real `NSWindow` and the production renderer. It generates synthetic comments mixing Chinese, Japanese, Korean, Latin text, and emoji, advances the same timeline at a specified rate, and records admission, drops, active layers, requested segments, and cleanup after Stop.

These layers of evidence prove different things. Pure algorithm tests establish collision and ordering. A fake backend establishes calls and lifecycle. A real-window probe reaches Core Animation. Even a passing probe does not settle readability over real video, fullscreen appearance, or attribution in Instruments.

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

A cheaper capacity check could also happen before measurement. The controller currently measures up to 640 events in the batch before the allocator checks active capacity. When the renderer is already close to its hard limit, some Core Text work can be avoided early. This shortcut can reject obvious capacity failures only. A safe lane still depends on text width, so a coarse check cannot skip all measurement.

A bounded layer pool would come later. It is useful only if Instruments shows that `CATextLayer` and animation allocation account for a meaningful part of the cost. The pool also needs a hard limit, and reuse must clear the string, animation, delegate, position, and old completion state. It is not as free as it first appears.

A bitmap-backed `CALayer` remains a possible intermediate route. It separates Core Text rasterization from Core Animation's text layer, although full comment strings rarely repeat, so a whole-line bitmap cache may have a low hit rate. A glyph atlas could be more effective, but it also has to handle the CJK glyph set, font fallback, color emoji, Retina scale, and cache invalidation.

The lane allocator is worth measuring as well, although there is no current evidence that it is the main cost. A 720 pt-high surface with 36 pt lanes has roughly 20 vertical lanes per mode, so the search space is small, and active objects are capped at 640. Core Text layout, layer allocation, and compositing are more likely to become expensive first. Time Profiler and Core Animation data still need to decide; source size is not a performance measurement.

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

If I build the Metal route, I would keep the current media-time model instead of making the `MTKView` display callback a new source of truth. Each frame could read an identity- and generation-validated media snapshot, then calculate position from:

```text
x = startX - mediaPointSpeed × (currentMediaTime - admittedMediaTime)
```

Media time does not advance while paused, and playback rate is naturally reflected by the player timeline. Seeking still advances the generation and clears old draw items, with no need to splice a GPU animation onto a new position.

The texture cache also needs an explicit key and limit. At minimum, the key includes font, size, scale, glyph, color treatment, and emoji representation. After moving a window to a display with a different backing scale, the old atlas may no longer be appropriate. The CJK glyph set is large; a cache that grows for every glyph ever seen would quickly replace a Core Animation layer problem with a texture-memory problem.

The current scheduler, lane allocator, and presentation controller do not know about concrete layer types. If BiliKit eventually moves to Metal, the segmented data path, player timeline, filters, lanes, and drop policy can stay. The renderer backend and corresponding AppKit host are the parts that need replacement.

There is not enough evidence to do that yet. The next useful step is to run Instruments on the lowest target Mac with genuinely dense videos:

- if Core Text layout is expensive, combine the two text-preparation passes;
- if object allocation is expensive, test a bounded layer pool;
- if Core Animation, WindowServer, or GPU compositing degrades with layer count, start a bitmap or Metal spike.

The `CATextLayer` route works today. Performance data can decide when it is time to replace it.
