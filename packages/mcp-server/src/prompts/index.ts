import type { JsonObject, JsonValue } from '../types.js';
import { readObject, readString } from '../utils/args.js';

export function promptsList(): JsonValue[] {
  return [
    {
      name: 'reconstruct_url_snapshot_ui',
      description: 'Use ProtoBridge to reconstruct a URL snapshot as YouFi Flutter UI.',
      arguments: [
        { name: 'url', description: 'Rendered page URL.', required: true },
        { name: 'targetModule', description: 'Optional YouFi module override.', required: false },
      ],
    },
  ];
}

export function getPrompt(params: JsonObject | undefined): JsonObject {
  const name = readString(params, 'name');
  if (name !== 'reconstruct_url_snapshot_ui') throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
  const args = readObject(params, 'arguments') ?? {};
  const input = readString(args, 'url') ?? '<url>';
  const targetModule = readString(args, 'targetModule');
  return {
    description: 'ProtoBridge URL Snapshot UI reconstruction workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Use ProtoBridge to reconstruct the visible UI from ${input} into the YouFi Flutter app.`,
            'Call capture_page_snapshot first, then build_ui_implementation_plan.',
            targetModule ? `Use targetModule=${targetModule} when building the UI implementation plan.` : 'Let ProtoBridge infer the target module unless the user provides one.',
            'Implement Dart UI from ui-implementation-plan.json, focusing on visual structure, text, component mapping, theme, i18n, and assets.',
            'Do not invent APIs, permission checks, risk controls, tracking, or hidden business behavior. Keep those as TODOs or manual confirmations.',
            'Run formatting/static checks when possible, then call validate_target_changes with the planId and report changed files, verification, warnings, and unresolved business questions.',
          ].join('\n'),
        },
      },
    ],
  };
}
