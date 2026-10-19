<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Button from "@/design-system/components/action/Button.vue";
import YikeAction from "../../components/YikeAction.vue";
import CheckIn from "../checkin/CheckIn.vue";
import HabitDetail from "../habit-detail/HabitDetail.vue";
import YikeHabitForm from "../../components/YikeHabitForm.vue";
import {
  emptyHabitDraft,
  type YikeHabitDraft,
} from "../../components/habit-form";
import { useYikeRuntime } from "../../runtime";
import { yikeNavigation } from "../../navigation";
import { scope } from "./screen";
import "../stack.css";

const route = useRoute(),
  router = useRouter();
const { store } = useYikeRuntime();
const nav = () => yikeNavigation(router, route, store);
const id = computed(() =>
  typeof route.query.habit === "string" ? route.query.habit : undefined,
);
const habit = computed(() =>
  store.data.habits.find((item) => item.id === id.value),
);
const draft = ref<YikeHabitDraft>(emptyHabitDraft());
const open = ref(false),
  saving = ref(false);
const leaving = ref(false);
const title = computed(() => (id.value ? "编辑习惯" : "新建习惯"));
function prepare() {
  if (route.params.screenSlug !== "habit-editor") return;
  draft.value = habit.value ? { ...habit.value } : emptyHabitDraft();
  saving.value = false;
  leaving.value = false;
  open.value = true;
}
watch(() => [id.value, store.presentation.revision], prepare);
onMounted(prepare);
function close() {
  if (leaving.value) return;
  leaving.value = true;
  open.value = false;
  void nav().editorBack(id.value);
}
async function save(value: YikeHabitDraft) {
  if (saving.value) return;
  saving.value = true;
  const savedId = id.value
    ? store.updateHabit(id.value, value)
      ? id.value
      : null
    : store.createHabit(value);
  if (!savedId) {
    saving.value = false;
    return;
  }
  store.presentation.message = `已保存：${value.name}`;
  leaving.value = true;
  open.value = false;
  await nav().editorSaved(savedId, Boolean(id.value));
}
</script>
<template>
  <PrototypeShell
    :title="title"
    :screen-id="scope.screenId"
    show-back
    @back="close"
  >
    <template #app-bar><span /></template>
    <div v-if="open && route.params.screenSlug === 'habit-editor'" class="editor-context" aria-hidden="true" inert>
      <HabitDetail v-if="id && habit" /><CheckIn v-else />
    </div>
    <BottomSheet
      :model-value="open"
      :title="title"
      material="glass"
      detent="expanded"
      :inspect-id="scope.id('panel')"
      @update:model-value="
        (value) => {
          if (!value) close();
        }
      "
    >
      <div
        :key="store.presentation.revision"
        v-pb="
          scope.node('root', 'section', {
            tokens: { gap: 'spacing.lg', color: 'color.on-surface' },
          })
        "
      >
        <YikeHabitForm
          v-if="!id || habit"
          v-model="draft"
          :submitting="saving"
          :show-save="false"
          :validate-on-mount="route.query.variant === 'invalid-name'"
          :inspect-id="scope.id('form')"
          @save="save"
        />
        <template v-else>
          <p role="status">这个习惯不存在或已删除。</p>
          <Button
            label="返回打卡"
            :inspect-id="scope.id('return')"
            @click="nav().home('checkin')"
          />
        </template>
      </div>
      <template v-if="!id || habit" #actions>
        <YikeAction
          type="submit"
          :form="scope.id('form')"
          label="保存"
          block
          :loading="saving"
          :inspect-id="scope.id('form.save')"
        />
      </template>
    </BottomSheet>
  </PrototypeShell>
</template>

<style scoped>
.editor-context {
  block-size: var(--pb-layout-fill);
  overflow: hidden;
}
</style>
