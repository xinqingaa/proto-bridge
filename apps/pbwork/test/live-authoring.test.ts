import { afterEach, expect, it, vi } from "vitest";
import { inspectCurrentScreen } from "@/runtime/capture-protocol";
import { defineScreen, fragment } from "@/authoring/define-screen";
const screen = defineScreen({
  prototypeId: "demo",
  slug: "home",
  label: "home",
  view: "Home.vue",
  defaultVariantId: "default",
  fragments: [fragment("title", { required: true })],
  variants: [{ id: "default", label: "default" }],
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
it("reports the existing required checks live without inventing a second boundary", () => {
  expect(inspectCurrentScreen(screen, "default").map((d) => d.code)).toContain(
    "authoring.fragment-not-found",
  );
  document.body.innerHTML = '<p data-pb-id="demo.home.title">title</p>';
  expect(
    inspectCurrentScreen(screen, "default")
      .map((d) => d.message)
      .join(),
  ).toContain("without data-pb-role");
  const el = document.querySelector("p")!;
  el.dataset.pbRole = "text";
  el.style.position = "fixed";
  expect(inspectCurrentScreen(screen, "default").map((d) => d.code)).toContain(
    "authoring.fragment-not-visible",
  );
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 100, 50),
  );
  expect(
    inspectCurrentScreen(screen, "default")
      .map((d) => d.message)
      .join(),
  ).toContain("Token Evidence");
  el.dataset.pbTokenTypography = "typography.caption";
  document.elementFromPoint = () => el;
  expect(inspectCurrentScreen(screen, "default")).toEqual([]);
  const overlay = document.createElement("div");
  document.body.append(overlay);
  document.elementFromPoint = () => overlay;
  expect(inspectCurrentScreen(screen, "default").map((d) => d.code)).toContain(
    "authoring.fragment-occluded",
  );
  overlay.remove();
  document.elementFromPoint = () => el;
  el.removeAttribute("data-pb-token-typography");
  expect(
    inspectCurrentScreen(screen, "default").filter(
      (d) => d.severity === "block",
    ),
  ).toHaveLength(1);
});

it("accepts explicitly owned DS parts and still blocks a local child without bindings", async () => {
  const { registerInspect } = await import("@/runtime/inspect/registry");
  document.body.innerHTML =
    '<div data-pb-id="demo.home.tabs" data-pb-role="tab-bar"><button data-pb-id="demo.home.tabs.tab" data-pb-key="first" data-pb-role="tab">First</button><p data-pb-id="demo.home.tabs.caption" data-pb-role="text">Caption</p></div>';
  const owner = document.querySelector("div")!;
  const dispose = registerInspect({
    element: owner,
    pbId: "demo.home.tabs",
    componentId: "primary-tabs",
    semanticParts: [{ suffix: "tab", role: "tab" }],
    getTokenBindings: () => ({ typography: "typography.caption" }),
  });
  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>("[data-pb-id]"),
  )) {
    el.style.position = "fixed";
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 50),
    );
  }
  document.elementFromPoint = () => document.querySelector("button")!;
  const tabs = {
    ...screen,
    variants: [
      {
        id: "default",
        label: "default",
        requiredFragments: [
          {
            screenId: screen.screenId,
            pbId: "demo.home.tabs.tab",
            pbKey: "first",
          },
        ],
      },
    ],
  };
  expect(
    inspectCurrentScreen(tabs, "default").filter((d) => d.severity === "block"),
  ).toEqual([]);
  document.elementFromPoint = () => document.querySelector("p")!;
  const local = {
    ...tabs,
    variants: [
      {
        id: "default",
        label: "default",
        requiredFragments: [
          { screenId: screen.screenId, pbId: "demo.home.tabs.caption" },
        ],
      },
    ],
  };
  expect(
    inspectCurrentScreen(local, "default").find((d) =>
      d.message.includes("Token Evidence"),
    )?.severity,
  ).toBe("block");
  dispose();
});
