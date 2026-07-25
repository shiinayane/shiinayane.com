---
title: "公式ツールに任せるべきタイミング"
published: 2026-05-30
description: "すべての言語を mise に預ける必要はない。ランタイムのバージョンを誰が管理するかは、その言語に十分強力な公式ツールがあるかで決める。"
tags: [macos, mise, rust, sovereignty]
category: Engineering
series: "sovereign-tools"
seriesOrder: 5
draft: false
lang: ja
translationKey: sovereignty
---

[前の記事](/ja/posts/python/)では、Python のバージョンは `mise` だけに管理させ、`uv` は依存関係のレイヤーに留めた。一方、同じ Mac の Rust は `rustup` に任せている。`mise` でも Rust をインストールできるのに、である。

Rust だけを例外扱いしているわけではない。Layer 1、つまりランタイムのバージョンを誰に任せるか決めるとき、まず確認するのは一つだ。**その言語には、十分に強力な公式の主権ツールがあるか。**

## 主権ツールと呼べる条件

ここでいう**主権ツール**とは、言語プロジェクト自身が提供するバージョン兼ツールチェーン管理ツールのことだ。Rust の `rustup` と Swift の Xcode が分かりやすい。強力なものが存在するなら、そのレイヤーは公式ツールに任せる。存在しない、あるいは機能が足りない場合に `mise` で穴を埋める。

ただし、公式というだけでは足りない。実際には次の四点を見る。

1. **言語プロジェクトの一部であること。** コンパイラと同じ提供元から出ており、言語の変化を後追いするサードパーティ製ツールではない。
2. **バージョン切り替え以外も管理すること。** ツールチェーンの構成要素、stable/beta/nightly のリリースチャンネル、クロスコンパイル先、エコシステム全体で通用するプロジェクト単位の固定などが該当する。単に有効なバージョンを選ぶだけなら、`mise` がすでに得意としている。
3. **コミュニティーの合意があること。** 「この言語はどうインストールするのか」に、退屈なほど共通した答えがあるのが理想だ。三つの方式が競合しているなら、まだ主権ツールはない。
4. **アップグレード後も既存プロジェクトを壊さないこと。** 一つのレイヤーを何年も任せるには、現在の機能だけでなく契約の安定性が必要になる。

`rustup` は四条件をすべて満たす。Rust プロジェクトの一部であり、ツールチェーン、ターゲット、リリースチャンネルを管理し、標準のインストール手段として定着し、長年にわたって安定した契約を保ってきた。対照的なのが Go 公式の `dl` インストーラーだ。特定バージョンの Go は取得できるが、それ以上の管理はほとんど担わず、バージョン管理の標準にもなっていない。公式ではあっても条件 2 と 3 を満たさないため、私は弱いツールと判断している。

<figure class="my-6">
<svg viewBox="0 0 600 300" role="img" aria-labelledby="diagram-sov-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-sov-title">言語に強力な公式の主権ツールがあるかを判断するフロー</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- root -->
    <rect x="140" y="20" width="320" height="58" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="300" y="45" font-size="13.5" font-weight="600" text-anchor="middle" fill="currentColor">強力な公式の主権ツールがある？</text>
    <text x="300" y="65" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.55">言語公式 · ツールチェーン管理 · 合意 · 安定性</text>
    <!-- branch labels -->
    <text x="150" y="108" font-size="12" font-weight="700" text-anchor="middle" fill="var(--primary)">ある</text>
    <text x="450" y="108" font-size="12" font-weight="700" text-anchor="middle" fill="var(--primary)">ない / 弱い</text>
    <!-- connectors -->
    <path d="M260 78 L150 120" stroke="currentColor" stroke-opacity="0.3" fill="none"/>
    <path d="M340 78 L450 120" stroke="currentColor" stroke-opacity="0.3" fill="none"/>
    <!-- leaf left -->
    <rect x="30" y="125" width="240" height="150" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="150" y="152" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">主権ツールに任せる</text>
    <text x="150" y="176" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">Layer 1 を所有</text>
    <text x="150" y="210" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">rustup  →  Rust</text>
    <text x="150" y="232" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Xcode  →  Swift</text>
    <!-- leaf right -->
    <rect x="330" y="125" width="240" height="150" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="450" y="152" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">mise で補う</text>
    <text x="450" y="176" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">mise が Layer 1 を所有</text>
    <text x="450" y="208" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Python · Node · Java</text>
    <text x="450" y="230" font-size="12.5" text-anchor="middle" fill="currentColor" fill-opacity="0.7">Ruby · Go（弱い）</text>
  </g>
</svg>
</figure>

## 自分が使う言語に当てはめる

以下の判断はすべて Layer 1、つまりランタイムのバージョンに限った話である。

- **Python：**主権ツールはない。`pyenv`、`mise`、`uv`、システムの Python などが併存している。そのため Layer 1 は `mise`、Layer 2 は `uv` に任せている。構成は [Python の記事](/ja/posts/python/)で説明した。
- **Rust：**`rustup` が主権ツールである。私の Mac では `rustup` が Rust をインストールし、`mise` には任せない。
- **Node.js：**`nvm`、`fnm`、`volta`、`mise` が競合し、公式の答えはない。私は `mise` を使う。
- **Java：**主権ツールがなく、さらに複数のディストリビューションがある。私は `mise` を使い、デフォルトは Temurin にしている。プロジェクトごとにディストリビューション選びをやり直さずに済む、無難で中立的な選択だと思う。
- **Swift / iOS：**Apple が提供する Xcode がツールチェーン、SDK、ビルドシステムをまとめて所有している。macOS で別の管理ツールから Swift を入れるのはプラットフォームに逆らうようなものなので、完全に Xcode に任せる。
- **Go：**公式の選択肢はこのレイヤーを任せるには弱い。多くの利用者と同様、Go は `mise` に預けて問題ないと考えている。
- **Ruby：**`rbenv`、`rvm`、`chruby`、`mise` があり、主権ツールはない。Ruby が必要なときは `mise` でバージョンを管理する。

## `mise` はプロキシにもなれる

Rust を `rustup` に任せても、すべての操作で `rustup` を直接入力する必要はない。プロジェクトの `mise.toml` に Rust を書くこともできる。

```toml
# mise.toml
[tools]
rust = "1.78"
```

この場合、`mise` は Rust のツールチェーン管理を再実装せず、内部で `rustup` を呼び出す。私はこれを **`mise` のプロキシ運用**と考えている。共通の窓口は `mise` だが、ツールチェーンの所有者と信頼できる情報源は引き続き `rustup` である。

構成は二通り考えられる。

- **`rustup` を直接使う：**Rust だけのプロジェクトなら、統一すべき多言語環境はない。`rustup` を直接操作するのが簡単だ。
- **`mise` をプロジェクトの窓口にする：**すでに `mise.toml` で Python と Node を固定している多言語プロジェクトなら、`rust = "1.78"` も追加できる。`mise install` 一つでプロジェクト全体を準備しつつ、Rust の処理だけは `rustup` に委譲できる。

注意したいのは、同じプロジェクトで二つの運用を混ぜ、どちらのファイルが正しいのか分からなくなることだ。操作の窓口には `mise` と `rustup` のどちらも選べるが、Rust ツールチェーンの所有者は `rustup` のままでなければならない。

## 判断は将来変わり得る

Zig を初めて調べたときも、同じ基準を使った。当時はコミュニティーが合意した強力な公式管理ツールがなかったので、`mise` か単純な手動インストールで十分だった。Mojo も同じく、まだ若いエコシステムに当てはまる。Haskell は境界的な例で、GHCup は任せてもよいほど強力だ。Lua には合意されたツールがないため、`mise` が穴を埋める。

これは現在の判断であって、永久の割り当てではない。将来 Python が強力な公式管理ツールを出し、コミュニティーもそこへ収束したなら、私は Python を `mise` の管理から外す。今の `rustup` と同じ扱いに変えるはずだ。

[シリーズ最初の記事](/ja/posts/manifesto/)では、資源の種類ごとに所有者を一つだけ置くと定義した。今回の基準は、ランタイムバージョンの所有者を決めるためのものだ。[次の記事](/ja/posts/polyglot/)では、この判断を実際の構成に落とし込み、各言語の落とし穴、ロックファイル、`gitignore` パターンまで扱う。
