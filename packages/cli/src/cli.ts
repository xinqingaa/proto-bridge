import path from 'node:path';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import {
  AgentHandoff,
  BundleId,
  HandoffId,
  JobId,
  RunId,
  RiskKind,
  SnapshotId,
  V2ContractError,
  V2_SCHEMA_MAJOR,
  V2WorkspaceConfig,
  WorkspaceId,
  buildEvidenceReadModel,
  computeScopeKey,
  riskKindLabel,
  type Risk,
  type SelectedCase,
} from '@proto-bridge/core/v2';
import {
  CaptureJobHost,
  discoverInstrumentedRuntimeManifest,
  PlaywrightCaseCaptureDriver,
  SelectionDraft,
  createAgentHandoff,
  evaluateAgentHandoff,
  preflightInstrumentedRuntime,
  preflightSelection,
  selectionDraftFromSelectedCases,
  type CapturePreflight,
  type CaseCaptureDriver,
  type CapturedCase,
} from '@proto-bridge/core/v2/capture';
import { RuntimeCaptureManifest } from '@proto-bridge/core/v2/runtime-contract';
import {
  LocalFileStore,
  createWorkspaceResetPlan,
  deliveryRootFromStoreRoot,
  generateOperationalId,
  reviewsRootFromStoreRoot,
  validateWorkspaceResetPlan,
  writeDeliveryReceipt,
} from '@proto-bridge/core/v2/store';
import { ProtoBridgeLocalService } from '@proto-bridge/local-service';
import {
  booleanFlag,
  flag,
  flags,
  numberFlag,
  parseCliArgs,
  requiredFlag,
  type CliArgs,
} from './args.js';
import { loadCliConfig, type LoadedCliConfig } from './config.js';
import { emit, processIo, type CliIo } from './output.js';
import {
  CliServiceClientError,
  connectLocalService,
  probeLocalService,
  type CliServiceClient,
} from './service-client.js';

const EXIT = {
  ok: 0,
  error: 1,
  partial: 2,
  cancelled: 3,
  interrupted: 4,
  failed: 5,
  stale: 6,
  blocked: 7,
} as const;

export async function runCli(
  argv: string[],
  io: CliIo = processIo,
): Promise<number> {
  try {
    return await execute(parseCliArgs(argv), io);
  } catch (error) {
    if (error instanceof CliServiceClientError) {
      io.stderr(error.message);
      if (
        ['preflight-expired', 'bundle-archived', 'capacity-exceeded'].includes(
          error.code,
        )
      ) {
        return EXIT.blocked;
      }
      return EXIT.error;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(message);
    if (
      error instanceof V2ContractError &&
      ['preflight-expired', 'bundle-archived', 'capacity-exceeded'].includes(
        error.code,
      )
    ) {
      return EXIT.blocked;
    }
    return EXIT.error;
  }
}

async function execute(args: CliArgs, io: CliIo): Promise<number> {
  const command = args.command.join(' ');
  if (booleanFlag(args, 'help') || command === '' || command === 'help') {
    io.stdout(cliUsage());
    return EXIT.ok;
  }
  if (command === 'workspace init') return initWorkspace(args, io);
  const loaded = await loadCliConfig(flag(args, 'config'), io.cwd);
  if (command === 'workspace doctor') return workspaceDoctor(args, io, loaded);
  if (command === 'workspace doctor repair') return workspaceDoctorRepair(args, io, loaded);
  if (command === 'workspace reset') return workspaceReset(args, io, loaded);
  if (command === 'workspace reinitialize') return workspaceReinitialize(args, io, loaded);
  if (command === 'preflight') return preflightCommand(args, io, loaded);
  if (command === 'capture run') return captureCommand(args, io, loaded);
  if (command === 'job status') return jobStatus(args, io, loaded);
  if (command === 'job cancel') return jobCancel(args, io, loaded);
  if (command === 'job retry') return jobRetry(args, io, loaded);
  if (command === 'bundle list') return bundleList(args, io, loaded);
  if (command === 'bundle inspect') return bundleInspect(args, io, loaded);
  if (command === 'bundle fork') return bundleFork(args, io, loaded);
  if (command === 'bundle archive') return bundleArchive(args, io, loaded);
  if (command === 'bundle clean') return bundleClean(args, io, loaded);
  if (command === 'snapshot inspect') return snapshotInspect(args, io, loaded);
  if (command === 'run inspect') return runInspect(args, io, loaded);
  if (command === 'case inspect') return caseInspect(args, io, loaded);
  if (command === 'stale check') return staleCheck(args, io, loaded);
  if (command === 'handoff create') return handoffCreate(args, io, loaded);
  if (command === 'handoff show') return handoffShow(args, io, loaded);
  if (command === 'handoff export') return handoffExport(args, io, loaded);
  if (command === 'deliver') return deliverCommand(args, io, loaded);
  if (command === 'service start') return serviceStart(args, io, loaded);
  throw new Error(`Unknown ProtoBridge command: ${command}`);
}

async function initWorkspace(args: CliArgs, io: CliIo): Promise<number> {
  const configPath = path.resolve(
    io.cwd,
    flag(args, 'config') ?? 'proto-bridge.json',
  );
  try {
    await access(configPath);
    throw new Error(`ProtoBridge config already exists: ${configPath}`);
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )) {
      throw error;
    }
  }
  const runtimeBaseUrl = flag(args, 'runtime') ?? 'http://127.0.0.1:3977';
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  const servicePort = numberFlag(args, 'service-port') ?? 3988;
  const config = V2WorkspaceConfig.parse({
    schemaVersion: V2_SCHEMA_MAJOR,
    workspaceId: flag(args, 'workspace') ?? 'pbwork-local',
    runtime: {
      baseUrl: runtimeBaseUrl,
      allowedOrigins: flags(args, 'runtime-origin'),
    },
    store: {
      root: flag(args, 'store') ?? '.proto-bridge/store',
      ...(numberFlag(args, 'max-store-bytes') === undefined
        ? {}
        : { maxBytes: numberFlag(args, 'max-store-bytes') }),
    },
    capture: { maxCases: numberFlag(args, 'max-cases') ?? 100 },
    service: {
      host: flag(args, 'service-host') ?? '127.0.0.1',
      port: servicePort,
      allowedOrigins:
        flags(args, 'service-origin').length > 0
          ? flags(args, 'service-origin')
          : [runtimeOrigin],
    },
  });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  const store = new LocalFileStore({
    root: path.resolve(path.dirname(configPath), config.store.root),
    workspaceId: config.workspaceId,
    ...(config.store.maxBytes === undefined
      ? {}
      : { maxBytes: config.store.maxBytes }),
  });
  const initialized = await store.init();
  await store.close();
  emit(
    io,
    booleanFlag(args, 'json'),
    { configPath, config, lifecycle: initialized.lifecycle },
    `Created ${configPath}`,
  );
  return EXIT.ok;
}

async function workspaceDoctor(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  // Doctor only reads Workspace state; stay read-only so it works while
  // Local Service (pb:up) holds the single-writer lock.
  const store = await openStore(loaded, true);
  try {
    const result = {
      schemaVersion: loaded.value.schemaVersion,
      workspaceId: loaded.value.workspaceId,
      configPath: loaded.path,
      storeRoot: loaded.storeRoot,
      runtimeBaseUrl: loaded.value.runtime.baseUrl,
      lifecycle: await store.getWorkspaceLifecycle(),
      capacity: await store.getCapacity(),
      bundles: (await store.listBundles()).length,
      jobs: (await store.listJobs()).length,
    };
    emit(
      io,
      booleanFlag(args, 'json'),
      result,
      `Workspace ${result.workspaceId} is ready.`,
    );
    return EXIT.ok;
  } finally {
    await store.close();
  }
}

async function workspaceDoctorRepair(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const manifestPath = path.join(loaded.storeRoot, 'workspace.json');
  try {
    await access(manifestPath);
  } catch {
    throw new V2ContractError('external-store-destroyed', 'Workspace manifest/root is missing; repair cannot recreate Evidence identity. Use workspace reinitialize with explicit confirmation.');
  }
  const writer = await openStore(loaded);
  try {
    const lifecycle = await writer.getWorkspaceLifecycle();
    emit(io, booleanFlag(args, 'json'), {
      workspaceId: loaded.value.workspaceId,
      lifecycle,
      repaired: true,
      evidenceIdentityChanged: false,
    }, `Workspace ${loaded.value.workspaceId} runtime state is healthy; Evidence identity was not changed.`);
    return EXIT.ok;
  } finally {
    await writer.close();
  }
}

async function workspaceReinitialize(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  if (requiredFlag(args, 'confirm-destroyed') !== loaded.value.workspaceId) {
    throw new V2ContractError('unsafe-input', `--confirm-destroyed must exactly equal ${loaded.value.workspaceId}.`);
  }
  if (await probeLocalService(loaded)) {
    throw new V2ContractError('writer-lock-held', 'Stop the active Local Service before reinitializing a destroyed Workspace.');
  }
  let rootExists = true;
  try { await access(loaded.storeRoot); } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') rootExists = false;
    else throw error;
  }
  if (rootExists) {
    const marker = path.join(loaded.storeRoot, '.reset-in-progress.json');
    let interruptedReset = true;
    try { await access(marker); } catch { interruptedReset = false; }
    let manifestExists = true;
    try { await access(path.join(loaded.storeRoot, 'workspace.json')); } catch { manifestExists = false; }
    if (!interruptedReset || manifestExists) {
      throw new V2ContractError('unsafe-input', 'Workspace Store still exists; use generation-bound workspace reset instead of reinitialize.');
    }
    await rm(loaded.storeRoot, { recursive: true, force: true });
  }
  const writer = await openStore(loaded);
  try {
    const lifecycle = await writer.getWorkspaceLifecycle();
    emit(io, booleanFlag(args, 'json'), {
      workspaceId: loaded.value.workspaceId,
      lifecycle,
      reinitialized: true,
      oldEvidenceRecoverable: false,
    }, `Reinitialized ${loaded.value.workspaceId} with generation ${lifecycle.generationId}.`);
    return EXIT.ok;
  } finally {
    await writer.close();
  }
}

async function workspaceReset(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const storeRoot = path.resolve(loaded.storeRoot);
  const deliveriesRoot = deliveryRootFromStoreRoot(storeRoot);
  const reviewsRoot = reviewsRootFromStoreRoot(storeRoot, loaded.value.workspaceId);
  const filesystemRoot = path.parse(storeRoot).root;
  if (
    storeRoot === filesystemRoot ||
    deliveriesRoot === filesystemRoot ||
    storeRoot === path.resolve(io.cwd) ||
    path.dirname(storeRoot) === filesystemRoot
  ) {
    throw new V2ContractError(
      'unsafe-input',
      `Refusing to reset unsafe Store root ${storeRoot}.`,
    );
  }

  const viaService = await probeLocalService(loaded);
  if (!booleanFlag(args, 'apply')) {
    let plan;
    if (viaService) {
      plan = await (await connectLocalService(loaded)).previewWorkspaceReset(loaded.value.workspaceId);
    } else {
      const writer = await openStore(loaded);
      try {
        const lifecycle = await writer.getWorkspaceLifecycle();
        if (lifecycle.generationId === 'legacy-unavailable') {
          throw new V2ContractError('workspace-generation-mismatch', 'Workspace writer did not upgrade the legacy generation.');
        }
        plan = await createWorkspaceResetPlan({
          workspaceId: loaded.value.workspaceId,
          generationId: lifecycle.generationId,
          storeRoot,
          deliveriesRoot,
          reviewsRoot,
          runningTasks: (await writer.listNonTerminalJobs()).map((job) => `job:${job.jobId}`),
        });
      } finally {
        await writer.close();
      }
    }
    emit(
      io,
      booleanFlag(args, 'json'),
      { ...plan, storeRoot, deliveriesRoot, reviewsRoot, applied: false, viaService },
      [
        `Workspace reset preview for ${loaded.value.workspaceId}`,
        `  Plan        ${plan.planId}`,
        `  Generation  ${plan.generationId}`,
        `  Evidence    ${plan.evidence.objects} objects / ${plan.evidence.bytes} bytes`,
        `  Deliveries  ${plan.deliveries.objects} objects / ${plan.deliveries.bytes} bytes`,
        `  Reviews     ${plan.reviews.objects} objects / ${plan.reviews.bytes} bytes`,
        '',
        `Nothing was deleted. Re-run with --apply --plan-id ${plan.planId} --generation ${plan.generationId}.`,
      ].join('\n'),
    );
    return EXIT.ok;
  }

  const planId = requiredFlag(args, 'plan-id');
  const generationId = requiredFlag(args, 'generation');
  let result;
  if (viaService) {
    const client = await connectLocalService(loaded);
    result = await client.applyWorkspaceReset({ workspaceId: loaded.value.workspaceId, generationId, planId });
  } else {
    const writer = await openStore(loaded);
    try {
      const runningTasks = (await writer.listNonTerminalJobs()).map((job) => `job:${job.jobId}`);
      const plan = await validateWorkspaceResetPlan({
        planId,
        workspaceId: loaded.value.workspaceId,
        generationId,
        storeRoot,
        deliveriesRoot,
        reviewsRoot,
        runningTasks,
      });
      const reset = await writer.resetWorkspace(generationId);
      await rm(deliveriesRoot, { recursive: true, force: true });
      await rm(reviewsRoot, { recursive: true, force: true });
      result = {
        workspaceId: loaded.value.workspaceId,
        oldGenerationId: reset.oldGenerationId,
        newGenerationId: reset.newGenerationId,
        actualRemoved: { evidence: plan.evidence, deliveries: plan.deliveries, reviews: plan.reviews },
        revokedSessionCount: 0,
        stoppedJobIds: runningTasks.map((item) => item.replace(/^job:/, '')),
        stoppedReviewRunIds: [],
      };
    } finally {
      await writer.close();
    }
  }
  emit(
    io,
    booleanFlag(args, 'json'),
    { ...result, storeRoot, deliveriesRoot, reviewsRoot, applied: true, viaService },
    `Reset Workspace ${loaded.value.workspaceId}; generation ${result.oldGenerationId} -> ${result.newGenerationId}.`,
  );
  return EXIT.ok;
}

async function loadDraft(args: CliArgs): Promise<SelectionDraft> {
  return SelectionDraft.parse(
    JSON.parse(
      await readFile(requiredFlag(args, 'selection'), 'utf8'),
    ) as unknown,
  );
}

function resolveScreenId(prototypeId: string, screen: string): string {
  return screen.includes('.') ? screen : `${prototypeId}.${screen}`;
}

function parseFragmentFlag(
  raw: string,
  screenId: string,
): { screenId: string; pbId: string; pbKey?: string } {
  const [pbId, pbKey] = raw.split(':');
  if (!pbId) {
    throw new V2ContractError(
      'invalid-schema',
      '--fragment requires pbId or pbId:pbKey.',
    );
  }
  return {
    screenId,
    pbId,
    ...(pbKey ? { pbKey } : {}),
  };
}

/**
 * Builds a SelectionDraft from --selection or short deliver flags.
 * Defaults: all authored Screens, Variants and Scenarios, theme=light,
 * device=iphone-14. Repeated --only-* flags narrow by authored ids.
 * When --bundle and --snapshot are both set, SelectionDraft is not required
 * (resume path: handoff + prompt only).
 */
export async function resolveDeliverDraft(
  args: CliArgs,
  loaded: LoadedCliConfig,
): Promise<SelectionDraft | undefined> {
  if (flag(args, 'bundle') && flag(args, 'snapshot')) {
    if (
      flag(args, 'selection') ||
      flag(args, 'prototype') ||
      flag(args, 'screen')
    ) {
      // Capture scope is ignored when resuming from a fixed Snapshot.
    }
    return undefined;
  }
  if (flag(args, 'selection')) return loadDraft(args);

  const prototypeId = flag(args, 'prototype');
  const screen = flag(args, 'screen');
  if (!prototypeId) {
    throw new V2ContractError(
      'invalid-schema',
      'deliver requires --selection <file>, --prototype <id>, or --bundle with --snapshot to resume.',
    );
  }

  if (flag(args, 'variants') || flag(args, 'scenarios')) {
    throw new V2ContractError(
      'invalid-schema',
      '--variants and --scenarios were removed. Use repeatable --only-variant and --only-scenario with authored ids.',
    );
  }
  const manifestPath = flag(args, 'manifest');
  const manifest = manifestPath
    ? RuntimeCaptureManifest.parse(
        JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
      )
    : await discoverInstrumentedRuntimeManifest({
        runtimeBaseUrl: loaded.value.runtime.baseUrl,
        prototypeId,
        ...(screen
          ? {
              screenSlug: screen.includes('.')
                ? screen.split('.').at(-1)!
                : screen,
            }
          : {}),
      });
  const requestedScreenId = screen
    ? resolveScreenId(prototypeId, screen)
    : undefined;
  const selectedScreens = manifest.screens.filter(
    (candidate) =>
      candidate.prototypeId === prototypeId &&
      (!requestedScreenId || candidate.screenId === requestedScreenId),
  );
  if (selectedScreens.length === 0) {
    throw new V2ContractError(
      'unknown-reference',
      requestedScreenId
        ? `Runtime Manifest does not contain Screen ${requestedScreenId}.`
        : `Runtime Manifest does not contain Prototype ${prototypeId}.`,
    );
  }
  const onlyVariantIds = new Set(flags(args, 'only-variant'));
  const onlyScenarioIds = new Set(flags(args, 'only-scenario'));
  if (
    !requestedScreenId &&
    (onlyVariantIds.size > 0 || onlyScenarioIds.size > 0)
  ) {
    throw new V2ContractError(
      'invalid-schema',
      '--only-variant and --only-scenario require --screen. Use --selection for an exact multi-Screen matrix.',
    );
  }

  const fragmentRaw = flag(args, 'fragment');
  if (fragmentRaw && !requestedScreenId) {
    throw new V2ContractError(
      'invalid-schema',
      '--fragment requires --screen so its owner Screen is explicit.',
    );
  }
  const fragments = fragmentRaw
    ? [parseFragmentFlag(fragmentRaw, requestedScreenId!)]
    : [];

  return SelectionDraft.parse({
    prototypeId,
    screens: selectedScreens.map((selectedScreen) => {
      const variantIds = selectedScreen.variants
        .map((variant) => variant.variantId)
        .filter(
          (variantId) =>
            onlyVariantIds.size === 0 || onlyVariantIds.has(variantId),
        );
      if (variantIds.length === 0) {
        throw new V2ContractError(
          'unknown-reference',
          `No --only-variant id belongs to Screen ${selectedScreen.screenId}.`,
        );
      }
      const scenarioIds = selectedScreen.scenarios
        .map((scenario) => scenario.scenarioId)
        .filter(
          (scenarioId) =>
            onlyScenarioIds.size === 0 || onlyScenarioIds.has(scenarioId),
        );
      if (onlyScenarioIds.size > 0 && scenarioIds.length === 0) {
        throw new V2ContractError(
          'unknown-reference',
          `No --only-scenario id belongs to Screen ${selectedScreen.screenId}.`,
        );
      }
      return {
        screenId: selectedScreen.screenId,
        variants: { mode: 'explicit' as const, variantIds },
        themeIds: [flag(args, 'theme') ?? 'light'],
        deviceIds: [flag(args, 'device') ?? 'iphone-14'],
        scenarios: scenarioIds.length
          ? { mode: 'explicit' as const, scenarioIds }
          : { mode: 'none' as const },
        captureScope: {
          fragments:
            selectedScreen.screenId === requestedScreenId ? fragments : [],
          screenshots:
            selectedScreen.screenId === requestedScreenId &&
            fragments.length > 0
              ? { mode: 'selected', targets: fragments }
              : { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: false,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      };
    }),
    acceptedWarningIds: flags(args, 'accept-warning'),
  });
}

async function previewDeliverRisks(
  args: CliArgs,
  loaded: LoadedCliConfig,
  bundleId: string,
  snapshotId: string,
  intent: string | undefined,
): Promise<{ risks: Risk[]; coverageStatus: string; freshnessStatus: string }> {
  const acknowledgedRiskKinds = flags(args, 'ack-risk').map((kind) =>
    RiskKind.parse(kind),
  );
  const mode = await resolveWriterMode(args, loaded);
  if (mode === 'service') {
    const client = await connectLocalService(loaded);
    const preview = await client.previewHandoff({
      bundleId,
      snapshotId,
      ...(intent ? { implementationIntent: intent } : {}),
      acknowledgedRiskKinds,
    });
    return {
      risks: preview.risks,
      coverageStatus: preview.coverageStatus,
      freshnessStatus: preview.freshnessStatus,
    };
  }
  const store = await openStore(loaded, true);
  try {
    const current = await createCurrentStaleness(
      args,
      loaded,
      store,
      BundleId.parse(bundleId),
      SnapshotId.parse(snapshotId),
    );
    const evaluation = await evaluateAgentHandoff({
      store,
      bundleId: BundleId.parse(bundleId),
      snapshotId: SnapshotId.parse(snapshotId),
      selectedCases: current.cases,
      stalenessReport: current.report,
    });
    return {
      risks: evaluation.risks,
      coverageStatus: evaluation.coverageStatus,
      freshnessStatus: evaluation.freshnessStatus,
    };
  } finally {
    await store.close();
  }
}

async function createDeliverHandoff(
  args: CliArgs,
  loaded: LoadedCliConfig,
  bundleId: string,
  snapshotId: string,
  intent: string,
): Promise<AgentHandoff> {
  const acknowledgedRiskKinds = flags(args, 'ack-risk').map((kind) =>
    RiskKind.parse(kind),
  );
  const mode = await resolveWriterMode(args, loaded);
  if (mode === 'service') {
    const client = await connectLocalService(loaded);
    return client.createHandoff({
      bundleId,
      snapshotId,
      implementationIntent: intent,
      acknowledgedRiskKinds,
    });
  }
  const store = await openStore(loaded);
  try {
    const current = await createCurrentStaleness(
      args,
      loaded,
      store,
      BundleId.parse(bundleId),
      SnapshotId.parse(snapshotId),
    );
    return createAgentHandoff({
      store,
      bundleId: BundleId.parse(bundleId),
      snapshotId: SnapshotId.parse(snapshotId),
      selectedCases: current.cases,
      stalenessReport: current.report,
      currentInputVersion: current.currentInputVersion,
      implementationIntent: intent,
      acknowledgedRiskKinds,
    });
  } finally {
    await store.close();
  }
}

async function deliverCommand(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const targetRoot = path.resolve(
    io.cwd,
    flag(args, 'target') ?? 'apps/flutter_pb_app',
  );
  try {
    await access(targetRoot);
  } catch {
    throw new V2ContractError(
      'invalid-schema',
      `Agent target is not reachable: ${targetRoot}`,
    );
  }

  const intent =
    flag(args, 'intent') ??
    'Use the fixed ProtoBridge Evidence to implement or verify the selected prototype scope.';
  const draft = await resolveDeliverDraft(args, loaded);

  let bundleId = flag(args, 'bundle');
  let snapshotId = flag(args, 'snapshot');
  let runId: string | undefined;
  let captureExit: number = EXIT.ok;

  if (draft) {
    const captureResult = await runCapture(args, loaded, draft);
    bundleId = captureResult.run.bundleId;
    snapshotId = captureResult.snapshot.snapshotId;
    runId = captureResult.run.runId;
    captureExit = exitForRun(captureResult.run);
  }
  if (!bundleId || !snapshotId) {
    throw new V2ContractError(
      'invalid-schema',
      'deliver requires a capture selection or both --bundle and --snapshot.',
    );
  }

  const preview = await previewDeliverRisks(
    args,
    loaded,
    bundleId,
    snapshotId,
    intent,
  );
  const acknowledged = new Set(flags(args, 'ack-risk'));
  const missingRisks = preview.risks
    .map((risk) => risk.kind)
    .filter((kind) => !acknowledged.has(kind));
  if (missingRisks.length > 0) {
    throw new V2ContractError(
      'invalid-schema',
      [
        'Deliver captured Evidence, but Handoff risks must be acknowledged:',
        ...preview.risks.map(
          (risk) =>
            `  --ack-risk ${risk.kind}  # ${riskKindLabel(risk.kind)}: ${risk.message}`,
        ),
        '',
        'Resume without re-capturing:',
        `  pnpm pb -- deliver --bundle ${bundleId} --snapshot ${snapshotId} --target ${targetRoot} --intent ${JSON.stringify(intent)} ${preview.risks
          .map((risk) => `--ack-risk ${risk.kind}`)
          .join(' ')}`,
      ].join('\n'),
    );
  }

  const handoff = await createDeliverHandoff(
    args,
    loaded,
    bundleId,
    snapshotId,
    intent,
  );

  const receipt = await writeDeliveryReceipt({
    storeRoot: loaded.storeRoot,
    targetRoot,
    handoff,
    source: 'cli',
    ...(runId ? { runId } : {}),
    acceptedWarningIds:
      draft?.acceptedWarningIds ?? flags(args, 'accept-warning'),
    acknowledgedRiskKinds: flags(args, 'ack-risk'),
    configPath: loaded.path,
    implementationIntent: intent,
  });
  const agentPrompt = await readFile(receipt.agentPromptPath, 'utf8');

  if (booleanFlag(args, 'json')) {
    emit(io, true, { ...receipt, handoff });
  } else {
    io.stdout(
      [
        '',
        'Delivered (Store index only; MCP reads Evidence from the Store)',
        `  Workspace  ${loaded.value.workspaceId}`,
        `  Bundle     ${bundleId}`,
        `  Snapshot   ${snapshotId}`,
        `  Handoff    ${handoff.handoffId}`,
        `  Prompt     ${receipt.agentPromptPath}`,
        `  Contract   ${receipt.acceptanceContractPath}`,
        `  Brief      ${receipt.evidenceBriefPath}`,
        `  Review     ${receipt.reviewIndexPath} (${receipt.screenshotCount} distinct screenshots)`,
        '',
        '──────── copy into Cursor / Codex ────────',
        agentPrompt.trimEnd(),
        '──────────────────────────────────────────',
        'MCP: confirm Cursor/Codex has proto-bridge configured (one-click Agent launch is not supported yet).',
        '',
      ].join('\n'),
    );
  }

  if (handoff.coverageStatus === 'partial') return EXIT.partial;
  if (handoff.freshnessStatus === 'stale') return EXIT.stale;
  return captureExit;
}

async function resolvePreflight(
  args: CliArgs,
  loaded: LoadedCliConfig,
  draftInput?: SelectionDraft,
): Promise<CapturePreflight> {
  const draft = draftInput ?? (await loadDraft(args));
  const accepted = flags(args, 'accept-warning');
  const effectiveDraft = SelectionDraft.parse({
    ...draft,
    acceptedWarningIds:
      accepted.length > 0 ? accepted : draft.acceptedWarningIds,
  });
  const manifestPath = flag(args, 'manifest');
  if (manifestPath) {
    const manifest = RuntimeCaptureManifest.parse(
      JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
    );
    return preflightSelection(effectiveDraft, manifest, {
      maxCases: loaded.value.capture.maxCases,
    });
  }
  return (
    await preflightInstrumentedRuntime({
      draft: effectiveDraft,
      runtimeBaseUrl: loaded.value.runtime.baseUrl,
      maxCases: loaded.value.capture.maxCases,
    })
  ).preflight;
}

async function preflightCommand(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const preflight = await resolvePreflight(args, loaded);
  emit(
    io,
    booleanFlag(args, 'json'),
    preflight,
    [
      `Preflight ${preflight.ready ? 'ready' : 'blocked'}.`,
      `Cases: ${preflight.matrix.length}`,
      ...preflight.diagnostics
        .filter((diagnostic) => diagnostic.severity === 'block')
        .map(
          (diagnostic) =>
            `Block ${diagnostic.diagnosticId} (${diagnostic.code}): ${diagnostic.message}`,
        ),
      ...preflight.warnings.map(
        (warning) => `Warning ${warning.warningId}: ${warning.message}`,
      ),
    ].join('\n'),
  );
  return preflight.ready ? EXIT.ok : EXIT.blocked;
}

class AttachedScreenshotDriver implements CaseCaptureDriver {
  constructor(
    private readonly bytes: Uint8Array,
    private readonly mediaType: string,
  ) {}

  async captureCase(): Promise<CapturedCase> {
    return {
      evidenceLevel: 'screenshot-only',
      facts: [],
      requiredFactsTotal: 0,
      requiredFactsResolved: 0,
      binaries: [
        { kind: 'screenshot', mediaType: this.mediaType, bytes: this.bytes },
      ],
      diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    };
  }
}

async function captureDriver(args: CliArgs): Promise<CaseCaptureDriver> {
  const screenshotPath = flag(args, 'screenshot');
  if (!screenshotPath) return new PlaywrightCaseCaptureDriver();
  const bytes = await readFile(screenshotPath);
  const extension = path.extname(screenshotPath).toLowerCase();
  const mediaType =
    extension === '.png'
      ? 'image/png'
      : extension === '.jpg' || extension === '.jpeg'
        ? 'image/jpeg'
        : undefined;
  if (!mediaType || bytes.byteLength === 0) {
    throw new V2ContractError(
      'blob-rejected',
      'Attached screenshot must be a non-empty PNG or JPEG file.',
    );
  }
  return new AttachedScreenshotDriver(bytes, mediaType);
}

async function resolveWriterMode(
  args: CliArgs,
  loaded: LoadedCliConfig,
): Promise<'service' | 'local'> {
  if (booleanFlag(args, 'local-store') || flag(args, 'screenshot')) {
    return 'local';
  }
  if (booleanFlag(args, 'via-service')) return 'service';
  return (await probeLocalService(loaded)) ? 'service' : 'local';
}

async function runCaptureViaService(
  args: CliArgs,
  loaded: LoadedCliConfig,
  draft: SelectionDraft | undefined,
  bundleIdInput: string | undefined,
  client: CliServiceClient,
) {
  const baseDraft = draft ?? (await loadDraft(args));
  const acceptedWarningIds = [
    ...new Set([
      ...baseDraft.acceptedWarningIds,
      ...flags(args, 'accept-warning'),
    ]),
  ].sort();
  const effectiveDraft = SelectionDraft.parse({
    ...baseDraft,
    acceptedWarningIds,
  });
  const stored = await client.createPreflight(effectiveDraft);
  if (!stored.result.ready) {
    throw new V2ContractError(
      'invalid-schema',
      `Warnings must be accepted individually: ${stored.result.unacceptedWarningIds.join(', ')}.`,
    );
  }
  const bundleId =
    bundleIdInput ?? flag(args, 'bundle') ?? generateOperationalId('bundle');
  const accepted = await client.createJob({
    preflightId: stored.preflightId,
    acceptedWarningIds,
    bundleId,
  });
  const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted']);
  let job = accepted.job;
  for (let attempt = 0; attempt < 3_600; attempt += 1) {
    if (terminal.has(job.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
    job = await client.getJob(job.jobId);
  }
  if (!terminal.has(job.status)) {
    throw new Error(`Capture Job ${job.jobId} did not finish in time.`);
  }
  if (!job.runId) {
    throw new V2ContractError(
      'unknown-reference',
      `Capture Job ${job.jobId} ended as ${job.status} without a Run.`,
    );
  }
  const store = await openStore(loaded, true);
  try {
    const run = await store.getRun(job.bundleId, job.runId);
    if (!run) {
      throw new V2ContractError('unknown-reference', 'Run does not exist.');
    }
    const details = await client.getBundle(job.bundleId);
    const snapshot = details.activeSnapshot;
    if (snapshot.sourceRunId !== job.runId) {
      throw new V2ContractError(
        'unknown-reference',
        `Active Snapshot ${snapshot.snapshotId} was not produced by Run ${job.runId}.`,
      );
    }
    return {
      run,
      snapshot,
      jobId: job.jobId,
      storedBlobIds: details.blobs.map((blob) => blob.blobId),
    };
  } finally {
    await store.close();
  }
}

async function runCapture(
  args: CliArgs,
  loaded: LoadedCliConfig,
  draft?: SelectionDraft,
  bundleIdInput?: string,
) {
  const mode = await resolveWriterMode(args, loaded);
  if (mode === 'service') {
    const client = await connectLocalService(loaded);
    return runCaptureViaService(args, loaded, draft, bundleIdInput, client);
  }
  const preflight = await resolvePreflight(args, loaded, draft);
  if (!preflight.ready) {
    throw new V2ContractError(
      'invalid-schema',
      `Warnings must be accepted individually: ${preflight.unacceptedWarningIds.join(', ')}.`,
    );
  }
  if (
    flag(args, 'screenshot') &&
    preflight.selection.cases.some(
      (selected) =>
        selected.captureScope.evidenceInputMode !== 'screenshot-only',
    )
  ) {
    throw new V2ContractError(
      'invalid-schema',
      '--screenshot requires every selected Case to use screenshot-only evidenceInputMode.',
    );
  }
  const store = await openStore(loaded);
  try {
    const bundleId = BundleId.parse(
      bundleIdInput ?? flag(args, 'bundle') ?? generateOperationalId('bundle'),
    );
    const host = new CaptureJobHost();
    const accepted = await host.accept({
      store,
      bundleId,
      preflight,
      runtimeBaseUrl: loaded.value.runtime.baseUrl,
      driver: await captureDriver(args),
    });
    return await accepted.completion;
  } finally {
    await store.close();
  }
}

async function captureCommand(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const result = await runCapture(args, loaded);
  emit(
    io,
    booleanFlag(args, 'json'),
    result,
    `Captured ${result.run.coverage.counts.captured}, reused ${result.run.coverage.counts.reused}, failed ${result.run.coverage.counts.failed}. Snapshot ${result.snapshot.snapshotId}.`,
  );
  return exitForRun(result.run);
}

async function jobStatus(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded, true);
  try {
    const job = await store.getJob(JobId.parse(requiredFlag(args, 'job')));
    if (!job)
      throw new V2ContractError('unknown-reference', 'Job does not exist.');
    emit(io, booleanFlag(args, 'json'), job);
    return job.status === 'cancelled'
      ? EXIT.cancelled
      : job.status === 'interrupted'
        ? EXIT.interrupted
        : job.status === 'failed'
          ? EXIT.failed
          : EXIT.ok;
  } finally {
    await store.close();
  }
}

async function jobCancel(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const mode = await resolveWriterMode(args, loaded);
  if (mode === 'service') {
    const client = await connectLocalService(loaded);
    const job = await client.cancelJob(requiredFlag(args, 'job'));
    emit(io, booleanFlag(args, 'json'), job);
    return EXIT.cancelled;
  }
  const store = await openStore(loaded);
  try {
    const job = await new CaptureJobHost().cancel(
      store,
      JobId.parse(requiredFlag(args, 'job')),
    );
    emit(io, booleanFlag(args, 'json'), job);
    return EXIT.cancelled;
  } finally {
    await store.close();
  }
}

async function jobRetry(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded, true);
  let draft: SelectionDraft;
  let bundleId: string;
  try {
    const job = await store.getJob(JobId.parse(requiredFlag(args, 'job')));
    if (!job)
      throw new V2ContractError('unknown-reference', 'Job does not exist.');
    const run = job.runId
      ? await store.getRun(job.bundleId, job.runId)
      : undefined;
    const retryIds = new Set(
      run?.attempts
        .filter((attempt) =>
          ['failed', 'unsupported', 'cancelled', 'interrupted'].includes(
            attempt.result,
          ),
        )
        .map((attempt) => attempt.caseId) ?? [],
    );
    const selected =
      retryIds.size > 0
        ? job.selection.cases.filter((item) => retryIds.has(item.caseId))
        : job.selection.cases;
    draft = selectionDraftFromSelectedCases(
      job.selection.prototypeId,
      selected,
    );
    bundleId = job.bundleId;
  } finally {
    await store.close();
  }
  const result = await runCapture(args, loaded, draft, bundleId);
  emit(io, booleanFlag(args, 'json'), result);
  return exitForRun(result.run);
}

async function bundleList(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded, true);
  try {
    const bundles = await Promise.all(
      (await store.listBundles()).map(async (bundle) => ({
        ...bundle,
        activeSnapshotId: (await store.getActiveSnapshot(bundle.bundleId))
          ?.snapshotId,
      })),
    );
    emit(io, booleanFlag(args, 'json'), { bundles });
    return EXIT.ok;
  } finally {
    await store.close();
  }
}

async function evidenceDetails(
  loaded: LoadedCliConfig,
  bundleIdInput: string,
  snapshotIdInput?: string,
) {
  const store = await openStore(loaded, true);
  try {
    const bundleId = BundleId.parse(bundleIdInput);
    const snapshot = snapshotIdInput
      ? await store.getSnapshot(bundleId, SnapshotId.parse(snapshotIdInput))
      : await store.getActiveSnapshot(bundleId);
    if (!snapshot)
      throw new V2ContractError(
        'unknown-reference',
        'Snapshot does not exist.',
      );
    const activeRevisionIds = new Set(
      snapshot.activeSlots.map((slot) => slot.revisionId),
    );
    return buildEvidenceReadModel({
      snapshot,
      runs: await store.listRuns(bundleId),
      revisions: (await store.listEvidenceRevisions(bundleId)).filter(
        (revision) => activeRevisionIds.has(revision.revisionId),
      ),
      blobs: await store.listBlobRecords(bundleId),
    });
  } finally {
    await store.close();
  }
}

async function bundleInspect(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const details = await evidenceDetails(loaded, requiredFlag(args, 'bundle'));
  emit(io, booleanFlag(args, 'json'), details);
  return details.coverageStatus === 'partial' ? EXIT.partial : EXIT.ok;
}

async function snapshotInspect(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const details = await evidenceDetails(
    loaded,
    requiredFlag(args, 'bundle'),
    requiredFlag(args, 'snapshot'),
  );
  emit(io, booleanFlag(args, 'json'), details);
  return details.coverageStatus === 'partial' ? EXIT.partial : EXIT.ok;
}

async function runInspect(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded, true);
  try {
    const run = await store.getRun(
      BundleId.parse(requiredFlag(args, 'bundle')),
      RunId.parse(requiredFlag(args, 'run')),
    );
    if (!run)
      throw new V2ContractError('unknown-reference', 'Run does not exist.');
    emit(io, booleanFlag(args, 'json'), run);
    return exitForRun(run);
  } finally {
    await store.close();
  }
}

async function caseInspect(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const details = await evidenceDetails(
    loaded,
    requiredFlag(args, 'bundle'),
    requiredFlag(args, 'snapshot'),
  );
  const selected = details.screens
    .flatMap((screen) => screen.cases)
    .filter((item) => item.caseId === requiredFlag(args, 'case'));
  if (selected.length === 0) {
    throw new V2ContractError(
      'unknown-reference',
      'Case is not active in Snapshot.',
    );
  }
  emit(io, booleanFlag(args, 'json'), { cases: selected });
  return selected.some(
    (item) => item.unknownCount > 0 || item.conflictCount > 0,
  )
    ? EXIT.partial
    : EXIT.ok;
}

async function bundleFork(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded);
  try {
    const result = await store.forkBundle({
      sourceBundleId: BundleId.parse(requiredFlag(args, 'bundle')),
      sourceSnapshotId: SnapshotId.parse(requiredFlag(args, 'snapshot')),
      bundleId: BundleId.parse(
        flag(args, 'new-bundle') ?? generateOperationalId('bundle'),
      ),
    });
    emit(io, booleanFlag(args, 'json'), result);
    return EXIT.ok;
  } finally {
    await store.close();
  }
}

async function bundleArchive(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded);
  try {
    emit(
      io,
      booleanFlag(args, 'json'),
      await store.archiveBundle(BundleId.parse(requiredFlag(args, 'bundle'))),
    );
    return EXIT.ok;
  } finally {
    await store.close();
  }
}

async function bundleClean(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded);
  try {
    const plan = await store.planClean({
      retainArchivedSnapshots:
        numberFlag(args, 'retain-archived-snapshots') ??
        loaded.value.store.retainArchivedSnapshots,
    });
    if (!booleanFlag(args, 'apply')) {
      emit(io, booleanFlag(args, 'json'), { plan, applied: false });
      return EXIT.ok;
    }
    const result = await store.applyClean(plan);
    emit(io, booleanFlag(args, 'json'), { plan, result, applied: true });
    return EXIT.ok;
  } finally {
    await store.close();
  }
}

async function activeCasesForSnapshot(
  store: LocalFileStore,
  bundleId: BundleId,
  snapshotId: SnapshotId,
): Promise<{
  snapshot: NonNullable<Awaited<ReturnType<LocalFileStore['getSnapshot']>>>;
  cases: SelectedCase[];
}> {
  const snapshot = await store.getSnapshot(bundleId, snapshotId);
  if (!snapshot)
    throw new V2ContractError('unknown-reference', 'Snapshot does not exist.');
  const activeKeys = new Set(
    snapshot.activeSlots.map((slot) => `${slot.caseId}/${slot.scopeKey}`),
  );
  const selectedByIdentity = new Map(
    (await store.listRuns(bundleId))
      .flatMap((run) => run.selection.cases)
      .map(
        (selected) =>
          [
            `${selected.caseId}/${computeScopeKey(selected.captureScope)}`,
            selected,
          ] as const,
      ),
  );
  const resolved = snapshot.activeSlots
    .map((slot) => selectedByIdentity.get(`${slot.caseId}/${slot.scopeKey}`))
    .filter((selected): selected is SelectedCase => Boolean(selected));
  if (resolved.length !== activeKeys.size) {
    throw new V2ContractError(
      'unknown-reference',
      'Snapshot active Cases cannot be reconstructed.',
    );
  }
  return { snapshot, cases: resolved };
}

async function createCurrentStaleness(
  args: CliArgs,
  loaded: LoadedCliConfig,
  store: LocalFileStore,
  bundleId: BundleId,
  snapshotId: SnapshotId,
) {
  const { cases } = await activeCasesForSnapshot(store, bundleId, snapshotId);
  const bundle = await store.getBundle(bundleId);
  if (!bundle)
    throw new V2ContractError('unknown-reference', 'Bundle does not exist.');
  const draft = selectionDraftFromSelectedCases(bundle.prototypeId, cases);
  const current = await resolvePreflight(args, loaded, draft);
  const currentDependencyDigests: Record<string, string> = {
    [`manifest:${bundle.prototypeId}`]: current.manifestDigest,
  };
  for (const selected of cases) {
    currentDependencyDigests[`runtime:${selected.caseKey.screenId}`] =
      current.inputVersion;
  }
  const report = await store.createStalenessReport({
    bundleId,
    snapshotId,
    inputVersion: current.inputVersion,
    currentDependencyDigests,
  });
  return { report, currentInputVersion: current.inputVersion, cases };
}

async function staleCheck(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const store = await openStore(loaded);
  try {
    const result = await createCurrentStaleness(
      args,
      loaded,
      store,
      BundleId.parse(requiredFlag(args, 'bundle')),
      SnapshotId.parse(requiredFlag(args, 'snapshot')),
    );
    emit(io, booleanFlag(args, 'json'), result.report);
    return result.report.perRevision.some((entry) => entry.stale)
      ? EXIT.stale
      : EXIT.ok;
  } finally {
    await store.close();
  }
}

async function handoffCreate(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const bundleId = BundleId.parse(requiredFlag(args, 'bundle'));
  const snapshotId = SnapshotId.parse(requiredFlag(args, 'snapshot'));
  const implementationIntent = flag(args, 'intent');
  const acknowledgedRiskKinds = flags(args, 'ack-risk').map((kind) =>
    RiskKind.parse(kind),
  );
  const mode = await resolveWriterMode(args, loaded);
  if (mode === 'service') {
    const client = await connectLocalService(loaded);
    const handoff = await client.createHandoff({
      bundleId,
      snapshotId,
      ...(implementationIntent ? { implementationIntent } : {}),
      acknowledgedRiskKinds,
    });
    emit(io, booleanFlag(args, 'json'), handoff);
    return handoff.coverageStatus === 'partial'
      ? EXIT.partial
      : handoff.freshnessStatus === 'stale'
        ? EXIT.stale
        : EXIT.ok;
  }
  const store = await openStore(loaded);
  try {
    const current = await createCurrentStaleness(
      args,
      loaded,
      store,
      bundleId,
      snapshotId,
    );
    const handoff = await createAgentHandoff({
      store,
      bundleId,
      snapshotId,
      selectedCases: current.cases,
      stalenessReport: current.report,
      currentInputVersion: current.currentInputVersion,
      ...(implementationIntent ? { implementationIntent } : {}),
      acknowledgedRiskKinds,
    });
    emit(io, booleanFlag(args, 'json'), handoff);
    return handoff.coverageStatus === 'partial'
      ? EXIT.partial
      : handoff.freshnessStatus === 'stale'
        ? EXIT.stale
        : EXIT.ok;
  } finally {
    await store.close();
  }
}

async function getHandoff(
  loaded: LoadedCliConfig,
  handoffIdInput: string,
): Promise<AgentHandoff> {
  const store = await openStore(loaded, true);
  try {
    const handoff = await store.getHandoff(HandoffId.parse(handoffIdInput));
    if (!handoff)
      throw new V2ContractError('unknown-reference', 'Handoff does not exist.');
    return handoff;
  } finally {
    await store.close();
  }
}

async function handoffShow(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const handoff = await getHandoff(loaded, requiredFlag(args, 'handoff'));
  emit(io, booleanFlag(args, 'json'), handoff);
  return handoff.coverageStatus === 'partial'
    ? EXIT.partial
    : handoff.freshnessStatus === 'stale'
      ? EXIT.stale
      : EXIT.ok;
}

async function handoffExport(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const handoff = await getHandoff(loaded, requiredFlag(args, 'handoff'));
  const outputPath = path.resolve(io.cwd, requiredFlag(args, 'output'));
  await writeFile(outputPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  emit(io, booleanFlag(args, 'json'), {
    handoffId: handoff.handoffId,
    outputPath,
  });
  return EXIT.ok;
}

async function serviceStart(
  args: CliArgs,
  io: CliIo,
  loaded: LoadedCliConfig,
): Promise<number> {
  const config = loaded.value;
  const allowedOrigins =
    config.service.allowedOrigins.length > 0
      ? config.service.allowedOrigins
      : config.runtime.allowedOrigins;
  if (allowedOrigins.length === 0) {
    throw new V2ContractError(
      'invalid-schema',
      'service.allowedOrigins must contain at least one explicit local origin.',
    );
  }
  const service = new ProtoBridgeLocalService({
    host: config.service.host,
    port: config.service.port,
    allowedOrigins,
    runtimeBaseUrl: config.runtime.baseUrl,
    storeRoot: loaded.storeRoot,
    workspaceId: config.workspaceId,
    maxCases: config.capture.maxCases,
    ...(config.store.maxBytes === undefined
      ? {}
      : { maxStoreBytes: config.store.maxBytes }),
  });
  const address = await service.start();
  emit(
    io,
    booleanFlag(args, 'json'),
    { address, workspaceId: config.workspaceId },
    `ProtoBridge V2 Local Service listening on http://${address.host}:${address.port}`,
  );
  await new Promise<void>((resolve) => {
    const shutdown = () => {
      void service.close().finally(resolve);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
  return EXIT.ok;
}

async function openStore(
  loaded: LoadedCliConfig,
  readOnly = false,
): Promise<LocalFileStore> {
  const store = new LocalFileStore({
    root: loaded.storeRoot,
    workspaceId: WorkspaceId.parse(loaded.value.workspaceId),
    readOnly,
    ...(loaded.value.store.maxBytes === undefined
      ? {}
      : { maxBytes: loaded.value.store.maxBytes }),
  });
  try {
    await store.init();
  } catch (error) {
    if (
      error instanceof V2ContractError &&
      error.code === 'writer-lock-held' &&
      !readOnly
    ) {
      const service = loaded.value.service;
      throw new V2ContractError(
        'writer-lock-held',
        `${error.message} Local Service at ${service.host}:${service.port} likely holds the Store while pnpm pb:up is running. Use a read-only command, stop the Service, or let this command route through Local Service automatically.`,
      );
    }
    throw error;
  }
  return store;
}

function exitForRun(run: {
  terminationReason: string;
  coverage: {
    counts: { failed: number; unsupported: number; missing: number };
  };
}): number {
  if (run.terminationReason === 'cancelled') return EXIT.cancelled;
  if (run.terminationReason === 'interrupted') return EXIT.interrupted;
  if (run.terminationReason === 'failed') return EXIT.failed;
  return run.coverage.counts.failed > 0 ||
    run.coverage.counts.unsupported > 0 ||
    run.coverage.counts.missing > 0
    ? EXIT.partial
    : EXIT.ok;
}

export function cliUsage(): string {
  return `Usage:
  proto-bridge workspace init [--config <file>]
  proto-bridge workspace doctor [--json]
  proto-bridge workspace doctor repair [--json]
  proto-bridge workspace reset [--apply --plan-id <id> --generation <id>] [--json]
  proto-bridge workspace reinitialize --confirm-destroyed <workspaceId> [--json]
  proto-bridge preflight --selection <file> [--manifest <file>]
  proto-bridge capture run --selection <file> [--bundle <id>]
  proto-bridge deliver (--selection <file> | --prototype <id> [--screen <id|slug>]) [--target <dir>]
  proto-bridge deliver --bundle <id> --snapshot <id> [--ack-risk <kind>] [--target <dir>]
  proto-bridge job status|cancel|retry --job <id>
  proto-bridge bundle list|inspect|fork|archive|clean
  proto-bridge snapshot|run|case inspect
  proto-bridge stale check --bundle <id> --snapshot <id>
  proto-bridge handoff create|show|export
  proto-bridge service start

Rules:
  --config defaults to ./proto-bridge.json.
  deliver captures, creates a Handoff, and writes .proto-bridge/deliveries/*/agent-prompt.md
  (Store index only; MCP still reads Evidence from the Store).
  deliver defaults to all authored Screens, Variants and Scenarios in scope.
  workspace reset previews by default; --apply requires the preview planId and generation,
  clears Store + deliveries + unexported reviews, preserves config/audit, and creates a new generation.
  With --screen, repeat --only-variant <id> or --only-scenario <id> to narrow.
  Use --selection for an exact multi-Screen matrix.
  Repeat --accept-warning <id> and --ack-risk <kind> explicitly.
  --force is intentionally unsupported.
  Write commands auto-route through Local Service when it is reachable
  (pnpm pb:up). Pass --local-store to force a local writer, or --via-service
  to require the Service.
  Add --json for stable automation output.`;
}

export { EXIT as CLI_EXIT_CODES };
