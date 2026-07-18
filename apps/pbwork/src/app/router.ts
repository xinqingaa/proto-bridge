import { createRouter, createWebHistory } from "vue-router";
import RuntimeLayout from "@/runtime/RuntimeLayout.vue";
import WorkbenchLayout from "@/workbench/WorkbenchLayout.vue";
import WorkbenchResourceView from "@/workbench/views/WorkbenchResourceView.vue";

const resourceView = WorkbenchResourceView;

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/workbench/foundations/tokens/colors" },
    {
      path: "/workbench",
      component: WorkbenchLayout,
      children: [
        { path: "", redirect: "/workbench/foundations/tokens/colors" },
        {
          path: "foundations/tokens/colors",
          name: "foundation-tokens",
          component: resourceView,
          meta: {
            sectionId: "foundations",
            resourceId: "tokens",
            title: "设计令牌",
            context: "颜色",
          },
        },
        {
          path: "foundations/themes/light",
          name: "foundation-themes",
          component: resourceView,
          meta: {
            sectionId: "foundations",
            resourceId: "themes",
            title: "主题",
            context: "默认主题",
          },
        },
        {
          path: "components/basic",
          name: "components-basic",
          component: resourceView,
          meta: {
            sectionId: "components",
            resourceId: "basic-components",
            title: "基础组件",
            context: "组件",
          },
        },
        {
          path: "components/complex",
          name: "components-complex",
          component: resourceView,
          meta: {
            sectionId: "components",
            resourceId: "complex-components",
            title: "复杂组件",
            context: "组件",
          },
        },
        {
          path: "prototypes/all",
          name: "prototypes-all",
          component: resourceView,
          meta: {
            sectionId: "prototypes",
            resourceId: "all-prototypes",
            title: "全部原型",
            context: "原型",
          },
        },
        {
          path: "prototypes/active",
          name: "prototypes-active",
          component: resourceView,
          meta: {
            sectionId: "prototypes",
            resourceId: "active-prototypes",
            title: "进行中",
            context: "原型",
          },
        },
        {
          path: "prototypes/review",
          name: "prototypes-review",
          component: resourceView,
          meta: {
            sectionId: "prototypes",
            resourceId: "review-prototypes",
            title: "待确认",
            context: "原型",
          },
        },
        {
          path: "prototypes/final",
          name: "prototypes-final",
          component: resourceView,
          meta: {
            sectionId: "prototypes",
            resourceId: "final-prototypes",
            title: "已定稿",
            context: "原型",
          },
        },
        {
          path: "prototypes/archived",
          name: "prototypes-archived",
          component: resourceView,
          meta: {
            sectionId: "prototypes",
            resourceId: "archived-prototypes",
            title: "已归档",
            context: "原型",
          },
        },
        {
          path: ":pathMatch(.*)*",
          redirect: "/workbench/foundations/tokens/colors",
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
      redirect: "/workbench/foundations/tokens/colors",
    },
  ],
});
