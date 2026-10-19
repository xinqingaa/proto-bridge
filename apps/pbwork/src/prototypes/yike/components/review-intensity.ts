/** Daily accumulated focus minutes. Zero is not one of the three data bands. */
export function reviewIntensity(
  minutes: number,
): "none" | "low" | "medium" | "high" {
  if (!Number.isFinite(minutes) || minutes <= 0) return "none";
  return minutes <= 30 ? "low" : minutes <= 90 ? "medium" : "high";
}
