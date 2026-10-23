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

import { planFlutterDocumentation, writeFlutterDocumentation } from "./lib/flutter-target-docs.mjs";

const argv = userArgv();
if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write([
    "Usage: pnpm pb:new:flutter <project_name> [options]",
    "",
    "Create an independent Flutter product target from apps/flutter_pb_app.",
    "",
    "Options:",
    "  --prototype <id>        select prototype product docs, theme dependencies and icons",
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
const selectedPrototype = optionValue(argv, "--prototype");
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
resolvedDestination = await resolveFuturePath(destination);
resolvedRepoRoot = await realpath(repoRoot);
const documentationPlan = await planFlutterDocumentation({
  repoRoot: resolvedRepoRoot, sourceRoot: path.join(resolvedRepoRoot, 'apps/flutter_pb_app'),
  targetRoot: resolvedDestination, prototype: selectedPrototype, displayName, packageName,
});

process.stdout.write([
  `Source:  ${sourceRoot}`,
  `Target:  ${destination}`,
  `Package: ${packageName}`,
  `Display: ${displayName}`,
  `Bundle:  ${bundleId}`,
  `Prototype: ${selectedPrototype ?? "none (product documents remain draft placeholders)"}`,
  ...[...documentationPlan.files.keys()].map((name) => `Document: ${name}`),
  `Base sync: ${manifest.syncStatus} (${manifest.pendingComponents} pending components, ${manifest.pendingTokens} pending tokens)`,
  "",
].join("\n"));

if (manifest.pendingTokens > 0) {
  throw new Error(
    "Base token mapping is incomplete. Finish the source token mapping before scaffolding.",
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
});
await writeProjectFiles();
await writeMcpAndTools();
await writeSkills();
await writeFlutterDocumentation(resolvedDestination, documentationPlan);
const { exportFlutterThemes } = await import('./export-flutter-themes.mjs');
await exportFlutterThemes({targetRoot: resolvedDestination, prototype: selectedPrototype});
const { exportFlutterIcons } = await import('./export-flutter-icons.mjs');
await exportFlutterIcons({targetRoot: resolvedDestination, prototype: selectedPrototype});
// A selected target owns a scope-specific baseline, including only its theme dependencies.
if (selectedPrototype) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/verify-ds-target-sync.mjs'), '--target', resolvedDestination, '--print-baseline'], {cwd: repoRoot, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr);
  await writeFile(path.join(resolvedDestination, 'proto-bridge.sync.json'), result.stdout);
}

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
    if (relative === 'docs' || relative.startsWith('docs/') || ['AGENTS.md', 'README.md'].includes(relative)) return false;
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
    prototype: selectedPrototype ?? null,
    documentation: documentationPlan.provenance,
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
  const claude = `${JSON.stringify({ mcpServers: { "proto-bridge": { command: "node", args: ["\${CLAUDE_PROJECT_DIR:-.}/tool/mcp.mjs"] } } }, null, 2)}\n`;
  await writeFile(path.join(destination, ".mcp.json"), claude, "utf8");
  const codex = `[mcp_servers.proto-bridge]\ncommand = "node"\nargs = ["tool/mcp.mjs"]\nstartup_timeout_sec = 20\n`;
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
      .replaceAll("__PBWORK_SOURCE__", `${producerRelativeFrom(dsSkill)}/apps/pbwork`);
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

function bootstrapPage() {
  return `import 'package:flutter/material.dart';\n\nimport '../common/widgets.dart';\nimport '../theme/ts.dart';\n\nclass BootstrapPage extends StatelessWidget {\n  const BootstrapPage({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    final ts = TS.of(context);\n    return Scaffold(\n      backgroundColor: ts.colors.background,\n      appBar: ${"CommonAppBar"}(\n        title: '${dartText(displayName)}',\n        showAction: false,\n      ),\n      body: ListView(\n        padding: EdgeInsets.all(ts.spacing.md),\n        children: [\n          Text('等待 PBWork Handoff', style: ts.textStyle.title),\n          SizedBox(height: ts.spacing.sm),\n          Text(\n            'MCP 已绑定到本工程。把 PBWork 定稿提示词交给 agent 后，先只读理解 Evidence、按 Screen 输出实现计划并等待批准。',\n            style: ts.textStyle.caption,\n          ),\n          SizedBox(height: ts.spacing.lg),\n          CommonCard(\n            child: Column(\n              crossAxisAlignment: CrossAxisAlignment.start,\n              children: [\n                Text('验证命令', style: ts.textStyle.subtitle),\n                SizedBox(height: ts.spacing.sm),\n                Text('node tool/verify.mjs', style: ts.textStyle.content),\n                Text('node tool/ds-theme.mjs', style: ts.textStyle.content),\n              ],\n            ),\n          ),\n        ],\n      ),\n    );\n  }\n}\n`;
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

async function resolveFuturePath(input) {
  try { return await realpath(input); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return path.join(await resolveFuturePath(path.dirname(input)), path.basename(input));
  }
}
