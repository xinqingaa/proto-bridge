---
name: protobridge-flutter-restore
description: Use when restoring Flutter pages from ProtoBridge UI build outputs such as ui-build-plan.json, ui-build-review.md, screenshots, page-canonical.json, and page-debug-index.json. Enforces contract-first implementation, node-level visual auditing, target-project convention matching, and Flutter fidelity validation.
---

# ProtoBridge Flutter Restore

## 核心原则

`ui-build-plan.json` 是实现蓝图。
`ui-build-review.md` 只是审查视图。
截图用于视觉核对。  
`page-canonical.json` 是证据原档，用于追溯 provenance、解决冲突和补查 plan 未提升的证据。
`page-debug-index.json` 用于快速查找文本锚点、assetRefs、风险和索引信息。

不要只根据 `visualPlan.sections` 实现页面。  
对重复卡片、列表项、表格行、tab、filter、按钮、chip、appbar action，必须先读取 `visualPlan.nodeAudits`。如果 plan 已经提供 node audit，不得绕过它重新凭截图、section role 或业务直觉猜结构。

## 输入读取顺序

每个 output 目录都按以下顺序读取：

1. `ui-build-plan.json`
2. `ui-build-review.md`
3. `screenshots/full-page.png`
4. 必要时读取 `page-canonical.json`
5. 必要时读取 `page-debug-index.json`

重点阅读 `ui-build-plan.json` 中的：

- `targetConventions`
- `implementationContract`
- `implementationContract.sourceSemantics`
- `visualPlan.nodeAudits`
- `visualPlan.nodeAuditSummary`
- `visualPlan.dynamicTextHints`
- `themeMappings`
- `componentMappings`
- `i18nPlan`
- `validationHints`

读取 `page-canonical.json` 的触发条件：

- plan 没有覆盖正在实现的关键节点。
- `ui-build-review.md` 与 `ui-build-plan.json` 的理解不一致。
- 需要追溯某个 bbox、computedStyle、assetRefs 或 provenance。
- 用户指出视觉还原偏差，需要确认采集证据是否存在。

## 目标工程扫描

开始编码前，必须扫描目标 Flutter 工程的现有约定：

- 路由注册方式
- 页面、controller、binding 组织方式
- `GetX` / `BaseGetView` / `GetView` / `BaseGetPullView` 用法
- 公共 app bar、button、empty、loading、refresh、sheet、dialog 组件
- theme service 和 text style token
- i18n 用法
- 已有 icons/assets

优先沿用目标工程约定，不引入新架构。

## Node-Level Audit 强制规则

实现任何重复 UI 单元前，必须先审 `visualPlan.nodeAudits` 中对应的代表性节点。

重复 UI 单元包括：

- 卡片
- 列表项
- 表格行
- tab
- filter
- button
- chip
- appbar action
- bottom bar

审查步骤：

1. 在 `ui-build-plan.json#/visualPlan/nodeAudits` 找到对应 `kind` 和 `sourceNodeId`。
2. 读取 `rows`，按行还原真实文本和 icon 顺序。
3. 读取 `controls`，保留按钮、chip、图标的 padding、height、borderRadius、style 和文本。
4. 读取 `containerStyle`、`assetRefs`、`absenceHints`、`implementationHints` 和 `implementationSummary`。
5. 记录关键视觉证据：
   - `padding`
   - `margin`
   - `gap`
   - `height`
   - `width`
   - `borderRadius`
   - `border`
   - `backgroundColor`
   - `color`
   - `fontSize`
   - `fontWeight`
   - `lineHeight`
6. 遵守 `implementationSummary.mustPreserve` 和 `implementationSummary.doNotInvent`。
7. Flutter widget 必须从 node audit 还原，而不是从 section role 猜测。

如果 `visualPlan.sections` 与 `visualPlan.nodeAudits` 的细节存在差异，局部 widget 结构优先以 `nodeAudits` 为准。只有当 plan 缺少对应节点或用户要求追溯时，才回到 `page-canonical.json`。

## 重复单元审查模板

实现前，在思考或说明中整理类似表格：

```text
Source node: node_46
Role: card
bbox: x,y,w,h
Container style:
- padding:
- margin:
- gap:
- radius:
- background:
- border:

Rows:
1. y=..., children: text/icon order...
2. y=..., children: text/icon order...
3. y=..., children: text/icon order...

Buttons/chips:
- text:
- padding:
- radius:
- border:
- font:
- color:
- background:
- assetRefs:
```

首个代表节点里不存在的展示字段，不得自行添加。  
例如首卡没有 `Avail.`，就不能为了业务完整性加 `Avail.`。

`visualPlan.nodeAuditSummary.suppressed` 只说明 review 为什么折叠 wrapper、从属控件或重复节点，不代表实现蓝图丢失。额外重复卡片/列表项可能仍保留在 `nodeAudits` 中但 `displayInReview=false`，实现时可直接读取。

## Flutter 实现规则

页面层可以读取 controller。  
子 widget 优先通过构造参数接收 UI model 和 callback。  
不要让所有子 widget 直接读取整个 controller。

### 目标工程强约定组件优先

如果 `componentMappings` 或 `targetConventions` 对目标工程公共组件给出高置信映射，必须优先复用该公共组件，例如：

- `CommonAppBar`
- `CommonButton`
- `CommonImage`
- `CommonSvg`
- `Pop.sheet` / `YouFiPop.sheet`
- `CommonEmpty`
- `CommonLoading`

只要公共组件的语义槽位可以表达 source/runtime 证据，就不要因为轻微高度、padding、spacing、默认 text style 差异而直接 fallback 到自建 Widget。

允许 fallback 到自建 Widget 的条件：

- 公共组件缺少必要槽位，无法表达 source action、title、leading、actions、body 或 footer。
- 公共组件会破坏 `visualPlan.nodeAudits[*].implementationSummary.mustPreserve` 中的文本/icon 顺序或交互语义。
- 公共组件 API 强制带入 source 明确不存在的字段或控件。
- 公共组件导致严重视觉错位，且无法通过公开参数或外层布局修正。

如果选择 fallback 到自建 Widget，最终说明必须列出放弃公共组件的具体证据和原因。轻微像素差异本身不是充分理由。

临时 mock 数据必须放在：

- controller
- repository
- fixture
- UI model factory

不要把 mock 数组直接写进 widget `build`。

交互在第一轮可以只保留 controller 方法和 TODO。  
不要编造：

- API
- 字段
- 权限
- 埋点
- 风控
- 真实数据流

## Typography 规则

如果 `themeMappings` 中 `lockToken=true`，必须直接使用对应 target textStyle token。

不得覆盖：

- `fontSize`
- `fontWeight`
- `height`
- `fontFamily`

除非 plan 明确提供来源覆盖证据。

推荐：

```dart
themeService.textStyles.small1R.copyWith(
  color: themeService.colors.colorTextDescription,
)
```

避免：

```dart
themeService.textStyles.small1R.copyWith(
  fontSize: 12.sp,
  fontWeight: FontWeight.w500,
)
```

## 颜色、间距、圆角

优先使用 plan 映射出的目标 token：

- `themeService.colors.*`
- `themeService.textStyles.*`
- 目标工程已有公共组件
- 目标工程已有 asset

如果目标工程没有 spacing/radius token，而 source 提供了明确像素证据，可以使用具体 `.w` / `.h` / `.r` 值。

使用具体视觉值时，最终说明必须列出原因和位置。

## Icon / Asset 规则

每个 icon 都按以下顺序处理：

1. 查 `ui-build-plan.json` 的 `visualPlan.nodeAudits[*].assetRefs`、`rows[*].children[*].assetRefs` 和 `controls[*].assetRefs`。
2. 必要时查 `page-canonical.json` 的 `assetRefs`。
3. 必要时查 `page-debug-index.json` 的 `assetIndex`。
4. 搜目标工程 assets，例如：
   - `find assets -iname '*sort*'`
   - `find assets -iname '*filter*'`
   - `find assets -iname '*help*'`
   - `find assets -iname '*record*'`
   - `find assets -iname '*arrow*'`
5. 优先用目标工程已有 asset 和 `CommonImage.asset`。
6. 找不到目标 asset 时，才允许使用占位。
7. 使用占位必须在最终说明中列出。

不要直接用 Material icon 替代 source icon，除非确认目标工程没有可用 asset。

## Sort Icon 规则

排序图标不要用通用 Material icon。

优先查找目标工程资产：

```text
*sort*
*filter*
*arrow*
```

常见映射：

```text
neutral    -> ic_sort_normal.png
descending -> ic_sort_down.png
ascending  -> ic_sort_up.png
```

如果 source 没有明确激活排序态，初始态使用 neutral。

## Button / Chip 规则

不要随意给文本按钮和 chip 固定高度。  
优先使用 source 的 padding 和 text style 撑开。

推荐：

```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(14.r),
  ),
  child: Text(...),
)
```

只有在以下情况才使用固定尺寸：

- source bbox 明确要求
- icon button
- tab indicator
- 表格列宽
- 目标工程组件 API 要求

## i18n 规则

稳定可见 UI 文案使用目标工程 i18n API。

实现前必须读取 `visualPlan.dynamicTextHints` 和 `i18nPlan.texts[*].dynamic`。

新增翻译 key 前必须先检查目标工程已有翻译文件，避免重复 key 导致 const map 编译失败。例如：

```text
rg "'candidate_key'" lib/app/translations
```

已存在的稳定文案 key 必须复用，不要在文件其他位置重复声明。新增 key 应使用当前模块或页面前缀，避免使用过宽泛的通用 key。

不要给动态值创建翻译 key，例如：

- 数量
- 股票代码
- 价格
- 日期
- 持仓数
- 百分比

推荐：

```dart
Text('（${model.count}）')
```

避免：

```dart
'option_exercise_count_11': '（11）'
```

如果一个文本同时包含标签和数值，优先拆成稳定标签翻译和模型数值格式化。例如 `Held 5` 应由标签文案和 `model.heldQuantity` 组合，不要把完整字符串写死。

## 路由规则

路由以目标工程风格为准。

如果 ProtoBridge source route 与目标工程 route 命名不一致：

1. 优先沿用目标工程路由命名风格。
2. 在最终说明列出映射关系。
3. 不要创造目标工程没有证据支持的新路由注册方式。

## 实施前计划

改代码前必须说明：

- output 目录和页面对应关系
- route 映射
- 目标工程 conventions 证据
- 文件落点
- 已读取的 `visualPlan.nodeAudits`，以及需要重点遵守的 rows、controls、absence hints
- 已读取的 `visualPlan.dynamicTextHints`
- 交互占位范围
- 可能的 asset 缺口

## 编码后检查

完成后必须执行：

1. format 命令
2. analyze 命令
3. 如存在，执行 ProtoBridge validation / `validate_ui_build`
4. 如果找不到 validation 工具，明确说明未发现可执行入口

还要反查以下风险：

- 是否有写死数量
- 是否在 translation map 中新增了重复 key
- 是否有 Material icon 代替 source/target asset
- 是否有 source node 中不存在的字段
- 是否忽略了 `implementationSummary.doNotInvent`
- 是否忽略了 `dynamicTextHints`
- 是否有文本按钮/chip 被错误固定高度
- 是否覆盖了 locked typography token
- 是否把 mock 数据写进 widget build
- 是否让所有子 widget 直接读 controller

## 最终交付说明

最终说明必须包含：

1. 已连接路由列表
2. 新增/修改文件列表
3. 页面与 output 目录对应关系
4. 使用的目标工程 conventions
5. 占位交互
6. token 化视觉值
7. 具体视觉值及原因
8. format / analyze / validation 结果
9. 下一轮人工确认项

## 常见错误

避免以下错误：

- 只看 `visualPlan.sections`，不读 `visualPlan.nodeAudits`
- `nodeAudits` 已经给出三行结构，却按业务想象重排布局
- 把 DOM section 机械拆成一堆 Flutter 文件
- 首卡没有的字段被自行补进 UI
- 把动态数量写成 i18n key
- 新增翻译前不查已有 key，导致 const map 重复 key 编译失败
- 用 Material icon 顶替已有 asset
- 高置信映射到 `CommonAppBar` / `CommonButton` 等公共组件时，仅因轻微像素差异就自建 Widget
- 固定按钮高度导致翻译后布局不自然
- typography lockToken 后又覆盖字号或字重
- 子 widget 全部直接读 controller
- 第一轮就编造接口或业务字段
