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

## リモートのProtobufからローカルEventへ

BiliKitは現在、`/x/v2/dm/wbi/web/seg.so`から分割された弾幕を取得している。リクエストには動画の`cid`と`segment_index`が入り、WBI署名後にProtobufが返る。1回のレスポンスは最大2 MiBに制限した。

ネットワーク層は、生成されたProtobuf型をそのままSchedulerへ渡さない。`BiliDanmakuRepository`で、まずプロジェクト独自の`DanmakuEvent`へ変換する。

```swift
DanmakuEvent(
    id: id,
    timeSeconds: Double(progressMilliseconds) / 1_000,
    mode: mode,
    text: text,
    fontSize: normalizedFontSize,
    colorRGB: colorRGB,
    weight: weight
)
```

リモートのmode 1、2、3はすべてスクロール弾幕へ変換し、4は下固定、5は上固定として扱う。その他の高度なmodeは今のところ無視する。フォントサイズは12から64の範囲に収め、色は基本の24-bit RGBだけを残す。グラデーション、送信者情報、その他のprivate fieldを「いつか使うかもしれない」という理由でDomain Modelへ入れることはしていない。

この変換により、`BiliDanmaku` targetはネットワーク実装やProtobufに依存しなくて済む。後段に見えるのは、安定した`DanmakuEvent`、`DanmakuSegment`、`PlaybackItemIdentity`だけだ。将来リモートのprotocolが変わっても、変更をAPI Adapter内に留められる。

### Sessionは開始だけでなく停止も所有する

`DanmakuSession`は、この経路全体のownerになる。プレイヤーの時間軸を購読し、必要なsegmentを判断し、読み込みTaskを作り、Schedulerの出力をPresentationControllerへ同期的に渡す。

現在の方針は小さい。

- 現在のsegmentと次のsegmentをprefetchする。
- 同時読み込みは最大2件。
- Schedulerが保持するのは最大3 segment。
- 同じidentityで失敗したsegmentを、時間軸更新のたびに繰り返しretryしない。
- Stop時に時間軸Taskとすべての読み込みTaskをcancelする。

StartとStopのたびに、Session自身のgenerationを進める。リクエスト完了後はTask cancellationだけでなく、generationと再生identityをもう一度比較する。

```swift
guard self.generation == requestGeneration,
      self.identity == identity
else { return }
```

これは普通に起こるraceへの対策だ。ユーザーが新しい動画へ切り替えたあと、古い動画のリクエストが返ってくることがある。底層の処理がすでに完了していれば、Taskをcancelしてもcontinuationはactorへ入ってくる。最後のidentityとgeneration checkが書き戻しの境界になる。

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

たとえば前のsnapshotが10.00秒、次が10.08秒なら、10.00より大きく10.08以下のtimestampを持つeventがbatchに入る。片側を開区間、もう片側を閉区間にすることで、連続する2つのwindowに同じeventが入るのを防いでいる。

Schedulerはさらに`(timeSeconds, id)`で並べ、配信済みIDをsegment単位で記録する。隣接するsegmentに同じeventが含まれていても、表示は一度だけになる。deduplication用のsetもsegment cacheと同じように再生位置に合わせて削り、動画全体のIDを永久に保持しない。

一時停止中は新しいeventを出さない。倍速再生ではmedia timeがそのまま速く進む。前方へシークしても、飛ばした数分間の弾幕をまとめて表示することはない。時間が不連続になったら現在の表示を消し、新しい位置から続ける。

ここで別のwall-clock Timerを使うと、一時停止、バッファリング、再生速度の変更を個別に補正する必要がある。AVPlayerと弾幕が少しずつ別の時計になってしまう。

スクロールアニメーション自体はCore Animationに任せているが、root layerのlocal timeをプレイヤーの速度に同期している。一時停止では`speed`を0にして`timeOffset`を保存し、再開や速度変更ではそのlocal timeから続ける。

毎フレーム数百件のpositionを手動で更新する必要はない。

時間軸は`bufferingNewest(1)`の`AsyncStream`で配信する。Rendererが必要とするのは、すでに古くなったplayer observer callbackの全履歴ではなく、最新のmedia factだ。観察用の弾幕batch streamにも上限はあるが、本番表示では別の非同期queueを経由せず、同じMainActorの時間軸処理内でpresentation sinkを直接呼ぶ。

## PresentationControllerが准入の境界になる

Sessionが直接layerを作ることはない。`DanmakuPresentationController`へ渡すのは、現在のsnapshot、任意のbatch、clear semanticsを含む値だけのupdateだ。

Controllerは決まった順序で処理する。

1. snapshotとbatchのidentity、discontinuity generationが一致するか確認する。
2. identity、generation、clear semanticsが変わったらAllocatorとRendererを同時にclearする。
3. プレイヤーのrateをRendererへ同期する。
4. batch内の文字を計測し、`DanmakuLaneRequest`を作る。
5. Allocatorに、期限切れ、admit、dropを判断させる。
6. 期限切れobjectを先に削除し、その後で新しいlayerを作る。

これで「表示してよいか」と「どう描くか」を分離できる。Allocatorが扱うのは数値とmedia timeだけなので、windowもAppKitもないtestで動かせる。Rendererは、ある弾幕がなぜ3番目のレーンに置かれたかを知る必要がなく、最終的なplacementだけを消費する。

この境界は、将来Rendererを交換する場所にもなる。Metal backendでもsegment、filter、deduplication、collision ruleを作り直す必要はなく、同じplacementを受け取ればいい。ただしPlatform HostはRendererと一緒に交換する。現在のHostがmountするのは`CALayer`であり、まだ存在しないbackendのために万能そうなsurfaceを先に用意してはいない。

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

このspikeが最終的に答えたのは狭い問いだった。当時のMac、固定surface、合成入力という条件では、最も単純なシステムのtext layerで十分であり、bitmap方式を始める必要はなかった。それ以上に、最低動作対象のMacでの上限や、将来のフォントサイズ、彩色弾幕、高い重なり密度まで証明したわけではない。

spikeを止める場所としては、これでよかったと思う。次の行動を変えるだけの根拠が得られたら、本番実装へ戻ればいい。さらに整ったbenchmark matrixを作っても、選ぶ方針まで変わるとは限らない。

## スクロール弾幕の追突を防ぐ

固定弾幕は比較的単純だ。同じレーンが使用中なら、次のレーンを試せばいい。

スクロール弾幕では、文字幅と速度も考える必要がある。BiliKitには現在5段階の基本速度があり、文字列の長さに応じて速度を少し加算する。アニメーション時間は次のように表せる。

```text
duration = (surfaceWidth + textWidth) / pointSpeed
```

新しい弾幕をレーンに入れる前に、Allocatorは直前の弾幕の現在の右端と、2件それぞれの実速度を計算する。

すでにレーン上にいる弾幕については、次のようになる。

```text
previousSpeed =
    (oldSurfaceWidth + previousTextWidth) / previousDuration

previousRightEdge =
    oldSurfaceWidth - previousSpeed × elapsed + previousTextWidth
```

新しい弾幕は現在のsurfaceから速度を求める。

```text
newSpeed =
    (currentSurfaceWidth + newTextWidth) / newDuration
```

まず、前の弾幕との間に最低限の水平距離が必要になる。新しい弾幕のほうが速い場合は、追いつくまでの時間も計算する。追いつく時点ですでに前の弾幕が画面外へ出ている場合だけ、そのレーンを安全と判断する。

Resizeにも見落としやすい点がある。

弾幕の速度は、入場した時点のsurface幅から決まっている。ウィンドウを広げたあと、既存の弾幕を新しい幅で計算し直すと軌道が急に変わる。そこでplacementに`surfaceWidthAtAdmission`を保存している。すでに移動中の弾幕は元のアニメーションを続け、新しく入る弾幕だけが新しいサイズを使う。

上固定の弾幕はResize後に水平方向を中央へ戻し、下固定の弾幕は高さの変化に合わせて移動する。ウィンドウサイズを変えるたびに、画面上の弾幕をすべて消す必要はなくなった。

### 3つのmodeは別々にレーンを占有する

スクロール、上固定、下固定は、それぞれ別のレーン状態を持つ。同じ縦位置にスクロール弾幕と上固定弾幕が同時に現れることはあり、collision checkは同じmodeの中で行う。

表示範囲の設定も、単純に上から切り取るだけではない。スクロールと上固定は上端から下へ、下固定は下端から上へ割り当てる。50%では中央で接し、75%では中央部分が重なり、100%ではすべてのmodeがsurface全体を使える。

現在の密度は3段階ある。

| 密度 | 最小水平間隔 | 最大重なり段数 |
| --- | ---: | ---: |
| 標準 | 24 pt | 1 |
| 多め | 12 pt | 1 |
| 重ねる | 0 pt | 3 |

重なりを許可するのは、表示範囲が100%の場合だけだ。表示範囲を狭くした場合は通常のcollision ruleへ戻し、少ない縦方向の空間にさらに3段を重ねることはしない。

設定を変更しても、すでに画面上にあるplacementは元のgeometryとmotionを保ち、新しく入る弾幕から新しいpolicyを使う。Resizeと同じ考え方で、設定を変えた瞬間に見ている内容が跳ねないようにしている。

## `CATextLayer`が実際に担当すること

Rendererはplacementを受け取ると`CATextLayer`を作り、attributed string、`contentsScale`、bounds、初期位置を設定して、1つのanimationをcommitする。

スクロール弾幕には、右端の外側から始まり、文字全体が左端を抜けるまでの線形な`position.x` animationを1本だけ設定する。上固定と下固定は一定のopacity animationを使い、固定時間の終了後もCore Animationから同じ仕組みでcompletionを受け取る。

文字計測には`CTFramesetterSuggestFrameSizeWithConstraints`を使う。計測結果をbacking scaleに合わせて切り上げ、8 physical pixelの余白を足す。文字数制限に加え、最終boundsには8192×512 pixelのローカル上限があり、異常な結果はlayer作成前に拒否する。

現在のstyleは24 pt system semiboldだ。彩色弾幕は相対輝度を計算し、暗い文字には白いcontent shadow、それ以外には黒いcontent shadowを付ける。黒や濃い青の弾幕を動画の暗部でも読めるようにしつつ、layerごとのcompositor shadowは復活させない。

Rendererのroot layerは、全体の不透明度と再生速度も担当する。不透明度の変更は1つのroot layerだけで済み、活動中のtext layerをすべて走査しない。一時停止と速度変更も同じように、layer local timeを一度変換するだけでいい。

## 古いcallbackから新しいプレイヤーを守る

Rendererで難しい部分のひとつがcleanupだった。

現在の実装には3種類のidentity checkがある。

`DanmakuSession`はgenerationを使い、動画を切り替えたあとやStop後に古いsegment requestが書き戻すのを防ぐ。

`CoreAnimationDanmakuRenderer`は`renderEpoch + objectIdentity`を使う。異なる時期の弾幕が偶然同じIDを持っていても、古いanimation completionが新しいlayerを削除することはない。

Overlay Hostには別の`ownerID`がある。SwiftUIやAVKitがViewを作り直したあと、古いHostから遅れて届いたResizeやDetachで、新しいHostのsurfaceが消されないようにしている。

animation completionもRendererを強参照しない。`AnimationCompletionRelay`はownerをweakで持つ。Core Animationのnonisolated callbackではevent ID、object identity、epochだけをコピーし、`Task { @MainActor in ... }`でRendererへ戻る。

削除する直前に、もう一度確認する。

```swift
guard completionEpoch == renderEpoch,
      let entry = entries[eventID],
      entry.objectIdentity == objectIdentity
else { return }
```

小さいが現実的な例を考える。古い弾幕Aのanimationが終わる直前にユーザーがシークし、Rendererがclearしてepochを進める。新しい位置でも同じIDの弾幕Aが現れる。その後で古いcompletionが届いたとき、event IDだけで削除すると新しいlayerまで消してしまう。epochとobject identityで、「時期が違う」と「objectが違う」を別々に拒否できる。

### Overlayをmountする場所

Platform層はクリックを受け取らない`NSView`を作り、Rendererのroot layerを`AVPlayerView.contentOverlayView`へmountする。プレイヤー外部の無関係なSwiftUI Viewに重ねるのではなく、AVKitが持つ実際のvideo-content surfaceに弾幕を追従させる。

この選択はフルスクリーンやResizeで効いてくる。Overlayのboundsが変わったとき、新しいサイズをpublishできるのは現在の`ownerID`だけだ。古いViewが遅れて`detachSurface()`を呼んでも、ownershipが一致しないためControllerは拒否する。

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

## テストが実装より長い理由

現在の`BiliDanmaku`には、1852行のproduction codeに対して2802行のtestがある。その多くは「文字が描かれたか」を見るものではなく、時間とライフサイクルの境界を固定している。

Scheduler testではvirtual media timeを使い、次を確認する。

- 一時停止と再生速度
- 6分ごとのsegment境界
- 前後シーク後のclearと再表示
- 隣接segment内の重複ID
- cacheとdelivered-ID setが有限であること
- 無効化して再び有効にしたあと、見逃した弾幕をbackfillしないこと

Allocator testはAppKitを起動しない。surface、文字幅、duration、media timeを直接入力するため、追突式、固定弾幕の期限切れ、表示範囲の上下ミラー、重なり段数、640件のhard limitを決定的に検証できる。

PresentationControllerのfake backendは`measure`、`render`、`remove`、`clearAll`、rate変更を記録する。古いgenerationからのcompletion、同じIDを持つ新旧object、surface ownerの交換、`CATextLayer`を作る前に拒否すべきburstなど、ライフサイクル上の失敗をここで構成できる。

最後に、実際の`NSWindow`とproduction Rendererを使うload probeがある。中国語、日本語、韓国語、Latin、emojiを混ぜた合成弾幕を生成し、指定rateで同じ時間軸を進めながら、admission、drop、活動layer、要求したsegment、Stop後のcleanupを記録する。

それぞれが証明する範囲は違う。純粋なalgorithm testは衝突と順序を、fake backendは呼び出しとライフサイクルを、real-window probeはCore Animationを確認する。probeが通っても、実動画上の読みやすさ、フルスクリーンの見た目、Instrumentsでの負荷原因までは別に確認する必要がある。

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

計測前に、もっと安いcapacity checkを入れる余地もある。現在のControllerはbatch内の最大640 eventを計測してから、Allocatorがactive capacityを確認する。Rendererがすでにhard limitに近い場合、一部のCore Text処理は先に省ける。ただし、この近道で拒否できるのは明確なcapacity failureだけだ。安全なレーンかどうかは文字幅に依存するため、粗い判定ですべての計測を省くことはできない。

bounded layer poolはその次になる。Instrumentsで`CATextLayer`やanimationのallocationが明確なコストになっていると確認できた場合に意味がある。pool自体にもhard limitが必要で、再利用時にはstring、animation、delegate、position、古いcompletionの状態をすべて消さなければならない。見た目ほど無料ではない。

Bitmap-backed `CALayer`も中間案として残っている。Core TextのラスタライズとCore Animationのテキストlayerを分離できるが、弾幕の全文はあまり繰り返されないため、行単位のbitmap cacheはhit率が低いかもしれない。glyph atlasのほうが効く可能性はあるものの、CJKの字形数、font fallback、カラーemoji、Retina scale、cache invalidationまで扱う必要がある。

LaneAllocatorも測定候補にはなるが、今のところ主なコストだという兆候はない。高さ720 pt、lane 36 ptのsurfaceならmodeごとの縦レーンは約20本で、探索範囲は小さい。活動objectにも640件の上限がある。Core Text layout、layer allocation、compositingのほうが先に重くなる可能性は高い。最終的にはTime ProfilerとCore Animationのデータを見る必要があり、コード行数から性能は判断できない。

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

実際にMetal版を作るとしても、`MTKView`のdisplay callbackを新しいsource of truthにはせず、現在のmedia-time modelを使い続けたい。各frameでidentityとgenerationを検証済みのmedia snapshotを読み、次の式で位置を計算できる。

```text
x = startX - mediaPointSpeed × (currentMediaTime - admittedMediaTime)
```

一時停止中はmedia timeが進まず、再生速度はプレイヤーの時間軸へ自然に反映される。シーク時はこれまでどおりgenerationを進めて古いdraw itemを消せばよく、GPU animationを新しい位置へ無理に接続する必要はない。

texture cacheにも明確なkeyと上限が必要になる。少なくともfont、size、scale、glyph、色の処理、emoji表現をkeyに含める。windowをbacking scaleの異なるdisplayへ移動した場合、古いatlasをそのまま使えるとは限らない。CJKのglyph集合は大きいので、「一度見たものをすべてcacheする」実装では、Core Animationのlayer問題がすぐにtexture memory問題へ置き換わってしまう。

現在のScheduler、LaneAllocator、PresentationControllerは、具体的なlayer型を知らない。将来Metalへ移る場合も、分割データ、プレイヤーの時間軸、filter、レーン、drop policyは残せる。置き換えるのはRenderer backendと、それに対応するAppKit Hostになる。

今のところ、そこまで進む根拠はまだない。次にやるなら、最低動作対象のMacと本当に密度の高い動画を使ってInstrumentsで確認する。

- Core Text layoutが重ければ、2回あるテキスト準備をまとめる。
- object allocationが重ければ、上限付きのlayer poolを試す。
- Core Animation、WindowServer、GPU compositingがlayer数に応じて明確に悪化するなら、bitmapまたはMetalのspikeを始める。

現在の`CATextLayer`方式はすでに動いている。Metalへ切り替える時期は、性能データを見て決めればいい。
