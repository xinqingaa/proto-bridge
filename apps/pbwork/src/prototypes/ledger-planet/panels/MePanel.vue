<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Eye, EyeOff } from "lucide-vue-next";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Divider from "@/design-system/components/basic/Divider.vue";
import { formatMoney } from "../mock";
import { pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const hidden = ref(false);
const total = 12480.5;

function go(slug: string, nextVariant = "default") {
  void pushStack(router, route, "我的", slug, { variant: nextVariant });
}
</script>

<template>
  <div class="page" data-pb-id="ledger-planet.me-home">
    <button type="button" class="profile" @click="go('profile')">
      <Avatar name="星辰同学" size="lg" />
      <div>
        <h1>星辰同学</h1>
        <Chip label="记账达人 · Lv.3" tone="secondary" />
      </div>
      <span class="chev">›</span>
    </button>

    <section class="asset-hero">
      <div class="asset-top">
        <div>
          <span class="label">总资产</span>
          <strong>
            {{ hidden ? "****" : `¥ ${formatMoney(total)}` }}
          </strong>
        </div>
        <button
          type="button"
          class="eye"
          :aria-label="hidden ? '显示金额' : '隐藏金额'"
          @click="hidden = !hidden"
        >
          <EyeOff v-if="hidden" :size="18" />
          <Eye v-else :size="18" />
        </button>
      </div>
      <div class="asset-grid">
        <button type="button" @click="go('wallet')">
          <span>钱包</span>
          <em>{{ hidden ? "***" : "3,200" }}</em>
        </button>
        <button type="button" @click="go('analytics')">
          <span>本月结余</span>
          <em>{{ hidden ? "***" : "840" }}</em>
        </button>
        <button type="button" @click="go('coupon-wallet')">
          <span>券</span>
          <em>3</em>
        </button>
      </div>
    </section>

    <section class="group">
      <button type="button" @click="go('profile')">
        个人资料 <span>›</span>
      </button>
      <Divider />
      <button type="button" @click="go('settings')">设置 <span>›</span></button>
      <Divider />
      <button type="button" @click="go('help-center')">
        帮助中心 <span>›</span>
      </button>
      <Divider />
      <button type="button" @click="go('about')">
        关于账本星球 <span>›</span>
      </button>
    </section>
    <p class="version">v0.1.0 · 账本星球</p>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 16px;
}
.profile {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.profile h1 {
  margin: 0 0 6px;
  font: var(--pb-typography-title);
}
.chev {
  color: var(--pb-color-on-surface-muted);
  font-size: 22px;
}
.asset-hero {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: var(--pb-radius-lg);
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 24%, var(--pb-color-border));
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 7%,
    var(--pb-color-surface)
  );
  box-shadow:
    0 14px 34px
      color-mix(in srgb, var(--pb-color-on-background) 8%, transparent),
    inset 0 1px 0
      color-mix(in srgb, var(--pb-color-surface-raised) 76%, transparent);
  backdrop-filter: blur(14px);
}
.asset-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.asset-top .label {
  display: block;
  margin-bottom: 4px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.asset-top strong {
  font: var(--pb-typography-title-lg);
  letter-spacing: -0.02em;
}
.eye {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--pb-radius-full);
  background: color-mix(in srgb, var(--pb-color-surface) 60%, transparent);
  color: var(--pb-color-on-surface-muted);
  cursor: pointer;
}
.asset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.asset-grid button {
  display: grid;
  gap: 4px;
  padding: 10px 8px;
  border: 0;
  border-radius: var(--pb-radius-md);
  background: color-mix(in srgb, var(--pb-color-surface) 70%, transparent);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.asset-grid span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.asset-grid em {
  font: var(--pb-typography-subtitle);
  font-style: normal;
}
.group {
  display: grid;
  padding: 4px 14px;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  border: 1px solid color-mix(in srgb, var(--pb-color-border) 76%, transparent);
}
.group > button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--pb-typography-content);
  cursor: pointer;
}
.version {
  margin: 0;
  text-align: center;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
