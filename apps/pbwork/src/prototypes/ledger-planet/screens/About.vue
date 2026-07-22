<script setup lang="ts">
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Divider from "@/design-system/components/basic/Divider.vue";
</script>

<template>
  <LedgerPlanetShell title="关于" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.about">
      <div class="brand">
        <strong>账本星球</strong>
        <span>清爽效率的离线账本原型</span>
      </div>
      <Divider />
      <dl>
        <div><dt>版本</dt><dd>v0.1.0</dd></div>
        <div><dt>构建</dt><dd>PBWork prototype</dd></div>
      </dl>
      <p>用户协议与隐私政策可复用帮助文章页承载（WebView mock）。</p>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  padding: 16px;
}
.brand {
  display: grid;
  gap: 6px;
  padding: 12px 0;
}
.brand strong {
  font: var(--pb-typography-title-lg);
}
.brand span,
p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
dl {
  display: grid;
  gap: 10px;
  margin: 0;
}
dl div {
  display: flex;
  justify-content: space-between;
}
dt {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
dd {
  margin: 0;
  font: var(--pb-typography-content);
}
</style>
