import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  COMMENT_STORAGE_KEY,
  parseCommentStore,
  useCommentsStore,
} from "@/app/stores/comments";

const context = {
  prototypeId: "cold-chain-ops",
  screenId: "cold-chain-ops.exception-queue",
  variantId: "default",
  themeId: "light",
};

describe("local comments", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("persists, resolves, reopens, edits and removes comments", () => {
    const store = useCommentsStore();
    const item = store.add(
      context,
      {
        elementId: "exception-queue.first-row",
        selector: '[data-pb-id="exception-queue.first-row"]',
        point: { x: 24, y: 80 },
      },
      "  调整标题层级  ",
    );

    expect(item.content).toBe("调整标题层级");
    expect(parseCommentStore(localStorage.getItem(COMMENT_STORAGE_KEY)!).comments).toHaveLength(1);
    store.setStatus(item.id, "resolved");
    expect(store.comments[0]?.status).toBe("resolved");
    store.setStatus(item.id, "open");
    store.edit(item.id, "新的建议");
    expect(store.comments[0]?.content).toBe("新的建议");
    store.remove(item.id);
    expect(store.comments).toEqual([]);
  });

  it("rejects empty and oversized content", () => {
    const store = useCommentsStore();
    expect(() => store.add(context, { point: { x: 0, y: 0 } }, "   ")).toThrow("INVALID_COMMENT_LENGTH");
    expect(() => store.add(context, { point: { x: 0, y: 0 } }, "x".repeat(4001))).toThrow("INVALID_COMMENT_LENGTH");
  });

  it("does not overwrite invalid or unknown-version data", () => {
    localStorage.setItem(COMMENT_STORAGE_KEY, '{"schemaVersion":3,"comments":[]}');
    setActivePinia(createPinia());
    const store = useCommentsStore();
    expect(store.readError).toBe("UNKNOWN_COMMENT_SCHEMA");
    expect(store.unreadableRaw).toContain('"schemaVersion":3');
    expect(() => store.add(context, { point: { x: 1, y: 1 } }, "test")).toThrow("COMMENT_STORE_UNREADABLE");
    expect(localStorage.getItem(COMMENT_STORAGE_KEY)).toContain('"schemaVersion":3');
  });

  it("rejects legacy schema v1 without a compatibility layer", () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      comments: [{
        id: "legacy",
        prototypeId: "cold-chain-ops",
        screenId: "cold-chain-ops.exception-queue",
        elementId: "exception-queue.first-row",
        content: "旧评论",
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }],
    });
    expect(() => parseCommentStore(raw)).toThrow("UNKNOWN_COMMENT_SCHEMA");
  });

  it("validates stored field shapes", () => {
    expect(() => parseCommentStore('{"schemaVersion":1,"comments":[{"id":1}]}')).toThrow("UNKNOWN_COMMENT_SCHEMA");
    expect(() => parseCommentStore("not-json")).toThrow();
  });
});
