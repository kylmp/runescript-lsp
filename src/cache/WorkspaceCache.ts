import { FileInfo, FileSymbols } from "../types.js";
import { CompletionCache } from "./CompletionCache.js";
import { FileCache } from "./FileCache.js";
import { IdCache } from "./IdCache.js";
import { SymbolCache } from "./SymbolCache.js";

export class WorkspaceCache {
  /**
   * symbol cache is the index of all symbols within the workspace
   * also holds the completion cache which is used for quicker code completions
   * also holds the fileToSymbol map which allows quick lookup of which symbols are in a file
   */
  private readonly symbolCache = new SymbolCache();

  /**
   * id cache stores ids for symbol types (input: symbolType + name, output: id)
   */
  private readonly idCache = new IdCache();

  /**
   * file caches save symbol data for word ranges within a file, and only exists on files that are opened
   */
  private readonly fileCaches = new Map<string, FileCache>();

  clear(): void {
    this.idCache.clearAll();
    this.symbolCache.clearAll();
    this.fileCaches.clear();
  }

  clearFile(fsPath: string): void {
    this.symbolCache.clearFile(fsPath);
    this.fileCaches.delete(fsPath);
  }

  getSymbolCache(): SymbolCache {
    return this.symbolCache;
  }

  getCompletionCache(): CompletionCache {
    return this.symbolCache.getCompletionCache();
  }

  getFileSymbols(fsPath: string): FileSymbols {
    return this.symbolCache.getFileSymbols(fsPath);
  }

  getIdCache(): IdCache {
    return this.idCache;
  }

  getFileCaches(): Map<string, FileCache> {
    return this.fileCaches;
  }

  addFileCache(fileInfo: FileInfo): FileCache | undefined {
    if (fileInfo.isOpen()) { // only build file caches for opened files
      const fileCache = new FileCache(fileInfo);
      this.fileCaches.set(fileInfo.fsPath, fileCache);
      return fileCache;
    }
  }

  deleteFileCache(fsPath: string): void {
    this.fileCaches.delete(fsPath);
  }

  getFileCache(fsPath: string): FileCache | undefined {
    return this.fileCaches.get(fsPath);
  }

  getOrCreateFileCache(fileInfo: FileInfo): FileCache | undefined {
    return this.getFileCache(fileInfo.fsPath) ?? this.addFileCache(fileInfo);
  }
}
