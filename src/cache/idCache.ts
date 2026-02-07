import { SymbolType } from "../resource/enum/symbolTypes.js";
import { uriToFileInfo } from "../utils/fileUtils.js";

/**
 * Cache of npc, loc, and obj id to name map. Used for quick lookups of ids in map files.
 */
export class IdCache {
  /**
   * The symbolTypes whose values are cached
   */
  private readonly cachedTypes = new Set<SymbolType>([SymbolType.Loc, SymbolType.Npc, SymbolType.Obj]);

  private readonly cache: Map<SymbolType, Map<string, string>> = new Map();

  constructor() {
    this.clearAll();
  }

  /**
   * Adds the name and id of a symbol type to the cache, if its one of the cached types
   */
  add(symbolType: SymbolType, id: string, name: string): void {
    if (this.cachedTypes.has(symbolType)) {
      this.cache.get(symbolType)!.set(id, name);
    }
  }

  /**
   * Returns the name of a symbolType given it's id
   */
  get(symbolType: SymbolType, id: string): string | undefined {
    return this.cache.get(symbolType)?.get(id);
  }

  /**
   * Clears the cache of a particular symbolType (type is resolved from the pack file uri name)
   */
  clear(uri: string): void {
    const fileInfo = uriToFileInfo(uri);
    if (fileInfo.type === "pack" && this.cachedTypes.has(fileInfo.name as SymbolType)) {
      this.cache.set(fileInfo.name as SymbolType, new Map());
    }
  }

  /**
   * Clears the entire cache
   */
  clearAll(): void {
    for (const type of this.cachedTypes) {
      this.cache.set(type, new Map());
    }
  }
}
