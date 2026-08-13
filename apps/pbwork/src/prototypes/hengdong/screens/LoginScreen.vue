<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import { replaceHengdongScreen } from "../nav";
import { defaultProfile, saveProfile } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const email = ref("demo@hengdong.local");
const password = ref("hengdong");
const remember = ref(true);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));

function login() {
  if (variant.value === "validation-error" || !email.value || !password.value) {
    toast.value = true;
    return;
  }
  saveProfile({ ...defaultProfile, email: email.value });
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <div
    class="hd-auth"
    data-pb-id="hengdong.login.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
    data-pb-token-spacing="spacing.lg"
  >
    <Card
      class="hd-auth-card"
      semantic-role="section"
      inspect-id="hengdong.login.card"
    >
      <header class="hd-auth-brand">
        <span class="hd-eyebrow">HENGDONG · 恒动</span>
        <h1>让坚持变得轻一点</h1>
        <p class="hd-muted">记录每一次开始，看见稳定发生。</p>
      </header>
      <form
        class="hd-form"
        data-pb-id="hengdong.login.form"
        data-pb-role="form"
        data-pb-token-spacing="spacing.md"
        @submit.prevent="login"
      >
        <TextField
          v-model="email"
          label="邮箱"
          :show-label="true"
          placeholder="name@example.com"
          inspect-id="hengdong.login.email"
        />
        <TextField
          v-model="password"
          label="密码"
          :show-label="true"
          placeholder="输入密码"
          inspect-id="hengdong.login.password"
        />
        <p
          v-if="variant === 'validation-error'"
          class="hd-caption hd-validation"
          role="alert"
          data-pb-id="hengdong.login.validation"
          data-pb-role="error-state"
          data-pb-token-color="color.error"
          data-pb-token-typography="typography.caption"
        >
          邮箱或密码不能为空。
        </p>
        <Checkbox
          v-model="remember"
          label="在此设备记住我"
          inspect-id="hengdong.login.remember"
        />
        <Button
          label="登录"
          block
          inspect-id="hengdong.login.submit"
          data-pb-action="login"
          @click="login"
        />
        <Button
          label="创建轻量账号"
          bg-color="transparent"
          border-color="transparent"
          text-color="color.primary"
          block
          inspect-id="hengdong.login.open-register"
          data-pb-action="open-register"
          @click="replaceHengdongScreen(router, route, 'register')"
        />
      </form>
    </Card>
    <Toast
      v-model="toast"
      message="请先填写邮箱与密码"
      inspect-id="hengdong.login.toast"
    />
  </div>
</template>

<style scoped>
.hd-validation {
  color: var(--pb-color-error);
}
</style>
