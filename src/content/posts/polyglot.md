---
title: "One Architecture, Many Languages"
published: 2026-05-30
description: "A practical reference for applying the same four-layer architecture to Node, Java, Swift, Rust, Go, and Ruby."
tags: [macos, mise, node, swift, rust, go]
category: Engineering
series: "sovereign-tools"
seriesOrder: 6
draft: false
lang: en
translationKey: polyglot
---

When I start a project in an unfamiliar ecosystem, I want a short answer to four questions: who installs the runtime, who manages packages, which lockfile goes into git, and which generated files stay out. This article collects those answers for Node, Java, Swift, Rust, Go, and Ruby. It is a reference to revisit one section at a time.

The answers use the four layers introduced in the [first article of this series](/posts/manifesto/):

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

For **Layer 1 — Runtime version**, I follow the rule from the [sovereignty article](/posts/sovereignty/): use the language's strong official tool when it has one; otherwise, let `mise` do the job. The sections below focus on the resulting setup and the places where it usually goes wrong.

## Node.js / TypeScript

`mise` owns the Node version because Node has no sovereign version manager. I use `pnpm` for packages, but enable it through `corepack` rather than adding a separate `brew install`. This lets the `packageManager` field in `package.json` pin the `pnpm` version for the project.

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

Avoid both `brew install node` and `brew install pnpm`. The first makes Homebrew the owner of Layer 1; the second bypasses the project's package-manager pin. Node does not need a separate virtual environment: `node_modules` is already local to the project, providing the isolation for which Python uses `.venv`.

For Node-based command-line tools, I normally use `pnpm dlx` when I only need to run something once. If a tool must be installed, I keep a deliberate `PNPM_HOME` on `PATH` instead of accumulating an uncontrolled set of `npm install -g` packages.

Commit `pnpm-lock.yaml`, and ignore:

```text
node_modules/
*.tsbuildinfo
.turbo/
dist/
```

## Java

Java has no single sovereign version tool, and the JDK itself comes in several distributions. I let `mise` install Temurin, a neutral and well-maintained default:

```toml
# mise.toml
[tools]
java = "temurin-21"
```

Check that `mise` is setting `JAVA_HOME`, not merely putting `java` on `PATH`. Many Java tools read `JAVA_HOME` directly, so an old value can silently override the JDK you meant to use. `mise where java` and `echo $JAVA_HOME` should point to the same installation:

```bash
mise where java
echo $JAVA_HOME
```

For the build tool, use the wrapper committed by the project—`./gradlew` or `./mvnw`—rather than a global Gradle or Maven. The wrapper pins the build-tool version in the repository, applying the same Layer 3 discipline beyond ordinary dependencies.

Android is a separate case. Android Studio brings its own JDK and SDK, so I let it own that environment just as Xcode owns Swift.

Gradle and Maven declare dependencies in their build files. Commit those files and the wrapper, then ignore the build output:

```text
.gradle/
build/
target/
```

## Swift / iOS

Xcode is Swift's sovereign tool on macOS. It covers **Layer 0 — System** and **Layer 1 — Runtime version** together: toolchain, SDK, and build system all arrive as one application. I install it from the Mac App Store, which is why the [apps article](/posts/apps/) routes Xcode through `mas`, and prefer Swift Package Manager for dependencies.

Do not `brew install swift` on macOS. It creates a second claimant for the toolchain while Xcode still wins in less obvious parts of the build. CocoaPods also adds a Ruby dependency that most new projects no longer need; when SPM supports the packages involved, it keeps dependency management inside the Apple toolchain.

One of my projects has a boundary that has worked particularly well: KotobaLab is written in Swift, while its companion DictionaryBuilder is written in Python. They do not share a runtime, package manager, or build system. DictionaryBuilder writes a SQLite file and KotobaLab reads it. That neutral data interface lets both toolchains remain independent instead of making either ecosystem reach inside the other.

Commit `Package.resolved`, SPM's lockfile. Ignore the per-user and build artifacts:

```text
xcuserdata/
DerivedData/
.build/
*.xcuserstate
```

## Rust

Rust has the cleanest ownership model in this group. `rustup` owns Layer 1, while `cargo`, shipped with it, handles Layer 2 as well as building, testing, dependency management, and publishing.

```bash
# rustup installs the toolchain; cargo comes with it
rustup default stable
```

If a polyglot repository already has a `mise.toml`, it can instead contain `rust = "1.78"` and let `mise` proxy to `rustup`. This is the **mise as proxy** arrangement described in the [sovereignty article](/posts/sovereignty/). Both setups work; do not use both to manage the same project's Rust version.

Cargo already keeps dependencies per project, so Rust has no need for a virtual environment. For global command-line tools written in Rust, such as `ripgrep`, `fd`, and `bat`, I prefer the `brew` formula. It provides a prebuilt binary, whereas `cargo install` compiles the tool from source. I reserve `cargo install` for tools that have not been packaged yet.

Commit `Cargo.lock` for applications and binaries. The long-standing convention for libraries is to omit it so downstream users resolve their own versions. Ignore:

```text
/target/
```

## Go

Go's official `dl` installer is not a strong version manager, so I am comfortable letting `mise` own the Go version:

```toml
# mise.toml
[tools]
go = "1.23"
```

Modern Go uses modules, so projects no longer need the old `GOPATH` workspace layout and can live anywhere on disk. I do set `GOBIN`, however, so `go install` writes executables to a directory I control and already have on `PATH`. I use `~/.local/bin`, the same location as personal scripts in the [Python article](/posts/python/):

```zsh
# 00-env.zsh
export GOBIN="$HOME/.local/bin"
```

Commit both `go.mod`, which declares dependencies, and `go.sum`, which pins their checksums. Go leaves few incidental files in a repository; ignore compiled binaries by name or put them in an ignored output directory.

## Ruby

Ruby has no sovereign version tool, so `mise` can own Layer 1. I only install it when a project actually requires Ruby.

Never use the system Ruby included with macOS for project dependencies. It is old, Apple discourages modifying it, and `sudo gem install` against it is a reliable way to damage the system environment.

```toml
# mise.toml — only when a project genuinely needs it
[tools]
ruby = "3.3"
```

CocoaPods is still a common reason for macOS developers to install Ruby, but SPM has removed that requirement from many Swift projects. If SPM covers the project, Ruby can stay uninstalled. This follows the on-demand approach from the [maintenance article](/posts/maintenance/): the presence of an old system Ruby does not require adding a `mise`-managed Ruby to a machine with no Ruby projects.

When Ruby is necessary, commit `Gemfile.lock`. If Bundler uses a local path such as `vendor/bundle/`, ignore that directory.

## What stays consistent across languages

A repository should declare its runtime rather than relying on a contributor's global default. Check in `mise.toml` or `.tool-versions`, and a fresh clone can provision the required versions with `mise install`. Global defaults are still useful for scratch work.

Lockfiles belong in git; derived artifacts do not. That means committing `pnpm-lock.yaml`, `Cargo.lock`, `go.sum`, `Package.resolved`, `uv.lock`, and `Gemfile.lock`, while keeping `node_modules`, `target/`, `DerivedData/`, `.venv`, and similar output in `.gitignore`.

One `mise.toml` can list `node`, `python`, and `go` together. A polyglot project does not need a separate runtime configuration for every language, and the whole toolset can be provisioned with one command. This unified interface remains useful even when `mise` delegates to a sovereign tool.

The same fact should not be declared twice, but superficially similar declarations may have different jobs. In Python, `requires-python` in `pyproject.toml` describes the range supported by the code. `mise.toml` selects the one version used on the current machine. Keeping both is not duplication; collapsing them would lose information. Actual duplication creates two sources of truth, which is the failure the [first article](/posts/manifesto/) set out to avoid.

There is also a hard limit to this model. C and C++ have no comparable owner for “the C version.” System compilers, SDKs, and multiple build systems blur the layers. I do not try to force these toolchains into the same shape. When C or C++ appears as a native extension or build dependency, I let the higher-level tool that introduced it handle the requirement.

The [final article in the series](/posts/maintenance/) covers what happens after this setup: keeping the environment usable without turning maintenance into another project.
