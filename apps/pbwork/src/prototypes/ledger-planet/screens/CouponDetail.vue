<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { coupons } from "../mock";
import { Clock3, MapPin, ShieldCheck } from "lucide-vue-next";

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
      <section class="coupon-hero">
        <div>
          <span>账本星球权益</span
          ><Chip
            :label="used ? '已使用' : '可使用'"
            :tone="used ? 'secondary' : 'success'"
          />
        </div>
        <h1>{{ coupon.title }}</h1>
        <p>全场通用 · 无最低消费限制</p>
        <footer><Clock3 :size="16" />{{ coupon.subtitle }}</footer>
      </section>
      <div class="facts">
        <span
          ><MapPin :size="18" /><i>适用范围</i
          ><strong>全部模拟商户</strong></span
        ><span
          ><ShieldCheck :size="18" /><i>券类型</i
          ><strong>自动核销</strong></span
        >
      </div>
      <section class="instructions">
        <h2>使用说明</h2>
        <ol>
          <li>点击下方「去使用」进入模拟核销流程</li>
          <li>同一张券仅可使用一次，不可叠加</li>
          <li>本券为原型 mock，不产生真实交易</li>
        </ol>
      </section>
      <Button
        :label="used ? '已使用' : '去使用'"
        :disabled="used"
        block
        @click="toast = true"
      />
    </div>
    <SnackbarToast
      v-model="toast"
      message="原型 mock：券使用成功"
      tone="info"
    />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.coupon-hero {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 28%, var(--pb-color-border));
  border-radius: var(--pb-radius-lg);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 9%,
    var(--pb-color-surface)
  );
  box-shadow: var(--pb-elevation-card);
}
.coupon-hero::before,
.coupon-hero::after {
  content: "";
  position: absolute;
  top: 62%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--pb-color-background);
  border: 1px solid var(--pb-color-border);
}
.coupon-hero::before {
  left: -10px;
}
.coupon-hero::after {
  right: -10px;
}
.coupon-hero > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.coupon-hero > div > span {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}
.coupon-hero footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--pb-color-border);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-block: 1px solid var(--pb-color-border);
}
.facts span {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 8px;
  padding: 12px;
}
.facts span + span {
  border-left: 1px solid var(--pb-color-border);
}
.facts svg {
  grid-row: 1 / 3;
  align-self: center;
  color: var(--pb-color-primary);
}
.facts i {
  color: var(--pb-color-on-surface-muted);
  font: normal var(--pb-typography-caption);
}
.facts strong {
  font: var(--pb-typography-label);
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
.instructions {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
.instructions ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
</style>
