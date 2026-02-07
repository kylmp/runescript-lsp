import { FileCache } from "./FileCache.js";
import { IdCache } from "./IdCache.js";
import { SymbolCache } from "./SymbolCache.js";
import { WorkspaceCache } from "./WorkspaceCache.js";

const caches: Map<string, WorkspaceCache> = new Map();

export function addWorkspaceCache(workspace: string): WorkspaceCache {
  if (caches.has(workspace)) {
    return caches.get(workspace)!;
  }
  const workspaceCache = new WorkspaceCache();
  caches.set(workspace, workspaceCache);
  return workspaceCache;
}

export function removeWorkspaceCache(workspace: string): void {
  caches.delete(workspace);
}

export function clearAllCaches(): void {
  caches.clear();
}

export function clearWorkspaceCache(workspace: string): WorkspaceCache | undefined {
  if (caches.has(workspace)) {
    const workspaceCache = caches.get(workspace)!;
    workspaceCache.clear();
    return workspaceCache;
  }
}

export function clearFile(workspace: string, fsPath: string): void {
  if (caches.has(workspace)) {
    caches.get(workspace)!.clearFile(fsPath);
  }
}

export function getWorkspaceCache(workspace: string): WorkspaceCache {
  return caches.get(workspace) ?? addWorkspaceCache(workspace);
}

export function getSymbolCache(workspace: string): SymbolCache {
  return getWorkspaceCache(workspace).getSymbolCache();
}

export function getIdCache(workspace: string): IdCache {
  return getWorkspaceCache(workspace).getIdCache();
}

export function getFileCaches(workspace: string): Map<string, FileCache> {
  return getWorkspaceCache(workspace).getFileCaches();
}
