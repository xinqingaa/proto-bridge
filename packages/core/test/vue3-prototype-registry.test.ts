import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseStaticExportedArrays } from '../src/source/vue3-prototype/js-literal.js';
import { analyzePrototypePage } from '../src/source/vue3-prototype/prototype-page.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('static Vue prototype registry parsing', () => {
  it('reads typed arrays with satisfies, as const, and nested variant data', () => {
    const parsed = parseStaticExportedArrays(`
      type ScreenRecord = { screenId: string };
      export const prototypeScreens: ScreenRecord[] = ([
        {
          prototypeId: 'project',
          screenId: 'project.task-list',
          path: '/prototype/project/task-list',
          view: 'project/screens/TaskList.vue',
          variants: [{ id: 'empty', query: { state: 'empty' }, fixture: 'empty.json' }],
        },
      ] as const) satisfies readonly ScreenRecord[];
    `, 'registry.ts');

    expect(parsed.warnings).toEqual([]);
    expect(parsed.arrays).toHaveLength(1);
    expect(parsed.arrays[0]?.name).toBe('prototypeScreens');
    expect(parsed.arrays[0]?.value).toEqual([
      {
        prototypeId: 'project',
        screenId: 'project.task-list',
        path: '/prototype/project/task-list',
        view: 'project/screens/TaskList.vue',
        variants: [{ id: 'empty', query: { state: 'empty' }, fixture: 'empty.json' }],
      },
    ]);
  });

  it('rejects spread and dynamic expressions without executing source code', () => {
    const marker = '__pbwork_registry_test_marker__';
    delete (globalThis as Record<string, unknown>)[marker];
    const parsed = parseStaticExportedArrays(`
      const shared = { path: '/dynamic' };
      export const spreadScreens = [{ ...shared }];
      export const calledScreens = [(() => { globalThis.${marker} = true; return shared })()];
    `, 'registry.ts');

    expect(parsed.arrays).toEqual([]);
    expect(parsed.warnings).toHaveLength(2);
    expect(parsed.warnings.join('\n')).toMatch(/spread properties/);
    expect(parsed.warnings.join('\n')).toMatch(/dynamic CallExpression/);
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined();
  });

  it('resolves a unique logical view path from a typed registry', async () => {
    const root = await createPrototypeRoot({
      view: 'project/screens/TaskList.vue',
      files: ['src/prototypes/project/screens/TaskList.vue'],
    });

    const analysis = await analyzePrototypePage({
      prototypeRoot: root,
      route: '/prototype/project/task-list',
    });

    expect(analysis.screenId).toBe('project.task-list');
    expect(analysis.module).toBe('project');
    expect(analysis.vueRelativePath).toBe('src/prototypes/project/screens/TaskList.vue');
    expect(analysis.sfc?.sections.some((section) => section.kind === 'list')).toBe(true);
  });

  it('fails when a basename-only view matches more than one Vue file', async () => {
    const root = await createPrototypeRoot({
      view: 'TaskList.vue',
      files: [
        'src/prototypes/project/screens/TaskList.vue',
        'src/prototypes/other/screens/TaskList.vue',
      ],
    });

    await expect(analyzePrototypePage({
      prototypeRoot: root,
      route: '/prototype/project/task-list',
    })).rejects.toThrow(/Vue view path is ambiguous/);
  });

  it('prefers an exact logical view when another prototype has the same basename', async () => {
    const root = await createPrototypeRoot({
      view: 'project/screens/TaskList.vue',
      files: [
        'src/prototypes/project/screens/TaskList.vue',
        'src/prototypes/other/screens/TaskList.vue',
      ],
    });

    const analysis = await analyzePrototypePage({
      prototypeRoot: root,
      route: '/prototype/project/task-list',
    });

    expect(analysis.vueRelativePath).toBe('src/prototypes/project/screens/TaskList.vue');
  });
});

async function createPrototypeRoot(input: { view: string; files: string[] }): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'proto-bridge-registry-'));
  temporaryRoots.push(root);
  const registryPath = path.join(root, 'src/prototypes/registry.ts');
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `
    type ScreenRecord = { screenId: string };
    export const prototypeScreens: ScreenRecord[] = [
      {
        prototypeId: 'project',
        screenId: 'project.task-list',
        path: '/prototype/project/task-list',
        view: '${input.view}',
        label: 'Task list',
        defaultVariantId: 'default',
        variants: [{ id: 'default', query: { state: 'default' } }],
      },
    ];
  `, 'utf8');
  for (const relativePath of input.files) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `<template><main><section class="task-list"><p v-for="item in items">{{ item }}</p></section></main></template><script setup>const items = ['One']</script>`, 'utf8');
  }
  return root;
}
