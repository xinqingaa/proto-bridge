import type { Component } from "vue";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  FolderOpen,
  Home,
  Inbox,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Thermometer,
  User,
} from "lucide-vue-next";

/** Curated Lucide ids used by PBWork DS. Stable across Vue / Flutter sync. */
export const PB_ICON_NAMES = [
  "more",
  "plus",
  "search",
  "settings",
  "home",
  "list",
  "user",
  "inbox",
  "check",
  "chevron-down",
  "chevron-right",
  "alert-triangle",
  "alert-circle",
  "clock",
  "refresh-cw",
  "clipboard-check",
  "shield-check",
  "folder-open",
  "thermometer",
  "snowflake",
  "copy",
  "file-text",
  "sliders-horizontal",
] as const;

export type PbIconName = (typeof PB_ICON_NAMES)[number];

const ICON_MAP: Record<PbIconName, Component> = {
  more: MoreHorizontal,
  plus: Plus,
  search: Search,
  settings: Settings,
  home: Home,
  list: List,
  user: User,
  inbox: Inbox,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  clock: Clock3,
  "refresh-cw": RefreshCw,
  "clipboard-check": ClipboardCheck,
  "shield-check": ShieldCheck,
  "folder-open": FolderOpen,
  thermometer: Thermometer,
  snowflake: Snowflake,
  copy: Copy,
  "file-text": FileText,
  "sliders-horizontal": SlidersHorizontal,
};

export function resolvePbIcon(name: PbIconName | undefined): Component {
  return ICON_MAP[name ?? "more"] ?? MoreHorizontal;
}

export function isPbIconName(value: string): value is PbIconName {
  return (PB_ICON_NAMES as readonly string[]).includes(value);
}
