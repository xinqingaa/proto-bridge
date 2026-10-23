import {
  mkdirSync,
  existsSync,
  writeFileSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { URL, fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function createPrototype(
  id,
  root = fileURLToPath(new URL("../src/prototypes/", import.meta.url)),
) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id ?? ""))
    throw new Error("Usage: pnpm pb:new-prototype <lowercase-id>");
  const dir = path.join(root, id);
  if (existsSync(dir)) throw new Error(`PROTOTYPE_ALREADY_EXISTS:${id}`);
  mkdirSync(dir); // Exclusive ownership: never overwrite a prototype or approved design.
  const write = (name, content) => {
    const file = path.join(dir, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  const json = (name, value) =>
    write(name, JSON.stringify(value, null, 2) + "\n");
  json("theme/pack.json", {
    schemaVersion: 1,
    id,
    label: id,
    extends: "pbwork-base",
    scope: "prototype",
    modes: ["light", "dark"],
    defaultMode: "light",
    themes: [{ id: "default", label: "默认", default: true }],
    defaultTheme: "default",
  });
  for (const name of ["primitives", "semantic", "component"])
    json("theme/" + name + ".json", { values: {} });
  write(
    "prototype.ts",
    `import type { PrototypeRecord } from '@/design-system/types';
export default {
  id: '${id}', label: '${id}', lifecycle: 'active', themePackId: '${id}',
  clock: { now: '2026-07-28T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
} satisfies PrototypeRecord;
`,
  );
  const templates = fileURLToPath(
    new URL("./templates/prototype-docs/", import.meta.url),
  );
  for (const name of readdirSync(templates)) {
    write(
      `docs/${name.replace(/\.tpl$/, "")}`,
      readFileSync(path.join(templates, name), "utf8").replaceAll(
        "{{prototypeId}}",
        id,
      ),
    );
  }
  write(
    "docs/implementation.md",
    `# ${id} 实施\n\n技术骨架使用共享 PrototypeShell、导航、存储、主题偏好和 useClock。业务设计仍为 draft。\n\nExperience：deferred（空骨架仅验收制作工具；业务页面批准后按设计工作流验收）。\n`,
  );
  write(
    "Shell.vue",
    `<script setup lang="ts">
import PrototypeShell from '@/runtime/prototype/PrototypeShell.vue';
defineProps<{screenId:string}>();
</script>
<template><PrototypeShell title="${id}" :screen-id="screenId"><slot /><template #launch><slot name="launch" /></template></PrototypeShell></template>
`,
  );
  write(
    "screens/home/screen.ts",
    `import { defineScreen, fragment, screenScope } from '@/authoring/define-screen';
export const scope = screenScope('${id}', 'home');
export default defineScreen({
  prototypeId: '${id}', slug: 'home', label: '首页', title: '${id}',
  view: '${id}/screens/home/Home.vue', defaultVariantId: 'default',
  fragments: [fragment('root', {required:true}), fragment('title', {required:true}), fragment('clock', {required:true})],
  shellFragments: [scope.ref('app-bar')],
  variants: [{id:'default',label:'默认'}],
});
`,
  );
  write(
    "screens/home/Home.vue",
    `<script setup lang="ts">
import { computed } from 'vue';
import Shell from '../../Shell.vue';
import { vPb, pbStyle } from '@/authoring/pb-style';
import { useClock, usePrototypeStorage, prototypeNavigation } from '@/runtime/prototype';
import { useRoute, useRouter } from 'vue-router';
import { scope } from './screen';
const now = useClock();
const clockText = computed(() => now.value.toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false}));
const model = usePrototypeStorage({prototypeId:'${id}',name:'model',schemaVersion:1,defaults:()=>({title:'开始制作'}),validate:(v):v is {title:string} => Boolean(v && typeof v === 'object' && typeof (v as {title?:unknown}).title === 'string')});
const navigation = prototypeNavigation(useRouter(),useRoute(),'${id}');
void navigation;
</script>
<template>
  <Shell :screen-id="scope.screenId">
    <section class="home" v-pb="{id:scope.id('root'),role:'page',style:{background:'color.background',color:'color.on-background',padding:'spacing.md',gap:'spacing.md'}}">
      <h1 v-pb="{id:scope.id('title'),role:'text'}" :style="pbStyle({typography:'typography.title',color:'color.on-surface',margin:'layout.zero'})">{{ model.title }}</h1>
      <p v-pb="{id:scope.id('clock'),role:'text',style:{typography:'typography.caption',color:'color.on-surface-muted',margin:'layout.zero'}}">{{ clockText }}</p>
    </section>
  </Shell>
</template>
<style scoped>
.home { display: flex; flex-direction: column; min-height: var(--pb-layout-fill); box-sizing: border-box; }
</style>
`,
  );
  write(
    "screen.test.ts",
    `import { expect, it } from 'vitest';
import screen, { scope } from './screens/home/screen';
it('${id} declares its default boundary', () => {
  expect(screen.screenId).toBe('${id}.home');
  expect(screen.variants[0]?.requiredFragments).toContainEqual(scope.ref('title'));
});
`,
  );
  return dir;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = createPrototype(process.argv[2]);
  execFileSync("pnpm", ["pb:screens:generate"], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    stdio: "inherit",
  });
  console.log(
    `Created ${dir}\nDesign remains draft. Author business and visual direction before promotion.`,
  );
}
