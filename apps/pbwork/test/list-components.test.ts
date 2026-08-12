import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";

describe("list component responsibilities", () => {
  it("DataList preserves arbitrary item markup and button semantics", () => {
    const wrapper = mount(DataList, {
      slots: {
        default:
          '<button type="button" data-row="first">第一项</button><article data-row="second">第二项</article>',
      },
    });

    expect(wrapper.attributes("role")).toBeUndefined();
    expect(wrapper.get("button").attributes("role")).toBeUndefined();
    expect(wrapper.findAll("[data-row]")).toHaveLength(2);
  });

  it("ScrollableDataList exposes controlled load-more and guards duplicate requests", async () => {
    const wrapper = mount(ScrollableDataList, {
      props: { loadMore: true, hasMore: true },
      slots: { default: "<div>内容</div>" },
      global: { stubs: { "v-progress-circular": true } },
    });

    const button = wrapper.get("button.pb-scrollable-data-list-more");
    await button.trigger("click");
    await button.trigger("click");
    expect(wrapper.emitted("load-more")).toHaveLength(1);

    await wrapper.setProps({ loadingMore: true });
    await wrapper.setProps({ loadingMore: false });
    await wrapper.get("button.pb-scrollable-data-list-more").trigger("click");
    expect(wrapper.emitted("load-more")).toHaveLength(2);
  });

  it("disconnects the load observer when unmounted", () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    const OriginalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
      constructor(_callback: IntersectionObserverCallback) {}
    } as unknown as typeof IntersectionObserver;

    const wrapper = mount(ScrollableDataList, {
      props: { loadMore: true },
    });
    expect(observe).toHaveBeenCalledOnce();
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
    globalThis.IntersectionObserver = OriginalObserver;
  });

  it("supports mouse drag scrolling without disabling native wheel scrolling", async () => {
    const wrapper = mount(ScrollableDataList, {
      props: {
        dragScroll: { enabled: true, mouse: true, momentum: false },
        pullRefresh: false,
      },
      slots: { default: '<button type="button">可点击行</button>' },
    });
    const root = wrapper.element as HTMLElement;
    root.scrollTop = 80;

    await wrapper.trigger("pointerdown", {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: 30,
      clientY: 140,
      timeStamp: 10,
    });
    await wrapper.trigger("pointermove", {
      pointerId: 7,
      pointerType: "mouse",
      clientX: 32,
      clientY: 60,
      timeStamp: 30,
    });
    expect(root.scrollTop).toBeGreaterThan(80);
    expect(wrapper.classes()).toContain("is-drag-scrolling");

    await wrapper.trigger("pointerup", {
      pointerId: 7,
      pointerType: "mouse",
      clientX: 32,
      clientY: 60,
      timeStamp: 40,
    });
    expect(wrapper.classes()).not.toContain("is-drag-scrolling");
    expect(wrapper.attributes("onwheel")).toBeUndefined();
  });

  it("turns a downward mouse drag at the top into one refresh request", async () => {
    const wrapper = mount(ScrollableDataList, {
      props: {
        pullRefresh: { enabled: true, mouse: true },
        dragScroll: { enabled: true, mouse: true, momentum: false },
      },
    });
    const root = wrapper.element as HTMLElement;
    root.scrollTop = 0;

    await wrapper.trigger("pointerdown", {
      pointerId: 9,
      pointerType: "mouse",
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    await wrapper.trigger("pointermove", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 22,
      clientY: 90,
    });
    await wrapper.trigger("pointerup", {
      pointerId: 9,
      pointerType: "mouse",
      clientX: 22,
      clientY: 90,
    });

    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });
});
