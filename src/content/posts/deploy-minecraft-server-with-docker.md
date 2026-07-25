---
title: Use Docker to Deploy a Minecraft server
published: 2026-01-15
tags: [Docker, Minecraft, Server]
category: Engineering
draft: false
lang: en
translationKey: deploy-minecraft-server-with-docker
---

Recently, I wanted to start a Minecraft server on my Mac. It’s quite simple to run `./run.bash` in the server directory, but obviously not elegant enough since you have to keep the terminal and Java process running in the background. Screen can hide the terminal, but it has no idea about the Java service itself.
  
Docker is a powerful tool for deploying complicated services on almost any device. So I wondered if I could use Docker for the Minecraft server too.
  
And luckily, we have `itzg/minecraft-server`!
  
## Intro

The GitHub link:

::github{repo="itzg/docker-minecraft-server"}

Here is a simple introduction from its [documentation](https://docker-minecraft-server.readthedocs.io/en/latest/):
  
> This docker image provides a Minecraft Server that will automatically download the latest stable version at startup. You can also run/upgrade to any specific version or the latest snapshot. See the Versions section below for more information.  
>
> To simply use the latest stable version, run

```zsh
docker run -d -it -p 25565:25565 -e EULA=TRUE itzg/minecraft-server
```

> where, in this case, the standard server port 25565 will be exposed on your host machine.  
  
## Docker Compose

I do not recommend running the image directly with the command above. Docker Compose is a better method, just like for other usual projects.

Here are the official instructions.
  
> 1. Create a new directory  
>
> 2. Put the contents of the file below in a file called `compose.yaml`  
>
> 3. Run `docker compose up -d` in that directory  
>
> 4. Done! Point your client at your host's name/IP address and port 25565.  
>
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

> To apply changes made to the compose file, just run `docker compose up -d` again.  
>
> Follow the logs of the container using `docker compose logs -f`, check on the status with `docker compose ps`, and stop the container using `docker compose stop`.
  
If you are new to Docker, volumes may be a little confusing. Well, they are actually quite simple. One possible directory structure looks like this:
  
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
  
The `data` folder inside `Your-MC-Server-Folder` is where you put all the mods and world data. Of course, you can also run Docker Compose first and let the container generate the data by itself, or just move your existing data into `data`.
  
## Loader and mods

Starting a modded server is also possible by changing the variables in `compose.yaml`. Here is my own configuration. You can use [SetupMC](https://setupmc.com/java-server/) to help generate yours.
  
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

Btw, port `24454/udp` is open because of the mod “Simple Voice Chat.” In this situation, you also need to change the IP to `0.0.0.0` in the Simple Voice Chat config.
  
## And…

Have fun!  
