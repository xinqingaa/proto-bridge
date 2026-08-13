import {
  plans,
  records,
  type FitnessGoals,
  type FitnessPlan,
  type FitnessProfile,
  type WorkoutRecord,
} from "./model";

const KEYS = {
  profile: "hengdong.users.v1",
  session: "hengdong.session.v1",
  plans: "hengdong.plans.v1",
  records: "hengdong.records.v1",
  goals: "hengdong.goals.v1",
  preferences: "hengdong.preferences.v1",
} as const;

export const defaultProfile: FitnessProfile = {
  id: "user-demo",
  name: "林然",
  email: "demo@hengdong.local",
};

export const defaultGoals: FitnessGoals = {
  weeklySessions: "4 次",
  sessionMinutes: "30 分钟",
  reminderTime: "20:30",
  reminderEnabled: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getProfile() {
  return read(KEYS.profile, defaultProfile);
}

export function saveProfile(profile: FitnessProfile) {
  write(KEYS.profile, profile);
  write(KEYS.session, { userId: profile.id });
}

export function getPlans(): FitnessPlan[] {
  return read(KEYS.plans, plans);
}

export function savePlan(plan: FitnessPlan) {
  const current = getPlans();
  const next = current.some((item) => item.id === plan.id)
    ? current.map((item) => (item.id === plan.id ? plan : item))
    : [...current, plan];
  write(KEYS.plans, next);
}

export function getRecords(): WorkoutRecord[] {
  return read(KEYS.records, records);
}

export function saveRecord(record: WorkoutRecord) {
  const current = getRecords().filter((item) => item.id !== record.id);
  write(KEYS.records, [record, ...current]);
}

export function removeRecord(recordId: string) {
  write(
    KEYS.records,
    getRecords().filter((item) => item.id !== recordId),
  );
}

export function getGoals() {
  return read(KEYS.goals, defaultGoals);
}

export function saveGoals(goals: FitnessGoals) {
  write(KEYS.goals, goals);
}

export function getThemePreference() {
  return read(KEYS.preferences, { theme: "light", tab: "today" });
}

export function saveThemePreference(theme: "light" | "dark", tab = "profile") {
  write(KEYS.preferences, { theme, tab });
}
