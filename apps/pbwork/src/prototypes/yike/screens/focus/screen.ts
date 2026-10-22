import { yikeAppearanceEvidence } from "../../appearance-evidence";
import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "focus");

export default defineScreen({
  appearanceEvidence: yikeAppearanceEvidence["focus"],
  slug: "focus",
  fragments: [
    fragment("root", { required: true }),
    fragment("timer", { required: true }),
    fragment("mode-tabs", { required: true }),
    fragment("primary-action", { required: true }),
    fragment("navigation", { required: true }),
    fragment("settings"),
  ],
  prototypeId: "yike",
  label: "专注",
  title: "专注",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  variants: [
    { id: "default", label: "番茄待开始" },
    {
      id: "short-record",
      label: "短时专注记录确认",
      shellPolicy: "replace",
      requiredFragments: [
        scope.ref("short-record-confirm"),
        scope.ref("short-record-confirm.confirm"),
      ],
    },
    {
      id: "countdown-setup",
      label: "倒计时待开始",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("custom"),
        scope.ref("primary-action"),
      ],
    },
    ...[
      {
        id: "custom-duration",
        label: "自定义倒计时",
        panel: "custom-sheet",
        action: "custom-save",
      },
      {
        id: "abandon-confirm",
        label: "放弃确认",
        panel: "abandon-sheet",
        action: "abandon-confirm",
      },
      {
        id: "switch-confirm",
        label: "切模式确认",
        panel: "switch-sheet",
        action: "switch-cancel",
      },
    ].map(({ panel, action, ...variant }) => ({
      ...variant,
      shellPolicy: "replace" as const,
      requiredFragments: [scope.ref(panel), scope.ref(action)],
    })),
    {
      id: "running",
      label: "番茄进行中",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "paused",
      label: "番茄已暂停",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "finished",
      label: "番茄完成",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "countdown-running",
      label: "倒计时进行中",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "countdown-paused",
      label: "倒计时已暂停",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "countdown-due",
      label: "倒计时到点",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
        scope.ref("repeat"),
      ],
    },
    {
      id: "stopwatch-running",
      label: "正计时计圈",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "stopwatch-paused",
      label: "正计时已暂停",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "short-break",
      label: "短休息",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "short-break-paused",
      label: "短休息已暂停",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "short-break-finished",
      label: "短休息结束",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "long-break",
      label: "长休息",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "long-break-paused",
      label: "长休息已暂停",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "long-break-finished",
      label: "长休息结束",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
    {
      id: "recovery",
      label: "中断恢复",
      shellPolicy: "replace",
      requiredFragments: [
        scope.ref("recovery-sheet"),
        scope.ref("recovery-resume"),
      ],
    },
    {
      id: "cross-day",
      label: "跨日记录",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("timer"),
        scope.ref("primary-action"),
      ],
    },
  ],
  actions: [
    {
      id: "confirm-short-record",
      kind: "click",
      target: scope.ref("short-record-confirm.confirm"),
    },
    { id: "start", kind: "click", target: scope.ref("primary-action") },
    { id: "finish", kind: "click", target: scope.ref("finish") },
    { id: "repeat", kind: "click", target: scope.ref("repeat") },
    { id: "lap", kind: "click", target: scope.ref("lap") },
    { id: "settings", kind: "click", target: scope.ref("settings") },
    { id: "custom-save", kind: "click", target: scope.ref("custom-save") },
    {
      id: "abandon-confirm",
      kind: "click",
      target: scope.ref("abandon-confirm"),
    },
    { id: "switch-cancel", kind: "click", target: scope.ref("switch-cancel") },
  ],
  scenarios: [
    ...[
      {
        id: "confirm-short-record",
        label: "确认保存短时专注",
        appearancePolicy: "shared" as const,
        initialVariantId: "short-record",
        actionIds: ["confirm-short-record"],
        variant: "default",
      },
      {
        id: "save-custom-duration",
        label: "确认自定义倒计时",
        appearancePolicy: "shared" as const,
        initialVariantId: "custom-duration",
        actionIds: ["custom-save"],
        variant: "default",
      },
      {
        id: "discard-focus",
        label: "确认放弃回待开始",
        appearancePolicy: "shared" as const,
        initialVariantId: "abandon-confirm",
        actionIds: ["abandon-confirm"],
        variant: "default",
      },
      {
        id: "cancel-mode-switch",
        label: "取消切模式保留会话",
        appearancePolicy: "shared" as const,
        initialVariantId: "switch-confirm",
        actionIds: ["switch-cancel"],
        variant: "paused",
      },
    ].map(({ variant, ...scenario }) => ({
      ...scenario,
      checkpoints: [
        {
          id: "result",
          screenId: scope.screenId,
          variantId: variant,
          requiredFragments: [scope.ref("timer"), scope.ref("primary-action")],
        },
      ],
    })),
    ...[
      {
        id: "pause-focus",
        label: "暂停专注",
        appearancePolicy: "shared" as const,
        initialVariantId: "running",
        actionIds: ["start"],
        variant: "paused",
      },
      {
        id: "record-stopwatch",
        label: "停止并记录正计时",
        appearancePolicy: "shared" as const,
        initialVariantId: "stopwatch-paused",
        actionIds: ["finish"],
        variant: "default",
      },
      {
        id: "repeat-countdown",
        label: "到点按原时长再计一次",
        appearancePolicy: "shared" as const,
        initialVariantId: "countdown-due",
        actionIds: ["repeat"],
        variant: "countdown-running",
      },
      {
        id: "start-break",
        label: "完成后开始休息",
        appearancePolicy: "shared" as const,
        initialVariantId: "finished",
        actionIds: ["start"],
        variant: "short-break",
      },
      {
        id: "lap-stopwatch",
        label: "正计时计圈",
        appearancePolicy: "shared" as const,
        initialVariantId: "stopwatch-running",
        actionIds: ["lap"],
        variant: "stopwatch-running",
      },
    ].map(({ variant, ...scenario }) => ({
      ...scenario,
      checkpoints: [
        {
          id: "result",
          screenId: scope.screenId,
          variantId: variant,
          requiredFragments: [scope.ref("timer"), scope.ref("primary-action")],
        },
      ],
    })),
    {
      id: "start-focus",
      label: "开始一轮专注",
      appearancePolicy: "shared" as const,
      initialVariantId: "default",
      actionIds: ["start"],
      checkpoints: [
        {
          id: "focus-running",
          screenId: "yike.focus",
          variantId: "running",
          requiredFragments: [scope.ref("timer"), scope.ref("primary-action")],
        },
      ],
    },
  ],
  requiredScenarioIds: [
    "confirm-short-record",
    "save-custom-duration",
    "discard-focus",
    "cancel-mode-switch",
    "start-focus",
    "pause-focus",
    "record-stopwatch",
    "repeat-countdown",
    "start-break",
    "lap-stopwatch",
  ],
});
