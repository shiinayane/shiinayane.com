---
title: "I Turned My AI Workflow into Code"
published: 2026-07-25
description: "BiliKit passed 21,000 lines before V1. I extracted the workflow it forced me to build into two reusable Codex Skills."
tags: [AI, Codex, Engineering, Workflow]
category: Engineering
draft: false
lang: en
translationKey: i-turned-my-ai-workflow-into-code
---

BiliKit V1 is not finished yet, and the Swift codebase has already passed 21,000 lines.

When the project was small, my AI workflow was straightforward: write a longer prompt, let the agent make the change, and check the diff myself. Even when it got something wrong, the change usually touched few enough files that I could spot it quickly.

That stopped being enough as the repository grew.

The same instruction—"read the project rules before making changes"—could produce very different results in a new session. Sometimes every test passed, but the change landed in the wrong module. Sometimes a small fix came back with an entirely new abstraction.

BiliKit also has several areas that a green test suite cannot fully cover: Keychain access, playback lifecycles, cancellation, danmaku rendering, and the local server. A successful build does not tell me whether those paths work in a signed app or survive actual use.

So the repository gradually accumulated more machinery:

- `AGENTS.md`
- risk levels
- quality gates
- independent review
- complexity budgets
- different validation paths for different kinds of work

After a while, the workflow was reasonably stable inside BiliKit. Then I started another project and realized I would have to assemble it all over again.

Some rules lived in `AGENTS.md`, some in gate documents and scripts, and some were still habits in my head. I could rewrite them from memory or copy the BiliKit files.

The first option would miss things. The second would bring far too much baggage.

A static website does not need BiliKit's rules for playback, Keychain, local servers, or media redirects. A utility with fewer than 1,000 lines may still need strict handling if those lines touch credentials.

What I wanted to reuse was the way those rules were derived.

I created a repository called `codex-engineering-skills` and started with two Codex Skills:

- `project-governance-bootstrap`
- `apple-dev-loop`

The first reads a project and builds engineering rules that fit it. The second handles the build, test, and validation loop for Apple-platform work.

## Copying BiliKit's AGENTS.md did not work

My first idea was to turn BiliKit's `AGENTS.md` into a generic template.

It did not take long to find the problem.

BiliKit treats authentication, redirects, local servers, playback, concurrency, renderers, and destructive migration as high-risk work. That list makes sense because the project actually has those failure modes. Put the same list in a static website and it becomes ceremony. Ask a command-line parser to validate Keychain behavior in a signed app and the workflow becomes ridiculous.

`project-governance-bootstrap` therefore starts by reading the repository:

- existing instructions
- architecture decisions
- manifests and dependencies
- tests
- CI
- security boundaries
- release process

It then chooses one of three rough profiles:

- **light**: small, easy to roll back, and mainly one validation path;
- **standard**: multiple modules, public boundaries, persistence, CI, or several test layers;
- **critical**: credentials, authorization, destructive migration, untrusted input, local servers, media lifecycles, or production infrastructure.

Line count is only a clue. One hundred thousand lines of generated code may be harmless; a short migration that deletes data is not.

The result is still the project's own policy. The reusable part is the process used to produce it.

## It ended up looking more like a compiler

I now think of `project-governance-bootstrap` as a small compiler.

Its input looks roughly like this:

```text
code
+ manifests
+ architecture documents
+ tests
+ CI
+ security boundaries
+ release rules
```

Its output looks like this:

```text
source-of-truth order
+ architectural boundaries
+ risk areas
+ validation entry points
+ authorization limits
+ optional reviewer roles
```

There are templates in the repository, but they are only starting points. If a section does not apply, it should disappear.

Templates have a habit of keeping themselves alive. Once a generic "Security" section exists, both people and AI tend to fill it with text even when the project has no meaningful security boundary. The document becomes complete-looking and mostly useless.

If the repository already has a command that proves the relevant result, there is no reason to add another gate script. If there is no special security boundary, a few paragraphs of generic security advice do not help.

Enough is enough.

## Why there are two Skills

The original BiliKit workflow mixed two questions:

1. What does this repository require?
2. How should this Apple-platform change be validated?

They often appear together in BiliKit, but I split them when making the workflow reusable.

`project-governance-bootstrap` owns the repository rules. It may decide that a project needs signed-app evidence, UI testing, or a performance recording, but it does not contain every Xcode procedure.

`apple-dev-loop` owns the actual validation. It knows when to use SwiftPM, `xcodebuild`, `.xcresult`, XCUI, a signed app, Computer Use, or Instruments. It does not decide the application's architecture or risk policy.

They can be used together, but neither depends on the other. The governance Skill can also work on Rust, TypeScript, or documentation repositories. The Apple Skill can work in a Swift project that already has its own engineering rules.

## A Skill also needs to know when to stay out

While writing the Skills, I found that the trigger description needed as much care as the workflow itself.

If `apple-dev-loop` ran whenever a request mentioned Swift, a syntax question could suddenly turn into Xcode preflight, scheme discovery, and a full build. Thorough, perhaps, but also completely unnecessary.

Its trigger therefore says when the full loop applies and when it does not. It is useful when a task really needs the Apple toolchain, signing, a device, UI validation, or performance evidence. A source-only Swift explanation or a narrow package edit usually does not.

`project-governance-bootstrap` has a similar boundary. The existence of an `AGENTS.md` file is not, by itself, a request to redesign the repository's governance.

I used to think extra instructions were mostly harmless. In practice, they consume context and change tool choices. Detailed Instruments instructions make Instruments look tempting even in a simple package-test task.

More context can create more work.

## Keeping SKILL.md small

The first design almost became two enormous `SKILL.md` files.

The governance Skill would have contained every risk category, template, reviewer role, and Apple exception. The Apple Skill would have contained every Xcode, XCTest, signing, simulator, UI, and Instruments recipe.

Now each Skill keeps a short core workflow and reads supporting material only when it is needed.

An ordinary repository never loads the Apple profile. A task that does not need independent roles never loads the agent-routing guide. A package test does not load Instruments instructions in advance.

This is usually called progressive disclosure. I think of it as dependency management for context.

The details of a tool make it more likely to be selected. Loading less is useful when the omitted material cannot help with the current decision anyway.

## How far should Apple validation go?

`apple-dev-loop` uses an evidence ladder:

1. source inspection and static constraints
2. SwiftPM, unit, and integration tests
3. `xcodebuild` with a structured `.xcresult`
4. Xcode-aware diagnostics and actions
5. deterministic XCUI tests
6. a signed app and real UI interaction
7. targeted `xctrace` or Instruments recording
8. CI, device matrices, and independent review

The point is not to reach the last step every time. It should stop at the first level that can prove the current claim.

A screenshot cannot replace a unit test. An unsigned build cannot prove Keychain access. Launching the app does not prove a lifetime issue is fixed. A trace from one Mac does not represent every supported device.

The Skill also includes a few small scripts. One records the repository, workspace, scheme, Xcode, and Developer Directory before an expensive run. Another reads structured results from `.xcresult` instead of guessing from thousands of lines of console output.

I did not try to rebuild Xcode in shell. The scripts only cover bounded steps where automation removes ambiguity.

## Even the installer needs guardrails

The repository has a script that installs the Skills as symbolic links so Codex can discover them.

If the destination already points to the correct location, the script does nothing. If it is another link or a real directory, the script refuses to overwrite it.

It is a small detail, but an installer that silently replaces an existing Skill is an easy way to lose data. The same applies to changing global `xcode-select` just to make one build pass: it may fix the current project and leave every other Xcode project with a surprise.

The Skills prefer configuration scoped to the current task. Ambiguous state causes a stop, and a missing optional tool is only a blocker when the current claim actually requires it.

## Vague rules became harder to keep

Inside BiliKit, a sentence such as this felt clear enough:

> Important changes require independent review.

In a reusable Skill, it immediately raises more questions. What counts as important? Does every multi-file edit need review? What should the reviewer know? What happens when two reviews disagree?

The rule had to become narrower.

Green work does not need a review ceremony. Non-mechanical yellow work may get an independent read-only review. Red work focuses review on failure paths, cancellation, ownership, security, cleanup, and rollback. It also gets a complexity budget, because "being rigorous" can otherwise keep adding process forever.

Other familiar instructions had the same problem.

"Run the full test suite" is wrong when the highest deterministic mode already includes the lower modes. "Test on a real device" only makes sense when deterministic tests cannot prove the claim. "Use Xcode MCP" still requires checking which Xcode process, window, workspace, and scheme it is connected to.

Rules that survived through project context needed explicit conditions once they became reusable.

## The Skills need tests too

The repository has a validator for metadata, internal links, unresolved placeholders, shell syntax, and formatting. The link installer has separate conflict checks.

Those checks only prove that the files are structurally valid.

A Skill can have clean metadata and valid shell while still making poor decisions. It can trigger too broadly, produce rules that are too heavy, ignore existing project constraints, or recommend evidence that does not answer the question.

The useful test is trying it from a fresh context on different repositories.

For `project-governance-bootstrap`, I want to try a small reversible tool, a normal multi-module application, and a project with real security or lifecycle risk. The generated rules should be different.

For `apple-dev-loop`, I want to see whether it stops in the right place: package tests for a package change, `xcodebuild` for an Xcode project, a signed app for Keychain, and Instruments only for an actual performance question.

If the result is still BiliKit's rules with the project name replaced, I will have to go back and change it.
