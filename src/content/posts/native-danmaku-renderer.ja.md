---
title: "macOSでネイティブ弾幕レンダラーを実装する"
published: 2026-08-10
description: "分割取得、プレイヤーの時間軸、レーン衝突の回避から、CATextLayerのspike、ライフサイクル管理、Metalへ進む条件まで。"
tags: [Swift, macOS, Core Animation, Danmaku]
category: Engineering
draft: false
lang: ja
translationKey: native-danmaku-renderer
---

BiliKitの弾幕モジュールは、現在1852行のSwiftでできている。テストはそれより多く、2802行ある。

スクロール、上固定、下固定の3種類に対応し、再生、一時停止、倍速、シークに追従する。分割取得、レーンの衝突、ウィンドウサイズの変更に加えて、速度、不透明度、表示範囲、密度の設定も入った。

最初は、弾幕の実装はそれほど難しくないと思っていた。文字列を受け取り、プレイヤーの上に置いて、右から左へ動かせばいい。

実際に作ってみると、文字を描くのは最後の工程だった。その前に、データをいつ取得するか、どの時間軸で表示するか、速度の違う2つの弾幕が追突しないか、シーク後に古いアニメーションをどう片付けるか、数百個のテキストlayerを同時に置いても合成が破綻しないか、といった問題がある。

## データ、スケジューリング、描画を分ける

BiliKitの弾幕は、おおよそ次の順序で処理される。

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

リモートの弾幕データは6分ごとのsegmentで返ってくる。Sessionは現在のsegmentと次のsegmentを取得し、同時リクエストは最大2件、メモリに保持するsegmentは最大3件に制限している。

デコードにも上限を設けた。1つのsegmentで受け入れるeventは最大20,000件、本文は合計1,000,000文字、1件あたり4096文字まで。Rendererに入る前はさらに厳しくし、512 UTF-16 code unitを超える文字列はレイアウト前に拒否する。

これはリソース使用量を有限にするための制限だ。受け入れた文字列は最終的にCore TextとCore Animationへ渡る。リモートの長さをそのまま信用すると、異常なsegmentひとつで大量のテキストレイアウトとlayer確保がメインスレッドに発生してしまう。

## プレイヤーの時間軸を使う

弾幕専用のTimerは作っていない。

プレイヤーは、再生対象、現在位置、再生速度、状態、discontinuity generationを含むsnapshotを発行する。

```swift
PlaybackTimelineSnapshot(
    identity: ...,
    positionSeconds: ...,
    rate: ...,
    state: ...,
    discontinuityGeneration: ...
)
```

Schedulerは連続する2つのsnapshotの間で、初めて現れたeventだけを配信する。

```text
(previousPosition, currentPosition]
```

一時停止中は新しいeventを出さない。倍速再生ではmedia timeがそのまま速く進む。前方へシークしても、飛ばした数分間の弾幕をまとめて表示することはない。時間が不連続になったら現在の表示を消し、新しい位置から続ける。

ここで別のwall-clock Timerを使うと、一時停止、バッファリング、再生速度の変更を個別に補正する必要がある。AVPlayerと弾幕が少しずつ別の時計になってしまう。

スクロールアニメーション自体はCore Animationに任せているが、root layerのlocal timeをプレイヤーの速度に同期している。一時停止では`speed`を0にして`timeOffset`を保存し、再開や速度変更ではそのlocal timeから続ける。

毎フレーム数百件のpositionを手動で更新する必要はない。

## Rendererのspikeは少し遠回りした

M4.4を始めるとき、まずマージしない前提のspikeを作った。

最初に比較しようとしたのは次の2案だった。

- 再利用する`CATextLayer`
- layer-backedな`NSTextField`

同じ`NSAttributedString`、Core Textの計測結果、Core Animationの移動アニメーションを使い、frame interval、メモリ、ライフサイクルを比べる計画だった。

結果の「信頼性」を上げようとして、最初のspike contractには3つの乱数seed、6段階のevent rate、複数のウィンドウサイズ、フルスクリーン、Resizeの繰り返し、外部watchdog、process groupの分離、結果schema、30分のsoakまで入れた。

今見ると、明らかに広げすぎている。Rendererを比較する前に、実験用のharnessがもうひとつのプロジェクトになりかけていた。

実際の`NSWindow`を使ったvisible-window preflightも一度作っている。同じsurfaceに`CATextLayer`と`NSTextField`を置き、presentation layerの移動、一時停止と再開、フルスクリーンの往復、objectの解放を確認した。ただし、このAppKit test hostでは有効な方針判断までできないことが後から分かった。そのcommitは`preflight-invalid`を含むGit refとして残し、性能の根拠には使っていない。

その後、spikeを2つのphaseまで縮めた。

Phase 0では、最も単純な`CATextLayer`だけを試す。

- 20 events/sで文字が正常に表示されることを確認
- 40 events/sを目標負荷
- 80 events/sを余裕側の負荷
- 表示時間を8秒とすると、活動objectはおよそ320件と640件

40と80 events/sの両方で性能またはメモリの問題が繰り返し発生し、その原因がテキストのラスタライズにありそうな場合だけPhase 1へ進むことにした。

Phase 1の候補も`NSTextField`ではなくなった。Core Textでbitmapを先に描き、通常の`CALayer`に載せる方式だ。これなら`CATextLayer`によるテキスト描画が失敗の原因か、もっと直接確認できる。

テスト中に大きなカクつきが出たのは、layerごとのcompositor shadowを使ったときだった。数百件の弾幕それぞれにCore Animationで影を合成させると、負荷が目に見えて増えた。

最終的には、影をattributed string内の`NSShadow`へ移し、carrier layer側のshadowを無効にした。

```swift
textLayer.shadowOpacity = 0
```

変更後の`CATextLayer`は、40と80 events/sをそれぞれ2回完走した。319個、639個の活動layerでも見た目は滑らかで、リソース数も安定し、最後のowner解放まで通った。

そのためPhase 1は実行していない。本番実装はそのまま`CATextLayer`を採用した。

最初に考えていたlayer poolも本番には入れなかった。現在は弾幕ごとに`CATextLayer`、animation completion relay、`CABasicAnimation`を新しく作る。object allocationが主なボトルネックだという証拠はなく、poolを先に入れると再利用、状態のreset、古いcallbackの問題が一緒に増える。

## スクロール弾幕の追突を防ぐ

固定弾幕は比較的単純だ。同じレーンが使用中なら、次のレーンを試せばいい。

スクロール弾幕では、文字幅と速度も考える必要がある。BiliKitには現在5段階の基本速度があり、文字列の長さに応じて速度を少し加算する。アニメーション時間は次のように表せる。

```text
duration = (surfaceWidth + textWidth) / pointSpeed
```

新しい弾幕をレーンに入れる前に、Allocatorは直前の弾幕の現在の右端と、2件それぞれの実速度を計算する。

まず、前の弾幕との間に最低限の水平距離が必要になる。新しい弾幕のほうが速い場合は、追いつくまでの時間も計算する。追いつく時点ですでに前の弾幕が画面外へ出ている場合だけ、そのレーンを安全と判断する。

Resizeにも見落としやすい点がある。

弾幕の速度は、入場した時点のsurface幅から決まっている。ウィンドウを広げたあと、既存の弾幕を新しい幅で計算し直すと軌道が急に変わる。そこでplacementに`surfaceWidthAtAdmission`を保存している。すでに移動中の弾幕は元のアニメーションを続け、新しく入る弾幕だけが新しいサイズを使う。

上固定の弾幕はResize後に水平方向を中央へ戻し、下固定の弾幕は高さの変化に合わせて移動する。ウィンドウサイズを変えるたびに、画面上の弾幕をすべて消す必要はなくなった。

## 古いcallbackから新しいプレイヤーを守る

Rendererで難しい部分のひとつがcleanupだった。

現在の実装には3種類のidentity checkがある。

`DanmakuSession`はgenerationを使い、動画を切り替えたあとやStop後に古いsegment requestが書き戻すのを防ぐ。

`CoreAnimationDanmakuRenderer`は`renderEpoch + objectIdentity`を使う。異なる時期の弾幕が偶然同じIDを持っていても、古いanimation completionが新しいlayerを削除することはない。

Overlay Hostには別の`ownerID`がある。SwiftUIやAVKitがViewを作り直したあと、古いHostから遅れて届いたResizeやDetachで、新しいHostのsurfaceが消されないようにしている。

普通に再生していると、これらのcheckはほとんど見えない。ただし1つ欠けるだけで、シーク後に古い弾幕が戻る、画面を閉じたあともanimation callbackが届く、新しくattachしたプレイヤーが古いViewにdetachされる、といった断続的な問題になる。

## 容量を超えた弾幕は捨てる

Rendererの活動object数には640件のhard limitがある。1回のupdateで試す新規eventも最大640件に制限している。

安全なレーンがない場合や上限に達した場合、新しい弾幕はその場でdropする。遅延queueは作らない。数秒遅れて表示された弾幕は、すでに動画内の別の場面に紐づいてしまう。

2026年7月23日には、80 events/sの合成負荷を30分間動かした。

```text
emitted:             144000
admitted:             38410
dropped-no-lane:     105590
peak-active:            140
active-after-stop:        0
layers-after-stop:        0
```

安全なレーンがなかったeventは大量にdropされ、活動objectのpeakは140に収まった。Stop後にはController、テキストlayer、root attachmentがすべて0へ戻った。

この結果から、その実行中のobject数とcleanupが有限だったことは分かる。ただし「Rendererにメモリ問題はない」とまでは言えない。当時の30分記録には完全なphysical footprintの時系列がなかった。現在のprobeは1分ごとにRSSを記録するようになったが、RSSとphysical footprintは同じ指標ではない。長期的なメモリについて結論を出すなら、改めて測る必要がある。

この数値は当時の表示範囲と密度設定によるものでもある。現在は最大3段階の重なりを許可できるので、新しい高密度設定の上限は別に検証する必要がある。

## 現在の実装で最適化できるところ

今のRendererは十分単純なので、負荷が発生しそうな場所も見つけやすい。

処理対象になった弾幕は、おおよそ次の手順を通る。

1. attributed stringを作る。
2. `CTFramesetter`を作り、文字を計測する。
3. レーンに入れた場合、attributed stringをもう一度作る。
4. `CATextLayer`、completion relay、animationを作る。
5. layerをCore Animationへcommitする。

ここには分かりやすい改善候補がある。計測時と描画時に、テキストを2回準備している。

レーンを決めるには文字幅が先に必要なので、安全なレーンがなく最後にdropされる弾幕でもCore Textの計測は発生する。極端なburstでは1回で最大640件を計測し、そのうち少数しかadmitされない可能性もある。

profilingでここが重いと分かったら、まず「テキスト準備」の結果を短命なobjectとしてまとめたい。

- attributed string
- 計測済みのbounds
- Rendererが使う色とshadowの情報

PresentationControllerはadmission終了後、拒否したobjectをすぐ解放する。Rendererは準備済みの内容をそのまま使う。これなら長期的なテキストcacheを増やさず、重複するlayoutだけを減らせる。

bounded layer poolはその次になる。Instrumentsで`CATextLayer`やanimationのallocationが明確なコストになっていると確認できた場合に意味がある。pool自体にもhard limitが必要で、再利用時にはstring、animation、delegate、position、古いcompletionの状態をすべて消さなければならない。見た目ほど無料ではない。

Bitmap-backed `CALayer`も中間案として残っている。Core TextのラスタライズとCore Animationのテキストlayerを分離できるが、弾幕の全文はあまり繰り返されないため、行単位のbitmap cacheはhit率が低いかもしれない。glyph atlasのほうが効く可能性はあるものの、CJKの字形数、font fallback、カラーemoji、Retina scale、cache invalidationまで扱う必要がある。

## Metalへ進む条件

Metalで改善できるのは、大量の独立layerとanimation objectによる合成コストだ。

Core Textでglyphをshapeし、texture atlasへ格納し、表示中の弾幕をquadとして1つの`MTKView`へまとめて送る構成が考えられる。

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

数百件の弾幕が、数百個のCore Animation layerに対応しなくなる。WindowServerやcompositorの仕事も減らせる可能性がある。

その代わり、Rendererが担当する範囲はかなり増える。

- media timeから毎フレームpositionを計算する
- 一時停止、倍速、シーク
- surface resizeとbacking scale
- font fallbackとemoji
- textureのuploadと回収
- shadow、不透明度、色
- generation、古いsurface、GPU resourceのライフサイクル

Metalを使ってもCore Text shapingは残る。主に変わるのはpipelineの後半にあるbatching、drawing、compositingだ。

現在のScheduler、LaneAllocator、PresentationControllerは、具体的なlayer型を知らない。将来Metalへ移る場合も、分割データ、プレイヤーの時間軸、filter、レーン、drop policyは残せる。置き換えるのはRenderer backendと、それに対応するAppKit Hostになる。

今のところ、そこまで進む根拠はまだない。次にやるなら、最低動作対象のMacと本当に密度の高い動画を使ってInstrumentsで確認する。

- Core Text layoutが重ければ、2回あるテキスト準備をまとめる。
- object allocationが重ければ、上限付きのlayer poolを試す。
- Core Animation、WindowServer、GPU compositingがlayer数に応じて明確に悪化するなら、bitmapまたはMetalのspikeを始める。

現在の`CATextLayer`方式はすでに動いている。Metalへ切り替える時期は、性能データを見て決めればいい。
