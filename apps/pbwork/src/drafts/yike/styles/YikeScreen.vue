<script setup lang="ts">
import CheckInScreen from "./CheckInScreen.vue";
import FocusScreen from "./FocusScreen.vue";
import HabitDetailScreen from "./HabitDetailScreen.vue";
import HabitEditorScreen from "./HabitEditorScreen.vue";
import LaunchScreen from "./LaunchScreen.vue";
import ReviewScreen from "./ReviewScreen.vue";
import SettingsScreen from "./SettingsScreen.vue";
import StylePhone from "./StylePhone.vue";
import type { ScreenSpec } from "./gallery";
import type { StyleDirectionId } from "./sample";

defineProps<{ spec: ScreenSpec; theme: StyleDirectionId; dark: boolean }>();
</script>

<template>
  <StylePhone :label="spec.label" :direction="theme" :dark="dark">
    <LaunchScreen v-if="spec.page === 'launch'" :theme="theme" />
    <FocusScreen v-else-if="spec.page === 'focus'" :theme="theme" :state="spec.state" />
    <CheckInScreen v-else-if="spec.page === 'checkin'" :theme="theme" :state="spec.state" />
    <HabitEditorScreen
      v-else-if="spec.page === 'habit' && (spec.state === 'new' || spec.state === 'error')"
      :theme="theme"
      :state="spec.state"
    />
    <HabitDetailScreen v-else-if="spec.page === 'habit'" :theme="theme" :state="spec.state" />
    <ReviewScreen v-else-if="spec.page === 'review'" :theme="theme" :state="spec.state" />
    <SettingsScreen v-else :theme="theme" :state="spec.state" :dark="dark" />
  </StylePhone>
</template>
