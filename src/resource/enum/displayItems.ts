import { getSymbolConfig } from "../symbolConfig.js";
import { Language } from "./languages.js";
import type { SymbolType } from "./symbolTypes.js";

export enum DisplayItem {
  Title = 'title',
  Info = 'info',
  Value = 'value',
  Signature = 'signature',
  Codeblock = 'codeblock',
}

export function getDeclarationDisplayItems(symbolType: SymbolType): DisplayItem[] {
  return getSymbolConfig(symbolType)?.hoverConfig?.declarationItems ?? [];
}

export function getReferenceDisplayItems(symbolType: SymbolType): DisplayItem[] {
  return getSymbolConfig(symbolType)?.hoverConfig?.referenceItems ?? [];
}

export function getDisplayLanguage(symbolType: SymbolType): Language {
  return getSymbolConfig(symbolType)?.hoverConfig?.language ?? Language.Runescript;
}

export function getBlockSkipLines(symbolType: SymbolType): number {
  return getSymbolConfig(symbolType)?.hoverConfig?.blockSkipLines ?? 1;
}

export function getConfigInclusions(symbolType: SymbolType): string[] | undefined {
  return getSymbolConfig(symbolType)?.hoverConfig?.configInclusions ?? undefined;
}

export function getAllDisplayItems(symbolType: SymbolType): Set<DisplayItem> {
  const displayItems = new Set<DisplayItem>();
  getDeclarationDisplayItems(symbolType).forEach(item => displayItems.add(item));
  getReferenceDisplayItems(symbolType).forEach(item => displayItems.add(item));
  return displayItems;
}
