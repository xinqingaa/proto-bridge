import { describe, expect, it } from "vitest";
import {
  buildSelectPayload,
  climbInspectTarget,
  readWhitelistedStyles,
  resolvePickTarget,
  stylePropertyGroup,
  stylePropertyRole,
} from "@/runtime/inspect/snapshot";
import { registerInspect } from "@/runtime/inspect/registry";
import { normalizeTokenCssVarName } from "@/design-system/resolveThemeTokens";
import { loadTokens } from "@/design-system/loaders";

describe("stylePropertyGroup", () => {
  it("maps whitelist properties into semantic inspector groups", () => {
    expect(stylePropertyGroup("background-color")).toBe("color");
    expect(stylePropertyGroup("font-size")).toBe("typography");
    expect(stylePropertyGroup("font")).toBe("typography");
    expect(stylePropertyGroup("padding")).toBe("spacing-size");
    expect(stylePropertyGroup("width")).toBe("spacing-size");
    expect(stylePropertyGroup("border-color")).toBe("border-radius");
    expect(stylePropertyGroup("border-radius")).toBe("border-radius");
    expect(stylePropertyGroup("box-shadow")).toBe("shadow-layout");
    expect(stylePropertyGroup("display")).toBe("shadow-layout");
  });
});

describe("stylePropertyRole", () => {
  it("labels color roles for inspector display", () => {
    expect(stylePropertyRole("color")).toBe("文字");
    expect(stylePropertyRole("background-color")).toBe("背景");
    expect(stylePropertyRole("border-color")).toBe("边框");
    expect(stylePropertyRole("font")).toBe("字体");
  });
});

describe("readWhitelistedStyles", () => {
  it("marks binding only when own contract slot covers the property", () => {
    const surface = loadTokens().find((token) => token.id === "color.surface");
    expect(surface).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    const cssVar = normalizeTokenCssVarName("color.surface");
    host.style.setProperty(cssVar, String(surface!.defaultValue));
    document.body.appendChild(host);

    const target = document.createElement("div");
    target.style.backgroundColor = String(surface!.defaultValue);
    target.style.display = "block";
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["color.surface"],
      ownBindings: { surface: "color.surface" },
    });
    const background = rows.find((row) => row.property === "background-color");
    const display = rows.find((row) => row.property === "display");

    expect(background?.group).toBe("color");
    expect(background?.source).toBe("binding");
    expect(background?.tokenId).toBe("color.surface");
    expect(background?.cssVar).toBe(cssVar);

    expect(display?.group).toBe("shadow-layout");
    expect(display?.source).toBe("raw");
    expect(display?.tokenId).toBeUndefined();

    host.remove();
  });

  it("does not treat ancestor preferred tokens as explicit bindings", () => {
    const surface = loadTokens().find((token) => token.id === "color.surface");
    expect(surface).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    host.style.setProperty(
      normalizeTokenCssVarName("color.surface"),
      String(surface!.defaultValue),
    );
    document.body.appendChild(host);

    const target = document.createElement("div");
    target.style.backgroundColor = String(surface!.defaultValue);
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["color.surface"],
    });
    const background = rows.find((row) => row.property === "background-color");
    expect(background?.tokenId).toBe("color.surface");
    expect(background?.source).toBe("value-match");

    host.remove();
  });

  it("does not match border-color when border is not visible", () => {
    const onSurface = loadTokens().find(
      (token) => token.id === "color.on-surface",
    );
    expect(onSurface).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    host.style.setProperty(
      normalizeTokenCssVarName("color.on-surface"),
      String(onSurface!.defaultValue),
    );
    document.body.appendChild(host);

    const target = document.createElement("span");
    target.style.color = String(onSurface!.defaultValue);
    target.style.border = "0 none";
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["color.on-surface"],
      ownBindings: { color: "color.on-surface" },
    });
    const borderColor = rows.find((row) => row.property === "border-color");
    expect(borderColor?.tokenId).toBeUndefined();
    expect(borderColor?.source).toBe("raw");

    host.remove();
  });

  it("collapses matching typography into a single font row", () => {
    const caption = loadTokens().find(
      (token) => token.id === "typography.caption",
    );
    expect(caption).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    const cssVar = normalizeTokenCssVarName("typography.caption");
    host.style.setProperty(cssVar, String(caption!.defaultValue));
    document.body.appendChild(host);

    const target = document.createElement("span");
    target.style.font = String(caption!.defaultValue);
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["typography.caption"],
      ownBindings: { typography: "typography.caption" },
    });
    const fontRows = rows.filter((row) => row.group === "typography");
    const font = rows.find((row) => row.property === "font");

    expect(font?.tokenId).toBe("typography.caption");
    expect(font?.source).toBe("binding");
    expect(font?.cssVar).toBe(cssVar);
    expect(fontRows).toHaveLength(1);

    host.remove();
  });

  it("does not bind part-slot typography (title/subtitle) on the root", () => {
    const subtitle = loadTokens().find(
      (token) => token.id === "typography.subtitle",
    );
    expect(subtitle).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    host.style.setProperty(
      normalizeTokenCssVarName("typography.subtitle"),
      String(subtitle!.defaultValue),
    );
    document.body.appendChild(host);

    const target = document.createElement("div");
    // Inherited-like mix: size from subtitle, weight from caption — no full token.
    target.style.font = "400 16px/1.4 Inter, system-ui, sans-serif";
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["typography.subtitle", "typography.caption"],
      ownBindings: {
        title: "typography.subtitle",
        subtitle: "typography.caption",
        surface: "color.surface",
      },
    });
    const font = rows.find((row) => row.property === "font");
    expect(font).toBeUndefined();
    expect(
      rows.filter((row) => row.group === "typography" && row.tokenId),
    ).toHaveLength(0);

    host.remove();
  });

  it("matches soft background tokens by resolved color", () => {
    const soft = loadTokens().find((token) => token.id === "color.primary-soft");
    expect(soft).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    const cssVar = normalizeTokenCssVarName("color.primary-soft");
    host.style.setProperty(cssVar, String(soft!.defaultValue));
    document.body.appendChild(host);

    const target = document.createElement("span");
    target.style.backgroundColor = String(soft!.defaultValue);
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, {
      rankTokenIds: ["color.primary-soft"],
      ownBindings: { background: "color.primary-soft" },
    });
    const background = rows.find((row) => row.property === "background-color");
    expect(background?.tokenId).toBe("color.primary-soft");
    expect(background?.source).toBe("binding");

    host.remove();
  });

  it("reports effective background from nearest opaque ancestor", () => {
    const surface = loadTokens().find((token) => token.id === "color.surface");
    expect(surface).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    host.style.setProperty(
      normalizeTokenCssVarName("color.surface"),
      String(surface!.defaultValue),
    );
    document.body.appendChild(host);

    const list = document.createElement("div");
    list.setAttribute("data-pb-id", "ds.data-list");
    list.style.backgroundColor = String(surface!.defaultValue);
    host.appendChild(list);

    const row = document.createElement("div");
    row.style.backgroundColor = "transparent";
    list.appendChild(row);

    const rows = readWhitelistedStyles(row, {
      rankTokenIds: ["color.surface"],
    });
    const background = rows.find((item) => item.property === "background-color");
    expect(background?.source).toBe("inherited");
    expect(background?.tokenId).toBe("color.surface");
    expect(background?.inheritedFrom?.pbId).toBe("ds.data-list");
    expect(background?.effectiveValue).toBeTruthy();

    host.remove();
  });
});

describe("climbInspectTarget", () => {
  it("climbs exactly one DOM level instead of skipping wrappers", () => {
    const list = document.createElement("div");
    list.setAttribute("data-pb-id", "ds.data-list");
    const row = document.createElement("div");
    const title = document.createElement("strong");
    list.appendChild(row);
    row.appendChild(title);
    document.body.appendChild(list);

    expect(climbInspectTarget(title)).toBe(row);

    list.remove();
  });
});

describe("resolvePickTarget", () => {
  it("keeps the exact leaf while component metadata remains available", () => {
    const page = document.createElement("div");
    page.setAttribute("data-pb-id", "cold-chain-ops.exception-queue");
    const host = document.createElement("div");
    page.appendChild(host);
    document.body.appendChild(page);

    const unregister = registerInspect({
      element: host,
      pbId: "ds.switch",
      componentId: "switch",
    });
    host.setAttribute("data-pb-id", "ds.switch");
    host.setAttribute("data-pb-component", "ds.switch");

    const label = document.createElement("span");
    host.appendChild(label);

    expect(resolvePickTarget(label)).toBe(label);
    const payload = buildSelectPayload(label);
    expect("error" in payload).toBe(false);
    if (!("error" in payload)) {
      expect(payload.element.tag).toBe("span");
      expect(payload.element.ref.selector).toContain("span");
      expect(payload.componentOwner?.ref.pbId).toBe("ds.switch");
      expect(payload.componentId).toBe("switch");
    }

    unregister();
    page.remove();
  });

  it("keeps interactive leaf under loose page anchors", () => {
    const page = document.createElement("div");
    page.setAttribute("data-pb-id", "cold-chain-ops.exception-queue");
    const button = document.createElement("button");
    button.textContent = "个人资料";
    page.appendChild(button);
    document.body.appendChild(page);

    expect(resolvePickTarget(button)).toBe(button);

    page.remove();
  });

  it("keeps typography as the selected leaf inside list rows", () => {
    const row = document.createElement("div");
    row.setAttribute("data-pb-id", "ds.data-list.row.1");
    const title = document.createElement("strong");
    row.appendChild(title);
    document.body.appendChild(row);

    expect(resolvePickTarget(title)).toBe(title);

    row.remove();
  });

  it("uses Alt/preferParent to select the nearest semantic anchor", () => {
    const page = document.createElement("div");
    page.setAttribute("data-pb-id", "cold-chain-ops.exception-queue");
    const row = document.createElement("div");
    row.setAttribute("data-pb-id", "ds.data-list.row.1");
    const title = document.createElement("strong");
    page.appendChild(row);
    row.appendChild(title);
    document.body.appendChild(page);

    expect(resolvePickTarget(title, true)).toBe(row);

    page.remove();
  });
});
