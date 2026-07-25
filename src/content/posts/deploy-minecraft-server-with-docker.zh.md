---
title: 使用 Docker 部署 Minecraft 服务器
published: 2026-01-15
tags: [Docker, Minecraft, Server]
category: Engineering
draft: false
lang: zh_CN
translationKey: deploy-minecraft-server-with-docker
---

最近想在 Mac 上开一个 Minecraft 服务器。

直接在服务器目录里运行 `./run.bash` 当然很简单，但一直把终端和 Java 进程挂在后台显然不太优雅。Screen 倒是可以把终端藏起来，不过它并不知道 Java 服务本身是什么情况。

既然 Docker 本来就很适合部署这些服务，我就想能不能顺便把 Minecraft 服务器也放进去。

然后很幸运地找到了 `itzg/minecraft-server`！

## 简介

GitHub 链接：

::github{repo="itzg/docker-minecraft-server"}

它的[文档](https://docker-minecraft-server.readthedocs.io/en/latest/)里有一段简单介绍：

> 这个 Docker 镜像会在启动时自动下载 Minecraft Server 的最新稳定版，也可以运行或升级到指定版本以及最新快照。更多信息可以查看 Versions 一节。
>
> 如果只想运行最新稳定版，可以使用：

```zsh
docker run -d -it -p 25565:25565 -e EULA=TRUE itzg/minecraft-server
```

> 这里会把标准服务器端口 `25565` 暴露到宿主机上。

## Docker Compose

我不太推荐直接用上面的命令运行镜像。和其他普通项目一样，用 Docker Compose 会方便得多。

官方给出的步骤是：

> 1. 新建一个目录
>
> 2. 把下面的内容保存为 `compose.yaml`
>
> 3. 在这个目录中运行 `docker compose up -d`
>
> 4. 完成！在客户端中输入宿主机的名称或 IP 地址以及端口 `25565` 即可连接。

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

> 修改 Compose 文件后，再运行一次 `docker compose up -d` 即可应用。
>
> `docker compose logs -f` 可以持续查看容器日志，`docker compose ps` 可以检查状态，`docker compose stop` 则会停止容器。

如果刚开始接触 Docker，可能会对 volumes 有点迷惑。其实很简单，目录大概可以长这样：

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

`Your-MC-Server-Folder` 里面的 `data` 就是放 Mod 和世界存档的地方。也可以先运行 Docker Compose，让容器自己生成这些数据，再把已有的数据移动进 `data`。

## Loader 和 Mod

只要修改 `compose.yaml` 中的变量，也可以直接启动带 Mod 的服务器。下面是我自己的配置。你也可以用 [SetupMC](https://setupmc.com/java-server/) 辅助生成一份。

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

顺便一提，`24454/udp` 是给 Mod“Simple Voice Chat”开的。这种情况下，还需要在 Simple Voice Chat 的配置中把 IP 改成 `0.0.0.0`。

## 然后……

玩得开心！
