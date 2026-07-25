---
title: "mise と uv が同じ Python を使うようにする"
published: 2026-05-30
description: "uv が mise の知らない Python をインストールしていた。python-preference を only-system に変えると管理元は一つに戻るが、既存プロジェクトにも影響がある。"
tags: [macos, python, uv, mise]
category: Engineering
series: "sovereign-tools"
seriesOrder: 4
draft: false
lang: ja
translationKey: python
---

同じコマンドを二つのディレクトリで実行したところ、異なるバージョンが返ってきた。

```bash
$ cd ~/project && uv run python --version
Python 3.12.7
$ cd ~ && uv run python --version
Python 3.13.1
```

プロジェクトごとにランタイムを固定できるので、最初の結果はおかしくない。気になったのはホームディレクトリで現れた Python 3.13.1 だった。自分でインストールした覚えがなく、ランタイムのバージョン管理を任せている `mise` もこのバージョンを認識していない。このシリーズの[最初の記事](/ja/posts/manifesto/)で書いた構成では、マシンに存在する Python は `mise` だけが決めるはずだった。

## もう一つの Python を探す

まず、それぞれの場面で `python` が何を指しているか確認した。シェルと `uv run` は別の実行ファイルを使っていた。

```bash
$ which python
/Users/me/.local/share/mise/installs/python/3.12.7/bin/python
$ uv run python -c 'import sys; print(sys.executable)'
/Users/me/.local/share/uv/python/cpython-3.13.1-macos-aarch64-none/bin/python3.13
```

シェルが見つけたのは、`mise` がインストールして `PATH` に置いたインタープリタだった。一方、バージョンを固定したプロジェクトの外では、`uv run` は `~/.local/share/uv/python` 以下を選んでいる。自分で用意した覚えのないディレクトリだ。

`uv` がインストール済みと判断しているものを一覧にすると、二つの出所がはっきりした。

```bash
$ uv python list --only-installed
cpython-3.13.1-macos-aarch64-none    /Users/me/.local/share/uv/python/cpython-3.13.1-.../bin/python3.13
cpython-3.12.7-macos-aarch64-none    /Users/me/.local/share/mise/installs/python/3.12.7/bin/python3.12
```

実際に別々の CPython ビルドが存在していた。`readlink -f` で実体をたどっても、同じバイナリへの別名ではない。一方は `mise` が所有し、もう一方は `uv` がダウンロードして自身のディレクトリに保存したものだった。

これは `uv` のバグではなく、デフォルトの動作である。`python-preference` の初期値は `managed` で、uv 管理の Python を優先し、利用できるインタープリタがプロジェクトの `requires-python` を満たさなければ自動でダウンロードする。ランタイムもパッケージも `uv` に任せるなら便利だが、Python のバージョンを `mise` だけで管理したい自分の構成とは衝突する。

## インタープリタ、仮想環境、キャッシュ

設定を変える前に、「隠しディレクトリにある Python 関係のファイル」に見える三つを分けて考えた。それぞれ役割も寿命も管理元も違う。

<figure class="my-6">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="diagram-factory-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-factory-title">設計図、サンプル、共有ライブラリ：mise のインストール、.venv、uv のキャッシュ</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- Blueprint -->
    <rect x="10" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="100" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">設計図</text>
    <text x="100" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">mise install</text>
    <text x="100" y="116" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">python 3.14.0</text>
    <text x="100" y="150" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">バージョンごとに</text>
    <text x="100" y="168" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">完全なインタープリタ一式</text>
    <text x="100" y="200" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">複数バージョンが</text>
    <text x="100" y="218" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">共存できる</text>
    <!-- Sample unit -->
    <rect x="230" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="320" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">サンプル</text>
    <text x="320" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">project/.venv</text>
    <text x="320" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">bin/python → シンボリックリンク</text>
    <text x="320" y="142" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">設計図を参照</text>
    <text x="320" y="186" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">site-packages =</text>
    <text x="320" y="204" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">唯一のプロジェクト固有部分</text>
    <!-- Shared library -->
    <rect x="450" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="540" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">共有ライブラリ</text>
    <text x="540" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">uv cache</text>
    <text x="540" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">コンテンツアドレス方式</text>
    <text x="540" y="160" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">各パッケージを一度だけ保存</text>
    <text x="540" y="178" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">すべてのプロジェクトで</text>
    <text x="540" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">共有</text>
    <!-- arrows -->
    <text x="210" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">←</text>
    <text x="210" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">シンボリックリンク</text>
    <text x="430" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <text x="430" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">リンク</text>
  </g>
</svg>
</figure>

`mise install python@3.14` で入るバージョンは**設計図**と考えると分かりやすい。バージョン番号ごとに完全なインタープリタが一つあり、`mise` のインストールディレクトリでは複数のバージョンが共存できる。3.12.7 と 3.14.0 は互いに干渉しない二つの設計図である。

プロジェクトの **`.venv`** は、そこから作る**サンプル**に当たる。仮想環境の大部分はシンボリックリンクで、`bin/python` は Python をもう一式コピーするのではなく、元のインタープリタを参照する。実際にプロジェクト固有なのは `site-packages` だ。そのため `.venv` は小さく、すぐ作れる。ただし `mise` 管理の Python を削除すると、それを参照する仮想環境はすべて壊れる。

**uv のキャッシュ**は共有ライブラリである。コンテンツアドレス方式で、同じバージョンのパッケージを一度だけ保存し、コピーする代わりに各プロジェクトの `site-packages` へリンクする。十個のプロジェクトが同じバージョンの `numpy` を使うなら、キャッシュ上の一つを共有できる。何度もダウンロードして展開せず、リンクを作るだけで済むことが `uv` の速さにつながっている。

この分担なら、`mise` がインタープリタを用意し、`uv` がそれを使ってプロジェクト環境を作り、パッケージキャッシュから依存関係を配置する。`uv` まで別のインタープリタを用意する必要はない。

## uv をシステム Python に限定する

`uv` は `~/.config/uv/uv.toml` からグローバル設定を読み込む。追加したのは一行だけだった。

```toml
# ~/.config/uv/uv.toml
python-preference = "only-system"
```

`python-preference` には四つの値がある。

- `only-managed` は uv 管理の Python だけを使い、システムのインタープリタを無視する。システムから最も強く分離できる一方、`mise` が所有する構成からは最も遠い。
- `managed` はデフォルト値で、uv 管理の Python を優先し、次にシステム Python を使う。どちらも `requires-python` を満たさなければ uv 管理のものをダウンロードする。今回の予期しないインストールはこれが原因だった。
- `system` は `PATH` 上の Python を優先するが、適切なものがなければ uv 管理のインタープリタをダウンロードできる。
- `only-system` は `mise` が `PATH` に置いたものを含むシステム Python だけを使い、自動ダウンロードはしない。条件を満たすものがなければエラーになる。

自分の環境では、最後のエラーが役に立つ。足りないバージョンは、`mise` で明示的にインストールするまで不足したまま見える。`mise` を優先しつつ `uv` のフォールバックも残したい場合は、より緩い `system` を選べばよい。

設定を変更した後、`uv` が入れた Python 3.13.1 を削除し、影響を受けた環境を作り直した。

```bash
$ uv python uninstall 3.13.1
$ cd ~/project && rm -rf .venv && uv sync
```

これで `uv run python` とシェルの `python` は、どちらも `mise` 管理のインタープリタを使うようになった。

## 変更後に既存プロジェクトが失敗する場合

グローバルな選択規則を変えると、以前の規則で作った環境にも影響する。古いプロジェクトの中には、`mise.toml` で指定している Python をすでに `mise` から削除してしまったものがあった。以前なら `uv sync` が不足したバージョンを自動でダウンロードして先へ進めたが、`only-system` では止まる。

```text
error: No interpreter found for Python 3.11 in system path
```

このエラーは、プロジェクトが要求する Python 3.11 がマシンにないという意味だ。修復も明示的に行う。

```bash
$ mise install python@3.11   # provision the blueprint, deliberately
$ uv sync                    # now succeeds, using mise's Python
```

古いプロジェクトを再び開くときは、次の点を確認している。

1. `pyproject.toml` の `requires-python` と、`mise.toml` で固定したバージョンを読む。
2. インタープリタがなければ `mise install` を実行する。
3. `rm -rf .venv && uv sync` で、インストール済みのインタープリタを参照する環境に作り直す。
4. `uv run python --version` で想定したバージョンか確認する。

デフォルト設定なら暗黙に解決していた不足に対して、`mise install` を一度実行する手間が増える。自分は不一致が見えるほうを選んだが、厳密さにもコストはある。

また、[dotfiles の記事](/ja/posts/dotfiles/)で扱った他の設定と同じように、`uv.toml` も chezmoi のソースリポジトリへ入れている。別のマシンでも同じ規則を再現するためだ。

## 小さなスクリプトならプロジェクトは要らない

`httpx` を使う40行程度のスクリプトのために、`pyproject.toml`、`.venv`、ロックファイルまで用意するのは重い。`uv` にはもっと軽い方法があり、どちらも `only-system` に従う。

一度だけ実行するなら、`--with` で一時環境に依存パッケージを追加できる。

```bash
$ uv run --with httpx --with rich script.py
```

残しておきたいスクリプトには PEP 723 のメタデータを使い、必要な Python と依存関係をファイル内に記録できる。

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "rich"]
# ///
import httpx
from rich import print
print(httpx.get("https://example.com").status_code)
```

`uv run script.py` を実行すると、`uv` はこのメタデータを読み、キャッシュから環境を組み立ててスクリプトを起動する。プロジェクト用の `.venv` は要らない。さらに `uv` の shebang を付けて `chmod +x` を実行し、`~/.local/bin` などへ置けば、依存関係をファイル内に残したまま通常の `PATH` 上のコマンドとして使える。以前は個人用ツールを `pip install` でグローバルなインタープリタへ入れ、後から存在を忘れることが多かったので、こちらのほうが扱いやすい。

Python 製のコマンドラインツールは、それぞれ分離されたツール環境に置く。継続してインストールするなら `uv tool install`、一度だけ実行するなら `uvx` が使える。`ruff` や `httpie` の置き場所として、グローバルな `pip install` より適している。

`mise` を使わないなら、Python とパッケージの両方を `uv` に任せても一貫しており、デフォルトの `managed` がそのまま合うこともある。今回の問題は、二つのツールが同時にランタイムを決めていたことだった。[次の記事](/ja/posts/sovereignty/)では、どんな場合にその層を公式ツールへ任せるかを扱う。
