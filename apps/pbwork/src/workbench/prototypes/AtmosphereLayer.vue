<script setup lang="ts">
defineProps<{
  compact?: boolean;
}>();
</script>

<template>
  <div class="atm" :class="{ 'is-compact': compact }" aria-hidden="true">
    <i class="atm-ground" />
    <i class="atm-glow" />
    <i class="atm-mist" />
    <i class="atm-orbit" />
  </div>
</template>

<style scoped>
.atm {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.atm-ground,
.atm-glow,
.atm-mist,
.atm-orbit {
  position: absolute;
  display: block;
}

.atm-ground {
  inset: 0;
  background: var(--stage-ground);
}

.atm-glow {
  top: -90px;
  right: -40px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: var(--stage-glow);
  filter: blur(10px);
}

.atm-mist {
  right: 10%;
  bottom: -80px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: var(--stage-mist);
  filter: blur(16px);
}

.atm-orbit {
  right: -140px;
  bottom: -220px;
  width: 520px;
  height: 520px;
  border: 1px solid var(--stage-orbit);
  border-radius: 50%;
  box-shadow:
    0 0 0 48px color-mix(in srgb, var(--stage-ink) 2.2%, transparent),
    0 0 0 96px color-mix(in srgb, var(--stage-ink) 1.1%, transparent);
}

.atm.is-compact .atm-glow {
  top: -70px;
  right: -50px;
  width: 280px;
  height: 280px;
}

.atm.is-compact .atm-orbit {
  right: -120px;
  bottom: -180px;
  width: 380px;
  height: 380px;
}
</style>
