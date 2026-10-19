<script setup lang="ts">
import { useSlots } from "vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
defineProps<{
  title: string;
  screenId: string;
  showBack?: boolean;
  launch?: boolean;
}>();
defineEmits<{ back: [] }>();
const slots = useSlots();
</script>
<template>
  <div
    class="prototype-shell"
    :class="{
      'has-custom-header': !launch && Boolean(slots['app-bar']),
      'without-navigation': !launch && !slots.navigation,
    }"
  >
    <template v-if="launch"><slot name="launch" /></template>
    <template v-else>
      <slot name="app-bar"
        ><AppBar
          :title="title"
          :show-back="Boolean(showBack)"
          :inspect-id="`${screenId}.app-bar`"
          @back="$emit('back')"
      /></slot>
      <main><slot /></main>
      <slot name="navigation" />
    </template>
  </div>
</template>
<style scoped>
.prototype-shell {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: var(--pb-layout-fill);
  max-height: var(--pb-layout-fill);
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}
main {
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-layout-zero);
  overflow: hidden;
}
:global(html.pbwork-runtime-embedded) .prototype-shell {
  min-height: var(--pb-layout-fill);
  max-height: var(--pb-layout-fill);
}
</style>
