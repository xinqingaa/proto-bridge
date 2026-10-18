# ProtoBridge 目标适配

本文件定义 PBWork 语义在本 Flutter 工程中的翻译策略；精确、可机读的完整表位于工程根目录 `proto-bridge.target.json`，同步基线位于根目录 `proto-bridge.sync.json`。Producer Contract 决定组件职责、状态、行为、布局/结构承诺和 Token 槽，Flutter 侧使用目标技术栈的自然 API 实现这些语义，不复制 Vue props 或 DOM。

## 语义组件落点

优先按 `componentId` 映射；role 只在没有可靠 `componentId` 时提供通用语义回退。比如 `flow-sheet` 的身份是 `componentId=flow-sheet`，role 仍是通用的 `sheet`，不需要创建 `flow-sheet` role。

当前 47 个组件均在 `proto-bridge.target.json` 标为条目 pending：Producer 已完成主题包与绑定目录迁移，Flutter 尚未按新 Contract 适配。旧具体映射表已移除，避免与 pending 同 ID 并存造成 resolver conflict；现有 Dart 组件仍保留，但不能宣称已匹配新 Producer。

`page`、`section`、`summary`、`list`、`field` 等 role 要结合 Fragment 上下文选择本地容器，不能覆盖一个已存在且更精确的 `componentId`。

## Token mapping

新目录的 148 个可绑定主题键均在根目录 `proto-bridge.target.json` 声明为 pending；不可绑定 enum、字阶派生部件与实现常量不建立 Target 映射。`lib/theme/proto_bridge_tokens.dart` 仍是迁移前的可执行使用点；待本轮适配完成后，再由 resolver 同时验证“声明存在”和“当前 Dart API 可访问”。这份 Target 映射不等于恢复 MCP 完整 Catalog 读取；Agent 仍按当前任务读取必要的 Producer Contract、文档和源码。

`transparent` 与 `none` 是绑定字面量，不是 Foundation Token，也不得生成 `TS.*` accessor 或 Target token obligation。

Target 只翻译语义，不复制 Web 表达：例如百分比映射为 Flutter 比例、CSS shadow 映射为 Material elevation、CSS easing 映射为 `Curve`。Theme 值由 `TS` 的 light/dark 服务提供，业务页面不得创建平行常量。

## Resolver 与同步状态

1. 根目录 `proto-bridge.target.json` 是精确映射，本文解释策略，Dart 公开 API 是可执行事实；三者不一致时 resolver 必须返回 `stale` 或 `conflict`。
2. 根目录 `proto-bridge.sync.json` 记录最后一次已确认同步的 Producer surface fingerprint、分区/逐组件 digest 与计数；清单元数据必须整体一致，不能只手改总 digest。
3. `pnpm ds:target-sync:verify` 比较 Component/Token/Theme Schema、Contract、role、Catalog、Theme、Bind 池、同步清单和 Flutter resolver（要求每个键为 `resolved` 或条目 `pending`）；任一协议或 Target API 漂移都会失败并列出变化项，条目 `pending` 在成功输出末尾列出。
4. DS 连续迭代期间可以暂缓 Flutter 视觉精修，但必须把清单状态改为 `pending` 并记录原因；稳定后统一恢复 `synced`。不得靠记忆或口头提醒维持同步。

本节出现两个不同的 `pending`，必须分开命名：

| 概念 | 位置 | 含义 | 处理 |
| --- | --- | --- | --- |
| **批次状态** | `proto-bridge.sync.json` 的 `status: synced \| pending` | 整个 Producer surface 批次是否已确认同步 | `pending` 使 `pnpm ds:target-sync:verify` 失败 |
| **条目状态**（entry status） | `proto-bridge.target.json` 中 `components.<id>` / `tokens.<id>` 的 `{ "status": "pending", "reason": "…" }` | 逐键事实：Target 尚未实现该组件或 Token（例如 Flutter 暂不实现的 `asset.*`、glass 分支、`motion.personality`） | resolver 返回 `pending` 并说明「Target 待实现」，附声明的 `reason`，不跑启发式、不给候选替代；同步脚本单独计数并列出，不判失败 |

条目 `pending` 必须带非空 `reason`；缺失或为空是清单错误（resolver 对该键返回 `conflict`，同步脚本失败）。`pending` 与同一 ID 的具体映射（含本文表格）并存同样返回 `conflict`。未声明又缺失的键仍然失败，不能用 `pending` 以外的方式暂缓。`readiness` 把 `pending` 计为未就绪项并单独列出，`validate_target_changes` 对绑定到 `pending` 键的变更只给「Target 待实现」提示。Agent 遇到条目 `pending` 必须披露，不得自行替换实现。Core 语义见 [Target 适配器](../../../docs/architecture/proto-bridge.md)。

## Flutter 当前实现（尚未适配主题包）

- `data-list` 使用 Flutter `ListView.builder/separated`；`scrollable-data-list` 使用 `pull_to_refresh_flutter3`，并在公共壳内固定 Clamping physics、有限越界和高阻尼 spring，避免刷新完成后的二次回弹。
- `CommonPrimaryTabs` 和 `CommonSecondaryTabs` 分文件维护，均基于官方 `TabBar`；一级轨道是无阴影的 `surface-recessed` 普通表面，选中面使用 Target 自有 `LiquidGlassDecoration` 并由官方 indicator 直接跟随 `TabController.animation`，内容切换使用 `CommonTabView` / `TabBarView`。Flutter 将 `sizing.control-md` 用作 40 高的选中面，并在其外叠加上下 `spacing.xs` 轨道内缩，形成 48 高点击轨道。
- `LiquidGlassDecoration` 只复刻一级 Tab 所需的半透明 `surface-selected`、`radius.full` 和主题化 `elevation.glass`；`Decoration` 没有 Widget 合成层，无法承载 `BackdropFilter`，在统一纯色 recessed 轨道上不伪造背景模糊。这是 Flutter 平台近似，不改变 `effect.glass-backdrop` 的完整 Target 映射。
- `CommonSecondaryTabs` 的 `sizing.caret` 表示三角单侧半宽和高度：默认总宽 10、高 5；`layout.inset-sm-negative` 从文字行盒而非整个 Tab 底边定位。
- Demo 将 `CommonBottomNav` 作为 `Scaffold.bottomNavigationBar` 的真实根导航；遵守 2–5 个目的地约束，第五个“更多”目的地以内层一级 Tabs 承接 Data 与 Feedback，不使用 Drawer/Sheet 选择组件分类。
- `menu` 精确映射为 `AppPop.dropMenu`；表单锚点 `CommonMenuField` 只是目标工程便利壳，不是第二套菜单实现。
- `bottom-sheet`、`confirm`、`flow-sheet`、`loading`、`toast` 与 `menu` 全部经 `AppPop` 调用 `unified_popups`。
- `CommonIcon` 使用 `lucide_icons_flutter` 映射 Producer 策展的 34 个稳定 id 。
- `CommonButton` 只公开 `kind=primary|secondary|outlined`，配色由组件内部绑定 `color.action` / `color.action-soft` / `color.outline`；不保留 variant/tone 矩阵或 `text` 类型。
- `CommonTextField` / `CommonTextArea` 在 `showLabel=false` 时无描边并填充 `color.surface-recessed`；`showLabel=true` 时显示标题、边框并填充 `color.surface`。
- `screen-transition` 映射为 `PbPageTransitions.theme`：默认全部平台使用 iOS 侧滑（`CupertinoPageTransitionsBuilder`）；Android Fade Through 近似为 `ZoomPageTransitionsBuilder`，经 `PbPageTransitions.theme(mode: android)` 选择。不提供包住页面的容器，也不暴露 `screenKey` / `navigation`。
- Flutter elevation、glass blur、布局比例和交互曲线属于平台语义翻译，不要求与 Web 数据结构同构。
- 本工程现有 Dart 实现覆盖先前的 32 个 componentId；Producer 当前声明 47 个，全部仍 pending，新增 15 个尚未实现，不保留历史组件别名或旧 Dart API。公共 Widget 按 `action/input/display/navigation/data` 五类放在 `lib/common/widgets/`；`feedback` 由 `AppPop` 适配层承接，目标侧组合壳单列 `composition/`，统一从 `lib/common/widgets.dart` 导入。

## Flutter 实现暂不需要

下列 Producer 能力保持差异，Flutter 公开 API 不镜像：

- 手势仲裁 Token（`layout.gesture-*`、`motion.duration-click-suppression`）的组件消费；Tab/列表使用官方 Gesture Arena。
- 一级 Tab 玻璃 `effect.glass-backdrop` 与顶部过渡弧；选中面仍是静态 `LiquidGlassDecoration`。
- Button / Icon Button 按压缩放。
- TextField `clearable`（清除由 `CommonSearchBar` 承担）。
- Checkbox / Switch / Radio 的实例 Token-ref 色槽参数；只保留 Contract 默认色。
- FlowSheet 步骤点、`layout.sheet-max-height` 与弹层时长；`AppPop` 继续交给 `unified_popups` 默认几何。
- 图表 Token 的业务消费。
- `CommonIconButton.quarterTurns` 是 Target 便利参数，不是 Producer prop。

## 实现与验证

实现前批量解析组件和 Token；`resolved` 只证明映射 symbol/accessor 可定位，组件完成还必须通过状态、交互和 Token 消费测试。Case/variant/interaction 必须映射到页面状态和命名路由；新增页面遵循 [routing.md](routing.md)，验证遵循 [testing.md](testing.md)。最终报告保留固定引用、映射结果、平台近似和未解决项。

官方 Flutter MCP Runtime Review 的实验实现不属于当前目标工程 Contract。目标工程
只维护业务代码、组件/Token 映射、路由和原生测试，不携带 ProtoBridge 专属 Driver
Bridge、Case/Scenario 副本或 App build identity。实验背景、保留代码位置和重新评估
条件见仓库 Roadmap。

## PBWork 材质与组件品质变更

Producer 新增 GlassSurface 及 8 个材质/数据展示键，并调整自绘图标、AppBar、数据/输入与启动展示契约。相关映射明确保持 pending，不声称 Flutter 已实现视觉和新 API；尤其自绘 SVG 不能静默映射为同名 Lucide 并报告一致。条目理由与未实现清单以 `proto-bridge.target.json` 为准。
