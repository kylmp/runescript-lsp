import { FileCache } from "./FileCache.js";
import { IdCache } from "./IdCache.js";
import { SymbolCache } from "./SymbolCache.js";

export class WorkspaceCache {
  private readonly symbolCache = new SymbolCache();
  private readonly idCache = new IdCache();
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

  getIdCache(): IdCache {
    return this.idCache;
  }

  getFileCaches(): Map<string, FileCache> {
    return this.fileCaches;
  }

  addFileCache(fsPath: string): FileCache {
    const fileCache = new FileCache();
    this.fileCaches.set(fsPath, fileCache);
    return fileCache;
  }

  deleteFileCache(fsPath: string): void {
    this.fileCaches.delete(fsPath);
  }

  getFileCache(fsPath: string): FileCache | undefined {
    return this.fileCaches.get(fsPath);
  }

  getOrCreateFileCache(fsPath: string): FileCache {
    return this.getFileCache(fsPath) ?? this.addFileCache(fsPath);
  }
}