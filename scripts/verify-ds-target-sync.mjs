#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ThemeKeyCatalog, ThemeConstantTable, ThemePackSource, validateThemePacks } from "../packages/core/dist/v2/theme/index.js";

import {
  SEMANTIC_ROLES,
  TOKEN_BINDING_LITERALS,
} from "../packages/core/dist/v2/contracts/vocabulary.js";
import {
  resolveTargetComponents,
  resolveTargetTokens,
} from "../packages/core/dist/target/query.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractRoot = path.join(
  repoRoot,
  "apps/pbwork/src/design-system/components/contracts",
);
const targetRoot = path.join(repoRoot, "apps/flutter_pb_app");
const syncPath = path.join(targetRoot, "proto-bridge.sync.json");
const targetMappingPath = path.join(targetRoot, "proto-bridge.target.json");
const printBaseline = process.argv.includes("--print-baseline");
const errors = [];
const pendingEntries = [];

const contracts = await readContracts();
const rawCatalog = await readJson("apps/pbwork/src/design-system/theme/key-catalog.json");
const catalog = ThemeKeyCatalog.parse({ ...rawCatalog, keys: [
  ...rawCatalog.keys,
  ...contracts.flatMap((contract) => Object.entries(contract.componentTokens ?? {}).map(([name, definition]) => ({ ...definition, id: `${contract.id}.${name}`, tier: "component", source: contract.id }))),
] });
const tokens = catalog.keys.filter((key) => key.bindable);
const constants = ThemeConstantTable.parse(await readJson("apps/pbwork/src/design-system/theme/constants.json"));
const packs = await readThemePacks();
const themes = { constants, packs: [...packs.values()] };
for (const diagnostic of validateThemePacks({ keyCatalog: catalog, constants, packs })) {
  if (diagnostic.severity === "block") errors.push(`${diagnostic.packId}: ${diagnostic.message}`);
}
const componentSchema = await readJson("apps/pbwork/src/design-system/schemas/component.schema.json");
const themeProtocolSchema = await readFile(path.join(repoRoot, "packages/core/src/v2/theme/schema.ts"), "utf8");
const bindTokenIds = tokens.map((key) => key.id).sort();
const targetMapping = await readJson("apps/flutter_pb_app/proto-bridge.target.json");
const tokenIds = new Set(tokens.map((token) => token.id));
const literalIds = new Set(TOKEN_BINDING_LITERALS);
const boundTokenIds = new Set();
const declaredTargetComponentIds = Object.keys(targetMapping.components ?? {}).sort();

verifyProducerContracts();
verifyProducerProtocol();
verifyTargetMappingCoverage();

const componentDigests = Object.fromEntries(
  contracts.map((contract) => [contract.id, digest(contract)]),
);
const sectionDigests = {
  components: digest(contracts),
  roles: digest(SEMANTIC_ROLES),
  protocolSchemas: digest({ componentSchema, themeProtocolSchema }),
  tokenCatalog: digest(catalog),
  themes: digest(themes),
  bindPool: digest({ bindTokenIds, literals: TOKEN_BINDING_LITERALS }),
};
const surfaceDigest = digest(sectionDigests);
const baseline = {
  version: 1,
  producer: "apps/pbwork",
  target: "apps/flutter_pb_app",
  status: "synced",
  surfaceDigest,
  sectionDigests,
  componentDigests,
  counts: {
    components: contracts.length,
    catalogTokens: catalog.keys.length,
    bindTokens: bindTokenIds.length,
    mappedTokens: tokenIds.size,
    semanticRoles: SEMANTIC_ROLES.length - 1,
  },
};

await verifyResolver();
if (!printBaseline) await verifyRecordedBaseline();

if (errors.length > 0) {
  process.stderr.write(
    `DS → Target sync verification failed (${errors.length}):\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}\n`,
  );
  process.exitCode = 1;
} else if (printBaseline) {
  process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
} else {
  process.stdout.write(
    `DS → Target sync verified: ${contracts.length}/${declaredTargetComponentIds.length} current components, ${tokenIds.size}/${tokens.length} bindable theme keys mapped, surface ${surfaceDigest}${pendingSummary()}\n`,
  );
}

// Entry-level pending (per-key fact) is reported here; the batch-level synced/pending
// status in proto-bridge.sync.json is a different concept and is checked separately.
function pendingSummary() {
  if (pendingEntries.length === 0) return "; pending 0.";
  const list = [...pendingEntries]
    .sort((left, right) => `${left.kind} ${left.id}`.localeCompare(`${right.kind} ${right.id}`))
    .map((entry) => `${entry.kind} ${entry.id} (${entry.reason})`)
    .join(", ");
  return `; pending ${pendingEntries.length}: ${list}.`;
}

async function readContracts() {
  const files = (await readdir(contractRoot))
    .filter((file) => file.endsWith(".json"))
    .sort();
  return Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(contractRoot, file), "utf8"))),
  );
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function readThemePacks() {
  const directories = [];
  for (const [parent, suffix] of [["apps/pbwork/src/design-system/theme-packs", ""], ["apps/pbwork/src/prototypes", "/theme"]]) {
    for (const dir of await readdir(path.join(repoRoot, parent), {withFileTypes:true})) if (dir.isDirectory()) directories.push(`${parent}/${dir.name}${suffix}`);
  }
  const packs = new Map();
  for (const dir of directories) {
    const optional = async (file) => { try { return await readJson(`${dir}/${file}.json`); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; } };
    const manifest = await optional("pack");
    if (!manifest) continue;
    const files = {};
    const assets = async (relative) => {
      let entries; try { entries = await readdir(path.join(repoRoot, dir, relative), {withFileTypes:true}); } catch(error) { if(error.code === "ENOENT") return; throw error; }
      for (const entry of entries) { const file = `${relative}/${entry.name}`; if(entry.isDirectory()) await assets(file); else files[file] = createHash("sha1").update(await readFile(path.join(repoRoot,dir,file))).digest("hex"); }
    };
    await assets("assets");
    const ownerPrototypeId = /prototypes\/([^/]+)\/theme$/.exec(dir)?.[1];
    const pack = ThemePackSource.parse({ manifest, primitives: await optional("primitives"), semantic: await optional("semantic"), component: await optional("component"), files, ...(ownerPrototypeId ? { ownerPrototypeId } : {}) });
    if(packs.has(manifest.id)) errors.push(`Duplicate theme pack ${manifest.id}.`);
    packs.set(manifest.id,pack);
  }
  return packs;
}

function verifyProducerContracts() {
  const contractIds = new Set();
  for (const contract of contracts) {
    if (contractIds.has(contract.id)) errors.push(`Duplicate component id: ${contract.id}.`);
    contractIds.add(contract.id);
    if (!contract.summary?.trim()) errors.push(`${contract.id} is missing summary.`);
    if (!Array.isArray(contract.behavior) || contract.behavior.length === 0) {
      errors.push(`${contract.id} is missing behavior commitments.`);
    }
    for (const state of contract.states ?? []) {
      if (!["variant", "interaction", "content"].includes(state.kind)) {
        errors.push(`${contract.id}.${state.id} is missing a valid states.kind.`);
      }
    }
    for (const tokenId of Object.values(contract.tokenBindings ?? {})) {
      if (literalIds.has(tokenId)) continue;
      boundTokenIds.add(tokenId);
      if (!tokenIds.has(tokenId)) {
        errors.push(`${contract.id} binds unknown Catalog token ${tokenId}.`);
      }
      if (!bindTokenIds.includes(tokenId)) {
        errors.push(`${contract.id} binds ${tokenId}, which is absent from BIND_TOKEN_IDS.`);
      }
    }
  }

  const richComponents = [
    "bottom-sheet",
    "card",
    "confirm",
    "data-list",
    "flow-sheet",
    "loading",
    "menu",
    "primary-tabs",
    "scrollable-data-list",
    "secondary-tabs",
    "tab-viewport",
    "tabbar",
    "toast",
  ];
  for (const id of richComponents) {
    const contract = contracts.find((item) => item.id === id);
    if (!contract?.layout || !contract?.visualAnatomy) {
      errors.push(`${id} must declare both layout and visualAnatomy.`);
    }
  }
}

function verifyProducerProtocol() {
  const schemaRoles = componentSchema.$defs?.semanticRole?.enum ?? [];
  const expectedRoles = SEMANTIC_ROLES.filter((role) => role !== "unknown");
  if (canonical(schemaRoles) !== canonical(expectedRoles)) {
    errors.push("Component schema role enum drifted from Core SEMANTIC_ROLES.");
  }

  const requiredContractFields = [
    "schemaVersion",
    "id",
    "category",
    "semantic",
    "summary",
    "behavior",
    "propsSchema",
    "defaultProps",
    "states",
    "slots",
    "events",
    "tokenBindings",
    "playground",
  ].sort();
  const actualContractFields = [...(componentSchema.required ?? [])].sort();
  if (canonical(actualContractFields) !== canonical(requiredContractFields)) {
    errors.push("Component schema required fields drifted from the Producer protocol.");
  }

  const categories = componentSchema.properties?.category?.enum ?? [];
  if (canonical(categories) !== canonical(["action", "input", "display", "navigation", "data", "feedback"])) {
    errors.push("Component categories drifted from the six responsibility groups.");
  }
  if (
    componentSchema.properties?.summary?.minLength !== 1 ||
    componentSchema.properties?.behavior?.minItems !== 1 ||
    componentSchema.properties?.behavior?.items?.minLength !== 1
  ) {
    errors.push("Component summary and behavior must remain non-empty protocol fields.");
  }

  const stateSchema = componentSchema.properties?.states?.items ?? {};
  const requiredStateFields = [...(stateSchema.required ?? [])].sort();
  if (canonical(requiredStateFields) !== canonical(["id", "kind", "label"])) {
    errors.push("Component state schema must require id, label and kind.");
  }
  const stateKinds = stateSchema.properties?.kind?.enum ?? [];
  if (canonical(stateKinds) !== canonical(["variant", "interaction", "content"])) {
    errors.push("Component state kinds drifted from variant/interaction/content.");
  }
  const presentations = componentSchema.properties?.playground?.properties?.presentation?.enum ?? [];
  if (canonical(presentations) !== canonical(["interactive", "gallery", "trigger"])) {
    errors.push("Playground presentation protocol drifted from interactive/gallery/trigger.");
  }
  const semanticPolicies = (componentSchema.properties?.semantic?.oneOf ?? [])
    .map((variant) => variant.properties?.policy?.const)
    .filter(Boolean);
  if (canonical(semanticPolicies) !== canonical(["fixed", "contextual", "decorative"])) {
    errors.push("Component semantic policies drifted from fixed/contextual/decorative.");
  }
  if (componentSchema.properties?.icons?.properties?.pack?.const !== "lucide") {
    errors.push("Component icon protocol must keep Lucide as the only pack.");
  }
}

function verifyTargetMappingCoverage() {
  if (targetMapping.version !== 1 || targetMapping.technology !== "flutter") {
    errors.push("Flutter target mapping must be version 1 / technology flutter.");
  }
  for (const contract of contracts) {
    if (!targetMapping.components?.[contract.id]) {
      errors.push(`Flutter target mapping is missing component ${contract.id}.`);
    }
  }
  const currentComponentIds = contracts.map((contract) => contract.id).sort();
  if (canonical(declaredTargetComponentIds) !== canonical(currentComponentIds)) {
    const legacy = declaredTargetComponentIds.filter((id) => !currentComponentIds.includes(id));
    errors.push(
      `Flutter target mapping must contain only current component ids (legacy/extra: ${legacy.join(", ") || "none"}).`,
    );
  }
  for (const [section, entries] of [
    ["component", targetMapping.components ?? {}],
    ["token", targetMapping.tokens ?? {}],
  ]) {
    for (const [id, entry] of Object.entries(entries)) {
      if (entry?.status === undefined) continue;
      if (entry.status !== "pending") {
        errors.push(`Flutter ${section} mapping ${id} has unsupported entry status ${JSON.stringify(entry.status)}.`);
      } else if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
        errors.push(`Flutter ${section} mapping ${id} is pending but has no non-empty reason.`);
      }
    }
  }
  const mappedTokens = Object.keys(targetMapping.tokens ?? {}).sort();
  const requiredTokens = [...tokenIds].sort();
  if (canonical(mappedTokens) !== canonical(requiredTokens)) {
    const missing = requiredTokens.filter((id) => !mappedTokens.includes(id));
    const extra = mappedTokens.filter((id) => !requiredTokens.includes(id));
    errors.push(
      `Flutter token mapping coverage drifted (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}).`,
    );
  }
  for (const literal of TOKEN_BINDING_LITERALS) {
    if (targetMapping.tokens?.[literal]) {
      errors.push(`Binding literal ${literal} must not be a Target token mapping.`);
    }
  }
}

async function verifyResolver() {
  const componentBatch = await resolveTargetComponents({
    targetRoot,
    ids: declaredTargetComponentIds,
  });
  const tokenBatch = await resolveTargetTokens({
    targetRoot,
    ids: [...tokenIds].sort(),
  });
  for (const resolution of [...componentBatch.resolutions, ...tokenBatch.resolutions]) {
    if (resolution.status === "pending") {
      pendingEntries.push({
        kind: resolution.kind,
        id: resolution.id,
        reason: resolution.pending?.reason ?? resolution.reason,
      });
    } else if (resolution.status !== "resolved") {
      errors.push(`${resolution.kind} ${resolution.id} resolved as ${resolution.status}.`);
    }
  }
  for (const warning of [...componentBatch.warnings, ...tokenBatch.warnings]) {
    errors.push(`Target resolver warning: ${warning}`);
  }
}

async function verifyRecordedBaseline() {
  let recorded;
  try {
    recorded = JSON.parse(await readFile(syncPath, "utf8"));
  } catch {
    errors.push("Missing apps/flutter_pb_app/proto-bridge.sync.json.");
    return;
  }
  if (recorded.status !== "synced") {
    errors.push(`Target sync status is ${recorded.status}; finish or explicitly reconcile the pending batch.`);
  }
  if (canonical(recorded) === canonical(baseline)) return;

  const changedComponents = Object.entries(componentDigests)
    .filter(([id, value]) => recorded.componentDigests?.[id] !== value)
    .map(([id]) => id);
  const removedComponents = Object.keys(recorded.componentDigests ?? {}).filter(
    (id) => componentDigests[id] === undefined,
  );
  const changedSections = Object.entries(sectionDigests)
    .filter(([id, value]) => recorded.sectionDigests?.[id] !== value)
    .map(([id]) => id);
  errors.push(
    `Producer surface or recorded Target metadata drifted from the synced baseline (sections: ${changedSections.join(", ") || "metadata/counts"}; components: ${[...changedComponents, ...removedComponents.map((id) => `${id} (removed)`) ].join(", ") || "none"}).`,
  );
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}
