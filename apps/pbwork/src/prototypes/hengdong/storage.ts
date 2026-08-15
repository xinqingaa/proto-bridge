import { reactive } from "vue";
import {
  defaultGoals,
  defaultPlans,
  defaultProfile,
  defaultRecords,
  type ActivityHistoryTab,
  type ActivityType,
  type FitnessGoals,
  type FitnessPlan,
  type FitnessProfile,
  type PlanSaveMode,
  type ProgressPeriod,
  type WorkoutRecord,
  type WorkoutSession,
  normalizeHengdongUsername,
} from "./model";

const STORAGE_KEY = "hengdong.app.v2";

type HengdongSnapshot = {
  profile: FitnessProfile;
  signedIn: boolean;
  plans: FitnessPlan[];
  activePlanId: string;
  records: WorkoutRecord[];
  goals: FitnessGoals;
  workoutSession: WorkoutSession | null;
  theme: "light" | "dark";
  ui: {
    planFilter: string;
    historyTab: ActivityHistoryTab;
    progressPeriod: ProgressPeriod;
    progressAnchor: string;
    progressFilter: "全部" | ActivityType;
    progressCustomStart: string;
    progressCustomEnd: string;
  };
};

function defaultSnapshot(): HengdongSnapshot {
  return {
    profile: structuredClone(defaultProfile),
    signedIn: false,
    plans: structuredClone(defaultPlans),
    activePlanId: defaultPlans[0]!.id,
    records: structuredClone(defaultRecords),
    goals: { ...defaultGoals },
    workoutSession: null,
    theme: "light",
    ui: {
      planFilter: "全部",
      historyTab: "all",
      progressPeriod: "week",
      progressAnchor: "2026-08-13",
      progressFilter: "全部",
      progressCustomStart: "2026-08-01",
      progressCustomEnd: "2026-08-13",
    },
  };
}

function readSnapshot(): HengdongSnapshot {
  const fallback = defaultSnapshot();
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return fallback;
    const parsed = JSON.parse(value) as Partial<HengdongSnapshot>;
    const historyTabs: ActivityHistoryTab[] = [
      "all",
      "training",
      "walking",
      "stretching",
      "free",
    ];
    const progressPeriods: ProgressPeriod[] = [
      "week",
      "month",
      "year",
      "custom",
    ];
    const activityFilters: Array<"全部" | ActivityType> = [
      "全部",
      "训练",
      "步行",
      "拉伸",
      "自由活动",
    ];
    const parsedUi: Partial<HengdongSnapshot["ui"]> = parsed.ui ?? {};
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...parsed.profile },
      goals: { ...fallback.goals, ...parsed.goals },
      plans: Array.isArray(parsed.plans) ? parsed.plans : fallback.plans,
      records: Array.isArray(parsed.records)
        ? parsed.records
        : fallback.records,
      workoutSession: parsed.workoutSession ?? null,
      ui: {
        ...fallback.ui,
        ...parsedUi,
        historyTab: historyTabs.includes(
          parsedUi.historyTab as ActivityHistoryTab,
        )
          ? (parsedUi.historyTab as ActivityHistoryTab)
          : fallback.ui.historyTab,
        progressPeriod: progressPeriods.includes(
          parsedUi.progressPeriod as ProgressPeriod,
        )
          ? (parsedUi.progressPeriod as ProgressPeriod)
          : fallback.ui.progressPeriod,
        progressFilter: activityFilters.includes(
          parsedUi.progressFilter as "全部" | ActivityType,
        )
          ? (parsedUi.progressFilter as "全部" | ActivityType)
          : fallback.ui.progressFilter,
      },
    };
  } catch {
    return fallback;
  }
}

export const hengdongState = reactive<HengdongSnapshot>(readSnapshot());

export function persistHengdong() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hengdongState));
}

export function loginHengdong(username: string, password: string) {
  const valid =
    normalizeHengdongUsername(username) === hengdongState.profile.username &&
    password === hengdongState.profile.password;
  if (!valid) return false;
  hengdongState.signedIn = true;
  persistHengdong();
  return true;
}

export function registerHengdong(
  profile: FitnessProfile,
  weeklySessions: number,
) {
  hengdongState.profile = {
    ...profile,
    username: normalizeHengdongUsername(profile.username),
  };
  hengdongState.goals = {
    ...hengdongState.goals,
    weeklySessions,
  };
  hengdongState.signedIn = true;
  persistHengdong();
}

export function logoutHengdong() {
  hengdongState.signedIn = false;
  persistHengdong();
}

export function setActivePlan(planId: string) {
  if (!hengdongState.plans.some((plan) => plan.id === planId)) return false;
  hengdongState.activePlanId = planId;
  persistHengdong();
  return true;
}

export function savePlan(plan: FitnessPlan) {
  const index = hengdongState.plans.findIndex((item) => item.id === plan.id);
  if (index >= 0) hengdongState.plans.splice(index, 1, plan);
  else hengdongState.plans.push(plan);
  persistHengdong();
}

export function savePlanForMode(plan: FitnessPlan, mode: PlanSaveMode) {
  savePlan(plan);
  if (mode === "create") setActivePlan(plan.id);
}

export function adoptPlan(planId: string) {
  if (planId === hengdongState.activePlanId) return null;
  const previousPlanId = hengdongState.activePlanId;
  return setActivePlan(planId) ? previousPlanId : null;
}

export function saveRecord(record: WorkoutRecord) {
  const existing = hengdongState.records.findIndex(
    (item) => item.id === record.id,
  );
  if (existing >= 0) hengdongState.records.splice(existing, 1);
  hengdongState.records.push(record);
  hengdongState.records.sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  );
  persistHengdong();
}

export function removeRecord(recordId: string) {
  const index = hengdongState.records.findIndex((item) => item.id === recordId);
  if (index < 0) return null;
  const [removed] = hengdongState.records.splice(index, 1);
  persistHengdong();
  return removed ?? null;
}

export function restoreRecord(record: WorkoutRecord) {
  saveRecord(record);
}

export function saveGoals(goals: FitnessGoals) {
  hengdongState.goals = goals;
  persistHengdong();
}

export function saveWorkoutSession(session: WorkoutSession | null) {
  hengdongState.workoutSession = session;
  persistHengdong();
}

export function setThemePreference(theme: "light" | "dark") {
  hengdongState.theme = theme;
  persistHengdong();
}

export function updateHengdongUi(ui: Partial<HengdongSnapshot["ui"]>) {
  Object.assign(hengdongState.ui, ui);
  persistHengdong();
}

export function refreshHengdongRecords() {
  const records = [...readSnapshot().records].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  );
  const changed =
    JSON.stringify(records) !== JSON.stringify(hengdongState.records);
  hengdongState.records.splice(0, hengdongState.records.length, ...records);
  return changed;
}

export function resetHengdongData() {
  Object.assign(hengdongState, defaultSnapshot());
  persistHengdong();
}
