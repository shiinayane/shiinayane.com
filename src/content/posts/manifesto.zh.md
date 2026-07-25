---
title: "我用四层结构重装了开发环境"
published: 2026-05-30
description: "一次 DFU 抹除让我重新决定：开发环境里的每类东西究竟归哪个工具管，以及以后要怎样把它完整重建出来。"
tags: [macos, mise, dotfiles, devenv]
category: Engineering
series: "sovereign-tools"
seriesOrder: 1
draft: false
lang: zh_CN
translationKey: manifesto
---

几周前，我把一台 Mac mini 置入 DFU 模式（Device Firmware Update，此时机器本身没有可用的操作系统，要等另一台 Mac 把系统写进去），然后彻底抹掉了它。

当时确实有个很顽固的问题要修，但我也只是想让这台机器重新“干净”一点。本来以为这会是一个不断重装软件的下午，结果真正花时间的，是先想清楚我说的“干净”到底是什么。

以前我会尽量少装工具。但所谓的极简环境通常撑不过半年：`~/.zshrc` 里出现了我已经看不懂的配置，机器上有三个不记得何时选过的 Python，还有一次 2023 年执行的 `pip install` 留在一个根本不该放东西的位置。问题不在于工具太多，而在于我已经说不清每件东西归谁管理。

这是这个系列的第 1 篇，后面还有 6 篇，会分别处理具体工具。这里先记下我在那次重装后采用的四层结构。

## 每一步都合理，叠起来就乱了

环境通常不是被某一个离谱操作搞坏的。

需要 Python 时，顺手执行 `brew install python`；后来项目要求另一个版本，于是装上 `pyenv`。接着 Node 项目带来 `nvm`，Ruby 又带来 `rbenv`。这些安装器都想往 `~/.zshrc` 里添几行，而且常常安静到我根本没有留意。再来一次 `pip install --user`，包被放到另一个工具意料之外的位置，还可能抢先被加载。

单看每一步都没什么大错。真正麻烦的是，等我输入 `python` 时，必须先调查自己的电脑，才能回答现在跑的是哪一个 Python、为什么是它。

我希望这个答案由环境结构决定，而不是看当前的 `PATH` 恰好让谁赢了。

## 四层结构

我把 Mac mini 的开发环境分成四层，从系统一直到随仓库保存的项目依赖。

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

**第 0 层：系统。** Homebrew 和 Xcode Command Line Tools 负责安装命令行工具与图形应用，不负责安装语言运行时。只要 Python 也交给 Homebrew，第 0 层就已经伸进了第 1 层。

**第 1 层：运行时版本。** 这里决定使用哪个解释器或编译器，例如 Python 3.14、Node 22。我通常把这一层交给 `mise`，由它根据当前所在的项目目录切换运行时。

**第 2 层：包管理器。** Python 用 `uv`，Node 用 `pnpm`，Rust 用 `cargo`。它们在已经选定的运行时里安装包，不负责选择运行时版本。

**第 3 层：项目依赖。** Manifest 和 Lockfile 跟着仓库走，例如 `pyproject.toml` 与 `uv.lock`，或者 `package.json` 与 `pnpm-lock.yaml`。换一台机器以后，应该仍然能靠这些文件复现同一组依赖。

依赖方向也是固定的：项目依赖要靠包管理器，包管理器要靠运行时，运行时再落到系统上。每个工具可以管好自己那一层，但不应该悄悄接管上下层。

## 每类资源只交给一个工具

我给自己的实际规则是：同一类资源只能有一个负责人。

运行时版本归一个工具，项目里的库归一个工具，系统应用也归一个工具。以后再问某个 Python 从哪里来、依赖版本由什么锁定、某个应用为什么会装在机器上，就只需要去一个地方找答案。

所以工具数量本身不是一个有用指标。两个工具同时觉得 Python 归自己管，会比五个各管一件事的工具更麻烦。真正需要避免的是所有权重叠。

不过第 1 层也不一定总归 `mise`。Rust 有 `rustup`，Swift 有 Xcode，它们都是语言生态本身提供、而且足够成熟的官方工具链管理器。遇到这种情况，我会让官方工具直接管理运行时和工具链，不再在前面套一层 `mise`。这个系列的第 5 篇会专门写我怎样判断要不要这么做。

因此，“单一事实来源”说的是所有权，不是指定某个永远正确的产品。工具可以换，这个分工仍然成立。

## 用能否重建来检查

那次抹除以后，我开始用“能不能恢复”检查环境。

理想情况下，我可以把所有缓存和构建产物都删掉——也就是整批 `rm -rf`——然后用一条命令重新构建机器上的任意项目。能做到，说明缓存真的只是可丢弃内容；做不到，就表示某个被我当作“派生结果”的目录其实偷偷保存了没有声明过的状态。我会把它当成分层问题，继续找到缺失的事实来源。

真正需要保存的是 Manifest、Lockfile 和 Dotfiles。只靠这些声明，应该就能从几乎空白的系统恢复出可工作的状态。平时排查问题也会更直接：在怀疑 `PATH` 之前，我知道该先找哪个工具。

这套做法有明确边界。它来自一台由单个用户完全控制的 macOS 机器。团队环境、共享服务器、受公司策略限制的电脑或其他操作系统，都会明显改变取舍。`mise` 和 `uv` 也都是比较新的工具，以后很可能被别的东西替代。这些限制只是说明我在什么环境里使用它，并不表示所有人都该照搬。

## 后面六篇写什么

接下来的文章会分别展开这套环境的不同部分：

- **不把 Dotfiles 塞进 `.zshrc`**：用 `ZDOTDIR` 和 `chezmoi` 声明 Shell 配置、暴露漂移，也不再把 Home 目录当作配置垃圾场。
- **Brewfile 的妥协**：为什么系统层可以接受最终一致性，以及怎样通过 Reconcile 保持它可信，而不是假装它非常严格。
- **Python、mise 与 uv**：`uv` 会绕过 `mise` 悄悄安装自己的 Python，以及解决冲突所需的那一个设置。
- **什么时候该让官方工具接管**：怎样判断第 1 层应该交给语言自己的版本管理器，而不是 `mise`。
- **同一套结构，多种语言**：把四层模型具体应用到 Node、Java、Swift、Rust、Go 和 Ruby。
- **配置很容易，维护才是工作**：健康检查、持续做减法，以及怎样让环境在长期使用后仍然容易理解。

[系列索引](/zh/series/sovereign-tools/)里有完整阅读顺序和当前状态。
