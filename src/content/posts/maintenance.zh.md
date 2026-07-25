---
title: "配置不难，难的是一直维护"
published: 2026-05-30
description: "干净的开发环境会在日常使用中悄悄偏移。这些简单检查能让我及时看见问题，不至于把清理本身做成另一个工程。"
tags: [macos, mise, maintenance]
category: Engineering
series: "sovereign-tools"
seriesOrder: 7
draft: false
lang: zh_CN
translationKey: maintenance
---

我整理过的开发环境，通常只能干净半年左右。上一次认真检查时，我发现本来以为只有一个的 Python 实际有三个版本，Brewfile 和机器上的软件已经对不上，`mise list` 里还留着一批为某些实验安装、如今连用途都想不起来的 runtime。系统并没有坏，只是在每天使用的过程中慢慢偏离了原先的状态。

这是系列的最后一篇。前六篇写的是分层、设置和 dotfiles，这些配置花一个下午就能完成。一年后环境是否还干净，取决于另一件不起眼但要反复做的事：看见偏移，然后删掉已经不需要的东西。

## 偏移通常从哪里来

我遇到的情况大致有三种。

**工具悄悄自动安装。** [Python 那篇](/zh/posts/python/)里，`uv` 就曾自行下载一套 Python。整个过程没有提示，机器上却多出了并非由我选择的状态，因此这种偏移最容易漏掉。有些问题可以用声明式设置拦住，例如 `python-preference = only-system` 会把静默下载变成明确报错。但不可能提前管住所有工具，所以最后还是得检查机器的实际状态。

**安装了，却忘了同步清单。** 软件是我主动装的，只是没有补进声明文件，于是[应用管理那篇](/zh/posts/apps/)里的 Brewfile 逐渐落后于真实机器。平时不一定有影响，迁移时才会连续遇到“原来这个也装过”。因此不能等到恢复环境时才看 Brewfile，而要提前核对清单和机器。

**用完以后留下的东西越来越多。** 某个 runtime、全局工具或软件包确实曾经有用，只是用过一次后再也没有删除。这种偏移反而最难清理：单看任何一项都没错，也不会触发报错；只有把整张列表摆出来，才看得出累积本身已经成了问题。

## 健康检查只负责把问题摆出来

我为此保留了几个 shell 函数。前面的文章已经写过 `brewdiff`，用来比较已安装应用和 Brewfile；也写过 `zhealth`，用来找出家目录里散落的 zsh 文件。Python 还需要单独检查，因为不同工具很容易各自带上一套解释器，平时又看不出它们并不一致：

```zsh
# 30-functions.zsh — surface Python version drift across tools
pyversions() {
  echo "shell PATH   : $(command -v python)"
  echo "  reports    : $(python --version 2>&1)"
  echo "mise current : $(mise current python 2>/dev/null || echo '—')"
  echo "uv would use : $(uv run python --version 2>&1)"
  echo "mise list    :"
  mise list python 2>/dev/null | sed 's/^/  /'
}
```

`pyversions` 会把 shell 里的 `python`、`mise current`、`uv run python` 和 `mise` 已安装的版本放在一起。前三项一致时，这一层基本正常；不一致时，就说明某个工具掌握了一套我没预期到的 Python。这样可以直接重复 Python 那篇里的调查，不必每次重新想一遍该查哪些命令。

其他层也是同一个办法：

- 用 `mise list` 对照我实际使用的 `mise.toml`；
- 用 `brew bundle check` 对照机器和 Brewfile；
- 检查 `$HOME` 的内容是否符合“这里只留一个 zsh 文件”的预期。

这些命令不会自动修复任何东西，这是刻意的。一个只负责报告的小命令容易理解，也容易执行。它把偶然发现的意外，变成了我可以自行判断的差异。

## 30 天没有用，就重新判断一次

对我来说，成熟的环境里应该很少留下已经不用的工具。因此维护做得最多的其实是减法。

遇到可疑项目时，我会问：过去 30 天真的用过它吗？一个月没碰过的 runtime、全局工具或应用会进入待删除名单。不是立刻自动卸载，而是从“默认保留”变成“需要给出保留理由”。

检查 `mise` runtime 时，实际用的就是这几条：

```bash
$ mise list                 # what's installed
$ mise uninstall python@3.11 # remove a version no project uses
$ mise prune                 # drop versions nothing references
```

上一篇里的 [Ruby 取舍](/zh/posts/polyglot/)其实是在安装前做同样的判断。系统 Ruby 很旧，并不等于一台没有 Ruby 项目的机器必须再装一套由 `mise` 管理的 Ruby。等项目真的需要时再安装，也就少了一个以后要检查、要清理的 runtime。

我会定期做这件事，而不是等自己突然想整理。安装新工具很容易产生“有进展”的感觉；删除工具却像损失，也像承认当初装错了，沉没成本又让继续放着显得更轻松。固定流程反而简单：运行检查，看看哪些东西 30 天没有用，再删掉说不出保留理由的项目。

所以 `mise list` 少一行、Brewfile 很短，或者家目录里只有一个 dotfile，并不代表配置不完整。有时这就是整理后的正确状态。

## 别把维护做成另一套系统

清理流程本身也可能过度设计。完全可以为它做一个仪表盘，再配上定时任务和一大批健康检查，最后却多出一套需要维护的新系统。

两秒能跑完的 `brewdiff`，我会真的去跑；需要照顾的监控系统，多半不会。只有当核对成本低于它避免的混乱时，这套办法才划算。因此这些工具应当保持简单，只负责报告，把删除与否留给人判断。

[系列开篇](/zh/posts/manifesto/)把环境分成四层：System、Runtime version、Package manager 和 Project dependencies。除此之外还有一件任何一层配置都无法代替的事：偶尔看看机器，把实际状态和声明状态放在一起，在真正出故障前重新对齐。

如果一台机器很久没检查，我会先运行 `which python` 和 `uv run python --version`，再从 `mise list` 里找出一个月没碰过的东西。通常做到这里，就能知道记忆中的环境和眼前这台机器还是不是同一个状态。

---

*本文是 Sovereign Tools 系列的最后一篇。完整阅读顺序见[系列索引](/zh/series/sovereign-tools)。*
