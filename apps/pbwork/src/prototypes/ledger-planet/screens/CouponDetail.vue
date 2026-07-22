<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { coupons } from "../mock";

const route = useRoute();
const toast = ref(false);
const coupon = coupons[0]!;
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const used = computed(() => variant.value === "used");
</script>

<template>
  <LedgerPlanetShell title="券详情" active="权益" back-to="coupon-wallet">
    <div class="page" data-pb-id="ledger-planet.coupon-detail">
      <h1>{{ coupon.title }}</h1>
      <Chip :label="used ? '已使用' : '未使用'" :tone="used ? 'secondary' : 'success'" />
      <p>{{ coupon.subtitle }}</p>
      <section>
        <h2>使用说明</h2>
        <p>本券为原型 mock，点击「去使用」仅演示反馈，不产生真实核销。</p>
      </section>
      <Button
        :label="used ? '已使用' : '去使用'"
        :disabled="used"
        block
        @click="toast = true"
      />
    </div>
    <SnackbarToast v-model="toast" message="原型 mock：券使用成功" tone="info" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  justify-items: start;
  padding: 16px;
}
h1,
h2 {
  margin: 0;
  font: var(--pb-typography-title);
}
h2 {
  font: var(--pb-typography-subtitle);
}
p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
section {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
</style>
