import type { YikeHabitIcon } from "./YikeHabitGlyph.vue";
export type YikeHabitDraft = {
  name: string;
  icon: YikeHabitIcon;
  frequency: "daily" | "weekly";
  target: number;
  reminder: boolean;
  reminderTime: string;
};
export const emptyHabitDraft = (): YikeHabitDraft => ({
  name: "",
  icon: "leaf",
  frequency: "daily",
  target: 3,
  reminder: false,
  reminderTime: "21:00",
});
export function habitNameError(value: string): string {
  const name = value.trim();
  if (!/[^\p{White_Space}\p{Cf}\p{Cc}\p{M}]/u.test(name))
    return "写一个习惯名称";
  if (
    [...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(name)]
      .length > 30
  )
    return "名称最多 30 个字符";
  return "";
}
export function reminderTimeError(draft: YikeHabitDraft): string {
  return !draft.reminder ||
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime)
    ? ""
    : "选择有效的本地时间";
}
