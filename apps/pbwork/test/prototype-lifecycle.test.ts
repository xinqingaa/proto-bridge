import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { prototypes } from "@/prototypes/registry";

describe("prototype lifecycle workspace state", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("transitions, records history and restores the registry state", () => {
    const prototype = prototypes[0]!;
    const store = usePrototypeLifecycleStore();
    store.transition(prototype, "review", "进入评审");
    expect(store.effectiveLifecycle(prototype)).toBe("review");
    expect(store.historyFor(prototype.id)[0]).toMatchObject({ from: "active", to: "review", note: "进入评审" });
    store.reset(prototype);
    expect(store.effectiveLifecycle(prototype)).toBe(prototype.lifecycle);
  });

  it("rejects transitions outside the workflow graph", () => {
    const store = usePrototypeLifecycleStore();
    expect(() => store.transition(prototypes[0]!, "archived")).toThrow("不允许");
  });
});
