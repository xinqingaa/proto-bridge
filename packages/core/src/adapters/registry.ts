import type { SourceAdapter, TargetAdapter } from './types.js';
import { vue3PrototypeSourceAdapter } from '../source/vue3-prototype/adapter.js';
import { flutterAppTargetAdapter } from '../target/flutter-app/adapter.js';

export class AdapterRegistry {
  private readonly sourceAdapters = new Map<string, SourceAdapter>();
  private readonly targetAdapters = new Map<string, TargetAdapter>();

  registerSource(adapter: SourceAdapter): this {
    this.sourceAdapters.set(adapter.id, adapter);
    return this;
  }

  registerTarget(adapter: TargetAdapter): this {
    this.targetAdapters.set(adapter.id, adapter);
    return this;
  }

  getSource(id: string): SourceAdapter {
    const adapter = this.sourceAdapters.get(id);
    if (!adapter) throw new Error(`Unknown source adapter: ${id}`);
    return adapter;
  }

  getTarget(id: string): TargetAdapter {
    const adapter = this.targetAdapters.get(id);
    if (!adapter) throw new Error(`Unknown target adapter: ${id}`);
    return adapter;
  }
}

export function createDefaultAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry()
    .registerSource(vue3PrototypeSourceAdapter)
    .registerTarget(flutterAppTargetAdapter);
}

export const defaultAdapterRegistry = createDefaultAdapterRegistry();
