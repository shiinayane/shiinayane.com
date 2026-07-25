---
title: "AI Made Code Cheap. It Made Engineering More Expensive."
published: 2026-07-24
description: "BiliKit reached 21,300 lines of Swift before v1. Here is why my original prompt-and-review workflow stopped working, and what I changed."
tags: [AI, Swift, Engineering, Workflow]
category: Engineering
draft: false
lang: en
translationKey: ai-made-code-cheap
---

BiliKit has not reached version 1 yet, but it already contains 21,300 lines of Swift.

That number includes about 12,700 lines of production code and 8,400 lines of tests across 125 Swift files. The app can browse and search Bilibili, log in through a web QR flow, play DASH video with AVPlayer, show subtitles, schedule danmaku on the playback timeline, and keep the renderer running under sustained load.

It still needs a proper UI pass, more Mac-specific work, signing, notarization, release engineering, and the final v1 regression matrix.

This is also the first project where my original AI workflow stopped being enough.

In the beginning, I would describe a feature, let the model inspect the repository, ask it to implement the change, run the tests, and then read the diff. This worked quite well while the repository was small. Even when the model put something in the wrong place, the change was usually small enough to understand and repair.

As BiliKit grew, the failures became harder to spot.

## The code usually compiled

The annoying part was that AI rarely failed by producing obviously broken Swift.

Playback alone crosses networking, HTTP byte ranges, SIDX parsing, generated HLS playlists, a loopback HTTP server, AVPlayer lifecycle, cancellation, seeking, and CDN fallback. Authentication involves a remote state machine, ephemeral URL sessions, redirect policy, Keychain storage, request authorization, logout cleanup, and UI state. Danmaku goes through protobuf decoding, segment prefetch, deduplication, a shared media timeline, lane allocation, Core Animation, and object lifetime.

A change could look perfectly reasonable inside one file and still be wrong for the whole path.

Some actual failure modes were:

- a type living in the most convenient module instead of the module that owned its meaning;
- a test passing because one `Task.yield()` happened to be enough on that run;
- cancellation stopping the UI update while leaving the underlying resource alive;
- an anonymous media request inheriting authenticated headers;
- a benchmark harness growing into a small framework before answering the original question;
- a document describing a planned capability as if it already existed.

Most of these survive a quick diff review. Some even survive the full test suite.

My first reaction was to write longer prompts. That helped for a while, but every new conversation needed the same background again: product scope, architecture, old decisions, risky areas, and how to verify the change. Important details were mixed with whatever I happened to be working on that day.

At some point, adding more text to the prompt became a pretty bad way to maintain the project.

## Moving the context into the repository

BiliKit gradually accumulated a roadmap, Architecture Decision Records, threat models, dated validation records, and an engineering guide.

These files do different jobs.

The current code and build configuration describe what exists now. Accepted decisions record boundaries that should not be reopened casually. The roadmap separates current work from later ideas. Validation records preserve what happened in a particular environment, including results that may become outdated.

This distinction matters because the project has plenty of attractive distractions. Downloads, transcoding, live streaming, multiple accounts, and region unlocking can all produce a convincing implementation plan in a few minutes. They are still outside the v1 scope.

I also started writing a small contract before non-trivial changes:

- **Goal:** the observable behavior that should change;
- **Context:** relevant entry points, decisions, and known limitations;
- **Constraints:** dependency direction, security, cancellation, lifetime, and scope;
- **Done when:** the test, probe, measurement, or visible behavior that closes the task.

If I cannot describe the goal in one sentence, the task is usually carrying more than one change. If “done when” only says that tests pass, I probably have not identified the risky behavior yet.

This made new conversations much easier to start. They no longer needed the entire history of the previous conversation. They could read the contract and the files that already belonged to the project.

## Building one real path at a time

AI is very good at filling an empty architecture.

It can generate all domain models, all repository protocols, all use cases, and all views in one pass. The result often looks impressively organized. It may also contain protocols with no real caller, placeholder targets, and abstractions based on features that do not exist.

BiliKit now prefers vertical slices.

The architecture is still layered:

```text
Scene → View → ViewModel → Use Case → Repository Port → Adapter
```

Implementation moves through those layers for one observable behavior.

Authentication started with the QR state, credential ownership, one authorized endpoint, one UI flow, restart recovery, and logout. Danmaku started with one media timeline, one segment contract, bounded scheduling, and then a renderer connected through the real playback chain.

This is slower than asking AI to scaffold an entire subsystem in one shot, but there is much less empty code to clean up later.

## Five changed lines can still be red

I used to associate a small diff with a small risk. BiliKit cured me of that fairly quickly.

Five lines in redirect handling can expose credentials. A small task-ownership change can introduce a leak or stale-result race. A short persistence migration can destroy user data. Meanwhile, a large generated protobuf file can be almost entirely mechanical.

The repository now classifies work by failure mode:

- **Green:** local presentation changes and narrow mechanical edits;
- **Yellow:** ordinary features, use cases, cross-file refactors, and public APIs;
- **Red:** authentication, Keychain, media, redirects, local servers, concurrency, resource lifetime, renderers, migrations, deletion, and irreversible changes.

Green work gets the baseline checks and a focused diff review. Yellow work gets a written contract and usually a fresh read-only review. Red work needs a decision gate, a bounded experiment when the route is uncertain, measurements that match the risk, and explicit approval before a risky experiment becomes production code.

The classification actually reduced the amount of process. A CSS change does not need the same ceremony as Keychain or AVPlayer lifecycle work.

I also started giving uncertain experiments a complexity budget. A renderer comparison does not need ten candidates, five output formats, and a reusable benchmark framework. It needs enough candidates and measurements to answer the product question.

The danmaku renderer was developed this way. The comparison lived on a non-mergeable spike branch and used synthetic load to choose a route. Once it had answered that question, production implementation started separately. The benchmark did not get promoted just because it already worked.

## Tests only prove what they observe

One subtitle test taught me this in a very direct way.

The test called `Task.yield()` once and assumed the asynchronous stream would publish observable state. It usually passed. The race appeared only when the unified project gate ran under a different timing profile.

Rerunning it until green would have hidden the problem again. The test had to wait for the state it actually cared about.

BiliKit now has one reproducible entry point for static checks, package tests, and the full app build. Risky paths add their own evidence:

- deterministic fixtures for protocol behavior;
- negative tests for source and redirect policy;
- a signed smoke test for Keychain;
- real AVPlayer probes for playback;
- controlled high-density runs for danmaku;
- longer measurements for memory and cleanup;
- manual checks for UI behavior that automation cannot judge usefully.

An unsigned build cannot prove that Keychain works. A screenshot cannot prove cancellation. A successful launch says very little about a renderer after 30 minutes.

Running every available tool is also pointless. A Swift Package change may be finished after package tests. Instruments belongs to an actual performance question.

## The workflow I ended up with

For ordinary BiliKit work, the loop now looks roughly like this:

1. Read the current code, roadmap, relevant decisions, and tests.
2. Write one observable goal and decide what would prove it.
3. Classify the task by the cost of failure.
4. Set a complexity budget if the implementation route is uncertain.
5. Build the smallest vertical slice.
6. Use a fresh, read-only context for meaningful reviews.
7. Run the shared automated gate.
8. Add the environment-specific evidence required by that change.
9. Update current documentation without rewriting old validation history.

This would be ridiculous for a weekend script. BiliKit has authentication, playback, a local server, concurrent state, and a renderer, so the simple prompt-and-review loop stopped scaling much earlier than I expected.

The project is still before v1. The workflow will probably change again before release.

For now, at least, a new conversation no longer has to remember the whole project by itself.

---

*I later extracted part of this workflow into reusable Codex Skills. The follow-up, [I Turned My AI Workflow into Code](/en/posts/i-turned-my-ai-workflow-into-code/), covers that process.*
