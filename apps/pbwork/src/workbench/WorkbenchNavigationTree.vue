<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type Component } from "vue";
import { RouterLink } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import type { WorkbenchNavigationTreeNode } from "@/workbench/navigation";

defineOptions({ name: "WorkbenchNavigationTree" });

const props = defineProps<{
  nodes: WorkbenchNavigationTreeNode[];
  expandedIds: string[];
  activeId: string;
  attentionCounts: Record<string, number>;
  depth: number;
  iconFor: (node: WorkbenchNavigationTreeNode) => Component | null;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();

const root = ref<HTMLElement | null>(null);

async function revealActiveNode() {
  await nextTick();
  root.value
    ?.querySelector(".nav-node.is-active")
    ?.scrollIntoView({ block: "nearest" });
}

onMounted(revealActiveNode);
watch(() => props.activeId, revealActiveNode);

const depthClass = computed(() => `tree-depth-${Math.min(props.depth, 4)}`);

function hasChildren(node: WorkbenchNavigationTreeNode): boolean {
  return Boolean(node.children?.length);
}

function isExpanded(node: WorkbenchNavigationTreeNode): boolean {
  return props.expandedIds.includes(node.id);
}
</script>

<template>
  <div
    ref="root"
    class="nav-tree"
    :class="depthClass"
    :role="depth === 0 ? 'tree' : 'group'"
  >
    <div v-for="node in nodes" :key="node.id" class="nav-branch">
      <div
        class="nav-node"
        :class="[
          `is-${node.kind}`,
          {
            'is-active': activeId === node.id,
            'has-children': hasChildren(node),
          },
        ]"
        role="treeitem"
        :aria-expanded="hasChildren(node) ? isExpanded(node) : undefined"
      >
        <button
          v-if="hasChildren(node)"
          type="button"
          class="node-toggle"
          :aria-label="`${isExpanded(node) ? '收起' : '展开'} ${node.label}`"
          @click="emit('toggle', node.id)"
        >
          <ChevronRight
            :size="14"
            class="node-chevron"
            :class="{ 'is-open': isExpanded(node) }"
            aria-hidden="true"
          />
        </button>
        <span
          v-else-if="
            node.kind === 'prototype' ||
            node.kind === 'screen' ||
            node.kind === 'variant'
          "
          class="node-toggle-spacer"
        />

        <component
          :is="node.to ? RouterLink : 'button'"
          class="node-content"
          :to="node.to"
          :type="node.to ? undefined : 'button'"
          :aria-current="activeId === node.id ? 'page' : undefined"
          @click="!node.to && hasChildren(node) && emit('toggle', node.id)"
        >
          <component
            :is="iconFor(node)"
            v-if="iconFor(node)"
            class="node-icon"
            :size="node.kind === 'section' ? 18 : 16"
            aria-hidden="true"
          />
          <span class="node-label">{{ node.label }}</span>
          <span
            v-if="attentionCounts[node.id]"
            class="node-attention"
            :aria-label="`${attentionCounts[node.id]} 条未完成评论`"
            >{{ attentionCounts[node.id] }}</span
          >
          <span
            v-if="node.count !== undefined"
            class="node-count"
            aria-hidden="true"
            >{{ node.count }}</span
          >
        </component>
      </div>

      <WorkbenchNavigationTree
        v-if="hasChildren(node) && isExpanded(node)"
        :nodes="node.children ?? []"
        :expanded-ids="expandedIds"
        :active-id="activeId"
        :attention-counts="attentionCounts"
        :depth="depth + 1"
        :icon-for="iconFor"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.nav-tree {
  display: grid;
  gap: 2px;
}
.nav-tree[role="group"] {
  position: relative;
  margin-left: 0;
  padding-left: 0;
}
.nav-node {
  display: flex;
  min-height: 36px;
  align-items: center;
  border-radius: 10px;
  color: rgb(var(--v-theme-on-surface));
}
.nav-node:hover {
  background: var(--shell-soft);
}
.nav-node.is-active {
  color: rgb(var(--v-theme-primary));
  background: var(--shell-soft-strong);
}
.nav-node.is-section {
  min-height: 40px;
  font-size: 0.8125rem;
  font-weight: 600;
}
.nav-node.is-group {
  min-height: 36px;
  margin: 4px 4px 2px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.nav-node.is-item,
.nav-node.is-lifecycle {
  min-height: 40px;
  margin: 0 4px 2px;
  font-size: 0.8125rem;
  font-weight: 400;
}
.nav-node.is-prototype {
  font-size: 0.875rem;
}
.nav-node.is-screen {
  font-size: 0.8125rem;
}
.nav-node.is-prototype .node-label,
.nav-node.is-screen .node-label {
  font-weight: 600;
}
.nav-node.is-prototype .node-label {
  font-weight: 700;
}
.nav-node.is-variant {
  min-height: 30px;
  color: var(--shell-muted);
  font-size: 0.75rem;
  font-weight: 500;
}
.node-toggle,
.node-toggle-spacer {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
}
.node-toggle {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: var(--shell-muted);
  background: transparent;
  cursor: pointer;
}
.node-toggle:hover {
  color: rgb(var(--v-theme-on-surface));
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-on-surface)) 7%,
    transparent
  );
}
.node-chevron {
  transition: transform 140ms ease;
}
.node-chevron.is-open {
  transform: rotate(90deg);
}
.node-content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: inherit;
  align-items: center;
  gap: 10px;
  padding: 0 8px 0 2px;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  text-decoration: none;
  font: inherit;
  cursor: pointer;
}
.nav-node.is-section .node-content,
.nav-node.is-item .node-content,
.nav-node.is-lifecycle .node-content {
  padding-left: 12px;
}
.node-icon {
  flex: 0 0 auto;
  opacity: 0.85;
}
.node-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-count,
.node-attention {
  display: inline-grid;
  flex: 0 0 auto;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-on-surface)) 7%,
    transparent
  );
  color: var(--shell-muted);
  font-size: 0.625rem;
  font-weight: 650;
}
.node-attention {
  min-width: 18px;
  height: 18px;
  padding-inline: 5px;
  color: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 75%,
    rgb(var(--v-theme-on-surface))
  );
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 16%, transparent);
}
.is-active .node-count {
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
}
</style>
