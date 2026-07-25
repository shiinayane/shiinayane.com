---
title: "~/.zshrc を置かない dotfiles：ZDOTDIR と chezmoi"
published: 2026-05-30
description: "ZDOTDIR で zsh 設定をホームディレクトリから移し、分割した設定を chezmoi で管理する。"
tags: [macos, dotfiles, zsh, chezmoi]
category: Engineering
series: "sovereign-tools"
seriesOrder: 2
draft: false
lang: ja
translationKey: dotfiles
---

長く使った `~/.zshrc` を見ると、自分で書いた行とインストーラーが追加した行を区別できなくなっていた。

インストールスクリプトは簡単に初期化処理を追記するが、ツールを消してもその行は残る。ファイルが一応動いているので触りづらくなり、さらに追記だけが増えていく。

今はホームディレクトリに `~/.zshenv` だけを残し、ほかの zsh 設定を `~/.config/zsh/` に置いて chezmoi で管理している。[最初の記事](/ja/posts/manifesto/)で書いたレイヤー分けを dotfiles に適用した形だ。

## ZDOTDIR で設定を移動する

macOS の interactive login shell は、おおむね次の順で設定を読む。

```text
/etc/zshenv      →  ~/.zshenv      (always, every shell)
/etc/zprofile    →  ~/.zprofile    (login shells)
/etc/zshrc       →  ~/.zshrc       (interactive shells)
/etc/zlogin      →  ~/.zlogin      (login shells)
```

`~/.zshenv` はすべての zsh で最初に読まれる。ここで `ZDOTDIR` を設定すると、`.zprofile`、`.zshrc`、`.zlogin` の探索先が `$HOME` から `$ZDOTDIR` に変わる。

```zsh
# ~/.zshenv — the only zsh file allowed to live in $HOME
export ZDOTDIR="${XDG_CONFIG_HOME:-$HOME/.config}/zsh"
```

<figure class="my-6">
<svg viewBox="0 0 600 300" role="img" aria-labelledby="diagram-home-title-ja" style="width:100%;height:auto;color:inherit">
  <title id="diagram-home-title-ja">ZDOTDIR 使用前後のホームディレクトリ</title>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <text x="20" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">Before</text>
    <rect x="20" y="40" width="250" height="240" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="36" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <g font-size="12.5" fill="currentColor" fill-opacity="0.6">
      <text x="48" y="90">.zshenv</text><text x="48" y="110">.zshrc</text>
      <text x="48" y="130">.zprofile</text><text x="48" y="150">.bash_profile</text>
      <text x="48" y="170">.npmrc</text><text x="48" y="190">.gitconfig</text>
      <text x="48" y="210">.python_history</text><text x="48" y="230">.zsh_history</text>
      <text x="48" y="250">.cargo/  .rustup/  …</text>
      <text x="48" y="270" fill-opacity="0.4">(増え続ける)</text>
    </g>
    <text x="330" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">After (ZDOTDIR)</text>
    <rect x="330" y="40" width="250" height="70" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="346" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <text x="358" y="90" font-size="12.5" fill="var(--primary)">.zshenv  → ZDOTDIR を設定</text>
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

これは zsh が正式にサポートする仕組みだ。VS Code の integrated terminal も `~/.zshenv` を読む。古いツールの一部は `~/.zshrc` を決め打ちしているが、私の環境では問題になることは少なかった。

## 長い一ファイルを作らない

移動先で再び巨大な `.zshrc` を作らないよう、`.zshrc` 自体は番号順に fragment を読むだけにした。

```zsh
# ~/.config/zsh/.zshrc — loads every fragment in numeric order
for _file in "${ZDOTDIR}"/conf.d/*.zsh(N); do
  source "$_file"
done
unset _file
```

`(N)` は、対象がないときにエラーではなく空へ展開する zsh の glob qualifier。

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

環境変数、関数、外部 CLI が生成する hook、言語設定、プラグインの順に分ける。prompt が runtime 情報を使う場合は `mise` の activation より後に読み、syntax highlighting は line editor を wrap するので最後に置く。

## PATH を重複させない

`~/.zshenv` は子 shell でも実行されるため、

```zsh
export PATH="$HOME/.local/bin:$PATH"
```

をそのまま置くと tmux、subshell、`exec zsh` のたびに同じパスが増える。

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

`PATH` の両端にもコロンを付けることで、先頭と末尾の要素も完全一致で確認できる。この関数は `00-env.zsh` に置く。

## chezmoi の source と target

Git リポジトリを `$HOME` に直接 symlink する代わりに [chezmoi](https://www.chezmoi.io/) を使う。source directory からホームディレクトリへレンダリングし、source 側のファイル名で属性も宣言する。

- `dot_`：先頭にドットを付ける。
- `private_`：結果を `0600` にする。
- `executable_`：実行 bit を付ける。
- `exact_`：宣言されていないディレクトリ内容を削除する。
- `run_onchange_`：内容が変わったときにスクリプトを実行する。[アプリの記事](/ja/posts/apps/)では Brewfile の変更時に使う。

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

## zhealth で勝手に増えた設定を探す

構成後、`$HOME` にある zsh ファイルは `~/.zshenv` だけになる。`~/.zshrc` が復活したら、インストーラーが書いた可能性が高い。

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

新しいツールを入れたあとに実行すれば、数か月後にシェルの挙動から原因を推測せずに済む。[メンテナンスの記事](/ja/posts/maintenance/)でも同じ health check の考え方を使う。

## 追跡しないもの

`~/.zsh_history` は設定ではなく状態で、内容も private。`.zcompdump*` は再生成できる cache。credential や token も通常の dotfiles リポジトリには置かない。

```text
# .chezmoiignore
.config/zsh/.zcompdump*
.zsh_history
```

マシン固有の proxy や local alias は `90-local.zsh` に置く。最後に読み込むので上書きできるが、Git では管理しない。

結果として `$HOME` には入口が一つ、設定本体は順序付きの小さな fragment、期待状態は chezmoi、勝手に増えたファイルの確認は `zhealth` という形になった。
