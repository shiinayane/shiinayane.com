---
title: "When to Let the Official Tool Win"
published: 2026-05-30
description: "Don't put every language under mise. One test decides who owns runtime versions: does the language ship a strong, official tool of its own?"
tags: [macos, mise, rust, sovereignty]
category: Engineering
series: "sovereign-tools"
seriesOrder: 5
draft: false
lang: en
translationKey: sovereignty
---

The [previous article](/posts/python/) made `mise` the single owner of Python versions and kept `uv` at the dependency layer. On the same machine, though, I let `rustup` own Rust even though `mise` can install Rust too.

The difference is not a special exception for Rust. Before assigning Layer 1—the runtime version—I ask one question: **does this language have a strong, official sovereign tool?**

## What counts as a sovereign tool

Here, a **sovereign tool** means an official version and toolchain manager that belongs to the language project itself. `rustup` for Rust and Xcode for Swift are the clearest examples. If one exists and is strong, I leave the layer to it. If the official option is absent or too limited, `mise` fills the gap.

“Official” alone is not enough. I look for four things:

1. **It is part of the language project.** It comes from the people shipping the compiler, rather than a third party trying to catch up with it.
2. **It owns more than a version switch.** That can include toolchain components, stable/beta/nightly channels, cross-compilation targets, and project pins recognized across the ecosystem. Merely selecting the active version is already something `mise` handles well.
3. **The community has converged on it.** “How do I install this language?” should have one routine, near-universal answer. Three competing answers mean there is no sovereign tool yet.
4. **Its contract is stable across upgrades.** Giving a tool this layer for years only works if routine upgrades do not break existing projects.

`rustup` clears all four: it is part of Rust, manages toolchains, targets, and release channels, is the standard installation path, and has kept a stable contract for years. Go's official `dl` installer is a useful counterexample. It fetches a particular Go version, but does little beyond that and has not become the accepted owner of version management. It is official, but it does not clear criteria 2 and 3, so I still treat it as weak.

<figure class="my-6">
<svg viewBox="0 0 600 300" role="img" aria-labelledby="diagram-sov-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-sov-title">Decision tree: does the language have a strong sovereign tool?</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- root -->
    <rect x="140" y="20" width="320" height="58" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="300" y="45" font-size="13.5" font-weight="600" text-anchor="middle" fill="currentColor">Strong, official sovereign tool?</text>
    <text x="300" y="65" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.55">part of the language · owns toolchain · consensus · stable</text>
    <!-- branch labels -->
    <text x="150" y="108" font-size="12" font-weight="700" text-anchor="middle" fill="var(--primary)">Yes</text>
    <text x="450" y="108" font-size="12" font-weight="700" text-anchor="middle" fill="var(--primary)">No / weak</text>
    <!-- connectors -->
    <path d="M260 78 L150 120" stroke="currentColor" stroke-opacity="0.3" fill="none"/>
    <path d="M340 78 L450 120" stroke="currentColor" stroke-opacity="0.3" fill="none"/>
    <!-- leaf left -->
    <rect x="30" y="125" width="240" height="150" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="150" y="152" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">Defer to the sovereign tool</text>
    <text x="150" y="176" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">it owns Layer 1</text>
    <text x="150" y="210" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">rustup  →  Rust</text>
    <text x="150" y="232" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Xcode  →  Swift</text>
    <!-- leaf right -->
    <rect x="330" y="125" width="240" height="150" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="450" y="152" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">mise fills the gap</text>
    <text x="450" y="176" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">mise owns Layer 1</text>
    <text x="450" y="208" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Python · Node · Java</text>
    <text x="450" y="230" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Ruby · Go (weak)</text>
  </g>
</svg>
</figure>

## Applying it to the languages I use

These judgments are all about Layer 1: the runtime version.

- **Python:** no sovereign tool. `pyenv`, `mise`, `uv`, the system Python, and other approaches coexist. I therefore let `mise` own Layer 1 and keep `uv` at Layer 2, as described in the [Python article](/posts/python/).
- **Rust:** `rustup` is the sovereign tool. It installs Rust on my machine; `mise` does not.
- **Node.js:** `nvm`, `fnm`, `volta`, and `mise` compete, with no official answer. I use `mise`.
- **Java:** there is no sovereign tool, and Java also comes in multiple distributions. I use `mise` with Temurin as the default, a neutral choice that avoids reopening the distribution question for every project.
- **Swift / iOS:** Xcode owns the toolchain, SDK, and build system and is shipped by Apple. On macOS, installing Swift through another manager means working against the platform, so I defer completely.
- **Go:** the official option is too weak to own the layer. I am comfortable putting Go under `mise`, as many other users do.
- **Ruby:** `rbenv`, `rvm`, `chruby`, and `mise` all exist; none is sovereign. When I need Ruby, `mise` owns its version.

## `mise` can be a proxy

Deferring to `rustup` does not necessarily mean typing `rustup` for every operation. A project can still declare Rust in `mise.toml`:

```toml
# mise.toml
[tools]
rust = "1.78"
```

`mise` delegates to `rustup`; it does not reimplement Rust toolchain management. I think of this as **`mise` as proxy**: it provides the shared interface while `rustup` remains the owner and source of truth.

That leaves two sensible arrangements:

- **`rustup`-native:** a Rust-only project talks to `rustup` directly. There is no polyglot setup to unify.
- **`mise` as the project interface:** a polyglot project already pinning Python and Node in `mise.toml` can add `rust = "1.78"`. Then `mise install` provisions the project through one declaration while delegating Rust to `rustup`.

The trap is mixing these arrangements inside one project until neither file is authoritative. The interface may be `mise` or `rustup`, but ownership of the Rust toolchain must remain with `rustup`.

## The answers can change

I used the same test when looking at Zig. At the time, it did not have a strong official manager with community consensus, so `mise` or a simple manual installation was reasonable. Mojo falls into the same young-ecosystem category. Haskell is a useful edge case: GHCup is strong enough that deferring to it makes sense. Lua has no consensus tool, so `mise` fills the gap.

These are current judgments, not permanent assignments. If Python eventually ships a strong official manager and the community converges on it, I would move Python out of `mise` and defer to that tool just as I defer to `rustup` today.

The [first article](/posts/manifesto/) said that each kind of resource should have one owner. This test decides who that owner is for runtime versions. The [next article](/posts/polyglot/) turns the resulting choices into a concrete stack, including the pitfalls, lockfiles, and `gitignore` patterns for each language.
