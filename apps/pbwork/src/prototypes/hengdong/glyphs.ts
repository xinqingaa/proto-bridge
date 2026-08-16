import type { PbIconName } from "@/design-system/components/_shared/icons";
import type { ActivityType, FitnessPlan, PlanGoal, WorkoutRecord } from "./model";

export const activityIcons: Record<ActivityType, PbIconName> = {
  训练: "dumbbell",
  步行: "footprints",
  拉伸: "person-standing",
  自由活动: "sparkles",
};

export const activityIconColors: Record<ActivityType, string> = {
  训练: "color.primary",
  步行: "color.info",
  拉伸: "color.success",
  自由活动: "color.warning",
};

export const activityIconKinds: Record<ActivityType, string> = {
  训练: "training",
  步行: "walk",
  拉伸: "stretch",
  自由活动: "free",
};

export const planGoalIcons: Record<PlanGoal, PbIconName> = {
  唤醒: "sparkles",
  力量: "dumbbell",
  舒缓: "person-standing",
};

export const planGoalIconColors: Record<PlanGoal, string> = {
  唤醒: "color.warning",
  力量: "color.primary",
  舒缓: "color.success",
};

export const planGoalIconKinds: Record<PlanGoal, string> = {
  唤醒: "wake",
  力量: "strength",
  舒缓: "recovery",
};

export type RecordGlyph = {
  icon: PbIconName;
  color: string;
  kind: string;
};

export function planGlyph(goal: PlanGoal): RecordGlyph {
  return {
    icon: planGoalIcons[goal],
    color: planGoalIconColors[goal],
    kind: planGoalIconKinds[goal],
  };
}

export function recordGlyph(
  record: WorkoutRecord,
  plans: FitnessPlan[],
): RecordGlyph {
  if (record.kind === "session" && record.planId) {
    const plan = plans.find((item) => item.id === record.planId);
    if (plan) return planGlyph(plan.goal);
  }
  return {
    icon: activityIcons[record.activityType],
    color: activityIconColors[record.activityType],
    kind: activityIconKinds[record.activityType],
  };
}
