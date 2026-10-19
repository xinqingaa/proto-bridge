import { inject, watch, type InjectionKey, type Ref } from "vue";

/** A command revision, independent of route changes (including same-URL reset). */
export const PrototypeCaseRevisionKey: InjectionKey<Ref<number>> = Symbol(
  "prototype-case-revision",
);

export function usePrototypeCaseReset(reset: () => void) {
  const revision = inject(PrototypeCaseRevisionKey, null);
  if (revision) watch(revision, reset, { flush: "sync" });
}
