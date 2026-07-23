<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import SearchBar from "@/design-system/components/complex/SearchBar.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import { helpTopics } from "../mock";
import { pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const query = ref("");

const rows = computed(() => {
  const q = query.value.trim();
  if (!q) return helpTopics;
  return helpTopics.filter(
    (item) => item.title.includes(q) || item.subtitle.includes(q),
  );
});

function open(id: string) {
  void pushStack(router, route, "我的", "help-article", {
    query: { article: id },
  });
}
</script>

<template>
  <LedgerPlanetShell title="帮助中心" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.help-center">
      <SearchBar v-model="query" placeholder="搜索问题" />
      <DataList surface="none" rounded="none">
        <button
          v-for="item in rows"
          :key="item.id"
          type="button"
          class="row"
          @click="open(item.id)"
        >
          <div>
            <strong>{{ item.title }}</strong
            ><span>{{ item.subtitle }}</span>
          </div>
          <span class="chev">›</span>
        </button>
      </DataList>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 10px;
  padding: 16px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 12px 2px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.row strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.chev {
  color: var(--pb-color-on-surface-muted);
  font-size: 20px;
}
</style>
