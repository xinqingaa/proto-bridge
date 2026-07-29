import { defineStore } from "pinia";

export type CommentPoint = { x: number; y: number };
export type CommentBox = { x: number; y: number; width: number; height: number };

export type LocalComment = {
  id: string;
  prototypeId: string;
  screenId: string;
  screenSlug?: string;
  variantId?: string;
  themeId?: string;
  elementId?: string;
  elementKey?: string;
  selector?: string;
  elementLabel?: string;
  textSnapshot?: string;
  point?: CommentPoint;
  bbox?: CommentBox;
  content: string;
  status: "open" | "resolved";
  anchorStatus: "unknown" | "located" | "missing";
  lastLocatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentContext = {
  prototypeId: string;
  screenId: string;
  screenSlug?: string;
  variantId?: string;
  themeId?: string;
};

export type CommentTarget = {
  elementId?: string;
  elementKey?: string;
  selector?: string;
  elementLabel?: string;
  textSnapshot?: string;
  point?: CommentPoint;
  bbox?: CommentBox;
};

type StoredComments = { schemaVersion: 2; comments: LocalComment[] };

export const COMMENT_STORAGE_KEY = "pbwork.comments.v1";
export const COMMENT_LIMIT = 2000;
export const COMMENT_MAX_LENGTH = 4000;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isComment(value: unknown): value is LocalComment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.prototypeId !== "string" ||
    typeof item.screenId !== "string" ||
    typeof item.content !== "string" ||
    (item.status !== "open" && item.status !== "resolved") ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string"
  ) return false;
  if (item.content.trim().length < 1 || item.content.length > COMMENT_MAX_LENGTH) return false;
  for (const key of [
    "screenSlug",
    "variantId",
    "themeId",
    "elementId",
    "elementKey",
    "selector",
    "elementLabel",
    "textSnapshot",
    "lastLocatedAt",
  ] as const) {
    if (item[key] !== undefined && typeof item[key] !== "string") return false;
  }
  if (
    item.anchorStatus !== "unknown" &&
    item.anchorStatus !== "located" &&
    item.anchorStatus !== "missing"
  ) return false;
  if (item.point !== undefined) {
    const point = item.point as Record<string, unknown>;
    if (!point || !isNumber(point.x) || !isNumber(point.y)) return false;
  }
  if (item.bbox !== undefined) {
    const box = item.bbox as Record<string, unknown>;
    if (!box || !isNumber(box.x) || !isNumber(box.y) || !isNumber(box.width) || !isNumber(box.height)) return false;
  }
  return true;
}

export function parseCommentStore(raw: string): StoredComments {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("INVALID_COMMENT_STORE");
  const store = parsed as Record<string, unknown>;
  if (store.schemaVersion !== 2) {
    throw new Error("UNKNOWN_COMMENT_SCHEMA");
  }
  if (!Array.isArray(store.comments) || store.comments.length > COMMENT_LIMIT) {
    throw new Error("INVALID_COMMENT_STORE");
  }
  if (!store.comments.every(isComment)) throw new Error("INVALID_COMMENT_STORE");
  return {
    schemaVersion: 2,
    comments: store.comments as LocalComment[],
  };
}

function readStoredComments(): { comments: LocalComment[]; error: string | null; raw: string | null } {
  if (typeof window === "undefined") return { comments: [], error: null, raw: null };
  const raw = window.localStorage.getItem(COMMENT_STORAGE_KEY);
  if (!raw) return { comments: [], error: null, raw: null };
  try {
    return { comments: parseCommentStore(raw).comments, error: null, raw: null };
  } catch (error) {
    return {
      comments: [],
      error: error instanceof Error ? error.message : "INVALID_COMMENT_STORE",
      raw,
    };
  }
}

export const useCommentsStore = defineStore("comments", {
  state: () => {
    const stored = readStoredComments();
    return {
      comments: stored.comments,
      readError: stored.error,
      unreadableRaw: stored.raw,
    };
  },
  actions: {
    persist() {
      if (typeof window === "undefined" || this.readError) return;
      const payload: StoredComments = { schemaVersion: 2, comments: this.comments };
      window.localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(payload));
    },
    add(context: CommentContext, target: CommentTarget, content: string): LocalComment {
      const normalized = content.trim();
      if (!normalized || normalized.length > COMMENT_MAX_LENGTH) throw new Error("INVALID_COMMENT_LENGTH");
      if (this.comments.length >= COMMENT_LIMIT) throw new Error("COMMENT_LIMIT_REACHED");
      if (this.readError) throw new Error("COMMENT_STORE_UNREADABLE");
      const now = new Date().toISOString();
      const comment: LocalComment = {
        id: crypto.randomUUID(),
        prototypeId: context.prototypeId,
        screenId: context.screenId,
        ...(context.screenSlug ? { screenSlug: context.screenSlug } : {}),
        ...(context.variantId ? { variantId: context.variantId } : {}),
        ...(context.themeId ? { themeId: context.themeId } : {}),
        ...(target.elementId ? { elementId: target.elementId } : {}),
        ...(target.elementKey ? { elementKey: target.elementKey } : {}),
        ...(target.selector ? { selector: target.selector } : {}),
        ...(target.elementLabel ? { elementLabel: target.elementLabel } : {}),
        ...(target.textSnapshot ? { textSnapshot: target.textSnapshot } : {}),
        ...(target.point ? { point: target.point } : {}),
        ...(target.bbox ? { bbox: target.bbox } : {}),
        content: normalized,
        status: "open",
        anchorStatus: "unknown",
        createdAt: now,
        updatedAt: now,
      };
      this.comments.unshift(comment);
      this.persist();
      return comment;
    },
    edit(id: string, content: string) {
      const normalized = content.trim();
      if (!normalized || normalized.length > COMMENT_MAX_LENGTH) throw new Error("INVALID_COMMENT_LENGTH");
      const item = this.comments.find((comment) => comment.id === id);
      if (!item) return;
      item.content = normalized;
      item.updatedAt = new Date().toISOString();
      this.persist();
    },
    setStatus(id: string, status: LocalComment["status"]) {
      const item = this.comments.find((comment) => comment.id === id);
      if (!item) return;
      item.status = status;
      item.updatedAt = new Date().toISOString();
      this.persist();
    },
    setAnchorStatus(id: string, status: LocalComment["anchorStatus"]) {
      const item = this.comments.find((comment) => comment.id === id);
      if (!item) return;
      item.anchorStatus = status;
      item.lastLocatedAt = new Date().toISOString();
      this.persist();
    },
    remove(id: string) {
      this.comments = this.comments.filter((comment) => comment.id !== id);
      this.persist();
    },
    removeMany(ids: string[]) {
      const targets = new Set(ids);
      this.comments = this.comments.filter((comment) => !targets.has(comment.id));
      this.persist();
    },
    clearUnreadable() {
      if (typeof window !== "undefined") window.localStorage.removeItem(COMMENT_STORAGE_KEY);
      this.comments = [];
      this.readError = null;
      this.unreadableRaw = null;
    },
    clearAll() {
      if (typeof window !== "undefined") window.localStorage.removeItem(COMMENT_STORAGE_KEY);
      this.comments = [];
      this.readError = null;
      this.unreadableRaw = null;
    },
  },
});
