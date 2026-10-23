# 原型设计工作流

本文是 PBWork 业务原型从需求到正式 Authoring 的唯一设计流程。产品定义、视觉探索、设计基线和工程实现分别拥有清楚边界。

## 阶段

```text
需求与参考
  → 需求采访
  → 产品设计
  → 视觉方向（新原型与视觉改变必做，按需制作草稿）
  → 产品基线确认
  → 页面设计增量确认
  → Promotion Mapping
  → 正式 PBWork Authoring
  → Delivery Gate + 分级 Experience Review
  → Runtime / Evidence / Handoff
```

### 1. 需求采访

新原型、新视觉方向、整页重构，以及用户对视觉不满意但没有给出方向时，先做需求采访。局部修正、文案、Token、Evidence、Runtime 和已定缺陷不需要。

采访的字段固定，问法不固定。每份 brief 必须明确：

| 字段 | 内容 |
| --- | --- |
| 产品定位与核心场景 | 产品解决什么问题，用户在什么时刻打开它 |
| 用户群体 | 谁在用，使用情境与熟练度 |
| 风格 | 约三个气质词，加上用户喜欢或排斥的参照 App 及具体原因 |
| 平台与视口 | iOS、Android 或双端；手机或平板 |
| 功能范围 | 必做、可选和明确不做 |
| 品牌起点 | 全新品牌、沿用已有原型，或沿用客户既有品牌、Flutter App 主题 |
| Flutter 交付约束 | 目标 App 是否已有需要沿用的主题或组件库 |

交付目标始终是 Flutter Target；“只看效果”不构成跳过正式约束的理由。

采访方式：

- 先从提示词、附件、现有文档和记忆中提取已经回答的字段，只问缺失或互相矛盾的字段。
- 使用结构化提问，每轮不超过五个问题，提供具体选项和自由输入，最多三轮。
- 风格无法用文字确定时（用户还没想好、回答“你定”，或两个方向都成立），询问用户是否先做两到三个风格草稿再定。不要未经询问直接制作，也不要静默选定一个。
- 用户明确授权 Agent 决定的字段记为假设，写明而不是静默取默认值。
- 设计开始前把 brief 写成简短摘要请用户确认，并写入 `design.md` 的产品定义与视觉部分。

`docs/roadmap` 等计划文档中的产品草案只是输入，仍须经采访确认；计划中未经用户选择的视觉方向或组件归属不继承。

PBWork 的 Token、Theme 和 DS 是正式交付的基础，不是风格答案。brief 缺失时不能用 PBWork 现有外观填补。

### 2. 产品设计

在 PBWork 原型设计阶段闭合用户、范围、对象、信息架构、流程、状态和验收信号。页面数量和功能清单不是产品设计。brief 确认后，低风险细节由 Agent 推断并写明假设；只有备选方案会实质改变产品方向、核心流程或信息架构时才再次暂停提问。

### 3. 视觉方向与探索

新原型、风格草稿、整页重构和用户对视觉不满意时，必须由 PBWork 原型设计流程读取并应用仓库内 `frontend-design`。视觉方案必须与业务主体、页面任务和真实内容相关，不能只给出“高级、极简”等形容词。PBWork 对该 Skill 的两条默认做法有覆盖：

- 产品主体与用户群体取自已确认的 brief，不由 Agent 自行设定；缺字段时回到需求采访。
- 先向用户呈现两到三个不同方向（色板、字体角色、签名元素、布局草图），由用户选定后再制作草稿或正式页面。

`frontend-design` 面向网页。App 还须明确导航外壳、签名组件与其它组件的变体、字体角色（数字承担主角时包括数字字体）、图标与插画、动效性格与声音/触感意图、文案语气，以及浅色与深色表现。

需要真实页面比较时，探索代码只放在：

```text
apps/pbwork/src/drafts/{prototypeId}/
```

探索页允许快速验证构图，但不进入 Prototype Registry，不受正式 Authoring 完整性门禁，不得用于 Capture/Handoff，也不得声称可以直接交付目标端。每个草稿在页面上声明类型：

| 类型 | 回答的问题 | 完成要求 |
| --- | --- | --- |
| 风格草稿 | 长什么样 | 一到两个关键页面，静态或轻交互即可 |
| 旅程草稿 | 能不能用 | 交付前在真实浏览器中走通 brief 的每条必做旅程，并列出缺口 |

品牌起点为全新品牌时，草稿不注入 PBWork Theme 或 `--pb-*` 变量，使用由所选方向推导的色板、字体和组件形态。只有 brief 指定从 PBWork DS 起步或需要对比时，草稿才使用 DS。

### 4. 设计确认

新原型、结构性改动和视觉语言改变必须在正式实现前获得用户确认，或获得范围明确的 Agent 自主设计授权。确认前可以继续分析和探索，但不能覆盖正式 Screen。自主设计仍须先形成可审阅的页面契约，不能把授权理解为跳过产品闭合。

### 5. 设计基线

正式业务 Prototype 必须提供：

```text
apps/pbwork/src/prototypes/{prototypeId}/docs/design.md
```

文件使用 frontmatter：

```yaml
---
prototypeId: example
status: draft
approvedAt: 2026-08-13 # 仅 approved 时必需
---
```

状态含义：

| 状态        | 含义                                                               |
| ----------- | ------------------------------------------------------------------ |
| `draft`     | 产品定义、IA 或交互仍未闭合                                        |
| `exploring` | 存在待选择的结构或视觉方向                                         |
| `approved`  | 产品定义、IA、核心旅程和共享视觉语法已稳定，可以逐页批准 Authoring |

`design.md` 是产品与体验唯一批准入口，基线正文可以按职责放在同目录的 `product.md`、`logic-and-interactions.md` 与 `ui-design.md`，由 design 明确链接纳入批准范围；同一规则不维护两份正文。以下决策必须能从批准入口定位：

- 产品定义、用户、承诺、范围与非目标，以及已确认的 brief（风格气质与参照、平台视口、品牌起点、Flutter 交付约束）；
- 核心对象、关系和状态；
- 信息架构、页面地图和导航职责；
- 核心旅程、交互结果、失败与恢复；
- 产品级视觉命题和共享视觉语法；
- 页面设计状态，以及已批准页面的焦点、阅读顺序、交互结果、关键状态与跨页分工；
- 图标、图片、图表、动效和外部资产策略；
- Theme、目标视口、安全区域、键盘和可访问性；
- 否决项、未决项和可观察验收信号。

不要求机械复制标题或填充无关章节，但以上决策必须可定位。Registry、文件清单、测试命令、Evidence 字段和代码细节不写入设计基线。

职责拆分不改变批准纪律：`design.md` 继续维护状态、批准日期、范围与页面设计状态，所链接产品文档的结构性变化也须按同一流程确认；已有 approved 状态不自动批准新规则或新页面。文档与 Target 的本地交付方式见 [制作工具](authoring-tools.md#脚手架与验证)，不进入产品正文。

个案实现说明放在 `docs/implementation.md`。它记录 Promotion Mapping、页面交付状态、代码组织、状态存储、迁移和实现决定，不复制 PBWork 通用规范。

产品基线 `approved` 不表示所有页面细节已经完成。`design.md` 必须维护页面设计状态；只有状态为 `approved` 的页面或旅程批次可以进入正式调整。页面契约默认由 Agent 起草，用户可以明确决策，也可以授权 Agent 在既定产品边界内闭合。

最小页面契约只写：页面唯一职责与首屏焦点、具名阅读顺序、热区及结果、适用关键状态、跨页分工和可观察验收信号。不写像素、Flex、组件名、class、inspectId、路由或 Evidence 字段，也不把一种草稿构图规定为唯一实现。

禁止在 Prototype 根目录新增 `requirements.md`、`implementation-notes.md` 或其它平铺产品文档。

## Promotion Mapping

PBWork DS 是原型的基础，不是上限。探索方向进入正式 Authoring 前，每个重要视觉元素按下表自上而下归类，停在第一个能完整保留已批准方向的分类，并记录在 `docs/implementation.md`：

| 分类 | 处理 |
| --- | --- |
| DS 组件原样使用 | 形状与风格都匹配，直接使用公开 Contract |
| DS 组件公开变体 | 通过公开 variant、props 或 slots 满足方向 |
| 通用 DS 扩展 | 需求通用且可复用时，先按 PBWork Design System 规则完成变体、Token 或组件原子变更 |
| 原型自有组件 | 形状属于本业务，或已批准风格与所有 DS 选项冲突；使用现有 Token，并声明独立 Evidence 节点 |
| 外部资产/动效 | 定义资产 ID、状态、触发、时长、降级和跨端契约 |
| 放弃或降级 | 在设计文档记录原因，不把不可交付创意静默带入正式实现 |

已批准风格与 DS 组件冲突时以风格为准：不为套用 DS 而降级方向，改用通用 DS 扩展或原型自有组件，并把冲突记为 DS 缺口，作为后续 DS 演进的输入。两条边界不变：

- 手势仲裁、滚动、Overlay 焦点与关闭、导航等交互机制不复制，外观差异通过公开 props、slots 或 DS 扩展实现；
- 原型自有组件与 DS 组件遵守同样的 Token-only、Flex-only 和 Evidence 规则。

品牌取值由原型同 ID 的自有主题包承接，可以继承基础包并声明多套主题与明暗模式。正式页面使用已注册语义键和组件键，具体值进入包内 Primitive / Semantic / Component 层；不为品牌新增业务命名的共享 Token 或页内色板。未被现有键表达的语义才记录为 Token 缺口；解析与所有权规则见[主题手册](../tokens/themes.md)。字体使用默认字体栈，不按原型、主题或风格方向切换。

只有跨页面或跨业务稳定复用的能力才进入共享层；业务专属形状留在原型内。

进入正式制作时，按[Workbench 预览工作流](../workbench-preview.md#原型制作与人工交付检查)在 `implementation.md` 记录主题绑定、基础来源、原型新增变体与自有组件，并核对登记、预览和正式 Evidence。DS 公开变体的普通采用不算原型扩展；未实现的登记能力或尚未验证的证据链作为缺口记录。

## 正式 Authoring

正式 Authoring 只消费 `status: approved` 的产品基线和已批准的页面设计增量。正式页面遵守 Token-only、以 DS 为基础并按 Promotion Mapping 选用组件、Flex-only、Registry、semantic authoring、Action/Scenario/Checkpoint 和 Runtime 确定性约束。

新页面或整页重构必须通过 Delivery Gate，并在正式实现稳定后执行分级 Experience Review：

- **Delivery Gate**：验证 Token、DS、Evidence、Variant、Action/Scenario、Runtime 确定性和测试。
- **L1 Quick Experience Check**：默认检查主要视口和主题的默认状态截图，并按最大风险至多增加一张截图；只允许一轮修正，仍有实质问题则升级。
- **L2 Focused Experience Gate**：用户不满意、L1 暴露问题或页面承担高风险视觉与交互时，按实际风险选择三至五张截图验收。
- **L3 Full Experience Audit**：只在用户明确要求、最终批次/发布验收或产品风险要求时完整覆盖声明的主题、视口、关键状态和核心交互。

视觉探索通过不代表正式实现自动通过 Experience Review。`docs/implementation.md` 分别记录 Delivery 结果和 `quick-checked`、`accepted`、`fully-audited`、`needs-focused-review` 或显式 `deferred`。视觉修复只回归受影响的 Delivery 检查与当前 Experience 级别；完整验证保留到页面或连贯批次完成时执行。

若实现暴露假交互、结构冲突、无法兑现的视觉方向或范围扩大，停止实现并回到设计阶段，不静默改变 `design.md`。

## Agent 边界

PBWork 任务统一由仓库 `pbwork` Skill 路由。该 Skill 按任务读取原型设计、正式 Authoring、Design System 或 Workbench reference，跨边界任务可以按阶段组合，但不需要在多个 PBWork Skill 之间切换。

需求采访、产品闭合和 Promotion Mapping 由 `pbwork` 负责。`frontend-design` 只负责通用视觉发散、构图、字体和审美批评，不负责 PB Token/DS、Evidence 或 Flutter 映射。普通 Token、组件、Contract、Workbench、文案或已定缺陷维护不默认调用它；新原型、风格草稿、整页重构和用户对视觉不满意时必须在定方向时应用，新页面和整页重构在正式 Authoring 后再应用一次，由 PBWork 负责 Delivery Gate 与分级 Experience Review 的协调。
