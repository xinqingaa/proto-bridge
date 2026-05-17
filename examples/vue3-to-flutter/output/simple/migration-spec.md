# 持仓列表 Flutter 迁移说明书

## 页面元信息
- 目标路由来源：/prototype/asset/holding-list
- screenId：asset.holding-list
- 推荐 Flutter 模块：account
- 推荐实现形态：BaseGetView
- 需求状态：ready
- 维护角色：ProtoBridge Example

## 一、迁移结论
- 页面复杂度：中
- Flutter 实现复杂度：中等
- 页面模式：资产/持仓页
- 模式识别置信度：中
- 建议是否直接实现：可以进入实现
- 主要风险：暂无明显阻塞
- 实现规划：该页面建议拆成父页面、Controller 和若干子 Widget；页面模式识别为资产/持仓页，置信度中；Controller 负责页面级 UI 状态，子 Widget 通过构造参数接收数据并通过回调上报交互。

## 二、Flutter 实现规划
### 目标文件拆分
```text
lib/app/modules/account/asset_holding_list/
├── models/
│   └── asset_holding_list_ui_model.dart
├── widgets/
│   ├── asset_holding_list_asset_summary.dart
│   ├── asset_holding_list_body.dart
│   ├── asset_holding_list_header.dart
│   └── asset_holding_list_position_list.dart
├── asset_holding_list_binding.dart
├── asset_holding_list_controller.dart
└── asset_holding_list_page.dart
```

| 文件 | 职责 | 备注 |
| --- | --- | --- |
| asset_holding_list_page.dart | 父页面入口，绑定 route、Controller、Scaffold/SafeArea，并编排子 Widget。 | 父页面不直接承载复杂业务计算。 |
| asset_holding_list_controller.dart | 管理页面级 UI 状态、路由参数、滚动控制和事件分发。 | 按 UI 状态、业务数据、派生数据重新归类，不要把来源页面临时状态逐项搬迁。 |
| asset_holding_list_binding.dart | 注册 Controller 及必要 service/repository 依赖。 |  |
| widgets/asset_holding_list_body.dart | 按内容顺序组合私有 Widget。 | 内容组合层 |
| widgets/asset_holding_list_header.dart | 优先复用 CommonAppBar 或现有 header pattern。 | 顶部导航/标题区 |
| widgets/asset_holding_list_asset_summary.dart | 展示资产、收益、账户摘要等关键指标。 | 核心摘要区 |
| widgets/asset_holding_list_position_list.dart | 展示持仓或资产明细，确认空态和刷新策略。 | 数据列表 |
| models/asset_holding_list_ui_model.dart | 定义 UI 所需字段模型；真实数据源待业务接口确认后替换 mock。 |  |

### Widget 组合
| Widget | 所属/父级 | 职责 | 输入数据 | 交互回调 | 状态访问建议 |
| --- | --- | --- | --- | --- | --- |
| AssetHoldingListPage | 无，路由页面入口 | 路由页面入口；建议只负责页面级布局和子 Widget 编排。 | 无 / 待确认 | 无 | 页面入口读取 Controller |
| AssetHoldingListBody | AssetHoldingListPage | 内容组合层；按内容顺序组合私有 Widget。 | 列表或区块模型 | onItemTap（点击列表项） | 组合层只订阅必要 Controller 状态 |
| AssetHoldingListHeader | AssetHoldingListPage | 顶部导航/标题区；优先复用 CommonAppBar 或现有 header pattern。 | 行情/页面摘要模型、列表或区块模型 | onBack（返回）、onMore（更多）、onItemTap（点击列表项） | 通过构造参数接收数据 |
| AssetHoldingListAssetSummary | AssetHoldingListBody | 核心摘要区；展示资产、收益、账户摘要等关键指标。 | 列表或区块模型 | onItemTap（点击列表项） | 通过构造参数接收数据 |
| AssetHoldingListPositionList | AssetHoldingListBody | 数据列表；展示持仓或资产明细，确认空态和刷新策略。 | 列表或区块模型 | onItemTap（点击列表项） | 通过构造参数接收数据 |

### 状态管理与数据边界建议
| 关注点 | 建议 owner | 建议 |
| --- | --- | --- |
| 业务数据与 mock 数据 | Repository / UI model | 不要把临时 mock 数组直接写入 Widget；先定义 UI model，再由接口/repository/fixture 填充。 |
| 路由与参数 | Controller | Controller 统一读取路由参数并暴露页面初始状态；子 Widget 只通过回调触发导航。 |
| 生命周期与副作用 | Controller | ScrollController/listener/watch 副作用必须有明确注册和释放位置；默认放 Controller.onInit/onClose，只有依赖首帧布局或滚动定位时再使用 onReady/首帧回调。 |

边界补充：
- AssetHoldingListController：页面编排层 Controller；负责状态组合、生命周期和事件分发，不负责绘制细节。 负责 页面级 UI 状态、路由参数读取、事件分发、滚动/监听生命周期、导航行为；避免 逐层照搬来源页面结构、在 build 中做重计算、让所有子 Widget 直接读整个 Controller。
- AssetHoldingList 数据/图表适配层：将接口或 mock 数据整理成 UI/图表绘制模型。 负责 mock 数据到 UI model 的转换、派生数据和图表序列数据计算、缓存策略；避免 直接依赖 BuildContext、触发导航、持有 Widget 状态。

### 禁止直译项
- 不要把来源页面结构逐层翻译成 Flutter Widget；按业务区块和 Flutter 布局模型重组。
- 不要把临时 mock 数据直接写在 Widget build 中；先确认接口/model/fixture 边界。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先通过构造参数传入数据，并用回调上报交互。
- 不要忽略 fixed/sticky/scroll/safe-area；先确定 Scaffold、Stack、ScrollController/Sliver 的组合。

## 三、状态与交互建议
### 状态模型摘要
| 分类 | 涉及状态/能力 | Flutter 建议 |
| --- | --- | --- |
| 业务数据 / mock 数据 | filters | 先收敛成 UI model，由 Repository、接口或 fixture 填充，不要写进 Widget build。 |

### 生命周期与副作用
| 副作用类型 | 目标 | Flutter 建议 |
| --- | --- | --- |
| 页面初始化 | route query initialization | 优先放在 Controller.onInit；如果依赖首帧尺寸、滚动定位或 BuildContext，再放 onReady/WidgetsBinding.addPostFrameCallback。 |

### 交互事件
| 交互类型 | 涉及目标 | Flutter 建议 |
| --- | --- | --- |
| 点击事件 | store.refreshPage, store.setHoldingFilter(filter), 页面跳转 | 迁移为 Controller 方法或 Widget 回调，并确认路由、弹窗和埋点。 |
| 条件展示 | store.loading | 迁移为 Obx/Visibility/条件渲染，确认默认状态。 |
| 列表渲染 | filter in filters, item in store.filteredHoldings | 迁移为 ListView/Column map，确认数据模型和空态。 |

## 四、路由与布局
### 路由与参数
| 原型 route/query | Flutter GetX 建议 |
| --- | --- |
| /prototype/asset/holding-list | 在 lib/app/routes/app_routes.dart, lib/app/routes/app_pages.dart 中补充或复用路由 |

### 页面路由行为
| 行为 | 目标/参数 | Flutter 迁移建议 |
| --- | --- | --- |
| 页面跳转 | /prototype/asset/pnl-analysis / { source: 'holding-list' } | 映射到 Get.toNamed/AppRoutes，确认 /prototype/asset/pnl-analysis 对应 Flutter route 和参数。 |
| 读取路由参数 | sector | 从 Get.parameters/Get.arguments 读取 sector，确认默认值和来源页面。 |

### 布局模型
| 布局特征 | Flutter 迁移建议 |
| --- | --- |
| 弹性布局 | 迁移为 Row/Column/Flex，确认主轴、间距和对齐。 |
| 网格布局 | 迁移为 GridView/Wrap 或自定义布局。 |
| 间距系统 | 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。 |
| 滚动容器 | 使用 SingleChildScrollView/ListView/CustomScrollView，并保留滚动方向。 |

## 五、CSS 样式到 Flutter 主题映射
### 颜色
| 使用位置 | 变量名 | Flutter 主题 | 色值 |
| --- | --- | --- | --- |
|  |  |  |  |

### 字体
| 使用位置 | 变量名 / mixin | Flutter 文本主题 | 原始样式 |
| --- | --- | --- | --- |
| .summary-card strong 的 字体 |  |  | font-size: 19px |
| .summary-label 的 字体 |  |  | font-size: 12px |
| .rate 的 字体 |  |  | font-size: 12px; font-weight: 700 |
| .filter-chip 的 字体 |  |  | font-size: 13px; font-weight: 700 |
| .list-header h2 的 字体 |  |  | font-size: 17px |
| .list-header span 的 字体 |  |  | font-size: 12px |
| .symbol-block strong, .amount-block strong, .pnl-block strong 的 字体 |  |  | font-size: 15px |
| .symbol-block span, .amount-block span, .pnl-block span 的 字体 |  |  | font-size: 12px |

## 六、文案与 i18n
i18n JSON 未识别出 zh_CN / zh_HK / en_US 文案。

## 七、资源迁移
| 类型 | 资源线索 | Flutter 建议路径 | 迁移建议 |
| --- | --- | --- | --- |
| icon | 图标/图片资源 | assets/images, assets/svg, assets/json | 确认是否已有 CommonSvg/IconFont/本地 asset 可复用。 |

## 八、可复用 Flutter 组件
| 场景 | 推荐组件 |
| --- | --- |
| 通用能力 | CommonAppBar |
| 通用能力 | CommonButton |
| 通用能力 | CommonEmpty |
| 通用能力 | CommonLoading |

## 九、人工确认项
- [ ] 确认静态 mock 数据对应真实接口、Controller 字段或本地状态。
- [ ] 确认页面路由参数、返回行为和埋点是否与 YouFi 现有模块一致。
- [ ] 确认来源资源是否已有 Flutter 侧等价图片或 SVG，可复用时避免重复迁移。
- [ ] P0：确认目标 Flutter route、Binding、Controller 文件位置符合 YouFi 模块规范。
- [ ] P0：确认 UI 首屏结构、颜色、字号、间距和 i18n 文案与原型一致。
- [ ] P0：确认所有跳转目标和参数映射到 Flutter routes。
- [ ] P0：确认 ScrollController/listener/watch 在 dispose/onClose 中释放。
- [ ] P1：确认图片、SVG、icon、暗色模式资源是否复用现有 assets。

## 十、AI 实现提示词
```text
请基于本文档在 YouFi Flutter App 中实现 持仓列表 页面。
目标模块优先放在 lib/app/modules/account。
实现时优先复用本文档列出的 common widgets、themeService.colors、themeService.textStyles 和现有翻译体系。
请按目标文件拆分、Widget 组合、状态建议、路由布局、CSS 样式映射、i18n 和资源几个部分实现；不要逐层照搬来源页面结构。
```

