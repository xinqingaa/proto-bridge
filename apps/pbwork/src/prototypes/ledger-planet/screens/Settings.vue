<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import SwitchControl from "@/design-system/components/basic/SwitchControl.vue";
import Divider from "@/design-system/components/basic/Divider.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";

const route = useRoute();
const router = useRouter();
const notifications = ref(true);
const hideAmount = ref(false);
const toast = ref(false);

const dark = computed(() => route.query.theme === "dark");

watch(
  () => route.query.variant,
  (value) => {
    if (value === "dark" && route.query.theme !== "dark") {
      void router.replace({
        query: { ...route.query, theme: "dark", variant: "dark" },
      });
    }
  },
  { immediate: true },
);

function setDark(value: boolean) {
  void router.replace({
    query: {
      ...route.query,
      theme: value ? "dark" : "light",
      variant: value ? "dark" : "default",
    },
  });
}

function clearCache() {
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="设置" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.settings">
      <section class="group">
        <h2>偏好</h2>
        <SwitchControl
          :model-value="dark"
          label="深色主题"
          @update:model-value="setDark"
        />
        <Divider />
        <SwitchControl v-model="notifications" label="消息通知" />
        <Divider />
        <SwitchControl v-model="hideAmount" label="默认隐藏金额" />
      </section>
      <section class="group">
        <h2>账户与安全</h2>
        <p class="hint">手机号 138****2210 · 登录设备管理（mock）</p>
        <Divider />
        <SwitchControl :model-value="true" label="生物识别解锁（mock）" />
      </section>
      <Button label="清除缓存" variant="outlined" block @click="clearCache" />
      <Button label="退出登录" tone="error" variant="outlined" block />
    </div>
    <SnackbarToast v-model="toast" message="缓存已清除（mock）" tone="info" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.group {
  display: grid;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
.group h2 {
  margin: 0 0 6px;
  font: var(--pb-typography-subtitle);
}
.hint {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
