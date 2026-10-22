import type { RuntimeAppearanceEvidence } from "@proto-bridge/core/v2/runtime-contract";

type Rule = RuntimeAppearanceEvidence["rules"][number];
const namedThemeSamples: Rule["observations"] = [
  { theme: "water", mode: "light" },
  { theme: "sundial", mode: "light" },
];
const waterInkSamples: Rule["observations"] = [
  ...namedThemeSamples,
  { theme: "water", mode: "dark" },
];
const calendarSamples: Rule["observations"] = [
  ...waterInkSamples,
  { theme: "sundial", mode: "dark" },
];
const everyAppearance: Rule["observations"] = [
  { theme: "mechanical", mode: "light" },
  { theme: "mechanical", mode: "dark" },
  ...calendarSamples,
];

function usage(
  ruleId: string,
  variantIds: string[],
  representativeVariantIds: string[],
  rationale: string,
  options: {
    scenarioIds?: string[];
    observations?: Rule["observations"];
  } = {},
): Rule {
  return {
    ruleId,
    variantIds,
    scenarioIds: options.scenarioIds ?? [],
    dimensions: ["structure", "components", "bindings", "resources", "layout"],
    representativeVariantIds,
    observations: options.observations ?? namedThemeSamples,
    rationale,
  };
}

/**
 * Authored prototype usage families, not DS equivalence or pixel assertions.
 * New states are deliberately not opted in by array expansion. Their local
 * appearance matrix remains exhaustive until their usage has been reviewed.
 */
export const yikeAppearanceEvidence = {
  focus: {
    rules: [
      usage(
        "pomodoro-dial",
        ["default", "running", "paused", "finished"],
        ["running", "paused", "finished"],
        "FocusPanel 的 timer、round、primary-action 使用同一番茄组合。基准逐状态保留读数、动作及绑定；代表态覆盖表盘部分/完整进度、暂停/完成、轮次与最长完成按钮。命名主题样本证明各表盘几何、字号及 round-marker 形状；水位深色补非休息文字绑定。其它浅深差异从固定 Token/资源表取值，未观测像素不作等价声明。",
        {
          observations: waterInkSamples,
          scenarioIds: [
            "confirm-short-record",
            "discard-focus",
            "cancel-mode-switch",
            "pause-focus",
            "start-focus",
          ],
        },
      ),
      usage(
        "countdown-dial",
        ["countdown-setup", "countdown-running", "countdown-paused", "countdown-due"],
        ["countdown-setup", "countdown-due"],
        "倒计时固定使用 session 刻度及已登记的机械 sessionAsset，实例 timer 的 fraction/digits/tone 随状态变化。基准保留每个状态和自定义时长保存结果；样本覆盖预设按钮布局、session 资源选择、到点再计按钮及水位非休息深色文字绑定，资源的模式取值来自固定主题表；不复用番茄模式的数值或实测 bbox。",
        { observations: waterInkSamples, scenarioIds: ["save-custom-duration", "repeat-countdown"] },
      ),
      usage(
        "stopwatch-laps",
        ["stopwatch-running", "stopwatch-paused", "cross-day"],
        ["stopwatch-running"],
        "正计时使用 hour 表盘、lap-scroll 和 laps 的相同组合；运行样本含已完成圈与当前圈，并实际观察水位深色非休息文字绑定。基准逐项保留暂停/跨日及 lap-stopwatch 的真实圈数和状态。主题仅替换表盘几何、round 图形与固定字阶/绘制值，计圈数不由主题控制。",
        { observations: waterInkSamples, scenarioIds: ["lap-stopwatch"] },
      ),
      usage(
        "break-dial",
        [
          "short-break", "short-break-paused", "short-break-finished",
          "long-break", "long-break-paused", "long-break-finished",
        ],
        ["long-break-finished"],
        "短/长休息都把 timer.tone 固定为 break，区别为固定业务时长、阶段文案和动作状态；这些值逐状态保留。最长完成文案的长休息样本覆盖休息图层、轮次和操作组合。水位深色另外观察 break 使用 on-surface 的绑定分支，不能沿用非休息的深色墨色。",
        { observations: waterInkSamples, scenarioIds: ["start-break"] },
      ),
      usage(
        "focus-overlays",
        ["short-record", "custom-duration", "abandon-confirm", "switch-confirm", "recovery"],
        ["short-record", "custom-duration", "recovery"],
        "基准保留每个 Overlay 的真实文案、动作、状态和节点。代表态分别覆盖 ConfirmDialog 的记录确认、BottomSheet 三列秒精度 WheelPicker、恢复面板的多操作布局；放弃/切模式确认沿用相同 ConfirmDialog 公开组合。命名主题观察圆角、字体和背景页表盘与弹层的组合，水位深色同时补背景页表盘墨色分支，其余浅深绘制由各实例固定绑定和主题表派生。",
        { observations: waterInkSamples },
      ),
    ],
  },
  checkin: {
    rules: [
      usage(
        "habit-week-cards",
        ["default", "partial", "completed"],
        ["partial"],
        "habit-list 内 YikeHabitCard 的实例和业务 key 逐状态保留。partial 同时包含已完成/未完成习惯及历史/今天/未来日期，覆盖机械 on-primary 按钮、water 水滴、sundial 印章和日期绑定分支；completed 只改变相同组合的完成数量和文案。没有静态 Toast 等价态的 checkin-today 不纳入此规则。",
      ),
      usage(
        "empty-habit-list",
        ["empty", "archived"],
        ["archived"],
        "无活动习惯的页面使用同一个空列表组合；基准保留没有习惯与只有归档的业务差别。archived 样本覆盖归档入口、最长空态提示及创建操作在命名主题下的布局；未打开的归档弹层不由本规则推断。",
      ),
    ],
  },
  "habit-detail": {
    rules: [
      usage(
        "habit-year-detail",
        ["default", "habit-records", "weekly", "archived-detail"],
        ["habit-records", "weekly"],
        "详情的 name、year/Heatmap、统计和管理动作保持相同实例组合。habit-records 与 weekly 覆盖有记录的年度图、每日/每周目标和不同长度标题，命名主题样本证明圆点/方点与排版。归档状态只改变基准中已保留的管理动作文字及业务值，不复制其它状态的年度记录。",
      ),
      usage(
        "missing-habit",
        ["missing"],
        ["missing"],
        "不存在的习惯是独立的 missing/return 组合，不能借用正常详情图；每个命名主题观察这一局部空态组合，模式绘制值由它的固定绑定派生。",
      ),
    ],
  },
  "habit-editor": {
    rules: [
      usage(
        "habit-form",
        ["default", "edit", "invalid-name"],
        ["edit", "invalid-name"],
        "form 的 TextField、选项及保存按钮复用相同公开组件组合，基准各自保留 draft、编辑身份和错误事实。样本覆盖填有名称的编辑布局与 error 提示布局，不能从空表单推断错误态；模式变化只解析各实例绑定，保存/取消场景跨页终态不在本规则内。",
      ),
    ],
  },
  launch: {
    rules: [
      usage(
        "brand-composition",
        ["default"],
        ["default"],
        "启动页的 object/name/promise/privacy 是固定组合；命名主题样本证明已登记品牌资源在此页的尺寸和字体排版，浅深资源身份及绘制值从固定主题表读取，不重复归档 SVG 或声明未实拍的像素。",
      ),
    ],
  },
  review: {
    rules: [
      usage(
        "week-summary",
        ["default", "only-checkins", "only-focus", "with-records", "history"],
        ["default", "with-records", "history"],
        "周回顾的 duration/counts、summary dial 和 YikeWeekChart 组合相同；基准保存每种数据来源、数值、日期和翻阅动作。样本覆盖零记录、混合记录、历史周期，证明主题专属柱形/水管/日影图形和统计字号，不用空图代替有值图。",
        { scenarioIds: ["browse-history"] },
      ),
      usage(
        "month-intensities",
        ["month", "intensity-levels"],
        ["intensity-levels"],
        "月图使用相同 YikeMonthCalendar 实例；intensity-levels 同图覆盖 none/low/medium/high 及未来日期。每个命名主题和 water/sundial 深色实际观察 numberColor 的对比度选键、submerged-number 节点、裁切和透明度绑定；基准保留各天实际分钟数，不能按全局 primary key 推断数字颜色。",
        { observations: calendarSamples },
      ),
      usage(
        "day-record-overlay",
        ["day-detail"],
        ["day-detail"],
        "日详情的 BottomSheet、日期操作、专注与习惯记录及背后的选中月图独立采样。water/sundial 深色补日历选键与水下数字；Overlay 的实例/props/状态来自各自基准，不从月图样本补造弹层。关闭日详情后的选中月图没有静态等价态，browse-day-records 保持完整外观采集。",
        { observations: calendarSamples },
      ),
    ],
  },
  settings: {
    rules: [
      usage(
        "theme-preference-selection",
        ["default"],
        ["default"],
        "主题/模式偏好本身是设置页业务状态；每种组合独立准备，实际观察 face/mode 选中项、主题预览资源、配置和布局，不能只切渲染主题复用旧选择。",
        { observations: everyAppearance },
      ),
      usage(
        "settings-overlays",
        ["record-threshold", "threshold-custom", "configuration-open", "reset-confirm"],
        ["threshold-custom", "configuration-open", "reset-confirm"],
        "基准逐项保留阈值选项/自定义秒值、配置草稿和重置动作。样本覆盖多步 Sheet 的三列 WheelPicker、配置表单和重置确认，并在每种外观独立准备，真实保留弹层背后的主题/模式选择事实。阈值选项页复用同一多步 Sheet 的公开组合；跨页 reset-data 不在本规则内。",
        { observations: everyAppearance },
      ),
    ],
  },
} satisfies Record<string, RuntimeAppearanceEvidence>;
