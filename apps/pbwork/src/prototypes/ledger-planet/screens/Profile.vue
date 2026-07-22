<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Textarea from "@/design-system/components/basic/Textarea.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";

const route = useRoute();
const name = ref("星辰同学");
const bio = ref("把每一笔都记清楚。");
const toast = ref(false);

watch(
  () => route.query.variant,
  (value) => {
    toast.value = value === "toast-saved";
  },
  { immediate: true },
);

function save() {
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="个人资料" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.profile">
      <Avatar :name="name" size="lg" />
      <TextField v-model="name" label="昵称" />
      <Textarea v-model="bio" label="简介" />
      <Button label="保存" block @click="save" />
    </div>
    <SnackbarToast v-model="toast" message="资料已保存" tone="success" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  justify-items: start;
  padding: 16px;
}
</style>
