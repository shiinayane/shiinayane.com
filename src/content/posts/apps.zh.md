---
title: "Brewfile 的妥协：用最终一致性管理 Mac 应用"
published: 2026-05-30
description: "不是每一层都值得严格地声明式管理。只要偏差始终可见，应用这一层允许最终一致就够了。"
tags: [macos, homebrew, brewfile]
category: Engineering
series: "sovereign-tools"
seriesOrder: 3
draft: false
lang: zh_CN
translationKey: apps
---

我的 Brewfile 经常和 Mac 上实际安装的应用差一点。我觉得没问题。

这比 [Python 那一篇](/zh/posts/python/)的做法宽松得多。Python 环境由一个工具严格控制；到了 [dotfiles 那一篇](/zh/posts/dotfiles/)，散落在外的配置文件也需要逐一交代。但应用出问题的方式不一样，我没必要照搬同一套强度。

## 为什么这里可以暂时不一致

**第 3 层——项目依赖**需要严格一致。lockfile 写的是一个版本，开发机上实际用的却是另一个版本，项目可能直接构建失败，也可能只在本机正常、到了 CI 就表现不同。问题会立刻出现，而且经常要让别人一起承担，所以锁定精确版本、保证可复现安装完全值得。

**第 0 层——系统**放的是 Homebrew 安装的应用和命令行工具。假设我今天运行了 `brew install`，却忘记把它写进 Brewfile，眼前什么都不会坏，这台机器照样能用。通常要等到下一次迁移，我根据 Brewfile 恢复环境时，才会发现少了一个工具。到时候重新安装，再补上忘掉的那一行就行。

这个代价确实存在，但出现得晚，而且通常很小。所以这一层可以让日常状态暂时有偏差，再定期对账：用**最终一致性**，而不是管理项目依赖时的严格一致。

## 安装渠道怎么选

在 macOS 上，我按下面的顺序选安装渠道：

<figure class="my-6">
<svg viewBox="0 0 600 120" role="img" aria-labelledby="diagram-channels-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-channels-title">Install channel priority: brew, then mas, then dmg</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <rect x="20" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="95" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">brew</text>
    <text x="95" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">formula / cask</text>
    <text x="200" y="65" font-size="16" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <rect x="225" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="300" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">mas</text>
    <text x="300" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">App Store</text>
    <text x="405" y="65" font-size="16" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <rect x="430" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/>
    <text x="505" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">dmg</text>
    <text x="505" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">last resort</text>
  </g>
</svg>
</figure>

我会先找 **Homebrew**。命令行工具用 formula，图形应用用 cask。这个环境的第 0 层本来就归 Homebrew 管，而且两种 `brew` 安装都很容易写进 Brewfile。

其次才是通过 `mas-cli` 使用 **Mac App Store**。如果一个应用依赖 iCloud 同步、家人共享或 App Store 收据，或者它只在商店分发，我会选择 `mas`。其他应用用 cask 更省事：更新时和其余软件共用同一条 `brew` 命令，也不依赖已经登录的 App Store 账号。

厂商网站提供的 **`.dmg` 放在最后**。这种安装没法写进 Brewfile，我会另外维护一份 `manual-installs.md`，记下应用名称和下载来源。否则 Brewfile 没覆盖到什么，就只能靠自己记住了。

## 用一个文件记录目标状态

`mas-cli` 的好处，是能用 `mas` 条目让 App Store 应用和 formula、cask 共用同一份 Brewfile：

```ruby
# Brewfile
tap "homebrew/bundle"

brew "ripgrep"
brew "mas"

cask "visual-studio-code"
cask "rectangle"

# App Store apps, by their numeric ID (mas list to find them)
mas "Things 3", id: 904280696
mas "Xcode", id: 497799835
```

这样一来，`brew bundle` 一次就能安装 formula、cask 和 App Store 应用。这份文件按照[系列第一篇](/zh/posts/manifesto/)的归属原则，统一声明这台机器应该有哪些软件。它可以暂时落后于机器的实际状态，但目标状态仍然只有一份。

## 我怎么定期对账

说是最终一致，就得真的有收敛的动作。我的起点是一个只读健康检查函数 `brewdiff`，同时显示两个方向的偏差：已经安装但没有声明，以及已经声明但没有安装。

```zsh
# 30-functions.zsh — show drift between the Brewfile and the machine
brewdiff() {
  local brewfile="${HOMEBREW_BUNDLE_FILE:-$HOME/.config/homebrew/Brewfile}"
  echo "== Installed but NOT in Brewfile (undeclared) =="
  brew bundle cleanup --file="$brewfile" 2>/dev/null \
    | grep -E '^(Would uninstall|brew|cask|mas)' || echo "  (none)"
  echo
  echo "== In Brewfile but NOT installed (missing) =="
  brew bundle check --file="$brewfile" --verbose 2>/dev/null \
    | grep -v '^The Brewfile' || echo "  (all installed)"
}
```

这个函数只报告，不会修改机器。我可以逐项检查未声明的内容：究竟是打算长期保留、只是忘记写进去的工具，还是应该删掉的一次性实验。

对于普通 formula，我用 `brewadd` 把最常见的操作再缩短一点：安装成功后，顺手把同一个包追加到 Brewfile。

```zsh
# install AND declare in one step
brewadd() {
  local brewfile="${HOMEBREW_BUNDLE_FILE:-$HOME/.config/homebrew/Brewfile}"
  brew install "$@" || return 1
  for pkg in "$@"; do
    grep -q "\"$pkg\"" "$brewfile" || echo "brew \"$pkg\"" >> "$brewfile"
  done
}
```

我还需要提醒，不然写好了对账命令却一直不运行，和没有也差不多。每次启动 shell 时，下面的函数会检查时间戳文件；超过 30 天，就提醒我运行一次：

```zsh
# remind me to reconcile if it has been > 30 days
_brewdiff_reminder() {
  local stamp="$HOME/.cache/brewdiff-last"
  if [[ ! -f "$stamp" ]] || \
     [[ $(find "$stamp" -mtime +30 2>/dev/null) ]]; then
    print -P "%F{yellow}brewdiff:%f it's been a while — run 'brewdiff' to reconcile"
  fi
}
_brewdiff_reminder
```

运行 `brewdiff` 后，还会在结尾 `touch` 这个时间戳，重新开始计时。这套东西故意做得很小；再麻烦一点，每月检查就很容易被我拖到下个月。

Brewfile 的应用方式沿用了 [dotfiles 那一篇](/zh/posts/dotfiles/)里的 chezmoi 做法。`run_onchange_` 脚本会在新机器上安装软件，也会在 Brewfile 内容变化后重新运行 `brew bundle`：

```bash
# run_onchange_brew-bundle.sh.tmpl
#!/bin/sh
# Brewfile hash: {{ include "dot_config/homebrew/Brewfile" | sha256sum }}
brew bundle --file="$HOME/.config/homebrew/Brewfile"
```

真正触发脚本的是注释里的哈希。Brewfile 的校验和一变，这一行也会变化，chezmoi 因此知道编辑后需要重新执行命令。

## 让 AI 帮我审计

每月检查时，我有时会把 `brewdiff` 的输出交给 AI agent。它要做的是解释每个未声明的包是什么，再给出保留或删除的建议和理由，但不会直接编辑 Brewfile。

例如，“`pngquant` 是一个图片压缩工具，看起来像一次性安装，可以考虑删除”这种回答能省掉我查资料的时间，最后的决定仍然清楚可见。如果让 agent 直接改文件，就多了第二个可以修改事实来源的角色，Brewfile 也不再只表达我的意图。这里适合交出去的是判断所需的整理工作，不是修改权。

## 不交给自动化的命令

`brew bundle cleanup`（包括 `--cleanup` 参数）会卸载 Brewfile 里没有的所有内容。等声明已经完整时，它确实方便；但如果常用工具还有一半没写进去，就很危险。在 `brewdiff` 只剩一份很短、而且每项我都理解的未声明清单之前，我不会加 `--force` 运行它。

这次每月对账，也是[维护篇](/zh/posts/maintenance/)里那套日常维护的一个例子：先让偏差可见，检查清楚，再按周期收敛。对 Mac 应用来说，这已经够用了。我不要求每次安装都立刻更新 Brewfile，只要求遗漏不会藏起来，而且之后修正起来很便宜。
