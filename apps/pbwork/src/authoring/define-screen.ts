import type { PbDeclaration } from "./pb-style";
import type {
  PrototypeFragmentRef,
  ScreenRecord,
} from "../design-system/types";

export type FragmentDeclaration = {
  slot: string;
  key?: string;
  required?: boolean;
};
export const fragment = (
  slot: string,
  options: Omit<FragmentDeclaration, "slot"> = {},
): FragmentDeclaration => ({ slot, ...options });
export function screenScope(prototypeId: string, slug: string) {
  const screenId = `${prototypeId}.${slug}`;
  const id = (slot: string) => `${screenId}.${slot}`;
  const ref = (slot: string, key?: string): PrototypeFragmentRef => ({
    screenId,
    pbId: id(slot),
    ...(key === undefined ? {} : { pbKey: key }),
  });
  const node = (
    slot: string,
    role: PbDeclaration["role"],
    options: Omit<PbDeclaration, "id" | "role"> = {},
  ): PbDeclaration => ({ ...options, id: id(slot), role });
  return { screenId, id, ref, node };
}
export type ScreenDeclaration = Omit<
  ScreenRecord,
  "screenId" | "screenSlug" | "path"
> & {
  slug: string;
  fragments: FragmentDeclaration[];
  path?: string;
};

/** The author opts individual nodes into the default boundary. Never scan DOM. */
export function defineScreen(declaration: ScreenDeclaration): ScreenRecord {
  const { slug, fragments, ...record } = declaration;
  const scope = screenScope(record.prototypeId, slug);
  const required = fragments
    .filter((item) => item.required)
    .map((item) => scope.ref(item.slot, item.key));
  if (!required.length)
    throw new Error(`EMPTY_AUTHORED_BOUNDARY:${scope.screenId}`);
  if (
    new Set(required.map((item) => JSON.stringify(item))).size !==
    required.length
  )
    throw new Error(`DUPLICATE_AUTHORED_FRAGMENT:${scope.screenId}`);
  return {
    ...record,
    screenSlug: slug,
    screenId: scope.screenId,
    path: record.path ?? `/prototype/${record.prototypeId}/${slug}`,
    variants: record.variants.map((variant) =>
      variant.id === record.defaultVariantId
        ? { ...variant, requiredFragments: required }
        : variant,
    ),
  };
}
