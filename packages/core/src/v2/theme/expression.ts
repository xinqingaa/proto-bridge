import {
  THEME_REFERENCE_PATTERN,
  type ThemeExpression,
  type ThemeSwitchExpression,
} from './schema.js';

/** Returns the referenced name for a whole-string `"{key}"`, otherwise `null`. */
export function parseThemeReference(value: string): string | null {
  const match = THEME_REFERENCE_PATTERN.exec(value);
  return match ? (match[1] as string) : null;
}

export function isThemeSwitchExpression(expression: unknown): expression is ThemeSwitchExpression {
  return (
    typeof expression === 'object' &&
    expression !== null &&
    !Array.isArray(expression) &&
    typeof (expression as { $switch?: unknown }).$switch === 'string'
  );
}

/**
 * Collects every name an expression depends on, in order of first appearance:
 * whole-string references and `$switch` selector keys, descending into
 * `$switch` cases and composite fields.
 */
export function collectThemeReferences(expression: ThemeExpression): string[] {
  const seen = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      const reference = parseThemeReference(value);
      if (reference !== null) seen.add(reference);
      return;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
    if (isThemeSwitchExpression(value)) {
      seen.add(value.$switch);
      for (const branch of Object.values(value.cases ?? {})) visit(branch);
      return;
    }
    for (const field of Object.values(value)) visit(field);
  };
  visit(expression);
  return [...seen];
}

/** name -> names it depends on (only names present in `entries` become edges). */
export function buildThemeDependencyGraph(
  entries: Readonly<Record<string, ThemeExpression>>,
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const [name, expression] of Object.entries(entries)) {
    graph.set(
      name,
      collectThemeReferences(expression).filter((reference) =>
        Object.prototype.hasOwnProperty.call(entries, reference),
      ),
    );
  }
  return graph;
}

/**
 * Finds reference cycles with a depth-first walk. Each returned path is
 * closed (`['a', 'b', 'a']`). Every cycle is reported once.
 */
export function findThemeReferenceCycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (node: string): void => {
    state.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const nextState = state.get(next);
      if (nextState === 1) {
        cycles.push([...stack.slice(stack.indexOf(next)), next]);
      } else if (nextState === undefined && graph.has(next)) {
        visit(next);
      }
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

export function formatThemeCyclePath(path: readonly string[]): string {
  return path.join(' → ');
}
