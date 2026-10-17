import type { Component } from "vue";

type DraftModule = { default: Component };

const draftModules = import.meta.glob<DraftModule>("./*/DraftPage.vue");

export const draftLabels: Record<string, string> = {
  "theme-studio": "主题与设计基础",
  "component-studio": "组件手机舞台",
  "workbench-overview": "工作台概览",
  "workbench-prototypes": "全部原型 / 详情",
  yike: "一刻 · 专注与打卡",
};

export const draftRecords = Object.entries(draftModules)
  .map(([path, load]) => {
    const directory = path.match(/^\.\/([^/]+)\/DraftPage\.vue$/)?.[1];
    return directory ? { id: directory, load } : null;
  })
  .filter((record): record is NonNullable<typeof record> => Boolean(record))
  .sort((left, right) => left.id.localeCompare(right.id));
