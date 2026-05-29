---
title: "Clean Isn't Minimal: A Manifesto for the Layered Mac"
published: 2026-05-30
description: "Clean means single-source-of-truth layering, not installing the fewest tools."
tags: [macos, mise, dotfiles, devenv]
category: Engineering
series: "sovereign-tools"
seriesOrder: 1
draft: false
---

A few weeks ago I put a Mac mini into DFU mode (Device Firmware Update — the state where the machine has no operating system of its own and waits for another Mac to write one onto it) and erased everything. I had told myself I was doing it to fix a stubborn problem. The honest version is that I wanted a clean machine, and the only way I trusted to get one was to start from nothing.

What I expected was a tedious afternoon of reinstalling. What I got instead was a question I had been avoiding for years: when I say I want my development environment to be *clean*, what do I actually mean?

The reflexive answer is "fewer tools." Install less, depend on less, keep the Applications folder short. I held that belief for a long time, and it never survived contact with real work. Six months after any minimal setup, I would find a `~/.zshrc` I no longer understood, three different Python interpreters I did not remember choosing, and a `pip install` from 2023 sitting in a directory it had no business being in. The machine was not cluttered because I had installed too much. It was cluttered because nothing had a clear owner.

So this series starts from a different definition. Clean is not minimal. Clean is *layered*, where each layer has a single owner and none of them reach into each other's territory. This first article is the manifesto: the model, the one principle that holds it together, and the test I use to know whether I have actually achieved it. The six articles after it work the model out in practice.

## How an environment rots

It is worth being specific about the failure mode, because it is rarely a single bad decision. It is a sequence of individually reasonable ones.

You run `brew install python` because you need Python and Homebrew is right there. Later a project needs a different version, so you add `pyenv`. A Node project shows up, so you add `nvm`. Then Ruby, so `rbenv`. Each of these tools wants to edit your shell startup file, and each installer appends a few lines to `~/.zshrc` without telling you in any way you would notice. A `pip install --user` drops packages into a location that shadows another tool's expectations. None of it is wrong on its own. Together it is a machine where, if someone asked you "which Python runs when you type `python`, and why," you would have to investigate your own computer to find out.

That investigation is the symptom. A clean environment is one where you already know the answer, because the answer is structural rather than accidental.

## The model: four layers

Here is the structure I rebuilt the Mac mini around. It is four layers, stacked from the system upward, and the entire series leans on it.

<figure class="my-6">
<svg viewBox="0 0 600 330" role="img" aria-labelledby="diagram-layers-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-layers-title">The four-layer stack: System, Runtime version, Package manager, Project dependencies</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- Layer 3 -->
    <rect x="10" y="10" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="30" y="38" font-size="13" font-weight="700" fill="var(--primary)">Layer 3</text>
    <text x="30" y="58" font-size="15" font-weight="600" fill="currentColor">Project dependencies</text>
    <text x="570" y="44" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">pyproject.toml + uv.lock, package.json + pnpm-lock.yaml</text>
    <!-- Layer 2 -->
    <rect x="10" y="86" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="30" y="114" font-size="13" font-weight="700" fill="var(--primary)">Layer 2</text>
    <text x="30" y="134" font-size="15" font-weight="600" fill="currentColor">Package manager</text>
    <text x="570" y="120" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">uv, pnpm, cargo</text>
    <!-- Layer 1 -->
    <rect x="10" y="162" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="30" y="190" font-size="13" font-weight="700" fill="var(--primary)">Layer 1</text>
    <text x="30" y="210" font-size="15" font-weight="600" fill="currentColor">Runtime version</text>
    <text x="570" y="196" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">mise (or a language's sovereign tool)</text>
    <!-- Layer 0 -->
    <rect x="10" y="238" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="30" y="266" font-size="13" font-weight="700" fill="var(--primary)">Layer 0</text>
    <text x="30" y="286" font-size="15" font-weight="600" fill="currentColor">System</text>
    <text x="570" y="272" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">Homebrew + Xcode Command Line Tools</text>
  </g>
</svg>
</figure>

**Layer 0 — System** is Homebrew plus the Xcode Command Line Tools. It installs command-line tools and graphical applications. It does not install language runtimes. That last sentence is the discipline: the moment Homebrew owns your Python, Layer 0 has reached into Layer 1, and the rot begins.

**Layer 1 — Runtime version** is the chosen interpreter or compiler version: Python 3.14, Node 22, and so on. On my machine this layer is owned by `mise`, a version manager that switches which runtime is active based on the project you are standing in. The exception, which I will come back to, is languages that ship their own strong version manager.

**Layer 2 — Package manager** is the tool that installs libraries into a project: `uv` for Python, `pnpm` for Node, `cargo` for Rust. It works *within* a runtime version; it does not choose the version.

**Layer 3 — Project dependencies** is the declarative files plus lock files that pin a project's libraries: `pyproject.toml` with `uv.lock`, `package.json` with `pnpm-lock.yaml`. This is the layer that travels with the repository and that another machine must be able to reproduce exactly.

The layers are drawn as a stack because that is how dependence runs. Layer 3 assumes a package manager; the package manager assumes a runtime version; the runtime sits on the system. Reading downward, each layer trusts the one beneath it to stay in its lane.

## The principle that holds it together

The model is only worth anything because of a single rule, and the rule is what I mean by **single source of truth**: each *kind* of resource has exactly one tool responsible for it.

One tool owns runtime versions. One tool owns a project's libraries. One tool installs system applications. When a question comes up — "where did this Python come from," "what pins this dependency," "why is this app on my machine" — there is exactly one place the answer can live, because exactly one tool was allowed to create the situation.

This is why "fewer tools" is the wrong target. A machine with two tools that both think they own Python is dirtier than a machine with five tools that each own one thing cleanly. The number is not the problem. Overlapping ownership is the problem. The whole rest of this series is, in one way or another, the work of deciding *who owns what* and then refusing to let anyone else touch it.

## Sometimes the owner isn't the obvious one

There is a wrinkle I want to plant now and resolve later. I said Layer 1 is owned by `mise`. That is true for most languages, but not all of them. Some languages ship their own strong, official version and toolchain manager — `rustup` for Rust, Xcode for Swift — that is part of the language project itself. When such a tool exists and is good, the right owner of Layer 1 is that tool, not `mise`.

I will not argue the full case here; that is the fifth article. For now it is enough to notice that "single source of truth" does not name a specific tool. It names a property. The owner of a layer is whichever tool can hold it without contradiction, and sometimes that is the language's own.

## Clean means recoverable

This brings me back to the Mac mini and to what "clean" finally came to mean for me.

It is not minimalism, and it is not aesthetics. A clean environment is a *predictable and recoverable* one. Predictable because every resource has a known owner, so the machine holds no mysteries. Recoverable because the declared state — the lock files, the manifests, the dotfiles — is enough to rebuild the actual state from close to nothing.

The test I now use is concrete. Could I delete all of my caches and build artifacts — `rm -rf` the lot — and rebuild any project on the machine with one command? If yes, then the cache was genuinely disposable, which means it was never load-bearing state pretending to be a tool. If no, then something I thought was derived was actually a source of truth in disguise, and I have a layering bug to fix.

That test does not care how many tools I have installed. It cares whether the truth lives in the right places. That is the difference between a machine that is tidy today and one that is still clean after a year of real use.

A caveat before the rest of the series, and it applies to all of it. This is one person's setup on macOS, optimized for a single user who controls the whole machine. Teams, shared servers, locked-down corporate laptops, and other operating systems change the trade-offs, sometimes a lot. I am describing principles I would defend, not laws I would impose. The specific tools will also change — `mise` and `uv` are recent, and something will replace them — but the layering and the single-source rule are what I expect to outlast them.

## What the next six articles cover

The rest of the series works the model out in practice. Each piece stands on its own; you can read whichever one matches the problem in front of you.

- **Dotfiles without `.zshrc`** — using `ZDOTDIR` and `chezmoi` to make shell configuration declarative and drift visible, so the home directory stops being a config dump.
- **The Brewfile compromise** — why the system layer is fine with eventual consistency, and how a reconcile step keeps it honest without pretending it is strict.
- **Python, mise, and uv** — the conflict where `uv` quietly installs its own Python behind `mise`'s back, and the one setting that resolves it.
- **When to let the official tool win** — the test for whether a language's own version manager should own Layer 1 instead of `mise`.
- **One architecture, many languages** — the same four layers made concrete for Node, Java, Swift, Rust, Go, and Ruby.
- **Configuration is easy; maintenance is the work** — health checks, the discipline of subtraction, and why keeping an environment clean matters more than making one.

The full list, with status and links, lives on the [series index](/series/sovereign-tools). I would start wherever your own machine is currently lying to you about who owns what.
