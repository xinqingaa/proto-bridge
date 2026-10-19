import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "focus");

export default defineScreen({
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
    { id: "start", kind: "click", target: scope.ref("primary-action") },
    { id: "finish", kind: "click", target: scope.ref("finish") },
    { id: "append", kind: "click", target: scope.ref("append") },
    { id: "lap", kind: "click", target: scope.ref("lap") },
    { id: "settings", kind: "click", target: scope.ref("settings") },
  ],
  scenarios: [
    ...[
      {
        id: "pause-focus",
        label: "暂停专注",
        initialVariantId: "running",
        actionIds: ["start"],
        variant: "paused",
      },
      {
        id: "record-stopwatch",
        label: "停止并记录正计时",
        initialVariantId: "stopwatch-paused",
        actionIds: ["finish"],
        variant: "default",
      },
      {
        id: "append-countdown",
        label: "到点追加一分钟",
        initialVariantId: "countdown-due",
        actionIds: ["append"],
        variant: "countdown-running",
      },
      {
        id: "start-break",
        label: "完成后开始休息",
        initialVariantId: "finished",
        actionIds: ["start"],
        variant: "short-break",
      },
      {
        id: "lap-stopwatch",
        label: "正计时计圈",
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
    "start-focus",
    "pause-focus",
    "record-stopwatch",
    "append-countdown",
    "start-break",
    "lap-stopwatch",
  ],
});
