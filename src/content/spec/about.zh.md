---
lang: zh_CN
translationKey: about
title: 关于
description: 关于 YANKAI WANG 的项目、研究经历与技术兴趣。
---

# 关于我

现居日本东京。

邮箱：ykwang224[AT]gmail.com

---

## 教育经历

**东京大学** · 2025 年 10 月 – 2027 年 9 月（预计）<br>
信息与通信工学硕士在读，铃村研究室。研究方向是视觉—语言—动作（VLA）模型，以及面向科学实验环境的人机协作基准。

**上海大学** · 2021 年 9 月 – 2025 年 7 月<br>
电子信息工程学士。

---

## 项目

### KotobaLab

*个人项目 · SwiftUI · GRDB 7 · SQLite · SwiftData · Swift Testing · iOS 18+*<br>
*2026 年 4 月至今 · 东京*

一款采用 SwiftUI、MVVM 和 Clean Architecture 分层设计的本地优先日语词典，目前仍在本地开发。

- 通过 Python 数据流水线生成包含 29.3 万词条、约 52 MB 的 SQLite 数据库，并作为应用资源随包发布。
- 使用 `PRAGMA case_sensitive_like=ON` 优化前缀搜索，将基准查询从约 16 ms 的全表扫描降低到约 0.03 ms 的多索引查询。
- 采用 `AppDependencies → Scene → Store → View` 四层结构，并以 Repository 协议和依赖注入隔离领域逻辑、UI 与存储框架。
- 使用 GRDB 管理只读词典数据、SwiftData 保存用户状态，并以 Swift Testing 覆盖领域用例和 Repository 行为。
- 后续计划包括 SQLite FTS5 全文搜索、基于 Swift Concurrency 的 actor 隔离 Repository，以及 TestFlight 测试。

::github{repo="shiinayane/KotobaLab"}

### LabMate

*铃村研究室 · Python · Isaac Sim · VLA 模型*<br>
*2025 年 12 月至今 · 东京*

面向科学实验环境人机协作的仿真优先基准项目。

- 在 LabUtopia 模拟器基础上扩展自然语言人机协作任务，重点评估澄清、安全拒绝、指令落地与结构化动作日志。
- 设计评测框架，对比 LLM、VLA 与混合规划器完成多步骤实验协议的表现。
- 与三种已采购机器人平台协调未来硬件集成；当前优先完善评测方法，而不是追求演示效果。

---

## 经历

### GlucoPI

*本科毕业设计 · 指导教师：[Qi Zhang](https://scie.shu.edu.cn/Prof/zhangq.htm) 教授*<br>
*2025 年 2 月 – 2025 年 6 月 · 上海*

面向糖尿病管理、医患沟通与血糖预测的微信小程序。

- 使用微信小程序、FastAPI、MySQL、MongoDB 和 WebSocket 构建完整自我管理系统。
- 实现登录与权限、血糖／饮食／胰岛素记录、医患绑定、实时消息和趋势图。
- 在 OhioT1DM 数据集上复现 GluPred 流程，完成 PyTorch 短期血糖预测实验。
- 集成用于非诊断性健康建议的轻量 LLM 问答功能。

::github{repo="shiinayane/glucopi"}

### Arrived or Not

*联合负责人 · 指导教师：[Qi Zhang](https://scie.shu.edu.cn/Prof/zhangq.htm) 教授*<br>
*2023 年 12 月 – 2024 年 12 月 · 上海*

面向课堂考勤与课程管理的机器视觉教学平台。

- 使用 RetinaFace 检测与 ArcFace 向量匹配实现实时人脸识别考勤。
- 构建教师和学生端的课程创建、考勤记录与基础参与度统计流程。
- 使用 Flutter 与 FastAPI 实现前后端分离架构。

::github{repo="shiinayane/Arrived-or-Not-Frontend"}

::github{repo="shiinayane/Arrived-or-Not-Backend"}

---

## 兴趣方向

- **产品优先的工程实践**：以解决真实问题为目标，把 iOS、后端和全栈技术视为实现手段。
- **iOS 原生架构**：关注本地优先、清晰的 Domain／UI 边界，以及真正可发布的原生应用。
- **从研究到产品**：探索如何把研究生阶段的 VLA／LLM 研究转化为消费级移动体验。

---

## 技术栈

- **iOS／Apple 平台**：Swift、SwiftUI、GRDB、SQLite、SwiftData、Observation、Swift Concurrency、Swift Testing
- **架构与设计**：MVVM、Clean Architecture、Repository Pattern、Dependency Injection、Protocol-Oriented Programming
- **后端／Web**：Python（FastAPI）、JavaScript
- **机器学习／研究**：PyTorch、VLA 模型、Isaac Sim
- **工具／平台**：Git、Docker、Xcode、VS Code、macOS、Linux

---

## 语言

- **日语**：商务交流（JLPT N1 121/180）
- **英语**：专业工作（TOEFL 97/120）
- **中文**：母语
