import { Location, Position, Range } from "vscode-languageserver";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { getSymbolConfig } from "../resource/symbolConfig.js";
import { DataRange, FileInfo, ResolvedData, ResolvedSymbol, RunescriptSymbol, SymbolConfig } from "../types.js";
import { buildSymbolFromRef } from "./symbolBuilder.js";
import { getFileCache } from "../cache/cacheManager.js";

/**
 * Binary search to find the match of a data range list at the index provided, if there is one
 * @param index Index of the item you are looking for
 * @param items List of the DataRanges which hold the data being retrieved
 * @returns The data of the DataRange, if a match is found
 */
export function findMatchInRange<T>(index: number, items?: DataRange<T>[]): DataRange<T> | undefined {
  if (!items) return undefined;
  let lo = 0;
  let hi = items.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const item = items[mid];
    if (index < item.start) hi = mid - 1;
    else if (index > item.end) lo = mid + 1;
    else return item;
  }
  return undefined;
}

export function buildLocation(start: number, end: number, line: number, uri: string): Location {
  return Location.create(uri, buildRange(start, end, line));
}

export function buildRange(start: number, end: number, line: number): Range {
  return Range.create(buildPosition(start, line), buildPosition(end, line));
}

export function buildPosition(index: number, line: number): Position {
  return Position.create(line, index);
}

export function resolveAtHandlerPosition(position: Position, fileInfo: FileInfo): DataRange<ResolvedSymbol> | undefined {
  const fileCache = getFileCache(fileInfo.workspace, fileInfo.fsPath);
  if (!fileCache) return undefined;
  const resolvedDataRange = fileCache.getAtPosition(position);
  if (!resolvedDataRange) return undefined;
  return resolvedDataRange;
}

export function resolveRefDataRange(symbolType: SymbolType, start: number, end: number, line: number, name: string, fileType: string, context?: Record<string, any>) {
  const symbolConfig = getSymbolConfig(symbolType);
  if (symbolConfig.cache) {
    return dataRangeFromRef(start, end, line, symbolConfig, name, context);
  } else {
    return dataRangeFromSymbol(start, end, line, buildSymbolFromRef(name, symbolType, fileType), false, context);
  }
}

export function resolveDefDataRange(start: number, end: number, line: number, symbol: RunescriptSymbol, declaration: boolean, context?: Record<string, any>): DataRange<ResolvedData> {
  return dataRangeFromSymbol(start, end, line, symbol, declaration, context);
}


function dataRangeFromRef(start: number, end: number, line: number, symbolConfig: SymbolConfig, name: string, context?: Record<string, any>): DataRange<ResolvedData> {
  return { 
    start,
    end,
    data: { 
      declaration: false,
      symbolConfig,
      line,
      name,
      id: context?.id,
      context
    }
  };
}

function dataRangeFromSymbol(start: number, end: number, line: number, symbol: RunescriptSymbol, declaration: boolean, context?: Record<string, any>): DataRange<ResolvedData> {
  return { 
    start, 
    end,
    data: { 
      declaration,
      symbolConfig: getSymbolConfig(symbol.symbolType),
      line,
      symbol,
      context
    }
  };
}
