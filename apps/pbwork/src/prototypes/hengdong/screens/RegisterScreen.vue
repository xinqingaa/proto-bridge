<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import {
  isValidHengdongUsername,
  normalizeHengdongUsername,
} from "../model";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import { registerHengdong } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const prefilled = computed(() =>
  ["ready", "replace-identity", "replace-confirm-open"].includes(
    variant.value,
  ),
);
const isReplacing = computed(() =>
  ["replace-identity", "replace-confirm-open"].includes(variant.value),
);
const name = ref(prefilled.value ? "周宁" : "");
const username = ref(prefilled.value ? "zhou_ning" : "");
const password = ref(prefilled.value ? "123456" : "");
const weeklyTarget = ref("每周 3 次");
const attempted = ref(variant.value === "validation-error");
const confirmOpen = ref(variant.value === "replace-confirm-open");

const nameError = computed(() =>
  attempted.value && !name.value.trim() ? "请输入怎么称呼你" : "",
);
const usernameError = computed(() => {
  if (!attempted.value) return "";
  if (!username.value.trim()) return "请输入账号";
  return isValidHengdongUsername(username.value)
    ? ""
    : "账号使用 3–20 位字母、数字或下划线";
});
const passwordError = computed(() => {
  if (!attempted.value) return "";
  if (!password.value) return "请输入密码";
  return password.value.length >= 6 ? "" : "密码至少 6 位";
});
const formValid = computed(
  () =>
    Boolean(name.value.trim()) &&
    isValidHengdongUsername(username.value) &&
    password.value.length >= 6,
);

watch(variant, (value) => {
  confirmOpen.value = value === "replace-confirm-open";
});

function selectedWeeklySessions() {
  return Number.parseInt(weeklyTarget.value.replace(/\D/g, ""), 10) || 3;
}

function commitRegistration() {
  const normalized = normalizeHengdongUsername(username.value);
  registerHengdong(
    {
      id: `user-${normalized}`,
      name: name.value.trim(),
      username: normalized,
      password: password.value,
    },
    selectedWeeklySessions(),
  );
  void replaceHengdongScreen(router, route, "today");
}

function register() {
  attempted.value = true;
  if (!formValid.value) return;
  if (!isReplacing.value) {
    commitRegistration();
    return;
  }
  confirmOpen.value = true;
  void replaceVariant(router, route, "replace-confirm-open");
}

function updateConfirmOpen(value: boolean) {
  confirmOpen.value = value;
  if (!value && variant.value === "replace-confirm-open") {
    void replaceVariant(router, route, "replace-identity");
  }
}

function backToLogin() {
  void replaceHengdongScreen(router, route, "login");
}
</script>

<template>
  <main
    class="hd-auth"
    data-pb-id="hengdong.register.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
  >
    <div class="hd-auth-scroll">
      <div class="hd-auth-frame hd-auth-frame--register">
        <header class="hd-auth-brand hd-auth-brand--compact">
          <span
            class="hd-auth-mark hd-auth-mark--compact"
            aria-hidden="true"
            data-pb-id="hengdong.register.brand-mark"
            data-pb-role="image"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.primary"
            data-pb-token-size="sizing.avatar-md"
          >恒</span>
          <div class="hd-auth-copy">
            <span class="hd-overline">只保存在当前设备</span>
            <h1>{{ isReplacing ? "重新建立本地身份" : "从一周三次开始" }}</h1>
            <p class="hd-muted">
              {{
                isReplacing
                  ? "新凭据会替换旧凭据，训练记录继续保留。"
                  : "不需要邮箱验证，完成后直接进入今天。"
              }}
            </p>
          </div>
        </header>

        <form
          class="hd-auth-form"
          data-pb-id="hengdong.register.form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
          @submit.prevent="register"
        >
          <section
            v-if="isReplacing"
            class="hd-auth-replace-note"
            data-pb-id="hengdong.register.replace-note"
            data-pb-role="status"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.md"
            data-pb-token-spacing="spacing.md"
          >
            旧账号和密码将停止使用；计划与活动记录不会删除。
          </section>

          <TextField
            v-model="name"
            label="怎么称呼你"
            :show-label="true"
            autocomplete="name"
            :error-message="nameError"
            placeholder="例如：林然"
            inspect-id="hengdong.register.name"
          />
          <TextField
            v-model="username"
            label="账号"
            :show-label="true"
            autocomplete="username"
            :error-message="usernameError"
            placeholder="3–20 位字母、数字或下划线"
            inspect-id="hengdong.register.username"
          />
          <TextField
            v-model="password"
            label="密码"
            :show-label="true"
            type="password"
            autocomplete="new-password"
            revealable
            :error-message="passwordError"
            placeholder="至少 6 位"
            inspect-id="hengdong.register.password"
          />
          <Menu
            v-model="weeklyTarget"
            label="每周想活动几次"
            :options="['每周 2 次', '每周 3 次', '每周 4 次', '每周 5 次']"
            inspect-id="hengdong.register.weekly-target"
          />

          <div
            class="hd-auth-data-note"
            data-pb-id="hengdong.register.local-note"
            data-pb-role="text"
            data-pb-token-color="color.on-surface-muted"
            data-pb-token-typography="typography.caption"
            data-pb-token-spacing="spacing.sm"
          >
            <Icon name="shield-check" size="md" tone="primary" />
            <span>身份、计划和活动事实只保存在这台设备上。</span>
          </div>

          <div class="hd-auth-actions">
            <Button
              :label="isReplacing ? '继续替换身份' : '创建并开始'"
              block
              type="submit"
              inspect-id="hengdong.register.submit"
              data-pb-action="register"
            />
            <Button
              label="返回登录"
              variant="text"
              block
              inspect-id="hengdong.register.back-login"
              data-pb-action="back-login"
              @click="backToLogin"
            />
          </div>
        </form>
      </div>
    </div>

    <Confirm
      :model-value="confirmOpen"
      title="替换这台设备的本地身份？"
      message="原账号和密码将停止使用；计划、目标和活动记录继续保留。"
      confirm-label="确认替换"
      inspect-id="hengdong.register.replace-confirm"
      @update:model-value="updateConfirmOpen"
      @confirm="commitRegistration"
    />
  </main>
</template>
