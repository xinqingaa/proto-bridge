<script setup lang="ts">
import { useYikeRenderFace } from "../../render-theme";
import { useCaptureState } from "@/runtime/capture-state";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import { useYikeRuntime } from "../../runtime";
import Brand from "./Brand.vue";
import { scope } from "./screen";
// This authored Screen fixes the transient brand frame for Workbench/Capture.
// The application cold-start uses the same content until its local state is ready.
const { store } = useYikeRuntime();
useCaptureState("yike", "yike.launch", () => ({}));
const renderFace = useYikeRenderFace();
</script>
<template>
  <PrototypeShell title="一刻" :screen-id="scope.screenId" launch>
    <template #launch><Brand :face="renderFace" /></template>
  </PrototypeShell>
</template>
