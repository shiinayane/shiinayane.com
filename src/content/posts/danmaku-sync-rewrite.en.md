---
title: "Which Clock Should Danmaku Follow? Rewriting Danmaku Sync in BiliKit"
published: 2026-10-23
description: "Starting from danmaku that went missing after a seek, this records several rounds of rewriting BiliKit's danmaku sync, how AVFoundation's clocks actually behave, and the design I ended up with."
tags: [Swift, macOS, AVFoundation, Core Animation, Danmaku]
category: Engineering
draft: false
lang: en
translationKey: danmaku-sync-rewrite
series: bilikit-development-notes
seriesOrder: 3
---

In the [previous post](/en/posts/native-danmaku-renderer/) about BiliKit's danmaku, comments advanced with the player's timeline snapshots. A forward seek cleared the screen and continued from the new position, without filling in the comments that had been skipped over.

That timing model has since been replaced. It started with danmaku that should have been on screen after a seek not showing up. Jump to 1:00, for example, and the comments that began flying at 0:55 and should now be in the middle of the screen were all missing.

Fixing this took from October 12 to October 23, a dozen or so PRs, and several changes to the underlying model. Most of that time went into working out which time the danmaku should follow. Writing the code was a small part of it.

The current approach computes two things from the same time: where each comment is right now, and which comments should be on screen right now. That time comes directly from the player's own clock, `AVPlayerItem.timebase`, with one added restriction: during forward playback, it is not allowed to move backward. The danmaku side also no longer uses thresholds to guess whether the user is seeking.

All numbers in this post come from probes on my own machine (macOS 27, Apple Silicon). Results differ a lot between wired or built-in output and Bluetooth AirPods, so I list them separately where it matters. None of these changes are in a release yet. The latest version is still 1.3.2, released on October 12.

## The danmaku stack and a few concepts

BiliKit is a native macOS Bilibili client written with Swift 6, SwiftUI + AppKit, and AVPlayer. Rendering has also changed since the previous post: each comment is now a `CALayer` whose content is a texture prerendered with Core Text, rather than a `CATextLayer`. A scrolling comment moves with a `CABasicAnimation` whose `beginTime` is the comment's appearance time. Comments are fetched from Bilibili's API in 6-minute segments.

The pipeline has three layers. Layout assigns each comment a lane, which is the row it travels along on screen. Presentation decides which comments are on screen at the moment and when their textures are prepared. Rendering manages the CA layers and textures.

A few concepts come up throughout the post.

- **timebase**: `AVPlayerItem.timebase` is the player's internal media clock. You can think of it as a straight line: at some host time (a point on the system clock), media time has some value, and from there it advances at the playback rate. When paused, the rate is 0 and the line goes flat. On a seek, or when the system resets the clock internally, the whole line shifts, and media time jumps.
- **snapshot**: A periodic observer on the main thread fires every 1/30 of a second and reads the current playback position. Each reading is a snapshot. The original danmaku scheduling advanced by snapshots.
- **motion and the on-screen set**: Danmaku has to answer two questions. One is where each comment is on screen at the moment, which is determined by its animation and the clock driving that animation. The other is which comments should be on screen at the moment. I call that group of comments the on-screen set.

The original implementation scheduled at runtime. The main thread advanced a cursor by snapshot and added each comment when its appearance time arrived.

## Backfilling after seeks kept growing

The first change replayed a short time window from the landing point after a seek settled, adding the comments that should still be in flight.

After that merged, other problems kept appearing: flashes, small jitters around the landing point, leftover frames while paused, and a flash when starting playback after seeking while paused. I fixed them one by one on a branch called `danmaku-seek-catchup`, and each fix added another heuristic to the scheduler: a 0.5-second tolerance for backward jumps, a 2.5-second overrun limit, a check for whether the landing point was stable, and a rule that a drag only counted as landed after holding still for 150 ms.

All of these rules inferred from changes in position whether the user had seeked. The backward-jump tolerance, for example, meant that if the position moved back by less than 0.5 seconds, it was not treated as a seek. Every threshold stood for a guess about the user's intent. The rules kept piling up, and the branch was never merged. Since then, my main test for whether a rule is a patch has been whether it fixes a side effect of another rule.

Then I found that the system provides explicit clock events. The timebase posts `TimeJumped` and `EffectiveRateChanged` notifications. The player layer subscribed to both and published two states, "seeking" and "landed at a position." The danmaku scheduler handled only the landing: clear the screen, then backfill once from the landing point. All of the earlier thresholds were removed.

This approach merged, but starting playback after seeking while paused still flashed once, and I had not found the cause at the time. Another problem was that `TimeJumped` is a low-level clock event. The system also posts it when it resets the clock internally, so it does not mean the user intended to seek, and the rate alone cannot reliably tell the two apart. The rule I set then was that anything the next step could solve would not get another patch in this approach.

## Making danmaku depend only on media time

The next round changed direction. If which comments are on screen at a given moment, and where each one is, can be computed entirely from the media time t, then the picture depends only on the current t no matter how the user seeks, drags, or changes speed, and there is no need to detect seeks at all. I made three changes along these lines.

- Motion is driven by the media clock. The danmaku layer sits under an `AVSynchronizedLayer`, which makes the animations of its sublayers follow the player's time, so pausing, rate changes, and seeks are all handled by the system.
- Lanes use deterministic layout. Comments are sorted offline by (time, id), and each comment's lane is computed in advance. The same moment therefore always produces the same picture.
- The on-screen set looks at one time window. A comment still on screen at time t cannot have appeared earlier than t − maximum duration. Adding a lookahead lets upcoming comments be prepared in advance. So each update only needs to add and remove comments in the interval [t − maximum duration, t + lookahead] (a reconcile).

Tested on an HLS stream served over local loopback, seeking, dragging, rate changes, buffering, and the end of playback all lined up, and attaching 1,000 layers at once took about 9 ms.

Before starting this round, I looked at how open-source implementations handle it. In the table, "runtime greedy" means finding a free lane only when a comment appears, and "precomputed layout" means placing every comment ahead of time.

| Category | Examples | Full screen after seek? | On resize |
|---|---|---|---|
| Runtime greedy (native) | BarrageRenderer, DanmakuKit, DFM, IINA plugin | No; clears on seek without backfilling | Recomputes x for the new width, keeps y, may overlap |
| Runtime greedy (web) | weizhenye/Danmaku, DPlayer, ArtPlayer, danmu.js, CCL | No | Does not clear, does not re-layout y |
| Precomputed layout | ASS/libass, uosc_danmaku, niconicomments | Yes | Lays out on a virtual 1920×1080 stage and scales at render time |

Only the precomputed-layout group fills the screen after a seek. Their positions are already a function of time, so jumping to any moment gives the picture for that moment directly. I did not find any open-source danmaku project using `AVSynchronizedLayer`. I also tested Bilibili's website and app, and both fill the screen immediately after a seek, so laying comments out in advance matches the official experience.

This round had problems of its own. The first version laid comments out in physical pixels, so scroll duration and lane count both depended on the size of the video area, and any window change meant redoing the entire layout. That led to a set of compensations: layout seeds carried across segments, re-layout for segments that arrived late, full re-layout on fullscreen, zoom, or settings changes, and a crossfade of about 200 ms. The crossfade was removed before merging.

### Viewport

For the sizing problem, I borrowed the "virtual stage" idea but kept the font size fixed. The layout is computed once for the largest size of the current screen, and the window acts as a viewport that only decides which part of that layout is visible: how far it extends left from the right edge, and how many of the top lanes are shown. The container for scrolling comments is anchored to the right edge, and the containers for top and bottom comments are anchored to the center and the bottom edge. Resizing does not re-layout anything, and the font size does not change.

This works because of two properties. First, comments move at a constant speed that does not depend on the width of the video area, so however wide the window is, a given comment is the same distance from the right edge at a given moment. Second, lanes are assigned from the top down, so the result for the first k lanes does not depend on the total number of lanes, and a shorter window just shows fewer of the lower lanes.

The cost is that when the window grows, comments in the part that was previously outside the viewport may not have "arrived" yet. This is a known transient. Whether the font size should follow scaling is something I plan to add later as a "scale with screen" toggle on top of the viewport.

While dragging the playhead, danmaku follows media time completely. Dragging far away naturally leaves the screen empty, and the whole screen is replaced after landing. The condition that triggers recomputing the on-screen set also changed. It used to look at a "discontinuity generation," a counter incremented whenever time became discontinuous; now it only checks whether the current position is still inside the window that has already been laid out.

## Danmaku slid backward on pause

After switching to `AVSynchronizedLayer`, scrolling comments slid backward by 4–10 pt when pausing.

I recorded the moment of pausing with Instruments (Time Profiler + System Trace) and found two blocking periods.

The first came from Live Text (the system feature that recognizes text in a paused frame). `pause()` triggers a KVO callback for the rate, and inside that callback AVKit's frame analysis reads `currentTime` on the main thread. At that moment the player holds a lock for the audio pause handshake, so the main thread waited about 20 ms longer. Turning off `allowsVideoFrameAnalysis` reduced the blocking on pause from about 55 ms to about 35 ms. The danmaku layer covers the video anyway, so selecting text in a paused frame was never usable there.

The second came from `AwaitIOCycle` in `AudioQueuePause`, which waits for the current round of audio I/O to finish. It also holds a lock.

When `AVSynchronizedLayer` freezes depends on the main thread. While the main thread is blocked, the comment animations keep moving forward. When the layer finally freezes, the comments go back to their positions at the moment of the pause, which looks like sliding backward.

### A custom clock layer

Since the problem was the main thread, I wrote a clock layer that follows the timebase on a background serial queue without involving the main thread.

The timebase's notifications are posted synchronously by a thread holding a MediaToolbox lock (MediaToolbox is the media framework underneath AVFoundation), so **the callback must not call any AVPlayer or AVPlayerItem API**. Reading `currentTime` in the callback, for example, requests the same lock and deadlocks. The callback only forwards the event to a private serial queue.

On that queue, the clock layer calls `CMSyncGetRelativeRateAndAnchorTime` to get the timebase's rate relative to the host clock and a pair of anchors: when host time is Ha, media time is Ta. In practice, Ha always came back as 0, so the anchor has to be shifted to the current moment, now, before writing it to the layer.

In Core Animation, a layer's local time equals (parent time − `beginTime`) × `speed` + `timeOffset`. Writing the values below makes the layer's local time equal the current media time, advancing at the rate from there:

```text
beginTime  = now
timeOffset = Ta + (now − Ha) · rate
speed      = rate
```

The write uses an explicit `CATransaction` with implicit animations disabled. When the video changes, the clock layer rebinds to the new item's timebase and uses a generation (a number incremented on every rebind) to drop callbacks from the old item. The old timebase keeps posting notifications after the item changes, up to +33 ms later on wired output and +103 ms on Bluetooth.

In the probe, none of 31 pauses moved backward. In the same scenario, `AVSynchronizedLayer` moved back by 3.5–7.5 pt.

### Clock filtering did not stay

With the clock layer in place, every small timebase jump showed up directly in the danmaku. Resuming playback jumped forward by 20–40 ms, with the video jumping 2 frames at the same time. Starting playback after a seek moved back by about 57 ms. A rate change first stalled for about 45 ms and then jumped forward.

Most open-source implementations deliberately ignore jumps this small. DFM smoothly catches up, and CCL and IINA use thresholds. I also wrote a clock filter: snap directly when the offset reached 0.25–0.5 seconds, and for smaller offsets, speed up or slow down by 5% to catch up over a few hundred milliseconds.

Special cases appeared quickly in this version too. The continuous filter logic ended up inside a hybrid state machine. While paused, the catch-up rate was stuck at its limit while the error kept accumulating, which control theory calls windup. Rendering and the selection of on-screen comments each used their own clock, so the two modules also had to share a tolerance. It was the same kind of problem as the earlier heuristics, and this branch was deleted too.

## Rethinking the requirements

At this point I went back to the original requirement. "Keep danmaku accurately in sync with video time" was not really a requirement. It was a means introduced by using `AVSynchronizedLayer`. Much of the earlier patching was about that means's side effects, and most of the "requirements" listed above had been inferred backward from specific bugs.

So I wrote down a few invariants instead, properties that must hold however it is implemented. They describe only what the viewer sees.

| Invariant | Meaning |
|---|---|
| Anchoring | Danmaku time is approximately viewer time. Viewer time is taken from the video, because vision leads |
| Viewer time | Passes at a steady rate and jumps only because of the viewer's actions |
| Scene depends only on time | The set of comments seen at a given moment is unique (given the same segment arrival history, the same layout seeds across segments, and the same texture budget) |
| Object permanence | Comments on screen do not disappear, reappear, or change lanes without reason |
| Readable | No overlap, no flashing |
| Does not interfere with content | Danmaku problems must not drag the video down |

The next thing to check was whether the player had a perfect time that would make the first invariant, "danmaku time is approximately viewer time," hold directly. If it did, danmaku could simply follow it.

## How the player's clocks actually behave

To find out, I wrote a probe program. Its AVPlayerView configuration is identical to BiliKit's. The test video runs at 60 fps with a barcode encoded in every frame, used to read which frame is currently on screen. The HLS stream has two bitrates, with audio as a separate EXT-X-MEDIA rendition, and the local server can throttle or pause. The program reuses the repository's timeline adapter unchanged and records the timebase, main-thread snapshots, the on-screen frame number, and main-thread blocking at the same time across a range of scenarios.

AVFoundation's documentation rarely covers these behaviors. When the timebase jumps and by how much, which thread AVKit calls seek on, and when KVO fires synchronously all have to be measured. Every design decision this time started with data from a separate probe program.

The numbers, split by output device:

| Behavior | Wired / built-in output | Bluetooth AirPods |
|---|---|---|
| On first play, start after seek, recovery from a stall, and start after changing items, the timebase jumps backward by about the audio output latency | About −37 ms | −97…−215 ms |
| On resume after pause, the timebase jumps forward | +24…+38 ms | +11…+127 ms |
| After a seek during playback, the snapshot reaches the target first and then leads the timebase | About 37 ms | 93–184 ms |
| After a seek during playback, the main thread is blocked | 56–72 ms | 260–280 ms |

The size of the jump in the first row also changes with the output device. In other words, every time playback starts, the timebase first steps back a little, and danmaku that strictly follows the timebase slides back with it.

Other observations:

- On Bluetooth, the timebase silently re-anchors without any notification, producing discrete jumps of +2…+31 ms, with an error of up to ±49 ms. Without a notification, the danmaku side has no timely way to know.
- The timebase stays the same across a bitrate switch. The line does not change, and there is no notification.
- Playing HLS at 4x speed produces a burst of `TimeJumped` notifications, 6–66 of them every 4 seconds.
- When dragging into an unbuffered region, the snapshot jumps to the target in about 4 ms, while the timebase stays put for 0.2–4 seconds or longer, so the two differ by tens of seconds. If part of the logic reads the snapshot and another part reads the timebase, they see times tens of seconds apart.
- When the main thread stalls, snapshots stop coming. They are neither queued nor coalesced.
- On wired output, the on-screen frame is exactly floor(timebase × fps), so the video and the timebase agree. After a seek, the target frame starts presenting before the timebase restarts and holds for about 93 ms.
- After a pause, the main thread is blocked for about 31 ms; after a rate change, for 24–42 ms.

### Audio jumps too

Most timebase jumps come from audio. The timebase estimates where audio is actually being played out, and audio has latency both when stopping and when starting. I thought that if I could get the moment audio really stops, I might be able to remove the forward jump on resume, so I measured audio as well.

That only partly held. On pause and rate changes, audio keeps playing for 17–21 ms after the timebase freezes, and that part is stable. On resume, though, audio itself skips 61–76 ms of already-rendered content. The system also has no usable public "audio stopped" signal: `kAudioProcessPropertyIsRunningOutput` takes about 7.4 seconds to change, and the listener block never fires. `MTAudioProcessingTap` amplifies these quantities by about 10x (audio is rendered in 4096-frame chunks), and it cannot be attached to HLS.

On resume, the timebase, the video, and the audio all jump. The player has no continuous time to anchor to.

I also confirmed that AVPlayer's audio pauses when the rate changes. This is how the system behaves, Safari included, and only rendering audio yourself (AVAudioEngine + TimePitch) avoids it.

### Trying to pin the start of playback

I also tried the other route, which was to keep the timebase from jumping. The approach was to subclass AVPlayer, override the rate setter, and on start use `setRate(_:time:atHostTime:)` to specify "start playing from this media time at this host time," so that the timebase's line connects exactly to the point where playback stopped. This spike looked very good on mp4, but it had several problems.

- The conditions grew to 11, several of which fixed its own side effects.
- The video freeze on a rate change grew from about 45 ms to about 150 ms, which violates "viewer time passes at a steady rate."
- Its failures were worse than the current behavior: with HLS it hung if a seek was in flight, with mp4 it undid the seek that had just been made, and it threw an NSException if AVPlayer was not ready.
- AVKit's scrubber calls seek on a background thread, so registering seeks on the main thread missed them.

It was a patch as well, so I did not adopt it.

## Two time sources

While running the spikes, I asked a subagent to do an adversarial review of every danmaku implementation in the codebase's history: the original runtime scheduling, the catchup branch, the system-event approach, the media-clock approach, the rounds from the viewport through the clock layer, and the clock filter.

The review concluded that every version had two time sources. As described earlier, danmaku has to answer two questions: where each comment is, and which comments should be on screen. The clock answering the first question changed several times, from the root layer to the synchronized layer to the clock layer. The second question, however, was always decided by main-thread snapshots, which arrive every 1/30 of a second, can be coalesced, and can jump backward. The two times were never unified, so whenever they disagreed, a comment's position and whether it should appear at all would not match.

For example, when playback starts after a seek, the timebase jumps back 57 ms, which puts the snapshot outside the window that has already been laid out. That triggers a recompute, comments that had already finished get added back, and the frame that was being held for a full-screen display gets broken up.

The earlier "first principles" research had only examined the clock and never looked at how the on-screen set was decided. Research should cover the whole system, without assuming in advance that any part does not need to change.

Two practices helped during the review. The reviews did not know about each other, and the design doc required its author to list the three points they thought were most worth attacking, which the reviews then worked through.

The review produced a 14-item checklist. Some of the items:

1. Single time source: a comment's position and the on-screen set are computed from the same clock at the same moment.
2. No intent detection: do not guess seeks with thresholds, counters, or out-of-range checks.
3. A rule budget: no rule whose only job is fixing a side effect of the previous rule.
4. Tests assert that comments are actually visible, not only that they have been added (installed).

Another review confirmed that the forward-only rule and the single time source had to ship together. Otherwise, under the burst of `TimeJumped` notifications at 4x speed, 30% of visible comments would be missing.

## The current design

The current design still treats the timebase as the source of truth and no longer tries to change the player's behavior. It only adds one rule on top, from the viewer's point of view: during forward playback, time only moves forward.

### Forward only

The clock layer still follows the timebase strictly. The difference is that during forward playback, if the timebase jumps back a little, the clock layer does not move back with it. It stays where it is, waits for the timebase to catch up, and then moves forward together with it. On screen, the comments pause briefly instead of sliding backward.

This takes a single write. Using the local-time formula from earlier, set `beginTime` in the future and set `fillMode = .backwards`, so that until `beginTime` arrives, the layer's local time stays at `timeOffset`:

```text
beginTime  = now + (D − T) / r
timeOffset = D
fillMode   = .backwards
```

Here D is the time currently displayed, T is the timebase's time at this moment, and r is the rate. The timebase is D − T behind D, so at rate r it needs (D − T) / r seconds to catch up, which is exactly how far `beginTime` is pushed out. Until then, local time stays at D; after that, it advances at r. There is no timer and no threshold. Jumps while the rate is 0 are still followed as usual.

On my machine, the timebase moves back by about 125 ms when playback starts after a seek and on first play. Before this change, comments slid back by about 16 pt. After it, the diagnostic log recorded 39 waits and not a single backward move.

### A single time source

Each time the clock layer writes to the layer, it publishes the parameters of the line it used, together with an epoch (a number the clock layer assigns to each continuous stretch of time), to the main thread. The main thread computes the display time D from that line with the same function, `DanmakuClockWrite.mediaTime`, which is the only formula for D in the code. The main thread and the layer therefore use the same time.

The on-screen set, recomputes, late-arriving textures, and segment eviction are now all decided by display time. Main-thread snapshots are left with three uses: identifying the current playback target (identity), deciding how often to check, and requesting segments.

Code review caught one blocking issue. When switching videos, frozen display times were still being published after unbinding, so frozen comments appeared over the black screen while the next video loaded. The fix was to stop publishing after unbinding.

### Removing staging

After these changes, the presentation layer still had a staging mechanism. After a time jump, it held back the new frame and waited until the textures it needed were ready before showing the whole screen at once. It came in several forms: waiting for the whole screen only when more than 8 textures were missing and showing comments one by one when fewer were; staging that could be replaced by later staging or partially committed; full-screen holds; and full-screen staging when lanes were re-laid out.

Starting from the invariants, the presentation layer only needs one rule:

> A comment whose texture is ready and that should be on screen right now is added immediately, without being held back to wait for other comments.

Holding the new frame means keeping the old frame on screen for a while, which only makes sense if the old frame is still a valid scene. With a single time source, once time jumps, almost every old layer is already outside its own animation time, so the old frame is effectively empty and keeping it means keeping an empty screen. All of the staging forms above, together with the three-way branch in recomputes, could therefore be deleted without any replacement rule.

After the deletion, cached textures call back synchronously in `prepare`, so jumping far to a position already watched still shows the whole screen at once. Comments whose textures miss the cache appear one by one, which for 300 comments is estimated at about 4 frames. When settings, screens, or scale factors change, lanes are swapped in place. Texture keys do not depend on lanes, and `backend.update` moves every on-screen comment to its new lane in a single call.

The number of rules went from 20 to 12, and patch rules went from 4 to 1. The danmaku side no longer has classification thresholds. All that remains is one inequality between batch parameters (step + check interval < lookahead), pinned by a test.

One change was not adopted: adding the snapshot time to the on-screen set as well, so that while dragging through an unbuffered region, the screen would already be full on the frame where the clock jumps to the landing point. The texture budget has a limit, and when it is full some textures must be evicted, with the choice based only on whether a comment has already appeared. The review found that comments on the snapshot side that had long since finished would then evict comments on the display-time side that were about to be needed, and the probe confirmed this. In dense videos, 64 MiB holds only 290–844 textures, so a saturated budget is the norm, while the benefit of this change was only about 1 frame. It has been shelved for now.

### Implementation details for the single time source

These are implementation details. If you only care about the approach, you can skip them.

- The clock layer's three timing properties need to be written atomically. Otherwise something may read an intermediate state where only some of them have been updated (tearing). I wrap only the three assignments in `CATransaction.lock()` and keep the commit outside the lock. Committing while holding the global lock deadlocks, because the lock order inside commit is the context lock first, then the global lock. Writing this way produced no tearing in the probe (0 of 20,000).
- An explicit commit from the background only commits the layers it changed itself, but uncommitted main-thread frame changes on the same layer get carried to the screen along with it. This was also confirmed in the probe.
- The forward-only rule takes its lower bound per epoch, and after the epoch changes it follows the timebase strictly. It also checks one platform precondition: whether the timing properties of the ancestor layers are identity. Only then does the layer's parent time equal host time, which the formula above relies on. They measured as identity in a regular window, native fullscreen, detached fullscreen, and Picture in Picture.
- Segment eviction has to protect the segments needed around both "snapshot time ∪ display time," which fixed an infinite loop between eviction and requests.
- KVO on `currentItem` fires synchronously inside the `replaceCurrentItem` call, so clearing the screen and rebinding the clock there means the old clock no longer gets one extra main-thread round.

## Known limitations

| Limitation | Magnitude | Reason |
|---|---|---|
| Empty screen at the landing point while the main thread is blocked after a seek during playback | Wired ≤ about 70 ms, Bluetooth ≤ about 280 ms (estimated) | Fixing it properly would require moving the recompute onto the clock queue, or adding the snapshot time to the on-screen set (shelved) |
| Forward jump of 20–40 ms on resume and rate changes | 2–3 pt | This is the timebase's true value; the video jumps too |
| Silent re-anchoring on Bluetooth | ±49 ms | There is no notification; only polling or filtering could handle it, and both are patches |
| When the texture budget is tight, which comments are missing depends on completion order | Only in dense videos at 2x | An exception already stated in "scene depends only on time" |
| Comments appear one by one on cache misses | A few frames | Intentional: nothing is held back |
