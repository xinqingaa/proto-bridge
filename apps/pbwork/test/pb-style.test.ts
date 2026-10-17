import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import { pbStyle, vPb, type PbDeclaration } from "@/authoring/pb-style";

it("generates CSS and binding facts once, including tuple axes and no constant facts", () => {
  const wrapper = mount(
    defineComponent({
      directives: { pb: vPb },
      setup: () => ({ pbStyle }),
      template: `<p v-pb="{id:'demo.home.title',role:'text',key:'task-a'}" :style="pbStyle({color:'color.primary',typography:'typography.caption',padding:['spacing.sm','spacing.md'],margin:'layout.zero'})">Title</p>`,
    }),
  );
  expect(wrapper.attributes()).toMatchObject({
    "data-pb-id": "demo.home.title",
    "data-pb-role": "text",
    "data-pb-key": "task-a",
    "data-pb-token-color": "color.primary",
    "data-pb-token-typography": "typography.caption",
    "data-pb-token-padding-top": "spacing.sm",
    "data-pb-token-padding-left": "spacing.md",
  });
  expect(wrapper.attributes("data-pb-token-margin")).toBeUndefined();
  expect((wrapper.element as HTMLElement).style.color).toBe(
    "var(--pb-color-primary)",
  );
  wrapper.unmount();
});
it("removes stale keys, tokens and styles after reactive declarations change", async () => {
  const declaration = ref<PbDeclaration>({
    id: "demo.home.status",
    role: "status",
    key: "task-a",
    style: { color: "color.error", background: "color.error-soft" },
  });
  const wrapper = mount(
    defineComponent({
      directives: { pb: vPb },
      setup: () => ({ declaration }),
      template: '<p v-pb="declaration">status</p>',
    }),
  );
  declaration.value = {
    id: "demo.home.title",
    role: "text",
    style: { color: "color.primary" },
  };
  await nextTick();
  expect(wrapper.attributes("data-pb-key")).toBeUndefined();
  expect(wrapper.attributes("data-pb-token-background")).toBeUndefined();
  expect((wrapper.element as HTMLElement).style.backgroundColor).toBe("");
  expect(wrapper.attributes("data-pb-token-color")).toBe("color.primary");
  wrapper.unmount();
});

it("exposes authored local bindings to Inspector without borrowing an ancestor contract", async () => {
  const { buildSelectPayload } = await import("@/runtime/inspect/snapshot");
  const wrapper = mount(
    defineComponent({
      directives: { pb: vPb },
      template: `<p v-pb="{id:'demo.home.caption',role:'text',style:{paddingTop:'spacing.sm',color:'color.primary'}}">caption</p>`,
    }),
  );
  const payload = buildSelectPayload(wrapper.element as HTMLElement);
  expect(payload).toHaveProperty("tokenBindings");
  if (!("error" in payload)) {
    expect(payload.styles.some(row => row.property === "padding-top")).toBe(true);
    expect(payload.tokenBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot: "padding-top", tokenId: "spacing.sm" }),
        expect.objectContaining({ slot: "color", tokenId: "color.primary" }),
      ]),
    );
  }
  wrapper.unmount();
});
