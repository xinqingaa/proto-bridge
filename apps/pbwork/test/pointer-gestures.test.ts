import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useHorizontalDragScroll } from "@/design-system/components/_shared/useHorizontalDragScroll";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";

function pointerEvent(
  overrides: Partial<PointerEvent> & {
    currentTarget?: EventTarget | null;
    target?: EventTarget | null;
  },
) {
  return {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 0,
    clientY: 0,
    currentTarget: null,
    target: document.createElement("div"),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as unknown as PointerEvent;
}

describe("pointer swipe arbitration", () => {
  it("honors mouseSwipe independently from touch swipe", () => {
    const current = ref("one");
    const update = vi.fn();
    const surface = document.createElement("div");
    const gesture = usePointerSwipe(ref(["one", "two"]), current, update, {
      swipe: ref(true),
      mouseSwipe: ref(false),
    });

    gesture.onPointerDown(
      pointerEvent({ currentTarget: surface, clientX: 120, clientY: 20 }),
    );
    gesture.onPointerMove(pointerEvent({ clientX: 20, clientY: 22 }));
    gesture.onPointerUp(pointerEvent({ clientX: 20, clientY: 22 }));

    expect(update).not.toHaveBeenCalled();
    expect(gesture.dragging.value).toBe(false);
  });

  it("delays pointer capture until horizontal lock and allows button starts", () => {
    const current = ref("one");
    const update = vi.fn();
    const button = document.createElement("button");
    const surface = document.createElement("div");
    const setPointerCapture = vi.fn();
    Object.defineProperty(surface, "setPointerCapture", {
      value: setPointerCapture,
    });
    const gesture = usePointerSwipe(ref(["one", "two"]), current, update, {
      swipe: ref(true),
      mouseSwipe: ref(true),
    });

    gesture.onPointerDown(
      pointerEvent({
        currentTarget: surface,
        target: button,
        clientX: 120,
        clientY: 20,
      }),
    );
    expect(setPointerCapture).not.toHaveBeenCalled();

    gesture.onPointerMove(pointerEvent({ clientX: 30, clientY: 22 }));
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    gesture.onPointerUp(pointerEvent({ clientX: 20, clientY: 22 }));
    expect(update).toHaveBeenCalledWith("two");

    const click = new MouseEvent("click", { cancelable: true });
    const preventDefault = vi.spyOn(click, "preventDefault");
    gesture.onClickCapture(click);
    expect(preventDefault).toHaveBeenCalled();
  });

  it("releases a vertical gesture without capturing or changing tabs", () => {
    const update = vi.fn();
    const surface = document.createElement("div");
    const setPointerCapture = vi.fn();
    Object.defineProperty(surface, "setPointerCapture", {
      value: setPointerCapture,
    });
    const gesture = usePointerSwipe(ref(["one", "two"]), ref("one"), update, {
      swipe: ref(true),
      mouseSwipe: ref(true),
    });

    gesture.onPointerDown(
      pointerEvent({ currentTarget: surface, clientX: 20, clientY: 20 }),
    );
    gesture.onPointerMove(pointerEvent({ clientX: 22, clientY: 100 }));
    gesture.onPointerUp(pointerEvent({ clientX: 22, clientY: 100 }));

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores an overflowing nested strip but handles a non-overflowing one", () => {
    const update = vi.fn();
    const surface = document.createElement("div");
    const gesture = usePointerSwipe(ref(["one", "two"]), ref("one"), update, {
      swipe: ref(true),
      mouseSwipe: ref(true),
    });

    function nestedTarget(clientWidth: number, scrollWidth: number) {
      const region = document.createElement("div");
      region.dataset.horizontalScroll = "";
      Object.defineProperties(region, {
        clientWidth: { value: clientWidth },
        scrollWidth: { value: scrollWidth },
      });
      const child = document.createElement("button");
      region.append(child);
      return child;
    }

    gesture.onPointerDown(
      pointerEvent({
        currentTarget: surface,
        target: nestedTarget(200, 500),
        clientX: 120,
      }),
    );
    gesture.onPointerMove(pointerEvent({ clientX: 20 }));
    gesture.onPointerUp(pointerEvent({ clientX: 20 }));
    expect(update).not.toHaveBeenCalled();

    gesture.onPointerDown(
      pointerEvent({
        currentTarget: surface,
        target: nestedTarget(500, 500),
        clientX: 120,
      }),
    );
    gesture.onPointerMove(pointerEvent({ clientX: 20 }));
    gesture.onPointerUp(pointerEvent({ clientX: 20 }));
    expect(update).toHaveBeenCalledWith("two");
  });
});

describe("nested horizontal drag scrolling", () => {
  function scrollSurface() {
    const surface = document.createElement("div");
    Object.defineProperties(surface, {
      clientWidth: { value: 200 },
      scrollWidth: { value: 500 },
      scrollLeft: { value: 0, writable: true },
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
    });
    return surface;
  }

  it("owns a drag while the inner strip can scroll", () => {
    const surface = scrollSurface();
    const gesture = useHorizontalDragScroll(ref(surface));
    const move = pointerEvent({ clientX: 20, clientY: 22 });

    gesture.onPointerDown(pointerEvent({ clientX: 120, clientY: 20 }));
    gesture.onPointerMove(move);

    expect(surface.scrollLeft).toBe(100);
    expect(move.preventDefault).toHaveBeenCalled();
    expect(move.stopPropagation).toHaveBeenCalled();
  });

  it("keeps an outward edge drag away from the parent pager", () => {
    const surface = scrollSurface();
    const gesture = useHorizontalDragScroll(ref(surface));
    const move = pointerEvent({ clientX: 120, clientY: 22 });

    gesture.onPointerDown(pointerEvent({ clientX: 20, clientY: 20 }));
    gesture.onPointerMove(move);

    expect(surface.scrollLeft).toBe(0);
    expect(move.preventDefault).toHaveBeenCalled();
    expect(move.stopPropagation).toHaveBeenCalled();
  });
});
