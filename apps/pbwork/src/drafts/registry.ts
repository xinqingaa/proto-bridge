import type { Component } from "vue";

type DraftModule = { default: Component };

const draftModules = import.meta.glob<DraftModule>("./*/DraftPage.vue");

export const draftLabels: Record<string, string> = {
  "workbench-overview": "工作台概览",
};

export const draftRecords = Object.entries(draftModules)
  .map(([path, load]) => {
    const directory = path.match(/^\.\/([^/]+)\/DraftPage\.vue$/)?.[1];
    return directory ? { id: directory, load } : null;
  })
  .filter((record): record is NonNullable<typeof record> => Boolean(record))
  .sort((left, right) => left.id.localeCompare(right.id));
