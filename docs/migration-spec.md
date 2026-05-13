# 迁移说明书模板与质量标准

本文档定义可选 source-aware brief `migration-spec.md` 的目标、章节要求和质量标准。它不再是默认主产物；默认主交接文档是 `ui-build-review.md`。项目整体入口见 [README.md](../README.md)，workflow 说明见 [workflows.md](workflows.md)。

## 1. 说明书的目标

一份合格的 `migration-spec.md` 应该让 Flutter 开发者或 AI coding 工具回答这些问题：

- 页面应该落到哪个 Flutter 模块和哪些文件。
- 页面应该拆成哪些父 Widget 和子 Widget。
- 子 Widget 应该接收哪些输入数据、抛出哪些交互回调。
- 哪些状态放 Controller，哪些放 Repository、Adapter、Model 或局部 Widget。
- 路由、主题、i18n、资源和公共组件应该如何接入。
- 哪些信息确定，哪些推断，哪些必须人工确认。

## 2. 输出原则

- 说明书只面向 Flutter 实现，不输出 source 技术栈、模板语法或 DOM/class 证据。
- 调试证据应查看 `page-canonical.json` 和 `page-debug-index.json`；`migration-spec.md` 只保留实现计划。
- 不要把来源页面结构逐层翻译成 Flutter Widget。
- 不要把临时 mock 数据直接写在 Widget build 中。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先通过构造参数传入数据，并用回调上报交互。
- 缺少上下文时，要明确缺口和下一步补齐方式。

## 3. 必备章节

一份标准说明书至少应包含下面这些章节。

### 3.1 页面元信息

必须包含：

- 页面名称
- route 来源
- screenId
- 推荐 Flutter 模块
- 推荐实现形态

### 3.2 迁移结论

必须包含：

- 页面复杂度
- 推荐实现形态
- 是否适合直接进入实现
- 最大阻塞点
- 主要风险

### 3.3 Flutter 实现规划

必须包含：

- 目标文件拆分
- Widget 组合
- 状态管理与数据边界建议
- 禁止直译项

### 3.4 状态与交互建议

必须说明：

- UI 状态
- 业务数据
- 派生状态
- 交互事件
- 生命周期副作用

### 3.5 路由与布局

必须说明：

- 当前页面路由来源
- Flutter route 注册建议
- 页面跳转、返回、参数读取和参数传递建议
- fixed / sticky / scroll / safe-area / z-index / absolute / flex / grid / spacing 等布局特征

### 3.6 样式、i18n 和资源

必须说明：

- 颜色映射
- 字体映射
- i18n key 和 `.tr` 建议
- 资源线索和 asset 目标目录

### 3.7 可复用组件

必须明确 target 工程中哪些 common widgets、routes、translations、assets 或主题能力应优先复用。

### 3.8 人工确认项

必须是可执行确认项，而不是泛泛提醒。

例如：

- 确认按钮点击后跳转到哪个 Flutter route。
- 确认 `fundCode` 来自路由参数还是接口返回。
- 确认 empty 状态使用现有 `CommonEmpty` 还是模块自定义组件。

## 4. 质量分级

### Bronze：基础可生成

- 能定位页面 route、screenId 和目标 Flutter 模块。
- 能读取 notes 和 i18n。
- 能给出基础 token 映射。
- 能生成基础 Widget 拆分和人工确认项。

### Silver：标准输出

- 能生成文件树、Widget 组合、输入数据/交互回调和状态管理建议。
- 能把 source facts 消化为 Flutter 视角的说明。
- 能输出 P0/P1/P2 可执行确认项。

### Gold：增强输出

- 能结合运行时截图和 computed style 校对布局。
- 能识别 target Flutter 模块内相似页面并总结复用写法。
- 能给出更准确的 Controller、Binding、Repository、common widget 使用建议。
- 能输出更高质量的接口、权限、风控、异常态确认项。

## 5. 快速检查清单

输出说明书前，至少确认下面这些问题：

- 是否明确页面身份、route、screenId 和目标模块。
- 是否明确文件拆分和 Widget 树。
- 是否明确状态 owner 和交互边界。
- 是否明确路由参数、布局特征、theme / i18n / assets 建议。
- 是否明确可复用 Flutter 组件。
- 是否明确人工确认项。
- 是否避免 source 技术栈泄漏。

## 6. Markdown 模板

````md
# <页面名> Flutter 迁移说明书

## 页面元信息
- 目标路由来源：
- screenId：
- 推荐 Flutter 模块：
- 推荐实现形态：
- 需求状态：
- 维护角色：

## 一、迁移结论
- 页面复杂度：
- Flutter 实现复杂度：简单 / 中等 / 复杂
- 页面模式：
- 建议是否直接实现：
- 主要风险：
- 实现规划：

## 二、Flutter 实现规划
### 目标文件拆分
```text
lib/app/modules/<module>/<screen>/
├── <screen>_page.dart
└── widgets/
    └── <screen>_body.dart
```

| 文件 | 职责 | 备注 |
| --- | --- | --- |

### Widget 组合
| Widget | 所属/父级 | 职责 | 输入数据 | 交互回调 | 状态访问建议 |
| --- | --- | --- | --- | --- | --- |

### 状态管理与数据边界建议
| 关注点 | 建议 owner | 建议 |
| --- | --- | --- |

### 禁止直译项
- 不要逐层照搬来源页面结构；按业务区块和 Flutter 布局模型重组。
- 不要把临时 mock 数据直接写在 Widget build 中。
- 不要让每个子 Widget 都直接依赖整个 Controller。

## 三、状态与交互建议
### 状态模型摘要
| 分类 | 涉及状态/能力 | Flutter 建议 |
| --- | --- | --- |

### 生命周期与副作用
| 副作用类型 | 目标 | Flutter 建议 |
| --- | --- | --- |

### 交互事件
| 交互类型 | 涉及目标 | Flutter 建议 |
| --- | --- | --- |

## 四、路由与布局
### 路由与参数
| 原型 route/query | Flutter 建议 |
| --- | --- |

### 页面路由行为
| 行为 | 目标/参数 | Flutter 迁移建议 |
| --- | --- | --- |

### 布局模型
| 布局特征 | Flutter 迁移建议 |
| --- | --- |

## 五、CSS 样式到 Flutter 主题映射
### 颜色
| 使用位置 | 变量名 | Flutter 主题 | 色值 |
| --- | --- | --- | --- |

### 字体
| 使用位置 | 变量名 / mixin | Flutter 文本主题 | 原始样式 |
| --- | --- | --- | --- |

## 六、文案与 i18n
| key | zh_CN | zh_HK | en_US | Flutter 建议 |
| --- | --- | --- | --- | --- |

## 七、资源迁移
| 类型 | 资源线索 | Flutter 建议路径 | 迁移建议 |
| --- | --- | --- | --- |

## 八、可复用 Flutter 组件
| 场景 | 推荐组件 |
| --- | --- |

## 九、人工确认项
- [ ] P0：
- [ ] P1：
- [ ] P2：
````
