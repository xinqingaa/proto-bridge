import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, shallowRef, defineComponent, h } from "vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { createPreviewDevice } from "@/workbench/preview/model";
import { previewExtensions } from "@/workbench/preview/extensions/registry";
import YikeDial from "@/prototypes/yike/components/YikeDial.vue";
import TextControlsPreview from "@/prototypes/yike/previews/TextControlsPreview.vue";
import YikeHabitCard from "@/prototypes/yike/components/YikeHabitCard.vue";

describe("一刻正式资源", () => {
  it("业务专属内容不再作为独立组件资源登记", () => {
    expect(
      previewExtensions.filter((entry) => entry.ownerPrototypeId === "yike"),
    ).toEqual([]);
  });

  it("习惯名称与今日操作各自发出事件，未来日期不出现完成标记或补签按钮", async () => {
    const table = shallowRef(
      resolveRuntimeTheme("yike", "mechanical", "light"),
    );
    const wrapper = mount(YikeHabitCard, {
      props: {
        inspectId: "test.habit",
        face: "mechanical",
        habit: { id: "read", name: "读书", icon: "book", meta: "每天" },
        today: "2026-10-16",
        days: [
          { date: "2026-10-16", completed: false },
          { date: "2026-10-17", completed: true },
        ],
      },
      global: { provide: { [ThemeTableKey as symbol]: table } },
    });
    expect(wrapper.findAll("button")).toHaveLength(2);
    expect(wrapper.get(".is-future").classes()).not.toContain("is-on");
    await wrapper.get(".habit-name").trigger("click");
    expect(wrapper.emitted("open")).toEqual([["read"]]);
    expect(wrapper.emitted("toggleToday")).toBeUndefined();
    await wrapper.get(".today").trigger("click");
    expect(wrapper.emitted("toggleToday")).toEqual([["read"]]);
    await wrapper.setProps({ disabled: true });
    await wrapper.get(".today").trigger("click");
    expect(wrapper.emitted("toggleToday")).toHaveLength(1);
    wrapper.unmount();
  });

  it("机械盘使用60分钟尺度，整小时为满圈，超小时以余量与小时说明共同读数", async () => {
    const table = shallowRef(
      resolveRuntimeTheme("yike", "mechanical", "light"),
    );
    const wrapper = mount(YikeDial, {
      props: {
        face: "mechanical",
        minutes: 0,
        total: 25,
        digits: "00:00",
        caption: "剩余",
        inspectId: "test.dial",
      },
      global: { provide: { [ThemeTableKey as symbol]: table } },
    });
    expect(wrapper.find("g.wedge").exists()).toBe(false);
    await wrapper.setProps({ minutes: 25 });
    const arc = wrapper.findAll("clipPath").at(-1)!.get("path").attributes("d");
    await wrapper.setProps({ total: 90 });
    expect(
      wrapper.findAll("clipPath").at(-1)!.get("path").attributes("d"),
    ).toBe(arc);
    await wrapper.setProps({ tone: "paused" });
    expect(wrapper.get(".caption").attributes("data-pb-token-color")).toBe(
      "color.primary",
    );
    await wrapper.setProps({ tone: "done" });
    expect(wrapper.get(".digits").attributes("data-pb-token-color")).toBe(
      "color.primary",
    );
    await wrapper.setProps({ minutes: 60 });
    expect(wrapper.findAll("clipPath").at(-1)!.find("circle").exists()).toBe(
      true,
    );
    await wrapper.setProps({ minutes: 90, digits: "90:00" });
    expect(wrapper.findAll("clipPath").at(-1)!.find("circle").exists()).toBe(
      false,
    );
    expect(wrapper.attributes("aria-label")).toBe("剩余 · 另有 1 小时 90:00");
    wrapper.unmount();
  });

  it("水位反色副本不重复读屏，裁切随进度变化且多个实例不共享SVG id", async () => {
    const table = shallowRef(resolveRuntimeTheme("yike", "water", "dark"));
    const options = {
      props: {
        face: "water" as const,
        minutes: 12.5,
        total: 25,
        digits: "12:30",
        caption: "专注中",
        inspectId: "test.water",
      },
      global: { provide: { [ThemeTableKey as symbol]: table } },
    };
    const first = mount(YikeDial, options);
    const pair = mount(
      defineComponent({
        render: () =>
          h("div", [
            h(YikeDial, { ...options.props, inspectId: "test.first" }),
            h(YikeDial, { ...options.props, inspectId: "test.second" }),
          ]),
      }),
      { global: options.global },
    );
    expect(first.get(".submerged").attributes("aria-hidden")).toBe("true");
    expect(first.get("clipPath rect").attributes("height")).toBe("184");
    const ids = pair.findAll("clipPath").map((node) => node.attributes("id"));
    expect(new Set(ids).size).toBe(ids.length);
    await first.setProps({ minutes: 0 });
    expect(first.get("clipPath rect").attributes("height")).toBe("0");
    first.unmount();
    pair.unmount();
  });

  it("首次会话中的单选能立即更新受控值，双机复制后互不污染", async () => {
    const device = reactive(
      createPreviewDevice("A", {
        contextId: "prototype:yike",
        theme: "mechanical",
        mode: "light",
      }),
    );
    const table = shallowRef(
      resolveRuntimeTheme("yike", "mechanical", "light"),
    );
    const wrapper = mount(TextControlsPreview, {
      props: { device, table: table.value, states: [] },
      global: {
        provide: { [ThemeTableKey as symbol]: table },
        stubs: { Button: true },
      },
    });
    await wrapper.get('[data-value="stopwatch"]').trigger("click");
    expect(device.demo.session?.mode).toBe("stopwatch");
    expect(wrapper.get('[role="status"]').text()).toContain("正计时");
    const copy = createPreviewDevice("B", device.selection, device.demo);
    await wrapper.get('[data-value="countdown"]').trigger("click");
    expect(copy.demo.session?.mode).toBe("stopwatch");
    expect(device.demo.session?.mode).toBe("countdown");
    wrapper.unmount();
  });
});
