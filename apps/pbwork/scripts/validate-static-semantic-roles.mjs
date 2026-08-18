import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { SEMANTIC_ROLES } from "@proto-bridge/core/v2";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const formalPrototypesDirectory = join(packageRoot, "src/prototypes");
const staticRoleAttribute = /(?:^|[\s<])data-pb-role\s*=\s*(["'])([^"']*)\1/g;

async function findVueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) return findVueFiles(target);
      return entry.isFile() && target.endsWith(".vue") ? [target] : [];
    }),
  );
  return nested.flat();
}

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

export function findInvalidStaticSemanticRoles(
  source,
  allowedRoles = SEMANTIC_ROLES,
) {
  const allowed = new Set(allowedRoles);
  const violations = [];
  staticRoleAttribute.lastIndex = 0;
  for (
    let match = staticRoleAttribute.exec(source);
    match;
    match = staticRoleAttribute.exec(source)
  ) {
    const role = match[2];
    if (!allowed.has(role)) {
      violations.push({ role, line: lineAt(source, match.index) });
    }
  }
  return violations;
}

export async function lintFormalPrototypeStaticRoles() {
  const files = await findVueFiles(formalPrototypesDirectory);
  const results = await Promise.all(
    files.map(async (file) => ({
      file: relative(packageRoot, file),
      violations: findInvalidStaticSemanticRoles(await readFile(file, "utf8")),
    })),
  );
  return results.flatMap(({ file, violations }) =>
    violations.map((violation) => ({ file, ...violation })),
  );
}

async function main() {
  const violations = await lintFormalPrototypeStaticRoles();
  if (violations.length === 0) return;

  console.error(
    "Static data-pb-role values must belong to Core SEMANTIC_ROLES:",
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} uses \`${violation.role}\``,
    );
  }
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
