# 原型文档来源

{{sourceSummary}}

{{sourceFiles}}

产品文档通过本地文件读取，不通过 MCP 分发，不登记文档 Catalog 或文档 Snapshot。`.pb-scaffold.json` 的 `documentation` 保存源文件与导入内容的 SHA-256、源 revision 和工作区修改状态；摘要用于核对初始化来源，不是持续同步状态，也不是 Evidence 引用。

`prototype/` 中的文件保留原型批准基线与原型限制，只说明导入时的来源，不声明 Target 当前状态。根产品、逻辑和 UI 文档由本工程维护，Target 缺口记录在 [known-gaps.md](known-gaps.md)。

文档版本不自动绑定 Handoff；文档要求与固定 Screenshot、Case 或交互观测冲突时，保留双方来源并记录待决事项。静态截图不证明正常动效过程。

后续更新先在临时目录重新生成并对比差异，再按本工程需求合并。生成器拒绝覆盖已有非空工程，不自动把 Producer 当前文档覆盖到本地，也不以 active/latest 替换固定 Evidence。
