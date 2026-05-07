import type { JsonObject, JsonValue } from '../types.js';
import { readObject, readString } from '../utils/args.js';

export function promptsList(): JsonValue[] {
  return [
    {
      name: 'migrate_vue_prototype_to_youfi_flutter',
      description: 'Use ProtoBridge to migrate a prototype URL/route/Vue file into the YouFi Flutter app.',
      arguments: [
        { name: 'url', description: 'Prototype URL.', required: false },
        { name: 'route', description: 'Prototype route.', required: false },
        { name: 'vue', description: 'Vue SFC path.', required: false },
      ],
    },
  ];
}

export function getPrompt(params: JsonObject | undefined): JsonObject {
  const name = readString(params, 'name');
  if (name !== 'migrate_vue_prototype_to_youfi_flutter') throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
  const args = readObject(params, 'arguments') ?? {};
  const input = readString(args, 'url') ?? readString(args, 'route') ?? readString(args, 'vue') ?? '<url | route | vue>';
  return {
    description: 'ProtoBridge YouFi Flutter migration workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Use ProtoBridge to migrate ${input} into the YouFi Flutter app.`,
            'Call generate_migration_spec first, then get_migration_brief, find_target_examples, and get_target_conventions.',
            'Implement Dart files in the target repo according to the generated file tree, Widget contracts, state strategy, i18n/assets/routes guidance, and checklist.',
            'Do not translate Vue template or CSS classes one-to-one. Prefer existing YouFi widgets, BaseGetView patterns, themeService colors/textStyles, .tr translations, and similar module examples.',
            'Run formatting/static checks when possible, then call validate_target_changes and report changed files, verification, warnings, and unresolved P0/P1 items.',
          ].join('\n'),
        },
      },
    ],
  };
}
