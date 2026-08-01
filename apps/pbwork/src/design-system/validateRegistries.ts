import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import tokenSchema from "@/design-system/schemas/token.schema.json";
import themeSchema from "@/design-system/schemas/theme.schema.json";
import componentSchema from "@/design-system/schemas/component.schema.json";
import {
  loadComponentContract,
  loadComponentContracts,
  loadComponentRecords,
  loadPrototypeScreens,
  loadPrototypes,
  loadThemes,
  loadTokens,
  componentViewModules,
  screenViewModules,
} from "@/design-system/loaders";
import { normalizeTokenCssVarName } from "@/design-system/resolveThemeTokens";
import { isAllowedTokenBindingValue } from "@/design-system/bindTokens";
import { vuetifyThemeBindings } from "@/design-system/themes/vuetify-bindings";
import type {
  ComponentContract,
  ComponentRecord,
  RegistryValidationError,
  ScreenRecord,
  ThemeRecord,
  TokenRecord,
  TokenValue,
} from "@/design-system/types";
import {
  QUERY_KEY_PATTERN,
  RESOURCE_ID_PATTERN,
  SLUG_ID_PATTERN,
} from "@/design-system/types";
import {
  LEGACY_EVIDENCE_SCREEN_IDS,
  requiresStrictEvidence,
} from "@/prototypes/evidence-policy";

const RESERVED_QUERY_KEYS = new Set(["variant", "theme"]);

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addFormat("cssColor", {
    type: "string",
    validate: (value: string) =>
      typeof CSS !== "undefined"
        ? CSS.supports("color", value)
        : /^(#|rgb|hsl|[a-z]+)/i.test(value),
  });
  ajv.addFormat("cssLength", {
    type: "string",
    validate: (value: string) =>
      typeof CSS !== "undefined"
        ? CSS.supports("width", value)
        : /^-?\d+(\.\d+)?(px|rem|em|%)$/.test(value),
  });
  ajv.addFormat("cssShadow", {
    type: "string",
    validate: (value: string) => value.trim().length > 0,
  });
  return ajv;
}

function pushError(
  errors: RegistryValidationError[],
  partial: RegistryValidationError,
) {
  errors.push(partial);
}

function mapAjvErrors(
  resourceType: RegistryValidationError["resourceType"],
  resourceId: string | undefined,
  ajvErrors: ErrorObject[] | null | undefined,
): RegistryValidationError[] {
  return (ajvErrors ?? []).map((error) => {
    const mapped: RegistryValidationError = {
      resourceType,
      instancePath: error.instancePath || "/",
      keyword: error.keyword,
      message: error.message ?? "validation failed",
    };
    if (resourceId !== undefined) mapped.resourceId = resourceId;
    return mapped;
  });
}

function validateTokenValue(
  token: TokenRecord,
  value: TokenValue,
  errors: RegistryValidationError[],
  resourceType: RegistryValidationError["resourceType"],
  resourceId: string,
  instancePath: string,
) {
  if (token.category === "color") {
    if (typeof value !== "string" || value.trim() === "") {
      pushError(errors, {
        resourceType,
        resourceId,
        instancePath,
        keyword: "cssColor",
        message: "color token must be a non-empty CSS color string",
      });
    }
    return;
  }
  if (token.category === "typography") {
    if (typeof value !== "string" || value.trim() === "") {
      pushError(errors, {
        resourceType,
        resourceId,
        instancePath,
        keyword: "typography",
        message: "typography token must be a non-empty CSS string",
      });
    }
    return;
  }
  if (token.category === "spacing" || token.category === "radius") {
    if (typeof value === "number") {
      if (value < 0) {
        pushError(errors, {
          resourceType,
          resourceId,
          instancePath,
          keyword: "minimum",
          message: `${token.category} must be non-negative`,
        });
      }
      return;
    }
    if (typeof value !== "string" || value.trim() === "") {
      pushError(errors, {
        resourceType,
        resourceId,
        instancePath,
        keyword: "cssLength",
        message: `${token.category} must be number or CSS length`,
      });
    }
    return;
  }
  if (token.category === "elevation") {
    if (typeof value === "number" && value < 0) {
      pushError(errors, {
        resourceType,
        resourceId,
        instancePath,
        keyword: "minimum",
        message: "elevation number must be non-negative",
      });
      return;
    }
    if (typeof value === "string" && value.trim() === "") {
      pushError(errors, {
        resourceType,
        resourceId,
        instancePath,
        keyword: "cssShadow",
        message: "elevation string must be non-empty",
      });
    }
  }
}

function findViewModule(
  modules: Record<string, unknown>,
  view: string,
): { matches: string[] } {
  const normalized = view.replace(/\\/g, "/");
  const exact = Object.keys(modules).filter(
    (path) =>
      path.endsWith(`/${normalized}`) || path.endsWith(`/${normalized}.vue`),
  );
  if (exact.length > 0) return { matches: exact };

  const base = normalized.split("/").pop()!;
  const byBase = Object.keys(modules).filter((path) =>
    path.endsWith(`/${base}`),
  );
  return { matches: byBase };
}

function validateComponentContractPair(
  ajv: Ajv2020,
  record: ComponentRecord,
  contract: ComponentContract,
  tokens: TokenRecord[],
  errors: RegistryValidationError[],
) {
  if (contract.id !== record.id) {
    pushError(errors, {
      resourceType: "component",
      resourceId: record.id,
      instancePath: "/id",
      keyword: "const",
      message: `contract id ${contract.id} does not match record id`,
    });
  }
  if (contract.category !== record.category) {
    pushError(errors, {
      resourceType: "component",
      resourceId: record.id,
      instancePath: "/category",
      keyword: "const",
      message: "contract category does not match record category",
    });
  }

  const validateProps = ajv.compile(contract.propsSchema);
  const exampleMerged = {
    ...contract.defaultProps,
    ...record.example,
  };
  if (!validateProps(exampleMerged)) {
    errors.push(
      ...mapAjvErrors("component", record.id, validateProps.errors).map(
        (error) => ({
          ...error,
          instancePath: `/example${error.instancePath}`,
        }),
      ),
    );
  }
  if (!validateProps(contract.defaultProps)) {
    errors.push(
      ...mapAjvErrors("component", record.id, validateProps.errors).map(
        (error) => ({
          ...error,
          instancePath: `/defaultProps${error.instancePath}`,
        }),
      ),
    );
  }

  const stateIds = new Set<string>();
  for (const state of contract.states) {
    if (stateIds.has(state.id)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: `/states/${state.id}`,
        keyword: "uniqueItems",
        message: "duplicate state id",
      });
    }
    stateIds.add(state.id);
    if (state.props && Object.keys(state.props).length > 0) {
      const stateMerged = {
        ...contract.defaultProps,
        ...state.props,
      };
      if (!validateProps(stateMerged)) {
        errors.push(
          ...mapAjvErrors("component", record.id, validateProps.errors).map(
            (error) => ({
              ...error,
              instancePath: `/states/${state.id}/props${error.instancePath}`,
            }),
          ),
        );
      }
    }
  }

  const props = (contract.propsSchema.properties ?? {}) as Record<
    string,
    unknown
  >;
  for (const control of record.controls) {
    if (!(control.key in props)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: `/controls/${control.key}`,
        keyword: "required",
        message: "control key missing from propsSchema.properties",
      });
    }
  }

  const tokenIds = new Set(tokens.map((token) => token.id));
  const bindingKeys = new Set<string>();
  for (const [slot, tokenId] of Object.entries(contract.tokenBindings)) {
    if (bindingKeys.has(slot)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: `/tokenBindings/${slot}`,
        keyword: "uniqueItems",
        message: "duplicate token binding slot",
      });
    }
    bindingKeys.add(slot);
    if (tokenId === "transparent" || tokenId === "none") {
      continue;
    }
    if (!tokenIds.has(tokenId)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: `/tokenBindings/${slot}`,
        keyword: "enum",
        message: `unknown token ${tokenId}`,
      });
      continue;
    }
    if (!isAllowedTokenBindingValue(tokenId)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: `/tokenBindings/${slot}`,
        keyword: "enum",
        message: `token ${tokenId} is not in bindTokens (component contracts may only bind the agreed pool)`,
      });
    }
  }
}

export function validateRegistries(input?: {
  tokens?: TokenRecord[];
  themes?: ThemeRecord[];
  components?: ComponentRecord[];
  contracts?: ComponentContract[];
  prototypes?: ReturnType<typeof loadPrototypes>;
  screens?: ScreenRecord[];
}): RegistryValidationError[] {
  const tokens = input?.tokens ?? loadTokens();
  const themes = input?.themes ?? loadThemes();
  const components = input?.components ?? loadComponentRecords();
  const contracts = input?.contracts ?? loadComponentContracts();
  const prototypes = input?.prototypes ?? loadPrototypes();
  const screens = input?.screens ?? loadPrototypeScreens();
  const errors: RegistryValidationError[] = [];
  const ajv = createAjv();
  const validateToken = ajv.compile(tokenSchema);
  const validateTheme = ajv.compile(themeSchema);
  const validateContract = ajv.compile(componentSchema);

  const tokenIds = new Set<string>();
  const cssVarOwners = new Map<string, string>();

  for (const token of tokens) {
    const tokenId = token.id;
    if (!validateToken(token)) {
      errors.push(...mapAjvErrors("token", tokenId, validateToken.errors));
    }
    if (tokenIds.has(tokenId)) {
      pushError(errors, {
        resourceType: "token",
        resourceId: tokenId,
        instancePath: "/id",
        keyword: "uniqueItems",
        message: "duplicate token id",
      });
    }
    tokenIds.add(tokenId);
    validateTokenValue(
      token,
      token.defaultValue,
      errors,
      "token",
      token.id,
      "/defaultValue",
    );
    const cssVar = normalizeTokenCssVarName(token.id);
    const owner = cssVarOwners.get(cssVar);
    if (owner) {
      pushError(errors, {
        resourceType: "token",
        resourceId: token.id,
        instancePath: "/id",
        keyword: "cssVar",
        message: `css var collision with ${owner}`,
      });
    } else {
      cssVarOwners.set(cssVar, token.id);
    }
  }

  const themeIds = new Set<string>();
  for (const theme of themes) {
    const themeId = theme.id;
    if (!validateTheme(theme)) {
      errors.push(...mapAjvErrors("theme", themeId, validateTheme.errors));
    }
    if (!SLUG_ID_PATTERN.test(themeId)) {
      pushError(errors, {
        resourceType: "theme",
        resourceId: themeId,
        instancePath: "/id",
        keyword: "pattern",
        message: "theme id must not contain dots",
      });
    }
    if (themeIds.has(themeId)) {
      pushError(errors, {
        resourceType: "theme",
        resourceId: themeId,
        instancePath: "/id",
        keyword: "uniqueItems",
        message: "duplicate theme id",
      });
    }
    themeIds.add(themeId);

    for (const [tokenId, value] of Object.entries(theme.overrides)) {
      const token = tokens.find((item) => item.id === tokenId);
      if (!token) {
        pushError(errors, {
          resourceType: "theme",
          resourceId: themeId,
          instancePath: `/overrides/${tokenId}`,
          keyword: "enum",
          message: `unknown token ${tokenId}`,
        });
        continue;
      }
      validateTokenValue(
        token,
        value,
        errors,
        "theme",
        themeId,
        `/overrides/${tokenId}`,
      );
    }
  }

  for (const [semantic, tokenId] of Object.entries(vuetifyThemeBindings)) {
    if (!tokenIds.has(tokenId)) {
      pushError(errors, {
        resourceType: "theme",
        resourceId: "vuetify-bindings",
        instancePath: `/${semantic}`,
        keyword: "required",
        message: `missing token ${tokenId} for vuetify binding`,
      });
    }
  }

  const componentIds = new Set<string>();
  const contractById = new Map(contracts.map((item) => [item.id, item]));

  for (const contract of contracts) {
    const contractId = contract.id;
    if (!validateContract(contract)) {
      errors.push(
        ...mapAjvErrors("component", contractId, validateContract.errors),
      );
    }
  }

  for (const record of components) {
    if (!RESOURCE_ID_PATTERN.test(record.id)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: "/id",
        keyword: "pattern",
        message: "invalid component id",
      });
    }
    if (componentIds.has(record.id)) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: "/id",
        keyword: "uniqueItems",
        message: "duplicate component id",
      });
    }
    componentIds.add(record.id);

    const contract =
      loadComponentContract(record.contract) ?? contractById.get(record.id);
    if (!contract) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: "/contract",
        keyword: "required",
        message: `missing contract ${record.contract}`,
      });
    } else {
      validateComponentContractPair(ajv, record, contract, tokens, errors);
    }

    const { matches } = findViewModule(componentViewModules, record.view);
    if (matches.length === 0) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: "/view",
        keyword: "view",
        message: `view not found: ${record.view}`,
      });
    } else if (matches.length > 1) {
      pushError(errors, {
        resourceType: "component",
        resourceId: record.id,
        instancePath: "/view",
        keyword: "view",
        message: `ambiguous view: ${record.view}`,
      });
    }
  }

  const prototypeIds = new Set<string>();
  for (const prototype of prototypes) {
    if (!SLUG_ID_PATTERN.test(prototype.id)) {
      pushError(errors, {
        resourceType: "prototype",
        resourceId: prototype.id,
        instancePath: "/id",
        keyword: "pattern",
        message: "invalid prototype id",
      });
    }
    if (prototypeIds.has(prototype.id)) {
      pushError(errors, {
        resourceType: "prototype",
        resourceId: prototype.id,
        instancePath: "/id",
        keyword: "uniqueItems",
        message: "duplicate prototype id",
      });
    }
    prototypeIds.add(prototype.id);
    if (!themeIds.has(prototype.defaultThemeId)) {
      pushError(errors, {
        resourceType: "prototype",
        resourceId: prototype.id,
        instancePath: "/defaultThemeId",
        keyword: "enum",
        message: `unknown theme ${prototype.defaultThemeId}`,
      });
    }
  }

  const screenIds = new Set<string>();
  const screenPaths = new Set<string>();
  const slugByPrototype = new Map<string, Set<string>>();

  for (const screen of screens) {
    if (!prototypeIds.has(screen.prototypeId)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/prototypeId",
        keyword: "enum",
        message: `unknown prototype ${screen.prototypeId}`,
      });
    }
    if (!SLUG_ID_PATTERN.test(screen.screenSlug)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/screenSlug",
        keyword: "pattern",
        message: "invalid screenSlug",
      });
    }
    const expectedId = `${screen.prototypeId}.${screen.screenSlug}`;
    if (screen.screenId !== expectedId) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/screenId",
        keyword: "const",
        message: `expected ${expectedId}`,
      });
    }
    const expectedPath = `/prototype/${screen.prototypeId}/${screen.screenSlug}`;
    if (screen.path !== expectedPath) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/path",
        keyword: "const",
        message: `expected ${expectedPath}`,
      });
    }
    if (screenIds.has(screen.screenId)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/screenId",
        keyword: "uniqueItems",
        message: "duplicate screenId",
      });
    }
    screenIds.add(screen.screenId);
    if (screenPaths.has(screen.path)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/path",
        keyword: "uniqueItems",
        message: "duplicate path",
      });
    }
    screenPaths.add(screen.path);

    const slugSet =
      slugByPrototype.get(screen.prototypeId) ?? new Set<string>();
    if (slugSet.has(screen.screenSlug)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/screenSlug",
        keyword: "uniqueItems",
        message: "duplicate screenSlug in prototype",
      });
    }
    slugSet.add(screen.screenSlug);
    slugByPrototype.set(screen.prototypeId, slugSet);

    const { matches } = findViewModule(screenViewModules, screen.view);
    if (matches.length === 0) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/view",
        keyword: "view",
        message: `view not found: ${screen.view}`,
      });
    } else if (matches.length > 1) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/view",
        keyword: "view",
        message: `ambiguous view: ${screen.view}`,
      });
    }

    if (screen.variants.length === 0) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/variants",
        keyword: "minItems",
        message: "screen requires at least one variant",
      });
    }

    const variantIds = new Set<string>();
    let hasDefault = false;
    for (const key of screen.queryKeys ?? []) {
      if (RESERVED_QUERY_KEYS.has(key) || !QUERY_KEY_PATTERN.test(key)) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: "/queryKeys",
          keyword: "pattern",
          message: `invalid Runtime query key ${key}`,
        });
      }
    }
    for (const variant of screen.variants) {
      if (!SLUG_ID_PATTERN.test(variant.id)) {
        pushError(errors, {
          resourceType: "variant",
          resourceId: `${screen.screenId}.${variant.id}`,
          instancePath: "/id",
          keyword: "pattern",
          message: "invalid variant id",
        });
      }
      if (variantIds.has(variant.id)) {
        pushError(errors, {
          resourceType: "variant",
          resourceId: `${screen.screenId}.${variant.id}`,
          instancePath: "/id",
          keyword: "uniqueItems",
          message: "duplicate variant id",
        });
      }
      variantIds.add(variant.id);
      if (variant.id === screen.defaultVariantId) hasDefault = true;

      for (const [key, value] of Object.entries(variant.query ?? {})) {
        if (RESERVED_QUERY_KEYS.has(key)) {
          pushError(errors, {
            resourceType: "variant",
            resourceId: `${screen.screenId}.${variant.id}`,
            instancePath: `/query/${key}`,
            keyword: "not",
            message: "variant/theme are reserved query keys",
          });
        }
        if (!QUERY_KEY_PATTERN.test(key)) {
          pushError(errors, {
            resourceType: "variant",
            resourceId: `${screen.screenId}.${variant.id}`,
            instancePath: `/query/${key}`,
            keyword: "pattern",
            message: "invalid query key",
          });
        }
        if (value.length > 512) {
          pushError(errors, {
            resourceType: "variant",
            resourceId: `${screen.screenId}.${variant.id}`,
            instancePath: `/query/${key}`,
            keyword: "maxLength",
            message: "query value exceeds 512 chars",
          });
        }
      }

      if (
        requiresStrictEvidence(screen.screenId) &&
        (variant.id === screen.defaultVariantId || variant.critical) &&
        (!variant.requiredFragments || variant.requiredFragments.length === 0)
      ) {
        pushError(errors, {
          resourceType: "variant",
          resourceId: `${screen.screenId}.${variant.id}`,
          instancePath: "/requiredFragments",
          keyword: "required",
          message:
            "PB-compliant default and critical Variants require an authored Evidence completeness boundary",
        });
      }
      for (const fragment of variant.requiredFragments ?? []) {
        if (fragment.screenId !== screen.screenId) {
          pushError(errors, {
            resourceType: "variant",
            resourceId: `${screen.screenId}.${variant.id}`,
            instancePath: "/requiredFragments",
            keyword: "const",
            message: `Variant Fragment must belong to ${screen.screenId}`,
          });
        }
      }
    }
    if (!hasDefault) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/defaultVariantId",
        keyword: "enum",
        message: `default variant ${screen.defaultVariantId} missing`,
      });
    }
  }

  const screensById = new Map(
    screens.map((screen) => [screen.screenId, screen]),
  );
  for (const legacyScreenId of LEGACY_EVIDENCE_SCREEN_IDS) {
    if (!screensById.has(legacyScreenId)) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: legacyScreenId,
        instancePath: "/legacyEvidenceScreenIds",
        keyword: "enum",
        message: "stale legacy Evidence exception; remove this ID",
      });
    }
  }
  for (const screen of screens) {
    const actions = screen.actions ?? [];
    const actionIds = new Set<string>();
    for (const action of actions) {
      if (!SLUG_ID_PATTERN.test(action.id) || actionIds.has(action.id)) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: "/actions",
          keyword: actionIds.has(action.id) ? "uniqueItems" : "pattern",
          message: `invalid or duplicate Action ${action.id}`,
        });
      }
      actionIds.add(action.id);
      if (!screensById.has(action.target.screenId)) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: `/actions/${action.id}/target/screenId`,
          keyword: "enum",
          message: `unknown Action target Screen ${action.target.screenId}`,
        });
      }
    }

    const scenarioIds = new Set<string>();
    for (const scenario of screen.scenarios ?? []) {
      if (!SLUG_ID_PATTERN.test(scenario.id) || scenarioIds.has(scenario.id)) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: "/scenarios",
          keyword: scenarioIds.has(scenario.id) ? "uniqueItems" : "pattern",
          message: `invalid or duplicate Scenario ${scenario.id}`,
        });
      }
      scenarioIds.add(scenario.id);
      if (
        !screen.variants.some(
          (variant) => variant.id === scenario.initialVariantId,
        )
      ) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: `/scenarios/${scenario.id}/initialVariantId`,
          keyword: "enum",
          message: `unknown initial Variant ${scenario.initialVariantId}`,
        });
      }
      for (const actionId of scenario.actionIds) {
        if (!actionIds.has(actionId)) {
          pushError(errors, {
            resourceType: "screen",
            resourceId: screen.screenId,
            instancePath: `/scenarios/${scenario.id}/actionIds`,
            keyword: "enum",
            message: `unknown Action ${actionId}`,
          });
        }
      }
      const checkpointIds = new Set<string>();
      for (const checkpoint of scenario.checkpoints) {
        const checkpointScreen = screensById.get(checkpoint.screenId);
        if (
          !SLUG_ID_PATTERN.test(checkpoint.id) ||
          checkpointIds.has(checkpoint.id)
        ) {
          pushError(errors, {
            resourceType: "screen",
            resourceId: screen.screenId,
            instancePath: `/scenarios/${scenario.id}/checkpoints`,
            keyword: checkpointIds.has(checkpoint.id)
              ? "uniqueItems"
              : "pattern",
            message: `invalid or duplicate Checkpoint ${checkpoint.id}`,
          });
        }
        checkpointIds.add(checkpoint.id);
        if (
          !checkpointScreen ||
          !checkpointScreen.variants.some(
            (variant) => variant.id === checkpoint.variantId,
          )
        ) {
          pushError(errors, {
            resourceType: "screen",
            resourceId: screen.screenId,
            instancePath: `/scenarios/${scenario.id}/checkpoints/${checkpoint.id}`,
            keyword: "enum",
            message: `unknown Checkpoint Screen/Variant ${checkpoint.screenId}/${checkpoint.variantId}`,
          });
        }
        const assertionFragments = [
          ...checkpoint.requiredFragments,
          ...(checkpoint.expectedStates ?? []).map((item) => item.fragment),
          ...(checkpoint.expectedFragmentKeys ?? []).map(
            (item) => item.fragment,
          ),
          ...(checkpoint.forbiddenFragments ?? []),
        ];
        for (const fragment of assertionFragments) {
          if (fragment.screenId !== checkpoint.screenId) {
            pushError(errors, {
              resourceType: "screen",
              resourceId: screen.screenId,
              instancePath: `/scenarios/${scenario.id}/checkpoints/${checkpoint.id}`,
              keyword: "const",
              message: `Checkpoint Fragment must belong to ${checkpoint.screenId}`,
            });
          }
        }
        for (const expected of checkpoint.expectedFragmentKeys ?? []) {
          if (new Set(expected.keys).size !== expected.keys.length) {
            pushError(errors, {
              resourceType: "screen",
              resourceId: screen.screenId,
              instancePath: `/scenarios/${scenario.id}/checkpoints/${checkpoint.id}/expectedFragmentKeys`,
              keyword: "uniqueItems",
              message: `Checkpoint expected keys for ${expected.fragment.pbId} must be unique`,
            });
          }
        }
      }
    }
    for (const scenarioId of screen.requiredScenarioIds ?? []) {
      if (!scenarioIds.has(scenarioId)) {
        pushError(errors, {
          resourceType: "screen",
          resourceId: screen.screenId,
          instancePath: "/requiredScenarioIds",
          keyword: "enum",
          message: `unknown required Scenario ${scenarioId}`,
        });
      }
    }
    if (
      new Set(screen.requiredScenarioIds ?? []).size !==
      (screen.requiredScenarioIds ?? []).length
    ) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/requiredScenarioIds",
        keyword: "uniqueItems",
        message: "required Scenario ids must be unique",
      });
    }
    if (
      (actions.length > 0 || (screen.scenarios?.length ?? 0) > 0) &&
      !screen.variants.some((variant) => variant.critical)
    ) {
      pushError(errors, {
        resourceType: "screen",
        resourceId: screen.screenId,
        instancePath: "/variants",
        keyword: "required",
        message: "instrumented Screen requires at least one critical Variant",
      });
    }
  }

  return errors;
}

export function assertRegistriesValid(): void {
  const errors = validateRegistries();
  if (errors.length === 0) return;
  const summary = errors
    .slice(0, 8)
    .map(
      (error) =>
        `${error.resourceType}:${error.resourceId ?? "-"} ${error.instancePath} ${error.message}`,
    )
    .join("\n");
  throw new Error(`Registry validation failed:\n${summary}`);
}
