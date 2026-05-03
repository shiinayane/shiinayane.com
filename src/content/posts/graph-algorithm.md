---
title: グラフアルゴリズム
published: 2025-02-21
tags: [Japanese, Note]
category: Knowledge
draft: false
lang: jp
---

## 基本的なグラフアルゴリズム

### 幅優先探索 (BFS)

#### 擬似コード

```c
BFS(G, s)
    for 各頂点 u ∈ G.V - {s}
        u.color = WHITE
        u.d = ∞
        u.π = NIL
    s.color = GRAY
    s.d = 0
    s.π = NIL
    Q = ∅
    ENQUEUE(Q, s)
    while Q != ∅
        u = DEQUEUE(Q)
        for 各頂点 v ∈ G.Adj[u] // uの近傍を探索する
            if v.color == WHITE // vが今発見されている？
                v.color = GRAY
                v.d = u.d + 1
                v.π = u
                ENQUEUE(Q, v)   // vが今最前線上にある
        u.color = BLACK         // uは今最前線の後方にある
```

手続きPRINT-PATHは、sからvへの最短路上の頂点をプリントする

```c
PRINT-PATH(G, s, v)
    if v == s
        sをプリントする
    elseif v.π == NIL
        s “から” v “への経路は存在しない”をプリントする
    else PRINT-PATH(G, s, v.π)
        vをプリントする
```

compute a path in $G$ that traverses each edge in $E$ exactly once in each direction

```c
MAKE-PATH(u)
    for each v ∈ Adj[u] but not in the tree such that u ≤ v
        go to v and back to u
    for each v ∈ Adj[u] but not equal to u.π
        go to v
        perform the path proscribed by MAKE-PATH(v)
    go to u.π
```

#### 解析

初期化後は頂点を白にすることはない。したがって、第 13 行の判定から、各頂点は高々 1 回だけキューに挿入され、したがって高々 1 回だけキューから削除される。
キューに対する挿入と削除は $O(1)$ 時間で実行できるので、キュー操作に費やせる時間は全体で $O(V)$ である。
また各頂点をキューから削除したときにだけその頂点の隣接リストを走査するので、各頂点の隣接リストを走査する回数は高々 1 回である。
すべての隣接リストの長さの総和は $O(E)$ なので、隣接リストの走査に必要な時間は $O(V + E)$ である。
初期化のためのオーバーヘッドは $O(V)$ なので、したがって、幅優先探索は $G$ の隣接リスト表現のサイズの線形時間で走る。  
BFS の総実行時間は **$O(V + E)$** である。

### 深さ優先探索 (DFS)

#### 擬似コード

ccは連結成分を出力するために用いる変数である

```c
DFS(G)
    for 各頂点 u ∈ G.V
        u.color = WHITE
        u.π = NIL
    time = 0
    // cc = 1
    for 各頂点 u ∈ G.V
        if u.color == WHITE
            // u.cc = cc
            // cc = cc + 1
            DFS-VISIT(G, u)
```

```c
DFS-VISIT(G, u)
    time = time + 1     // 白頂点uが今発見された
    u.d = time
    u.color = GRAY
    for 各頂点 v ∈ G.Adj[u]    // 各辺(u, v)を探索する
        if v.color == WHITE
            // v.cc = u.cc
            v.π = u
            DFS-VISIT(G, v)
    time = time + 1
    u.f = time
    u.color = BLACK     // uを黒に彩色する；uの探索が終了した
```

再帰を使わず、スタックを用いるDFS

```c
DFS-STACK(G)
    for each vertex u ∈ G.V
        u.color = WHITE
        u.π = NIL
    time = 0
    for each vertex u ∈ G.V
        if u.color == WHITE
            DFS-VISIT-STACK(G, u)
```

```c
DFS-VISIT-STACK(G, u)
    S = Ø
    PUSH(S, u)
    time = time + 1             // 白頂点uが今発見された
    u.d = time
    u.color = GRAY
    while !STACK-EMPTY(S)
        u = TOP(S)
        v = FIRST-WHITE-NEIGHBOR(G, u)
        if v == NIL
            // uの隣接リストは十分に探索された
            POP(S)
            time = time + 1
            u.f = time
            u.color = BLACK     // uを黒に彩色する；uの探索が終了した
        else
            // uの隣接リストはまだ探索されていない
            v.π = u
            time = time + 1
            v.d = time
            v.color = GRAY
            PUSH(S, v)
```

```c
FIRST-WHITE-NEIGHBOR(G, u)
    for each vertex v ∈ G.Adj[u]
        if v.color == WHITE
            return v
    return NIL
```

有向グラフGの全ての辺をその種類と共に印刷するバージョン

```c
DFS-VISIT-PRINT(G, u)
    time = time + 1
    u.d = time
    u.color = GRAY
    for each vertex v ∈ G.Adj[u]
        if v.color == WHITE
            print "(u, v) is a tree edge."
            v.π = u
            DFS-VISIT-PRINT(G, v)
        else if v.color == GRAY
            print "(u, v) is a back edge."
        else if v.d > u.d
            print "(u, v) is a forward edge."
        else
            print "(u, v) is a cross edge."
    u.color = BLACK
    time = time + 1
    u.f = time
```

#### 解析

DFS の実行時間はどのくらいだろうか？ DFS の第 1〜3 行と第 5〜7 行のループは、DFS-VISIT の呼出しに必要な時間を除くと $\Theta(V)$ 時間かかる。幅優先探索と同様、ここでも集計法を用いて解析する。
DFS-VISIT 呼出しが起こる頂点 $u$ はつねに白であり、DFS-VISIT の最初の仕事は $u$ を灰に彩色することで、手続き DFS-VISIT は各頂点 $u \in V$ に対してちょうど 1 回ずつ呼び出される。
DFS-VISIT(G, u) を実行中、第 4〜7 行の繰返し回数は $|Adj[u]|$ である。

$$
\sum_{v \in V} |Adj[v]| = \Theta(E)
$$
であり、DFS-VISIT は各頂点につき 1 回呼び出されるので、DFS-VISIT の第 4〜7 行の実行にかかる総時間は $\Theta(V + E)$ である。
したがって、DFS の実行時間は **$\Theta(V + E)$** である。

### トポロジカルソート

#### 擬似コード

```c
TOPOLOGICAL-SORT(G)
    各頂点vの終了時刻v.fを計算するためにDFS(G)を呼び出し
    各頂点の探索が終了するたびに、この頂点を連結リストの先頭に挿入する
    return 頂点の連結リスト
```

有向非巡回グラフ$G = (V, E)$と2頂点a, bを入力とし、Gにおけるaからbへの単純路の個数を返す線形時間アルゴリズム

```c
SIMPLE-PATHS(G, u, v)
    TOPOLOGICAL-SORT(G)
    let {v[1], v[2]..v[k - 1]} be the vertex between u and v
    v[0] = u
    v[k] = v
    for j = 0 to k - 1
        DP[j] = ∞
    DP[k] = 1
    return SIMPLE-PATHS-AID(G, DP, 0)
```

```c
SIMPLE-PATHS-AID(G, DP, i)
    if i > k
        return 0
    else if DP[i] != ∞
        return DP[i]
    else
       DP[i] = 0
       for v[m] in G.adj[v[i]] and 0 < m ≤ k
            DP[i] += SIMPLE-PATHS-AID(G, DP, m)
       return DP[i]
```

#### 解析

深さ優先探索に $\Theta(V + E)$ 時間かかり、$|V|$ 個の頂点のそれぞれを連結リストの先頭に挿入するのに $O(1)$ 時間しかかからないので、
TOPOLOGICAL-SORT は **$\Theta(V + E)$** 時間で実行できる。

### 強連結成分

#### 擬似コード

```c
STRONGLY-CONNECTED-COMPONENTS(G)
    DFS(G)を呼び出し、各頂点uに対して終了時刻u.fを計算する
    G^Tを生成する
    DFS(G^T)を呼び出しが、DFSの主ループでは（第1行で計算した）u.fの降順で頂点を探索する
    第3行で生成した深さ優先森の各木の頂点を、それぞれ分離された強連結成分として出力する

```

## 最小全域木

### Kruskalのアルゴリズム

#### 擬似コード

```c
MST-KRUSKAL(G, w)
    A = ∅
    for 各頂点 v ∈ G.V
        MAKE-SET(v)
    G.Eの辺を含む1つのリストを生成する
    重みwの単調増加順にG.Eの辺のリストをソートする
    for ソートされたリストから順に各辺(u, v) ∈ G.E
        if FIND-SET(u) != FIND-SET(v)
            A = A ∪ {(u, v)}
            UNION(u, v)
    return A
```

#### 解析

グラフ $G = (V, E)$ に対する Kruskal のアルゴリズムの実行時間は、互いに素な集合族のためのデータ構造の実装方法に依存する。現在知られている中で漸近的に最速の方法なので、第 19.3 節で述べた 2 つのヒューリスティック、ランクによる合併と経路圧縮を併用する互いに素な集合の森による実装方法を仮定する。

第 1 行で $A$ の初期化に $O(1)$ 時間、第 4 行で 1 つの辺のリストの生成に $O(V + E)$ 時間 ($G$ が連結なので、
これは $O(E)$ である)、そして第 5 行で辺をソートするのに $O(E \lg E)$ 時間かかる。(第 2〜3 行の for ループにおける $|V|$ 回の MAKE-SET 操作のコストはすでに説明済みである。)

第 6〜9 行の for ループでは互いに素な集合の森に対して $O(E)$ 回の FIND-SET と UNION 操作を行う。
$|V|$ 回の MAKE-SET 操作を含めて、これらの操作には全体で合計 $O((V + E) \alpha(V))$ 時間かかる。ただし、$\alpha$ は第 19.4 節 (148 ページ) で定義した非常にゆっくりと増加する関数である。
$G$ が連結なので $\alpha(|V|) = O(\lg V) = O(\lg E)$ である。

さらに、$|E| < |V|^2$ に注意すると、Kruskal のアルゴリズムの総実行時間は $O(E \lg E)$ である。
したがって、Kruskal のアルゴリズムの総実行時間を **$O(E \lg V)$** と書き直すことができる。

### Primのアルゴリズム

#### 擬似コード

```c
MST-PRIM(G, w, r)
    for 各頂点 u ∈ G.V
        u.key = ∞
        u.π = NIL
    r.key = 0
    Q = ∅
    for 各頂点 u ∈ G.V
        INSERT(G, u)
    while Q != ∅
        u = EXTRACT-MIN(Q)
        for G.Adj[u]の各頂点v
            if v ∈ Q and w(u, v) < v.key
                v.π = u
                v.key = w(u, v)
                DECREASE-KEY(Q, v, w(u, v))
```

グラフ$G = (V, E)$が隣接行列によって与えられるとき、$O(V^2)$時間で走るPrimのアルゴリズム

```c
PRIM-ADJ(G, w, r)
    initialize A with every entry = (NIL, ∞)
    T = {r}
    for i = 1 to V
        if Adj[r, i] != 0
            A[i] = (r, w(r, i))
    while T != V
        min = ∞
        for each v in V - T
            if A[v].2 < min
                min = A[v].2
                k = v
        T = T ∪ {k}
        k.π = A[k].1
        for i = 1 to V
            if Adj[k, i] != 0 and i ∉ T and w(k, i) < A[i].2
                A[i] = (k, w(k, i))
```

フィボナッチヒープを用いるPrimアルゴリズム

```c
MST-REDUCE(G, T)
    for each v ∈ G.V
        v.mark = false
        MAKE-SET(v)
    for each u ∈ G.V
        if u.mark == false
            choose v ∈ G.Adj[u] such that (u, v).c is minimized
                UNION(u, v)
                T = T ∪ {(u, v).orig}
                u.mark = v.mark = true
    G`.V = {FIND-SET(v): v ∈ G.V}
    G`.E = Ø
    for each (x, y) ∈ G.E
        u = FIND-SET(x)
        v = FIND-SET(y)
        if (u, v) ∉ G`.E
             G`.E = G`.E ∪ {(u, v)}
             (u, v).orig` = (x, y).orig
             (u, v).c` = (x, y).c
        else if (x, y).c < (u, v).c`
             (u, v).orig` = (x, y).orig
             (u, v).c` = (x, y).c
    construct adjacency lists G`.Adj for G`
    return G` and T
```

#### 解析

Prim のアルゴリズムの実行時間は min 優先度つきキュー $Q$ の実装方法に依存する。2 分 min ヒープ (第 1 巻第 6 章 (ヒープソート) 参照) を用いて、頂点と対応するヒープ要素の対応づけの方法も含めて実装できる。

手続き BUILD-MIN-HEAP は第 5 行を $O(V)$ 時間で実行できる。実際、BUILD-MIN-HEAP を呼び出す必要すらない。
すべてのキーを min ヒープの根に置きさえすれば、それ以外のキーはすべて $\infty$ なので、それらは min ヒープのどこに置いてもよい。
while ループの本体は $|V|$ 回繰り返され、EXTRACT-MIN 操作には $O(\lg V)$ 時間かかるので、EXTRACT-MIN の呼び出しにかかる総時間は $O(V \lg V)$ である。
全隣接リストの長さの合計は $2|E|$ なので、第 10〜14 行の for ループは合計 $O(E)$ 回繰り返される。
for ループの中で第 11 行が行う、与えられた頂点が $Q$ に属するか否かの判定は、各頂点について $Q$ に属するか否かを示す 1 ビットを用い、頂点を $Q$ から削除したときにそのビットを更新すれば、定数時間で実行できる。
第 14 行の DECREASE-KEY 操作の各呼び出しは $O(\lg V)$ 時間で実行できる。

したがって、Prim のアルゴリズムで要する総時間は **$O(V \lg V + E \lg V) = O(E \lg V)$** となり、これは本書の Kruskal のアルゴリズムの実装と漸近的に等しい。

## 単一始点最短路

### Bellman-Fordのアルゴリズム

#### 擬似コード

```c
BELLMAN-FORD(G, w, s)
    INITIALIZE-SINGLE-SOURCE(G, s)
    for i = 1 to |G.V| - 1
        for 各辺 (u, v) ∈ G.E
            RELAX(u, v, w)
    for 各辺 (u, v) ∈ G.E
        if v.d > u.d + w(u, v)
            return FALSE
    return TRUE
```

始点から頂点vへのある経路上に負閉路があるとき、v.d値として-∞を設定するバージョン

```c
BELLMAN-FORD`(G, w, s)
    INITIALIZE-SINGLE-SOURCE(G, s)
    for i = 1 to |G.V| - 1
        for each edge (u, v) ∈ G.E
            RELAX(u, v, w)
    for each edge(u, v) ∈ G.E
        if v.d > u.d + w(u, v)
            mark v
    for each vertex u ∈ marked vertices
        DFS-MARK(u)
```

```c
DFS-MARK(u)
    if u != NIL and u.d != -∞
        u.d = -∞
        for each v in G.Adj[u]
            DFS-MARK(v)
```

#### 解析

グラフが隣接リスト形式で表現されているとき、Bellman-Ford のアルゴリズムは **$O(VE)$** 時間で動作する。

なぜなら、第 1 行の初期化に $\Theta(V)$ 時間、第 2〜4 行で実行される $|V| - 1$ 回の辺の走査に $\Theta(V + E)$ 時間 ($|E|$ 個の辺を見ているのに $|V|$ 個の隣接リストをチェックする)、
第 5〜7 行の for ループに $O(VE)$ 時間を要するからである。

$|V| - 1$ より少ない回数の走査で十分なことがある。(練習問題 22.1-3 参照)。これが、$\Theta(V^2 + VE)$ よりも $O(V^2 + VE)$ を要すると主張する理由である。

しかし $|E| = \Omega(V)$ だが、この場合は、このアルゴリズムの実行時間は $O(VE)$ と評価される。
練習問題 22.1-5 では、$|E| = O(V)$ のときでさえ、Bellman-Ford のアルゴリズムを $O(VE)$ 時間で動作させることを求めている。

### Dijkstraのアルゴリズム

#### 擬似コード

```c
DIJKSTRA(G, w, s)
    INITIALIZE-SINGLE-SOURCE(G, s)
    S = ∅
    Q = ∅
    for 各頂点 u ∈ G.V
        INSERT(Q, u)
    while Q != ∅
        u = EXTRACT-MIN(Q)
        S = S ∪ {u}
        for 各頂点 v ∈ G.Adj[u]
            RELAX(u, v, w)
            if RELAXがv.d値を減少させる
                DECREASE-KEY(Q, v, v.d)
```

#### 解析

Dijkstra のアルゴリズムは、どれほど速いのだろうか？
アルゴリズムは min 優先度つきキュー Q を 3 つの優先度つきキュー操作の呼び出しで管理している：
    すなわち、（第 5 行の）INSERT、（第 7 行の）EXTRACT-MIN、そして（第 12 行の）DECREASE-KEY 操作である。

このアルゴリズムは INSERT と EXTRACT-MIN を各頂点 u ∈ V に対して、1 回ずつ呼び出す。
各頂点 $u ∈ V$ は $S$ にちょうど 1 回だけ挿入されるので、隣接リスト $Adj[u]$ の各辺は、アルゴリズムの実行全体を通して 1 回だけ第 9～12 行の for ループにおいて調べられる。
すべての隣接リストに属する総辺数は $|E|$ であり、for ループの繰返し総数は $|E|$ であり、$DECREASE-KEY$ 操作の総数も全体で高々 $|E|$ 回である。（集計法を使って確認せよ。）

Prim のアルゴリズムと同様に、Dijkstra のアルゴリズムの実行時間は、min 優先度つきキュー Q の特定の実装方法に依っている。
単に配列の順序を保持していることを利用する：単に配列の $u$ 番目の位置 $v$ を格納するのである。
INSERT と DECREASE-KEY 操作は、それぞれ $O(1)$ 時間で実行できるが、EXTRACT-MIN 操作は（配列全体を調べる必要があるので）$O(V)$ 時間が必要である。
このため、全体で **$O(V^2 + E) = O(V^2)$** 時間を要す。

## 全点対最短路

### Floyd-Warshallアルゴリズム

#### 擬似コード

```c
FLOYD-WARSHALL(W, n)
    D(0) = W
    for k = 1 to n
        D(k) = (d[i, j](k))は新しい n x n 型行列である
        for i = 1 to n
            for j = 1 to n
             d[i, j](k) = min{ d[i, j](k - 1), d[i, k](k - 1) + d[k, j](k - 1) }
    return D^(n)
```

式(23.7)と式(23.8)に従って行列π(k)を計算するバージョン

```c
MOD-FLOYD-WARSHALL(W)
    n = W.rows
    D(0) = W
    let π(0) be a new n × n matrix
    for i = 1 to n
        for j = 1 to n
            if i != j and D[i, j](0) < ∞
                π[i, j](0) = i
    for k = 1 to n
        let D(k) be a new n × n matrix
        let π(k) be a new n × n matrix
        for i = 1 to n
            for j = 1 to n
                if d[i, j](k - 1) ≤ d[i, k](k - 1) + d[k, j](k - 1)
                    d[i, j](k) = d[i, j](k - 1)
                    π[i, j](k) = π[i, j](k - 1)
                else
                    d[i, j](k) = d[i, k](k - 1) + d[k, j](k - 1)
                    π[i, j](k) = π[k, j](k - 1)
```

#### 解析

Floyd-Warshallアルゴリズムの実行時間は第2～6行の3重のforループによって定まる。

第6行は$O(1)$時間で実行できるので、このアルゴリズムの実行時間は$Θ(n³)$である。第23.1節の最後のアルゴリズムと同様、この擬似コードはタイトで、複雑なデータ構造を含まず、$Θ-$記法に隠された定数は小さい。

したがって、Floyd-Warshallアルゴリズムは、適度に大きな入力グラフに対しても非常に実用的である。

### 疎グラフに対するJohnsonのアルゴリズム

#### 擬似コード

```c
JOHNSON(G, w)
    G`を計算する。ここで、G`.V = G`.V ∪ {s}, G`.E = G.E ∪ {(s, v): v ∈ G.V}, かつすべての v ∈ G.V に対して w(s, v) = 0
    if BELLMAN-FORD(G`, w, s) == FALSE
        "入力グラフは負閉路を含む"をプリントする
    else for 各頂点 v ∈ G`.V
            h(v)を BELLMAN-FORD アルゴリズムを用いて計算した δ(s, v) 値に設定
        for 各辺(u, v) ∈ G`.E
            w^(u, v) = w(u, v) + h(u) − h(v)
        D = (d_uv)を新しい n x n 型行列とする
        for 各頂点 u ∈ G.V
            DIJKSTRA(G, w^, u)を実行し、すべての頂点v ∈ G.V に対して δ^(u, v) を計算する
        for 各頂点 v ∈ G.V
            d_uv = δ^(u, v) + h(v) − h(u)
    return D
```

#### 解析

Dijkstraのアルゴリズムが用いるmin優先度つきキューをフィボナッチヒープで実装すると、Johnsonのアルゴリズムの実行時間は $O(V²lgV + VE)$ である。
もっと簡単な2分minヒープで実装すると、実行時間は $O(VElgV)$ となるが、グラフが疎ならば、これでもまだFloyd-Warshallのアルゴリズムよりも速い。

## 最大フロー

### Ford-Fulkerson法

#### 擬似コード

```c
FORD-FULKSON(G, s, t)
    for 各辺 (u, v) ∈ G.E
        (u, v).f = 0
    while 残余ネットワーク Gf に s から t への経路pが存在する
        cf(p) = min{ cf(u, v) : (u, v)はpに属する }
        for 経路 p 上の各辺 (u, v)
            if (u, v) ∈ G.E
                (u, v).f = (u, v).f + cf(p)
            else (v, u).f = (v, u).f - cf(p)
    return f
```
