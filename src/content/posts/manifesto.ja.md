---
title: "Macの開発環境を四つの層で作り直した"
published: 2026-05-30
description: "DFUからの再セットアップを機に、開発環境の各要素をどのツールに任せ、どう復元するかを整理した。"
tags: [macos, mise, dotfiles, devenv]
category: Engineering
series: "sovereign-tools"
seriesOrder: 1
draft: false
lang: ja
translationKey: manifesto
---

数週間前、Mac miniをDFUモードに入れて、すべて消去した。DFU（Device Firmware Update）は、そのMac自身には動作するOSがなく、別のMacからシステムを書き込まれるのを待っている状態だ。

きっかけは、なかなか直らない問題だった。ただ、単純にもう一度きれいな環境を作りたかったのも事実だ。ソフトウェアを入れ直すだけの退屈な午後になると思っていたが、その前に「きれいな開発環境とは何か」を決める必要があった。

以前は、インストールするツールを減らせばよいと思っていた。しかし、そのような最小構成は半年もすると崩れた。内容を思い出せない`~/.zshrc`、自分で選んだ覚えのない三つのPython、置かれるべきでない場所に残った2023年の`pip install`。ツールの数よりも、何をどれが管理しているのか分からないことのほうが問題だった。

この記事は全7本のシリーズの1本目にあたる。残りの6本で個別のツールを扱う前に、再セットアップで採用した四層構造をここにまとめておく。

## 普通のインストールを重ねた結果

環境は、一度の極端な操作で壊れるとは限らない。

Pythonが必要になり、手近なHomebrewで`brew install python`を実行する。別のバージョンが必要なプロジェクトのために`pyenv`を追加し、Nodeの案件で`nvm`、Rubyで`rbenv`も入れる。それぞれのインストーラーが`~/.zshrc`に数行ずつ追記するが、気付かないことも多い。さらに`pip install --user`を使うと、別のツールが想定していない場所のパッケージが先に読まれることがある。

一つずつ見れば、どれも不自然な判断ではない。困るのは、`python`と入力したときに、どのPythonがなぜ実行されるのかを自分のMacで調査しなければならなくなったときだ。

その答えが、現在の`PATH`の偶然ではなく、構成から決まる状態にしたかった。

## 四つの層

Mac miniの環境を、システムからリポジトリ内の依存関係まで四つに分けた。

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

**Layer 0 — System.** HomebrewとXcode Command Line Toolsが、コマンドラインツールとGUIアプリケーションをインストールする。言語のランタイムは入れない。HomebrewにPythonまで管理させた時点で、Layer 0が次の層に入り込む。

**Layer 1 — Runtime version.** Python 3.14やNode 22など、使用するインタープリターやコンパイラーのバージョンを選ぶ層。通常は`mise`に任せ、現在いるプロジェクトのディレクトリに応じてランタイムを切り替える。

**Layer 2 — Package manager.** Pythonでは`uv`、Nodeでは`pnpm`、Rustでは`cargo`を使う。選ばれたランタイムの中にパッケージをインストールするツールであり、ランタイムのバージョンは選ばない。

**Layer 3 — Project dependencies.** ManifestとLockfileはリポジトリに置く。たとえば`pyproject.toml`と`uv.lock`、または`package.json`と`pnpm-lock.yaml`である。別のマシンでも、これらのファイルから同じ依存関係を再現できるようにする。

依存する方向も重要になる。プロジェクトの依存関係はPackage Managerを使い、Package ManagerはRuntimeに依存し、RuntimeはSystemの上で動く。各ツールは自分の層を担当し、上下の層まで暗黙に管理しない。

## 一種類につき一つの管理元

実際に守っているのは、同じ種類のものを複数のツールに管理させない、というルールだ。

Runtime versionの管理元は一つ、プロジェクトのLibraryも一つ、System applicationも一つにする。Pythonがどこから来たか、依存バージョンを何が固定しているか、なぜそのアプリが入っているかを知りたいとき、確認する場所が一つに決まる。

そのため、ツールの総数を減らしてもあまり意味はなかった。二つのツールがどちらもPythonを管理しようとする環境より、五つのツールが別々の役割を持つ環境のほうが追いやすい。

Layer 1の管理元は、常に`mise`というわけでもない。Rustには`rustup`があり、SwiftにはXcodeがある。どちらも言語のエコシステム自身が提供する、十分に強い公式のToolchain Managerだ。このようなツールがある場合は、`mise`を前に置かず、RuntimeとToolchainを公式ツールに直接任せる。この判断方法はシリーズの5本目で扱う。

つまりSingle Source of Truthは特定の製品名ではなく、管理元が重ならない状態を指している。ツールが入れ替わっても、この分担は残せる。

## 復元できるかで確かめる

消去を経験してからは、復元可能かどうかを環境のチェックに使っている。

キャッシュとビルド生成物をすべて削除して、つまりまとめて`rm -rf`しても、マシン上のどのプロジェクトも一つのコマンドで再ビルドできる状態が理想だ。それができれば、キャッシュは本当に捨てられる。できなければ、「生成物」と思っていた場所が、宣言されていない状態を抱えている。どのSource of Truthが欠けているのかを探し、層の分担を直す。

保存すべき宣言はManifest、Lockfile、Dotfilesにある。ほぼ何もない状態からでも、それらを使って実際に動く環境を戻せるようにする。普段の調査でも、いきなり`PATH`を追う前に、どのツールを確認すべきか分かる。

この構成には前提がある。一人のユーザーが全体を管理できるmacOS向けの環境であり、チーム、共有サーバー、制限の多い会社支給Mac、ほかのOSでは判断が大きく変わり得る。`mise`と`uv`も比較的新しいため、将来は別のツールに置き換わるかもしれない。どこでも通用する規則ではなく、私がこの構成を使っている条件である。

## 続く六つの記事

残りの記事では、環境の各部分を順に扱う。

- **`.zshrc`に詰め込まないDotfiles**：`ZDOTDIR`と`chezmoi`でShell設定を宣言的に管理し、差分を見えるようにして、Home directoryを設定置き場にしない。
- **Brewfileという妥協**：System layerではEventual Consistencyを許容する理由と、厳密であるかのように装わずReconcileで状態を保つ方法。
- **Python、mise、uv**：`uv`が`mise`の裏で独自のPythonをインストールする衝突と、それを解消する一つの設定。
- **公式ツールを優先するとき**：Layer 1を`mise`ではなく、言語自身のVersion Managerに任せるための判断基準。
- **一つの構造を複数の言語へ**：同じ四層をNode、Java、Swift、Rust、Go、Rubyに当てはめる。
- **設定よりも維持が難しい**：Health Check、不要なものを減らす習慣、長く使ったあとも環境を理解できる状態に保つ作業。

[シリーズ一覧](/ja/series/sovereign-tools/)に、全記事の順番と現在の公開状況を載せている。
