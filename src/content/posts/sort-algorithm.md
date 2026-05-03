---
title: ソートアルゴリズム
published: 2025-02-21
tags: [Japanese, Note]
category: Knowledge
draft: false
lang: jp
---

## 挿入ソート

### 擬似コード

```c
INSERTION-SORT(A, n)
    for i = 2 to n
        key = A[i]
        // A[i]をソート済みの部分配列A[1 : i - 1]に挿入する
        j = i - 1
        while j > 0 and A[j] > key
            A[j + 1] = A[j]
            j = j - 1
        A[j + 1] = key
```

以下は単調減少順のINSERTION-SORT

```c
INSERTION-SORT(A, n)
    for i = 2 to n
        key = A[i]
        j = i - 1
        while j > 0 and A[j] < key
            A[j + 1] = A[j]
            j = j - 1
        A[j + 1] = key
```

### ループ不変式

1. **初期条件**:  
    ループ不変式がループの最初の繰返し（$i = 2$ の繰返し）の直前で成立していることを示すことから始める。  
    このとき、部分配列 $A[1:i-1]$ は唯一の要素 $A[1]$ から成され、実際、元 $A[1]$ は格納されていた要素と等しいので、この部分配列はトリビアルにソート済みである。  
    よって、最初の繰返しの直前でループ不変式は真である。

2. **ループ内条件**:  
    ループ不変式をすべての繰返しの直前で真であることを示すため、  
    1回の繰返しがループ不変式を維持することを確認する。  
    for ループの本体が行っているのは、$A[i]$ を入れるべき場所が見つかるまで $A[i-1]$, $A[i-2], A[i-3]$ をそれぞれ 1 つ右に移し（第 4〜7 行）、
    空いた場所 $A[i]$ に値を挿入する（第 8 行）。  
    この結果、部分配列 $A[1:i]$ は元 $A[1:i]$ に格納されていた要素から構成されているが、すでにソートされている。  
    for ループの次の繰返しのために $i$ の値を 1 増やす（incrementing）とループ不変式が維持される。

3. **終了条件**:  
    最後に、ループの停止を調べる。ループ変数 $i$ は初期値が 2 で、各繰返しで 1 ずつ増加する。  
    第 1 行での値が $n+1$ を超えれば、ループは停止する。つまり、$i = n+1$ で停止し、部分配列 $A[1:n]$ は、開始時点で $A[1:n]$ に格納されていた要素がすべて含まれている。  
    これらの要素はすでにソートされている。したがって、アルゴリズムは正当である。

### 解析

1. **最悪の場合の定義**
    入力配列が降順に並んでいる場合、各要素を正しい位置に挿入するために、それ以前のすべての要素と比較する必要があります。このとき、最悪実行時間が生じます。

2. **実行時間の解析**
    挿入ソートの実行時間 $T(n)$ は、以下のループの各行のコストに基づいて計算されます。

    - **外側の for ループ** (2行目から8行目):
    $i = 2, 3, \ldots, n$ に対して実行されます。

    - **内側の while ループ** (5行目から7行目):
    最悪の場合、while ループは $A[i]$ が配列 $A[1:i-1]$ のすべての要素より小さい場合に実行され、比較と移動が $i-1$ 回行われます。

3. **実行時間の式**
    各行のコストを $c_1, c_2, \ldots, c_8$ とした場合、最悪の場合の実行時間は次のように表されます。

    $$
    T(n) = c_1 n + c_2 (n-1) + c_4 (n-1) + c_5 \sum_{i=2}^n (i-1) + c_6 \sum_{i=2}^n (i-1) + c_7 \sum_{i=2}^n (i-1) + c_8 (n-1)
    $$

4. **和の計算**
    以下の和を計算します。

    $\sum_{i=2}^n (i-1)$ を計算：
    $$
    \sum_{i=2}^n (i-1) = \sum_{i=2}^n i - \sum_{i=2}^n 1 = \left(\sum_{i=1}^n i\right) - 1 - (n-1)
    $$

    式 $\sum_{i=1}^n i = \frac{n(n+1)}{2}$ を用いると：
    $$
    \sum_{i=2}^n (i-1) = \frac{n(n+1)}{2} - n = \frac{n(n-1)}{2}
    $$

5. **実行時間の整理**
    これを $T(n)$ に代入すると：

    $$
    T(n) = c_1 n + c_2 (n-1) + c_4 (n-1) + c_5 \frac{n(n-1)}{2} + c_6 \frac{n(n-1)}{2} + c_7 \frac{n(n-1)}{2} + c_8 (n-1)
    $$

    さらにまとめると：
    $$
    T(n) = \left(\frac{c_5 + c_6 + c_7}{2}\right)n^2 + \left(c_1 + c_2 + c_4 + \frac{c_5 + c_6 + c_7}{2} + c_8\right)n - (c_2 + c_4 + c_5 + c_8)
    $$

6. **線形関数としての表現**
    最悪の場合の実行時間は、以下のように表されます：

    $$
    T(n) = an^2 + bn + c
    $$

    ここで：

    - $a = \frac{c_5 + c_6 + c_7}{2}$
    - $b = c_1 + c_2 + c_4 + \frac{c_5 + c_6 + c_7}{2} + c_8$
    - $c = -(c_2 + c_4 + c_5 + c_8)$

以上が、挿入ソートの最悪実行時間を導く過程です。この計算により、挿入ソートは最悪の場合において $O(n^2)$ の計算量であることが示されます。

## 線形探索

### 擬似コード

以下は線形探索である

```c
LINEAR-SEARCH(A, v)
    for i = 1 to A.length
       if A[i] == v
            return i
    return NIL
```

以下は2分探索である

反復:

```c
ITERATIVE-BINARY-SEARCH(A, v, low, high)
    while low ≤ high
        mid = floor((low + high) / 2)
        if v == A[mid]
            return mid
        else if v > A[mid]
            low = mid + 1
        else high = mid - 1
    return NIL
```

再帰:

```c
RECURSIVE-BINARY-SEARCH(A, v, low, high)
    if low > high
        return NIL
    mid = floor((low + high) / 2)
    if v == A[mid]
        return mid
    else if v > A[mid]
        return RECURSIVE-BINARY-SEARCH(A, v, mid + 1, high)
    else return RECURSIVE-BINARY-SEARCH(A, v, low, mid - 1)
```

## 選択ソート

### 擬似コード

```c
SELECTION-SORT(A, n)
    n = A.length
    for i = 1 to n - 1
        minIndex = i
        for j = i + 1 to n
            if A[j] < A[minIndex]
                minIndex = j
        A[i]をA[minIndex]と交換する
```

最悪実行時間は$O(n^2)$である。

## マージソート

### 擬似コード

```c
MERGE(A, p, q, r)
    nL = q - p + 1      // A[p : q]の長さ
    nR = r - q      // A[q + 1 : r]の長さ
    L[0 : nL - 1]とR[0 : nR - 1]を新しい配列とする
    for i = 0 to nL - 1     // A[p : q]をL[0 : nL - 1]にコピーする
        L[i] = A[p + i]
    for j = 0 to nR - 1     // A[q + 1 : r]をR[0 : nR - 1]にコピーする
        R[j] = A[q + j + 1]
    i = 0   // iはLの中で最小の残っている要素のインデックスを登録する
    j = 0   // jはRの中で最小の残っている要素のインデックスを登録する
    k = p   // kはAを埋める場所のインデックスを登録する
    //各配列LとRがまだマージされていない要素を含む限り、まだマージされていない最小の要素をA[p : r]にコピーする
    while i < nL and j < nR
        if L[i] <= R[j]
            A[k] = L[i]
            i = i + 1
        else A[k] = R[j]
            j = j + 1
        k = k + 1
    // LかRの1つを完全に処理したので、もう1つの残りをA[p : r]の最後にコピーする
    while i < nL
        A[k] = L[i]
        i = i + 1
        k = k + 1
    while j < nR
        A[k] = R[j]
        j = j + 1
        k = k + 1
```

```c
MERGE-SORT(A, p, r)
    if p >= r   // 0個か1個の要素？
        return
    q = floor((p + r)/2)    // A[p : r]の中点
    MERGE-SORT(A, p, q)   // 再帰的にA[p : q]をソート
    MERGE-SORT(A, q + 1, r)   // 再帰的にA[q + 1 : r]をソート
    // A[p : q]とA[q + 1 : r]をマージしてA[p : r]へ戻す
    MERGE(A, p, q, r)
```

以下はセンチネルを使用せずのMERGE

```c
MERGE(A, p, q, r)
    n1 = q - p + 1
    n2 = r - q
    L[0 : n1 - 1]とR[0 : n1 - 1]を新しい配列とする
    for i = 1 to n1
        L[i] = A[p + i - 1]
    for j = 1 to n2
        R[j] = A[q + j]
    i = 1
    j = 1
    for k = p to r
        if i > n1
            A[k] = R[j]
            j = j + 1
        else if j > n2
            A[k] = L[i]
            i = i + 1
        else if L[i] ≤ R[j]
            A[k] = L[i]
            i = i + 1
        else
            A[k] = R[j]
            j = j + 1
```

### 解析

以下は、マージソート(Merge Sort)の最悪実行時間について、簡単に説明します。

1. **マージソートの基本動作**
    1. **分割(Divide)**  
    配列を半分に分割し、各部分を再帰的にソートします。この操作は配列サイズが $n$ の場合、分割の深さが $\log n$ レベルになります。

    2. **統治(Conquer)**  
    各部分配列を結合（マージ）してソート済みの配列を作成します。各レベルで配列全体にわたってマージ操作を行うので、各レベルのコストは $O(n)$ です。

2. **再帰的な式の構築**
    分割と結合を考慮すると、マージソートの実行時間 $T(n)$ は以下のような再帰式で表されます：

    $$
    T(n) = 2T\left(\frac{n}{2}\right) + cn
    $$

    - $2T\left(\frac{n}{2}\right)$：配列を2つに分割し、それぞれの部分配列をソートする時間。
    - $cn$：現在のレベルでのマージ操作に必要な時間。

3. **再帰式の解法**
   1. 再帰式を展開すると、分割の深さごとにコストを計算できます。
   2. 再帰の深さは $\log n$ レベルであり、各レベルのコストは $O(n)$ です。
   3. すべてのレベルのコストを合計すると：

   $$
   T(n) = cn \log n + cn
   $$

4. **最悪実行時間の結論**
    最悪実行時間は再帰的分割と統治に基づき、次のように表されます：

    $$
    T(n) = \Theta(n \log n)
    $$

## バブルソート

### 擬似コード

```c
BUBBLESORT(A, n)
    for i = 1 to n - 1
        for j = n downto i + 1
            if A[j] < A[j - 1]
                A[j]とA[j - 1]を交換する
```

### ループ不変式

1. 行2 ~ 4のforループ
    行2-4の for ループの各繰り返しの開始時点で、部分配列 $A[j..n]$ は、ループ開始前に $A[j..n]$ に存在していた要素から構成されますが、その順序は変わっている可能性があります。
    ただし、先頭の要素 $A[j]$ はその部分配列内で最小の要素です。

    1. **初期条件**:  
    初期状態では、部分配列 $A[n]$ は最後の要素のみを含んでおり、この要素は自明的に部分配列内の最小要素です。

    2. **ループ内条件**:  
    各ステップで $A[j]$ と $A[j-1]$ を比較し、$A[j-1]$ をその部分配列内で最小の要素にします。ループの繰り返し後、部分配列の長さは1つ増加し、先頭の要素は依然としてその部分配列内で最小の要素です。

    3. **終了条件**:  
    ループは $j = i$ のとき終了します。ループ不変式によると、$A[i]$ は $A[i..n]$ 内で最小の要素であり、$A[i..n]$ はループ開始前の $A[i..n]$ に存在していた要素から構成されています。

2. 行1 ~ 4のforループ
    行1-4の for ループの各繰り返しの開始時点で、部分配列 $A[1..i-1]$ は、$A[1..n]$ 内の $i-1$ 個の最小要素で構成され、昇順に整列されています。
    一方、$A[i..n]$ は $A[1..n]$ 内の残りの $n-i+1$ 個の要素で構成されています。

    1. **初期条件**:  
    初期状態では、部分配列 $A[1..i-1]$ は空であり、自明的に部分配列内の最小要素が含まれています。

    2. **ループ内条件**:  
    (b) の結果から、内側のループの実行後、$A[i]$ は部分配列 $A[i..n]$ 内で最小の要素になります。そして外側のループ開始時点では、$A[1..i-1]$ は $A[i..n]$ の要素より小さい要素から構成され、昇順に整列されています。
    したがって、外側のループの実行後、部分配列 $A[1..i]$ は $A[i+1..n]$ の要素より小さい要素から構成され、昇順に整列されます。

    3. **終了条件**:  
    ループは $i = A.length$ のとき終了します。この時点で配列 $A[1..n]$ はすべての要素を含み、昇順に整列されています。

## ヒープソート

### ヒープ条件の維持

#### 擬似コード

```c
MAX-HEAPIFY(A, i)
    l = LEFT(i)
    r = RIGHT(i)
    if l <= heap-size[A] and A[l] > A[i]
        largest = l
    else largest = i
    if r <= heap-size[A] and A[r] > A[largest]
        largest = r
    if largest != i
        A[i]をA[largest]と交換する
        MAX-HEAPIFY(A, largest)
```

MIN-HEAPIFYバージョン

```c
MIN-HEAPIFY(A, i)
    l = LEFT(i)
    r = RIGHT(i)
    if l ≤ A.heap-size and A[l] < A[i]
        smallest = l
    else smallest = i
    if r ≤ A.heap-size and A[r] < A[smallest]
        smallest = r
    if smallest != i
        A[i]をA[smallest]と交換する
        MIN-HEAPIFY(A, smallest)
```

再帰の代わりに繰り返し構造子 (ループ) を使うバージョン

```c
MAX-HEAPIFY(A, i)
    while true
        l = LEFT(i)
        r = RIGHT(i)
        if l ≤ A.heap-size and A[l] > A[i]
            largest = l
        else largest = i
        if r ≤ A.heap-size and A[r] > A[largest]
            largest = r
        if largest == i
            return
        A[i]をA[largest]と交換する
        i = largest
```

#### 解析

1. **操作の流れ**
    MAX-HEAPIFYは、与えられた節点 $i$ を根とする部分木が max ヒープ条件を満たすように調整する操作です。この操作の流れは以下の通りです：

    1. **比較と選択**:  
    節点 $i$ の値をその左右の子（$LEFT(i)$ および $RIGHT(i)$）の値と比較し、3つの中で最大の値を持つ節点を特定します。

    2. **交換と再帰呼び出し**:  
    最大値を持つ節点が $i$ ではない場合、節点 $i$ とその最大値を持つ子を交換します。その後、交換によって影響を受けた子部分木に対して再帰的に **MAX-HEAPIFY** を呼び出します。

2. **実行時間の解析**:  
    - **1回の呼び出しのコスト**:  
    1回の比較操作(左右の子と比較)にかかる時間は定数時間 $O(1)$ です。ただし、交換後に再帰的に操作を繰り返すため、実行時間は部分木の高さに依存します。

    - **再帰関係**:  
    再帰的な呼び出しに基づく実行時間は以下の漸化式で表されます：
    $$
    T(n) \leq T\left(\frac{2n}{3}\right) + O(1)
    $$
    ここで、$\frac{2n}{3}$ は、節点 $i$ の2つの子のうち、より大きな部分木のサイズを示します。

    - **解法と結論**:  
    マスター定理（画像の参照）を適用すると、この漸化式の解は：
    $$
    T(n) = O(\log n)
    $$
    となります。したがって、**MAX-HEAPIFY** の最悪実行時間は木の高さ（$\log n$）に比例します。

### ヒープの構築

#### 擬似コード

```c
BUILD-MAX-HEAP(A, n)
    A.heap-size = n
    for i = floor(n/2) downto 1
        MAX-HEAPIFY(A, i)
```

MAX-HEAP-INSERTを呼び出しバージョン

```c
BUILD-MAX-HEAP`(A)
    A.heap-size = 1
    for i = 2 to A.length
        MAX-HEAP-INSERT(A, A[i])
```

#### 解析

##### ループ不変式

ループ不変式の定義:  
for ループ(行2 - 3)の各繰り返しの開始時点で、各節点 $i+1, i+2, \ldots, n$ は max ヒープの根である。

1. **初期条件**:  
ループの最初の繰り返しの直前では、$i = \lfloor n/2 \rfloor$ である。  
このとき、$i+1, i+2, \ldots, n$ は葉ノードであり、葉ノードは自明的に max ヒープの根である。したがって、ループ不変式は成立する。

2. **ループ内条件**:  
各繰り返しで、節点 $i$ の左右の子を根とする部分木に対して **MAX-HEAPIFY** を呼び出す。この操作により、節点 $i$ を根とする部分木が max ヒープ条件を満たすようになる。  
さらに、次の繰り返しでは $i$ が 1 減少するため、ループ不変式は維持される。

3. **終了条件**:  
手続きは $i = 0$ で終了する。ループ不変式によれば、終了時点で各節点 $1, 2, \ldots, n$ が max ヒープの根である。したがって、配列全体が max ヒープになっている。

##### 実行時間

1. **MAX-HEAPIFY のコスト**:  
   MAX-HEAPIFY の実行時間は節点の高さに比例し、最悪の場合 $O(h)$ です。

2. **控える必要な事実**:  
   1. 高さ $h$ の節点数はおおよそ $\lceil n/2^{h+1} \rceil$ 個です。
   2. n個節点を含むヒープの深さはおおよそ $\lfloor \log n \rfloor$ である。

3. **全体のコスト**:  
   BUILD-MAX-HEAP のコストは、すべての節点に対して MAX-HEAPIFY を適用する際の時間の合計です。この合計は以下のように表されます：
   $$
   T(n) = \sum_{h=0}^{\lfloor \log n \rfloor} \lceil \frac{n}{2^{h+1}} \rceil O(h)
   $$
   $$
    \leq \sum_{h=0}^{\lfloor \log n \rfloor} \frac{n}{2^h} ch
   $$
   $$
    = cn \sum_{h=0}^{\lfloor \log n \rfloor} \frac{h}{2^h}
   $$
   $$
    < cn \sum_{h=0}^{\infty} \frac{h}{2^h}
   $$
   公式$\sum_{k=0}^{\infty} kx^k = \frac{x}{(1-x)^2}$を用いると:  
   $$
   \leq cn \frac{\frac{1}{2}}{(1-\frac{1}{2})^2} = O(n)
   $$

4. **漸近的評価**:  
   付録の公式（図中の式）を用いると、この和は定数に収束することが示されます。したがって：
   $$
   T(n) = O(n)
   $$

### ヒープソートアルゴリズム

#### 擬似コード

```c
HEAPSORT(A, n)
    BUILD-MAX-HEAP(A, n)
    for i = n downto 2
        A[1]をA[i]と交換する
        A.heap-size = A.heap-size - 1
        MAX-HEAPIFY(A, 1)
```

#### 解析

##### ループ不変式

1. **初期条件**:  
部分配列 $A[i+1..n]$ は空であるため、この時点でループ不変式は成立している。

2. **維持条件**:  
$A[1]$ は部分配列 $A[1..i]$ の中で最大の要素であり、$A[i+1..n]$ の要素よりも小さい。  
この要素を位置 $i$ に移動させることで、部分配列 $A[i..n]$ は最大の要素を含み、整列されている。  
ヒープのサイズを減らし、**MAX-HEAPIFY** を呼び出すことで、部分配列 $A[1..i-1]$ が再び max ヒープになる。  
その後、$i$ をデクリメントすることで、次の繰り返しに対するループ不変式が整備される。

3. **終了条件**:  
ループが終了するとき、$i = 1$ である。  
この時点で、部分配列 $A[2..n]$ は整列済みであり、$A[1]$ は配列内で最小の要素である。  
したがって、配列全体 $A[1..n]$ は整列されている。

##### 実行時間

BUILD-MAX-HEAPの呼出しに$O(n)$時間かかり、1回の呼出しに$O(\log n)$時間かかるMAX-HEAPIFYが$n - 1$回呼び出されるので、手続きHEAPSORTの実行時間は$O(n \log n)$である。

## クイックソート

### 擬似コード

```c
QUICKSORT(A, p, r)
    if p < r
        // ピボットを中心に部分配列を分割する。ピボットは最終的にA[q]で終わる
        q = PARTITION(A, p, r)
        QUICKSORT(A, p, q - 1)  // 下側を再帰的にソート
        QUICKSORT(A, q + 1, r)  // 上側を再帰的にソート
```

```c
PARTITION(A, p, r)
    x = A[r]    // ピボット
    i = p - 1   // 下側で最大のインデックス
    for j = p to r - 1  // ピボット以外の各要素を処理
        if A[j] <= x    // この要素は下側に属する？
            i = i + 1   // 下側の新しいスロットのインデックス
            A[i]をA[j]と交換する    // この要素をそこに置く
    A[i + 1]をA[r]と交換する    // ピボットは下側のすぐ右に移動
    return i + 1    // ピボットの新しいインデックス
```

以下はHOAREの最初のPARTITIONアルゴリズム

```c
HOARE-PARTITION(A, p, r)
    x = A[p]
    i = p - 1
    j = r + 1
    while TRUE
        repeat
            j = j - 1
        until A[j] <= x
        repeat
            x = x + 1
        until A[x] >= x
        if x < y
            A[i]をA[j]と交換する
        else return j
```

### 乱択版擬似コード

```c
RANDOMIZED-QUICKSORT(A, p, r)
    if p < r
        q = RANDOMIZED-PARTITION(A, p, r)
        QUICKSORT(A, p, q - 1)
        QUICKSORT(A, q + 1, r)
```

```c
RANDOMIZED-PARTITION(A, p, r)
    i = RANDOM(p, r)
    A[r]をA[i]と交換する
    return PARTITION(A, p, r)
```

### 解析

#### ループ不変式

行 3 - 4 の各繰り返しの開始時点で、部分配列 $A[p..i]$ は $x$ 以下の値を含み、$A[i+1..j-1]$ は $x$ より大きい値を含む。
$A[j..r-1]$ は未確認の値で構成され、$A[r]$ はピボット値 $x$ である。

1. **初期条件**
ループの最初の繰り返しの直前では、$i = p-1$ かつ $j = p$ である。このとき、部分配列 $A[i+1..j-1]$ と $A[j..r-1]$ は空であるため、ループ不変式が成立する。

2. **維持条件**
各繰り返しで、次の 2 つの場合を考える：
   1. **$A[j] > x$ の場合**:  
   この場合、$j$ を単に $1$ 増加させる。これにより、$A[j]$ は $A[i+1..j-1]$ に加えられることなく $x$ より大きい部分に残り、ループ不変式が維持される。

   2. **$A[j] \leq x$ の場合**:  
   この場合、$i$ を $1$ 増加させた後、$A[i]$ と $A[j]$ を交換する。この操作により、$A[i]$ は $A[p..i]$ に追加され、$x$ 以下の値として正しい位置に収まる。結果としてループ不変式が維持される。

3. **終了条件**
ループは $j = r$ で停止する。この時点で、$A[j..r-1]$ は空となり、配列全体は次の 3 つの部分に分割されている：

   - $A[p..i]$：$x$ 以下の値。
   - $A[i+1..r-1]$：$x$ より大きい値。
   - $A[r]$：ピボット値 $x$。

ピボット値を正しい位置 $i+1$ に移動することで、PARTITION 手続きは完了し、部分配列 $A[p..r]$ が適切に分割される。

#### 最悪実行時間

1. **漸化式**
    QUICKSORT の最悪実行時間は、分割が極端に偏った場合（片側にすべての要素が集中するケース）に発生します。この場合、漸化式は次のように表されます：
    $$
    T(n) = T(q) + T(n-1-q) + \Theta(n), \quad 0 \leq q \leq n-1
    $$
    ここで、$q$ は部分配列の要素数を示します。

2. **最悪ケース**
    最悪ケースでは、分割が片側に極端に偏るため、$q = 0$ または $q = n-1$ となります。この場合の漸化式は：
    $$
    T(n) = T(n-1) + \Theta(n)
    $$

3. **漸化式の解**
    上記の漸化式を展開すると：

    $$
    T(n) = T(n-1) + \Theta(n)
    $$
    $$
    = T(n-2) + \Theta(n-1) + \Theta(n)
    $$
    $$
    = \cdots
    $$
    $$
    = T(1) + \sum_{i=1}^{n} \Theta(i)
    $$

    最後の和は等差数列であるため：

    $$
    T(n) = \Theta(n^2)
    $$

#### 期待実行時間

1. **分割の期待ケース**
    RANDOMIZED-QUICKSORT は、ランダムにピボットを選択することで、分割がほぼ均等になるように設計されています。このアルゴリズムの期待実行時間を解析するには、次の漸化式を考えます：
    $$
    T(n) = \max\{T(q) + T(n-1-q)\} + \Theta(n), \quad 0 \leq q \leq n-1
    $$
    ただし、ランダム性を考慮すると、分割が偏りにくいため、$q \approx n/2$ に近いケースが期待されます。

2. **比較回数の期待値**
   - 補題: 任意の2つの要素$z_i$と$z_j$ (i < j) が与えられたとき、この2つの要素が比較される確率は$2/(j - i + 1)$である。
        証明：
            $$
                P\{z_iとz_jが比較される\} = P\{z_iまたはz_jがZ_{ij}から選ばれる最初のピボット\}
            $$
            $$
                = P\{z_iがZ_{ij}から選ばれる最初のピボット\} + P\{z_jがZ_{ij}から選ばれる最初のピボット\}
            $$
            $$
                = \frac{2}{j - i + 1}
            $$
   - 比較回数 $X$ をランダム変数として、指標確率変数を$X_{ij} = I\{z_iとz_jが比較される\}$と定義する。
   - 以上より、$X = \sum_{i=1}^{n-1} \sum_{j=i+1}^n X_{ij}$になっている。
   - 期待値 $\mathbb{E}[X]$ は次のように評価されます：
    $$
    \mathbb{E}[X] = \mathbb{E}[\sum_{i=1}^{n-1} \sum_{j=i+1}^n X_{ij}]
    $$
    $$
    = \sum_{i=1}^{n-1} \sum_{j=i+1}^n \mathbb{E}[X_{ij}]
    $$
    $$
    = \sum_{i=1}^{n-1} \sum_{j=i+1}^n \mathbb{E}[I\{z_i \text{ と } z_j \text{ が比較される}\}]
    $$
    補題を用いると：
    $$
    \mathbb{E}[X] = \sum_{i=1}^{n-1} \sum_{j=i+1}^n \frac{2}{j-i+1}
    $$
    変数を $k = j-i$ に変換し、調和数の公式$\sum_{k=1}^{n} \frac{1}{k} = \ln n + O(1)$を用いると：
    $$
    \mathbb{E}[X] = \sum_{i=1}^{n-1} \sum_{k=1}^{n-i} \frac{2}{k+1}
    $$
    $$
    < \sum_{i=1}^{n-1} \sum_{k=1}^{n} \frac{2}{k}
    $$
    $$
    = \sum_{i=1}^{n-1} O(\log n)
    $$
    $$
    = O(n \log n)
    $$

3. **結論**
    ランダム性によって分割のバランスが期待されるため、RANDOMIZED-QUICKSORT の期待実行時間は次のように評価されます：
    $$
    T(n) = O(n \log n)
    $$

## 計数ソート

### 擬似コード

```c
COUNTING-SORT(A, n, k)
    B[1 : n]とC[0 : k]を新しい配列とする
    for i = 0 to k
        C[i] = 0
    for j = 1 to n
        C[A[j]] = C[A[j]] + 1
    // C[i]はiに等しい要素の個数を持っている
    for i = 1 to k
        C[i] = C[i] + C[i - 1]
    // C[i]はi以下の要素の数を示す
    // AはBにコピーし、Aの最後から始める
    for j = n downto 1
        B[C[A[j]]] = A[j]
        C[A[j]] = C[A[j]] - 1   // 重複する値の扱い
    return B
```

```c
MODIFIED-COUNTING-SORT(A, n, k)
    let C[0..k] be a new array
    for i = 1 to k
        C[i] = 0
    for j = 1 to n
        C[A[j]] = C[A[j]] + 1
    for i = 2 to k
        C[i] = C[i] + C[i - 1]
    insert sentinel element NIL at the start of A
    B = C[0..k - 1]
    insert number 1 at the start of B
    // B now contains the "endpoints" for C
    for i = 2 to n
        while C[A[i]] != B[A[i]]
            key = A[i]
            exchange A[C[A[i]]] with A[i]
            while A[C[key]] == key // make sure that elements with the same keys will not be swapped
                C[key] = C[key] - 1
    remove the sentinel element
    return A
```

### 解析

#### 実行時間

計数ソートの実行時間を検討する。
第2 ~ 3行のforループに$\Theta(k)$時間、第4 ~ 5行のforループに$\Theta(n)$時間、第7 ~ 8行のforループに$\Theta(k)$時間、
そして第11 ~ 13行のforループに$\Theta(n)$時間がかかる。
したがって、全体の実行時間は$\Theta(k + n)$である。通常$k = O(n)$のとき、計数ソートを用いる。実際には実行時間は$\Theta(n)$である。

## 基数ソート

### 擬似コード

```c
RADIX-SORT(A, n, d)
    for i = 1 to d
        安定ソートを用いて第i桁に関して配列A[1 : n]をソートする　
```

### 解析

#### 補題 8.3

$n$ 個の $d$ 桁の数が与えられていて、各桁が取りうる値の数が $k$ 以下であると仮定する。サブルーチンとして用いる安定ソートの実行時間が $\Theta(n + k)$ ならば、Radix-Sort はこれらの数を次の時間でソートする：

$$
\Theta(d(n + k))
$$

**証明**  
Radix-Sort の正当性はソートされている列に関する帰納法によって示すことができる（練習問題 8.3-3 を参照）。  
実行時間の解析は中間ソートとして用いる安定ソートに依存する。  
各桁のうち 0 から $k - 1$ の範囲にあり（それぞれ $k$ 個の値を取りうる）、各桁のソートは $\Theta(n + k)$ 時間を必要とする。  
この操作を $d$ 桁すべてに対して実行するため、全体の実行時間は：

$$
\Theta(d(n + k))
$$

となる。

#### 補題 8.4

$n$ 個の $d$ 桁の数が与えられていて、各桁の数を $b$-ビットで表現する。サブルーチンとして Counting-Sort を使用する場合、Radix-Sort の総実行時間は次の式で与えられる：

$$
\Theta\left( \frac{b}{r}\left( n + 2^r \right) \right)
$$

**証明**  
値を各桁に対して、各キーを $b$-ビットで表現した場合における次のような実行時間を考える。

1. 各桁あたりの取りうる値の数を $2^r$ とする。
2. サブルーチン Counting-Sort の実行時間は $\Theta(n + 2^r)$ であり、これは各桁ごとのコストを決定する。
3. 全体の桁数 $d$ に基づき、Radix-Sort の実行時間は：

    $$
    \Theta(d(n + 2^r))
    $$

4. 条件 $b = \log n$ を満たすとき、実行時間は $O(n \log n)$ に近くなる。

したがって、総実行時間は次の式で表される：

$$
\Theta\left( \frac{b}{r}\left( n + 2^r \right) \right)
$$

## バケツソート

### 擬似コード

```c
BUCKET-SORT(A, n)
    B[0 : n - 1]を新しい配列とする
    for i = 0 to n - 1
        B[i]を空リストに初期化する
    for i = 1 to n
        A[i]をリストB[floor(n * A[i])]に挿入する
    for i = 0 to n - 1
        リストB[i]を挿入ソートでソートする
    リストB[0], B[1], ..., B[n - 1]をこの順序で連接する
    return 連結されたリスト
```

### 解析

#### 実行時間

1. **実行時間の分解**
バケットソートの実行時間を解析するため、以下の2つの部分に分けて考える：
   1. **第7行以外**の実行時間は、最悪の場合でも $O(n)$ 時間である。
   2. **第7行の挿入ソート**にかかる実行時間は、各バケット内の要素数 $n_i$ に依存する。

2. **全体の実行時間**
    挿入ソートは 2 次の多項式時間で動作するため、バケットソート全体の実行時間 $T(n)$ は以下の式で表される：
    $$
    T(n) = \Theta(n) + \sum_{i=0}^{n-1} O(n_i^2)
    $$

#### 平均時の実行時間の期待値

1. **期待値の計算**

    期待値を計算する際、入力分布の一様性に基づき、期待値の線形性を適用する：
    $$
    E[T(n)] = E\left[\Theta(n) + \sum_{i=0}^{n-1} O(n_i^2)\right]
    $$
    $$
    = \Theta(n) + \sum_{i=0}^{n-1} E[O(n_i^2)]
    $$
    $$
    = \Theta(n) + n \cdot O(E[n_i^2])
    $$

2. **各バケットの要素数 $n_i^2$ の期待値**

    各バケットに要素が均等に割り振られると仮定すると：
    $$
    E[n_i^2] = Var[n_i] + E^2[n_i]= (1 - 1/n) + 1^2 = 2 - 1/n
    $$

#### 結論

バケットソートの期待実行時間は以下のように評価される：
$$
E[T(n)] = \Theta(n) + n \cdot O(2 - 1/n) = \Theta(n)
$$

## 線形期待時間選択アルゴリズム

### 擬似コード

```c
RANDOMIZED-SELECT(A, p, r, i)
    if p == r
        return A[p] // 1 ≤ i ≤ r − p + 1 は p == r が i = 1 である。
    q = RANDOMIZED-PARTITION(A, p, r)
    k = q − p + 1
    if i == k
        return A[q] // このピボットの値が答えである
    elseif i < k
        return RANDOMIZED-SELECT(A, p, q − 1, i)
    else return RANDOMIZED-SELECT(A, q + 1, r, i − k)
```

以下は反復バージョン

```c
PARTITION(A, p, r)
    x = A[r]
    i = p
    for k = p - 1 to r
       if A[k] < x
           i = i + 1
           swap A[i] with A[k]
    i = i + 1
    swap A[i] with A[r]
    return i
```

```c
RANDOMIZED-PARTITION(A, p, r)
    x = RANDOM(p - 1, r)
    swap A[x] with A[r]
    return PARTITION(A, p, r)
```

```c
RANDOMIZED-SELECT(A, p, r, i)
    while true
        if p == r
            return A[p]
        q = RANDOMIZED-PARTITION(A, p, r)
        k = q - p + 1
        if i == k
            return A[q]
        if i < k
            r = q - 1
        else
            p = q + 1
            i = i - k
```

### 解析

#### 定理 9.2

$n$ 個の異なる要素からなる入力配列に対する手続き **RANDOMIZED-SELECT** の期待実行時間は以下である：
$$
\Theta(n)
$$

#### 証明

1. **分割が有用である確率の定義**
    有用な分割とは、分割が進むたびに要素の集合が十分に減少する分割を指す。各分割について次のように定義する：

    - **集合のサイズ**：$A(h_k)$（世代 $k$ における集合）。
    - **次の分割後の集合サイズ**：$A(h_k + 1), A(h_k + 2), ..., A(h_k + X_k - 1)$。

    ここで：
    $$
    X_k = h_{k+1} - h_k
    $$
    を定義する。つまり、$X_k$ は世代 $k$ における分割後の集合の個数を表す。

2. **分割の有効性と確率**
   - 分割が有用である確率は少なくとも 1/2 である。
   - このとき、分割のたびに集合のサイズは $(3/4) n_0$ 以下に縮小する（$n_0$ は元の入力配列サイズ）。

3. **期待値の計算**
    分割が有効である場合に、比較回数の期待値を計算する：

    $$
    E[T(n)] = E\left[\sum_{k=0}^{m-1} X_k \cdot \left(\frac{3}{4}\right)^k n_0\right]
    $$

    ここで $E[X_k] \leq 2$ であることから：

    $$
    E[T(n)] \leq n_0 \sum_{k=0}^{m-1} \left(\frac{3}{4}\right)^k \cdot 2
    $$

#### 結論

等比数列の和を用いて整理すると：

$$
E[T(n)] \leq 2n_0 \cdot \frac{1}{1 - \frac{3}{4}} = 8n_0
$$

したがって、RANDOMIZED-SELECT の期待実行時間は次のように評価される：

$$
\Theta(n)
$$

## 線形最悪時間選択アルゴリズム

### 擬似コード

```c
SELECT(A, p, r, i)
    while (r − p + 1) mod 5 != 0
        for j = p + 1 to r
            if A[p] > A[j] // 最小値を A[p] に置く
                A[p] を A[j] と交換する
        // A[p:r] の最小値が得られれば、これで終わり
        if i == 1
            return A[p]
        // そうでなければ、A[p + 1:r] の (i − 1) 番目の要素を得たい
        p = p + 1
        i = i − 1
    g = (r − p + 1) / 5     // 5 要素のグループの個数
    for j = p to p + g − 1  // 各グループをソート
        <A[j], A[j + g], A[j + 2g], A[j + 3g], A[j + 4g]> をその場でソートする
    // すべてのグループ中央値が、今ではA[p : r]の中央の5番目にある
    x = SELECT(A, p + 2g, p + 3g − 1, ceiling(g/2))
    q = PARTITION-AROUND(A, p, r, x)    // ピボットに関して分割
    // 残りは RANDOMIZED-SELECT の第3 ~ 9行とまったく同じである
    k = q + p + 1
    if i == k
        return A[q]     // ピボットの値が答えである
    elseif i < k
        return SELECT(A, p, q − 1, i)
    else return SELECT(A, q + 1, r, i − k)
```

以下は3グループのバージョン

```c
SELECT3(A, p, r, i)
    while (r - p + 1) mod 9 != 0
        for j = p + 1 to r      // 最小値を A[p] に置く
            if A[p] > A[j]
                A[p] を A[j] で置き換える
        // A[p : r] の最小値を求めることが目的なら、ここで終了
        if i == 1
            return A[p]
        // そうでなければ、A[p + 1 : r] の (i - 1) 番目の要素がほしい
        p = p + 1
        i = i - 1
    g = (r - p + 1) / 3     // 3 要素のグループの個数
    for j = p to p + g - 1  // グループを通して調べる
        <A[j], A[j + g], A[j + 2g]> をその場でソート
    // すべてのグループの中央値は今や A[p : r] の中央の 3 番目にある
    g^ = g / 3 // 3 要素の副グループの個数
    for j = p to p + g^ - 1     // 副グループをソートする
        <A[j], A[j + g^], A[j + 2g^]> をその場でソートする in place
    // すべての副グループの中央値は、今や A[p : r] の中央の 9 番目にある
    // ピボット x を再帰的に副グループ中央値の中央値として求める
    x = SELECT3(A, p + 4g^, p + 5g^ - 1, ceiling(g^ / 2))
    q = PARTITION-AROUND(A, p, r, x) // ピボットに関して分割
    // 残りは SELECT3 の第19-24行とまったく同じである
    k = q - p + 1
    if i == k
        return A[q] // このピボットの値が答えである
    elseif i < k
        return SELECT3(A, p, q - 1, i)
    else return SELECT3(A, q + 1, r, i - k)
```

### 解析

#### 定理 9.3

長さ $n$ の入力配列に関する **SELECT** の実行時間は $\Theta(n)$ である。

#### 証明

1. **概要**
    手続き SELECT を用いて、長さ $n$ の入力配列 $A[p:r]$ に対して i 番目に小さい要素を求める場合を考える。  
    このアルゴリズムの実行時間は以下の漸化式で表される：
    $$
    T(n) \leq T(n/5) + T(7n/10) + \Theta(n)
    $$

2. **漸化式の展開**
   - 第 16、23、および 24 行における再帰呼び出しの外側でかかる時間の上界を求める。
   - 第 1-10 行の **while ループ** は最大 $O(n)$ 時間で終了する。第 12-13 行で行われる 5 要素グループのソートは、グループ数 $n/5$ に基づき $O(n)$ 時間かかる。

3. **部分問題の削減**
    ピボット選択後、再帰的な SELECT 呼び出しでは、次のように入力サイズが縮小される：
    - ピボットの両端から除外される要素数の合計は $n/5 + (3n/10)$ 以上である。

    これをもとに、漸化式 $T(n) \leq T(n/5) + T(7n/10) + \Theta(n)$ を用いて解析を進める。

4. **漸化式の解**
    漸化式を次のように展開する：

    $$
    T(n) \leq c(n/5) + c(7n/10) + \Theta(n)
    $$

    $$
    T(n) \leq cn/5 + 7cn/10 + \Theta(n)
    $$

    $$
    T(n) \leq cn + \Theta(n)
    $$

#### 結論

以上の解析より、SELECT の実行時間は $\Theta(n)$ である。  
この結果は SELECT が線形時間で動作することを示している。
