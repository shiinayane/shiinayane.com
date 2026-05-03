---
title: Use Docker to Deploy a Minecraft server
published: 2026-01-15
tags: [English, Docker, Game]
category: Game
draft: false
---

Recently, I wanted to start a Minecraft server on my Mac. It’s quite simple to run `./run.bash` in the server directory, but obviously not elegant enough since you have to keep the terminal and Java interface running in the background. Besides, though, Screen can hide the terminal, but it has no idea of the Java service.  
  
We all know that Docker is a powerful tool to deploy any complicated image on every single device. Therefore, I wondered if I could take full advantage of Docker in part of the Minecraft server.  
  
And luckily, we have itzg/minecraft-server!  
  
## Intro

The GitHub link: [<i class="fa-brands fa-github"></i>itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server)  
Some simple intro from its doc ([https://docker-minecraft-server.readthedocs.io/en/latest/](https://docker-minecraft-server.readthedocs.io/en/latest/)):  
  
> This docker image provides a Minecraft Server that will automatically download the latest stable version at startup. You can also run/upgrade to any specific version or the latest snapshot. See the Versions section below for more information.  
>
> To simply use the latest stable version, run

```zsh
docker run -d -it -p 25565:25565 -e EULA=TRUE itzg/minecraft-server
```

> where, in this case, the standard server port 25565 will be exposed on your host machine.  
  
## Docker compose

I do not recommend you to directly run this image with the command above. Instead, Docker compose is the best method like other usual projects.  
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
> Follow the logs of the container using `docker compose logs -f`, check on the status with docker compose ps, and stop the container using docker compose stop.  
  
If you are a beginner of Docker, you may be confused about the volumes. Well, it’s actually quite simple; you can look at one possible structure below.  
  
```tree
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
  
Obviously, the `/data` folder inside `/Your-MC-Server-Folder` is the place where you need to put all the mods and world into. Of course, you can use docker compose command to let docker generate these data by itself. Also, you could just move your existing data into the `/data`.
  
## Loader and Mod

Starting a modded server is also possible by just changing the variables in the `compose.yaml`. I will show you my own one. You can use this website [https://setupmc.com/java-server/](https://setupmc.com/java-server/) to assist you in generating your own config.  
  
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

Btw, port open to 24454 due to the mod ‘Simple Voice Chat’. In this situation, you also need to change the ip to `0.0.0.0` in the Simple Voice Chat config.  
  
## And…

Have fun!  
