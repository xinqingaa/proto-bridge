---
name: proto-bridge-ds-target-sync
description: >-
  Synchronize the stable PBWork Design System contract, roles, tokens, themes,
  components, and interactions into this Flutter target without a Handoff.
---

# PBWork DS → Flutter 同步

本 Skill 只处理 Design System 目标适配，不读取或伪造 Handoff。开始时先读：

1. `AGENTS.md`
2. `docs/proto-bridge.md`
3. `docs/proto-bridge.target.json`
4. `docs/proto-bridge.sync.json`
5. `docs/components.md` 与 `docs/theme.md`
6. Producer 的 `apps/pbwork/docs/components/alignment-protocol.md` 及本批变化 Contract

## 流程

1. 运行 `pnpm ds:target-sync:verify`，记录 Schema、Contract、role、Token/Theme 变化分区和组件；不要凭记忆决定同步范围。
2. 按 `componentId` 翻译职责、`summary`、`behavior`、state kind、layout、visual anatomy 和 token bindings。Role 只做通用语义回退；例如 `flow-sheet` 仍使用 `sheet` role。
3. 更新 Target 自己拥有的 `docs/proto-bridge.target.json` 与 Dart 公开 API。允许 API 不同构，但所有当前 Contract id 与实际绑定 Token 必须被 resolver 判定为 `resolved`。
4. 平台近似必须显式记录；不得在 feature 中复制公共组件或创建平行 Theme。
5. DS 仍在连续迭代时保持 drift/pending 可见；确认稳定后用 verifier 输出更新 `docs/proto-bridge.sync.json`，状态恢复 `synced`。

## 验证

```bash
flutter analyze
flutter test
cd ../.. && pnpm ds:target-sync:verify
```

交付报告说明同步 surface、组件/Token resolver 覆盖率、平台近似和剩余偏差。
