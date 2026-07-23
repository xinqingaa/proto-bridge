# 原型系统总览

## 注册权威

`apps/pbwork/src/prototypes/registry.ts`：

- `prototypes[]`：id、label、lifecycle、owners、roles、`defaultThemeId`  
- `prototypeScreens[]`：screenId、screenSlug、path、view、variants、defaultVariantId  

工作台导航与 Runtime 路由都读这份注册表，不要在别处再维护平行清单。

## 目录约定

```text
prototypes/{prototypeId}/
├── *Shell.vue          # （可选）AppBar + 内容 / TabViewport + BottomNavigation
├── nav.ts              # （可选）进栈、返回、Tab replace
├── mock.ts             # 静态可演示数据
├── theme-session.ts    # （可选）主题会话
├── panels/             # 一级 Tab 面板
├── screens/            # 可注册为 Screen 的页面
├── requirements.md     # 业务需求
└── implementation-notes.md  # 个案实现笔记（可选）
```

当前注册的业务原型见 `prototypes/registry.ts`（手册不绑定具体业务目录是否长期保留）。

## URL

| 用途 | 形态 |
| --- | --- |
| Runtime | `/prototype/:prototypeId/:screenSlug?variant=&theme=` |
| 工作台预览 | `/workbench/prototypes/:prototypeId/screens/:screenSlug?...` |

- `variant`：业务态（空/错/Sheet 开等）  
- `theme`：主题预览；权威策略见 [../tokens/themes.md](../tokens/themes.md)  

画布缩放/设备等状态只存工作台 localStorage，**不得**写入 Runtime URL。

## 组装原则

1. 优先 DS 组件与 [composition.md](../components/composition.md) 配方。  
2. 满足 [conventions.md](../../../../docs/conventions.md) 识别面。  
3. Variant 可切换且可静态见到关键列表数据。  
4. 稳定 `data-pb-id` / `inspectId`。  

下一步：[shell-and-nav.md](./shell-and-nav.md) · [screens-and-variants.md](./screens-and-variants.md) · [recipes.md](./recipes.md) · [../checklist.md](../checklist.md)
