---
name: acceptance
description: >-
  Enforce five-dimensional reconstruction acceptance discipline for any Coding
  Agent consuming ProtoBridge Evidence. Use when completing Target implementation
  and preparing reconstruction review. Prevents premature "done" claims by
  requiring explicit verification of structure, components, tokens, states, and
  interactions against fixed Evidence.
---

# Acceptance

本 Skill 只负责验收纪律，不替代 MCP 消费流程。实施路径见 `proto-bridge` Skill；消费顺序见 `proto-bridge://guides/handoff-consumer`。

## 触发时机

Agent 完成 Target 实现，准备调用 `summarize_reconstruction_review` 前，**必须**先应用本 Skill 完成五维强制检查。

## 强制检查清单

### 1. Evidence 完整读取

在声称"已理解 Evidence"之前，必须确认：

- [ ] 所有实施范围内 Screen 的 `read_screen_packet` 已调用
- [ ] 所有不同 `representativeBlobId` 的 Screenshot 已通过 `read_evidence_screenshot` 查看为真实 ImageContent
- [ ] baseline 无法解释的 Case 已通过 `read_case_delta` 读取差异
- [ ] 状态矩阵、固定业务数据（mock/fixture）已识别并记录

**红线：** 不能只读 `canonicalBrief` 文字描述就开始编码。Screenshot 是视觉事实，必须查看。

### 2. 固定业务数据精确对照

Evidence 中的固定业务数据（数值、时间戳、选项列表、文案）必须**精确复制**：

- [ ] 温度序列、时间戳等数值与 Source mock/fixture 完全一致
- [ ] 下拉选项、单选组、复选框选项目录完整，不能因"Evidence 不够详细"而自行裁剪
- [ ] 列表项 key、ID、关键字段与 Evidence 固定数据对齐

**红线：** 不能在代码注释中写"compact Evidence 未证明全量，所以简化"。Evidence 不够时，应标记为 `unverified` 并说明，而不是自行简化。

### 3. Token 精确匹配

`resolve_target_tokens` 返回的 Token key 必须**精确匹配** Evidence：

- [ ] 颜色 Token：`warning-soft` 不能替换为 `surfaceVariant`
- [ ] 字体 Token：`body-large` 不能替换为 `body-medium`
- [ ] 间距 Token：`spacing-4` 不能硬编码为 `16.0`

**判据：**
- `resolved` 状态的 Token 必须在代码中实际使用
- 用"看起来差不多的值"替代算作 `deviation`
- 无法找到对应 Token 时，标记为 `unverified` 并记录原因

### 4. 组件精确映射

`resolve_target_components` 返回的组件必须**正确选用**：

- [ ] Evidence `componentId` → Target 公共组件的映射已验证
- [ ] 不能"该用公共组件却自造"或"错用相似组件"
- [ ] 组件关键属性（如 `showBack`、`scrollable`、`variant`）已消费

**可接受差异：** 公共组件皮肤与 PBWork 组件视觉不同（如 Badge 圆角、图标轮廓）不算偏差。

### 5. 结构对照 Screenshot

代码实现的布局结构必须与 Evidence Screenshot 对照：

- [ ] 主滚动边界与 `baseline.structure.scrollContainers` 一致
- [ ] 组件内部构图（横向 vs 纵向、同行 vs 堆叠）与 Screenshot 一致
- [ ] Section 层级、构图轴向与 Evidence 一致

**方法：** 对照 Screenshot 推理"这段代码会产生什么视觉"，而不是依赖 Target 自动截图。

### 6. 状态与交互完整性

Evidence 声明的 Variant、状态、Scenario 必须实现：

- [ ] 所有 Variant（default / loading / error / empty）已实现
- [ ] 表单校验规则完整（不能遗漏字段，如 `outcome` 字段未进校验）
- [ ] 导航参数已消费（不能"接收参数但固定显示默认数据"）
- [ ] Scenario checkpoint 的关键交互已实现

### 7. Unverified 诚实标记

无法机器验证的部分必须**诚实标记**为 `unverified`：

**可以标记为 unverified：**
- 动画时序、缓动曲线
- 精确像素间距（±2px 级别）
- 深色主题下的视觉对比度（未测试 dark variant）
- 需要真实设备才能验证的手势

**不能标记为 unverified：**
- 固定业务数据（数值、时间戳、选项列表） — 这些必须精确对照
- Token key 匹配 — resolver 已提供验证
- 组件映射 — resolver 已提供验证
- 主滚动边界、构图轴向 — 代码可推理

**红线：** 不能用空的 `observations` 或"Agent 自报通过"来掩盖未验证项。

## 完成报告结构

在调用 `summarize_reconstruction_review` 时，报告必须包含：

### Verified（已验证）

```markdown
- [x] 所有 X 个 Screen 的 Evidence Screenshot 已查看
- [x] 结构：主滚动容器、section 层级、构图轴向 ✓
- [x] 组件：Y 个组件已映射到 Target widgets，resolver 返回 resolved ✓
- [x] Token：Z 个颜色/字体 Token 已解析并在代码中使用 ✓
- [x] Target 原生测试：编译通过、N 个单测通过 ✓
```

### Deviations（已知偏差）

```markdown
- LoadingScreen 使用了 CircularProgressIndicator 而非 Evidence 自定义加载器
  原因：Target 规范要求统一使用 Material loading
  影响：视觉差异，功能一致
```

### Unverified（未验证）

```markdown
- [ ] 状态切换动画流畅度（无 Target 截图，无法机器验证）
- [ ] 错误状态视觉表现（未运行 error scenario）
- [ ] 深色主题颜色对比度（未测试 dark theme variant）
```

**每个 `unverified` 必须说明为什么无法验证。**

## 人工验收清单生成

报告末尾必须生成**针对本次实施的**人工验收清单。清单结构：

```markdown
## Human Verification Checklist

请打开 Target 应用，对照以下 Evidence Screenshot：

1. **[实际Screen名称]** (`[实际baseline截图文件名].png`)
   - [ ] [基于本次Deviations的检查项]
   - [ ] [基于本次Unverified的检查项]
   - [ ] [关键固定数据抽查项]
   - [ ] [需要目视的视觉细节]

2. **[下一个Screen]** (...)
   - [ ] ...
```

**生成规则：**
- 清单必须基于本次实施的实际 Screen、Deviations、Unverified
- 不要硬编码具体原型的检查项
- 对已知偏差，说明让人确认是否可接受
- 对 unverified 项，说明需要人工验证什么
- 对关键固定数据（数值序列、选项数量、时间戳），列出具体值供人抽查

## 与现有流程的集成

本 Skill **不改变** MCP 消费流程，只在最后验收阶段强制执行检查：

```
read_handoff_index
  ↓
read_screen_packet + read_evidence_screenshot
  ↓
resolve_target_* + inspect_target_readiness
  ↓
实施 Target 代码
  ↓
运行 Target 原生测试
  ↓
[调用本 Skill] ← 在这里强制检查
  ↓
summarize_reconstruction_review
  ↓
生成人工验收清单
```

## 红线总结

1. **不能跳过 Screenshot** — 必须用 `read_evidence_screenshot` 查看真实图像
2. **不能简化固定数据** — 不能因"Evidence 不详细"而自行裁剪
3. **不能用相似值替代 Token** — `surfaceVariant` ≠ `warning-soft`
4. **不能用空 observations 掩盖未验证项** — 必须诚实标记 `unverified` 并说明原因
5. **不能省略人工验收清单** — 必须告诉人该看什么、对比什么

## 预期收益

- 状态命中：6.5 → ~8.0（强制对照固定数据）
- Token 命中：7.5 → ~8.5（强制精确 key 匹配）
- 交互命中：7.5 → ~8.2（强制校验完整性）
- 总分：7.6 → ~8.3（+0.7）

本 Skill 不增加新工具，不打断流程，不要求 Target 自动截图。只是把现有最佳实践变成强制检查清单。
