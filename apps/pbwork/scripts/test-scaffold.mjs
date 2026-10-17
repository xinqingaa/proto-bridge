import { execFileSync } from "node:child_process";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const id = `authoring-smoke-${process.pid}`;
const resultDir = mkdtempSync(path.join(tmpdir(), "pbwork-scaffold-evidence-"));
const run = (args) =>
  execFileSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PBWORK_SCAFFOLD_PROTOTYPE: id,
      PBWORK_E2E_STORE_ROOT: path.join(resultDir, "store"),
      PBWORK_E2E_RESULT_PATH: path.join(resultDir, "result.json"),
    },
  });
let created = false;
try {
  run(["pb:new-prototype", id]);
  created = true;
  run(["--filter", "@proto-bridge/pbwork", "build"]);
  run([
    "--filter",
    "@proto-bridge/pbwork",
    "exec",
    "playwright",
    "test",
    "e2e/scaffold.spec.ts",
    "--workers=1",
  ]);
  console.log(
    `Scaffold finalization evidence: ${path.join(resultDir, "result.json")}`,
  );
} finally {
  if (created) rmSync(path.join(root, "apps/pbwork/src/prototypes", id), {
    recursive: true,
    force: true,
  });
  run(["pb:screens:generate"]);
}
