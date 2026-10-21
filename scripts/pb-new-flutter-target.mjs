#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import {
  ensureBuilt,
  optionValue,
  repoRoot,
  userArgv,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write([
    "Usage: pnpm pb:new:flutter <project_name> [options]",
    "",
    "Create an independent Flutter product target from apps/flutter_pb_app.",
    "",
    "Options:",
    "  --parent <dir>          default: the directory above proto-bridge",
    "  --name <name>           project name (alternative to positional)",
    "  --display-name <name>   app display name",
    "  --bundle-id <id>        Android/iOS bundle id",
    "  --config <file>         Workspace config used by --set-target",
    "  --yes                   non-interactive",
    "  --dry-run               print the plan without writing",
    "  --no-install            skip flutter pub get (dart format still runs)",
    "  --verify                run analyze/test/full DS check after generation",
    "  --set-target            run pb:target use for the generated directory",
    "  --require-synced        fail when the base sync batch is not synced",
    "",
  ].join("\n"));
  process.exit(0);
}
const sourceRoot = path.join(repoRoot, "apps/flutter_pb_app");
const yes = argv.includes("--yes");
const dryRun = argv.includes("--dry-run");
const install = !argv.includes("--no-install");
const verify = argv.includes("--verify");
const setTarget = argv.includes("--set-target");
const requireSynced = argv.includes("--require-synced");
const configPath = path.resolve(
  repoRoot,
  optionValue(argv, "--config") ?? "proto-bridge.json",
);
const parent = path.resolve(
  repoRoot,
  optionValue(argv, "--parent") ?? "..",
);

let rawName =
  optionValue(argv, "--name") ??
  (argv[0] && !argv[0].startsWith("--") ? argv[0] : undefined);

if (!rawName) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || yes) {
    throw new Error(
      "Usage: pnpm pb:new:flutter <project_name> [--parent ..] [--yes]",
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    rawName = (await rl.question("Project name (e.g. product_app): ")).trim();
  } finally {
    rl.close();
  }
}

const packageName = toPackageName(rawName);
if (packageName === "flutter_pb_app") {
  throw new Error("flutter_pb_app is the reference base and cannot be a new target.");
}
if (packageName === "proto_bridge" || packageName === "proto-bridge") {
  throw new Error("proto-bridge is the producer repository and cannot be a target name.");
}
const displayName =
  optionValue(argv, "--display-name") ?? toDisplayName(packageName);
const bundleId = optionValue(argv, "--bundle-id") ?? defaultBundleId(packageName);
validateBundleId(bundleId);

const destination = path.resolve(parent, packageName);
let resolvedDestination = destination;
let resolvedRepoRoot = repoRoot;
const manifest = await buildManifest();
if (destination === sourceRoot || isInside(destination, sourceRoot)) {
  throw new Error("Destination cannot be inside the reference app.");
}
await assertDestination(destination);

process.stdout.write([
  `Source:  ${sourceRoot}`,
  `Target:  ${destination}`,
  `Package: ${packageName}`,
  `Display: ${displayName}`,
  `Bundle:  ${bundleId}`,
  `Base sync: ${manifest.syncStatus} (${manifest.pendingComponents} pending components, ${manifest.pendingTokens} pending tokens)`,
  "",
].join("\n"));

if (manifest.pendingTokens > 0) {
  throw new Error(
    "Base token mapping is incomplete. Finish the 153-token mapping before scaffolding.",
  );
}
if (manifest.syncStatus !== "synced") {
  const message =
    "Base proto-bridge.sync.json is not synced; inspect DS drift before using this base.";
  if (requireSynced) throw new Error(message);
  process.stdout.write(`Warning: ${message}\n\n`);
}
if (dryRun) {
  process.stdout.write("Dry run: no files were written.\n");
  process.exit(0);
}

if (!yes) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("pb:new:flutter requires --yes in a non-interactive terminal.");
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = (await rl.question(`Create ${destination}? [Y/n]: `))
      .trim()
      .toLowerCase();
    if (answer === "n" || answer === "no") {
      process.stdout.write("Cancelled. Nothing was written.\n");
      process.exit(0);
    }
  } finally {
    rl.close();
  }
}

// Validate live token coverage, not merely the count of explicit pending entries.
await ensureBuilt([
  "packages/core/dist/v2/theme/index.js",
  "packages/core/dist/target/query.js",
  "packages/mcp-server/dist/index.js",
]);
await run(process.execPath, [path.join(repoRoot, "scripts/verify-ds-target-sync.mjs"), "--tokens-only"], repoRoot);
if (requireSynced) await run(process.execPath, [path.join(repoRoot, "scripts/verify-ds-target-sync.mjs")], repoRoot);

await mkdir(destination, { recursive: true });
resolvedDestination = await realpath(destination);
resolvedRepoRoot = await realpath(repoRoot);
await copyBase();
await rewriteTree(destination, {
  packageName,
  displayName,
  bundleId,
  repoRoot,
  destination,
  protoBridgeRelative: path
    .relative(resolvedDestination, resolvedRepoRoot)
    .split(path.sep)
    .join("/"),
});
await writeProjectFiles();
await writeMcpAndTools();
await writeSkills();
await writeDocs();

if (install) {
  try {
    await run("flutter", ["pub", "get"], destination);
  } catch (error) {
    throw new Error(`Files were generated at ${destination}, but dependency installation failed. Run flutter pub get there before using the project.`, { cause: error });
  }
}
try {
  await run("dart", ["format", "lib", "test"], destination);
} catch (error) {
  throw new Error(`Files were generated at ${destination}, but Dart formatting failed.`, { cause: error });
}
if (verify) {
  await run("flutter", ["analyze"], destination);
  await run("flutter", ["test"], destination);
  await run(
    process.execPath,
    [
      path.join(repoRoot, "scripts/verify-ds-target-sync.mjs"),
      "--target",
      destination,
    ],
    destination,
  );
}

if (setTarget) {
  await run(
    process.execPath,
    [
      path.join(repoRoot, "scripts/pb-target.mjs"),
      "use",
      destination,
      "--yes",
      "--config",
      configPath,
    ],
    repoRoot,
  );
}

process.stdout.write([
  "",
  `Generated ${destination} (${verify ? "native checks and full DS verification passed" : "verification not requested"})`,
  "",
  "Next:",
  `  cd ${destination}`,
  "  flutter pub get",
  "  node tool/target.mjs --show",
  "  node tool/verify.mjs",
  "  flutter run -d <device>",
  "",
  "MCP is configured in .cursor/mcp.json, .codex/config.toml, .mcp.json.",
  "PBWork prompt target must match this directory:",
  "node tool/target.mjs --bind",
  "",
].join("\n"));

async function buildManifest() {
  const targetMapping = JSON.parse(
    await readFile(path.join(sourceRoot, "proto-bridge.target.json"), "utf8"),
  );
  const sync = JSON.parse(
    await readFile(path.join(sourceRoot, "proto-bridge.sync.json"), "utf8"),
  );
  return {
    syncStatus: sync.status,
    pendingComponents: Object.values(targetMapping.components ?? {}).filter(
      (entry) => entry?.status === "pending",
    ).length,
    pendingTokens: Object.values(targetMapping.tokens ?? {}).filter(
      (entry) => entry?.status === "pending",
    ).length,
    sync,
    targetMapping,
  };
}

async function assertDestination(dir) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) throw new Error(`${dir} exists and is not a directory.`);
    const entries = await readdir(dir);
    if (entries.length > 0) {
      throw new Error(`Destination already exists and is not empty: ${dir}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function copyBase() {
  await copyTree(sourceRoot, destination, (relative) => {
    if (relative.split(path.sep).some((part) => ["ephemeral", ".swiftpm", "xcuserdata", ".git"].includes(part))) return false;
    if (relative === "lib/features" || relative.startsWith("lib/features/")) {
      return false;
    }
    if (relative.startsWith("build/") || relative === "build") return false;
    if (relative.startsWith(".dart_tool/") || relative === ".dart_tool") return false;
    if (relative.startsWith(".idea/") || relative === ".idea") return false;
    if (relative.endsWith(".iml")) return false;
    if (relative === ".flutter-plugins-dependencies") return false;
    if (relative === "test/widget_test.dart") return false;
    if (relative === "test/cold_chain_ops_test.dart") return false;
    if (relative.startsWith("ios/Pods/") || relative === "ios/Pods") return false;
    if (relative.startsWith("ios/.symlinks/") || relative === "ios/.symlinks") return false;
    if (relative === "ios/Podfile.lock") return false;
    if (relative === "ios/Flutter/Generated.xcconfig") return false;
    if (relative === "ios/Flutter/flutter_export_environment.sh") return false;
    if (relative === "ios/Runner/GeneratedPluginRegistrant.h") return false;
    if (relative === "ios/Runner/GeneratedPluginRegistrant.m") return false;
    if (relative.startsWith("android/.gradle/") || relative === "android/.gradle") return false;
    if (relative === "android/local.properties") return false;
    if (relative === "android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java") {
      return false;
    }
    if (relative.startsWith("android/app/build/") || relative === "android/app/build") {
      return false;
    }
    return true;
  });
}

async function copyTree(source, target, filter) {
  await cp(source, target, {
    recursive: true,
    filter: (sourcePath) => filter(path.relative(sourceRoot, sourcePath)),
  });
}

async function rewriteTree(root, context) {
  const textExtensions = new Set([
    ".dart",
    ".yaml",
    ".yml",
    ".md",
    ".json",
    ".kts",
    ".gradle",
    ".xml",
    ".plist",
    ".pbxproj",
    ".kt",
    ".swift",
    ".sh",
    ".mjs",
  ]);
  for (const file of await walk(root)) {
    if (!textExtensions.has(path.extname(file))) continue;
    let text = await readFile(file, "utf8");
    text = text
      .replaceAll("package:flutter_pb_app/", `package:${context.packageName}/`)
      .replaceAll("package:flutter_pb_app", `package:${context.packageName}`)
      .replaceAll("com.protobridge.flutterPbApp", context.bundleId)
      .replaceAll("com.protobridge.flutter_pb_app", context.bundleId)
      .replaceAll("flutterPbApp", context.packageName)
      .replaceAll("flutter_pb_app", context.packageName)
      .replaceAll("Flutter Pb App", context.displayName);
    await writeFile(file, text, "utf8");
  }
  await rewritePubspec(context);
  await rewritePlatformIdentity(context);
  await rewriteDocsAndAgent(context);
  await rewriteSync(context);
}

async function rewritePubspec({ packageName, displayName }) {
  const file = path.join(destination, "pubspec.yaml");
  let text = await readFile(file, "utf8");
  text = text
    .replace(/^name:.*$/m, `name: ${packageName}`)
    .replace(
      /^description:.*$/m,
      `description: ${JSON.stringify(`${displayName} Flutter target generated from flutter_pb_app.`)}`,
    );
  await writeFile(file, text, "utf8");
}

async function rewritePlatformIdentity({ packageName, displayName, bundleId }) {
  const androidGradle = path.join(destination, "android/app/build.gradle.kts");
  let gradle = await readFile(androidGradle, "utf8");
  gradle = gradle.replaceAll("com.protobridge.flutter_pb_app", bundleId);
  await writeFile(androidGradle, gradle, "utf8");

  const manifest = path.join(destination, "android/app/src/main/AndroidManifest.xml");
  let manifestText = await readFile(manifest, "utf8");
  manifestText = manifestText.replace(
    /android:label="[^"]*"/,
    `android:label="${xmlText(displayName)}"`,
  );
  await writeFile(manifest, manifestText, "utf8");

  const oldMain = path.join(
    destination,
    "android/app/src/main/kotlin/com/protobridge/flutter_pb_app/MainActivity.kt",
  );
  const newMain = path.join(
    destination,
    "android/app/src/main/kotlin",
    ...bundleId.split("."),
    "MainActivity.kt",
  );
  if (await exists(oldMain)) {
    await mkdir(path.dirname(newMain), { recursive: true });
    await rename(oldMain, newMain);
    await writeFile(
      newMain,
      `package ${bundleId}\n\nimport io.flutter.embedding.android.FlutterActivity\n\nclass MainActivity : FlutterActivity()\n`,
      "utf8",
    );
  }

  const infoPlist = path.join(destination, "ios/Runner/Info.plist");
  let plist = await readFile(infoPlist, "utf8");
  plist = plist
    .replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleDisplayName</key>\n\t<string>${xmlText(displayName)}</string>`,
    )
    .replace(
      /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleName</key>\n\t<string>${packageName}</string>`,
    );
  await writeFile(infoPlist, plist, "utf8");

  const pbxproj = path.join(destination, "ios/Runner.xcodeproj/project.pbxproj");
  let project = await readFile(pbxproj, "utf8");
  project = project.replaceAll("com.protobridge.flutterPbApp", bundleId);
  await writeFile(pbxproj, project, "utf8");
}

async function rewriteDocsAndAgent({ packageName, displayName, repoRoot, protoBridgeRelative }) {
  const replacements = [
    ["apps/pbwork", `${protoBridgeRelative}/apps/pbwork`],
    ["../pbwork", `${protoBridgeRelative}/apps/pbwork`],
    ["apps/flutter_pb_app", packageName],
    ["flutter_pb_app", packageName],
    ["../../../docs", `${protoBridgeRelative}/docs`],
    ["../../packages", `${protoBridgeRelative}/packages`],
    ["cd ../.. && pnpm ds:target-sync:verify", "node tool/ds-sync.mjs"],
    ["cd ../.. && pnpm ds:theme:verify", "node tool/ds-theme.mjs"],
    ["pnpm ds:target-sync:verify", "node tool/ds-sync.mjs"],
    ["pnpm ds:theme:verify", "node tool/ds-theme.mjs"],
  ];
  for (const file of [
    path.join(destination, "AGENTS.md"),
    path.join(destination, "README.md"),
    ...(await walk(path.join(destination, "docs"))),
  ]) {
    let text = await readFile(file, "utf8");
    const relativeProducer = producerRelativeFrom(file);
    for (const [from, to] of replacements) {
      text = text.replaceAll(from, to.replaceAll(protoBridgeRelative, relativeProducer));
    }
    text = text.replaceAll("基线仅以 Demo 为入口", "生成工程以 Bootstrap 为入口")
      .replaceAll("和 Demo 对照区", "")
      .replaceAll("feature 与 Demo 必须", "feature 必须")
      .replaceAll("组件使用示例以 `lib/features/` 和 `lib/features/demo/` 为准；Demo 底部 Tabbar 本身就是根目的地导航实例，不再在 Navigation 分类中放置无内容切换的重复样例。", "组件公开 API 以 lib/common 的源码为准；业务页面按固定 Handoff 在 lib/features 中实现。")
      .replaceAll("基线的 `lib/features/demo/` 提供对照；Demo 底部 Tabbar 本身就是根目的地导航实例，不再在 Navigation 分类中放置无内容切换的重复样例。", "生成工程使用 Bootstrap 入口；公共组件示例参见 test/。")
      .replaceAll("- `/` Demo 对照（基线入口）\n- `/launch` Flutter 欢迎页；不是原生启动屏", "- `/` Bootstrap 入口；业务路由由固定 Handoff 创建")
      .replaceAll("test/widget_test.dart", "test/bootstrap_test.dart");
    await writeFile(file, text, "utf8");
  }
  await writeFile(
    path.join(destination, "AGENTS.md"),
    agentInstructions({ packageName, displayName }),
    "utf8",
  );
  await writeFile(
    path.join(destination, "README.md"),
    readme({ packageName, displayName }),
    "utf8",
  );
}

async function rewriteSync({ repoRoot, destination }) {
  const file = path.join(destination, "proto-bridge.sync.json");
  const sync = JSON.parse(await readFile(file, "utf8"));
  sync.target =
    path.relative(resolvedRepoRoot, resolvedDestination).split(path.sep).join("/") ||
    ".";
  await writeFile(file, `${JSON.stringify(sync, null, 2)}\n`, "utf8");
}

async function writeProjectFiles() {
  await mkdir(path.join(destination, "lib/features"), { recursive: true });
  await writeFile(
    path.join(destination, "lib/features/README.md"),
    "# Features\n\n业务页面按 PBWork Handoff 的 Screen 落在这里；一个 feature 一个目录，不复制 demo 或冷链示例。\n",
    "utf8",
  );
  await writeFile(
    path.join(destination, "lib/router/routes.dart"),
    `/// Navigator 1.0 named route paths.\n///\n/// New screens: add a constant here, register in [appRoutes], and expose an\n/// entry from the screen's feature flow when needed.\nabstract final class AppRoutes {\n  static const bootstrap = '/';\n}\n`,
    "utf8",
  );
  await writeFile(
    path.join(destination, "lib/router/router.dart"),
    `import 'package:flutter/material.dart';\n\nimport '../app/bootstrap_page.dart';\nimport 'routes.dart';\n\nexport 'routes.dart';\n\nfinal appNavigatorKey = GlobalKey<NavigatorState>();\n\nfinal Map<String, WidgetBuilder> appRoutes = {\n  AppRoutes.bootstrap: (_) => const BootstrapPage(),\n};\n`,
    "utf8",
  );
  await writeFile(
    path.join(destination, "lib/app/bootstrap_page.dart"),
    bootstrapPage(),
    "utf8",
  );
  let app = await readFile(path.join(destination, "lib/app/app.dart"), "utf8");
  app = app
    .replace(/initialRoute: AppRoutes\.\w+/, "initialRoute: AppRoutes.bootstrap")
    .replace(/title: '[^']*'/, `title: '${dartText(displayName)}'`);
  await writeFile(path.join(destination, "lib/app/app.dart"), app, "utf8");
  await writeFile(
    path.join(destination, "test/bootstrap_test.dart"),
    `import 'package:flutter_test/flutter_test.dart';\n\nimport 'support/pump_app.dart';\n\nvoid main() {\n  testWidgets('bootstrap renders the generated target shell', (tester) async {\n    await pumpPbApp(tester);\n    await tester.pumpAndSettle();\n\n    expect(find.text('${dartText(displayName)}'), findsOneWidget);\n    expect(find.text('等待 PBWork Handoff'), findsOneWidget);\n  });\n}\n`,
    "utf8",
  );
}

async function writeMcpAndTools() {
  const scaffoldManifest = {
    schemaVersion: 1,
    base: "apps/flutter_pb_app",
    protoBridgeRoot: path
      .relative(resolvedDestination, resolvedRepoRoot)
      .split(path.sep)
      .join("/"),
    workspaceConfig: path.relative(repoRoot, configPath).split(path.sep).join("/"),
    targetRoot: ".",
    packageName,
    displayName,
    bundleId,
    baseSurfaceDigest: manifest.sync.surfaceDigest,
    baseSyncStatus: manifest.syncStatus,
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(destination, ".pb-scaffold.json"),
    `${JSON.stringify(scaffoldManifest, null, 2)}\n`,
    "utf8",
  );
  await mkdir(path.join(destination, "tool"), { recursive: true });
  const launcher = `#!/usr/bin/env node\nimport { spawn } from 'node:child_process';\nimport { readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');\nconst manifest = JSON.parse(readFileSync(path.join(projectRoot, '.pb-scaffold.json'), 'utf8'));\nconst pbRoot = path.resolve(projectRoot, manifest.protoBridgeRoot);\nconst workspaceConfig = path.resolve(pbRoot, manifest.workspaceConfig);\nconst child = spawn(process.execPath, [\n  path.join(pbRoot, 'scripts/pb-mcp.mjs'),\n  '--config', workspaceConfig,\n  '--target', projectRoot,\n], { cwd: projectRoot, stdio: 'inherit', env: process.env });\nchild.once('error', (error) => { throw error; });\nchild.once('exit', (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });\n`;
  await writeFile(path.join(destination, "tool/mcp.mjs"), launcher, { encoding: "utf8", mode: 0o755 });
  await writeFile(
    path.join(destination, "tool/verify.mjs"),
    toolVerify(false, true),
    { encoding: "utf8", mode: 0o755 },
  );
  await writeFile(
    path.join(destination, "tool/ds-theme.mjs"),
    toolVerify(true, false),
    { encoding: "utf8", mode: 0o755 },
  );
  await writeFile(
    path.join(destination, "tool/ds-sync.mjs"),
    toolVerify(false, false),
    { encoding: "utf8", mode: 0o755 },
  );
  await writeFile(path.join(destination, "tool/target.mjs"), targetTool(), { encoding: "utf8", mode: 0o755 });
  const cursor = `${JSON.stringify({ mcpServers: { "proto-bridge": { command: "node", args: ["\${workspaceFolder}/tool/mcp.mjs"] } } }, null, 2)}\n`;
  await mkdir(path.join(destination, ".cursor"), { recursive: true });
  await writeFile(path.join(destination, ".cursor/mcp.json"), cursor, "utf8");
  const claude = `${JSON.stringify({ mcpServers: { "proto-bridge": { command: "node", args: [path.join(destination, "tool/mcp.mjs")] } } }, null, 2)}\n`;
  await writeFile(path.join(destination, ".mcp.json"), claude, "utf8");
  const codex = `[mcp_servers.proto-bridge]\ncommand = "node"\nargs = ${JSON.stringify([path.join(destination, "tool/mcp.mjs")])}\nstartup_timeout_sec = 20\n`;
  await mkdir(path.join(destination, ".codex"), { recursive: true });
  await writeFile(path.join(destination, ".codex/config.toml"), codex, "utf8");
  await mkdir(path.join(destination, ".agents"), { recursive: true });
  await writeFile(
    path.join(destination, ".agents/mcp.json"),
    `${JSON.stringify({ server: "proto-bridge", command: "node", args: ["tool/mcp.mjs"] }, null, 2)}\n`,
    "utf8",
  );
}

async function writeSkills() {
  const skillRoot = path.join(destination, ".agents/skills");
  const consumer = path.join(skillRoot, "proto-bridge-consumer/SKILL.md");
  if (await exists(consumer)) {
    let text = await readFile(consumer, "utf8");
    text = text
      .replaceAll("apps/flutter_pb_app", packageName)
      .replaceAll(`apps/${packageName}`, packageName)
      .replaceAll("flutter_pb_app", packageName);
    text = text.replace(
      "## 编辑前读取",
      "MCP 已由 `tool/mcp.mjs` 绑定到本工程；不要修改 proto-bridge producer，也不要把 Target 查询结果当作 Source Evidence。\n\n## 编辑前读取",
    );
    await writeFile(consumer, text, "utf8");
  }
  const dsSkill = path.join(skillRoot, "proto-bridge-ds-target-sync/SKILL.md");
  if (await exists(dsSkill)) {
    let text = await readFile(dsSkill, "utf8");
    text = text
      .replaceAll("pnpm ds:target-sync:verify", "node tool/ds-sync.mjs")
      .replaceAll("pnpm ds:theme:verify", "node tool/ds-theme.mjs")
      .replaceAll("cd ../.. && node tool/ds-sync.mjs", "node tool/ds-sync.mjs")
      .replaceAll("cd ../.. && node tool/ds-theme.mjs", "node tool/ds-theme.mjs")
      .replaceAll("../../../../pbwork", "__PBWORK_SOURCE__")
      .replaceAll("apps/pbwork", "__PBWORK_SOURCE__")
      .replaceAll("__PBWORK_SOURCE__", `${producerRelativeFrom(dsSkill)}/apps/pbwork`)
      .replaceAll("32 个当前 Contract id", "47 个当前 Contract id");
    await writeFile(dsSkill, text, "utf8");
  }
  const acceptanceSource = path.join(repoRoot, ".agents/skills/acceptance/SKILL.md");
  const acceptanceTarget = path.join(skillRoot, "acceptance");
  await mkdir(path.join(acceptanceTarget, "references"), { recursive: true });
  let acceptance = await readFile(acceptanceSource, "utf8");
  acceptance = acceptance.replaceAll("`proto-bridge` Skill", "`proto-bridge-consumer` Skill");
  acceptance = acceptance.replace(
    "../../../packages/core/src/v2/prompts/acceptance-discipline.md",
    "references/acceptance-discipline.md",
  );
  await writeFile(path.join(acceptanceTarget, "SKILL.md"), acceptance, "utf8");
  await cp(
    path.join(repoRoot, "packages/core/src/v2/prompts/acceptance-discipline.md"),
    path.join(acceptanceTarget, "references/acceptance-discipline.md"),
  );
}

async function writeDocs() {
  await writeFile(
    path.join(destination, "docs/routing.md"),
    `# 路由\n\n工程使用 Navigator 1.0 命名路由。\n\n## 注册位置\n\n- 路由常量定义在 \`lib/router/routes.dart\`。\n- 页面注册在 \`lib/router/router.dart\` 的 \`appRoutes\`。\n- 页面跳转优先使用 \`Navigator.of(context).pushNamed(...)\`。\n- 返回行为使用 \`maybePop\` 或页面已有的 \`CommonAppBar\` 返回动作。\n\n## 当前路由\n\n- \`/\` Bootstrap 空壳，等待固定 PBWork Handoff。\n\n业务页面按 Screen 新增时同步补路由常量、注册、参数解析和 Widget test。\n`,
    "utf8",
  );
  await writeFile(
    path.join(destination, "docs/agent-workflow.md"),
    agentWorkflow(),
    "utf8",
  );
  await writeFile(
    path.join(destination, "README.md"),
    readme({ packageName, displayName }),
    "utf8",
  );
}

function bootstrapPage() {
  return `import 'package:flutter/material.dart';\n\nimport '../common/widgets.dart';\nimport '../theme/ts.dart';\n\nclass BootstrapPage extends StatelessWidget {\n  const BootstrapPage({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    final ts = TS.of(context);\n    return Scaffold(\n      backgroundColor: ts.colors.background,\n      appBar: ${"CommonAppBar"}(\n        title: '${dartText(displayName)}',\n        showAction: false,\n      ),\n      body: ListView(\n        padding: EdgeInsets.all(ts.spacing.md),\n        children: [\n          Text('等待 PBWork Handoff', style: ts.textStyle.title),\n          SizedBox(height: ts.spacing.sm),\n          Text(\n            'MCP 已绑定到本工程。把 PBWork 定稿提示词交给 agent 后，先只读理解 Evidence、按 Screen 输出实现计划并等待批准。',\n            style: ts.textStyle.caption,\n          ),\n          SizedBox(height: ts.spacing.lg),\n          CommonCard(\n            child: Column(\n              crossAxisAlignment: CrossAxisAlignment.start,\n              children: [\n                Text('验证命令', style: ts.textStyle.subtitle),\n                SizedBox(height: ts.spacing.sm),\n                Text('node tool/verify.mjs', style: ts.textStyle.content),\n                Text('node tool/ds-theme.mjs', style: ts.textStyle.content),\n              ],\n            ),\n          ),\n        ],\n      ),\n    );\n  }\n}\n`;
}

function agentInstructions({ packageName, displayName }) {
  return `# ${displayName} Agent Rules\n\n本工程由 \`pnpm pb:new:flutter\` 从 flutter_pb_app 基线生成，是独立的 **${packageName}** 产品 target，不是 ProtoBridge 仓库。\`lib/features/\` 为空；业务页面由固定 PBWork Handoff 按 Screen 落在这里。\n\nMCP 已由 \`.cursor/mcp.json\`、\`.codex/config.toml\`、\`.mcp.json\` 指向 \`tool/mcp.mjs\`；不要修改 proto-bridge producer，也不要在目标工程复制 Evidence Store。\n\n收到固定 Evidence 时先读 \`.agents/skills/proto-bridge-consumer/SKILL.md\`；DS 同步任务读 \`.agents/skills/proto-bridge-ds-target-sync/SKILL.md\`；完成实现准备 Review 时读 \`.agents/skills/acceptance/SKILL.md\`。\n\n## 文档优先级\n\n1. 固定 ProtoBridge Evidence 决定源页面的结构、文案、状态、交互和构图。\n2. 本工程 \`AGENTS.md\`、\`docs/\` 和实际代码决定 Target 落点、组件、Theme、路由与验证方式。\n3. Target adapter 结果只提供目标上下文，不能覆盖 Screenshot、Fragment、Case 或 revision。\n\n## 修改边界\n\n- 业务页面和页面模型放在 \`lib/features/<feature>/\`。\n- 页面业务状态使用 Riverpod \`Notifier\` / \`AsyncNotifier\`，不要用 \`setState\` 承载筛选、表单或 variant。\n- 持久化只走 \`AppPrefs\`；feature 不得直接使用 \`MMKV\`。\n- 路由常量和注册表只放在 \`lib/router/\`。\n- 主题和语义 token 只放在 \`lib/theme/\`。\n- 可复用 UI 和共享弹层只放在 \`lib/common/\`。\n- 不在 feature 中复制公共组件、创建平行 Theme 或绕过既有路由/弹层边界。\n\n## 第一轮纪律\n\n拿到 PBWork 提示词后，先读 \`AGENTS.md\`、\`README.md\`、\`docs/\` 和 Consumer Skill；只读理解 Evidence 与目标工程，按 Screen 用简短散文输出结构/滚动边界、组件与 Token 落点、状态与交互覆盖、预计修改文件、验证方式和剩余风险；然后暂停等待明确批准。未批准前不得修改本工程。\n\n## 必要验证\n\n\`\`\`bash\nflutter analyze\nflutter test\nnode tool/verify.mjs\nnode tool/ds-theme.mjs\n# 完整组件与 Token 同步门禁\nnode tool/ds-sync.mjs\n\`\`\`\n\n主题门禁检查 153 个 Token；完整 \`ds-sync.mjs\` 同时检查 47 个组件与当前 DS surface。共享组件扩展必须遵循当前 Contract 和目标工程规范；映射成功不等于视觉验收通过。\n\n视觉验证遵循 \`docs/testing.md\`；最终报告必须包含固定引用、原始风险、修改文件、验证结果、已知偏差和剩余风险。\n`;
}

function readme({ packageName, displayName }) {
  return `# ${displayName}\n\n\`${packageName}\` 是从 flutter_pb_app 生成的产品 target 骨架。它继承 PBWork 主题/Token、公共组件、路由和测试底座，\`lib/features/\` 为空，等待固定 PBWork Handoff 落业务页面。\n\n## 快速开始\n\n\`\`\`bash\nflutter pub get\nflutter analyze\nflutter test\nnode tool/verify.mjs\nflutter run -d <device>\n\`\`\`\n\n## MCP\n\nMCP 已配置在 \`.cursor/mcp.json\`、\`.codex/config.toml\`、\`.mcp.json\`，统一指向 \`tool/mcp.mjs\`。Codex 需要 trust 本目录后才会加载项目级配置。\n\nPBWork 提示词里的目标路径必须与本目录一致；不一致时先运行：\n\n\`\`\`bash\nnode tool/target.mjs --bind\n\`\`\`\n\n## 文档\n\n- [工程架构](docs/architecture.md)\n- [组件](docs/components.md)\n- [Theme 与 Token](docs/theme.md)\n- [路由](docs/routing.md)\n- [测试](docs/testing.md)\n- [ProtoBridge 目标适配](docs/proto-bridge.md)\n- [Agent 工作流](docs/agent-workflow.md)\n\n## 验证\n\n\`node tool/ds-theme.mjs\` 验证 153 个 Token；\`node tool/ds-sync.mjs\` 同时验证 47 个组件与当前 DS surface。\n`;
}

function agentWorkflow() {
  return `# Agent 工作流\n\n本工程已经带好 MCP 配置和 target 文档，agent 不需要重新拼 proto-bridge 路径。\n\n## 第一轮\n\n1. 读 \`AGENTS.md\`、\`README.md\`、\`docs/\` 和 Consumer Skill。\n2. 调用 \`inspect_evidence_workspace\`，确认 \`deliveryTargetRoot\` 指向本目录；不一致就停止并报告。\n3. 按固定 Handoff 读取 index、Screen packet、不同 digest 的 Screenshot、Case delta。\n4. 调用 \`inspect_target_readiness\`；组件/Token 的 \`pending\` 必须披露，不得替换实现。\n5. 每个 Screen 用简短散文写 Evidence 理解摘要和实现计划，然后暂停等待批准。\n\n## 批准后\n\n- 只在 \`lib/features/<feature>/\` 落业务页面；路由写 \`lib/router/\`。\n- 复用 \`lib/common/\`、\`lib/theme/\` 和既有路由/弹层边界。\n- 运行 \`node tool/verify.mjs\`；视觉验收按 \`docs/testing.md\`。\n- 完成后按 \`.agents/skills/acceptance/SKILL.md\` 做五维 Review，不把 self-report 当成最终视觉验收。\n\n## 不要做\n\n- 不要修改 proto-bridge producer。\n- 不要在 feature 中复制公共组件或新建平行 Theme。\n- 不要把 \`pending\` 组件/Token 当成 resolved，也不要用通用 widget 静默替代。\n`;
}

function toolVerify(themeOnly, includeFlutter) {
  const check = themeOnly ? "--tokens-only" : "";
  return `#!/usr/bin/env node\nimport { spawn } from 'node:child_process';\nimport { readFileSync } from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');\nconst manifest = JSON.parse(readFileSync(path.join(projectRoot, '.pb-scaffold.json'), 'utf8'));\nconst pbRoot = path.resolve(projectRoot, manifest.protoBridgeRoot);\n\nfunction run(command, args) {\n  return new Promise((resolve, reject) => {\n    const child = spawn(command, args, { cwd: projectRoot, stdio: 'inherit', env: process.env });\n    child.once('error', reject);\n    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(\`\${command} \${args.join(' ')} exited \${code}\`)));\n  });\n}\n\n${includeFlutter ? `await run('flutter', ['pub', 'get']);\nawait run('dart', ['format', '--output=none', '--set-exit-if-changed', 'lib', 'test']);\nawait run('flutter', ['analyze']);\nawait run('flutter', ['test']);\n` : ""}await run(process.execPath, [path.join(pbRoot, 'scripts/verify-ds-target-sync.mjs'), '--target', projectRoot${check ? `, '${check}'` : ""}]);\n`;
}

async function walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toPackageName(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  let name = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!name) throw new Error("Project name must contain letters or digits.");
  if (/^[0-9]/.test(name)) name = `app_${name}`;
  if (new Set(["flutter", "class", "enum", "switch", "if", "else", "import", "export", "library", "part", "return", "void", "true", "false", "null", "new", "const", "final", "var", "while", "for", "try", "catch", "throw", "this", "super", "extends", "with", "is", "in", "assert", "break", "continue", "do", "rethrow"]).has(name)) {
    throw new Error(`${name} is reserved and cannot be a Dart package name.`);
  }
  return name;
}

function toDisplayName(value) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultBundleId(value) {
  return `com.protobridge.${value.replaceAll("_", "")}`;
}

function validateBundleId(value) {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value)) {
    throw new Error(`Invalid bundle id: ${value}`);
  }
}

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

function xmlText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function dartText(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("$", "\\$").replaceAll("\n", "\\n").replaceAll("\r", "\\r");
}

function targetTool() {
  return String.raw`#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const targetRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(targetRoot, '.pb-scaffold.json'), 'utf8'));
const producer = path.resolve(targetRoot, manifest.protoBridgeRoot);
const config = path.resolve(producer, manifest.workspaceConfig);
if (process.argv.includes('--bind')) {
  const result = spawnSync(process.execPath, [path.join(producer, 'scripts/pb-target.mjs'), 'use', targetRoot, '--yes', '--config', config], { cwd: producer, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  const workspace = JSON.parse(readFileSync(config, 'utf8'));
  const deliveryTarget = workspace.delivery?.targetRoot ? path.resolve(path.dirname(config), workspace.delivery.targetRoot) : null;
  const matches = deliveryTarget === targetRoot;
  process.stdout.write(JSON.stringify({ workspaceId: workspace.workspaceId, targetRoot, deliveryTarget, matches, producer, baseSurfaceDigest: manifest.baseSurfaceDigest }, null, 2) + '\n');
  if (!matches) {
    process.stderr.write('PBWork delivery target differs. Run node tool/target.mjs --bind, then restart Producer/MCP clients and regenerate the delivery prompt.\n');
    if (process.argv.includes('--check')) process.exitCode = 1;
  }
}
`;
}

function producerRelativeFrom(file) {
  const actualDirectory = path.join(resolvedDestination, path.relative(destination, path.dirname(file)));
  return path.relative(actualDirectory, resolvedRepoRoot).split(path.sep).join("/");
}
