---
title: DockerでMinecraftサーバーを構築する
published: 2026-01-15
tags: [Docker, Minecraft, Server]
category: Engineering
draft: false
lang: ja
translationKey: deploy-minecraft-server-with-docker
---

最近、MacでMinecraftサーバーを立てたくなりました。

サーバーのディレクトリで`./run.bash`を実行するだけなら簡単ですが、ターミナルとJavaプロセスをずっとバックグラウンドで動かしておくのは、さすがにあまりスマートではありません。Screenを使えばターミナルは隠せますが、Javaサービス自体の状態までは管理してくれません。

Dockerならこういうサービスも簡単にデプロイできるので、Minecraftサーバーにも使えないかと思って調べてみました。

そして運よく、`itzg/minecraft-server`がありました！

## 概要

GitHubはこちら：

::github{repo="itzg/docker-minecraft-server"}

[ドキュメント](https://docker-minecraft-server.readthedocs.io/en/latest/)には、次のように紹介されています。

> このDockerイメージは、起動時にMinecraft Serverの最新安定版を自動でダウンロードします。特定のバージョンや最新スナップショットを実行したり、アップグレードしたりすることもできます。詳しくはVersionsのセクションを参照してください。
>
> 最新の安定版を使うだけなら、次のコマンドを実行します。

```zsh
docker run -d -it -p 25565:25565 -e EULA=TRUE itzg/minecraft-server
```

> この場合、標準のサーバーポート`25565`がホスト側に公開されます。

## Docker Compose

上のコマンドで直接イメージを起動するより、ほかの一般的なプロジェクトと同じくDocker Composeを使うほうがおすすめです。

公式の手順は次のとおりです。

> 1. 新しいディレクトリを作成する
>
> 2. 下の内容を`compose.yaml`というファイル名で保存する
>
> 3. そのディレクトリで`docker compose up -d`を実行する
>
> 4. 完了！クライアントからホスト名またはIPアドレスとポート`25565`を指定して接続する

```yaml
# docker.yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    pull_policy: daily
    tty: true
    stdin_open: true
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
    volumes:
      # attach the relative directory 'data' to the container's /data path
      - ./data:/data
```

> Composeファイルを変更した後は、もう一度`docker compose up -d`を実行すれば反映されます。
>
> `docker compose logs -f`でログを追い、`docker compose ps`で状態を確認し、`docker compose stop`でコンテナを停止できます。

Dockerを使い始めたばかりだと、volumesが少し分かりにくいかもしれません。実際はそれほど複雑ではなく、ディレクトリ構成は例えば次のようになります。

```plain
Your-MC-Server-Folder
├── data
│   ├── config
│   ├── eula.txt
│   ├── kubejs
│   ├── mods
│   ├── server.properties
│   └── world
└── docker-compose.yml
```

`Your-MC-Server-Folder`の中にある`data`が、Modやワールドデータを置く場所です。先にDocker Composeを実行してコンテナ側でデータを生成してもいいですし、既存のデータを`data`へ移動しても構いません。

## LoaderとMod

`compose.yaml`の変数を変更するだけで、Mod入りのサーバーも起動できます。以下は自分が使っている設定です。[SetupMC](https://setupmc.com/java-server/)を使って設定を生成することもできます。

```yaml
services:
  mc:
    image: itzg/minecraft-server:latest
    tty: true
    stdin_open: true
    ports:
      - "25565:25565"
      - "24454:24454/udp"
    environment:
      EULA: "TRUE"
      TYPE: "NEOFORGE"
      VERSION: "1.21.1"
      INIT_MEMORY: "4G"
      MAX_MEMORY: "12G"
      MOTD: "A Minecraft Server"
      TZ: "Asia/Tokyo"
      DIFFICULTY: "hard"
    volumes:
      - "./data:/data"

```

ちなみに、`24454/udp`はMod「Simple Voice Chat」のために開けています。この場合、Simple Voice Chatの設定でもIPを`0.0.0.0`に変更する必要があります。

## それでは……

楽しんで！
