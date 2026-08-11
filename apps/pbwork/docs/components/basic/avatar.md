# Avatar

> 组件 id：`avatar` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Avatar.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/avatar.json`

人员标识，用于列表负责人或个人中心。

## 职责

- **做什么**：用户/联系人头像。
- **边界**：身份展示；不要当按钮用（需要点击时外包 IconButton/button）。

## Props

| Prop   | 类型                     | 默认      | 说明 |
| ------ | ------------------------ | --------- | ---- |
| `name` | string                   | `李明`    |      |
| `size` | `sm` \| `md` \| `lg`     | `md`      |      |
| `tone` | `primary` \| `secondary` | `primary` |      |

## States（Playground / Contract）

- `small` — 小尺寸
- `large` — 大尺寸

## Slots / Events

- **Slots**：无
- **Events**：无

## tokenBindings

| 槽位         | Token              |
| ------------ | ------------------ |
| `background` | `color.primary`    |
| `text`       | `color.on-primary` |
| `size`       | `sizing.avatar-md` |
| `radius`     | `radius.full`      |
| `initials`   | `typography.label` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
