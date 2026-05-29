---
title: "One Architecture, Many Languages"
published: 2026-05-30
description: "The same four-layer architecture made concrete for Node, Java, Swift, Rust, Go, and Ruby — recommended stack, pitfalls, lockfiles, and gitignore for each."
tags: [macos, mise, node, swift, rust, go]
category: Engineering
series: "sovereign-tools"
seriesOrder: 6
draft: false
---

This is the reference chapter. The earlier articles built an architecture and a principle; this one applies them, language by language, so that when you start a project in any of these ecosystems you have a known-good shape to reach for. It is meant to be returned to a section at a time, not read straight through.

Two things carry over and are not re-derived here. From the [manifesto](/posts/manifesto/), the four-layer model:

<figure class="my-6">
<svg viewBox="0 0 600 330" role="img" aria-labelledby="diagram-layers-title-6" style="width:100%;height:auto;color:inherit">
<title id="diagram-layers-title-6">The four-layer stack: System, Runtime version, Package manager, Project dependencies</title>
<g font-family="ui-sans-serif, system-ui, sans-serif">
<rect x="10" y="10" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="38" font-size="13" font-weight="700" fill="var(--primary)">Layer 3</text>
<text x="30" y="58" font-size="15" font-weight="600" fill="currentColor">Project dependencies</text>
<text x="570" y="44" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">lockfiles in git</text>
<rect x="10" y="86" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="114" font-size="13" font-weight="700" fill="var(--primary)">Layer 2</text>
<text x="30" y="134" font-size="15" font-weight="600" fill="currentColor">Package manager</text>
<text x="570" y="120" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">uv, pnpm, cargo</text>
<rect x="10" y="162" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="190" font-size="13" font-weight="700" fill="var(--primary)">Layer 1</text>
<text x="30" y="210" font-size="15" font-weight="600" fill="currentColor">Runtime version</text>
<text x="570" y="196" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">mise, or a sovereign tool</text>
<rect x="10" y="238" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
<text x="30" y="266" font-size="13" font-weight="700" fill="var(--primary)">Layer 0</text>
<text x="30" y="286" font-size="15" font-weight="600" fill="currentColor">System</text>
<text x="570" y="272" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">Homebrew + Xcode CLT</text>
</g>
</svg>
</figure>

And from the [sovereignty article](/posts/sovereignty/), the rule for who owns **Layer 1 — Runtime version**: if the language ships a strong, official sovereign tool, defer to it; otherwise `mise` fills the gap. Each section below states the verdict and moves on; if a verdict surprises you, that article has the reasoning.

## Node.js / TypeScript

**Recommended stack.** `mise` owns the Node version (no sovereign tool exists). For the package manager, `pnpm` — but obtained through `corepack` rather than a separate `brew install`, so the `pnpm` version is itself pinned per project:

```toml
# mise.toml
[tools]
node = "22"

[settings]
# let corepack manage the pnpm version from package.json's packageManager field
```

```bash
corepack enable      # ships with Node; activates pnpm/yarn shims
```

**Key pitfalls.** Do not `brew install node` — that hands Layer 1 to Homebrew and you are back to the rot the [manifesto](/posts/manifesto/) describes. Do not `brew install pnpm` either; let `corepack` pin it from the `packageManager` field in `package.json`, so every contributor gets the same `pnpm`. Node needs no virtual environment: `node_modules` is per-project by construction, so the isolation Python gets from a `.venv` is simply how Node already works. For global command-line tools written for Node, prefer `pnpm dlx` (run once, nothing installed) or a deliberate `PNPM_HOME` on `PATH` over a sprawl of `npm install -g`.

**Lockfile and gitignore.** Commit `pnpm-lock.yaml`. Ignore the rest:

```text
node_modules/
*.tsbuildinfo
.turbo/
dist/
```

## Java

**Recommended stack.** `mise` owns the JDK (no sovereign tool, and "Java" is many distributions). Default to Temurin, which is a neutral, well-maintained build:

```toml
# mise.toml
[tools]
java = "temurin-21"
```

**Key pitfalls.** Confirm `mise` is actually setting `JAVA_HOME` — many Java tools read it directly rather than finding `java` on `PATH`, and a stale `JAVA_HOME` from an old install will quietly win. `mise where java` and `echo $JAVA_HOME` should agree. For builds, prefer the project's wrapper — `./gradlew` or `./mvnw` — over a globally installed Gradle or Maven; the wrapper pins the build-tool version in the repo, which is the Layer-3 discipline applied to the build tool itself. Android development is its own sovereign world: Android Studio bundles its own JDK and SDK, and you let it, the same way you let Xcode own Swift.

**Lockfile and gitignore.** Gradle and Maven express dependencies declaratively in build files; commit those and the wrapper. Ignore build output:

```text
.gradle/
build/
target/
```

## Swift / iOS

**Recommended stack.** Xcode is the sovereign tool, and it spans **Layer 0 — System** and **Layer 1 — Runtime version** at once: it is the toolchain, the SDK, and the build system, installed from the Mac App Store (which is why the [apps article](/posts/apps/) routes it through `mas`). For dependencies, prefer Swift Package Manager over CocoaPods.

**Key pitfalls.** Never `brew install swift`. On macOS that fights Xcode for ownership of the toolchain, and Xcode wins in confusing ways. Reaching for CocoaPods drags in a Ruby dependency you mostly do not need anymore (more on that under Ruby). SPM keeps the whole thing inside the Apple toolchain.

There is a clean-boundary pattern worth calling out here. In one of my projects, KotobaLab (Swift) and its companion DictionaryBuilder (Python) do not share a runtime, a package manager, or a build system at all. They meet through a single SQLite file — a neutral interface. The Swift side reads a database; the Python side writes one. Neither language's tooling has to know the other exists. When two ecosystems must cooperate, a neutral data interface like this is far cleaner than trying to make one language's toolchain reach into the other's.

**Lockfile and gitignore.** Commit `Package.resolved` (SPM's lockfile). Ignore the per-user and build artifacts:

```text
xcuserdata/
DerivedData/
.build/
*.xcuserstate
```

## Rust

**Recommended stack.** `rustup` is the sovereign tool and owns Layer 1; `cargo` is Layer 2 and ships with it. This is the simplest ecosystem in the series because one tool covers building, testing, dependency management, and publishing:

```bash
# rustup installs the toolchain; cargo comes with it
rustup default stable
```

In a polyglot project that already has a `mise.toml`, you may instead write `rust = "1.78"` there and let `mise` proxy to `rustup` — the **mise as proxy** pattern from the [sovereignty article](/posts/sovereignty/). Either is fine; just don't manage one project's Rust through both.

**Key pitfalls.** There is no virtual-environment concept and you do not need one — Cargo handles per-project dependencies natively. For *global* command-line tools that happen to be written in Rust (`ripgrep`, `fd`, `bat`), prefer the `brew` formula over `cargo install`: Homebrew ships a prebuilt binary, while `cargo install` compiles from source, which is slower and pointless for a tool you just want to use. Save `cargo install` for tools not yet packaged.

**Lockfile and gitignore.** Commit `Cargo.lock` for applications (binaries); the long-standing convention is to omit it for libraries so downstream consumers resolve their own versions. Ignore the build directory:

```text
/target/
```

## Go

**Recommended stack.** Go's official `dl` installer is weak, so `mise` is comfortable owning Go's version, and most people are happy there:

```toml
# mise.toml
[tools]
go = "1.23"
```

**Key pitfalls.** Forget `GOPATH` exists — modern Go uses modules, and a project anywhere on disk works without the old workspace layout. Do set `GOBIN` so that `go install` puts binaries somewhere you control and have on `PATH`; I point it at `~/.local/bin`, the same directory the [Python article](/posts/python/) uses for personal scripts:

```zsh
# 00-env.zsh
export GOBIN="$HOME/.local/bin"
```

**Lockfile and gitignore.** `go.mod` declares dependencies and `go.sum` pins their checksums; commit both. Go projects produce few stray artifacts; ignore your built binaries by name or by an output directory.

## Ruby

**Recommended stack.** No sovereign tool, so `mise` fills the gap — but the more useful advice is to question whether you need Ruby at all. Never use the system Ruby that ships with macOS; it is old, Apple discourages touching it, and `sudo gem install` against it is a classic way to corrupt a machine. Reach for `mise` only when a project actually requires Ruby.

```toml
# mise.toml — only when a project genuinely needs it
[tools]
ruby = "3.3"
```

**Key pitfalls.** The most common reason developers install Ruby on macOS is CocoaPods, and as noted under Swift, SPM has largely removed that need. If you can use SPM, you can skip Ruby entirely. This connects to a habit the [maintenance article](/posts/maintenance/) makes central: install on demand, not preemptively. An old system Ruby is not a reason to rush a `mise`-managed Ruby onto a machine that has no Ruby projects on it.

**Lockfile and gitignore.** When you do use Ruby, commit `Gemfile.lock`. Ignore the local bundle path if you set one (e.g. `vendor/bundle/`).

## The cross-language rules

Underneath the per-language specifics, the same handful of rules hold everywhere, and they are worth stating as a checklist:

- **Project-level declaration beats global default.** A `mise.toml` (or `.tool-versions`) checked into the repo means the project carries its own runtime versions, so a fresh clone provisions correctly with `mise install`. A global default is a fallback for scratch work, not the thing projects should rely on.
- **Lockfiles belong in git; build artifacts do not.** `pnpm-lock.yaml`, `Cargo.lock`, `go.sum`, `Package.resolved`, `uv.lock`, `Gemfile.lock` — these are the reproducible truth of Layer 3 and must travel with the repo. `node_modules`, `target/`, `DerivedData/`, `.venv`, and friends are derived and belong in `.gitignore`.
- **One `mise.toml` can manage several languages.** A polyglot project does not need one config per language; a single `mise.toml` listing `node`, `python`, and `go` together provisions the whole thing with one command. This is the unified-interface convenience that makes `mise` worth using even alongside sovereign tools.
- **Do not double-declare the same fact across layers.** This one is subtle. In Python, `requires-python` in `pyproject.toml` expresses a *range* the code supports; `mise.toml` expresses the *one version* this machine will use. They are different statements and should not be collapsed. Declaring the same thing in two places means two sources of truth for one fact, which is the original sin the whole series is about.

A closing caveat, because the architecture is not universal. C and C++ have no clean version-management story of the kind this series assumes — there is no `mise`-shaped owner of "the C version", and system compilers, SDKs, and a tangle of build systems make the layering blurry. My default is to not try to impose it: I do not manage C/C++ toolchains directly, and when they show up as a dependency of something else (a native extension, a build requirement), I let the upper-layer tool that pulled them in deal with them. Knowing where the model stops is part of using it well.

That is the architecture made concrete. The [final article](/posts/maintenance/) turns from setup to upkeep — because, as it argues, configuring all of this is the easy part.
