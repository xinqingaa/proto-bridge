import type { JsonObject, MigrationContext } from '../types.js';
import { dedupe } from '../utils/args.js';

export function buildMigrationBrief(context: MigrationContext): JsonObject {
  const plan = context.recommendations.implementationPlan;
  return {
    page: {
      title: context.source.title ?? context.source.label ?? context.source.name,
      route: context.source.route,
      screenId: context.source.screenId,
      sourceModule: context.source.module,
      vuePath: context.source.vueRelativePath ?? context.source.vuePath,
      notesPath: context.source.notesPath,
      i18nPath: context.source.i18nPath,
    },
    target: {
      suggestedModule: context.target.suggestedModule,
      routesFiles: context.target.routesFiles,
      translationFiles: context.target.translationFiles,
      assetDirectories: context.target.assetDirectories,
      reusableWidgets: context.target.reusableWidgets,
      similarFiles: context.target.similarFiles.slice(0, 12),
    },
    implementation: {
      shape: context.recommendations.implementationShape,
      complexity: plan.complexity,
      summary: plan.summary,
      fileTree: plan.fileTree,
      widgetTree: plan.widgetTree,
      stateStrategy: plan.stateStrategy,
      controllerBoundaries: plan.controllerBoundaries,
      widgetContracts: plan.widgetContracts,
      doNotTranslate: plan.doNotTranslate,
    } as unknown as JsonObject,
    quality: {
      checklist: plan.checklist,
      risks: context.recommendations.risks,
      manualQuestions: context.recommendations.manualQuestions,
      unresolvedTokenCount: context.tokenMap.unresolved.length,
      warnings: dedupe([
        ...context.source.warnings,
        ...context.target.warnings,
        ...(context.capture?.warnings ?? []),
      ]),
    } as unknown as JsonObject,
  };
}
