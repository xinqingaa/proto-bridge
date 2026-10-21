# Flutter iOS 依赖接入

Flutter target 使用 CocoaPods 接入原生依赖，依赖版本由工程包清单和锁文件拥有，Skills 不固定具体发布版本。

选择原因：接入 MMKV 时，本地 Xcode 16.4 使用 Swift 6.1，而其 Swift Package 清单要求 Swift 6.2。CocoaPods 已在该工具链编译运行，因此工程关闭 Swift Package Manager，避免为依赖接入强制升级 SDK。以后重新评估工具链时集中更新本文和项目配置。

本决策不改变 MMKV 作为唯一生产本地存储的边界，也不为不同平台引入另一套偏好实现。
