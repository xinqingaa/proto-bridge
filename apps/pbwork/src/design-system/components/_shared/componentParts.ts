import type { SemanticRole } from "@proto-bridge/core/v2";
import type { PbStyleInput, PbDeclaration } from "@/authoring/pb-style";
/** Local parts get explicit facts; component instance bindings stay in Registry. */
export function useComponentParts(
  owner: () => string,
  ownerKey: () => string | undefined = () => undefined,
) {
  return (
    slot: string,
    role: SemanticRole,
    style: PbStyleInput,
    key?: string,
  ): PbDeclaration => ({
    id: `${owner()}.${slot}`,
    role,
    style,
    ...(ownerKey() || key
      ? { key: [ownerKey(), key].filter(Boolean).join("-") }
      : {}),
  });
}
