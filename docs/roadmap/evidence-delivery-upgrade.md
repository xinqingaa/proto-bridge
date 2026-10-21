# 产品文档与动效证据交付优化计划

状态：部分实施，已完成 M1 中的驼峰身份修复；错误码与重复错误归并仍待实施。更新日期：2026-10-21。

本计划解决两类平台问题：业务稳定标识与现行小写校验冲突导致采集失败，以及固定交付只传递页面与交互结果，缺少产品规则和真实动效过程。目标是让独立 Target 工程中的 Agent 仅凭固定 Handoff，就能自动发现并按需读取产品文档、稳定页面证据和动效证据。

本文中的字段、Tool 名称、门禁和预算均为目标设计，不代表现行 Contract。平台实施进度仅在本文维护；业务原型的补全文档、修复与验收进度由其自身 docs 管理。

## 制定时基线与问题

| 已核实基线 | 对应问题 | 源码入口 |
| --- | --- | --- |
| PbId 与 PbKey 复用全小写标识规则 | 驼峰业务字段参与身份拼接后被拒绝 | [ids.ts](../../packages/core/src/v2/contracts/ids.ts) |
| 原型元数据无产品文档声明，Runtime 未载入产品 Markdown | 原文存在于 Producer 仓库，但 Handoff 消费者无法自动发现 | [types.ts](../../apps/pbwork/src/design-system/types.ts)、[capture-protocol.ts](../../apps/pbwork/src/runtime/capture-protocol.ts) |
| Capture 强制减少动态效果并清零 CSS 动画与过渡时长 | 采集主动压制正常动效 | [playwright-driver.ts](../../packages/core/src/v2/capture/playwright-driver.ts) |
| Runtime 在多处等待有限动画结束 | 单独取消动画压制，最终仍主要得到结束状态 | [RuntimeLayout.vue](../../apps/pbwork/src/runtime/RuntimeLayout.vue)、[capture-protocol.ts](../../apps/pbwork/src/runtime/capture-protocol.ts) |
| Scenario action 目前只支持 click，Runtime 调用元素 click 方法 | 无法完整观测按下与释放过程 | [protocol.ts](../../packages/core/src/v2/runtime-contract/protocol.ts)、[capture-protocol.ts](../../apps/pbwork/src/runtime/capture-protocol.ts) |
| Blob 与消费入口围绕截图、主题资产和调试附件构建 | 没有正式的动效时间轴、过程图像及按需读取入口 | [blob.ts](../../packages/core/src/v2/contracts/blob.ts)、[read-evidence.ts](../../packages/mcp-server/src/tools/read-evidence.ts) |

现行语义与固定引用边界仍以 [Evidence 模型](../architecture/evidence-model.md)、[采集链路](../architecture/capture-pipeline.md)和[语义标记规范](../reference/semantic-authoring.md)为准。

## 交付目标与范围

### 用户完成一次定稿后得到什么

1. 同一业务身份可直接使用驼峰，不需要为了采集维护平行字段映射。
2. PBWork 可以浏览当前产品文档；定稿后可查看本次交付固定的文档版本。
3. 定稿自动采集声明范围内的状态、截图、动作和动效片段，分别报告完整度。
4. Handoff 固定产品文档、页面 revision、动效片段及其资产；后续源码或文档变化不改变历史读取结果。
5. 独立 Target 工程的 Agent 自动发现这些入口，按页面读取相关章节、过程关键帧和动画参数，无需用户再次粘贴产品文档。
6. 缺失、失败、未采集、无可用观测以及冲突都有明确状态；产品文档的声明不会被算作运行时验证通过。

### 本轮主线与后续探索

主线包括语义身份规范、Markdown 文档快照、真实动效观测、过程图像、固定存储、PBWork 预览、MCP 消费、版本兼容和独立工程验证。动画过程采集是主线，不能缩减为只编写动效文档。

后续探索包括全文或向量检索、从任意 JavaScript 反推动画算法、自动推导产品意图、所有视口主题组合的全量录屏、自动跨平台像素或动效评分。视频编码与播放可以后补，带时间戳的图像序列和 MCP 图片读取属于首轮必交付能力。

## 总体架构与职责

```text
作者资产
  产品 Markdown、原型与组件、主题参数、动作与动效片段声明
        ↓
Runtime Manifest
  文档输入、状态准备、动作目标、观察范围、required boundary
        ↓
Core Preflight
  固定摘要、环境、策略、预算、Case 和动效片段清单
        ↓
Core 与 Playwright
  准备状态 → 启动观测 → 执行动作或推进时间 → 采样 → 校验结果
        ↓
Store
  文档 Catalog、页面 revision、动效记录、图像 Blob、Coverage 与 Issue
        ↓
Snapshot 与 Handoff
  固定全部可达引用
        ↓
PBWork 预览与 MCP 按需读取
        ↓
独立 Target 工程中的 Agent
```

| 模块 | 本轮职责 |
| --- | --- |
| Core | 所有公共 Schema、身份与引用规则、策略归一化、完整度、风险、固定读模型 |
| PBWork Runtime | 声明文档与动效片段，准备状态，提供节点身份和必要的观测配合 |
| Playwright Driver | 隔离环境、真实指针动作、时间推进、动画观测、图像采样、结束状态校验 |
| Store | 不可变版本、资产归属、原子暂存与提交、固定可达性、容量与清理 |
| Local Service 与 CLI | 调用同一 Core 流程、传输产物与报告，不复制策略算法 |
| PBWork Workbench | 作者文档与固定文档预览、动效时间轴、任务进度和缺口展示 |
| MCP | 只读取固定 Handoff 的文档、动效记录和图像，不打开任意源文件路径 |
| Target 工程 | 自主管理架构、组件与实现；其事实不写回 Source Evidence |

## 一 语义身份兼容与采集阻塞修复

### 规则选择

- 为 PbId 与 PbKey 建立独立的语义身份校验，不直接放宽所有资源 ID 共用的 STABLE_ID_PATTERN。
- PbId 保留字母开头及现有结构分隔符，增加内部大写字母支持，兼容 lowerCamelCase。
- PbKey 接受同类驼峰业务 key；不增加裸 UUID 的特殊接受规则。原型后续确需将数字开头实体 ID 用作 key 时，在创建源头增加稳定业务前缀即可。
- 大小写敏感，原值贯穿 DOM、Fragment、祖先引用、Scenario、scope hash 和 MCP；禁止自动转小写。
- 继续拒绝纯数字下标、空白、CSS selector、DOM path 和不允许的分隔符。每次渲染重新生成身份仍不合规；正则只能检查语法，实体生命周期稳定性通过作者规则和针对性测试证明。
- 不修改现有 Case ID 算法，不重命名历史 key；既有全小写标识继续可读。

### 实施与验收

检查所有身份使用点，特别是 expectedFragmentKeys、动作目标、结构断言、semanticParent 和 semanticAncestors，避免主 Fragment 已放宽、关联字段仍使用旧 StableId。PBWork Registry 与 Runtime 复用 Core 校验。

错误消息按 Screen、Variant、Fragment、收到的值归并，避免祖先引用重复展开几十条相同原因；错误分类使用稳定 code，不依赖英文错误字符串。失败操作的来源与已交付 Receipt 来源分开展示，避免把来源未知呈现成故障原因。

退出标准：驼峰与大小写不同的两个 key 通过 Runtime 与采集链路；非法 selector 与下标仍被拒绝；旧标识的 Fragment 引用和 scope digest 不变。列表采集验证稳定样例 item，不以执行新建业务流程作为样式采集的前置。

## 二 产品文档快照与自动发现

### 作者输入与预览

首版支持显式登记的 UTF-8 Markdown。建议文档描述包含 documentId、kind、title、prototypeId、sourcePath、required、可选 screenIds；其中 kind 区分产品说明与动效意图说明。作者来源限定在登记的原型文档根目录内，校验 realpath 和相对资源可达性，不把任意磁盘读取暴露给 Runtime 或 MCP。

PBWork 用同一加载器提供预览与 Manifest 输入。制作阶段读取当前作者文件，定稿后读取固定文档修订；UI 明确区分两者。首版展示正文、章节目录、缺失链接与版本摘要；本地关联文档或图片要么显式登记并固定，要么报告无法离线到达，不保留指向开发机当前文件的隐式依赖。

### 存储选择

新增有类型约束的 document Catalog。小型 Markdown 原文直接保存在 Catalog 条目中，包含内容摘要、来源相对路径、格式、登记元数据与派生章节目录；Handoff 只持固定引用，不嵌入全文。来源绝对路径和 Store 布局不进入 Handoff 公共面。

文档源文件不复制到 Target 形成第二份权威文本。只登记路径不足以作为交付；Target Agent 不通过来源路径重读当前文件。首版不建设搜索服务，也不把文档文本转换为未经验证的运行时 Fact。

### 固定与失效

- Preflight 固定登记表、原文和依赖摘要；预检后内容变化使确认结果失效。
- 文档 Catalog 独立版本化；文档变化产生新修订和新的 Snapshot 关联，旧 Handoff 始终读取原文旧版本。
- 文档变化触发交付新鲜度重评估。仅当显式依赖证明页面输入未变时才复用页面 revision；无法判断业务影响时保守标记相关范围 stale，不通过启发式判断把变更当成纯文字修正。
- required 文档缺失、不可读或无法固定时阻止正式完整交付；可选文档缺失保持可见缺口。

退出标准：源码文档被修改、移动或删除后，已有 Handoff 仍可按章节和全文读取旧内容；定稿预览显示相同摘要；目标工程完全不读取 Producer 文档路径也能消费产品规则。

## 三 真实动效采集

### 采集策略

新增由 Core 定义并由 Preflight 固定的策略。新动效流程使用正常运动偏好 no-preference，不注入全局时长清零样式。减少动态效果作为显式的伴随 profile 采集，不能冒充正常运动环境。

一次采集同时产生过程证据与结束状态证据。最终截图在有限过渡结束或指定时间点读取；持续运行的动画按固定观察窗口采样，不等待整页完全静止。旧流程只用于旧输入兼容或明确声明的静态范围，不能被算为完成新动效要求。

profile、观察窗口、采样策略及环境差异写入作用域和输入摘要。新 scopeKey 与覆盖比较采用版本化规则：缺少新字段的历史输入沿用旧摘要算法；禁止给历史 scope 隐式补默认值后改写其 hash。不同运动 profile 的结果不可静默覆盖或互相满足要求。复用现有 Case identity，片段拥有独立 identity 与环境记录。

### 动效片段声明

建议 Runtime 声明 MotionSegment：稳定 segmentId、所属 Screen 与 Case/Scenario、前置状态、触发动作或时间偏移、目标 Fragment、有限或持续类型、观察窗口、结果 checkpoint、required 标记、需要的主题/profile。登记来自实际产品路径，不为测试创建业务外入口。

声明负责指出应观察什么；浏览器观测负责说明实际上发生了什么。系统可以发现未登记的动画并提示遗漏，但发现列表不是全局完整性证明。未被访问的路径、无法绑定身份的节点和不支持的渲染方式保留 unknown 或 unsupported。

### 观测时序

1. 建立隔离上下文，固定 viewport、主题、fixture、时区、初始业务时钟和实际采集 profile。
2. 完成前置状态准备，等待字体与必要节点可用。
3. 在动作前安装观测器，记录动作之前的画面和语义状态；跨页面导航时保证新 document 的观测也在业务代码之前安装。
4. 由 Core/Playwright 基于稳定 Fragment 执行真实指针按下、保持、释放或点击序列；Runtime 验证动作归属和前后维度。保留协议调用的兼容语义，不能把合成 click 伪装成已观测到完整按压过程。
5. 同时记录浏览器可识别的动画信息与画面序列，使用相对于片段起点的时间戳。
6. 对有限动画等待结束并设置上限；对持续动画运行声明窗口后停止观测。分离 observe、settle 与 snapshot 阶段，避免 waitForStable 在过程采样之前消费掉动画。
7. 校验结束状态与 checkpoint，保存最终截图和语义节点。暂停或冻结只用于确定采样点，不得偷偷改变业务结果。

### 两类动效的证据

| 类型 | 首轮采集内容 | 不能据此推断 |
| --- | --- | --- |
| CSS Animation、Transition、Web Animations | 被观测实例的目标 Fragment、keyframes、duration、delay、easing、iterations、播放方向和起止时间 | 未触发路径的行为与用户意图 |
| JavaScript、requestAnimationFrame、SVG 属性驱动 | 触发记录、带时间戳的图像、必要的有界属性采样、结束状态 | 任意算法、精确 easing 或所有内部状态 |

动画目标为内部元素时，关联最近可证明的语义 Fragment，并保留局部观测定位信息；临时 DOM 路径不升级为稳定公共身份。无法归属的观测不强行挂到猜测节点。

### 时间控制与可行性验证

先以真实执行验证业务 Date、timer、requestAnimationFrame 与 CSS 合成动画的时钟关系。受控推进使用逐段执行，不能用跳过回调的快速跳时替代真实过程。记录计划采样时间与实际采样时间；截图命令执行延迟不能被当成动画自身时间。

首轮试验比较两种实现：可控虚拟时间加确定采样点，以及真实时间记录加准确时间戳。优先采用被浏览器实验验证可重复的方式。视频可以使用真实时间回放，但不得与虚拟业务时间混用而不标注。某类渲染无法统一控制时明确降低时间精度并披露，不承诺所有动画逐帧完全确定。

### 资源预算

工程试验初始预算为每个有限片段最多 3 秒、持续片段最多 5 秒、最多 60 张保存帧、每片段最多 20 MiB；这些数值需在首轮试验后确定，不是现行配置。收集高频观测后按时间和变化选帧，保留起点、变化关键时刻与终点；压缩或去重后仍保留原始时间索引。

长周期动效通过声明接近边界的前置状态观察，不为等待一分钟反馈录满一分钟。受限采样不能宣称无损复现；是否足够覆盖声明目标必须单独报告。超过预算时报告容量或采样不足，不能静默截断为完整。

## 四 固定存储与完整度

新增 MotionCaptureRecord 及正式 motion-frame Blob 类型。记录固定 segmentId、case/revision 关联、profile、观测时间、触发动作、动画参数、帧清单与摘要、结束状态和观测限制。视频如后续引入，拥有独立 kind 与资产身份，不借用 debug/trace。

文档完整度、静态 Case Coverage、动效片段完整度分别计数。建议动效状态覆盖 captured、failed、cancelled、unsupported、not-selected；未声明必需范围的旧数据标记为未提供动效覆盖信息，不能推导为完整。

required 动效记录或必要帧写入失败，应使该动效交付要求失败。静态证据可以保留，但正式完整交付不能因此通过。现行可选调试资产失败后删除重试的逻辑不能应用到 required 动效产物；debugPolicy=false 也不能过滤正式 motion-frame。

动效和帧通过 Case staging、Blob 写入、Run/Snapshot 提交进入同一可追溯事务。中断恢复只采用完整且摘要可校验的暂存产物；残缺记录不能进入 active 可用结果。固定 Snapshot 之外的资产、跨 Workspace 引用和摘要不符均确定性失败。

动效失败不得降级覆盖先前可用 revision；单片段失败重试复用已成功固定结果的前提是输入与依赖完全一致。资产清理遵循历史 Handoff 与 Snapshot 可达性。

## 五 PBWork 与 MCP 消费闭环

### PBWork

在现有原型详情与 Evidence Review 上扩展产品文档和动效入口，继续使用 Workbench 组件。动效详情按片段展示触发、时间轴、关键帧、观测参数、最终截图与缺口；可播放图像序列，无需等待视频编码能力。

定稿流程仍是 review 到 final 的统一自动流程，由已登记内容产生采集范围。新增文档和动效阶段进度与失败分组，不增加手动 Screen/Fragment 采集按钮，不绕过 warning/risk 逐项确认，也不在普通浏览入口增加阻断检查。

### MCP

以下为拟新增或扩展的消费面，具体命名在 Contract 阶段固定：

| 入口 | 返回内容 |
| --- | --- |
| read_handoff_index 扩展 | 文档目录、固定修订摘要、动效计数、必需能力和缺口，不展开全文与全部帧 |
| read_screen_packet 扩展 | 本 Screen 显式绑定的文档章节与动效片段索引 |
| read_product_document | 按 handoffId、documentId 和可选章节读取固定原文；完整文本过长时使用稳定 continuation |
| read_motion_capture | 按 handoffId、segmentId 读取时间轴、参数、起止状态、帧索引和局限；按需分页 |
| read_motion_frame | 按固定片段与 frameId 返回真正的 MCP ImageContent，同时返回时间戳和固定引用 |

专用 Tool 是投影入口，不重新开放整份 Catalog/Store 读取。Agent 无需直接理解底层资产目录。连续查询固定到同一片段与查询参数，不能在分页中混入新版本。

### Agent 的读取与验证

生成提示词、Consumer Guide 和脚手架中的消费规则统一更新。进入 Target 后先读取工程约束与固定 Handoff，读取公共产品规则，再按 Screen 读取相关章节、截图和动效关键帧。避免每页重复注入整本文档或所有帧。

产品文档说明业务要求，静态截图证明某时刻画面，动效记录证明所观察过程；发生冲突保留双方来源并报告。文档声明不能升级为 observed。Target 工程规范只决定落点，不覆盖源业务要求。

动效复查接入现有 states/interactions 的适用义务与视觉检查，保持五维框架。Source 已采集不等于 Target 已还原；缺少 Target 实际运行依据时保持 unverified，不由 Agent 自报参数等同于视觉验收通过。

## 六 兼容与发布

- Producer、Runtime、Local Service、CLI、Store Reader 与 MCP 作为兼容批次发布，增加明确 capability 和必要的 Contract 版本。
- 在静态约定升级之前先验证旧 Store golden fixtures。新 Reader 继续读旧数据；旧 Handoff 不补造文档或动效产物，不回退当前文件、active 或 latest。
- 旧 Consumer 遇到 required 新能力时在实施前返回 incompatible-consumer-capability，不能静默忽略动效或产品文档。
- 旧静态 scope 与新正常动效 scope 的比较必须考虑 profile 和新要求；不能因 Case 相同便复用旧图像。
- Schema 与作用域变化同步 DS surface fingerprint 和 Target drift 状态。不同步的旧 Target 显式报告 drift，不将基线重置当成自动兼容。
- 正式定稿历史保持不可变。新能力接入后的新交付产生新固定引用；撤回与重做继续走现有生命周期，不删除历史来获得测试通过。

## 七 交付批次与目标投入

按一名熟悉仓库的工程师、已有开发环境可用估算平台投入 18–27 个有效人日；业务原型整改与验收另计。实际日历取决于时间控制实验结果和全产品回归，第一批完成后修订，不以估算替代退出标准。

| 批次 | 工作与产物 | 依赖 | 估算 | 退出标准 |
| --- | --- | --- | --- | --- |
| M0 Contract 与采样试验 | 身份规则、文档/动效模型草案；CSS、JS/SVG、导航、真实指针四类最小试验；容量与采样精度实测 | 无 | 2–3 人日 | 证明真实动画可被采到且能固定读取；明确不可支持边界与预算 |
| M1 身份修复 | Core 语义 ID、关联字段、错误 code/归并、Registry 与 Runtime、兼容测试 | M0 身份决策 | 1–2 人日 | 驼峰采集链路通过，旧引用与 digest 不变 |
| M2 产品文档纵向闭环 | 文档声明、加载与预览、Catalog、输入摘要、Handoff 索引、MCP 原文读取 | M0 文档模型 | 3–4 人日 | 独立 Target 无需源路径即可读固定文档，源文件删除不影响旧交付 |
| M3 动效采集与存储 | 策略、真实动作、观测阶段、采样、记录与 Blob、Coverage、staging 与恢复 | M0 试验、M1 | 5–8 人日 | CSS 与 JS/SVG 都有过程图像；required 失败不被静态成功掩盖 |
| M4 动效浏览与消费 | PBWork 时间轴、MCP 参数与 ImageContent、固定读取、提示词与消费纪律 | M2、M3 | 3–4 人日 | Agent 能定位动作、查看关键帧及结束状态，长结果按需分页 |
| M5 版本兼容与故障回归 | 旧 Store、旧 Handoff、能力不匹配、scope、取消、IO、跨文档导航、容量门禁 | M1–M4 | 2–3 人日 | 历史读取不变，失败保留风险，未出现静默复用或覆盖 |
| M6 产品级验证与文档收口 | 独立 Target 消费测试、消费契约与全产品验证、权威文档/Skill/模板同步 | M5 | 2–3 人日 | 下列端到端标准全部满足，实际执行结果可核对 |

M2 与 M3 在模型稳定后可交错推进；M4 必须建立在二者真实产物上。每批提交应包含实现、范围测试和对应当前文档；不能把只完成 Schema 计为能力交付。

## 八 验证矩阵

| 范围 | 必须验证的结果 |
| --- | --- |
| 身份 | 驼峰可用；大小写不同不合并；非法路径/selector/下标仍拒绝；旧 hash 不漂移 |
| 文档 | required 缺失阻断；预检后修改失效；历史原文可读；关联资产缺口可见；不跨原型串读 |
| CSS 与 Web Animations | 短动画在观测开始后触发；参数、起止时间和过程图像均存在 |
| JS 与 SVG | 不依赖 getAnimations 也能看到属性驱动的画面变化；未证明的算法保持 unknown |
| 动作 | pointerdown、保持、pointerup 与 click 时序可区分；业务动作不重复执行 |
| 时间 | 秒、分钟、完成边界；无限循环有界结束；计划和实际采样时间可核查 |
| 状态 | 动效播放后 checkpoint 正确；最终截图与语义快照对应同一稳定状态或声明时刻 |
| 可达性 | 跨 Workspace、越权 Blob、错误摘要、错误片段与过期 continuation 均被拒绝 |
| 故障 | required 帧写入失败、取消、中断、容量超限不形成完整交付，不抹掉旧可用结果 |
| 历史 | 新 Reader 读旧交付；旧 Consumer 拒绝 required 新能力；同 Case 不同 profile 不误复用 |
| 消费 | Target 当前目录与 Producer 分离，Agent 不获源文档路径也可读产品与动效证据 |

实现验证按模块运行 Core、PBWork、Store 与 MCP 范围测试；浏览器测试覆盖动效与稳定快照；最终运行 pnpm consumer-contract:verify、pnpm docs:verify、pnpm ds:target-sync:verify 和 pnpm verify。范围测试通过后只因新变更或失败扩大验证，不在每次画面迭代重复全仓回归。

## 九 文档同步与完成定义

| 公共面变化 | 同步权威来源 |
| --- | --- |
| 语义身份与门禁 | semantic-authoring、prototype-authoring、相关 Skill、PBWork checklist、错误与 Runtime tests |
| 文档与动效对象、资产可达性 | evidence-model、Core README、Schema 与 Store tests |
| 采集策略、动作、时间控制 | capture-pipeline、Runtime Authoring Contract、配置参考、CLI/Service 文档 |
| MCP Tool 与提示词 | MCP README、agent-consumption、Core Prompt Assets、脚手架 Consumer 规则 |
| PBWork 预览与定稿流程 | pbwork 架构、Workbench reference、相关操作手册 |
| DS 或公共手势变化 | 组件 Contract、Registry、组件手册、测试、Target sync 状态 |

完整交付要求：原始身份失败已解决；required 文档和动效都能固定读取；PBWork 与 Agent 看到同一版本；真实过程与最终状态都有证据；未验证边界明确；历史兼容、故障路径和产品回归通过。不能以“加了开关”“保存了视频”或“补了文档”单独宣布完成。

若投入受限，按视频编码/播放器、自动未登记动效发现、更多主题视口组合、更丰富属性分析的顺序缩减。保留语义身份修复、固定文档、声明范围内的真实过程图像、MCP 可见性、失败诚实性和历史兼容。

## 执行状态

2026-10-21 一刻整原型预检失败来自表盘说明随主题改绑 Token，不属于本计划的身份规则或错误归并。修复与进度只记在 yike 交付计划。

- [ ] M0 Contract 与采样试验
- [ ] M1 身份修复：驼峰语法、关联 key 校验及旧 scope 摘要回归已完成；错误码与重复错误归并仍待实施
- [ ] M2 产品文档纵向闭环
- [ ] M3 动效采集与存储
- [ ] M4 动效浏览与消费
- [ ] M5 版本兼容与故障回归
- [ ] M6 产品级验证与文档收口
