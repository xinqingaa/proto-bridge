# Acceptance Discipline

完成 Target 实现后，在调用 `summarize_reconstruction_review` 之前，**必须**先完成五维强制检查。

## 强制检查清单

### 1. Evidence 完整读取

- [ ] 所有实施范围内 Screen 的 `read_screen_packet` 已调用
- [ ] 所有不同 `representativeBlobId` 的 Screenshot 已通过 `read_evidence_screenshot` 查看为真实 ImageContent
- [ ] baseline 无法解释的 Case 已通过 `read_case_delta` 读取差异

**红线：** 不能只读 `canonicalBrief` 文字描述就开始编码。Screenshot 是视觉事实，必须查看。

### 2. 固定业务数据精确对照

Evidence 中的固定业务数据（数值、时间戳、选项列表、文案）必须**精确复制**：

- [ ] 温度序列、时间戳等数值与 Source mock/fixture 完全一致
- [ ] 下拉选项、单选组、复选框选项目录完整
- [ ] 列表项 key、ID、关键字段与 Evidence 固定数据对齐

**红线：** 不能在代码注释中写"compact Evidence 未证明全量，所以简化"。Evidence 不够时，应标记为 `unverified` 并说明，而不是自行简化。

### 3. Token 精确匹配

`resolve_target_tokens` 返回的 Token key 必须**精确匹配** Evidence：

- [ ] 颜色 Token：`warning-soft` 不能替换为 `surfaceVariant`
- [ ] 字体 Token：`body-large` 不能替换为 `body-medium`
- [ ] 间距 Token：`spacing-4` 不能硬编码为 `16.0`

用"看起来差不多的值"替代算作 `deviation`。

### 4. 组件精确映射

- [ ] Evidence `componentId` → Target 公共组件的映射已验证
- [ ] 不能"该用公共组件却自造"或"错用相似组件"
- [ ] 组件关键属性（如 `showBack`、`scrollable`、`variant`）已消费

### 5. 结构对照 Screenshot

- [ ] 主滚动边界与 `baseline.structure.scrollContainers` 一致
- [ ] 组件内部构图（横向 vs 纵向、同行 vs 堆叠）与 Screenshot 一致
- [ ] Section 层级、构图轴向与 Evidence 一致

**方法：** 对照 Screenshot 推理"这段代码会产生什么视觉"。

### 6. 状态与交互完整性

- [ ] 所有 Variant（default / loading / error / empty）已实现
- [ ] 表单校验规则完整（不能遗漏字段）
- [ ] 导航参数已消费（不能"接收参数但固定显示默认数据"）
- [ ] Scenario checkpoint 的关键交互已实现

### 7. Unverified 诚实标记

**可以标记为 unverified：**
- 动画时序、缓动曲线
- 精确像素间距（±2px 级别）
- 深色主题下的视觉对比度（未测试 dark variant）

**不能标记为 unverified：**
- 固定业务数据（数值、时间戳、选项列表）
- Token key 匹配（resolver 已提供验证）
- 组件映射（resolver 已提供验证）
- 主滚动边界、构图轴向（代码可推理）

**红线：** 不能用空的 `observations` 或"Agent 自报通过"来掩盖未验证项。

## 完成报告结构

### Verified（已验证）

```markdown
- [x] 所有 X 个 Screen 的 Evidence Screenshot 已查看
- [x] 结构：主滚动容器、section 层级、构图轴向 ✓
- [x] 组件：Y 个组件已映射到 Target，resolver 返回 resolved ✓
- [x] Token：Z 个颜色/字体 Token 已解析并在代码中使用 ✓
- [x] Target 原生测试：编译通过、N 个单测通过 ✓
```

### Deviations（已知偏差）

每个偏差必须说明原因和影响。

### Unverified（未验证）

每个 `unverified` 必须说明为什么无法验证。

## 人工验收清单生成规则

报告末尾必须生成**针对本次实施的**人工验收清单。清单应该：

1. 列出所有实施的 Screen 及其对应的 baseline Screenshot 文件名
2. 对每个 Screen，列出需要人工目视确认的关键点：
   - 已知偏差项（让人确认是否可接受）
   - Unverified 项（让人目视验证）
   - 关键固定数据（让人抽查，如重要数值、选项数量）
   - 视觉细节（间距、阴影、构图等机器无法验证的部分）

3. 具体检查项应基于：
   - 本次实施的实际 Screen
   - `Deviations` 中记录的偏差
   - `Unverified` 中记录的未验证项
   - Evidence 中的关键固定数据

**示例格式：**

```markdown
## Human Verification Checklist

请打开 Target 应用，对照以下 Evidence Screenshot：

1. **[Screen名称]** (`[baseline-screenshot-filename].png`)
   - [ ] [具体检查项1 - 基于实际偏差]
   - [ ] [具体检查项2 - 基于实际未验证项]
   - [ ] [具体检查项3 - 关键数据抽查]
```

不要硬编码具体原型的检查项，应该根据本次实施动态生成。
