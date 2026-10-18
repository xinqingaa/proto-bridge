import { toValue, watch, type MaybeRefOrGetter } from "vue";

/** Controlled overlays have no vendor activator slot. Remember their actual
 * opening control, and restore it after leaving without stealing another modal's focus.
 * Focus containment, Escape and dismissal remain owned by the shared overlay. */
export function useOverlayReturnFocus(open: MaybeRefOrGetter<boolean>) {
  let trigger: HTMLElement | undefined;
  watch(
    () => toValue(open),
    (value) => {
      if (!value || typeof document === "undefined") return;
      const active = document.activeElement;
      trigger =
        active instanceof HTMLElement && active !== document.body
          ? active
          : undefined;
    },
    { flush: "sync" },
  );
  return () => {
    if (toValue(open) || !trigger?.isConnected) return;
    // An inactive vendor host may keep its own rectangle after its content
    // leaves. Check visible modal content, rather than the empty host box.
    const hasModal = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      ),
    ).some((dialog) =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "[tabindex], button, input, select, textarea, a[href]",
        ),
      ).some((control) => control.getClientRects().length > 0),
    );
    if (!hasModal) trigger.focus({ preventScroll: true });
    trigger = undefined;
  };
}
