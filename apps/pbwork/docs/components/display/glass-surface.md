# GlassSurface

> 组件 id：`glass-surface` · 分类：`display`

纯玻璃材质容器；[Contract](../../../src/design-system/components/contracts/glass-surface.json) 是 props、状态和绑定的权威。

## 职责与边界

只提供背景材质与默认内容 slot，轮廓继承宿主，不拥有导航、手势或滚动；内容按常规文档流排版。AppBar、Tabbar、PrimaryTabs 的材质层复用同一 GlassMaterial。

## 行为要点

常规底色保障文字可读，clear 更透、适合看清背后的正文。背景滤镜只作用于组件后面的内容，前景保持清晰；边缘高光提供层次。宿主不要把材质包进 `isolation` 或其他会截断背景采样的组。定位层不拦截点击。无 backdrop-filter、降低透明度或强制颜色时降级为实色。Web 实现不承诺原生光学折射。

## States

| id | label | kind |
| --- | --- | --- |
| `clear` | 清透 | `variant` |

## 用法与反例

用于浮动操作或导航承托，也可独立验证材质；宿主决定尺寸与轮廓，组件不强加圆角档或业务品牌。不把所有内容卡片玻璃化。

Props、Slots、Events、默认值与 Token 槽以 [GlassSurface Contract](../../../src/design-system/components/contracts/glass-surface.json) 为准。
