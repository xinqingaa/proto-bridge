<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import { replaceHengdongScreen } from "../nav";
import { registerHengdong } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const name = ref("");
const username = ref("");
const password = ref("");
const accepted = ref(false);
const attempted = ref(false);
const forcedError = computed(
  () => String(route.query.variant ?? "default") === "validation-error",
);
const hasError = computed(
  () =>
    forcedError.value ||
    (attempted.value &&
      (!name.value.trim() ||
        !username.value.trim() ||
        password.value.length < 6 ||
        !accepted.value)),
);

function register() {
  attempted.value = true;
  if (hasError.value) return;
  const normalized = username.value.trim().toLowerCase();
  registerHengdong({
    id: `user-${normalized}`,
    name: name.value.trim(),
    username: normalized,
    password: password.value,
  });
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <main
    class="hd-auth"
    data-pb-id="hengdong.register.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
    data-pb-token-spacing="spacing.xl"
  >
    <header class="hd-auth-brand">
      <span class="hd-overline">只保存在当前设备</span>
      <h1>建立你的轻量节奏</h1>
      <p class="hd-muted">不需要邮箱验证，也不会上传训练数据。</p>
    </header>

    <form
      class="hd-auth-form"
      data-pb-id="hengdong.register.form"
      data-pb-role="form"
      data-pb-token-spacing="spacing.md"
      @submit.prevent="register"
    >
      <TextField
        v-model="name"
        label="怎么称呼你"
        :show-label="true"
        placeholder="例如：林然"
        inspect-id="hengdong.register.name"
      />
      <TextField
        v-model="username"
        label="账号"
        :show-label="true"
        placeholder="用于本地登录"
        inspect-id="hengdong.register.username"
      />
      <TextField
        v-model="password"
        label="密码"
        :show-label="true"
        placeholder="至少 6 位"
        inspect-id="hengdong.register.password"
      />
      <Checkbox
        v-model="accepted"
        label="我了解数据仅保存在此设备"
        inspect-id="hengdong.register.accept"
      />
      <p
        v-if="hasError"
        class="hd-validation"
        role="alert"
        data-pb-id="hengdong.register.validation"
        data-pb-role="error-state"
        data-pb-token-color="color.error"
        data-pb-token-typography="typography.caption"
      >
        请完成所有信息，密码至少 6 位，并确认本地存储说明。
      </p>
      <Button
        label="创建并开始"
        block
        type="submit"
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
  </main>
</template>
