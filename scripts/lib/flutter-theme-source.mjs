import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./pb-script-utils.mjs";
import {
  ThemeKeyCatalog,
  ThemeConstantTable,
  ThemePackSource,
  resolveAllThemeTables,
} from "../../packages/core/dist/v2/theme/index.js";

export async function flutterThemeSource() {
  const json = async (file) =>
    JSON.parse(await readFile(path.join(repoRoot, file), "utf8"));
  const contracts = await Promise.all(
    (
      await readdir(
        path.join(
          repoRoot,
          "apps/pbwork/src/design-system/components/contracts",
        ),
      )
    )
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) =>
        json(`apps/pbwork/src/design-system/components/contracts/${f}`),
      ),
  );
  const catalog = await json(
    "apps/pbwork/src/design-system/theme/key-catalog.json",
  );
  const keyCatalog = ThemeKeyCatalog.parse({
    ...catalog,
    keys: [
      ...catalog.keys,
      ...contracts.flatMap((c) =>
        Object.entries(c.componentTokens ?? {}).map(([name, def]) => ({
          ...def,
          id: `${c.id}.${name}`,
          tier: "component",
          source: c.id,
        })),
      ),
    ],
  });
  const constants = ThemeConstantTable.parse(
    await json("apps/pbwork/src/design-system/theme/constants.json"),
  );
  const artwork = new Map();
  const packs = new Map(),
    assetFiles = new Map();
  for (const [base, suffix] of [
    ["apps/pbwork/src/design-system/theme-packs", ""],
    ["apps/pbwork/src/prototypes", "/theme"],
  ]) {
    for (const entry of (
      await readdir(path.join(repoRoot, base), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const dir = `${base}/${entry.name}${suffix}`;
      const optional = async (name) => {
        try {
          return await json(`${dir}/${name}.json`);
        } catch (e) {
          if (e.code === "ENOENT") return undefined;
          throw e;
        }
      };
      const manifest = await optional("pack");
      if (!manifest) continue;
      const registered = await optional("artwork");
      if (registered) artwork.set(manifest.id, registered);
      const files = {};
      const paths = new Map();
      async function assets(rel) {
        let entries;
        try {
          entries = await readdir(path.join(repoRoot, dir, rel), {
            withFileTypes: true,
          });
        } catch (e) {
          if (e.code === "ENOENT") return;
          throw e;
        }
        for (const f of entries) {
          const file = `${rel}/${f.name}`;
          if (f.isDirectory()) await assets(file);
          else {
            const physical = path.join(repoRoot, dir, file);
            paths.set(file, physical);
            files[file] = createHash("sha1").update(await readFile(physical)).digest("hex");
          }
        }
      }
      await assets("assets");
      for (const asset of registered?.assets ?? []) {
        if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*\.svg$/.test(asset.sourceFile)) throw new Error(`Invalid SVG source: ${asset.sourceFile}`);
        if (paths.has(asset.file)) throw new Error(`Duplicate theme asset: ${asset.file}`);
        const physical = path.join(repoRoot, "apps/pbwork/src/design-system/components/_shared/glyphs", asset.sourceFile);
        paths.set(asset.file, physical);
        files[asset.file] = createHash("sha1").update(await readFile(physical)).digest("hex");
      }
      if (packs.has(manifest.id))
        throw new Error(`Duplicate theme pack ${manifest.id}`);
      packs.set(
        manifest.id,
        ThemePackSource.parse({
          manifest,
          primitives: await optional("primitives"),
          semantic: await optional("semantic"),
          component: await optional("component"),
          files,
          ...(suffix ? { ownerPrototypeId: entry.name } : {}),
        }),
      );
      assetFiles.set(manifest.id, paths);
    }
  }
  const tables = [];
  for (const packId of packs.keys()) {
    const result = resolveAllThemeTables({
      keyCatalog,
      constants,
      packs,
      packId,
    });
    if (!result.digest) throw new Error(JSON.stringify(result.diagnostics));
    tables.push(...result.tables);
  }
  return { packs, keyCatalog, constants, tables, artwork, assetFiles };
}
