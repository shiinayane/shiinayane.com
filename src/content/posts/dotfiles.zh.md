---
title: "不用 ~/.zshrc 的 dotfiles：ZDOTDIR 与 chezmoi"
published: 2026-05-30
description: "用 ZDOTDIR 把 zsh 配置移出主目录，拆成模块，再交给 chezmoi 管理。"
tags: [macos, dotfiles, zsh, chezmoi]
category: Engineering
series: "sovereign-tools"
seriesOrder: 2
draft: false
lang: zh_CN
translationKey: dotfiles
---

我的 `~/.zshrc` 用了很久以后，已经分不清哪些行是自己写的，哪些是安装器自动加的。

很多安装脚本都会提示一句“已添加初始化到 `~/.zshrc`”，然后那几行就一直留在那里。工具删了，初始化代码不一定会跟着消失。最后文件虽然还能工作，但基本没人敢动。

我现在只在主目录保留一个 `~/.zshenv`，其他 zsh 配置全部放到 `~/.config/zsh/`，再用 chezmoi 管理。这样主目录由谁负责、磁盘上的状态有没有偏离声明，都比较容易看出来。这也是[系列第一篇](/zh/posts/manifesto/)里分层方案的一部分。

## 用 ZDOTDIR 移走配置

macOS 上的交互式 login shell 大致按这个顺序读取文件：

```text
/etc/zshenv      →  ~/.zshenv      (always, every shell)
/etc/zprofile    →  ~/.zprofile    (login shells)
/etc/zshrc       →  ~/.zshrc       (interactive shells)
/etc/zlogin      →  ~/.zlogin      (login shells)
```

`~/.zshenv` 每次启动 zsh 都会最先读取，也可以在这里设置 `ZDOTDIR`。设置后，后续的 `.zprofile`、`.zshrc` 和 `.zlogin` 都会从 `$ZDOTDIR` 读取。

所以我的 `~/.zshenv` 只有一行：

```zsh
# ~/.zshenv — the only zsh file allowed to live in $HOME
export ZDOTDIR="${XDG_CONFIG_HOME:-$HOME/.config}/zsh"
```

<figure class="my-6">
<svg viewBox="0 0 600 300" role="img" aria-labelledby="diagram-home-title-zh" style="width:100%;height:auto;color:inherit">
  <title id="diagram-home-title-zh">使用 ZDOTDIR 前后的主目录</title>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="20" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">之前</text>
    <rect x="20" y="40" width="250" height="240" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="36" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <g font-size="12.5" fill="currentColor" fill-opacity="0.6">
      <text x="48" y="90">.zshenv</text><text x="48" y="110">.zshrc</text>
      <text x="48" y="130">.zprofile</text><text x="48" y="150">.bash_profile</text>
      <text x="48" y="170">.npmrc</text><text x="48" y="190">.gitconfig</text>
      <text x="48" y="210">.python_history</text><text x="48" y="230">.zsh_history</text>
      <text x="48" y="250">.cargo/  .rustup/  …</text>
      <text x="48" y="270" fill-opacity="0.4">(继续增长)</text>
    </g>
    <text x="330" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">之后（ZDOTDIR）</text>
    <rect x="330" y="40" width="250" height="70" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="346" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <text x="358" y="90" font-size="12.5" fill="var(--primary)">.zshenv  → 设置 ZDOTDIR</text>
    <rect x="330" y="125" width="250" height="155" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="346" y="151" font-size="13" fill="currentColor" fill-opacity="0.85">~/.config/zsh/</text>
    <g font-size="12.5" fill="currentColor" fill-opacity="0.6">
      <text x="358" y="173">.zshrc</text><text x="358" y="193">00-env.zsh</text>
      <text x="358" y="213">20-aliases.zsh</text><text x="358" y="233">30-functions.zsh</text>
      <text x="358" y="253">35-tools.zsh  …</text>
    </g>
  </g>
</svg>
</figure>

这是 zsh 官方支持的机制，不是什么软链接技巧。VS Code 的集成终端会读取 `~/.zshenv`，所以也能正常使用。少数老工具会死认 `~/.zshrc`，遇到时再单独判断要不要迁就它。

## 把一个长文件拆开

移动路径后，如果只是把原来的几百行原样搬过去，也没解决多少问题。我的 `.zshrc` 只负责按顺序加载片段：

```zsh
# ~/.config/zsh/.zshrc — loads every fragment in numeric order
for _file in "${ZDOTDIR}"/conf.d/*.zsh(N); do
  source "$_file"
done
unset _file
```

`(N)` 是 zsh 的 glob qualifier，目录为空时会展开为空，而不是报错。片段按数字排序：

```text
~/.config/zsh/conf.d/
├── 00-env.zsh          # exported env vars, PATH base
├── 10-completion.zsh   # compinit and completion styles
├── 20-aliases.zsh      # short renames of existing commands
├── 30-functions.zsh    # shell functions that do real work
├── 35-tools.zsh        # eval-hooks for external CLIs (mise, zoxide, …)
├── 40-lang.zsh         # language/runtime-specific setup
├── 50-plugins.zsh      # zsh-ecosystem plugins
└── 90-local.zsh        # machine-specific, not tracked in git
```

环境变量先加载；函数放在后面；`mise activate`、`zoxide init` 之类工具生成的 hook 单独放到 `35-tools.zsh`；语言配置依赖这些 hook，所以排在 40。插件最后加载，其中 syntax highlighting 必须放到最后，否则其他修改 line editor 的插件可能和它冲突。

## PATH 不要越叠越长

`~/.zshenv` 会在子 shell 里重复执行。直接这样写：

```zsh
export PATH="$HOME/.local/bin:$PATH"
```

每开一层 shell 都会再加一次。tmux、`exec zsh` 和 subshell 用久后，PATH 里会出现很多重复项。

我用一个幂等的 prepend：

```zsh
# Prepend to PATH only if not already present.
path_prepend() {
  case ":$PATH:" in
    *":$1:"*) ;;            # already there — do nothing
    *) PATH="$1:$PATH" ;;
  esac
}

path_prepend "$HOME/.local/bin"
```

前后加冒号是为了让首尾元素也能按完整路径匹配。这段放在 `00-env.zsh`。

## chezmoi 的源目录不是主目录

我不直接把一个 Git 仓库软链接进 `$HOME`，而是使用 [chezmoi](https://www.chezmoi.io/)。它保存一份 source directory，再把内容渲染到主目录。文件名前缀同时声明目标属性：

- `dot_`：目标文件名前面加点，例如 `dot_zshenv` 变成 `~/.zshenv`。
- `private_`：目标权限为 `0600`。
- `executable_`：设置可执行位。
- `exact_`：目录中不在声明里的内容会被移除。
- `run_onchange_`：内容变化时运行脚本。[应用篇](/zh/posts/apps/)用它在 Brewfile 变化后执行 `brew bundle`。

映射大概是这样：

```text
chezmoi source repo            →  rendered into $HOME
├── dot_zshenv                 →  ~/.zshenv
├── dot_config/
│   └── zsh/
│       ├── dot_zshrc          →  ~/.config/zsh/.zshrc
│       └── conf.d/
│           ├── 00-env.zsh     →  ~/.config/zsh/conf.d/00-env.zsh
│           └── 20-aliases.zsh →  ~/.config/zsh/conf.d/20-aliases.zsh
└── dot_local/
    └── bin/
        └── executable_zhealth →  ~/.local/bin/zhealth  (chmod +x)
```

## 用 zhealth 找回偷偷出现的文件

完成后，`$HOME` 里应该只有一个 zsh 文件：`~/.zshenv`。如果又出现 `~/.zshrc`，大概率是某个安装器写的。

```zsh
# 30-functions.zsh — flag stray zsh files in $HOME
zhealth() {
  local stray=(~/.zshrc(N) ~/.zprofile(N) ~/.zlogin(N) ~/.zshrc.*(N))
  if (( ${#stray} )); then
    print -u2 "zhealth: unexpected zsh files in \$HOME:"
    printf '  %s\n' "${stray[@]}" >&2
    return 1
  fi
  print "zhealth: \$HOME is clean — only ~/.zshenv expected"
}
```

安装新工具后跑一下 `zhealth`，比过几个月再从 shell 异常里猜原因简单得多。[维护篇](/zh/posts/maintenance/)会继续用这种 health check。

## 哪些东西不要跟踪

`~/.zsh_history` 是状态而不是配置，还可能包含隐私；`.zcompdump*` 是可以重新生成的缓存；凭据和 token 更不应该直接进普通 dotfiles 仓库。

```text
# .chezmoiignore
.config/zsh/.zcompdump*
.zsh_history
```

`90-local.zsh` 专门放每台机器不同、或者不应该上传的配置，例如公司代理和本地 alias。它最后加载，允许覆盖前面的设置，但不会进入 Git。

最后 `$HOME` 里只剩一个入口文件，实际配置拆成有顺序的小片段，chezmoi 记录目标状态，`zhealth` 负责告诉我什么时候又被安装器污染了。
