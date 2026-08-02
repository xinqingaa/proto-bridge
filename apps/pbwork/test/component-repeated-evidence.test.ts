import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Badge from "@/design-system/components/basic/Badge.vue";

describe("repeated component Evidence", () => {
  it("keeps Badge template identity separate from its stable business key", async () => {
    const wrapper = mount(Badge, {
      props: {
        label: "严重",
        tone: "error",
        inspectId: "cold-chain-ops.exception-queue.list.row.severity",
        pbKey: "ex-017",
      },
      global: {
        stubs: {
          "v-chip": { template: "<span><slot /></span>" },
        },
      },
    });

    await nextTick();
    expect(wrapper.attributes("data-pb-id")).toBe(
      "cold-chain-ops.exception-queue.list.row.severity",
    );
    expect(wrapper.attributes("data-pb-key")).toBe("ex-017");
    expect(wrapper.attributes("data-pb-component")).toBe("ds.badge");
  });
});
