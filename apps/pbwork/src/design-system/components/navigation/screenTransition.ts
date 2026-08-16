export type ScreenTransitionMode = "ios" | "android";
export type ScreenTransitionNavigation = "push" | "replace" | "back";

export function resolveScreenTransitionName(input: {
  mode?: ScreenTransitionMode;
  navigation?: ScreenTransitionNavigation;
  reducedMotion?: boolean;
}): string {
  if (input.reducedMotion) return "";
  if (
    input.navigation !== "push" &&
    input.navigation !== "back" &&
    input.navigation !== "replace"
  ) {
    return "";
  }
  const mode = input.mode === "android" ? "android" : "ios";
  const motion = input.navigation === "back" ? "back" : "push";
  return `pb-route-${mode}-${motion}`;
}
