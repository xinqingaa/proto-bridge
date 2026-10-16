<script setup lang="ts">
import { computed, ref } from "vue";
import {
  BarChart3,
  CircleCheckBig,
  Minus,
  Plus,
  Timer,
  X,
} from "lucide-vue-next";
import FreeCheckIn from "./FreeCheckIn.vue";
import FreeFocus from "./FreeFocus.vue";
import FreeReview from "./FreeReview.vue";
import HabitGlyph from "../HabitGlyph.vue";
import {
  HABIT_ICONS,
  NOW_LABEL,
  POMODORO,
  ROOT_TABS,
  formatElapsed,
  useYikeModel,
  type HabitIcon,
  type RootTab,
} from "../model";
import { FREE_ACCENTS, type FreeAccent, type FreeAppearance } from "./accents";
import "./free.css";

const props = defineProps<{
  tab: RootTab;
  dark: boolean;
  appearance: FreeAppearance;
  accent: FreeAccent;
}>();
const emit = defineEmits<{
  "update:tab": [RootTab];
  "update:appearance": [FreeAppearance];
  "update:accent": [FreeAccent];
}>();

const model = useYikeModel();
defineExpose({ model });

const tabIcons = { focus: Timer, checkin: CircleCheckBig, review: BarChart3 };

const accentStyle = computed(() => {
  const palette = FREE_ACCENTS[props.accent];
  const tone = props.dark ? palette.dark : palette.light;
  return {
    "--yf-accent": tone.solid,
    "--yf-accent-soft": tone.soft,
    "--yf-on-accent": tone.on,
  };
});

const abandonOpen = ref(false);
const settingsOpen = ref(false);
const createOpen = ref(false);
const soundOn = ref(true);

const draftName = ref("");
const draftIcon = ref<HabitIcon>("leaf");
const draftWeekly = ref(false);
const draftTimes = ref(3);
const draftError = ref("");

function openCreate() {
  draftName.value = "";
  draftIcon.value = "leaf";
  draftWeekly.value = false;
  draftTimes.value = 3;
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
    icon: draftIcon.value,
    frequency: draftWeekly.value
      ? { kind: "weekly", times: draftTimes.value }
      : { kind: "daily" },
  });
  createOpen.value = false;
  emit("update:tab", "checkin");
}

function confirmAbandon() {
  abandonOpen.value = false;
  model.abandon();
}
</script>

<template>
  <div class="yf-device" :class="{ 'is-dark': dark }" :style="accentStyle">
    <div class="yf-statusbar" aria-hidden="true">
      <span>{{ NOW_LABEL }}</span>
      <span class="yf-statusbar-dots"><i /><i /><i /></span>
    </div>

    <div class="yf-screen">
      <FreeFocus
        v-if="tab === 'focus'"
        :model="model"
        @settings="settingsOpen = true"
        @abandon="abandonOpen = true"
      />
      <FreeCheckIn
        v-else-if="tab === 'checkin'"
        :model="model"
        @create="openCreate"
      />
      <FreeReview v-else :model="model" />
    </div>

    <transition name="yf-rise">
      <div v-if="model.snackbar.value" class="yf-snackbar" role="status">
        <span>{{ model.snackbar.value.message }}</span>
        <button
          v-if="model.snackbar.value.undo"
          type="button"
          @click="model.snackbar.value.undo?.()"
        >
          撤销
        </button>
      </div>
    </transition>

    <nav class="yf-tabbar" aria-label="主导航">
      <button
        v-for="item in ROOT_TABS"
        :key="item.value"
        type="button"
        :class="{ 'is-active': tab === item.value }"
        :aria-current="tab === item.value ? 'page' : undefined"
        @click="emit('update:tab', item.value)"
      >
        <component :is="tabIcons[item.value]" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <!-- Abandon confirmation -->
    <transition name="yf-fade">
      <div
        v-if="abandonOpen"
        class="yf-scrim"
        @click.self="abandonOpen = false"
      >
        <div
          class="yf-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="yf-abandon-title"
        >
          <h3 id="yf-abandon-title">放弃这一轮？</h3>
          <p>
            已经专注了
            <strong>{{ formatElapsed(model.elapsedMs.value) }}</strong>
            ，放弃后不会记入回顾。
          </p>
          <div class="yf-dialog-actions">
            <button
              class="yf-quiet is-danger"
              type="button"
              @click="confirmAbandon"
            >
              放弃
            </button>
            <button
              class="yf-primary"
              type="button"
              @click="abandonOpen = false"
            >
              继续专注
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Settings -->
    <transition name="yf-sheet">
      <div
        v-if="settingsOpen"
        class="yf-scrim is-sheet"
        @click.self="settingsOpen = false"
      >
        <section
          class="yf-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="设置"
        >
          <header class="yf-sheet-head">
            <h3>设置</h3>
            <button
              class="yf-icon-button"
              type="button"
              aria-label="关闭"
              @click="settingsOpen = false"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="yf-setting">
            <span class="yf-section-label">外观</span>
            <div class="yf-choice-row" role="radiogroup" aria-label="外观">
              <button
                v-for="option in [
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                  { value: 'system', label: '跟随系统' },
                ] as const"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="appearance === option.value"
                :class="{ 'is-active': appearance === option.value }"
                @click="emit('update:appearance', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="yf-setting">
            <span class="yf-section-label">主题色</span>
            <div class="yf-swatches" role="radiogroup" aria-label="主题色">
              <button
                v-for="(palette, id) in FREE_ACCENTS"
                :key="id"
                type="button"
                role="radio"
                :aria-checked="accent === id"
                :aria-label="palette.label"
                :class="{ 'is-active': accent === id }"
                :style="{
                  '--swatch': dark ? palette.dark.solid : palette.light.solid,
                }"
                @click="emit('update:accent', id)"
              >
                <span />
                <small>{{ palette.label }}</small>
              </button>
            </div>
          </div>

          <div class="yf-setting">
            <span class="yf-section-label">番茄时长</span>
            <dl class="yf-durations">
              <div>
                <dt>专注</dt>
                <dd>{{ POMODORO.focus }}<small>分</small></dd>
              </div>
              <div>
                <dt>短休</dt>
                <dd>{{ POMODORO.shortBreak }}<small>分</small></dd>
              </div>
              <div>
                <dt>长休</dt>
                <dd>{{ POMODORO.longBreak }}<small>分</small></dd>
              </div>
              <div>
                <dt>长休间隔</dt>
                <dd>{{ POMODORO.roundsPerLongBreak }}<small>轮</small></dd>
              </div>
            </dl>
          </div>

          <label class="yf-toggle-row">
            <span>结束时提示音</span>
            <input v-model="soundOn" type="checkbox" role="switch" />
          </label>
        </section>
      </div>
    </transition>

    <!-- Create habit -->
    <transition name="yf-sheet">
      <div
        v-if="createOpen"
        class="yf-scrim is-sheet"
        @click.self="createOpen = false"
      >
        <form
          class="yf-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="新建习惯"
          @submit.prevent="saveHabit"
        >
          <header class="yf-sheet-head">
            <h3>新建习惯</h3>
            <button
              class="yf-icon-button"
              type="button"
              aria-label="关闭"
              @click="createOpen = false"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <label class="yf-field" :class="{ 'has-error': draftError }">
            <span class="yf-section-label">名字</span>
            <input
              v-model="draftName"
              type="text"
              placeholder="比如：拉伸 5 分钟"
              maxlength="16"
              @input="draftError = ''"
            />
            <small v-if="draftError">{{ draftError }}</small>
          </label>

          <div class="yf-setting">
            <span class="yf-section-label">图标</span>
            <div class="yf-icon-choices" role="radiogroup" aria-label="图标">
              <button
                v-for="option in HABIT_ICONS"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="draftIcon === option.value"
                :aria-label="option.label"
                :class="{ 'is-active': draftIcon === option.value }"
                @click="draftIcon = option.value"
              >
                <HabitGlyph :icon="option.value" />
              </button>
            </div>
          </div>

          <div class="yf-setting">
            <span class="yf-section-label">频率</span>
            <div class="yf-choice-row" role="radiogroup" aria-label="频率">
              <button
                type="button"
                role="radio"
                :aria-checked="!draftWeekly"
                :class="{ 'is-active': !draftWeekly }"
                @click="draftWeekly = false"
              >
                每天
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="draftWeekly"
                :class="{ 'is-active': draftWeekly }"
                @click="draftWeekly = true"
              >
                每周几次
              </button>
            </div>
            <div v-if="draftWeekly" class="yf-stepper">
              <button
                type="button"
                aria-label="减少一次"
                :disabled="draftTimes <= 1"
                @click="draftTimes -= 1"
              >
                <Minus aria-hidden="true" />
              </button>
              <span
                >每周 <strong>{{ draftTimes }}</strong> 次</span
              >
              <button
                type="button"
                aria-label="增加一次"
                :disabled="draftTimes >= 6"
                @click="draftTimes += 1"
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
          </div>

          <button class="yf-primary is-block" type="submit">保存习惯</button>
        </form>
      </div>
    </transition>
  </div>
</template>
