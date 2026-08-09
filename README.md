<img width="180" align="right" alt="image" src="https://gist.github.com/user-attachments/assets/1fdad429-6184-4f46-ae7b-af54d688fd94" />

# NoNotability — Notability 远程配置守卫 + 公告注入（Loon 插件）

基于 MITM 改写 Notability 服务端响应，两件事互不干扰：

## 功能

### 1. iCloud / CloudKit 迁移守卫

拦截 `POST https://notability.com/global`（`updateExperimentData` 实验配置），强制关闭：

- 手动 CloudKit 迁移入口（`China CloudKit Migration Settings` → control、`chinaCloudKitMigrationSettings` → off）
- 自动迁移（`China CloudKit Auto Migration` → control、`chinaCloudKitAutoMigration` → off）
- 未知的 "CloudKit Unused Asset Deletion"（`cloudKitDeleteUnusedAssets` → off，仅在服务端返回该键时生效）

### 2. 主页公告注入

拦截 `GET https://notability.com/global/zendesk/v2/help_center/articles/search.json`（"Latest Updates" 公告流，主页铃铛/通知中心的唯一数据源），在列表头部插入 `zh-cn` + `en-us` 两篇公告文章：

- 原有文章原样保留（幂等，重复注入不会叠加）
- 公告内容为 HTML，可自由定制（标题/正文/链接/图片）

## 安装

Loon 添加插件（需开启 MITM，安装并信任证书）：

https://raw.githubusercontent.com/MiRinChan/NoNotability/main/notabilityExtension.plugin

## 自定义公告内容

编辑 [NoNotability.js](NoNotability.js) 中 `injectAnnouncement` 里的 `title` / `snippet` / `bodyHtml` 后推送到仓库，重新加载插件即可（脚本从仓库 raw 拉取，无需在 Loon 里改动）。

## 免责声明

本仓库仅供学习研究。修改第三方应用的服务端响应可能违反其服务条款，请自行评估风险。
