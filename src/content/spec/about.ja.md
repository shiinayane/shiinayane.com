---
lang: ja
translationKey: about
title: プロフィール
description: YANKAI WANG のプロジェクト、研究、経歴、技術的関心について。
---

# プロフィール

東京都在住。

メール：ykwang224[AT]gmail.com

---

## 学歴

**東京大学** · 2025年10月 – 2027年9月（予定）<br>
情報通信工学専攻 修士課程。鈴村研究室にて、Vision-Language-Action（VLA）モデルと科学実験環境における人間・ロボット協働ベンチマークを研究しています。

**上海大学** · 2021年9月 – 2025年7月<br>
電子情報工学 学士。

---

## プロジェクト

### KotobaLab

*個人開発 · SwiftUI · GRDB 7 · SQLite · SwiftData · Swift Testing · iOS 18+*<br>
*2026年4月 – 現在 · 東京*

SwiftUI、MVVM、Clean Architecture を意識したレイヤー設計による、ローカルファーストの日本語辞書アプリです。現在はローカルで開発中です。

- Python パイプラインで29.3万項目、約52 MBの SQLite データベースを生成し、アプリ内リソースとして同梱。
- `PRAGMA case_sensitive_like=ON` により前方一致検索を最適化し、約16 msの全表走査を約0.03 msの複合インデックス検索まで短縮。
- `AppDependencies → Scene → Store → View` の四層構造と、Repository プロトコル／依存性注入により Domain、UI、ストレージを分離。
- GRDB で参照データ、SwiftData でユーザー状態を管理し、Swift Testing でユースケースと Repository の動作を検証。
- 今後は SQLite FTS5、Swift Concurrency による actor 隔離、TestFlight ベータを予定。

::github{repo="shiinayane/KotobaLab"}

### LabMate

*鈴村研究室 · Python · Isaac Sim · VLA モデル*<br>
*2025年12月 – 現在 · 東京*

科学実験環境における人間・ロボット協働のための、シミュレーション優先ベンチマークです。

- LabUtopia を自然言語による協働タスクへ拡張し、確認質問、安全を考慮した拒否、グラウンディング、構造化ログを評価。
- 複数段階の実験手順について、LLM、VLA、ハイブリッド型プランナーを比較する評価基盤を設計。
- 導入済みの3種類のロボットとの将来的な統合を調整し、デモよりも厳密な評価方法を優先。

---

## 経歴

### GlucoPI

*学部卒業研究 · 指導教員：[Qi Zhang](https://scie.shu.edu.cn/Prof/zhangq.htm) 教授*<br>
*2025年2月 – 2025年6月 · 上海*

糖尿病の自己管理、医師とのコミュニケーション、血糖予測を支援する WeChat Mini Program。

- WeChat Mini Program、FastAPI、MySQL、MongoDB、WebSocket による一貫した自己管理システムを開発。
- 認証と権限、血糖／食事／インスリン記録、医師との連携、リアルタイムメッセージ、推移グラフを実装。
- OhioT1DM データセット上で GluPred を再現し、PyTorch による短期血糖予測を検証。
- 診断を目的としない健康案内向けの軽量 LLM Q&A を統合。

::github{repo="shiinayane/glucopi"}

### Arrived or Not

*共同リーダー · 指導教員：[Qi Zhang](https://scie.shu.edu.cn/Prof/zhangq.htm) 教授*<br>
*2023年12月 – 2024年12月 · 上海*

出席管理と授業運営のための機械視覚プラットフォーム。

- RetinaFace と ArcFace 埋め込みを用いたリアルタイム顔認識出席管理を実装。
- 教員／学生向けに授業作成、出席記録、基本的な参加状況の集計を提供。
- Flutter クライアントと FastAPI サービスによる明確なフロントエンド／バックエンド分離を構築。

::github{repo="shiinayane/Arrived-or-Not-Frontend"}

::github{repo="shiinayane/Arrived-or-Not-Backend"}

---

## 関心分野

- **プロダクト優先のエンジニアリング**：実際の問題を解くことを中心に、iOS、バックエンド、フルスタックを手段として扱う。
- **iOS ネイティブアーキテクチャ**：ローカルファースト設計と明確な Domain／UI 分離を重視し、公開できるネイティブアプリを作る。
- **研究からプロダクトへ**：大学院で扱う VLA／LLM 研究を、コンシューマー向けモバイル体験へつなげる。

---

## スキル

- **iOS／Apple プラットフォーム**：Swift、SwiftUI、GRDB、SQLite、SwiftData、Observation、Swift Concurrency、Swift Testing
- **アーキテクチャ／設計**：MVVM、Clean Architecture、Repository Pattern、Dependency Injection、Protocol-Oriented Programming
- **バックエンド／Web**：Python（FastAPI）、JavaScript
- **機械学習／研究**：PyTorch、VLA モデル、Isaac Sim
- **ツール／プラットフォーム**：Git、Docker、Xcode、VS Code、macOS、Linux

---

## 言語

- **日本語**：ビジネスレベル（JLPT N1 121/180）
- **英語**：業務レベル（TOEFL 97/120）
- **中国語**：母語
