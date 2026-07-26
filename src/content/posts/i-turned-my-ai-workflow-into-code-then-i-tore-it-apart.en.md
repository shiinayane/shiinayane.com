---
title: "I Turned My AI Workflow into Code. Then I Tore It Apart."
published: 2026-07-27
description: "The day after I published I Turned My AI Workflow into Code, BiliKit M5.0 gave me a counterexample."
tags: [AI, Codex, Engineering, Workflow]
category: Engineering
draft: false
lang: en
translationKey: i-turned-my-ai-workflow-into-code-then-i-tore-it-apart
---

On July 25, I published [I Turned My AI Workflow into Code](/en/posts/i-turned-my-ai-workflow-into-code/).

One day later, I tore apart its central premise.

The timing was almost funny. When I finished that post, I thought the engineering workflow BiliKit had forced me to develop was finally becoming stable: risk levels, quality gates, independent review, complexity budgets, and eventually a pair of reusable Codex Skills.

The next day, BiliKit itself gave me a counterexample.

## The scroll position that kept getting more complete

I was working on M5.0. The requirement sounded simple:

Open a video from a browsing page, return from playback, and see roughly the same part of the page as before.

BiliKit was using a custom routing model. Opening playback removed the browsing view from the tree. Returning created it again, which meant its content and scroll position had to be restored manually.

The first version remembered the selected video ID. That could bring the card back on screen, but it could not restore the viewport I had actually left.

So I started storing a raw offset.

Every problem that followed was reasonable:

- The old offset might become unreachable after the content height changed.
- A callback from the old `ScrollView` could contaminate a new snapshot.
- Late asynchronous results needed request identity and generation checks.
- User scrolling had to release the programmatic restoration state.
- Deterministic tests and XCUI had to prove that returning really looked like leaving.

Each fix made the implementation more complete.

It passed the tests too.

That was the troublesome part. Tests, reviews, and gates were all checking whether the restoration mechanism was correct. Nobody kept asking:

**Why does the browsing page have to be destroyed at all?**

I eventually stopped and built a small SwiftUI probe comparing conditional replacement, explicit restoration, and a native `NavigationStack`.

The result was direct.

With `NavigationStack`, the root view was not created again and its state identity survived. A substantial part of the restoration problem came from the navigation structure we had chosen ourselves.

BiliKit then moved to a native `TabView(.sidebarAdaptable)`, with a separate `NavigationStack(path:)` for each tab. The custom `AppRoute` and `AppReturnSnapshot` went away. Bounded browsing worksets stayed, along with request cancellation and playback lifecycle handling. SwiftUI now owns the scroll position through semantic IDs.

Two real popular-feed round trips measured:

```text
0.195066 → 0.194867
0.389877 → 0.389447
```

There was no longer a reason for the ViewModel to store a raw numerical offset and own the clamping, restoration latch, and stale callback isolation around it.

## The process worked exactly as designed

No agent was obviously slacking off here.

The repository rules were read. The risks were identified. The validation level was reasonable. The implementation work found real bugs involving stale callbacks, unreachable offsets, lifecycle cleanup, and XCUI driving.

Every part of the process had accepted the same premise: keep the existing navigation structure and make state restoration reliable.

Once that premise entered the task contract, the agents became very good at following it.

Reviewers checked boundaries. The red reviewer searched for failure paths. Tests accumulated, and the documents became more complete. Every layer improved the correctness of the current approach while making it look more like the only approach worth continuing.

In the previous post, I described `project-governance-bootstrap` as a small compiler:

```text
repository facts
+ architecture documents
+ tests
+ security boundaries
→ project rules
```

There is a large problem with that analogy.

A compiler can only process what it receives.

If the architecture, task contract, and current implementation all omit a simpler route, the Skill can only compile the existing route more strictly. Path dependence does not disappear. It gets organized into better documents, more checks, and stronger momentum.

## I nearly turned the correction into another process

My first reaction was still to turn this experience into rules.

Perhaps every high-risk task should list alternatives first. Perhaps it needed a mandatory challenger, a decision ledger, and another reviewer dedicated to checking the problem definition.

It started feeling wrong while I was writing it.

I was adding process to prevent too much process. To keep agents from mechanically following a task contract, I was preparing a longer task contract.

That was not far from what I had just torn apart.

So I did not make a workflow v2.

I simplified BiliKit's collaboration rules directly. One commit removed 766 lines of configuration and documentation, along with five fixed agent definitions. The current `AGENTS.md` keeps project facts, architectural boundaries, safety constraints, working validation commands, and commit conventions.

The quality checks are still there.

SwiftPM, `xcodebuild`, lifecycle tests, and security boundary checks still answer useful questions: whether the build broke, cancellation is correct, resources are released, and the real app can run.

Fixed risk colors, task-contract forms, reviewer chains, and complexity budgets are no longer default ceremonies.

They remain available when a change actually needs them. Every task no longer has to prove that it followed the process.

## What happens to the two Skills?

`apple-dev-loop` is mostly fine for now.

It routes Apple-platform validation: when SwiftPM is enough, when `xcodebuild` is needed, and when evidence requires an `.xcresult`, a signed app, XCUI, or Instruments.

The boundaries of that job are fairly clear.

`project-governance-bootstrap` is different.

It was designed to derive governance from a repository. That carries an assumption that enough repository context can produce the right workflow for the project.

BiliKit just demonstrated that a repository can describe the wrong route in great detail.

I am going to reconsider that Skill. It may shrink into a tool that only collects existing facts and validation entry points. I may archive it instead. I have not decided yet.

## No new answer yet

The main BiliKit source and test directories now contain almost 25,800 lines of Swift.

The project is still too large for one prompt followed by one diff review. The old rules were not useless either. They caught plenty of real problems.

I no longer think I can turn that experience into a universal workflow and have it choose the right route for the next project.

At least it could not this time.

I am keeping the July 25 post. It records something I genuinely believed at the time. Quietly rewriting or deleting it would make the story less useful.

This post records what happened the next day.

I will decide what comes after that when the project forces me to change again.
