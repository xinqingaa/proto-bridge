#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const syncPath = path.join(targetRoot, "docs/proto-bridge.sync.json");
const targetMappingPath = path.join(targetRoot, "docs/proto-bridge.target.json");
const printBaseline = process.argv.includes("--print-baseline");
const errors = [];

const contracts = await readContracts();
const tokens = await readJson(
  "apps/pbwork/src/design-system/tokens/tokens.json",
);
const themes = {
  light: await readJson("apps/pbwork/src/design-system/themes/light.json"),
  dark: await readJson("apps/pbwork/src/design-system/themes/dark.json"),
};
const componentSchema = await readJson(
  "apps/pbwork/src/design-system/schemas/component.schema.json",
);
const tokenSchema = await readJson(
  "apps/pbwork/src/design-system/schemas/token.schema.json",
);
const themeSchema = await readJson(
  "apps/pbwork/src/design-system/schemas/theme.schema.json",
);
const bindTokenIds = await readBindTokenIds();
const targetMapping = await readJson("apps/flutter_pb_app/docs/proto-bridge.target.json");
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
  protocolSchemas: digest({ componentSchema, tokenSchema, themeSchema }),
  tokenCatalog: digest(tokens),
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
    catalogTokens: tokens.length,
    bindTokens: bindTokenIds.length,
    mappedTokens: boundTokenIds.size,
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
    `DS → Target sync verified: ${contracts.length} current components (${declaredTargetComponentIds.length} Target declarations including aliases), ${boundTokenIds.size} mapped binding tokens, surface ${surfaceDigest}.\n`,
  );
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

async function readBindTokenIds() {
  const source = await readFile(
    path.join(repoRoot, "apps/pbwork/src/design-system/bindTokens.ts"),
    "utf8",
  );
  const body = source.match(/BIND_TOKEN_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/u)?.[1];
  if (!body) {
    errors.push("Unable to read BIND_TOKEN_IDS from bindTokens.ts.");
    return [];
  }
  return [...body.matchAll(/"([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)"/gu)]
    .map((match) => match[1])
    .sort();
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
  const mappedTokens = Object.keys(targetMapping.tokens ?? {}).sort();
  const requiredTokens = [...boundTokenIds].sort();
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
    ids: [...boundTokenIds].sort(),
  });
  for (const resolution of [...componentBatch.resolutions, ...tokenBatch.resolutions]) {
    if (resolution.status !== "resolved") {
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
    errors.push("Missing apps/flutter_pb_app/docs/proto-bridge.sync.json.");
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
