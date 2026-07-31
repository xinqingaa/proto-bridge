export type CliArgs = {
  command: string[];
  flags: Map<string, string[]>;
};

const BOOLEAN_FLAGS = new Set([
  'apply',
  'json',
  'help',
  'local-store',
  'via-service',
]);

export function parseCliArgs(argv: string[]): CliArgs {
  const command: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (!token.startsWith('--')) {
      if (flags.size > 0) {
        throw new Error(`Unexpected positional argument after flags: ${token}`);
      }
      command.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    if (!rawKey) throw new Error(`Invalid option: ${token}`);
    if (rawKey === 'force') {
      throw new Error(
        '--force is not supported. Accept warning and risk identities explicitly.',
      );
    }
    const value =
      inlineValue ??
      (BOOLEAN_FLAGS.has(rawKey)
        ? 'true'
        : (() => {
            const next = argv[index + 1];
            if (!next || next.startsWith('--')) {
              throw new Error(`--${rawKey} requires a value.`);
            }
            index += 1;
            return next;
          })());
    flags.set(rawKey, [...(flags.get(rawKey) ?? []), value]);
  }
  return { command, flags };
}

export function flag(
  args: CliArgs,
  name: string,
): string | undefined {
  return args.flags.get(name)?.at(-1);
}

export function flags(args: CliArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

export function requiredFlag(args: CliArgs, name: string): string {
  const value = flag(args, name);
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

export function numberFlag(
  args: CliArgs,
  name: string,
): number | undefined {
  const value = flag(args, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`--${name} must be a number.`);
  return parsed;
}

export function booleanFlag(args: CliArgs, name: string): boolean {
  return flag(args, name) === 'true';
}
