export function toPascalCase(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9]+/g, ' ');
  const result = normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
  return result || 'Migrated';
}

export function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function widgetName(pageName: string, nameHint: string): string {
  if (!nameHint) return `${pageName}Section`;
  if (nameHint.startsWith(pageName)) return nameHint;
  return `${pageName}${nameHint}`;
}
