import { TOKEN_BINDING_LITERALS } from "@proto-bridge/core/v2";
import { bindableKeys } from "@/design-system/theme/generated/keys";
const known = new Set<string>([...bindableKeys, ...TOKEN_BINDING_LITERALS]);
export class TokenEvidenceError extends Error {
  constructor(
    message: string,
    readonly slot: string,
    readonly tokenId: string,
  ) {
    super(message);
  }
}
export function datasetTokenBindings(
  element: HTMLElement,
): Record<string, string> | undefined {
  const bindings: Record<string, string> = {};
  for (const [name, value] of Object.entries(element.dataset)) {
    if (!name.startsWith("pbToken") || !value) continue;
    const slot = name
      .slice("pbToken".length)
      .replace(/^[A-Z]/, (c) => c.toLowerCase())
      .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    if (!/^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/.test(slot))
      throw new TokenEvidenceError(
        `Invalid Token Evidence slot ${slot}.`,
        slot,
        value,
      );
    if (!known.has(value))
      throw new TokenEvidenceError(
        `Unknown Foundation Token ${value} in data-pb-token-${slot}.`,
        slot,
        value,
      );
    bindings[slot] = value;
  }
  return Object.keys(bindings).length ? bindings : undefined;
}
