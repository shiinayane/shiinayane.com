---
title: "一つの設計を、複数の言語で使う"
published: 2026-05-30
description: "同じ4層構造をNode、Java、Swift、Rust、Go、Rubyへ適用するための実践リファレンス。"
tags: [macos, mise, node, swift, rust, go]
category: Engineering
series: "sovereign-tools"
seriesOrder: 6
draft: false
lang: ja
translationKey: polyglot
---

慣れていない言語でプロジェクトを始めるとき、最初に知りたいことはだいたい決まっている。ランタイムは何で入れるのか、パッケージは何で管理するのか、どのロックファイルをgitに入れ、どの生成物を除外するのか。この記事では、Node、Java、Swift、Rust、Go、Rubyについて、その答えを一か所にまとめた。必要な章だけ読み返すためのリファレンスとして使う。

前提となるのは、[シリーズ最初の記事](/ja/posts/manifesto/)で導入した4層構造だ。

<figure class="my-6">
<svg viewBox="0 0 600 330" role="img" aria-labelledby="diagram-layers-title-6" style="width:100%;height:auto;color:inherit">
<title id="diagram-layers-title-6">The four-layer stack: System, Runtime version, Package manager, Project dependencies</title>
<g font-family="ui-sans-serif, system-ui, sans-serif">
<rect x="10" y="10" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="38" font-size="13" font-weight="700" fill="var(--primary)">Layer 3</text>
<text x="30" y="58" font-size="15" font-weight="600" fill="currentColor">Project dependencies</text>
<text x="570" y="44" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">lockfiles in git</text>
<rect x="10" y="86" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="114" font-size="13" font-weight="700" fill="var(--primary)">Layer 2</text>
<text x="30" y="134" font-size="15" font-weight="600" fill="currentColor">Package manager</text>
<text x="570" y="120" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">uv, pnpm, cargo</text>
<rect x="10" y="162" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
<text x="30" y="190" font-size="13" font-weight="700" fill="var(--primary)">Layer 1</text>
<text x="30" y="210" font-size="15" font-weight="600" fill="currentColor">Runtime version</text>
<text x="570" y="196" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">mise, or a sovereign tool</text>
<rect x="10" y="238" width="580" height="66" rx="10" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
<text x="30" y="266" font-size="13" font-weight="700" fill="var(--primary)">Layer 0</text>
<text x="30" y="286" font-size="15" font-weight="600" fill="currentColor">System</text>
<text x="570" y="272" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.6">Homebrew + Xcode CLT</text>
</g>
</svg>
</figure>

**Layer 1 — Runtime version** の担当は、[ツールの主権についての記事](/ja/posts/sovereignty/)で決めた基準に従う。言語に強力な公式ツールがあればそれに任せ、なければ `mise` を使う。以下では結論の理由を繰り返さず、実際の設定と、間違えやすい点に絞る。

## Node.js / TypeScript

Nodeには主権を持つバージョン管理ツールがないため、Nodeのバージョンは `mise` に任せる。パッケージマネージャーには `pnpm` を使うが、別途 `brew install` はせず、`corepack` から有効にする。こうすると、`package.json` の `packageManager` フィールドでプロジェクトごとに `pnpm` のバージョンを固定できる。

```toml
# mise.toml
[tools]
node = "22"

[settings]
# let corepack manage the pnpm version from package.json's packageManager field
```

```bash
corepack enable      # ships with Node; activates pnpm/yarn shims
```

`brew install node` も `brew install pnpm` も使わない。前者はLayer 1の所有権をHomebrewへ渡してしまい、後者はプロジェクト側のパッケージマネージャー固定を迂回してしまう。Nodeには別の仮想環境もいらない。`node_modules` がもともとプロジェクト単位なので、Pythonが `.venv` で得ている隔離は最初から存在する。

Node製のCLIを一度だけ実行するなら、通常は `pnpm dlx` を使う。継続的にインストールする必要がある場合は、`PATH` に追加した `PNPM_HOME` を明示的に管理し、`npm install -g` を無秩序に増やさない。

`pnpm-lock.yaml` はコミットし、次を除外する。

```text
node_modules/
*.tsbuildinfo
.turbo/
dist/
```

## Java

Javaには統一された主権バージョンツールがなく、JDKにも複数のディストリビューションがある。私は、中立的でよく保守されているTemurinを `mise` から入れている。

```toml
# mise.toml
[tools]
java = "temurin-21"
```

`java` が `PATH` に入っていることだけでなく、`mise` が `JAVA_HOME` を正しく設定しているかも確認する。Javaのツールには `JAVA_HOME` を直接読むものが多く、古いインストールの値が残っていると、意図したJDKよりそちらが静かに優先される。`mise where java` と `echo $JAVA_HOME` は同じ場所を指すべきだ。

```bash
mise where java
echo $JAVA_HOME
```

ビルドには、グローバルなGradleやMavenではなく、リポジトリに含まれる `./gradlew` または `./mvnw` を使う。wrapperはビルドツールのバージョンをリポジトリ内で固定する。通常の依存関係だけでなく、ビルドツールにもLayer 3と同じ考え方を適用できる。

Androidは別扱いでよい。Android Studioは自身のJDKとSDKを同梱しているため、SwiftをXcodeに任せるのと同様に、その環境はAndroid Studioに任せる。

GradleとMavenはビルドファイルで依存関係を宣言する。ビルドファイルとwrapperはコミットし、出力は除外する。

```text
.gradle/
build/
target/
```

## Swift / iOS

macOSにおけるSwiftの主権ツールはXcodeだ。Xcodeは **Layer 0 — System** と **Layer 1 — Runtime version** の両方をまたぎ、ツールチェーン、SDK、ビルドシステムを一つのアプリとして提供する。私はMac App StoreからXcodeを入れているため、[アプリ管理の記事](/ja/posts/apps/)では `mas` の担当にしている。依存関係にはSwift Package Managerを優先する。

macOSで `brew install swift` はしない。ツールチェーンの所有者が二つに増える一方で、ビルドの別の部分は引き続きXcodeが握るため、分かりにくい競合が起きる。CocoaPodsも、多くの新しいプロジェクトでは不要になったRuby依存を追加する。必要なパッケージがSPMに対応していれば、依存関係の管理をAppleのツールチェーン内で完結できる。

自分のプロジェクトには、うまく機能している境界の例がある。KotobaLabはSwift、付属するDictionaryBuilderはPythonで書かれている。二つはランタイムもパッケージマネージャーもビルドシステムも共有せず、一つのSQLiteファイルだけで接続する。DictionaryBuilderがデータベースを書き、KotobaLabが読む。中立なデータインターフェースを挟むことで、どちらのツールチェーンも相手の内部を知る必要がない。

SPMのロックファイルである `Package.resolved` はコミットする。ユーザー固有のファイルとビルド生成物は除外する。

```text
xcuserdata/
DerivedData/
.build/
*.xcuserstate
```

## Rust

この中では、Rustの所有関係が最も単純だ。`rustup` がLayer 1を持ち、同梱される `cargo` がLayer 2に加えて、ビルド、テスト、依存関係の管理、公開まで担当する。

```bash
# rustup installs the toolchain; cargo comes with it
rustup default stable
```

多言語リポジトリにすでに `mise.toml` がある場合は、そこへ `rust = "1.78"` と書き、`mise` から `rustup` へ委譲してもよい。[ツールの主権についての記事](/ja/posts/sovereignty/)で説明した **mise as proxy** の形だ。どちらでも動くが、同じプロジェクトのRustを両方から管理してはいけない。

Cargoは依存関係をプロジェクト単位で扱うため、Rustに仮想環境は必要ない。`ripgrep`、`fd`、`bat` のようにRustで書かれたグローバルCLIには、`brew` のformulaを選ぶ。Homebrewならビルド済みのバイナリが入るが、`cargo install` はソースからコンパイルする。まだパッケージ化されていないツールにだけ `cargo install` を使えばよい。

アプリケーションやバイナリでは `Cargo.lock` をコミットする。ライブラリでは、利用側が自分でバージョンを解決できるよう、コミットしないのが長年の慣例だ。次を除外する。

```text
/target/
```

## Go

Go公式の `dl` インストーラーは強力なバージョン管理ツールとはいえないので、Goのバージョンは `mise` に任せている。

```toml
# mise.toml
[tools]
go = "1.23"
```

現在のGoはmodulesを使うため、昔の `GOPATH` ワークスペース配置は不要で、プロジェクトをディスク上の好きな場所に置ける。一方、`go install` の出力先は管理したいので `GOBIN` を設定する。私は、すでに `PATH` に追加してある `~/.local/bin` を使っている。[Pythonの記事](/ja/posts/python/)で個人用スクリプトを置いた場所と同じだ。

```zsh
# 00-env.zsh
export GOBIN="$HOME/.local/bin"
```

依存関係を宣言する `go.mod` と、チェックサムを固定する `go.sum` は両方コミットする。Goのプロジェクトには細かな生成物があまり残らない。ビルドしたバイナリを名前で除外するか、除外済みの出力ディレクトリへまとめればよい。

## Ruby

Rubyには主権バージョンツールがないので、Layer 1は `mise` に任せられる。ただし、実際にRubyを必要とするプロジェクトができたときだけインストールする。

macOSに付属するシステムRubyをプロジェクトの依存関係に使ってはいけない。古いうえ、Appleも変更を推奨していない。そこへ `sudo gem install` すると、システム環境を壊す典型的な原因になる。

```toml
# mise.toml — only when a project genuinely needs it
[tools]
ruby = "3.3"
```

macOSの開発者がRubyを入れる理由としてCocoaPodsは今もよくあるが、多くのSwiftプロジェクトではSPMによって不要になった。SPMで足りるなら、Rubyは入れなくてよい。これは[メンテナンスの記事](/ja/posts/maintenance/)で扱った、必要になってから導入する方針にも合う。システムRubyが古いからといって、RubyプロジェクトのないMacへ急いで `mise` 管理のRubyを追加する理由にはならない。

Rubyを使う場合は `Gemfile.lock` をコミットする。Bundlerのローカルパスを `vendor/bundle/` などに設定したなら、そのディレクトリは除外する。

## 言語が変わっても同じこと

ランタイムのバージョンは、各開発者のグローバルな初期値ではなく、リポジトリ側で宣言する。`mise.toml` または `.tool-versions` をコミットしておけば、新しくcloneした環境でも `mise install` で必要なバージョンを用意できる。グローバルな初期値は一時的な作業用として残せる。

ロックファイルはgitに入れ、派生物は入れない。`pnpm-lock.yaml`、`Cargo.lock`、`go.sum`、`Package.resolved`、`uv.lock`、`Gemfile.lock` をコミットし、`node_modules`、`target/`、`DerivedData/`、`.venv` などは `.gitignore` に入れる。

一つの `mise.toml` に `node`、`python`、`go` をまとめて書ける。多言語プロジェクトだからといって、言語ごとにランタイム設定を分ける必要はない。一つのコマンドで全体を用意でき、実際の管理を一部の主権ツールへ委譲する場合にも、統一された入口には意味がある。

同じ事実を複数の層で重複宣言してはいけない。ただし、似て見える設定が別の意味を持つことはある。Pythonでは、`pyproject.toml` の `requires-python` はコードが対応するバージョン範囲を示し、`mise.toml` はそのマシンで使う一つのバージョンを選ぶ。両方を残すのは重複ではなく、まとめると情報が失われる。本当の重複は一つの事実に二つの情報源を作ってしまう。これは[シリーズ最初の記事](/ja/posts/manifesto/)で避けようとした問題そのものだ。

このモデルが適用できない領域もある。CとC++には「Cのバージョン」を所有する同種のツールがなく、システムコンパイラ、SDK、さまざまなビルドシステムが層を曖昧にする。私は無理に同じ形へ押し込めない。ネイティブ拡張やビルド依存として現れた場合は、それを必要とした上位のツールに処理を任せている。

[シリーズ最後の記事](/ja/posts/maintenance/)では、この設定を終えた後、メンテナンスそのものを新しいプロジェクトにせず、環境を使える状態に保つ方法を扱う。
