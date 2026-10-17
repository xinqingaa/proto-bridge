import { ThemeKeyCatalog } from "@proto-bridge/core/v2";
import keyCatalogJson from "./key-catalog.json";

/** Shared by Vite Runtime and the Node key generator. */
export function assembleThemeKeyCatalog(
  contracts: Array<{ id: string; componentTokens?: Record<string, unknown> }>,
) {
  return ThemeKeyCatalog.parse({
    ...keyCatalogJson,
    keys: [
      ...keyCatalogJson.keys,
      ...contracts.flatMap((contract) =>
        Object.entries(contract.componentTokens ?? {}).map(
          ([name, definition]) => ({
            ...(definition as Record<string, unknown>),
            id: `${contract.id}.${name}`,
            tier: "component",
            source: contract.id,
          }),
        ),
      ),
    ],
  });
}
