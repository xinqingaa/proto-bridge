import { afterEach, describe, expect, it } from "vitest";
import { effectScope, ref } from "vue";
import { useOverlayReturnFocus } from "@/design-system/components/_shared/useOverlayReturnFocus";

const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  document.body.replaceChildren();
});
function session() {
  const open = ref(false);
  const scope = effectScope();
  scopes.push(scope);
  const restore = scope.run(() => useOverlayReturnFocus(open))!;
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  open.value = true;
  return { open, restore, trigger };
}

describe("shared controlled overlay focus return", () => {
  it("returns to the opening control after content leaves even if an empty modal host remains", () => {
    const { open, restore, trigger } = session();
    trigger.blur();
    const emptyHost = document.createElement("div");
    emptyHost.setAttribute("role", "dialog");
    emptyHost.setAttribute("aria-modal", "true");
    const hiddenControl = document.createElement("button");
    emptyHost.append(hiddenControl);
    document.body.append(emptyHost);
    open.value = false;
    restore();
    expect(document.activeElement).toBe(trigger);
  });
  it("does not steal focus from another visible modal", () => {
    const { open, restore, trigger } = session();
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const control = document.createElement("button");
    control.getClientRects = () =>
      [new DOMRect(0, 0, 20, 20)] as unknown as DOMRectList;
    modal.append(control);
    document.body.append(modal);
    control.focus();
    open.value = false;
    restore();
    expect(document.activeElement).toBe(control);
    expect(document.activeElement).not.toBe(trigger);
  });
  it("ignores an obsolete leave after reopening and a removed trigger", () => {
    const { open, restore, trigger } = session();
    trigger.blur();
    restore();
    expect(document.activeElement).toBe(document.body);
    trigger.remove();
    open.value = false;
    expect(() => restore()).not.toThrow();
  });
});
