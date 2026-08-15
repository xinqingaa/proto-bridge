<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import { replaceHengdongScreen } from "../nav";
import { loginHengdong } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const isNoIdentity = computed(() => variant.value === "no-identity");
const username = ref(
  ["ready", "invalid-credentials"].includes(variant.value) ? "demo" : "",
);
const password = ref(
  variant.value === "ready"
    ? "123456"
    : variant.value === "invalid-credentials"
      ? "wrong-password"
      : "",
);
const attempted = ref(
  ["validation-error", "invalid-credentials"].includes(variant.value),
);
const invalidAccount = ref(variant.value === "invalid-credentials");

const usernameError = computed(() =>
  attempted.value && !username.value.trim() ? "请输入账号" : "",
);
const passwordError = computed(() => {
  if (attempted.value && !password.value) return "请输入密码";
  return invalidAccount.value ? "账号或密码不正确" : "";
});

watch([username, password], () => {
  invalidAccount.value = false;
});

function login() {
  attempted.value = true;
  invalidAccount.value = false;
  if (!username.value.trim() || !password.value) return;
  if (!loginHengdong(username.value, password.value)) {
    invalidAccount.value = true;
    return;
  }
  void replaceHengdongScreen(router, route, "today");
}

function openRegistration() {
  void replaceHengdongScreen(
    router,
    route,
    "register",
    isNoIdentity.value ? "default" : "replace-identity",
  );
}
</script>

<template>
  <main
    class="hd-auth"
    data-pb-id="hengdong.login.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
  >
    <div class="hd-auth-scroll">
      <div class="hd-auth-frame">
        <header class="hd-auth-brand">
          <span
            class="hd-auth-mark"
            aria-hidden="true"
            data-pb-id="hengdong.login.brand-mark"
            data-pb-role="image"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.primary"
            data-pb-token-size="sizing.avatar-lg"
          >恒</span>
          <div class="hd-auth-copy">
            <span class="hd-overline">HENGDONG · 恒动</span>
            <h1>回来，继续动一点</h1>
            <p class="hd-muted">你的计划和活动记录都留在这台设备上。</p>
          </div>
        </header>

        <section
          v-if="isNoIdentity"
          class="hd-auth-empty"
          data-pb-id="hengdong.login.no-identity"
          data-pb-role="status"
          data-pb-token-background="color.primary-soft"
          data-pb-token-color="color.on-surface"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.lg"
        >
          <div class="hd-row-main">
            <h2>这台设备还没有本地身份</h2>
            <p class="hd-muted">先建立称呼、账号和每周目标，再从今天开始。</p>
          </div>
          <Button
            label="建立本地身份"
            block
            inspect-id="hengdong.login.open-register"
            data-pb-action="open-register"
            @click="openRegistration"
          />
        </section>

        <form
          v-else
          class="hd-auth-form"
          data-pb-id="hengdong.login.form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
          @submit.prevent="login"
        >
          <TextField
            v-model="username"
            label="账号"
            :show-label="true"
            autocomplete="username"
            :error-message="usernameError"
            placeholder="输入本地账号"
            inspect-id="hengdong.login.username"
          />
          <TextField
            v-model="password"
            label="密码"
            :show-label="true"
            type="password"
            autocomplete="current-password"
            revealable
            :error-message="passwordError"
            placeholder="输入密码"
            inspect-id="hengdong.login.password"
          />
          <div class="hd-auth-actions">
            <Button
              label="进入恒动"
              block
              type="submit"
              inspect-id="hengdong.login.submit"
              data-pb-action="login"
            />
            <Button
              label="建立或重建本地身份"
              variant="text"
              block
              inspect-id="hengdong.login.open-register"
              data-pb-action="open-register"
              @click="openRegistration"
            />
          </div>
          <p
            class="hd-auth-assurance"
            data-pb-id="hengdong.login.local-note"
            data-pb-role="text"
            data-pb-token-color="color.on-surface-muted"
            data-pb-token-typography="typography.caption"
          >
            当前设备会保持登录，直到你在设置中主动退出。
          </p>
        </form>
      </div>
    </div>
  </main>
</template>
