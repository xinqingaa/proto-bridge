import { defineStore } from "pinia";
import { loadComponentContract } from "@/design-system/loaders";
import type { ComponentRecord } from "@/design-system/types";
import { componentRecords } from "@/design-system/components/registry";

export const usePlaygroundStore = defineStore("playground", {
  state: () => ({
    componentId: null as string | null,
    props: {} as Record<string, unknown>,
  }),
  getters: {
    record(): ComponentRecord | undefined {
      return componentRecords.find((item) => item.id === this.componentId);
    },
  },
  actions: {
    open(componentId: string) {
      const record = componentRecords.find((item) => item.id === componentId);
      if (!record) return;
      this.componentId = componentId;
      const contract = loadComponentContract(record.contract);
      this.props = {
        ...(contract?.defaultProps ?? {}),
        ...record.example,
      };
    },
    setProp(key: string, value: unknown) {
      this.props = { ...this.props, [key]: value };
    },
    reset() {
      if (!this.componentId) return;
      this.open(this.componentId);
    },
  },
});
