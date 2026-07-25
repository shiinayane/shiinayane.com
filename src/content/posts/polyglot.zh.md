---
title: "一套架构，多种语言"
published: 2026-05-30
description: "把同一套四层架构实际用在 Node、Java、Swift、Rust、Go 与 Ruby 项目中。"
tags: [macos, mise, node, swift, rust, go]
category: Engineering
series: "sovereign-tools"
seriesOrder: 6
draft: false
lang: zh_CN
translationKey: polyglot
---

每次碰到不熟悉的语言生态，我最先想确认的其实只有几件事：运行时由谁安装、依赖交给谁管理、哪个锁文件要进 git，以及哪些生成物不该提交。这篇把 Node、Java、Swift、Rust、Go 和 Ruby 的答案集中在一起，适合需要时直接跳到对应章节查。

这里继续沿用[系列第一篇](/zh/posts/manifesto/)的四层划分：

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

对于 **Layer 1 — Runtime version**，判断方法来自[讨论工具主权的那篇文章](/zh/posts/sovereignty/)：如果语言有成熟的官方工具，就让官方工具负责；没有的话再交给 `mise`。下面不再重复论证，只写具体怎么配，以及最容易踩到哪里。

## Node.js / TypeScript

Node 没有自己的主权版本管理器，所以 Node 版本由 `mise` 管。包管理器我用 `pnpm`，但不会另做一次 `brew install`，而是通过 `corepack` 启用。这样项目可以用 `package.json` 的 `packageManager` 字段固定 `pnpm` 版本。

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

`brew install node` 和 `brew install pnpm` 都不要用。前者把 Layer 1 的所有权交给了 Homebrew，后者则绕开了项目对包管理器版本的固定。Node 也不需要另建虚拟环境：`node_modules` 本来就是项目级目录，Python 靠 `.venv` 获得的隔离，在 Node 里已经是默认行为。

偶尔运行一次用 Node 写的命令行工具时，我会用 `pnpm dlx`，不留下安装。如果确实要长期安装，就明确设置一个加入 `PATH` 的 `PNPM_HOME`，而不是让 `npm install -g` 越积越多。

提交 `pnpm-lock.yaml`，忽略：

```text
node_modules/
*.tsbuildinfo
.turbo/
dist/
```

## Java

Java 没有统一的主权版本工具，JDK 本身也有多个发行版。我让 `mise` 安装 Temurin，它是相对中立且维护良好的默认选择：

```toml
# mise.toml
[tools]
java = "temurin-21"
```

只确认 `PATH` 里的 `java` 还不够，还要检查 `mise` 是否正确设置了 `JAVA_HOME`。很多 Java 工具会直接读取它；旧安装残留的 `JAVA_HOME` 可能悄悄覆盖你原本想用的 JDK。`mise where java` 和 `echo $JAVA_HOME` 应该指向同一处：

```bash
mise where java
echo $JAVA_HOME
```

构建时优先使用仓库内的 wrapper，也就是 `./gradlew` 或 `./mvnw`，不要依赖全局安装的 Gradle 或 Maven。wrapper 会把构建工具版本固定在仓库里，相当于把 Layer 3 的做法延伸到了构建工具。

Android 要单独看待。Android Studio 自带 JDK 和 SDK，让它自己管理即可，就像 Swift 工具链交给 Xcode 一样。

Gradle 与 Maven 在构建文件里声明依赖；这些文件和 wrapper 都要提交。构建产物则忽略：

```text
.gradle/
build/
target/
```

## Swift / iOS

在 macOS 上，Xcode 就是 Swift 的主权工具，而且同时跨过了 **Layer 0 — System** 与 **Layer 1 — Runtime version**：工具链、SDK 和构建系统都装在同一个应用里。我从 Mac App Store 安装 Xcode，所以[应用管理那篇](/zh/posts/apps/)把它交给 `mas`；项目依赖则优先使用 Swift Package Manager。

不要在 macOS 上 `brew install swift`。这样会凭空多出另一个工具链所有者，但构建过程的其他部分仍然由 Xcode 决定，最后通常只会得到更隐蔽的冲突。CocoaPods 还会引入一套多数新项目已经不需要的 Ruby 依赖；只要相关包支持 SPM，就可以把依赖管理留在 Apple 工具链内部。

我自己的一个项目正好有一条很清楚的跨语言边界：KotobaLab 用 Swift，配套的 DictionaryBuilder 用 Python。两边不共享运行时、包管理器或构建系统，只通过一个 SQLite 文件连接——DictionaryBuilder 写数据库，KotobaLab 读数据库。使用中立的数据接口之后，两套工具链都不用了解对方内部怎么工作。

提交 SPM 的锁文件 `Package.resolved`，忽略用户级文件与构建产物：

```text
xcuserdata/
DerivedData/
.build/
*.xcuserstate
```

## Rust

这几种语言里，Rust 的所有权关系最简单。`rustup` 管 Layer 1，随它安装的 `cargo` 管 Layer 2，同时还负责构建、测试、依赖管理与发布。

```bash
# rustup installs the toolchain; cargo comes with it
rustup default stable
```

如果一个多语言仓库已经有 `mise.toml`，也可以在里面写 `rust = "1.78"`，让 `mise` 代理 `rustup`。这就是[工具主权一文](/zh/posts/sovereignty/)里的 **mise as proxy**。两种方法都可以，但同一个项目不要同时用两套方式管理 Rust 版本。

Cargo 原生按项目管理依赖，所以 Rust 不需要虚拟环境。至于 `ripgrep`、`fd`、`bat` 这类用 Rust 写成、但面向整台机器使用的命令行工具，我会优先安装 `brew` formula。Homebrew 提供预编译二进制；`cargo install` 则会从源码编译，花更多时间却没有实际收益。还没有被打包的工具再交给 `cargo install`。

应用和二进制项目要提交 `Cargo.lock`。库项目长期以来的惯例是不提交，让下游使用者自行解析版本。忽略：

```text
/target/
```

## Go

Go 官方的 `dl` 安装器算不上完整的版本管理器，因此把 Go 版本交给 `mise` 很合适：

```toml
# mise.toml
[tools]
go = "1.23"
```

现代 Go 使用 modules，项目可以放在磁盘上的任意位置，不再需要旧的 `GOPATH` 工作区布局。不过我仍会设置 `GOBIN`，让 `go install` 把可执行文件写进一个自己控制、也已经加入 `PATH` 的目录。我用的是 `~/.local/bin`，与 [Python 那篇](/zh/posts/python/)存放个人脚本的位置相同：

```zsh
# 00-env.zsh
export GOBIN="$HOME/.local/bin"
```

声明依赖的 `go.mod` 与固定校验和的 `go.sum` 都要提交。Go 项目很少产生零散文件；编译出的二进制可以按文件名忽略，也可以统一输出到被忽略的目录。

## Ruby

Ruby 没有主权版本工具，因此 Layer 1 可以交给 `mise`，但只有项目确实需要 Ruby 时我才会安装。

不要拿 macOS 自带的系统 Ruby 装项目依赖。它版本老旧，Apple 也不建议修改；对它执行 `sudo gem install`，很容易直接破坏系统环境。

```toml
# mise.toml — only when a project genuinely needs it
[tools]
ruby = "3.3"
```

CocoaPods 仍是 macOS 开发者安装 Ruby 的常见原因，不过很多 Swift 项目改用 SPM 后已经没有这项需求。SPM 能覆盖项目时，Ruby 完全可以不装。这也符合[维护篇](/zh/posts/maintenance/)所说的按需安装：系统 Ruby 很旧，并不代表一台没有 Ruby 项目的机器也该立刻添加一份由 `mise` 管理的 Ruby。

确实使用 Ruby 时，提交 `Gemfile.lock`。如果 Bundler 使用 `vendor/bundle/` 之类的本地路径，就忽略该目录。

## 跨语言时仍然不变的部分

项目应该自己声明运行时版本，而不是依赖某位开发者的全局默认值。把 `mise.toml` 或 `.tool-versions` 提交到仓库后，新 clone 可以直接用 `mise install` 配好所需版本；全局默认值留给临时实验即可。

锁文件进 git，派生产物不进。也就是说，`pnpm-lock.yaml`、`Cargo.lock`、`go.sum`、`Package.resolved`、`uv.lock` 和 `Gemfile.lock` 要提交，`node_modules`、`target/`、`DerivedData/`、`.venv` 等生成目录则放进 `.gitignore`。

一个 `mise.toml` 可以同时列出 `node`、`python` 和 `go`。多语言项目不需要为每种语言各放一份运行时配置，一条命令就能准备整套工具。即使部分语言最终委托给自己的主权工具，统一入口仍然有用。

同一个事实不该在不同层重复声明，不过看起来相似的配置不一定表达同一件事。Python 的 `pyproject.toml` 里，`requires-python` 表示代码支持的版本范围；`mise.toml` 则选择当前机器实际使用的那个版本。两者都保留并不重复，合并反而会丢失信息。真正重复的声明会制造两个事实来源，这正是[系列第一篇](/zh/posts/manifesto/)想避免的问题。

这套模型也有明确的边界。C 与 C++ 没有一个能负责“C 语言版本”的同类工具，系统编译器、SDK 和各种构建系统会把层次搅在一起。我不会强行把它们塞进同一套结构。它们以原生扩展或构建依赖出现时，就让引入它们的上层工具处理。

[系列最后一篇](/zh/posts/maintenance/)接着讨论配置完成之后的事：怎样维持环境可用，又不让维护本身变成另一个项目。
