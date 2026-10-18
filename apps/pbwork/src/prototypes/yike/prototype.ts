import type { PrototypeRecord } from "@/design-system/types";

export default {
  id: "yike",
  label: "一刻",
  lifecycle: "active",
  owners: ["一刻产品"],
  roles: ["日常使用者"],
  themePackId: "yike",
  clock: {
    now: "2026-10-16T10:24:00.000+08:00",
    timeZone: "Asia/Shanghai",
  },
  screenGroups: [
    {
      id: "core",
      label: "核心页面",
      screenSlugs: ["focus", "checkin", "review"],
    },
  ],
} satisfies PrototypeRecord;
