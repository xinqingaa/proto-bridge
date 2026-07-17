type ScreenRecord = {
  prototypeId: string;
  screenId: string;
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

export const prototypeScreens = [
  {
    prototypeId: 'project',
    screenId: 'project.task-list',
    path: '/prototype/project/task-list',
    view: 'project/screens/TaskList.vue',
    label: '任务列表',
    title: '任务列表',
    defaultVariantId: 'default',
    variants: [
      { id: 'default', query: { variant: 'default' } },
      { id: 'empty', query: { variant: 'empty' }, fixture: 'project/task-list.empty.json' },
    ],
  },
] satisfies ScreenRecord[];
