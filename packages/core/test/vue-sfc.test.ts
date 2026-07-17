import { describe, expect, it } from 'vitest';
import { analyzeVueSfc } from '../src/source/vue3-prototype/vue-sfc.js';

describe('Vue SFC overlay analysis', () => {
  it('keeps content after nested template blocks and reads hidden overlay controls', () => {
    const analysis = analyzeVueSfc(`<template>
      <main>
        <template v-if="ready"><p>Visible content</p></template>
        <BottomSheet v-model="filterSheetOpen">
          <h2>Choose filter</h2>
          <button v-for="option in filterOptions" :key="option.value">{{ option.label }}</button>
          <ActionButton @click="applyFilter">Confirm</ActionButton>
        </BottomSheet>
      </main>
    </template>
    <script setup>
    const filterSheetOpen = ref(false)
    const filterOptions = [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }]
    </script>`);

    const overlay = analysis.overlays.find((item) => item.state === 'filterSheetOpen');
    expect(analysis.template).toContain('<BottomSheet');
    expect(overlay?.title).toBe('Choose filter');
    expect(overlay?.controls).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceCollection: 'filterOptions', options: expect.arrayContaining([
        expect.objectContaining({ value: 'all', label: 'All' }),
        expect.objectContaining({ value: 'active', label: 'Active' }),
      ]) }),
      expect.objectContaining({ action: 'applyFilter', label: 'Confirm' }),
    ]));
  });
});
