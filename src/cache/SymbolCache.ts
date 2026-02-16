import { SymbolType } from "../resource/enum/symbolTypes.js";
import { getSymbolConfig } from "../resource/symbolConfig.js";
import { SymbolKey, RunescriptSymbol, FileKey, FileSymbols } from "../types.js";
import { decodeReference, resolveSymbolKey } from "../utils/cacheUtils.js";
import { addReference, buildSymbolFromRef } from "../utils/symbolBuilder.js";
import { CompletionCache } from "./CompletionCache.js";

export class SymbolCache {
  /**
  * The symbolCache stores all resolved symbols in the workspace
  * key = symbol name + SymbolType, value = RunescriptSymbol
  */
  private readonly symbolCache = new Map<SymbolKey, RunescriptSymbol>();

  /**
   * The fileToSymbolMap keeps track of all symbol declarations and references within a particular file
   * This is used to more easily keep symbol references up to date when changes are made to files
   * key = file fsPath, value = stores the symbolKey for all decs/refs in the file
   */
  private readonly fileToSymbolMap = new Map<FileKey, FileSymbols>();

  /**
   * Holds all of the symbol names in a Trie (per symbol type) for quick code completions
   */
  private readonly completionCache = new CompletionCache();

  /**
   * Get the cached symbol using the symbol name and type
   * @param name Name of the symbol
   * @param symbolType type of the symbol
   * @returns symbol if found, undefined otherwise
   */
  get(name: string, symbolType: SymbolType): RunescriptSymbol | undefined {
    const key = resolveSymbolKey(name, symbolType);
    return key !== undefined ? this.symbolCache.get(key) : undefined;
  }

  /**
   * Get the cached symbol using the symbol key
   * @param key SymbolKey
   * @returns symbol if found, undefined otherwise
   */
  getByKey(key: SymbolKey): RunescriptSymbol | undefined {
    return this.symbolCache.get(key);
  }

  /**
   * Put (declaration) symbol into the cache
   * @param symbol the symbol to insert
   * @param fsPath the fsPath of the file the symbol is defined in
   */
  put(symbol: RunescriptSymbol, fsPath: string): RunescriptSymbol | undefined {
    // This function is only for inserting definitions
    if (!symbol.declaration) {
      return undefined;
    }

    // Make sure cache keys resolve correctly
    const key = resolveSymbolKey(symbol.cacheName!, symbol.symbolType);
    const fileKey = fsPath as FileKey;

    // Retrieve current symbol from cache (if any)
    let currentSymbol: RunescriptSymbol | undefined = this.symbolCache.get(key);

    // If the current symbol in cache already is the declaration, don't overwrite 
    if (currentSymbol?.declaration) {
      return currentSymbol;
    }

    if (!currentSymbol) {
      currentSymbol = symbol;
    }

    // New declaration, so copy over all the potentially new data to the existing symbol ref
    if (!currentSymbol.declaration) {
      currentSymbol.declaration = symbol.declaration;
      currentSymbol.block = symbol.block;
      currentSymbol.info = symbol.info;
      currentSymbol.value = symbol.value;
      currentSymbol.extraData = symbol.extraData;
      currentSymbol.comparisonTypes = symbol.comparisonTypes;
      currentSymbol.signature = symbol.signature;
      currentSymbol.dynamicConfigTypes = symbol.dynamicConfigTypes;
      currentSymbol.configLines = symbol.configLines;
    }
    currentSymbol.cacheName = symbol.cacheName;

    this.symbolCache.set(key, currentSymbol);

    // Add the declarartion to the file map 
    this.addToFileMap(fileKey, key, true);

    // Add the symbol name to the completion cache
    this.completionCache.put(currentSymbol.name, currentSymbol.symbolType);

    // Also insert the declaration as a reference 
    const ref = decodeReference(currentSymbol.declaration.ref);
    if (ref) {
      const { line, start, end } = ref;
      this.putReference(currentSymbol.cacheName!, currentSymbol.symbolType, fsPath, currentSymbol.fileType ?? 'rs2', line, start, end);
    }

    // Return the symbol
    return currentSymbol;
  }

  /**
   * Put (reference) symbol into the cache. Adds a reference if symbol already exists, creates it if not. 
   * @param name symbol name
   * @param symbolType symbol type for this reference
   * @param fsPath file fsPath the reference is found in
   * @param fileType file type the reference is found in
   * @param lineNum line number within the file the reference is found on
   * @param startIndex the index within the line where the reference word starts
   * @param endIndex the index within the line where the reference word ends
   */
  putReference(name: string, symbolType: SymbolType, fsPath: string, fileType: string, lineNum: number, startIndex: number, endIndex: number, id?: string, extraData?: Record<string, any>): RunescriptSymbol {
    // Make sure cache keys resolve correctly
    const key = resolveSymbolKey(name, symbolType);
    const fileKey = fsPath as FileKey;

    // If the symbol doesn't yet exist in the cache, build it
    if (!this.symbolCache.has(key)) {
      this.symbolCache.set(key, buildSymbolFromRef(name, symbolType, fileType, extraData));
    }

    // Get the current references for this identifier in the current file (if any) and add this new reference
    const currentSymbol = this.symbolCache.get(key)!;
    addReference(currentSymbol, fileKey, lineNum, startIndex, endIndex, id);

    // Add the reference to the file map
    this.addToFileMap(fileKey, key, false);

    // If the matchType of this identifier is reference only, add the data to the completion cache (others will get added when the declaration is added)
    const symbolConfig = getSymbolConfig(symbolType);
    if (symbolConfig?.referenceOnly) this.completionCache.put(name, symbolType);
    if (symbolConfig?.cache) currentSymbol.cacheName = name;
    return currentSymbol;
  }

  /**
   * Clears the identifier cache and relevant supporting caches
   */
  clearAll(): void {
    this.symbolCache.clear();
    this.fileToSymbolMap.clear();
    this.completionCache.clear();
  }

  /**
   * Clears out all references and declarations from the cache of a given file
   * @param fsPath The file URI to clear out of the cache
   */
  clearFile(fsPath: string): void {
    const fileKey = fsPath as FileKey;

    // Get the identifiers in the file
    const symbolsInFile = this.fileToSymbolMap.get(fileKey) || { declarations: new Set(), references: new Set() };

    // Iterate thru the references in the file
    symbolsInFile.references.forEach((key) => {
      const symbol = this.symbolCache.get(key);
      if (symbol) {
        // Delete references to the cleared file from every identifier which referenced the file
        if (symbol.references[fileKey]) {
          delete symbol.references[fileKey];
        }
        // Cleanup/Delete identifiers without a declaration who no longer have any references
        if (Object.keys(symbol.references).length === 0 && !symbol.declaration) {
          if (symbol.symbolType) this.completionCache.remove(symbol.name, symbol.symbolType);
          this.symbolCache.delete(key);
        }
      }
    });

    // Iterate thru the declarations in the file
    symbolsInFile.declarations.forEach((key) => {
      const symbol = this.symbolCache.get(key);
      if (symbol) {
        // If the identifier has orphaned references, then we only delete the declaration and keep the identifier w/references
        // Otherwise, we delete the entire identifier (no declaration and no references => no longer exists in any capacity)
        if (symbol.symbolType) this.completionCache.remove(symbol.name, symbol.symbolType);
        const hasOrphanedRefs = Object.keys(symbol.references).length > 0;
        if (hasOrphanedRefs) {
          delete symbol.declaration;
        } else {
          this.symbolCache.delete(key);
        }
      }
    });

    // Remove the entry for the file from the fileToIdentifierMap
    this.fileToSymbolMap.delete(fileKey);
  }

  /**
   * Update the fileMap with the file of a new identifier declared or referenced within said file
   * @param fileKey fileKey where this identifier declaration or reference is found
   * @param symbolKey identifierKey of this identifier 
   * @param declaration boolean: true if inserting a declaration, false if inserting a reference
   */
  private addToFileMap(fileKey: FileKey, symbolKey: SymbolKey, declaration = true): void {
    // Get the current identifiers in a file, or a new default empty set for both declarations and reference if nothing exists
    const symbolsInFile = this.fileToSymbolMap.get(fileKey) || { declarations: new Set(), references: new Set() };

    // If we are inserting a declaration update declaration identifiers, else update reference identifiers of the file
    (declaration) ? symbolsInFile.declarations.add(symbolKey) : symbolsInFile.references.add(symbolKey);

    // Update the cache with the new data
    this.fileToSymbolMap.set(fileKey, symbolsInFile);
  }

  getCompletionCache(): CompletionCache {
    return this.completionCache;
  }

  getFileSymbols(fsPath: string): FileSymbols {
    return this.fileToSymbolMap.get(fsPath) ?? { declarations: new Set(), references: new Set() };
  }

  /**
   * Return all of the cache keys in the identifier cache, used for the export cache keys debug command
   * @returns cache keys
   */
  getCacheKeys(): string[] {
    return Array.from(this.symbolCache.keys()).sort();
  }

  getCacheKeyCount(identifiers = true): number {
    return identifiers ? this.symbolCache.size : this.fileToSymbolMap.size;
  }

  getTotalReferences(): number {
    let total = 0;
    for (const symbol of this.symbolCache.values()) {
      for (const references of Object.values(symbol.references ?? {})) {
        total += references.size;
      }
    }
    return total;
  }

  getFileIdentifiers(fsPath: string): FileSymbols | undefined {
    return this.fileToSymbolMap.get(fsPath);
  }
}
