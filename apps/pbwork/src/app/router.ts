import { createRouter, createWebHistory } from "vue-router";
import RuntimeLayout from "@/runtime/RuntimeLayout.vue";
import WorkbenchLayout from "@/workbench/WorkbenchLayout.vue";
import WorkbenchResourceView from "@/workbench/views/WorkbenchResourceView.vue";
import type { PrototypeLifecycle, TokenCategory } from "@/design-system/types";
import { TOKEN_CATEGORIES } from "@/design-system/types";

function isTokenCategory(value: string): value is TokenCategory {
  return (TOKEN_CATEGORIES as string[]).includes(value);
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/workbench/foundations/tokens/color" },
    {
      path: "/workbench",
      component: WorkbenchLayout,
      children: [
        { path: "", redirect: "/workbench/foundations/tokens/color" },
        {
          path: "foundations/tokens/:category",
          name: "foundation-tokens",
          component: WorkbenchResourceView,
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
          component: WorkbenchResourceView,
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
          component: WorkbenchResourceView,
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
          component: WorkbenchResourceView,
          props: (route) => ({
            kind: "prototype-list",
            lifecycle: String(route.params.lifecycle) as
              | "all"
              | PrototypeLifecycle,
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
          component: WorkbenchResourceView,
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
          component: WorkbenchResourceView,
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
          redirect: "/workbench/foundations/tokens/color",
        },
      ],
    },
    {
      path: "/prototype/:prototypeId/:screenSlug",
      name: "prototype-runtime",
      component: RuntimeLayout,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/workbench/foundations/tokens/color",
    },
  ],
});
