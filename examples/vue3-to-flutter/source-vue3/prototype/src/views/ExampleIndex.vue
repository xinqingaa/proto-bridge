<template>
  <main class="phone-page example-index">
    <section class="page-shell">
      <header class="home-top">
        <div class="preference-actions">
          <label class="switch-control">
            <input type="checkbox" :checked="prefs.isDark" @change="prefs.toggleTheme" />
            <span class="switch-track"><span /></span>
            <strong>{{ prefs.isDark ? prefs.t('app.theme.dark') : prefs.t('app.theme.light') }}</strong>
          </label>
          <label class="switch-control">
            <input type="checkbox" :checked="prefs.locale === 'en-US'" @change="prefs.toggleLocale" />
            <span class="switch-track"><span /></span>
            <strong>{{ prefs.locale === 'zh-CN' ? prefs.t('app.locale.zh') : prefs.t('app.locale.en') }}</strong>
          </label>
        </div>
        <p class="eyebrow">{{ prefs.t('app.brand') }}</p>
        <h1 class="page-title">{{ prefs.t('home.title') }}</h1>
        <p class="summary">{{ prefs.t('home.desc') }}</p>
      </header>

      <section class="panel portfolio-overview">
        <div>
          <span>{{ prefs.t('home.assetValue') }}</span>
          <strong>{{ store.holdingSummary.marketValue }}</strong>
        </div>
        <div>
          <span>{{ prefs.t('home.todayPnl') }}</span>
          <strong class="positive">{{ store.holdingSummary.dayPnl }}</strong>
        </div>
      </section>

      <nav class="entry-list" aria-label="Prototype pages">
        <RouterLink class="entry-card panel" to="/prototype/asset/holding-list">
          <strong>{{ prefs.t('holding.title') }}</strong>
          <small>{{ prefs.t('home.simple.desc') }}</small>
          <em>{{ prefs.t('home.open') }}</em>
        </RouterLink>
        <RouterLink class="entry-card panel featured" to="/prototype/asset/pnl-analysis?tab=overview">
          <strong>{{ prefs.t('pnl.title') }}</strong>
          <small>{{ prefs.t('home.complex.desc') }}</small>
          <em>{{ prefs.t('home.open') }}</em>
        </RouterLink>
      </nav>
    </section>
  </main>
</template>

<script setup>
import { useAssetPrototypeStore } from '../stores/assetPrototype.js';
import { usePreferenceStore } from '../stores/preferences.js';

const store = useAssetPrototypeStore();
const prefs = usePreferenceStore();
</script>

<style scoped>
.home-top {
  position: relative;
  padding-top: 54px;
  margin-bottom: 18px;
}

.preference-actions {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  gap: 8px;
}

.switch-control {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  background: var(--pb-surface);
  color: var(--pb-text);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.switch-control input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: var(--pb-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pb-border);
  transition: background 160ms ease, box-shadow 160ms ease;
}

.switch-track span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pb-muted);
  transition: transform 160ms ease, background 160ms ease;
}

.switch-control input:checked + .switch-track {
  background: var(--pb-accent-soft);
  box-shadow: inset 0 0 0 1px var(--pb-accent);
}

.switch-control input:checked + .switch-track span {
  transform: translateX(14px);
  background: var(--pb-accent);
}

.summary {
  max-width: 360px;
  margin: 12px 0 0;
  color: var(--pb-muted);
  font-size: 15px;
  line-height: 1.6;
}

.portfolio-overview {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
  padding: 18px;
  margin-bottom: 14px;
}

.portfolio-overview span {
  display: block;
  color: var(--pb-muted);
  font-size: 12px;
}

.portfolio-overview strong {
  display: block;
  margin-top: 6px;
  font-size: 25px;
  letter-spacing: 0;
}

.entry-list {
  display: grid;
  gap: 12px;
}

.entry-card {
  position: relative;
  display: grid;
  gap: 7px;
  padding: 18px;
  color: inherit;
  text-decoration: none;
}

.entry-card::after {
  content: "›";
  position: absolute;
  top: 18px;
  right: 18px;
  color: var(--pb-muted);
  font-size: 24px;
  line-height: 1;
}

.entry-card.featured {
  border-color: color-mix(in srgb, var(--pb-accent) 48%, var(--pb-border));
}

.entry-card strong {
  font-size: 21px;
}

.entry-card small {
  color: var(--pb-muted);
  font-size: 13px;
  line-height: 1.45;
}

.entry-card em {
  color: var(--pb-text);
  font-size: 13px;
  font-style: normal;
  font-weight: 800;
}
</style>
