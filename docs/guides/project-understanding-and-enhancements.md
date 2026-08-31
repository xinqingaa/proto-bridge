# ProtoBridge 项目理解与验收能力增强总结

## 一、项目完整性评估

### ✅ 完整的产品闭环

ProtoBridge 已构建从原型到验收的完整链路：

```
原型制作 → 证据采集 → 固定交付 → Agent实现 → 五维验收
(PBWork)   (Capture)   (Handoff)  (MCP)     (Review)
   ↓          ↓           ↓         ↓          ↓
Runtime   不可变      固定引用   渐进消费   结构化报告
          Evidence    Snapshot              + 人工清单
```

**关键特性：**
- 不可变 Evidence 存储
- 固定的 Handoff 引用（不漂移）
- 强制的计划审批门
- 五维对照复查（结构/组件/颜色文字/状态/操作）
- 保留可追溯的历史

**结论：** 这是一个完整的证据链闭环，而非简单的"DOM转代码"工具。

## 二、Agent 能力对比

### 问题：能否像 codex.app 一样读取网页或截图？

**回答：可以，且方式更适合 ProtoBridge 场景**

| 能力 | Codex.app | Claude Code | 对 PB 的影响 |
|------|-----------|-------------|-------------|
| 主动截图网页 | ✅ | ❌ | ✅ 不需要 - PBWork 已生成 |
| 读取本地截图 | ✅ | ✅ | ✅ 完全支持 |
| 读取 MCP ImageContent | ✅ | ✅ | ✅ `read_evidence_screenshot` |
| 视觉分析能力 | ✅ | ✅ | ✅ 相当 |
| WebFetch 文本 | ✅ | ✅ | ✅ 已支持 |

**关键优势：**
- Evidence Screenshot 已由 Runtime 采集并固化
- 通过 `read_evidence_screenshot` 返回 MCP ImageContent
- 不需要动态抓取，避免了"截图时机"和"环境准备"的复杂性

**结论：** 在 ProtoBridge 场景下，Claude Code 的能力完全够用，甚至更优（固定证据 vs 动态抓取）。

### 关于 Target 截图

**共识：不获取 Target 运行截图**

原因：
- Flutter MCP 截图成本太高（环境配置、构建等待）
- 当前 80% 还原度下，投入产出比不合算
- 会打断 25 分钟的连贯流程

**验收策略：**
- Agent 基于 Evidence Screenshot 推理代码视觉
- 结合 Token/Component resolver 验证
- 运行 Target 原生测试（编译、类型检查）
- 诚实标记无法机器验证的部分为 `unverified`
- 生成人工验收清单，批量人工目视

## 三、项目增强：验收 Skill

### 为什么需要？

**问题发现：** 从真实验收案例（7.6分）分析，主要扣分项是：

```
❌ Major 问题：
- 温度序列未对齐 Source mock
- 表单选项被裁剪（注释称"compact Evidence 未证明全量"）
- 提交校验遗漏 outcome 字段
- 风险指标构图偏离
- 事件时间未对齐

❌ Moderate 问题：
- Token key 偏离（warning-soft → surfaceVariant）
- 导航参数未消费（接收但不用）
- Variant 状态快照不完整
```

**根源：** Agent 可以自己判断"Evidence 不够，所以简化"，缺少强制执行纪律。

### 实施的改进

已完成以下集成：

#### 1. 创建验收 Skill
```
.agents/skills/acceptance/SKILL.md
```

**职责：**
- 强制 Agent 读取所有 Evidence Screenshot
- 强制固定业务数据精确对照
- 强制 Token 精确匹配（不能用"差不多的值"）
- 强制结构对照 Screenshot
- 强制诚实标记 `unverified`
- 生成人工验收清单

#### 2. 集成到 MCP 层面
```
packages/core/src/v2/prompts/acceptance-discipline.md
```

**自动生效：**
- 加入 `PROMPT_ASSETS`
- 包含在 `buildAgentPrompt()` 生成的交付提示词中
- 对所有 Agent（codex/cursor/claude code）都有效

#### 3. 更新任务路由
```
AGENTS.md - 任务路由表
```

新增一行：
```
Target 还原验收 | .agents/skills/acceptance/SKILL.md | 实施完成前
```

### 预期收益

基于真实案例推算：

| 维度 | 当前 | 预期 | 提升 | 原因 |
|------|------|------|------|------|
| 状态命中 | 6.5 | ~8.0 | +1.5 | 强制对照固定数据 |
| Token 命中 | 7.5 | ~8.5 | +1.0 | 强制精确 key 匹配 |
| 交互命中 | 7.5 | ~8.2 | +0.7 | 强制校验完整性 |
| 页面结构 | 7.5 | ~7.8 | +0.3 | 强制对照 Screenshot |
| 组件命中 | 8.8 | ~8.8 | - | 已经很好 |
| **总分** | **7.6** | **~8.3** | **+0.7** | **从 80% → 85-90%** |

**关键改进：**
- 减少 Major 问题（固定数据偏离、校验遗漏）
- 减少 Moderate 问题（Token key 偏离、参数未消费）
- 提升验收报告质量（Verified/Deviations/Unverified 结构化）

### 对所有 Agent 的加持

✅ **是的，对 codex、cursor、claude code 都有效**

因为：
- Skill 是 MCP 层面的规范，不依赖特定 Agent
- 通过 Prompt Asset 自动包含在交付提示词中
- 任何 Agent 消费 Handoff 时都会收到验收纪律

### 为什么现在效果已经很好？

**当前起作用的机制：**
1. MCP 工具链完整（`read_handoff_index` → `read_screen_packet` → `read_evidence_screenshot`）
2. Handoff 提示词已规定强制顺序
3. Target resolver 有效（组件命中率 8.8）
4. Agent 自身能力强

**但仍有提升空间：**
- Agent 可以自己判断"跳过细节"
- 缺少强制检查清单
- 验收报告格式不统一
- `unverified` 标记不诚实（用空 observations 掩盖）

**验收 Skill 的价值：**
把"Agent 自己判断可以跳过"变成"Skill 强制检查不能跳过"。

## 四、修改计划总结

### 现在的流程
```
定稿采集 → 提示词 → agent只读+计划 → [连贯执行：还原+验收+自测]
           ↑ 唯一打断                    ↑ Agent 自己判断验收标准
```

### 加入 Skill 后的流程
```
定稿采集 → 提示词(含验收纪律) → agent只读+计划 → [连贯执行：还原+自测]
           ↑ 唯一打断                                    ↓
                                              [强制验收检查] ← Skill 执行
                                                    ↓
                                          summarize_reconstruction_review
                                                    ↓
                                              人工验收清单
```

**关键差异：**
- ✅ 不打断流程（仍然连贯执行）
- ✅ 不需要 Target 截图（基于 Evidence 推理）
- ✅ 强制检查清单（不能跳过）
- ✅ 结构化报告（Verified/Deviations/Unverified）
- ✅ 人工验收清单（告诉人该看什么）

### 已完成的文件

```
新增：
✅ .agents/skills/acceptance/SKILL.md
✅ packages/core/src/v2/prompts/acceptance-discipline.md
✅ docs/guides/acceptance-skill-usage.md
✅ docs/guides/project-understanding-and-enhancements.md (本文件)

修改：
✅ AGENTS.md (任务路由表)
✅ packages/core/scripts/generate-prompt-assets.mjs (加入 acceptance-discipline)
✅ packages/core/src/v2/prompts/agent-prompt.ts (包含验收纪律)
✅ packages/core/src/v2/prompts/generated-assets.ts (自动生成)

验证：
✅ pnpm build (构建成功)
✅ Consumer contract verification passed
```

## 五、下一步建议

### 立即可做
1. ✅ 验收 Skill 已集成，无需额外配置
2. 在下一次实际还原任务中测试
3. 观察 Agent 是否按强制检查清单执行
4. 对比验收报告质量

### 持续优化
1. 收集多次验收数据，验证 0.7 分提升
2. 调整检查项严格程度（过严或过松）
3. 完善人工验收清单模板
4. 考虑为 Web Target 添加低成本截图方案（可选，非必需）

### 不建议做
- ❌ 不要自动化 Target 截图（成本太高）
- ❌ 不要打断 25 分钟连贯流程
- ❌ 不要为了"100% 机器验证"而牺牲效率

## 六、核心价值总结

**ProtoBridge 的设计哲学：**
> Evidence 是固定的页面事实，Target 代码是实现。验收是对照两者，而不是自动生成"总分"。

**验收 Skill 的定位：**
> 不是为了增加新功能，而是把现有最佳实践变成强制纪律，让所有 Agent 都遵循统一标准。

**投入产出比：**
- 投入：1-2 小时编写 Skill，已完成
- 产出：每次验收提升 0.5-1 分，减少 Major/Moderate 问题
- 适用：所有 Agent（codex/cursor/claude code）

**最终目标：**
从 80% 还原度提升到 85-90%，同时保持 25 分钟连贯流程。
