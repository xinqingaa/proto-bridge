<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Textarea from "@/design-system/components/basic/Textarea.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";

const route = useRoute();
const name = ref("星辰同学");
const bio = ref("把每一笔都记清楚。");
const email = ref("starlight@example.com");
const city = ref("上海");
const toast = ref(false);

watch(
  () => route.query.variant,
  (value) => {
    toast.value = value === "toast-saved";
  },
  { immediate: true },
);

function save() {
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="个人资料" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.profile">
      <section class="identity">
        <Avatar :name="name" size="lg" />
        <div>
          <strong>{{ name }}</strong
          ><span>已记账 126 天 · Lv.4</span>
        </div>
        <button type="button" aria-label="更换头像">更换</button>
      </section>
      <div class="stats">
        <div><strong>486</strong><span>累计笔数</span></div>
        <div><strong>12</strong><span>连续天数</span></div>
        <div><strong>8</strong><span>获得权益</span></div>
      </div>
      <h2>基本信息</h2>
      <TextField v-model="name" label="昵称" />
      <TextField v-model="email" label="联系邮箱" />
      <TextField v-model="city" label="常住城市" />
      <Textarea v-model="bio" label="简介" />
      <Button label="保存" block @click="save" />
    </div>
    <SnackbarToast v-model="toast" message="资料已保存" tone="success" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.identity {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 22%, var(--pb-color-border));
  border-radius: var(--pb-radius-lg);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 6%,
    var(--pb-color-surface)
  );
}
.identity strong,
.identity span {
  display: block;
}
.identity span {
  margin-top: 3px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.identity button {
  border: 0;
  background: transparent;
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
  cursor: pointer;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding-block: 8px;
  border-block: 1px solid var(--pb-color-border);
}
.stats div {
  text-align: center;
}
.stats div + div {
  border-left: 1px solid var(--pb-color-border);
}
.stats strong,
.stats span {
  display: block;
}
.stats strong {
  font: var(--pb-typography-title);
}
.stats span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
h2 {
  margin: 4px 0 0;
  font: var(--pb-typography-subtitle);
}
</style>
