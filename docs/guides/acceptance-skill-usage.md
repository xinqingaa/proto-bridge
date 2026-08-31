# 验收 Skill 使用指南

## 概述

验收 Skill (`.agents/skills/acceptance/SKILL.md`) 强制执行五维对照复查纪律，确保任何 Agent（codex、cursor、claude code 等）在完成 Target 实现后都遵循统一的验收标准。

## 自动集成

验收纪律已集成到 MCP 层面，**无需手动调用**。当 Agent 通过 MCP 消费 Handoff 时，会自动收到验收纪律作为 Consumer Contract 的一部分。

### 集成点

1. **MCP Prompt Asset** - `acceptance-discipline` 已加入 `PROMPT_ASSETS`
2. **Agent Prompt** - 自动包含在 `buildAgentPrompt()` 生成的交付提示词中
3. **AGENTS.md** - 已加入任务路由表，可手动查阅

## 工作流程

```
定稿采集 → 生成提示词 → Agent 只读计划 → 用户批准
  ↓
Agent 实施 Target 代码
  ↓
运行 Target 原生测试
  ↓
[应用验收纪律] ← 自动触发，强制检查
  ↓
summarize_reconstruction_review
  ↓
生成人工验收清单
```

## 强制检查项

验收 Skill 强制 Agent 在报告完成前确认：

### ✅ Evidence 完整读取
- 所有 Screenshot 都通过 `read_evidence_screenshot` 查看
- 所有 Case delta 都已读取
- 不能跳过视觉事实

### ✅ 固定业务数据精确对照
- 温度序列、时间戳等数值完全一致
- 选项列表完整，不能自行裁剪
- 不能因"Evidence 不够详细"而简化

### ✅ Token 精确匹配
- `warning-soft` ≠ `surfaceVariant`
- `body-large` ≠ `body-medium`
- 不能用"差不多的值"替代

### ✅ 组件精确映射
- Evidence componentId → Target 公共组件
- 不能"该用公共组件却自造"
- 组件关键属性已消费

### ✅ 结构对照 Screenshot
- 主滚动边界一致
- 组件内部构图（横向 vs 纵向）一致
- 对照 Screenshot 推理代码视觉

### ✅ 状态与交互完整性
- 所有 Variant 已实现
- 表单校验规则完整
- 导航参数已消费
- Scenario checkpoint 已实现

### ✅ Unverified 诚实标记
- 动画、精确间距可标记为 unverified
- 固定业务数据、Token、组件不能标记为 unverified
- 必须说明为什么无法验证

## 完成报告格式

Agent 必须生成结构化报告：

```markdown
## Machine Verification

### ✅ Verified
- [x] 所有 X 个 Screen 的 Evidence Screenshot 已查看
- [x] 结构：主滚动容器、section 层级 ✓
- [x] 组件：Y 个组件已映射 ✓
- [x] Token：Z 个 Token 已解析并使用 ✓
- [x] Target 原生测试：编译通过 ✓

### ⚠️ Deviations
- 具体偏差：原因 + 影响

### ❓ Unverified
- [ ] 具体未验证项：为什么无法验证

## Human Verification Checklist

请打开 Target 应用，对照以下 Evidence Screenshot：

1. **[实际Screen名称]** (`[实际baseline截图].png`)
   - [ ] [基于本次Deviations的检查项]
   - [ ] [基于本次Unverified的检查项]
   - [ ] [关键数据抽查项]

（应根据本次实施动态生成，不是硬编码模板）
```

## 预期收益

基于真实验收案例分析：

| 维度 | 当前 | 加 Skill 后 | 提升 |
|------|------|------------|------|
| 状态命中 | 6.5 | ~8.0 | +1.5 |
| Token 命中 | 7.5 | ~8.5 | +1.0 |
| 交互命中 | 7.5 | ~8.2 | +0.7 |
| 组件命中 | 8.8 | ~8.8 | - |
| 页面结构 | 7.5 | ~7.8 | +0.3 |
| **总分** | **7.6** | **~8.3** | **+0.7** |

**关键改进：**
- 减少"因 Evidence 不够详细而自行简化"的情况
- 减少 Token key 偏离（`surfaceVariant` 误用）
- 减少固定业务数据不完整（温度序列、选项列表）
- 减少表单校验遗漏（outcome 字段）

## 对不同 Agent 的支持

验收 Skill 对所有 Agent 都有效：

- ✅ **Codex.app** - 通过 MCP Prompt 自动获取
- ✅ **Cursor** - 通过 MCP Prompt 自动获取
- ✅ **Claude Code** - 通过 MCP Prompt 自动获取
- ✅ **其他支持 MCP 的 Agent** - 通用标准

## 手动查阅

如果需要手动参考验收纪律：

```bash
# 查看完整 Skill
cat .agents/skills/acceptance/SKILL.md

# 查看 MCP 集成的提示词
cat packages/core/src/v2/prompts/acceptance-discipline.md
```

## 不改变的部分

✅ **不打断流程** - 仍然是一次性连贯执行  
✅ **不需要 Target 截图** - 基于 Evidence Screenshot 推理验证  
✅ **不增加新 MCP Tool** - 复用现有工具链  
✅ **不改变实施路径** - 只在验收阶段强化纪律  

## 验证集成

检查验收纪律是否正确集成：

```bash
# 1. 验证 Skill 文件存在
ls -la .agents/skills/acceptance/SKILL.md

# 2. 验证 MCP 提示词文件存在
ls -la packages/core/src/v2/prompts/acceptance-discipline.md

# 3. 验证已加入生成的资源
grep "acceptance-discipline" packages/core/src/v2/prompts/generated-assets.ts

# 4. 验证构建成功
pnpm build

# 5. 生成测试提示词
pnpm pb:mcp -- --print-config
```

## 下一步

1. 在下一次实际还原任务中测试验收 Skill
2. 观察 Agent 是否按照强制检查清单执行
3. 对比验收报告质量（Verified / Deviations / Unverified 的完整性）
4. 收集反馈，必要时调整检查项的严格程度
