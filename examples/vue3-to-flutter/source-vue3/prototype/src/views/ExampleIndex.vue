<template>
  <main class="phone-page example-index">
    <section class="page-shell">
      <header class="intro">
        <p class="eyebrow">ProtoBridge Example</p>
        <h1 class="page-title">Vue3 Prototype</h1>
        <p class="summary">
          Open the source prototype pages used by ProtoBridge before comparing the Flutter target.
        </p>
      </header>

      <nav class="entry-list" aria-label="Prototype pages">
        <RouterLink class="entry-card panel" to="/prototype/asset/holding-list">
          <span class="entry-kind">Simple</span>
          <strong>Portfolio Holdings</strong>
          <small>Title, summary, filter chips, list and basic states.</small>
        </RouterLink>
        <RouterLink class="entry-card panel" to="/prototype/asset/pnl-analysis?tab=overview">
          <span class="entry-kind">Complex</span>
          <strong>P&L Analysis</strong>
          <small>Tabs, metrics, chart, records, filter sheet and detail sheet.</small>
        </RouterLink>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.example-index {
  background:
    linear-gradient(180deg, rgba(23, 107, 135, 0.13), rgba(238, 243, 248, 0) 250px),
    var(--pb-bg);
}

.intro {
  padding-top: 12px;
  margin-bottom: 18px;
}

.summary {
  max-width: 340px;
  margin: 12px 0 0;
  color: var(--pb-muted);
  font-size: 15px;
  line-height: 1.55;
}

.entry-list {
  display: grid;
  gap: 12px;
}

.entry-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  color: inherit;
  text-decoration: none;
}

.entry-kind {
  width: fit-content;
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--pb-primary-soft);
  color: var(--pb-primary);
  font-size: 12px;
  font-weight: 800;
}

.entry-card strong {
  font-size: 21px;
}

.entry-card small {
  color: var(--pb-muted);
  font-size: 13px;
  line-height: 1.45;
}
</style>
