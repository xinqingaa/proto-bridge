<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Eye, EyeOff } from "lucide-vue-next";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import Card from "@/design-system/components/basic/Card.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Divider from "@/design-system/components/basic/Divider.vue";
import { formatMoney } from "../mock";

const route = useRoute();
const router = useRouter();
const hidden = ref(false);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const total = 12480.5;

function go(slug: string, nextVariant = "default") {
  void router.push(
    `/prototype/ledger-planet/${slug}?variant=${nextVariant}&theme=${theme.value}`,
  );
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

    <Card title="总资产" subtitle="钱包与账本结余">
      <div class="asset">
        <div class="asset-top">
          <strong>
            {{ hidden ? "****" : `¥ ${formatMoney(total)}` }}
          </strong>
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
        <p>
          钱包 {{ hidden ? "***" : "3,200" }} · 本月结余
          {{ hidden ? "***" : "840" }} · 券 3
        </p>
        <div class="asset-actions">
          <Button label="钱包" @click="go('wallet')" />
          <Button label="分析" variant="outlined" @click="go('analytics')" />
        </div>
      </div>
    </Card>

    <div class="shortcuts">
      <button type="button" @click="go('wallet')">钱包</button>
      <button type="button" @click="go('help-center')">帮助中心</button>
    </div>

    <section class="group">
      <button type="button" @click="go('profile')">
        个人资料 <span>›</span>
      </button>
      <Divider />
      <button type="button" @click="go('settings')">设置 <span>›</span></button>
    </section>
    <section class="group">
      <button type="button" @click="go('help-center')">
        帮助中心 <span>›</span>
      </button>
      <Divider />
      <button type="button" @click="go('about')">
        关于账本星球 <span>›</span>
      </button>
    </section>
    <p class="version">v0.1.0</p>
  </div>
</template>

<style scoped>
.page {
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
.asset {
  display: grid;
  gap: 10px;
}
.asset-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.asset-top strong {
  font: var(--pb-typography-title-lg);
}
.eye {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--pb-radius-full);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  cursor: pointer;
}
.asset p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.asset-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.shortcuts button {
  min-height: 44px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  font: var(--pb-typography-subtitle);
  cursor: pointer;
}
.group {
  display: grid;
  padding: 4px 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
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
