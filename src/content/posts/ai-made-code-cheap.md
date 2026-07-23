---
title: "AI Made Code Cheap. It Made Engineering More Expensive."
published: 2026-07-24
description: "BiliKit passed 21,000 lines of Swift before v1. The scale did not make me prompt harder; it forced me to replace prompting with contracts, boundaries, independent review, and evidence."
tags: [AI, Swift, Engineering, Workflow]
category: Engineering
draft: false
lang: en
---

BiliKit is not at version 1 yet.

It is a native macOS client I started building for Bilibili, written in Swift 6, SwiftUI, and AVFoundation. At the time of writing, the repository contains 125 Swift files and 21,300 lines of Swift: roughly 12,700 lines of production code and 8,400 lines of tests. It can browse and search, authenticate through a web QR flow, play DASH video through AVPlayer, show subtitles, schedule danmaku against the playback timeline, and render it under sustained load.

It still is not finished.

The UI needs a serious pass. Mac-specific product work remains. Signing, notarization, release engineering, and the final v1 regression matrix are all ahead of me.

This is the largest project I have built with AI doing a meaningful share of the implementation. It is also the project that finally broke my original AI workflow.

At first, I worked the way most people describe AI-assisted programming: explain a feature, let the model inspect the repository, ask it to implement the change, run the tests, and fix whatever fails. That approach feels astonishingly productive on a small codebase. A coherent feature can appear in an afternoon. The model remembers the conversation. The diff is still small enough to read. If the architecture bends a little, you can bend it back.

Then the repository grows.

The model can still produce code quickly. That is not the problem. The problem is that every new line enters a system whose invariants no longer fit in one conversation, one diff, or one person's short-term memory. A plausible local change can violate a dependency boundary three modules away. A passing test can hide a cancellation race. A performance experiment can quietly become production architecture. A reviewer can recommend five individually reasonable safeguards whose combined cost is larger than the feature they protect.

The more capable the AI became, the less my workflow could depend on asking it to be capable.

I had to replace trust in a conversation with trust in a system.

## The first workflow: prompt, inspect, repair

My early loop was simple:

1. Describe the next feature.
2. Let the AI inspect relevant files.
3. Ask it to implement the feature.
4. Run tests.
5. Review the diff and repair obvious mistakes.

For a small project, this is not a bad workflow. It is fast, direct, and often enough. The task and the repository are both small enough that the model can hold most of the important context at once.

BiliKit stopped being that kind of project much earlier than I expected.

Playback alone crossed networking, byte ranges, SIDX parsing, HLS playlist generation, a loopback HTTP server, AVPlayer lifecycle, cancellation, seek behavior, and CDN fallback. Authentication crossed a remote state machine, ephemeral URL sessions, redirect policy, Keychain storage, request authorization, logout cleanup, and UI state. Danmaku crossed protobuf decoding, segment prefetch, deduplication, a shared media timeline, lane allocation, Core Animation, object lifetime, and sustained-load behavior.

These were not independent features. They touched different parts of the same state and resource graph.

The failure mode was rarely "the AI wrote invalid Swift." Modern models are very good at producing valid Swift. The dangerous failures were more respectable than that:

- a type placed in a convenient module instead of the module that owned its meaning;
- a test that passed because one `Task.yield()` happened to be enough on that run;
- a cancellation path that stopped UI updates but left the underlying resource alive;
- an anonymous media request that accidentally inherited authenticated headers;
- a benchmark harness that grew into a miniature framework before it had answered one product question;
- a document that described an intended capability as if it were current behavior.

Every one of these can survive a quick review. Some can survive a complete test suite.

I initially responded by writing longer prompts. That helped for a while, then made the problem worse. A longer prompt is still temporary state. It mixes product intent, architecture, historical decisions, implementation details, and today's task into one large block whose internal priorities are unclear. More context is not the same thing as better control.

The project needed memory outside the conversation.

## The repository became the source of truth

The first real change was treating repository documentation as executable project memory, not as an explanation written after the code.

BiliKit now has a roadmap that separates current facts from future plans, Architecture Decision Records for decisions that should not be casually reopened, threat models for authentication and personal viewing data, validation records for environment-dependent claims, and an engineering guide that tells both humans and agents where different kinds of code belong.

The order matters.

Current code and build configuration outrank everything else. Accepted architecture decisions come next. The roadmap describes direction and gates, but a plan is not evidence that something works. Dated validation records preserve what was observed in a particular environment without pretending that the result is timeless.

This hierarchy solved a subtle problem: AI is extremely willing to reconcile contradictions by writing smooth prose. If an old validation record says one thing and the current implementation says another, the tempting response is to "make the docs consistent." But historical evidence should not be rewritten to match the present. The right response is to identify which source owns which kind of truth.

The same applies to scope. BiliKit's v1 explicitly excludes downloads, transcoding, live streaming, multiple accounts, region unlocking, and a long list of attractive distractions. An AI agent can generate a convincing implementation plan for any of them. That does not make them part of the product.

Once generation becomes cheap, saying no becomes an engineering tool.

## I stopped assigning features and started defining contracts

The next change was smaller in form and larger in effect. Before implementation begins, every non-trivial task now has four fields:

- **Goal:** the one observable behavior that should change.
- **Context:** the relevant entry points, decisions, prior evidence, and known limitations.
- **Constraints:** dependency direction, security, cancellation, lifetime, compatibility, and scope boundaries.
- **Done when:** the tests, probes, measurements, or user-visible behavior that would prove completion.

This is not a detailed implementation plan. In fact, it is useful precisely because it refuses to become one too early.

If I cannot describe the goal in one sentence, the task is probably carrying two independent changes. If "done when" says only that tests pass, I probably have not identified the risky behavior. If the constraints section becomes a page of speculative safeguards, I may be designing a framework instead of solving the task.

The contract changed my relationship with the model. I no longer ask, "Can you implement danmaku rendering?" I ask for a bounded result with explicit ownership and a stopping point. The AI is free to reason about implementation inside that box, but it is not free to silently redefine the box.

This also makes context disposable. A new conversation does not need to inherit the entire reasoning history of the previous one. It can read the contract, the relevant repository facts, and the files under review. That is important because conversation continuity feels like memory, but it is also bias. A model that helped invent an approach is naturally inclined to defend it.

## Work vertically, not layer by layer

AI makes horizontal construction dangerously attractive.

It is easy to ask for all domain models, then all repositories, then all use cases, then all views. The result looks architectural. It also creates abstractions with no real caller, protocols based on imagined futures, and large regions of code that have never participated in one complete behavior.

BiliKit moved to vertical slices instead.

A slice starts with the smallest domain or application contract, adds the concrete adapter, connects one feature state, wires it at the composition root, and proves the whole path. Authentication was not "build an auth framework." It was QR state, secure credential ownership, one authorized endpoint, one UI flow, restart recovery, and logout. Danmaku was not "build a renderer." It began with one media timeline, one segment contract, bounded scheduling, then a renderer connected through the real chain.

The architecture is still layered:

```text
Scene → View → ViewModel → Use Case → Repository Port → Adapter
```

But implementation moves through the layers, not across them.

This matters even more with AI than without it. A model can fill an empty architecture with internally consistent code at remarkable speed. A vertical slice forces every abstraction to justify itself through a real caller and a real observable result.

No empty target. No placeholder repository. No `Common`, `Shared`, or `Utils` module waiting to become a landfill.

## Risk, not diff size, chooses the workflow

One of my earlier mistakes was treating small diffs as safe diffs.

A five-line change to redirect handling can expose credentials. A ten-line change to task ownership can create a leak or a stale-result race. A tiny persistence migration can destroy data. Meanwhile, a large generated protobuf file may be mechanically boring.

So the project now classifies work by failure mode.

Green work includes local presentation changes and narrow mechanical edits. Yellow work includes ordinary features, use cases, cross-file refactors, and public APIs. Red work includes authentication, Keychain, media, redirects, local servers, concurrency, resource lifetime, renderers, migrations, deletion, and irreversible changes.

The class changes the process:

- Green work gets the baseline checks and a focused diff review.
- Yellow work gets an explicit contract and an independent read-only review.
- Red work gets a decision gate, a complexity budget, isolated experiments when needed, independent technical review, real measurements, and an explicit user decision before the risky route becomes production.

This can sound bureaucratic when written as a list. In practice, it removed bureaucracy from ordinary work. Not every task needs every ceremony. The point of classification is to spend attention where failure is expensive, instead of applying the same giant checklist to everything.

It also prevents a common AI failure: escalating rigor without considering cost. A reviewer can always imagine another matrix dimension, another fixture, another abstraction, another adversarial case. "More thorough" has no natural stopping condition.

For uncertain work, I now set a complexity budget before implementation: at most a small number of candidates, metrics, load levels, executables, fixtures, and output formats. If an agent wants to exceed the budget, it has to explain which decision the extra machinery protects and why a cheaper observation cannot answer it.

Rigor without a budget becomes a new form of scope creep.

## Independent context is more valuable than another pass

I used to ask the same conversation to implement a feature and then review its own work. This catches syntax mistakes and obvious omissions. It does not create independence.

The implementing context has a story in its head: why a type exists, why a compromise was reasonable, why a test should be sufficient. When it reviews the result, it sees the code through that story.

For meaningful changes, BiliKit now uses a fresh, read-only context. The reviewer receives the task contract, the relevant facts, and the changed files. It does not receive the implementer's conclusion.

For high-risk work, I separate the questions further:

1. **Value and simplification:** Is this work necessary, and is this the shortest route to a useful decision?
2. **Comprehensibility:** Can I, as the person authorizing the work, understand the product decision, scope, major risks, and stopping conditions?
3. **Technical correctness:** Are failure, cancellation, ordering, ownership, security, bounds, and cleanup actually handled?

These perspectives are intentionally not merged into one omniscient reviewer. If their recommendations conflict or collectively exceed the complexity budget, the task returns to the decision gate. I do not combine every suggestion into a larger plan.

The point is not to simulate a committee. It is to prevent one chain of reasoning from becoming the only reality the project can see.

## Tests are necessary; evidence closes the gate

The most useful lesson arrived through a flaky subtitle test.

The test assumed that one `Task.yield()` would give an asynchronous stream enough time to publish observable state. It usually did. When the unified project gate ran the whole system under a different timing profile, the race surfaced.

The wrong response would have been to rerun the suite until it passed. The right response was to replace an assumption about scheduling with a wait for observable state.

That distinction now shapes the whole workflow. A green test suite proves only what the suite actually observes. It does not prove that a signed Keychain flow works, that AVPlayer can seek through the generated stream, that a renderer releases its layers after 30 minutes, or that a UI remains usable while a window is resized.

BiliKit uses one reproducible entry point for static checks, package tests, and the full app build. Then risky tasks add the evidence they need:

- deterministic fixtures for protocol behavior;
- negative tests for source and redirect policies;
- signed smoke tests for Keychain;
- real AVPlayer probes for playback;
- controlled high-density runs for rendering;
- long-running measurements for memory and cleanup;
- manual confirmation for the one product path automation cannot meaningfully judge.

A milestone is not complete because the code exists. It is complete when the code, automated gates, environment-specific evidence, current documentation, and repository state agree.

This is slower than accepting "all tests pass." It is much faster than discovering six milestones later that the tests proved the wrong thing.

## Spikes must be allowed to die

The danmaku renderer forced another change.

Rendering many moving text layers looked like an implementation problem, but it was first a decision problem: which technique could satisfy readability and sustained-load behavior without building a rendering engine larger than the feature?

The experiment therefore lived on an explicitly non-mergeable spike branch. Its job was to compare a small number of candidates under synthetic load and answer one production decision. It was not allowed to become reusable infrastructure by momentum.

That boundary is important with AI because throwaway code no longer feels expensive. A model can polish a benchmark, add configuration, produce result schemas, and make the harness look production-ready in minutes. The low cost of each addition hides the total cost of the system being created.

A spike should be optimized for learning and deletion.

After the result selected a route, production work started from a new contract. The experiment was evidence, not a foundation. This prevented accidental architecture: the common pattern where temporary code survives because it already works and then defines the product for years.

## My job moved upward, but it did not disappear

It is tempting to describe this workflow as moving from programmer to architect. I do not think that is quite right.

I still read code. I still need to understand Swift concurrency, ownership, AVFoundation, HTTP behavior, Keychain semantics, and Core Animation well enough to reject plausible nonsense. AI did not remove the need for technical depth. It changed where that depth pays off.

I spend less time typing routine implementations and more time deciding:

- what owns a piece of state;
- which layer is allowed to know a fact;
- what failure would be expensive;
- what evidence would change the next decision;
- when an abstraction has earned the right to exist;
- when a reviewer is protecting the product and when it is protecting an imaginary future;
- when to stop.

The last one may be the most important.

AI has no natural resistance to producing more. It does not get tired of another helper, another protocol, another test matrix, or another document. Traditional development had friction built into it: writing code was expensive, so some ideas died before implementation. In AI-assisted development, that friction is gone. The workflow has to put judgment back deliberately.

The human is not merely the person who writes the prompt. The human is the owner of scope, risk, and truth.

## What I use now

My current loop looks very different from the one I started with:

1. Read the current code, roadmap, relevant decisions, tests, and historical evidence.
2. Define one observable goal and its completion evidence.
3. Classify the task by failure risk, not by estimated line count.
4. Set a complexity budget before exploring uncertain solutions.
5. Implement the smallest vertical slice.
6. Review meaningful changes from an independent, read-only context.
7. Run the shared automated gate.
8. Add only the real-world evidence required by the risk.
9. Update current documentation without rewriting history.
10. Close the milestone only when code, evidence, docs, CI, and Git state agree.

This workflow is not universally optimal. It would be absurd for a weekend script. It evolved because BiliKit became large enough, stateful enough, and risky enough that conversational confidence stopped being useful.

The surprising part is that the change was not caused by AI failing to write code. It was caused by AI succeeding.

Twenty-one thousand lines before v1 would have been difficult for me to produce alone in the same period. AI made that scale reachable. Then the reachable scale exposed every weakness in a workflow built around local understanding and informal review.

Code became cheap. Coherence did not.

If AI continues to improve, I expect this distinction to matter more, not less. The winning workflow will not be the one that extracts the most code from a model. It will be the one that can absorb generated code without losing ownership, boundaries, evidence, or the ability to say what the system actually does.

BiliKit is still not at version 1.

But the project has already changed the way I build software. I no longer treat an AI conversation as the place where engineering truth lives. The conversation is a worker inside a larger process. The repository holds the memory. Contracts hold the intent. Gates hold the evidence. Independent contexts challenge the story.

And I remain responsible for deciding when any of it is good enough.
