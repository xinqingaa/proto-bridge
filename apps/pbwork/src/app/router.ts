import { createRouter, createWebHistory } from "vue-router";
import type { PrototypeLifecycle, TokenCategory } from "@/design-system/types";
import { TOKEN_CATEGORIES } from "@/design-system/types";

function isTokenCategory(value: string): value is TokenCategory {
  return (TOKEN_CATEGORIES as string[]).includes(value);
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/workbench/overview" },
    {
      path: "/workbench",
      component: () => import("@/workbench/WorkbenchLayout.vue"),
      children: [
        { path: "", redirect: "/workbench/overview" },
        {
          path: "overview",
          name: "workbench-overview",
          component: () => import("@/workbench/views/WorkbenchOverview.vue"),
          meta: {
            sectionId: "overview",
            resourceKind: "overview",
            title: "概览",
          },
        },
        {
          path: "capture",
          name: "workbench-capture",
          component: () => import("@/capture/CaptureConsole.vue"),
          meta: {
            sectionId: "overview",
            resourceKind: "capture",
            title: "证据采集",
          },
        },
        {
          path: "evidence/:bundleId/:snapshotId",
          name: "workbench-evidence",
          component: () => import("@/capture/EvidenceViewer.vue"),
          props: (route) => ({
            bundleId: String(route.params.bundleId),
            snapshotId: String(route.params.snapshotId),
          }),
          meta: {
            sectionId: "prototypes",
            resourceKind: "evidence",
            title: "采集结果",
          },
        },
        {
          path: "foundations/tokens/:category",
          name: "foundation-tokens",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "token",
            category: isTokenCategory(String(route.params.category))
              ? String(route.params.category)
              : "color",
          }),
          meta: {
            sectionId: "foundations",
            resourceKind: "token",
            title: "设计令牌",
          },
        },
        {
          path: "foundations/themes/:themeId",
          name: "foundation-themes",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "theme",
            themeId: String(route.params.themeId),
          }),
          meta: {
            sectionId: "foundations",
            resourceKind: "theme",
            title: "主题",
          },
        },
        {
          path: "components/:componentId",
          name: "component-playground",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "component",
            componentId: String(route.params.componentId),
          }),
          meta: {
            sectionId: "components",
            resourceKind: "component",
            title: "组件",
          },
        },
        {
          path: "prototypes/:lifecycle(all|active|review|final|archived)",
          name: "prototypes-lifecycle",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "prototype-list",
            lifecycle: String(route.params.lifecycle) as
              "all" | PrototypeLifecycle,
          }),
          meta: {
            sectionId: "prototypes",
            resourceKind: "lifecycle",
            title: "原型",
          },
        },
        {
          path: "prototypes/:prototypeId/screens/:screenSlug",
          name: "prototype-screen",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "screen",
            prototypeId: String(route.params.prototypeId),
            screenSlug: String(route.params.screenSlug),
          }),
          meta: {
            sectionId: "prototypes",
            resourceKind: "screen",
            title: "页面",
          },
        },
        {
          path: "prototypes/:prototypeId",
          name: "prototype-overview",
          component: () =>
            import("@/workbench/views/WorkbenchResourceView.vue"),
          props: (route) => ({
            kind: "prototype",
            prototypeId: String(route.params.prototypeId),
          }),
          meta: {
            sectionId: "prototypes",
            resourceKind: "prototype",
            title: "原型概要",
          },
        },
        {
          path: ":pathMatch(.*)*",
          redirect: "/workbench/overview",
        },
      ],
    },
    {
      path: "/prototype/:prototypeId/:screenSlug",
      name: "prototype-runtime",
      component: () => import("@/runtime/RuntimeLayout.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/workbench/overview",
    },
  ],
});
