<script setup lang="ts">
import type { CaptureFailureGroup } from "@/capture/presentation";

defineProps<{ groups: CaptureFailureGroup[] }>();
</script>

<template>
  <div class="failure-groups">
    <article
      v-for="group in groups"
      :key="group.kind"
      class="failure-group"
      data-testid="capture-failure-group"
    >
      <header>
        <strong>{{ group.title }}</strong>
        <span>{{ group.cases.length }} 项</span>
      </header>
      <p>{{ group.message }}</p>
      <p class="failure-action">{{ group.action }}</p>
      <ul>
        <li v-for="item in group.cases" :key="item.caseId">
          <span>{{ item.label }}</span>
          <code v-if="item.fragment">{{ item.fragment }}</code>
        </li>
      </ul>
      <details>
        <summary>技术详情</summary>
        <code v-for="item in group.cases" :key="item.caseId">
          {{ item.caseId }}：{{ item.technicalDetail }}
        </code>
      </details>
    </article>
  </div>
</template>

<style scoped>
.failure-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.failure-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 15px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.failure-group header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.failure-group header strong {
  font-size: 0.84rem;
}
.failure-group header span {
  color: rgb(var(--v-theme-error));
  font-size: 0.72rem;
  font-weight: 700;
}
.failure-group p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.74rem;
  line-height: 1.55;
}
.failure-group .failure-action {
  color: rgb(var(--v-theme-on-surface));
}
.failure-group ul {
  display: flex;
  margin: 2px 0 0;
  padding: 0;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}
.failure-group li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  font-size: 0.74rem;
}
.failure-group code {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.67rem;
  overflow-wrap: anywhere;
}
.failure-group details {
  font-size: 0.7rem;
}
.failure-group summary {
  color: rgba(var(--v-theme-on-surface), 0.58);
  cursor: pointer;
}
.failure-group details code {
  display: block;
  margin-top: 4px;
}
</style>
