<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { BarChart3, CircleCheckBig, Timer } from "lucide-vue-next";
import Button from "@/design-system/components/action/Button.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import ConfirmDialog from "@/design-system/components/feedback/ConfirmDialog.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import DsCheckIn from "./DsCheckIn.vue";
import DsFocus from "./DsFocus.vue";
import DsReview from "./DsReview.vue";
import {
  NOW_LABEL,
  POMODORO,
  ROOT_TABS,
  formatElapsed,
  useYikeModel,
  type RootTab,
} from "../model";
import "./ds.css";

const props = defineProps<{ tab: RootTab; dark: boolean }>();
const emit = defineEmits<{
  "update:tab": [RootTab];
  "update:dark": [boolean];
}>();

const ATTACH = ".yd-device";

const model = useYikeModel();
defineExpose({ model });

const attachReady = ref(false);
onMounted(() => {
  attachReady.value = true;
});

const themeStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(props.dark ? "dark" : "light")),
);
const vuetifyTheme = computed(() =>
  props.dark ? "pbworkDark" : "pbworkLight",
);

const tabItems = ROOT_TABS.map((item) => ({
  ...item,
  icon: { focus: Timer, checkin: CircleCheckBig, review: BarChart3 }[
    item.value
  ],
}));

const toastMessage = computed(() => {
  const snackbar = model.snackbar.value;
  if (!snackbar) return "";
  return snackbar.undo
    ? `${snackbar.message}，再点一次可取消`
    : snackbar.message;
});

const abandonOpen = ref(false);
const abandonMessage = computed(
  () =>
    `已经专注了 ${formatElapsed(model.elapsedMs.value)}，放弃后不会记入回顾。`,
);

const settingsOpen = ref(false);
const appearance = computed(() => (props.dark ? "深色" : "浅色"));
const soundOn = ref(true);

const createOpen = ref(false);
const draftName = ref("");
const draftFrequency = ref("每天");
const draftError = ref("");

function openCreate() {
  draftName.value = "";
  draftFrequency.value = "每天";
  draftError.value = "";
  createOpen.value = true;
}

function saveHabit() {
  const name = draftName.value.trim();
  if (!name) {
    draftError.value = "给习惯起个名字";
    return;
  }
  model.addHabit({
    name,
    icon: "leaf",
    frequency:
      draftFrequency.value === "每天"
        ? { kind: "daily" }
        : { kind: "weekly", times: 3 },
  });
  createOpen.value = false;
}
</script>

<template>
  <v-theme-provider :theme="vuetifyTheme">
    <div class="yd-device" :style="themeStyle">
      <div class="yd-statusbar" aria-hidden="true">
        <span>{{ NOW_LABEL }}</span>
      </div>

      <div class="yd-screen">
        <DsFocus
          v-if="tab === 'focus'"
          :model="model"
          @settings="settingsOpen = true"
          @abandon="abandonOpen = true"
        />
        <DsCheckIn
          v-else-if="tab === 'checkin'"
          :model="model"
          @create="openCreate"
        />
        <DsReview v-else :model="model" />
      </div>

      <Tabbar
        :model-value="tab"
        :items="tabItems"
        inspect-id="yike-draft.tabbar"
        @update:model-value="emit('update:tab', $event as RootTab)"
      />

      <template v-if="attachReady">
        <Toast
          :model-value="Boolean(model.snackbar.value)"
          :message="toastMessage"
          attach=".yd-screen"
          inspect-id="yike-draft.toast"
          @update:model-value="!$event && model.dismissSnackbar()"
        />

        <ConfirmDialog
          v-model="abandonOpen"
          title="放弃这一轮？"
          :message="abandonMessage"
          confirm-label="放弃"
          cancel-label="继续专注"
          contained
          :attach="ATTACH"
          inspect-id="yike-draft.focus.abandon"
          @confirm="model.abandon()"
        />

        <BottomSheet
          v-model="settingsOpen"
          title="设置"
          :attach="ATTACH"
          inspect-id="yike-draft.settings"
        >
          <div class="yd-sheet-body">
            <RadioGroup
              label="外观"
              :model-value="appearance"
              :options="['浅色', '深色']"
              @update:model-value="emit('update:dark', $event === '深色')"
            />
            <p class="yd-caption">
              PBWork 主题只有一个主色，这一版没有主题色可选。
            </p>
            <DataList
              surface="raised"
              inspect-id="yike-draft.settings.durations"
            >
              <div class="yd-setting-row">
                <span>专注</span><strong>{{ POMODORO.focus }} 分钟</strong>
              </div>
              <div class="yd-setting-row">
                <span>短休息</span
                ><strong>{{ POMODORO.shortBreak }} 分钟</strong>
              </div>
              <div class="yd-setting-row">
                <span>长休息</span
                ><strong>{{ POMODORO.longBreak }} 分钟</strong>
              </div>
              <div class="yd-setting-row">
                <span>长休间隔</span
                ><strong>每 {{ POMODORO.roundsPerLongBreak }} 轮</strong>
              </div>
            </DataList>
            <SwitchControl
              v-model="soundOn"
              label="结束时提示音"
              inspect-id="yike-draft.settings.sound"
            />
          </div>
        </BottomSheet>

        <BottomSheet
          v-model="createOpen"
          title="新建习惯"
          :attach="ATTACH"
          inspect-id="yike-draft.habit-editor"
        >
          <div class="yd-sheet-body">
            <TextField
              v-model="draftName"
              label="名字"
              show-label
              placeholder="比如：拉伸 5 分钟"
              :error-message="draftError"
              inspect-id="yike-draft.habit-editor.name"
              @update:model-value="draftError = ''"
            />
            <RadioGroup
              v-model="draftFrequency"
              label="频率"
              :options="['每天', '每周 3 次']"
              inspect-id="yike-draft.habit-editor.frequency"
            />
          </div>
          <template #actions>
            <Button
              block
              label="保存习惯"
              inspect-id="yike-draft.habit-editor.save"
              @click="saveHabit"
            />
          </template>
        </BottomSheet>
      </template>
    </div>
  </v-theme-provider>
</template>
