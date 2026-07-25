---
title: "I Turned My AI Workflow into Code"
published: 2026-07-25
description: "What happened when I extracted the engineering workflow BiliKit forced me to invent into two reusable Codex Skills—and discovered that reusable judgment needs boundaries, composition, and tests of its own."
tags: [AI, Codex, Engineering, Workflow]
category: Engineering
draft: false
lang: en
translationKey: i-turned-my-ai-workflow-into-code
---

In the previous article, I wrote about the workflow that emerged while building BiliKit, a Swift project that passed 21,000 lines before reaching version 1.

The short version was this: AI made code cheap, but it did not make coherence cheap. As the repository grew, prompting harder stopped helping. I needed durable project memory, explicit task contracts, risk-based review, vertical slices, complexity budgets, and evidence that went beyond a green test suite.

That workflow worked.

Then it created a new problem.

The useful parts were trapped inside one repository. Some lived in BiliKit's `AGENTS.md`, some in its quality-gate documentation, some in scripts, and some only in the habits I had learned while operating them. Starting another project would mean either rebuilding the process from memory or copying BiliKit's rules wholesale.

Both options were wrong.

Rebuilding from memory would lose the details that made the workflow reliable. Copying the files would preserve far too many details that only made sense for BiliKit: Bilibili protocol boundaries, Keychain ownership, media redirect policy, danmaku renderer risks, specific package names, and a milestone structure that belonged to one product.

What I wanted to reuse was not the policy.

I wanted to reuse the method that produced the policy.

So I created a new repository called `codex-engineering-skills` and started turning the workflow into two reusable Codex Skills:

- `project-governance-bootstrap`, which derives project-specific governance from an actual checkout;
- `apple-dev-loop`, which chooses and runs the smallest evidence loop capable of proving an Apple-platform engineering claim.

This is not a story about packaging a prompt.

It is a story about what happened when I tried to turn engineering judgment into code.

## A workflow is not reusable just because it is written down

My first instinct was the obvious one: extract the useful sections from BiliKit's engineering guide into a generic template.

That approach failed almost immediately.

BiliKit classifies authentication, redirects, local servers, playback, concurrency, renderers, and destructive migration as high-risk work. Those are sensible categories for BiliKit because the product actually has those failure modes. Copy the same list into a static website and it becomes theater. Copy BiliKit's requirement for signed Keychain validation into a command-line parser and the process becomes nonsense.

The reverse failure is worse. A small utility that handles credentials may contain fewer than a thousand lines and still deserve stricter controls than a large generated library. Repository size is a poor proxy for consequence.

This led to the first rule of the extraction:

> Reuse the decision procedure, not the previous decision.

The governance Skill does not say that every repository needs BiliKit's rules. It begins by reading the repository's own instructions, architecture decisions, manifests, CI, tests, security documents, and release boundaries. Then it selects the lowest governance profile that covers the failure modes it actually finds:

- **light** for a small, reversible surface with one primary validation path;
- **standard** for multiple modules, public boundaries, CI, persistence, or several validation layers;
- **critical** for credentials, authorization, destructive migration, untrusted input, local servers, media lifecycles, production infrastructure, or difficult rollback.

The output is still project-specific. The reusable part is how the Skill gets there.

This sounds obvious in retrospect. It was not obvious while the rules were working inside one project. A local workflow accumulates assumptions so gradually that they become invisible. Extraction makes every assumption answer a harder question:

> Is this a general principle, a platform profile, or merely a fact about the project that taught me the principle?

Most of the work was separating those three.

## The Skill is a compiler, not a template

I now think of `project-governance-bootstrap` less as a document generator and more as a small compiler.

Its input is a repository:

```text
code + manifests + ADRs + tests + CI + security boundaries + release rules
```

Its output is an enforceable project contract:

```text
source-of-truth order
+ architectural boundaries
+ proportional risk zones
+ validation entry points
+ authorization limits
+ optional reviewer roles
```

A compiler does not paste a previous program into a new file. It reads a specific input, applies rules, and produces an output appropriate to that input.

That is why the Skill explicitly rejects several tempting shortcuts:

- it does not overwrite an existing `AGENTS.md` wholesale;
- it does not transplant product names, paths, thresholds, or risk categories;
- it does not turn line counts or model choices into evidence;
- it does not generate custom agents unless independent roles have recurring value;
- it does not create a new gate script when an existing command already proves the claim;
- it does not encode temporary milestones, test counts, commit IDs, or CI runs as permanent rules.

The templates in the repository are drafting skeletons, not canonical policy. Every irrelevant section is supposed to disappear.

This distinction matters because templates have gravity. Once a section exists, both humans and models tend to preserve it. A generic "Security" heading invites generic security prose even when the repository has no meaningful security boundary. A prewritten red-zone list encourages classification by resemblance instead of consequence.

Good generated governance is not the most complete document. It is the smallest document that prevents the project's likely expensive mistakes.

## I split one workflow into two Skills

The BiliKit workflow mixed two related but different questions:

1. What does this repository require?
2. How do I prove this Apple-platform change works?

It was tempting to keep them together because BiliKit is an Apple-platform project and commonly needs both. I separated them anyway.

The root README now describes the relationship in one sentence:

> The governance Skill defines what a repository requires. The Apple development Skill executes Apple-platform validation when a concrete task requires it.

`project-governance-bootstrap` owns policy derivation. It may discover that an Apple repository needs signed-app evidence, UI validation, or a performance recording, but it does not carry the operational instructions for every Xcode tool.

`apple-dev-loop` owns execution. It knows how to move from source inspection through SwiftPM, `xcodebuild`, `.xcresult`, Xcode MCP, XCUI, a signed app, Computer Use, Instruments, and CI. It does not decide the product's architecture or invent its risk policy.

Neither Skill loads the other. Neither requires the other to be installed.

This is the same boundary rule I use in application architecture: things that are often used together do not automatically belong to the same owner.

Keeping them independent has practical benefits. The governance Skill remains useful for Rust, TypeScript, or documentation repositories. The Apple development Skill remains useful in a Swift project that already has excellent governance and only needs a concrete validation loop. When both apply, the repository contract says what must be proved, and the Apple loop chooses the appropriate mechanism.

Composition is more useful than comprehensiveness.

## Trigger boundaries are part of correctness

A normal function is dangerous when it returns the wrong result. A Skill can be dangerous before it runs, simply by activating for the wrong task.

If `apple-dev-loop` triggered for every question containing the word "Swift," a source-only explanation would suddenly acquire Xcode preflight, scheme discovery, and build requirements. The workflow would be technically rigorous and practically unbearable.

So its description includes both the positive and negative boundary. It applies when a Swift, SwiftUI, AppKit, UIKit, Xcode, device, signing, UI, or performance task needs an end-to-end evidence loop. It does not apply to a source-only explanation or a narrow package edit that needs no Apple toolchain or runtime validation.

The governance Skill has the same constraint. It applies when starting, auditing, or upgrading repository governance. It should not appear merely because a repository happens to contain an `AGENTS.md`.

This changed how I think about prompts. In a conversation, extra guidance often feels harmless. In a reusable Skill, unwanted guidance is behavior. It consumes context, changes tool choices, creates process, and can cause an agent to perform work the user never requested.

A Skill needs an interface, and its trigger description is part of that interface.

## Progressive disclosure is dependency management for context

The first version of a reusable workflow naturally wants to contain everything.

That would have produced two enormous `SKILL.md` files: one carrying every risk category, template, agent role, and Apple-platform exception; the other carrying every Xcode, XCTest, signing, simulator, UI, and Instruments recipe.

Instead, each Skill has a short operating core and loads references only when the task requires them.

The governance Skill always knows how to inspect a repository and choose a profile. It reads the general governance model before defining risk zones. It reads the Apple profile only for an Apple-platform repository. It reads agent-routing guidance only if generating independent roles would have recurring value.

The Apple Skill always knows the evidence ladder and tool order. It reads Xcode MCP instructions only before configuring or using that bridge. It reads validation recipes only for the layer the task actually needs.

This is usually called progressive disclosure. I find it more useful to think of it as dependency management for context.

Context has a cost. It competes for attention. It can bias decisions toward whichever mechanisms are described most vividly. Loading Instruments guidance into a simple package-test task does not merely waste tokens; it makes a higher-cost validation route feel more available and therefore more likely.

The best context is not all potentially relevant knowledge. It is the smallest dependency set needed for the current decision.

## The evidence ladder became executable

The conceptual center of `apple-dev-loop` is an evidence ladder:

1. static contracts and source inspection;
2. SwiftPM, unit, and integration tests;
3. `xcodebuild` with a structured `.xcresult`;
4. Xcode-aware diagnostics and actions;
5. deterministic XCUI smoke tests;
6. a signed app and real UI interaction;
7. targeted `xctrace` or Instruments recording;
8. CI or device matrices and independent review.

The instruction is not to climb as high as possible.

It is to stop at the lowest level that proves the claim.

This preserves two properties that AI workflows easily lose: reproducibility and proportionality. A screenshot cannot replace a unit test. A successful unsigned build cannot prove Keychain access. A signed launch cannot prove a memory-lifetime claim. A 30-minute trace on one machine cannot prove an entire supported-device matrix.

Each layer answers a different question.

The Skill adds small scripts around this model. A preflight records the repository, project or workspace, scheme, selected Xcode, developer directory, and relevant capabilities before expensive work begins. An `.xcresult` summarizer reads structured test output instead of asking the model to infer truth from thousands of lines of console text.

The scripts do not automate every possible Apple workflow. That would recreate Xcode badly in shell. They automate the parts where stable, bounded facts prevent expensive ambiguity.

Everything else remains routed to the tool that owns it:

- repository search and CLI for reproducible source, build, and test facts;
- Xcode MCP for live project semantics;
- XCUI for stable user paths;
- Computer Use for real visual or permission-bound state with no better interface;
- `xctrace` for a specific performance question;
- the user for passwords, Keychain unlocks, unexpected permissions, and irreversible authorization.

The workflow became code without pretending every judgment could become automation.

## Skills need safety boundaries too

Once a workflow can act, installation and environment behavior become part of its safety model.

The repository includes a linking script that makes each Skill discoverable through one canonical editable copy. It creates symbolic links rather than duplicating directories. If the destination already contains the exact correct link, it leaves it alone. If it contains a different link or a real directory, it refuses to replace it.

That refusal is a small but important design choice.

An "install" helper that silently replaces an existing Skill would turn convenience into data loss. A script that changes global `xcode-select` to make one build pass would repair the current task by mutating every other Xcode workflow on the machine. A tool that accepts permanent external-agent permissions without explicit approval would convert temporary access into ambient authority.

The Skills therefore prefer injected, local configuration over hidden global mutation. They stop on ambiguity. They distinguish a missing optional capability from a blocker. They require the user at the moment an action crosses an authorization boundary.

These are the same principles the workflow applies to product code:

- one canonical owner;
- explicit state changes;
- narrow authority;
- reversible operations;
- no success claim when a required path was skipped.

A reusable engineering workflow should obey the governance it recommends.

## Writing the Skill exposed holes in my own reasoning

The most valuable result was not the reusable files. It was the pressure of formalization.

Inside one project, "use independent review for important work" felt clear. In a Skill, it immediately raised questions:

- What counts as important?
- Does every multi-file change need a reviewer?
- What information can the reviewer receive without inheriting the implementer's bias?
- What happens when reviewers disagree?
- When is another review useful, and when is it process inflation?

The extracted version became narrower. Green work does not mechanically receive a review ceremony. Yellow work receives an independent read-only review when the change is not mechanically obvious. Red work adds review for failure, cancellation, ownership, security, cleanup, and rollback—but it also gets a complexity budget so rigor cannot expand without limit.

The same happened with evidence. "Run the full validation suite" became "run the highest applicable deterministic mode once when it already includes the lower modes." "Test on a real device" became "use a real environment only for the claim that deterministic layers cannot prove." "Use Xcode MCP" became "first verify the intended Xcode process, window, workspace, scheme, and current tool schema."

Turning prose into an operational interface forces vague wisdom to acquire stopping conditions.

That is why I call this turning a workflow into code. The result is mostly Markdown and shell, but it behaves like software. It has inputs, trigger conditions, dependencies, side effects, failure modes, and claims it is allowed to make.

## The code that guides code needs tests

The Skills repository has its own validator.

It checks metadata, internal links, unresolved placeholders, shell syntax, and whitespace. It can optionally invoke the official Skill validator. Installation uses a separate script with explicit conflict behavior. The repository's own `AGENTS.md` classifies changes to trigger semantics, templates, scripts, discovery links, and validation as meaningful engineering changes rather than "just documentation."

This is still only structural validation.

A Skill can have perfect frontmatter, valid links, clean shell syntax, and terrible judgment. It can trigger too broadly, generate disproportionate governance, miss an existing project rule, or recommend evidence that does not answer the task.

The real test is forward use from a fresh context.

For `project-governance-bootstrap`, that means giving it raw repositories of different shapes—a small reversible tool, a normal multi-module application, and a project with genuine security or lifecycle risk—and checking whether it produces different, proportional contracts without leaking BiliKit-specific policy.

For `apple-dev-loop`, it means giving it concrete Apple tasks at different evidence levels and checking whether it stops correctly: package tests for a package claim, `xcodebuild` for a project claim, signed execution for a Keychain claim, and Instruments only for a real performance question.

The Skills are not mature merely because they have been extracted. At the time of writing, the repository is new and the abstraction has not yet accumulated cross-project evidence.

That limitation belongs in the design, not in fine print.

## What remained human

The extraction automated less than I initially expected.

It can inspect a repository, produce a bounded inventory, route to references, validate files, choose an evidence layer, preflight an Apple environment, and summarize structured results.

It cannot decide the product I should build. It cannot authorize a risky experiment on my behalf. It cannot turn a guessed threshold into a requirement. It cannot know that a technically complete feature is strategically unnecessary. It cannot decide whether another mechanism is useful rigor or fear disguised as engineering.

The earlier article ended with the human as the owner of scope, risk, and truth. The Skills preserve that boundary.

They do not encode the answers. They make the questions harder to skip.

That may be the most useful kind of AI tooling I can build right now. Not a system that tries to replace judgment, but one that carries the tedious structure around judgment: reading the right sources, distinguishing plans from evidence, making authorization visible, selecting the smallest sufficient tool, and refusing to call an unproven claim complete.

## From a private habit to a testable interface

BiliKit forced me to stop treating an AI conversation as the place where engineering truth lived.

The Skills project is the next step. It stops treating my personal memory as the place where the workflow lives.

The progression now looks like this:

```text
personal habit
    ↓
project-specific rules
    ↓
reusable decision procedure
    ↓
independently triggered Skills
    ↓
forward tests against new projects
```

Each step removes a different kind of hidden state.

The project-specific rules made BiliKit recoverable across conversations. The Skills make the method recoverable across repositories. Forward testing will determine whether the abstraction is real or whether I have merely built an elegant description of one project.

That is where the work stands now.

I turned my AI workflow into code. The code validates. The boundaries are explicit. The two Skills compose without depending on each other.

Now they have to survive contact with projects that did not teach me how to write them.
