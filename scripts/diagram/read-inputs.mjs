import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const defaultIgnore = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.turbo/**',
];

const codeExtensions = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.md',
  '.toml',
  '.yaml',
  '.yml',
]);

export async function readInputs({ cwd, inputPatterns = [], codePatterns = [], maxFileBytes = 120_000 }) {
  const markdownFiles = await resolvePatterns(cwd, inputPatterns, ['**/*.md']);
  const codeFiles = await resolvePatterns(cwd, codePatterns, ['**/*.{js,mjs,cjs,ts,tsx,jsx,json,toml,yaml,yml,md}']);
  const files = dedupe([...markdownFiles, ...codeFiles]);
  const documents = [];

  for (const file of files) {
    const info = await stat(file);
    if (!info.isFile()) continue;
    if (info.size > maxFileBytes) continue;
    if (!codeExtensions.has(path.extname(file))) continue;
    const content = await readFile(file, 'utf8');
    documents.push({
      path: file,
      relativePath: path.relative(cwd, file),
      kind: path.extname(file) === '.md' ? 'markdown' : 'code',
      bytes: info.size,
      content,
    });
  }

  return {
    cwd,
    documents,
    summary: {
      files: documents.length,
      markdownFiles: documents.filter((doc) => doc.kind === 'markdown').length,
      codeFiles: documents.filter((doc) => doc.kind === 'code').length,
      bytes: documents.reduce((sum, doc) => sum + doc.bytes, 0),
    },
  };
}

async function resolvePatterns(cwd, patterns, fallback) {
  if (!patterns.length) return [];
  const expanded = [];
  for (const pattern of patterns) {
    const absolute = path.resolve(cwd, pattern);
    try {
      const info = await stat(absolute);
      if (info.isDirectory()) {
        expanded.push(...fallback.map((item) => path.join(pattern, item)));
      } else {
        expanded.push(pattern);
      }
    } catch {
      expanded.push(pattern);
    }
  }

  return fg(expanded, {
    cwd,
    absolute: true,
    onlyFiles: true,
    unique: true,
    ignore: defaultIgnore,
  });
}

function dedupe(items) {
  return [...new Set(items.map((item) => path.resolve(item)))];
}
