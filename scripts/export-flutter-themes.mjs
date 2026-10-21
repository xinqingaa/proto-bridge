#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { flutterThemeSource } from "./lib/flutter-theme-source.mjs";
import { parseSvgArtwork, svgForView } from "../apps/pbwork/src/design-system/components/_shared/svg-artwork.mjs";
import { repoRoot, optionValue } from "./lib/pb-script-utils.mjs";
import { parseThemeColor } from "../packages/core/dist/v2/theme/index.js";
const q = (value) => JSON.stringify(value).replaceAll("$", "\\$");
const num = (v) => {
  if (typeof v === "number") return String(v);
  const m = /^(-?[\d.]+)(px|dvh|vh|em|rem)?$/.exec(v);
  if (!m) throw new Error(`Unsupported Flutter length: ${v}`);
  return String(
    (Number(m[1]) * (m[2] === "rem" ? 16 : 1)) /
      (/vh$/.test(m[2] ?? "") ? 100 : 1),
  );
};
const color = (value) => {
  const c = parseThemeColor(value);
  if (!c) throw new Error(`Unsupported color: ${value}`);
  return `Color.fromRGBO(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
};
function shadowList(value) {
  if (value === "none") return "[]";
  value = String(value).replace(/^drop-shadow\((.*)\)$/, "$1");
  const parts = String(value)
    .split(/,(?![^()]*\))/)
    .filter((s) => !s.trim().startsWith("inset"));
  return `[${parts
    .map((s) => {
      const m =
        /^\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?(?:\s+(-?[\d.]+)px)?\s+(.+)$/.exec(
          s,
        );
      if (!m) throw new Error(`Unsupported shadow: ${s}`);
      return `BoxShadow(color: ${color(m[5])}, offset: Offset(${m[1]}, ${m[2]}), blurRadius: ${m[3]}, spreadRadius: ${m[4] ?? 0})`;
    })
    .join(",")}]`;
}
function shadow(value) {
  const list = shadowList(value);
  return list === "[]"
    ? "BoxShadow(color: Colors.transparent)"
    : list
        .slice(1, -1)
        .split(/\),BoxShadow/)[0]
        .replace(/\)$/, "") + ")";
}
function curve(value) {
  if (value === "ease") return "Curves.ease";
  if (value === "linear") return "Curves.linear";
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  if (!m) throw new Error(`Unsupported easing ${value}`);
  return `Cubic(${m[1]})`;
}
export async function exportFlutterThemes({
  targetRoot,
  check = false,
  prototype,
} = {}) {
  targetRoot ??= path.join(repoRoot, "apps/flutter_pb_app");
  const source = await flutterThemeSource();
  let selected = [...source.packs.keys()];
  if (prototype) {
    if (!/^[a-z][a-z0-9-]*$/.test(prototype))
      throw new Error("Invalid prototype id");
    const declaration = await readFile(
      path.join(
        repoRoot,
        `apps/pbwork/src/prototypes/${prototype}/prototype.ts`,
      ),
      "utf8",
    );
    const id = /themePackId:\s*["']([^"']+)/.exec(declaration)?.[1];
    if (!id || !source.packs.has(id))
      throw new Error(`Unregistered prototype theme: ${prototype}`);
    selected = [];
    for (
      let current = id;
      current;
      current = source.packs.get(current)?.manifest.extends
    )
      selected.unshift(current);
  }
  const tables = source.tables.filter((t) =>
    selected.includes(t.identity.packId),
  );
  const snapshot = await readFile(
    path.join(targetRoot, "lib/theme/proto_bridge_tokens.dart"),
    "utf8",
  );
  const mappings = [...snapshot.matchAll(/'([^']+)':\s*ts\.(\w+)\.(\w+)/g)].map(
    (m) => ({ key: m[1], group: m[2], field: m[3] }),
  );
  const groups = (v, group, extra = {}) => {
    const fields = { ...extra };
    for (const m of mappings.filter((m) => m.group === group)) {
      if (m.key in v) {
        const raw = v[m.key];
        if (
          m.field in fields &&
          JSON.stringify(fields[m.field]) !== JSON.stringify(raw)
        )
          throw new Error(`Accessor collision: ${m.key}`);
        fields[m.field] = raw;
      }
    }
    return fields;
  };
  const args = (fields, convert) =>
    Object.entries(fields)
      .map(([name, v]) => `${name}: ${convert(v, name)}`)
      .join(",\n");
  const assets = new Map();
  const assetArgs = (v) =>
    args(groups(v, "assets"), (value) => {
      if (value === "none") return "null";
      if (!value?.file || !value.packId) throw new Error("Invalid theme asset");
      const relative = `asset/${value.packId === "pbwork-base" ? "base" : value.packId}/artwork/${path.posix.basename(value.file).replace(/\.svg$/, ".png")}`;
      assets.set(relative, { packId: value.packId, file: value.file });
      return q(relative);
    });
  function elevation(v, dark) {
    return `AppElevation(isDark: ${dark}, floatingShadow: ${shadow(v["elevation.floating"])}, glassShadow: ${shadow(v["elevation.glass"])}, menuShadow: ${shadow(v["elevation.menu"])}, overlayShadow: ${shadow(v["elevation.overlay"])}, surfaceShadows: ${shadowList(v["elevation.surface"])})`;
  }
  function effect(v) {
    const m = /blur\(([\d.]+)px\)/.exec(v["surface.glass-backdrop"]);
    if (!m) throw new Error("Unsupported glass filter");
    return `AppEffectTokens(glassBackdropBlur: ${m[1]}, artworkShadow: ${shadowList(v["effect.artwork-shadow"])})`;
  }
  let dart =
    "// Generated from Core-resolved PBWork themes. Regenerate with scripts/export-flutter-themes.mjs.\npart of 'theme_pack.dart';\n\n";
  const names = [];
  for (const packId of selected) {
    const manifest = source.packs.get(packId).manifest;
    for (const theme of manifest.themes) {
      const light = tables.find(
        (t) =>
          t.identity.packId === packId &&
          t.identity.theme === theme.id &&
          t.identity.mode === "light",
      );
      const dark = tables.find(
        (t) =>
          t.identity.packId === packId &&
          t.identity.theme === theme.id &&
          t.identity.mode === "dark",
      );
      if (!light || !dark)
        throw new Error(`Missing theme modes ${packId}/${theme.id}`);
      const a = light.values,
        b = dark.values,
        name =
          packId === "pbwork-base"
            ? "generatedBaseThemePack"
            : `_theme${names.length}`;
      names.push(name);
      const types = {
        spacing: "AppSpacing",
        sizing: "AppSizing",
        radius: "AppRadius",
        motion: "AppMotion",
      };
      const common = Object.entries(types)
        .map(
          ([group, type]) =>
            `${group}: ${type}(${args(groups(a, group), (v, k) => (group === "motion" ? (k.startsWith("duration") ? `Duration(milliseconds: ${num(v)})` : k.startsWith("easing") ? curve(v) : num(v)) : num(v)))})`,
        )
        .join(",\n");
      const styles = groups(a, "textStyle");
      const typography = args(styles, (v, k) =>
        k.startsWith("tracking")
          ? typeof v === "string" && v.endsWith("em") && !v.endsWith("rem")
            ? `AppLetterSpacing.em(${parseFloat(v)})`
            : `AppLetterSpacing.pixels(${num(v)})`
          : `TextStyle(fontSize: ${num(v.size)}, height: ${v.lineHeight}, fontWeight: FontWeight.w${Math.max(100, Math.min(900, Math.floor(v.weight / 100) * 100))})`,
      );
      const op = (v) =>
        `AppOpacity(isDark: ${v === b}, ${args(groups(v, "opacity"), num).replace("translucent:", "translucentValue:")})`;
      const colors = (v) =>
        `AppColors(${args(groups(v, "colors", { glassEdge: v["color.glass-edge"] }), color)})`;
      if (packId === "pbwork-base")
        dart += `const generatedBaseLightColors = ${colors(a)};\nconst generatedBaseDarkColors = ${colors(b)};\n`;
      dart += `const ${name} = AppThemePack(id: ${q(packId + "/" + theme.id)}, label: ${q(manifest.label + " · " + theme.label)},\nlight: ${packId === "pbwork-base" ? "generatedBaseLightColors" : colors(a)}, dark: ${packId === "pbwork-base" ? "generatedBaseDarkColors" : colors(b)},\n${common},\ntypography: AppTypography(${typography}),\nsurfaceTreatment: AppSurfaceTreatment.${a["app-bar.surface-treatment"]},\nlightOpacity: ${op(a)}, darkOpacity: ${op(b)},\nlightElevation: ${elevation(a, false)}, darkElevation: ${elevation(b, true)},\neffect: ${effect(a)}, darkEffect: ${effect(b)},\nassets: AppAssets(${assetArgs(a)}), darkAssets: AppAssets(${assetArgs(b)}));\n\n`;
    }
  }
  dart += `const generatedThemePacks = <AppThemePack>[${names.join(",")}];\n`;
  const temp = await mkdtemp(path.join(os.tmpdir(), "pb-flutter-themes-"));
  try {
    const file = path.join(temp, "generated.dart");
    await writeFile(file, dart);
    const result = spawnSync("dart", ["format", file], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    dart = await readFile(file, "utf8");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  const artwork = {};
  for (const packId of selected) {
    const catalog = source.artwork.get(packId);
    if (!catalog) continue;
    if (catalog.packId !== packId) throw new Error(`Artwork owner mismatch: ${packId}`);
    for (const entry of catalog.assets) {
      if (!source.packs.get(packId).files[entry.file]) throw new Error(`Unregistered artwork file: ${entry.file}`);
      const svg = await readFile(source.assetFiles.get(packId).get(entry.file), "utf8");
      const parsed = parseSvgArtwork(svg);
      if (entry.views.length !== parsed.views.length || entry.views.some(view => !parsed.views.some(actual => actual.id === view.id && actual.viewBox === view.viewBox))) throw new Error(`Artwork view mismatch: ${entry.id}`);
      const prefix = `asset/${packId === "pbwork-base" ? "base" : packId}/artwork/${path.posix.basename(entry.file).replace(/\.svg$/, "")}`;
      // Keep the source canvas and cover the largest authored dial at DPR 3.
      const displayWidth = Math.max(parsed.width, ...tables
        .filter(t => t.identity.packId === packId && t.identity.theme === entry.theme)
        .map(t => Number(t.values["size.plot"]) || 0));
      const scale = 3 * displayWidth / parsed.width;
      const layers = {};
      const layerEntry = entry.layerAsset ? catalog.assets.find(a => a.id === entry.layerAsset) : entry;
      if (!layerEntry || entry.views.some(v => !layerEntry.views.some(other => other.id === v.id && other.viewBox === v.viewBox))) throw new Error(`Invalid shared layers: ${entry.id}`);
      for (const view of [{id: "", viewBox: parsed.viewBox}, ...entry.views]) {
        const viewPrefix = view.id ? `asset/${packId === "pbwork-base" ? "base" : packId}/artwork/${path.posix.basename(layerEntry.file).replace(/\.svg$/, "")}` : prefix;
        const target = `${viewPrefix}${view.id ? "--" + view.id : ""}.png`;
        const [, , width, height] = view.viewBox.split(/\s+/).map(Number);
        if (!view.id || !entry.layerAsset) assets.set(target, {packId, file: entry.file, view: view.id, viewBox: view.viewBox, width, height, scale});
        if (view.id) layers[view.id] = {file: target, viewBox: view.viewBox, width, height};
      }
      artwork[`${packId}/${entry.id}`] = {...entry, packId, source: {packId, file: entry.sourceFile, sha1: source.packs.get(packId).files[entry.file]}, raster: `${prefix}.png`, width: parsed.width, height: parsed.height, scale, layers};
    }
  }
  const metadata = {
    schemaVersion: 1,
    scope: prototype ? { prototype } : { all: true },
    packs: selected,
    tables: tables.map((t) => ({
      identity: t.identity,
      keys: Object.keys(t.values).sort(),
      values: t.values,
      digest: createHash("sha256")
        .update(JSON.stringify(t.values))
        .digest("hex"),
    })),
    artwork,
    assets: Object.fromEntries(
      [...assets].map(([target, a]) => [
        target,
        { ...a, sha1: source.packs.get(a.packId).files[a.file] },
      ]),
    ),
  };
  const output = path.join(targetRoot, "lib/theme/generated_theme_packs.dart"),
    manifestPath = path.join(targetRoot, "proto-bridge.themes.json");
  if (check) {
    if (
      (await readFile(output, "utf8")) !== dart ||
      (await readFile(manifestPath, "utf8")) !==
        JSON.stringify(metadata, null, 2) + "\n"
    )
      throw new Error(
        "Flutter theme implementations or scope drifted. Regenerate selected themes.",
      );
    for (const [target, asset] of assets) {
      const bytes = await readFile(path.join(targetRoot, target));
      if (asset.width && (bytes.readUInt32BE(16) !== Math.round(asset.width * asset.scale) || bytes.readUInt32BE(20) !== Math.round(asset.height * asset.scale))) throw new Error(`Artwork raster size mismatch: ${target}`);
    }
    return metadata;
  }
  try {
    const previous = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const file of Object.keys(previous.assets)) {
      if (!assets.has(file)) await rm(path.join(targetRoot, file), {force: true});
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await writeFile(output, dart);
  await writeFile(manifestPath, JSON.stringify(metadata, null, 2) + "\n");
  const pubspecPath = path.join(targetRoot, "pubspec.yaml");
  let pubspec = (await readFile(pubspecPath, "utf8")).replace(
    /^    - (?:assets\/themes\/.*|asset\/[^/]+\/artwork\/)\n/gm,
    "",
  );
  pubspec += [
    ...new Set([...assets.keys()].map((file) => path.posix.dirname(file))),
  ]
    .map((dir) => `    - ${dir}/\n`)
    .join("");
  await writeFile(pubspecPath, pubspec);
  if (assets.size) {
    const { createRequire } = await import("node:module");
    const require = createRequire(
      path.join(repoRoot, "apps/pbwork/package.json"),
    );
    const { chromium } = require("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      for (const [target, a] of assets) {
        const bytes = await readFile(
          source.assetFiles.get(a.packId).get(a.file),
        );
        let png = bytes;
        if (a.file.endsWith(".svg")) {
          const rendered = svgForView(bytes.toString("utf8"), a.viewBox);
          const dimensions = parseSvgArtwork(rendered);
          const raw = await page.evaluate(async ({svg, width, height, scale}) => {
            const img = new Image();
            img.src =
              "data:image/svg+xml;base64," +
              btoa(unescape(encodeURIComponent(svg)));
            await img.decode();
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            canvas
              .getContext("2d")
              .drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/png").split(",")[1];
          }, {svg: rendered, width: dimensions.width, height: dimensions.height, scale: a.scale ?? 3});
          png = Buffer.from(raw, "base64");
        }
        await mkdir(path.dirname(path.join(targetRoot, target)), {
          recursive: true,
        });
        await writeFile(path.join(targetRoot, target), png);
      }
    } finally {
      await browser.close();
    }
  }
  return metadata;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const meta = await exportFlutterThemes({
    targetRoot: optionValue(process.argv, "--target"),
    prototype: optionValue(process.argv, "--prototype"),
    check: process.argv.includes("--check"),
  });
  process.stdout.write(
    `Flutter themes: ${meta.packs.length} packs, ${meta.tables.length} theme/mode tables.\n`,
  );
}
