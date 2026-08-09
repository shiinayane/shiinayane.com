---
title: "在 macOS 上实现一个原生弹幕渲染器"
published: 2026-08-10
description: "从分段调度、播放器时间轴和轨道防碰撞，到 CATextLayer spike、生命周期治理与 Metal 的性能边界。"
tags: [Swift, macOS, Core Animation, Danmaku]
category: Engineering
draft: false
lang: zh_CN
translationKey: native-danmaku-renderer
---

BiliKit 的弹幕模块目前有 1852 行 Swift，配套测试反而有 2802 行。

它现在支持滚动、顶部和底部三种基础弹幕，能跟随播放、暂停、倍速和 Seek，处理分段加载、轨道碰撞、窗口尺寸变化，以及速度、透明度、显示区域和密度设置。

一开始我觉得弹幕应该不难：拿到文字，放到播放器上方，再让它从右往左移动。

实际写下来，画字只是最后一步。前面还有数据什么时候加载、弹幕按照哪个时间轴出现、两条不同速度的弹幕会不会追尾、Seek 之后旧动画怎么清理，以及几百个文本 layer 同时存在时系统还能不能正常合成。

## 先把数据、调度和渲染分开

BiliKit 里的弹幕链路大致是这样：

```text
Protobuf Segment
    ↓
DanmakuSession
    ↓
DanmakuScheduler
    ↓
DanmakuPresentationController
    ↓
DanmakuLaneAllocator
    ↓
CoreAnimationDanmakuRenderer
    ↓
AVPlayerView.contentOverlayView
```

远端弹幕按六分钟一段返回。Session 会加载当前分段和下一分段，同时最多发出两个请求，内存里最多保留三个分段。

解码阶段也有自己的限制。目前单段最多接受 20,000 条事件、总正文最多 1,000,000 个字符，单条正文最多 4096 个字符。进入 Renderer 前还会再收紧一次，超过 512 个 UTF-16 code unit 的文字直接拒绝。

这些限制主要是为了保证资源有上限。弹幕正文最终要进入 Core Text 和 Core Animation，如果直接相信远端长度，一个异常分段就可能在主线程上制造大量文字排版和 layer 分配。

## 弹幕使用播放器的时间轴

弹幕没有自己的 Timer。

播放器会提供包含以下信息的时间快照：

```swift
PlaybackTimelineSnapshot(
    identity: ...,
    positionSeconds: ...,
    rate: ...,
    state: ...,
    discontinuityGeneration: ...
)
```

Scheduler 每次只处理两个连续快照之间第一次出现的事件，也就是：

```text
(previousPosition, currentPosition]
```

暂停时没有新事件进入。倍速播放时，媒体时间自然变快。向前 Seek 不会把跨过的几分钟弹幕突然全部补出来；时间发生不连续后，当前内容会被清空，再从新的位置继续。

这一点对后面的 Renderer 很重要。假如弹幕使用独立的 wall-clock Timer，暂停、缓冲和倍速都要自己补偿，AVPlayer 和弹幕很容易逐渐跑成两套时间。

现在滚动动画本身仍由 Core Animation 执行，但整个 root layer 的局部时间会跟随播放器速率。暂停时把 `speed` 设为 0，同时保存 `timeOffset`；恢复或者调整倍速时，再从原来的局部时间继续。

这样不用在每一帧手动修改几百条弹幕的位置。

## Renderer 选型走过一点弯路

M4.4 开始时，我先做了一个不可合入的 spike。

最初准备比较两条路线：

- 可复用的 `CATextLayer`
- layer-backed `NSTextField`

两边使用相同的 `NSAttributedString`、Core Text 测量结果和 Core Animation 位移动画，再比较帧间隔、内存和生命周期。

为了让结果足够“可信”，第一版 spike contract 塞进了三个随机种子、六档事件速率、多个窗口尺寸、全屏、反复 Resize、外部 watchdog、进程组隔离、结果 schema 和 30 分钟 soak。

现在回头看，这套东西明显铺得太大了。Renderer 还没开始比较，实验框架已经快要变成另一个项目。

仓库里确实做过一次真实 `NSWindow` 的可见窗口预检：同一画面里同时放 `CATextLayer` 和 `NSTextField`，检查 presentation layer 的位置变化、暂停恢复、全屏往返和对象释放。后来确认那个 AppKit 测试宿主本身不足以产生有效的路线结论，于是留下了一个带 `preflight-invalid` 名字的 Git ref，没有继续拿它当性能证据。

后面的 spike 被重新收缩成两步。

Phase 0 只测试最简单的 `CATextLayer`：

- 20 events/s 用来确认文字能正常显示
- 40 events/s 作为目标负载
- 80 events/s 作为余量负载
- 文字保持 8 秒时，对应大约 320 和 640 个活动对象

只有当 `CATextLayer` 在 40 和 80 events/s 下都重复出现性能或内存问题，而且问题看起来来自文字栅格化，才启动 Phase 1。

Phase 1 的候选也不再是 `NSTextField`，而是由 Core Text 预先画成 bitmap，再交给普通 `CALayer`。这样才能更直接地回答“问题是不是出在 `CATextLayer` 的文字绘制”上。

实际测试时，严重卡顿跟逐 layer 的 compositor shadow 有关。每条弹幕都让 Core Animation 单独合成阴影，几百层叠起来以后成本很明显。

最终改成了内容级阴影：把 `NSShadow` 放进 attributed string，同时保持：

```swift
textLayer.shadowOpacity = 0
```

调整之后，`CATextLayer` 在 40 和 80 events/s 下各运行两次，319 和 639 个活动 layer 都能保持流畅，资源数量稳定，最后的 owner 释放也通过了。

所以 Phase 1 没有启动。生产版本直接选择了 `CATextLayer`。

生产实现甚至没有保留最初设想的 layer pool。当前每条弹幕都会新建一个 `CATextLayer`、一个 animation completion relay 和一个 `CABasicAnimation`。当时没有证据说明对象分配已经是主要瓶颈，先加对象池只会把复用、重置和旧回调问题一起带进来。

## 滚动弹幕怎么避免追尾

固定弹幕相对简单。同一条轨道有人占用，就尝试下一条。

滚动弹幕还要考虑两条文字的宽度和速度。BiliKit 当前的基础速度由五档设置决定，同时会根据文字长度增加一部分速度。动画时长可以写成：

```text
duration = (surfaceWidth + textWidth) / pointSpeed
```

新弹幕进入轨道前，Allocator 会计算上一条弹幕当前的右边缘，以及两条弹幕的实际速度。

首先要保证上一条已经留出了最小水平间距。如果新弹幕更快，还要继续计算它追上前一条所需的时间。只有预计追上时，前一条已经离开画面，这条轨道才算安全。

这里还有一个容易漏掉的 Resize 问题。

一条弹幕的速度由它入场时的 surface 宽度决定。窗口变宽以后，如果拿新宽度重新计算旧弹幕的位置，轨迹会突然变化。当前的 placement 会保存 `surfaceWidthAtAdmission`，已经在屏幕上的滚动弹幕继续按照原来的动画移动，新进入的弹幕再使用新的窗口尺寸。

顶部弹幕在 Resize 后重新水平居中，底部弹幕则跟随高度变化移动。这样窗口尺寸切换时不需要把整屏弹幕清掉重来。

## 旧回调不能碰到新播放器

弹幕 Renderer 里比较麻烦的部分其实是清理。

当前实现里有三层不同的身份检查。

`DanmakuSession` 使用 generation 阻止旧分段请求在切换视频或者 Stop 后写回。

`CoreAnimationDanmakuRenderer` 使用 `renderEpoch + objectIdentity`。就算两个时期的弹幕碰巧有相同 ID，旧动画的 completion 也不能删除新建的 layer。

Overlay Host 还有单独的 `ownerID`。SwiftUI 和 AVKit 重建 View 以后，旧 Host 迟到的 Resize 或 Detach 不能把新 Host 的 surface 清空。

这些检查平时基本看不到，少一层却很容易出现偶发问题：Seek 后旧弹幕重新出现、关闭页面后动画仍然回调，或者新播放器刚挂载就被旧 View 卸掉。

## 容量满了以后直接丢弃

Renderer 有 640 个活动对象的硬上限。单次更新最多也只尝试 640 条新事件。

没有安全轨道或者达到上限时，新弹幕会被当场丢弃。这里没有延迟队列，因为排队后的弹幕即使最终显示出来，时间也已经错了。

2026 年 7 月 23 日做过一次 80 events/s、持续 30 分钟的合成负载：

```text
emitted:             144000
admitted:             38410
dropped-no-lane:     105590
peak-active:            140
active-after-stop:        0
layers-after-stop:        0
```

大量事件因为没有安全轨道被丢弃，活动对象峰值保持在 140。Stop 后 Controller、文本 layer 和 root attachment 都回到了 0。

这组数据能说明对象数量和清理路径有界，但还不能写成“Renderer 没有内存问题”。当时的 30 分钟记录没有完整的 physical footprint 曲线。现在的 probe 已经会每分钟记录 RSS，不过 RSS 和 physical footprint 也不是同一个指标，后面做长期性能结论时还要重新测。

另外，这组结果来自当时的显示区域和密度配置。现在已经支持最多三层重叠，新的高密度上限也需要单独验证，不能直接沿用旧数字。

## 当前实现还有哪些性能空间

现在的实现足够简单，性能成本也比较容易找到。

每条待处理弹幕目前大致会经过这些操作：

1. 创建 attributed string。
2. 创建 `CTFramesetter` 并测量文字。
3. 通过轨道分配后，再创建一次 attributed string。
4. 新建 `CATextLayer`、completion relay 和动画。
5. 把 layer 提交给 Core Animation。

这里已经能看到一个比较实际的优化点：文字在测量和真正渲染时准备了两次。

而且轨道分配需要先知道文字宽度，所以即使一条弹幕最后因为没有安全轨道被丢弃，前面的 Core Text 测量已经发生了。极端 burst 下，一次最多可能测量 640 条，最后只接纳其中很少一部分。

如果以后这里真的变成瓶颈，我会先尝试让“文字准备”返回一个短生命周期的结果，同时包含：

- attributed string
- 测量后的 bounds
- Renderer 需要的颜色和阴影信息

PresentationController 在本轮 admission 结束后立即释放没有被接纳的结果，Renderer 则直接消费已经准备好的内容。这样可以去掉重复排版，同时不需要先做一个长期文字缓存。

再往后才是 bounded layer pool。对象池只有在 Instruments 证明 `CATextLayer` 和动画对象分配占了明显成本时才值得加，而且池本身也必须有硬上限。复用时需要清掉 string、animation、delegate、position 和旧 completion，实际没有看起来那么免费。

Bitmap-backed `CALayer` 仍然是一个中间路线。它可以把 Core Text 栅格化和 Core Animation 的文字 layer 分开，不过完整弹幕正文往往不重复，整句 bitmap cache 的命中率可能不高。做 glyph atlas 会更有效一些，同时也要处理 CJK 字形数量、字体 fallback、彩色 emoji、Retina scale 和缓存失效。

## 什么时候才值得换 Metal

Metal 能解决的主要问题是大量独立 layer 和动画对象带来的合成成本。

可以把 Core Text 排版后的 glyph 做成纹理，再把所有弹幕作为 quad 批量交给一个 `MTKView` 绘制：

```text
DanmakuEvent
    ↓
Core Text shaping
    ↓
Glyph / texture atlas
    ↓
Position calculation
    ↓
Batched Metal draw
```

这样几百条弹幕不再对应几百个 Core Animation layer，也能减少 WindowServer 和 compositor 的工作。

代价是 Renderer 要自己接管更多东西：

- 每帧根据媒体时间计算位置
- 暂停、倍速和 Seek
- surface resize 和 backing scale
- 字体 fallback 与 emoji
- 纹理上传和回收
- 阴影、透明度和颜色
- generation、旧 surface 与 GPU resource 的生命周期

Core Text shaping 也不会因为用了 Metal 自动消失。Metal 主要优化后半段的批量绘制和合成。

好在当前 Scheduler、LaneAllocator 和 PresentationController 都不知道具体 layer 类型。真要换 Metal，前面的分段、时间轴、过滤、轨道和丢弃策略可以保留，主要替换 Renderer backend 和对应的 AppKit Host。

目前还没有足够理由这样做。下一步更合理的是在最低目标设备和真实高密度视频上跑 Instruments：

- Core Text 排版占用高，就先合并文字准备过程；
- 对象分配占用高，再测试有界 layer pool；
- Core Animation、WindowServer 或 GPU 合成随 layer 数明显恶化，再做 bitmap 或 Metal spike。

现在的 `CATextLayer` 路线已经能工作。什么时候换 Metal，还是等性能数据来决定。
