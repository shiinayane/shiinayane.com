---
title: "Brewfile の妥協：Mac アプリは結果整合性で管理する"
published: 2026-05-30
description: "すべてのレイヤーを厳密に宣言管理する必要はない。差分が見えるなら、アプリのレイヤーは結果整合性で十分だった。"
tags: [macos, homebrew, brewfile]
category: Engineering
series: "sovereign-tools"
seriesOrder: 3
draft: false
lang: ja
translationKey: apps
---

私の Brewfile は、Mac に実際に入っているアプリと少しずれていることが多い。それで構わないと思っている。

これは、環境を一つの管理元で厳密に制御した [Python の記事](/ja/posts/python/)や、散らばった設定ファイルまで管理対象にした [dotfiles の記事](/ja/posts/dotfiles/)より緩い運用だ。ただし、アプリで困る場面はそれらと違う。同じ強さで管理しても割に合わない。

## このレイヤーでは差分を許している

**レイヤー 3——プロジェクトの依存関係**には厳密な整合性が必要になる。lockfile が指定するバージョンと開発環境の実物が違えば、ビルドが失敗するかもしれない。手元だけ動いて CI では挙動が変わることもある。影響はすぐに現れ、ときには他の人まで巻き込むため、バージョンの固定や再現可能なインストールに手間をかける価値がある。

一方の **レイヤー 0——システム**には、Homebrew で入れたアプリやコマンドラインツールがある。今日 `brew install` を実行して Brewfile への追記を忘れても、今使っている Mac はそのまま動く。たいてい気づくのは、後日 Brewfile から新しい環境を復元したときだ。足りないツールをインストールし、忘れていた一行を追加すれば済む。

コストはゼロではないものの、発生するのは後で、しかも通常は小さい。そのため、普段の差分は許し、定期的に照合して収束させている。プロジェクト依存関係のような強い整合性ではなく、ここでは**結果整合性**を使う。

## インストール元の選び方

macOS では、次の順番でインストール元を選んでいる。

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

最初に探すのは **Homebrew** だ。コマンドラインツールなら formula、GUI アプリなら cask を使う。この構成では Homebrew がすでにレイヤー 0 の管理元であり、どちらの `brew` インストールも Brewfile に簡単に記録できる。

次が `mas-cli` 経由の **Mac App Store**。iCloud 同期、ファミリー共有、App Store のレシートに依存するアプリ、またはストアでしか配布されていないアプリは `mas` から入れる。それ以外は cask のほうが扱いやすい。他のツールと同じ `brew` コマンドで更新でき、App Store にサインインしたアカウントにも依存しないからだ。

ベンダーサイトから配布される **`.dmg` は最後の手段**になる。Brewfile には書けないため、アプリ名と入手元を `manual-installs.md` に残している。これがなければ、Brewfile で管理できていないものは自分の記憶にしか残らない。

## 目標の状態は一つのファイルに置く

`mas-cli` を使うと、App Store アプリの `mas` エントリも formula や cask と同じ Brewfile に置ける。

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

`brew bundle` を一度実行すれば、formula、cask、App Store アプリをまとめてインストールできる。[シリーズ最初の記事](/ja/posts/manifesto/)で扱った所有関係と同じく、この Mac に何を入れるべきかは一つのファイルで宣言する。実際の Mac より一時的に遅れることはあっても、宣言された目標状態が複数になるわけではない。

## 定期的に差分を確認する

結果整合性と呼ぶなら、いつか本当に収束させる必要がある。私はまず `brewdiff` という読み取り専用のヘルスチェックを使う。インストール済みだが未宣言のものと、宣言済みだが未インストールのものを両方表示する関数だ。

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

この関数は表示するだけで、Mac の状態を変更しない。未宣言の項目を一つずつ見ながら、残すつもりだったのに書き忘れたツールなのか、削除してよい実験用のツールなのかを判断できる。

通常の formula には `brewadd` を使う。パッケージをインストールし、成功したら同じ操作の中で Brewfile に追記するための短い関数だ。

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

コマンドを用意しても、実行を忘れれば意味がない。そこで shell の起動時にタイムスタンプの古さを調べ、30 日を超えていたら知らせるようにした。

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

`brewdiff` の実行後には、最後にタイムスタンプを `touch` して時計をリセットする。月に一度の確認を先延ばしにしないよう、仕組みは意図的にこれ以上複雑にしていない。

Brewfile の適用には、[dotfiles の記事](/ja/posts/dotfiles/)で使った chezmoi の構成をそのまま使える。`run_onchange_` スクリプトによって、新しい Mac へのインストール時と Brewfile の内容が変わったときに `brew bundle` を実行する。

```bash
# run_onchange_brew-bundle.sh.tmpl
#!/bin/sh
# Brewfile hash: {{ include "dot_config/homebrew/Brewfile" | sha256sum }}
brew bundle --file="$HOME/.config/homebrew/Brewfile"
```

スクリプトを起動する仕掛けは、コメント内のハッシュにある。Brewfile のチェックサムが変わるとこの行も変わるため、chezmoi は編集後にコマンドを再実行する。

## AI には監査だけを頼む

月次確認では、`brewdiff` の出力を AI agent に渡すこともある。未宣言のパッケージが何なのかを説明し、残すか削除するかを理由付きで提案してもらう。ただし、Brewfile 自体は編集させない。

たとえば「`pngquant` は画像圧縮ツールで、一度しか使っていないように見えるので削除を検討してよい」と分かれば、調査時間を減らしつつ最終判断は自分に残せる。agent が直接ファイルを書き換えると、情報源を変更できる主体が二つになり、Brewfile は私の意図だけを表すものではなくなる。任せているのは判断材料の整理であって、変更する権限ではない。

## 自動化しないコマンド

`brew bundle cleanup` と `--cleanup` フラグは、Brewfile にないものをすべてアンインストールする。宣言が完成した後なら便利だが、普段使うツールの半分がまだ未宣言なら危険だ。`brewdiff` の未宣言リストが短くなり、各項目を自分で把握できるまでは `--force` を付けて実行しない。

この月次確認は、[メンテナンスの記事](/ja/posts/maintenance/)に書いた習慣の一例でもある。差分を見えるようにし、内容を確認してから、決めた周期で収束させる。Mac アプリについてはこれで十分だった。インストールのたびに Brewfile を即座に更新する必要はないが、書き忘れたものは見える状態にし、後から小さな手間で直せるようにしておきたい。
