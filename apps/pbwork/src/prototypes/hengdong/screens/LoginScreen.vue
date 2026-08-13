<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import { replaceHengdongScreen } from "../nav";
import { loginHengdong } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const username = ref("demo");
const password = ref("123456");
const remember = ref(true);
const attempted = ref(false);
const invalidAccount = ref(false);
const forcedError = computed(
  () => String(route.query.variant ?? "default") === "validation-error",
);
const hasError = computed(
  () =>
    forcedError.value ||
    (attempted.value &&
      (!username.value.trim() || !password.value || invalidAccount.value)),
);

function login() {
  attempted.value = true;
  invalidAccount.value = false;
  if (!username.value.trim() || !password.value || forcedError.value) return;
  if (!loginHengdong(username.value, password.value)) {
    invalidAccount.value = true;
    return;
  }
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <main
    class="hd-auth"
    data-pb-id="hengdong.login.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
    data-pb-token-spacing="spacing.xl"
  >
    <header class="hd-auth-brand">
      <span class="hd-auth-mark" aria-hidden="true">恒</span>
      <span class="hd-overline">HENGDONG · 恒动</span>
      <h1>今天，动一点就好</h1>
      <p class="hd-muted">打开就知道下一步，完成就留下真实进度。</p>
    </header>

    <form
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
        placeholder="输入账号"
        inspect-id="hengdong.login.username"
      />
      <TextField
        v-model="password"
        label="密码"
        :show-label="true"
        placeholder="输入密码"
        inspect-id="hengdong.login.password"
      />
      <p
        v-if="hasError"
        class="hd-validation"
        role="alert"
        data-pb-id="hengdong.login.validation"
        data-pb-role="error-state"
        data-pb-token-color="color.error"
        data-pb-token-typography="typography.caption"
      >
        {{ invalidAccount ? "账号或密码不正确。" : "请填写账号和密码。" }}
      </p>
      <Checkbox
        v-model="remember"
        label="在此设备保留登录状态"
        inspect-id="hengdong.login.remember"
      />
      <Button
        label="进入恒动"
        block
        type="submit"
        inspect-id="hengdong.login.submit"
        data-pb-action="login"
        @click="login"
      />
      <Button
        label="创建本地账号"
        bg-color="transparent"
        border-color="transparent"
        text-color="color.primary"
        block
        inspect-id="hengdong.login.open-register"
        data-pb-action="open-register"
        @click="replaceHengdongScreen(router, route, 'register')"
      />
      <p class="hd-caption">演示账号 demo · 密码 123456</p>
    </form>
  </main>
</template>
