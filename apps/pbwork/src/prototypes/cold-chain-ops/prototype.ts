import type { PrototypeRecord } from "@/design-system/types";
export default {
  id: "cold-chain-ops",
  label: "冷链异常处置台",
  lifecycle: "active",
  owners: ["冷链运营"],
  roles: ["值守专员", "调度主管"],
  themePackId: "pbwork-base",
  clock: {
    now: "2026-07-28T00:00:00.000Z",
    timeZone: "Asia/Shanghai",
  },
  screenGroups: [
    {
      id: "exception-response",
      label: "异常处置",
      screenSlugs: ["exception-queue", "shipment-detail", "resolution-form"],
    },
  ],
} satisfies PrototypeRecord;
