---
title: "让 mise 和 uv 使用同一个 Python"
published: 2026-05-30
description: "uv 安装了一个 mise 完全不知道的 Python。把 python-preference 设为 only-system 后，运行时重新只由一个工具管理，但旧项目也需要随之处理。"
tags: [macos, python, uv, mise]
category: Engineering
series: "sovereign-tools"
seriesOrder: 4
draft: false
lang: zh_CN
translationKey: python
---

我是在两个目录里运行同一条命令时发现问题的：

```bash
$ cd ~/project && uv run python --version
Python 3.12.7
$ cd ~ && uv run python --version
Python 3.13.1
```

项目目录里出现不同版本很正常，毕竟每个项目都可以固定自己的运行时。奇怪的是第二个结果：我不记得自己安装过 Python 3.13.1，而我用来统一管理运行时版本的 `mise` 也不知道它。按照这个系列[第一篇文章](/zh/posts/manifesto/)里的约定，机器上有哪些 Python 本来应该只由 `mise` 决定。

## 找出另一个 Python

我先确认两个上下文里的 `python` 到底指向哪里。Shell 和 `uv run` 用的并不是同一个可执行文件：

```bash
$ which python
/Users/me/.local/share/mise/installs/python/3.12.7/bin/python
$ uv run python -c 'import sys; print(sys.executable)'
/Users/me/.local/share/uv/python/cpython-3.13.1-macos-aarch64-none/bin/python3.13
```

Shell 找到的是 `mise` 安装并放到 `PATH` 上的解释器；离开固定版本的项目后，`uv run` 却选中了 `~/.local/share/uv/python` 下的解释器。这个目录并不是我主动创建的。

再让 `uv` 列出它眼中的已安装版本，来源就很清楚了：

```bash
$ uv python list --only-installed
cpython-3.13.1-macos-aarch64-none    /Users/me/.local/share/uv/python/cpython-3.13.1-.../bin/python3.13
cpython-3.12.7-macos-aarch64-none    /Users/me/.local/share/mise/installs/python/3.12.7/bin/python3.12
```

机器上确实有两套独立的 CPython。用 `readlink -f` 追到真实文件后也能确认，它们并不是同一个二进制文件的两个路径：一套归 `mise` 管，另一套由 `uv` 下载并保存在自己的目录里。

这不是 `uv` 的 bug，而是默认行为。它的 `python-preference` 默认值是 `managed`：优先使用 uv 管理的 Python；如果现有解释器都不满足项目的 `requires-python`，就自动下载一套。若只用 `uv` 管理运行时和依赖，这个默认值很省事；但在我的配置里，Python 版本应该只由 `mise` 决定，于是两个工具的职责重叠了。

## 解释器、虚拟环境和缓存不是一回事

修改配置前，我先把三个看起来都像“藏在隐藏目录里的 Python 文件”的东西分开。它们的用途、生命周期和负责人其实都不一样。

<figure class="my-6">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="diagram-factory-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-factory-title">蓝图、样品与共享仓库：mise 安装、.venv 和 uv 缓存</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- Blueprint -->
    <rect x="10" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="100" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">蓝图</text>
    <text x="100" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">mise install</text>
    <text x="100" y="116" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">python 3.14.0</text>
    <text x="100" y="150" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">每个版本号对应</text>
    <text x="100" y="168" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">一个完整解释器</text>
    <text x="100" y="200" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">多个版本可以</text>
    <text x="100" y="218" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">同时存在</text>
    <!-- Sample unit -->
    <rect x="230" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="320" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">样品</text>
    <text x="320" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">project/.venv</text>
    <text x="320" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">bin/python → 符号链接</text>
    <text x="320" y="142" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">指回蓝图</text>
    <text x="320" y="186" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">site-packages =</text>
    <text x="320" y="204" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">唯一的项目私有部分</text>
    <!-- Shared library -->
    <rect x="450" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="540" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">共享仓库</text>
    <text x="540" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">uv cache</text>
    <text x="540" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">按内容寻址</text>
    <text x="540" y="160" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">每个包版本只存一份</text>
    <text x="540" y="178" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">供所有项目</text>
    <text x="540" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">共享</text>
    <!-- arrows -->
    <text x="210" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">←</text>
    <text x="210" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">符号链接</text>
    <text x="430" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <text x="430" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">链接进来</text>
  </g>
</svg>
</figure>

我把 `mise install python@3.14` 安装的版本理解成一张**蓝图**：每个版本号对应一个完整的解释器。`mise` 的安装目录可以同时容纳很多版本，因此 3.12.7 和 3.14.0 只是两张互不干扰的蓝图。

项目里的 **`.venv`** 则是从蓝图做出来的**样品**。虚拟环境的大部分内容是符号链接，`bin/python` 会指回原来的解释器，并不再复制一套 Python；真正由项目独占的是 `site-packages`。因此 `.venv` 创建得又快又小，但删除 `mise` 管理的某个 Python 后，所有指向它的虚拟环境也会一起坏掉。

**uv 缓存**更像共享仓库。它按内容寻址，同一个包版本只保存一次，再链接到各个项目的 `site-packages`，而不是反复复制。十个项目若依赖同一版本的 `numpy`，可以共同引用缓存里的那一份。`uv` 之所以快，很大一部分原因就是它经常只需建立链接，不必重复下载和解包。

按照这个分工，`mise` 提供解释器；`uv` 用这些解释器建立项目环境，再从包缓存填充依赖。`uv` 没有必要再额外安装一套解释器。

## 只允许 uv 使用系统 Python

`uv` 会读取 `~/.config/uv/uv.toml` 里的全局配置。我加入了这一行：

```toml
# ~/.config/uv/uv.toml
python-preference = "only-system"
```

`python-preference` 一共有四种取值：

- `only-managed`：只使用 uv 管理的 Python，忽略系统解释器。隔离最彻底，也最不适合由 `mise` 管理运行时的结构。
- `managed`：默认值。优先使用 uv 管理的 Python，其次才用系统 Python；两边都不满足 `requires-python` 时，自动下载 uv 管理的解释器。我的意外安装就来自这里。
- `system`：优先使用 `PATH` 上已有的 Python，但找不到合适版本时仍可下载 uv 管理的解释器。
- `only-system`：只使用系统 Python，包括 `mise` 放到 `PATH` 上的版本，而且绝不自动下载。没有满足要求的解释器时，命令会报错。

我需要的正是最后一种失败方式：缺少某个版本时，问题会一直摆在眼前，直到我明确地用 `mise` 安装它。如果只是想优先使用 `mise`、同时保留 `uv` 的自动兜底，可以选较宽松的 `system`。

改完配置后，我删除了 `uv` 安装的 Python 3.13.1，并重建受影响的环境：

```bash
$ uv python uninstall 3.13.1
$ cd ~/project && rm -rf .venv && uv sync
```

此后，`uv run python` 和 Shell 里的 `python` 会落到同一个由 `mise` 管理的解释器上。

## 改完全局规则，旧项目可能会报错

全局选择规则改变后，以前按旧规则建立的环境也会受到影响。我有一些旧项目，`mise.toml` 仍要求某个已经从 `mise` 删除的 Python 版本。过去运行 `uv sync` 时，`uv` 可以悄悄下载缺失版本后继续；换成 `only-system` 后，它会停下来：

```text
error: No interpreter found for Python 3.11 in system path
```

这条错误的实际含义很直接：项目要求 Python 3.11，但机器上没有。修复也应该明确完成：

```bash
$ mise install python@3.11   # provision the blueprint, deliberately
$ uv sync                    # now succeeds, using mise's Python
```

现在重新打开旧项目时，我会：

1. 查看 `pyproject.toml` 的 `requires-python`，以及 `mise.toml` 固定的版本。
2. 如果缺少对应解释器，运行 `mise install`。
3. 运行 `rm -rf .venv && uv sync`，让环境重新指向已安装的解释器。
4. 用 `uv run python --version` 确认最终版本。

这确实比默认配置多了一次主动运行 `mise install` 的步骤。默认行为可能会静默补齐缺失版本，而我宁愿看到不一致再决定怎么处理；严格并不是没有成本。

我还会像[dotfiles 那篇文章](/zh/posts/dotfiles/)里处理其他配置一样，把 `uv.toml` 放进 chezmoi 的源仓库，让这条规则跟着我去下一台机器。

## 小脚本不必建完整项目

如果只是运行一个依赖 `httpx` 的 40 行脚本，为它准备 `pyproject.toml`、`.venv` 和锁文件就太重了。`uv` 有更轻量的方式，而且同样遵守 `only-system`。

临时运行时，`--with` 会把依赖放进一次性的环境：

```bash
$ uv run --with httpx --with rich script.py
```

准备长期保留的脚本可以使用 PEP 723，把 Python 版本要求和依赖直接写进文件：

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "rich"]
# ///
import httpx
from rich import print
print(httpx.get("https://example.com").status_code)
```

执行 `uv run script.py` 时，`uv` 会读取这些元数据，从缓存组装环境并运行，不需要项目级 `.venv`。再配上 `uv` shebang、`chmod +x`，并把文件放进 `~/.local/bin`，这个脚本就能像其他 `PATH` 命令一样使用，依赖仍记录在文件内部。这比我以前用 `pip install` 把个人工具塞进全局解释器、过一阵又忘掉来源要干净得多。

真正的 Python 命令行工具应该待在各自隔离的工具环境里。`uv tool install` 用于持续安装，`uvx` 则负责单次运行；像 `ruff`、`httpie` 这样的工具都比全局 `pip install` 更适合放在这里。

如果根本不用 `mise`，让 `uv` 同时管理 Python 和依赖完全说得通，默认的 `managed` 也可能就是正确选择。我的问题只是两个工具同时决定运行时版本。这个系列的[下一篇文章](/zh/posts/sovereignty/)会继续谈什么时候应该把这一层交给官方工具。
