<script setup lang="ts">
withDefaults(
  defineProps<{
    pose?: "mobilize" | "squat" | "core";
  }>(),
  {
    pose: "mobilize",
  },
);
</script>

<template>
  <svg
    class="hdx-exercise-figure"
    viewBox="0 0 180 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <template v-if="pose === 'mobilize'">
      <circle cx="91" cy="38" r="13" />
      <path d="M91 53C88 69 86 84 88 102" />
      <path d="M88 65C70 68 58 78 47 91" />
      <path d="M88 67C107 69 121 80 134 94" />
      <path d="M88 101C74 111 66 127 59 145" />
      <path d="M88 101C101 113 111 128 121 145" />
      <path d="M53 72C43 78 36 89 35 101" class="hdx-figure-motion" />
      <path d="M127 73C137 79 144 90 145 102" class="hdx-figure-motion" />
    </template>
    <template v-else-if="pose === 'squat'">
      <circle cx="94" cy="34" r="13" />
      <path d="M93 49C87 65 81 78 76 94" />
      <path d="M78 63L52 82" />
      <path d="M78 65L112 78" />
      <path d="M76 94L49 112L35 143" />
      <path d="M76 94L108 111L139 137" />
      <path d="M38 149H59" />
      <path d="M130 143H151" />
      <path d="M43 104C66 89 99 88 123 103" class="hdx-figure-motion" />
    </template>
    <template v-else>
      <circle cx="72" cy="67" r="13" />
      <path d="M83 75L105 95" />
      <path d="M105 95L137 74" />
      <path d="M105 95L132 123" />
      <path d="M96 88L70 112" />
      <path d="M70 112L42 91" />
      <path d="M70 112L46 139" />
      <path d="M48 68C77 49 114 50 140 68" class="hdx-figure-motion" />
      <path d="M39 133C67 151 110 151 141 132" class="hdx-figure-motion" />
    </template>
  </svg>
</template>
