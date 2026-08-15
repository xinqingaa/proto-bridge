<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import HengdongLogo from "../components/HengdongLogo.vue";
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
          <HengdongLogo pb-id="hengdong.login.brand-mark" />
          <div class="hd-auth-wordmark">
            <strong>恒动</strong>
            <span>HENGDONG</span>
          </div>
        </header>

        <div class="hd-auth-main">
          <div class="hd-auth-intro">
            <h1>{{ isNoIdentity ? "开始使用恒动" : "欢迎回来" }}</h1>
            <p class="hd-muted">
              {{
                isNoIdentity
                  ? "先创建这台设备上的本地身份。"
                  : "登录并继续今天的训练。"
              }}
            </p>
          </div>

          <section
            v-if="isNoIdentity"
            class="hd-auth-empty"
            data-pb-id="hengdong.login.no-identity"
            data-pb-role="status"
            data-pb-token-color="color.on-surface"
            data-pb-token-spacing="spacing.md"
          >
            <p class="hd-muted">创建后，身份、计划和活动记录只保存在当前设备。</p>
            <Button
              label="创建本地身份"
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
            data-pb-token-spacing="spacing.sm"
            @submit.prevent="login"
          >
            <TextField
              v-model="username"
              label="账号"
              autocomplete="username"
              :error-message="usernameError"
              placeholder="账号"
              inspect-id="hengdong.login.username"
            />
            <TextField
              v-model="password"
              label="密码"
              type="password"
              autocomplete="current-password"
              revealable
              :error-message="passwordError"
              placeholder="密码"
              inspect-id="hengdong.login.password"
            />
            <div class="hd-auth-actions">
              <Button
                label="登录"
                block
                type="submit"
                inspect-id="hengdong.login.submit"
                data-pb-action="login"
              />
              <Button
                label="创建或重建本地身份"
                bg-color="transparent"
                border-color="transparent"
                text-color="color.primary"
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
              登录状态保留在当前设备，直到你主动退出。
            </p>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>
