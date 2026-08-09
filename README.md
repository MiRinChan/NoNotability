<img width="180" align="right" alt="image" src="https://gist.github.com/user-attachments/assets/1fdad429-6184-4f46-ae7b-af54d688fd94" />

# NoNotability — Notability iCloud / CloudKit 守卫（Loon 插件）

基于 MITM 改写 `POST https://notability.com/global`（`updateExperimentData` 实验配置）响应，强制关闭：

- 手动 CloudKit 迁移入口（`China CloudKit Migration Settings` → control、`chinaCloudKitMigrationSettings` → off）
- 自动迁移（`China CloudKit Auto Migration` → control、`chinaCloudKitAutoMigration` → off）
- 未知的 "CloudKit Unused Asset Deletion"（`cloudKitDeleteUnusedAssets` → off，仅在服务端返回该键时生效）

## 安装

Loon 添加插件（需开启 MITM，安装并信任证书）：

https://raw.githubusercontent.com/MiRinChan/NoNotability/main/notabilityExtension.plugin

## 免责声明

本仓库仅供学习研究。修改第三方应用的服务端响应可能违反其服务条款，请自行评估风险。
