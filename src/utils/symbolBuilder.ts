import { getDisplayLanguage } from "../resource/enum/displayItems.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { RunescriptSymbol } from "../types.js";
import { encodeReference, resolveSymbolKey } from "./cacheUtils.js";

export function buildFromReference(name: string, symbolType: SymbolType): RunescriptSymbol {
  const symbol: RunescriptSymbol = {
    name,
    symbolType,
    cacheKey: resolveSymbolKey(name, symbolType),
    fileType: '',
    language: getDisplayLanguage(symbolType),
    references: {}
  }
  return symbol;
}

export function addReference(symbol: RunescriptSymbol, fileKey: string, lineNum: number, startIndex: number, endIndex: number, id?: string): Set<string> {
  const fileReferences = symbol.references[fileKey] || new Set<string>();
  fileReferences.add(encodeReference(lineNum, startIndex, endIndex));
  if (id) {
    symbol.id = id;
  }
  return fileReferences;
}
