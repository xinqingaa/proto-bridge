import { reactive } from "vue";
import {
  defaultGoals,
  defaultPlans,
  defaultProfile,
  defaultRecords,
  type FitnessGoals,
  type FitnessPlan,
  type FitnessProfile,
  type WorkoutRecord,
  type WorkoutSession,
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
    progressPeriod: "week" | "month";
    progressFilter: string;
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
      progressPeriod: "week",
      progressFilter: "全部",
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
      ui: { ...fallback.ui, ...parsed.ui },
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
    username.trim() === hengdongState.profile.username &&
    password === hengdongState.profile.password;
  if (!valid) return false;
  hengdongState.signedIn = true;
  persistHengdong();
  return true;
}

export function registerHengdong(profile: FitnessProfile) {
  hengdongState.profile = profile;
  hengdongState.signedIn = true;
  persistHengdong();
}

export function logoutHengdong() {
  hengdongState.signedIn = false;
  persistHengdong();
}

export function setActivePlan(planId: string) {
  hengdongState.activePlanId = planId;
  persistHengdong();
}

export function savePlan(plan: FitnessPlan) {
  const index = hengdongState.plans.findIndex((item) => item.id === plan.id);
  if (index >= 0) hengdongState.plans.splice(index, 1, plan);
  else hengdongState.plans.push(plan);
  persistHengdong();
}

export function saveRecord(record: WorkoutRecord) {
  const existing = hengdongState.records.findIndex(
    (item) => item.id === record.id,
  );
  if (existing >= 0) hengdongState.records.splice(existing, 1);
  hengdongState.records.unshift(record);
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

export function resetHengdongData() {
  Object.assign(hengdongState, defaultSnapshot());
  persistHengdong();
}
