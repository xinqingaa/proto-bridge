# Theme

## 文件

| ID      | 文件                                              | 说明                                                   |
| ------- | ------------------------------------------------- | ------------------------------------------------------ |
| `light` | `apps/pbwork/src/design-system/themes/light.json` | 浅色；默认 `overrides` 可为空（用 Token defaultValue） |
| `dark`  | `apps/pbwork/src/design-system/themes/dark.json`  | 深色；用 overrides 覆盖需变的 Token 值                 |

Schema：`schemas/theme.schema.json`。

## 规则

1. Theme **只覆盖值**，不增删 Token 语义，不改组件 `tokenBindings`。
2. 未出现在 overrides 中的 ID 使用 Token `defaultValue`。
3. 工作台样式主题与原型 Runtime 主题是不同通道；原型换肤不要依赖工作台本地状态偷渡。
4. 组件外观 = bindings + 当前 Theme 解析结果。验收时至少浅/深各看一遍关键表面。

## 原型内主题契约

1. **只用已注册主题**（`light` / `dark` 或后续注册 id），禁止页内写死第二套色板。
2. **`theme` 不是 Screen Variant**，不占用业务 `variant` 枚举。
3. **会话偏好为权威**（`pbwork.runtime.theme.v1` / 产品 localStorage）：URL `theme` 用于分享、Workbench 预览和 Capture Case 钉。独立 Runtime 应将历史条目中的主题 query **规范为当前偏好**，避免前进/后退把皮肤「回滚」。
4. **切换主题用 replace**（或等价不新增业务 history 条目的方式），不要为切皮肤堆栈，并保留 `pbParent` 等 history state。
5. 切换后应通知 Runtime / 工作台（事件或既有 bridge），保证壳与 iframe 一致。
6. **采集安全**：`goto` / `prepare` / Workbench 强制导航和带显式 `?theme=` 的打开以 URL 为准并回写偏好。禁止在这些路径上用偏好覆盖 URL。只有返回、前进和恢复 `pbParent` 时忽略历史 `theme`。

## 检查

- [ ] 切深色再返回上级，主题不因旧 history query 复原成浅色（或反之）
- [ ] 浏览器前进/后退不把主题当成业务页状态来回跳
- [ ] 业务 Variant（empty/sheet-open…）与 theme 可独立组合
