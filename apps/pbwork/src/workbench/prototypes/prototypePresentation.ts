import type { PrototypeRecord } from "@/design-system/types";

export type StageAtmosphere = {
  ground: string;
  glow: string;
  mist: string;
  ink: string;
  muted: string;
  orbit: string;
};

type PrototypePresentation = {
  shortLabel: string;
  summary: string;
  atmosphere: StageAtmosphere;
};

const FALLBACK_ATMOSPHERE: StageAtmosphere = {
  ground: "#16181c",
  glow: "rgba(160, 170, 186, 0.22)",
  mist: "rgba(200, 208, 220, 0.08)",
  ink: "#f4f6f8",
  muted: "rgba(244, 246, 248, 0.54)",
  orbit: "rgba(244, 246, 248, 0.08)",
};

const PRESENTATION: Record<string, PrototypePresentation> = {
  hengdong: {
    shortLabel: "恒动",
    summary: "健身自律",
    atmosphere: {
      ground: "#2a1810",
      glow: "rgba(232, 132, 64, 0.58)",
      mist: "rgba(255, 196, 140, 0.22)",
      ink: "#fff3e8",
      muted: "rgba(255, 243, 232, 0.62)",
      orbit: "rgba(255, 196, 140, 0.16)",
    },
  },
  "cold-chain-ops": {
    shortLabel: "冷链",
    summary: "冷链值守",
    atmosphere: {
      ground: "#071824",
      glow: "rgba(64, 176, 230, 0.55)",
      mist: "rgba(120, 200, 255, 0.22)",
      ink: "#eef8ff",
      muted: "rgba(238, 248, 255, 0.62)",
      orbit: "rgba(120, 200, 255, 0.16)",
    },
  },
};

export function prototypeShortLabel(
  prototype: Pick<PrototypeRecord, "id" | "label">,
): string {
  return (
    PRESENTATION[prototype.id]?.shortLabel ??
    prototype.label.split("·")[0]?.trim() ??
    prototype.label
  );
}

export function prototypeSummary(
  prototype: Pick<PrototypeRecord, "id" | "roles">,
): string {
  return PRESENTATION[prototype.id]?.summary ?? prototype.roles?.[0] ?? "";
}

export function prototypeAtmosphere(prototypeId: string): StageAtmosphere {
  return PRESENTATION[prototypeId]?.atmosphere ?? FALLBACK_ATMOSPHERE;
}

export function atmosphereStyle(
  prototypeId: string,
): Record<string, string> {
  const atmosphere = prototypeAtmosphere(prototypeId);
  return {
    "--stage-ground": atmosphere.ground,
    "--stage-glow": atmosphere.glow,
    "--stage-mist": atmosphere.mist,
    "--stage-ink": atmosphere.ink,
    "--stage-muted": atmosphere.muted,
    "--stage-orbit": atmosphere.orbit,
  };
}
