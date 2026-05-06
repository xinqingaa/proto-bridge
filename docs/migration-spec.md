# 迁移说明书模板与质量标准

本文档是 `migration-spec.md` 模板和质量标准的主维护入口。

## 1. 核心目标

一份合格的迁移说明书应该让 Flutter 开发者或 AI coding 工具回答：

- 页面应该落到哪个 Flutter 模块和哪些文件？
- 页面应该拆成哪些父 Widget 和子 Widget？
- 子 Widget 应该接收哪些输入和 callback？
- 哪些状态放 Controller，哪些放 Repository、Adapter、Model 或局部 Widget？
- 路由、主题、i18n、资源和公共组件应该如何接入？
- 哪些信息确定，哪些推断，哪些必须人工确认？

## 2. 输出原则

- 正式说明书只面向 Flutter 实现，不输出 source 技术栈、模板语法或 DOM/class 证据。
- `migration-context.json` 可以保留调试证据，`migration-spec.md` 只保留实现计划。
- 不要把来源页面结构逐层翻译成 Flutter Widget。
- 不要把临时 mock 数据直接写在 Widget build 中。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先 props + callbacks。
- 缺少上下文时，要说明缺口和下一步补齐方式。

## 3. 质量分级

### Bronze：基础可生成

- 能定位页面 route、screenId 和目标 Flutter 模块。
- 能读取 notes 和 i18n。
- 能给出基础 token 映射。
- 能生成基础 Flutter Widget 拆分和人工确认项。

### Silver：当前目标

- 能生成 Flutter 实现规划，包括文件拆分、Widget 组合树、输入契约和状态管理组合建议。
- 能识别页面模式，例如 `quote-detail`、`detail`、`list`、`form`、`trade-ticket`、`portfolio`、`settings`、`auth`、`wizard`。
- 能把 source facts 消化为 Flutter 视角。
- 能区分 UI 状态、业务数据、派生数据、生命周期副作用、图表/adapter 数据。
- 能输出 P0/P1/P2 可执行确认项。

### Gold：后续目标

- 能结合运行时截图和 computed style 校对布局。
- 能识别目标 Flutter 模块内最相似页面并总结可复用写法。
- 能根据 YouFi 真实代码推断 Controller、Binding、Repository、EventBus、common widget 使用习惯。
- 能输出更准确的接口参数、路由参数、埋点、权限、风控和异常态建议。
- 能生成独立 `llm-prompt.md`。

## 4. 必备章节说明

### 4.1 迁移摘要

必须包含：

- 页面名称、目标路由来源、screenId。
- 推荐 Flutter 模块。
- 推荐实现形态。
- Flutter 实现复杂度。
- 是否可直接进入实现。
- 最大阻塞点。

### 4.2 Flutter 实现规划

必须包含：

- 目标文件拆分。
- Widget 组合树。
- Widget 输入契约。
- 状态管理组合建议。
- Controller/Adapter 边界。
- 禁止直译项。

### 4.3 页面结构拆分

必须从 Flutter 视角描述：

- Page / Body。
- Header / Summary。
- Tabs / Filter。
- Form / Input。
- List / Card / Table。
- Empty / Loading / Error。
- BottomActions。
- Dialog / Sheet / Toast。

### 4.4 状态与交互

必须说明：

- UI 状态。
- 业务数据。
- 派生状态。
- 交互事件。
- 生命周期副作用。

复杂页面不能把来源页面临时状态逐项搬进 GetX；必须先归类，再给 Flutter 架构建议。

### 4.5 路由与参数

必须包含：

- 当前页面路由来源。
- Flutter GetX route 注册建议。
- 页面跳转、返回、参数读取和参数传递建议。
- 需要确认的目标 route、参数名和默认值。

### 4.6 布局模型

必须包含：

- fixed / sticky / scroll / safe-area / z-index / absolute / flex / grid / spacing 等布局特征。
- Flutter 对应实现建议。
- 复杂滚动、吸顶、底部栏遮挡和安全区风险。

### 4.7 Token、i18n 和资源

必须包含：

- 已命中的颜色、字体 token。
- 样式 token 使用位置。
- 未命中的 token 和处理建议。
- i18n key 表。
- Flutter `.tr` 使用建议。
- 资源线索和 asset 目标目录。
- 暗色模式资源风险。

### 4.8 风险和人工确认项

风险必须具体，例如：

- notes 缺失导致业务意图不完整。
- 临时 mock 数据无法确认真实接口。
- 交易类操作需要确认风控和权限。
- Flutter 模块中没有相似页面可复用。

人工确认项必须能被执行，例如：

- “确认按钮点击后跳转到哪个 Flutter route”。
- “确认 fundCode 来自路由参数还是接口返回”。
- “确认 empty 状态使用现有 CommonEmpty 还是模块自定义组件”。

## 5. 当前 Markdown 模板

```md
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
- Flutter 实现复杂度：simple / moderate / complex
- 建议是否直接实现：
- 主要风险：
- 实现规划：

## 二、Flutter 实现规划
### 目标文件拆分
| 文件 | 职责 | 备注 |
| --- | --- | --- |

### Widget 组合树
| Widget | 父级 | 角色 | 构建建议 | 状态访问 |
| --- | --- | --- | --- | --- |

### Widget 输入契约
| Widget | 输入 | 回调 | 是否直接读 Controller | 备注 |
| --- | --- | --- | --- | --- |

### 状态管理组合建议
| 关注点 | 建议 owner | 建议 |
| --- | --- | --- |

### Controller/Adapter 边界
| 边界 | 职责 | 负责 | 避免 |
| --- | --- | --- | --- |

### 禁止直译项
- 不要把来源页面结构逐层翻译成 Flutter Widget；按业务区块和 Flutter 布局模型重组。
- 不要把临时 mock 数据直接写在 Widget build 中；先确认接口/model/fixture 边界。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先 props + callbacks。

## 三、页面结构拆分
- <Page>：
- <Body>：
- <Header>：
- <ContentSection>：
- <BottomActions>：

## 四、Flutter Widget 拆分建议
| Widget | 父级 | 职责 | 状态访问 |
| --- | --- | --- | --- |

## 五、状态与交互
### 状态模型
| 状态/能力 | 分类 | Flutter owner 建议 | 迁移建议 |
| --- | --- | --- | --- |

### 生命周期与副作用
| 副作用类型 | 目标 | 迁移建议 |
| --- | --- | --- |

### 交互事件
| 交互类型 | Flutter 建议 | 目标状态/动作 |
| --- | --- | --- |

## 六、路由与参数
| 目标路由来源 | Flutter GetX 建议 |
| --- | --- |

### 页面路由行为
| 行为 | 目标/参数 | Flutter 迁移建议 |
| --- | --- | --- |

## 七、布局模型
| 布局特征 | Flutter 迁移建议 |
| --- | --- |

## 八、主题 Token 映射
### 样式 Token 使用位置
| 样式属性 | Token/硬编码值 | fallback |
| --- | --- | --- |

### Colors
| 样式来源 | Flutter 写法 | 命中情况 |
| --- | --- | --- |

### Typography
| 样式来源 | Flutter 写法 | 命中情况 |
| --- | --- | --- |

### Unresolved
| 样式来源 | Flutter 写法 | 命中情况 |
| --- | --- | --- |

## 九、文案与 i18n
| key | zh_CN | zh_HK | en_US | Flutter 建议 |
| --- | --- | --- | --- | --- |

## 十、资源迁移
| 类型 | 资源线索 | Flutter 建议路径 | 迁移建议 |
| --- | --- | --- | --- |

## 十一、可复用 Flutter 组件
| 场景 | 推荐组件 |
| --- | --- |

## 十二、人工确认项
- [ ] P0：
- [ ] P1：
- [ ] P2：

## 十三、AI 实现提示词
```text
请基于本文档在 YouFi Flutter App 中实现 <页面名> 页面。
目标模块优先放在 lib/app/modules/<module>。
实现时优先复用本文档列出的 common widgets、themeService.colors、themeService.textStyles 和现有翻译体系。
请按 Flutter 页面、Controller、私有 Widget、i18n、资源几个部分拆分实现；不要逐层照搬来源页面结构。
```
```
