---
title: "I Rebuilt My Mac Around Four Layers"
published: 2026-05-30
description: "A DFU restore forced me to decide which tool owns each part of my development environment—and how I would rebuild it."
tags: [macos, mise, dotfiles, devenv]
category: Engineering
series: "sovereign-tools"
seriesOrder: 1
draft: false
lang: en
translationKey: manifesto
---

A few weeks ago, I put a Mac mini into DFU mode (Device Firmware Update—the state where the machine has no operating system of its own and waits for another Mac to write one onto it) and erased everything.

There was a stubborn problem I wanted to fix, but I also wanted the machine to feel clean again. I expected a tedious afternoon of reinstalling software. Instead, the reset forced me to work out what “clean” was supposed to mean.

For a long time I treated it as a matter of installing fewer tools. That never lasted. Six months after setting up a supposedly minimal machine, I would have a `~/.zshrc` I no longer understood, three Python interpreters I did not remember choosing, and a `pip install` from 2023 living somewhere it should not have been. The real problem was not the number of tools. I could no longer tell which one owned what.

This is the first of seven articles about the setup I rebuilt after that reset. The rest of the series goes into individual tools; this one records the four-layer model they fit into.

## Reasonable installs add up

The mess usually starts with decisions that make sense on their own.

I need Python, so I run `brew install python`. A later project needs another version, so I add `pyenv`. Then a Node project brings in `nvm`, and Ruby brings in `rbenv`. Each installer adds a few lines to `~/.zshrc`, often too quietly for me to notice. A `pip install --user` puts packages in a location that shadows what another tool expects.

None of those choices is obviously broken. The problem appears later, when I have to investigate my own computer to answer a basic question: when I type `python`, which Python runs, and why?

I wanted the answer to come from the structure of the setup, not from whatever happened to win the current `PATH`.

## The four layers

I rebuilt the Mac mini around four layers, starting with the system and ending with the dependencies stored in each repository.

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

**Layer 0 — System.** Homebrew and the Xcode Command Line Tools install command-line tools and graphical applications. They do not install language runtimes. If Homebrew owns Python, the system layer has crossed into the next layer.

**Layer 1 — Runtime version.** This is the selected interpreter or compiler version: Python 3.14, Node 22, and so on. I usually let `mise` own this layer. It activates a runtime according to the project directory I am in.

**Layer 2 — Package manager.** `uv` installs Python packages, `pnpm` installs Node packages, and `cargo` installs Rust packages. These tools work inside a selected runtime; they do not decide which runtime version is active.

**Layer 3 — Project dependencies.** The manifest and lock files belong to the repository: `pyproject.toml` and `uv.lock`, or `package.json` and `pnpm-lock.yaml`. Another machine should be able to use these files to reproduce the same dependency set.

The direction of dependency matters. Project dependencies rely on a package manager; the package manager relies on a runtime; the runtime sits on the system. A tool can serve its own layer without quietly taking over the layer above or below it.

## One owner for each kind of resource

The practical rule is simple: each kind of resource gets one owner.

Runtime versions have one owner. A project's libraries have one owner. System applications have one owner. If I ask where a Python came from, what pins a dependency, or why an application is installed, there should be one place to look.

This is also why counting tools did not help me. Two tools competing to manage Python create more confusion than five tools with separate jobs. What matters is whether their ownership overlaps.

The owner is not always `mise`. Rust has `rustup`, and Swift has Xcode. Both are strong, official toolchain managers maintained as part of their language ecosystems. When an official tool is good enough to own the runtime and toolchain, I let it do so instead of putting `mise` in front of it. The fifth article in this series explains the test I use for that choice.

“Single source of truth” therefore describes the ownership, not a favorite product. The tools can change without changing the model.

## The recovery test

After the reset, recoverability became the useful test.

I should be able to delete caches and build artifacts—`rm -rf` the lot—and rebuild any project on the machine with one command. If that works, the caches really are disposable. If it does not, then something I called “derived” is carrying state that was never declared. I treat that as a layering problem and find the missing source of truth.

The declared state lives in manifests, lock files, and dotfiles. Together they should be enough to recreate the working state from close to nothing. This makes the setup predictable as well: I know which tool to inspect before I start debugging `PATH`.

There are limits to this setup. It is for one person on macOS who controls the whole machine. A team, a shared server, a locked-down corporate laptop, or another operating system can change the trade-offs substantially. `mise` and `uv` are also recent tools, and something else may replace them. Those constraints do not make the setup universal; they explain the environment in which I use it.

## The next six articles

The remaining articles take one part of the setup at a time:

- **Dotfiles without `.zshrc`** covers `ZDOTDIR` and `chezmoi`, making shell configuration declarative, exposing drift, and keeping the home directory from becoming a configuration dump.
- **The Brewfile compromise** explains why eventual consistency is acceptable at the system layer and how a reconcile step keeps it honest without pretending it is strict.
- **Python, mise, and uv** deals with `uv` quietly installing its own Python behind `mise` and the single setting that stops the conflict.
- **When to let the official tool win** gives the test for choosing a language's own version manager instead of `mise` at Layer 1.
- **One architecture, many languages** applies the same four layers to Node, Java, Swift, Rust, Go, and Ruby.
- **Configuration is easy; maintenance is the work** covers health checks, subtraction, and the ongoing work required to keep the environment understandable.

The [series index](/series/sovereign-tools/) has the complete reading order and current status.
