# DS 资产引用与页面采集优化方案

状态：按 2026-10-22 批准范围收敛实施。本文只维护范围与后续事项，现行规则见 [采集链路](../architecture/capture-pipeline.md) 和 [主题包模型](../architecture/theme-packs.md#原型绑定与-capture-边界)。

## 当前交付范围

移除正常采集在 Case 前对整包 DS 资产的独立下载/摘要校验/Blob 归档依赖；原文件与 Flutter PNG 仍由 DS 同步维护。保留固定 Catalog 身份与源摘要，补齐页面装饰图标及 yike 表盘的实际选图、view、状态和源版本信息。页面实际缺图仍使受影响 Case 失败。

保留通用 Case staging、首 Bundle 原子提交、取消/恢复和旧 theme-asset Blob 读取；Catalog 资产专用 staging 仅留作历史与在途任务兼容，正常 DS Capture 不调用。已有数据不改写，不通过删除 Store 获得通过。

## 验证出口

- 首 Bundle 与已有 Bundle 均可在归档地址返回 503 时正常采集，独立归档请求数为零。
- 页面可见 HTML img / SVG image 加载失败使 Case 失败，隐藏图像不会误阻断。
- 三主题浅深模式与机械倒计时专注图的使用信息进入固定页面 props。
- yike 整原型在临时 Store 中完成 Case、Screenshot、Snapshot 与 Handoff 链路。
- 原有取消、恢复、提交失败和历史 Blob 回归保持通过。

实际验证结果以本批执行输出为准，不以本文作为测试完成证明。

## 后续范围

通用版本化 AssetUse Contract、required 资源能力协商、栈无关资源 resolver、图标逐项源摘要、Target 产物摘要与本次实际使用校验、外部资源打包和历史原稿恢复均延期。当前增量 props 不冒充这些能力。

后续依次考虑逐资产版本与解析、Target 真实使用校验、外部资源与更多 adapter；每批需要固定目录/Case 使用/Target 三方闭环和历史兼容测试。投入在具体 Contract 和需求确定后重估，取消原 5–8 人日整包承诺。任意 SVG 算法反推、自动重绘及资源服务器不在当前范围。
