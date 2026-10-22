import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const moduleId = "virtual:pb-runtime-source";
const resolvedId = `\0${moduleId}`;
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const roots = [
  path.join(appRoot, "src"),
  path.join(appRoot, "build"),
  path.resolve(appRoot, "../../packages/core/src"),
];
const inputFiles = [
  path.resolve(appRoot, "../../pnpm-lock.yaml"),
  path.resolve(appRoot, "../../tsconfig.base.json"),
  path.resolve(appRoot, "../../packages/core/package.json"),
  ...["package.json", "vite.config.ts", "tsconfig.json"].map((file) =>
    path.join(appRoot, file),
  ),
];

/** Hash actual Runtime inputs, so an unchanged Registry cannot hide a Vue fix. */
export function runtimeSourceDigest(
  sourceRoots = roots,
  sourceFiles = inputFiles,
): string {
  const hash = createHash("sha256");
  const visit = (directory: string, prefix: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (["docs", "drafts"].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      const key = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) visit(file, key);
      else if (entry.isFile())
        hash.update(key).update("\0").update(readFileSync(file)).update("\0");
    }
  };
  sourceRoots.forEach((root, index) => visit(root, String(index)));
  sourceFiles.forEach((file, index) =>
    hash
      .update(`input/${index}`)
      .update("\0")
      .update(readFileSync(file))
      .update("\0"),
  );
  return `sha256:${hash.digest("hex")}`;
}

export function runtimeSourcePlugin(): Plugin {
  return {
    name: "pb-runtime-source",
    resolveId: (id) => (id === moduleId ? resolvedId : undefined),
    load: (id) =>
      id === resolvedId
        ? `export default ${JSON.stringify(runtimeSourceDigest())};`
        : undefined,
    configureServer(server) {
      let digest = runtimeSourceDigest();
      let timer: ReturnType<typeof setTimeout> | undefined;
      server.watcher.add([...roots, ...inputFiles]);
      server.watcher.on("all", (_event, file) => {
        if (
          (!inputFiles.includes(file) &&
            !roots.some((root) => file.startsWith(`${root}${path.sep}`))) ||
          /[/\\](docs|drafts)[/\\]/.test(file)
        )
          return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const next = runtimeSourceDigest();
          // Adding existing source directories to the watcher emits initial add events.
          if (next === digest) return;
          digest = next;
          const module = server.moduleGraph.getModuleById(resolvedId);
          if (module) server.moduleGraph.invalidateModule(module);
          // Protocol caches belong to one source revision, including during HMR.
          server.ws.send({ type: "full-reload", path: "*" });
        }, 50);
      });
    },
  };
}
