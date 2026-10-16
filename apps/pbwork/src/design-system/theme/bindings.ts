import { TOKEN_BINDING_LITERALS } from "@proto-bridge/core/v2";
import { loadBaseThemeSources } from "./sources";

export const BIND_TOKEN_IDS = loadBaseThemeSources()
  .keyCatalog.keys.filter((key) => key.bindable)
  .map((key) => key.id);
export type BindTokenId = string;
export const BIND_TOKEN_SPECIAL_VALUES = TOKEN_BINDING_LITERALS;
const bindSet = new Set(BIND_TOKEN_IDS);
const literals = new Set<string>(TOKEN_BINDING_LITERALS);
export const isBindTokenId = (id: string) => bindSet.has(id);
export const isAllowedTokenBindingValue = (id: string) =>
  bindSet.has(id) || literals.has(id);
