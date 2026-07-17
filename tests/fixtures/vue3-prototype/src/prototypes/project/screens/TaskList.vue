<template>
  <main class="task-page" data-pb-id="task-list.page">
    <header class="app-bar" data-pb-id="task-list.app-bar" data-pb-role="app-bar"><h1>任务列表</h1></header>
    <section class="summary-card" data-pb-id="task-list.summary" data-pb-role="section"><strong>3</strong><span>待处理任务</span></section>
    <section class="task-list" data-pb-id="task-list.items" data-pb-role="list">
      <article v-for="task in tasks" :key="task.id" class="task-card" :data-pb-id="`task-list.row.${task.id}`">
        <h2>{{ task.title }}</h2>
        <p>{{ task.status }}</p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
const tasks = [
  { id: 'research', title: '梳理需求', status: '进行中' },
  { id: 'review', title: '评审原型', status: '待确认' },
];
</script>

<style scoped>
.task-page { min-height: 100vh; background: #f5f7fb; color: #172033; }
.app-bar { position: sticky; top: 0; padding: 20px; background: #ffffff; }
.summary-card, .task-card { margin: 16px; padding: 16px; border-radius: 16px; background: #ffffff; }
.task-list { display: grid; gap: 12px; }
</style>
