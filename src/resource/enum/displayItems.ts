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

export function getDeclarationDisplayItems(symbolType: SymbolType): Set<DisplayItem> {
  return new Set(getSymbolConfig(symbolType)?.hoverConfig?.declarationItems ?? []);
}

export function getReferenceDisplayItems(symbolType: SymbolType): Set<DisplayItem> {
  return new Set(getSymbolConfig(symbolType)?.hoverConfig?.referenceItems ?? []);
}

export function getDisplayLanguage(symbolType: SymbolType): Language {
  return getSymbolConfig(symbolType)?.hoverConfig?.language ?? Language.Runescript;
}

export function getConfigInclusions(symbolType: SymbolType): string[] | undefined {
  return getSymbolConfig(symbolType)?.hoverConfig?.configInclusions ?? undefined;
}
