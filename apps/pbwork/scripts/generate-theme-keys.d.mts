export function generateThemeKeys(
  slots: Record<
    string,
    { family: string; pair?: boolean; literals?: readonly string[] }
  >,
): string;
export function writeThemeKeys(
  slots: Record<
    string,
    { family: string; pair?: boolean; literals?: readonly string[] }
  >,
): void;
