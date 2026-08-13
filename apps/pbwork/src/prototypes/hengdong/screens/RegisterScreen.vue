<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import { replaceHengdongScreen } from "../nav";
import { saveProfile } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const name = ref("林然");
const email = ref("demo@hengdong.local");
const password = ref("hengdong");
const accepted = ref(true);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));

function register() {
  if (variant.value === "validation-error" || !accepted.value) {
    toast.value = true;
    return;
  }
  saveProfile({ id: "user-local", name: name.value, email: email.value });
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <div
    class="hd-auth"
    data-pb-id="hengdong.register.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
    data-pb-token-spacing="spacing.lg"
  >
    <Card
      class="hd-auth-card"
      semantic-role="section"
      inspect-id="hengdong.register.card"
    >
      <header class="hd-auth-brand">
        <span class="hd-eyebrow">建立你的恒动档案</span>
        <h1>从一个小目标开始</h1>
        <p class="hd-muted">账号和训练数据只保存在当前浏览器。</p>
      </header>
      <form
        class="hd-form"
        data-pb-id="hengdong.register.form"
        data-pb-role="form"
        data-pb-token-spacing="spacing.md"
        @submit.prevent="register"
      >
        <TextField
          v-model="name"
          label="昵称"
          :show-label="true"
          inspect-id="hengdong.register.name"
        />
        <TextField
          v-model="email"
          label="邮箱"
          :show-label="true"
          inspect-id="hengdong.register.email"
        />
        <TextField
          v-model="password"
          label="密码"
          :show-label="true"
          inspect-id="hengdong.register.password"
        />
        <p
          v-if="variant === 'validation-error'"
          class="hd-validation"
          role="alert"
          data-pb-id="hengdong.register.validation"
          data-pb-role="error-state"
          data-pb-token-color="color.error"
          data-pb-token-typography="typography.caption"
        >
          请填写完整信息并同意本地存储说明。
        </p>
        <Checkbox
          v-model="accepted"
          label="我了解数据仅保存在此设备"
          inspect-id="hengdong.register.accept"
        />
        <Button
          label="创建并开始"
          block
          inspect-id="hengdong.register.submit"
          data-pb-action="register"
          @click="register"
        />
        <Button
          label="返回登录"
          bg-color="transparent"
          border-color="transparent"
          text-color="color.primary"
          block
          inspect-id="hengdong.register.back-login"
          @click="replaceHengdongScreen(router, route, 'login')"
        />
      </form>
    </Card>
    <Toast
      v-model="toast"
      message="请完成必填项"
      inspect-id="hengdong.register.toast"
    />
  </div>
</template>

<style scoped>
.hd-validation {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
</style>
