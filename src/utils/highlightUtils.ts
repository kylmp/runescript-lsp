import { Connection, RequestType } from "vscode-languageserver/node.js";
import { DevModeHighlightsResponse, FileInfo } from "../types.js";
import { getWorkspaceCache } from "../cache/cacheManager.js";
import { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { isDevMode } from "./settingsUtils.js";
import { uriToFileInfo } from "./fileUtils.js";
import { getWorkspaceFolders } from "./workspaceUtils.js";

type GetDecorationsParams = { uri: string };

let connection: Connection | undefined;

export enum HighlightKind {
  Symbol = 'symbol',
  Unknown = 'unknown'
}

export function initHighlights(conn: Connection): void {
  connection = conn;
  connection.onRequest(new RequestType<GetDecorationsParams, DevModeHighlightsResponse, void>("runescript/getDecorations"), async ({ uri }) => {
    if (!isDevMode()) return;
    const fileInfo = uriToFileInfo(uri);
    const fileCache = getWorkspaceCache(fileInfo.workspace).getFileCache(fileInfo.fsPath);
    const ranges = fileCache ? fileCache.getSymbolRanges() : [];
    return { uri, ranges };
  });
}

export function sendAllHighlights(cache: WorkspaceCache): void {
  if (!connection || !isDevMode()) return;
  for (const [_fsPath, fileCache] of cache.getFileCaches()) {
    connection.sendNotification("runescript/decorations", { 
      uri: fileCache.getFileInfo().uri, 
      ranges: fileCache.getSymbolRanges() 
    });
  }
}

export function clearAllHighlights(): void {
  if (!connection) return;
  getWorkspaceFolders().forEach(workspace => {
    for (const [_fsPath, fileCache] of getWorkspaceCache(workspace).getFileCaches()) {
      connection!.sendNotification("runescript/decorations", { 
        uri: fileCache.getFileInfo().uri, 
        ranges: []
      });
    }
  });
}

export function sendFileHighlights(fileInfo: FileInfo): void {
  if (!connection || !isDevMode()) return;
  const fileCache = getWorkspaceCache(fileInfo.workspace).getFileCache(fileInfo.fsPath);
  if (!fileCache) {
    return;
  }
  connection.sendNotification("runescript/decorations", { 
    uri: fileInfo.uri, 
    ranges: fileCache.getSymbolRanges() 
  });
}
