import { SymbolType } from "../resource/enum/symbolTypes.js";
import { uriToFileInfo } from "../utils/fileUtils.js";

/**
 * Cache of npc, loc, and obj id to name map. Used for quick lookups of ids in map files.
 */
const cache: Map<SymbolType, Map<string, string>> = new Map();

/**
 * The symbolTypes whose values are cached
 */
const cachedTypes: SymbolType[] = [SymbolType.Loc, SymbolType.Npc, SymbolType.Obj];

/**
 * Adds the name and id of a symbol type to the cache, if its one of the cached types
 */
export function add(symbolType: SymbolType, id: string, name: string): void {
  if (cachedTypes.includes(symbolType)) {
    cache.get(symbolType)!.set(id, name);
  }
}

/**
 * Returns the name of a symbolType given it's id
 */
export function get(symbolType: SymbolType, id: string): string | undefined {
  return cache.get(symbolType)?.get(id);
}

/**
 * Clears the cache of a particular symbolType (type is resolved from the pack file uri name)
 */
export function clear(uri: string): void {
  const fileInfo = uriToFileInfo(uri);
  if (fileInfo.type === 'pack' && cachedTypes.includes(fileInfo.name as SymbolType)) {
    cache.set(fileInfo.name as SymbolType, new Map());
  }
}

/**
 * Clears the entire cache
 */
export function clearAll(): void {
  cachedTypes.forEach(type => cache.set(type, new Map()));
}
