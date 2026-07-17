type ScreenRecord = {
  prototypeId: string;
  screenId: string;
  screenSlug: string;
  path: string;
  view: string;
  label: string;
  title?: string;
  defaultVariantId: string;
  variants: Array<{
    id: string;
    query?: Record<string, string>;
    fixture?: string;
  }>;
};

type PrototypeRecord = {
  id: string;
  label: string;
  lifecycle: 'active' | 'review' | 'final' | 'archived';
  defaultThemeId: string;
};

export const prototypes = [
  { id: 'project', label: '项目协作', lifecycle: 'active', defaultThemeId: 'light' },
] satisfies PrototypeRecord[];

export const prototypeScreens = [
  {
    prototypeId: 'project',
    screenId: 'project.task-list',
    screenSlug: 'task-list',
    path: '/prototype/project/task-list',
    view: 'project/screens/TaskList.vue',
    label: '任务列表',
    title: '任务列表',
    defaultVariantId: 'default',
    variants: [
      { id: 'default' },
      { id: 'empty', fixture: 'fixtures/empty.json' },
    ],
  },
] satisfies ScreenRecord[];
