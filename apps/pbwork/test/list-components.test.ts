import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DataList from "@/design-system/components/complex/DataList.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";

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
});
