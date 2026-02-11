import { Location, type Connection } from "vscode-languageserver/node.js";
import { fsPathToFileInfo, fsPathToUri, uriToFileInfo } from "../utils/fileUtils.js";
import { getFileCache } from "../cache/cacheManager.js";
import { buildLocation } from "../utils/resolverUtils.js";
import { decodeToLocation } from "../utils/cacheUtils.js";

export function registerDefinitionHandler(connection: Connection): void {
  connection.onDefinition((params) => {
    const fileInfo = uriToFileInfo(params.textDocument.uri);
    const position = params.position;
    const fileCache = getFileCache(fileInfo.workspace, fileInfo.fsPath);
    if (!fileCache) return null;
    const resolvedDataRange = fileCache.getAtPosition(position);
    if (!resolvedDataRange) return null;
    const resolved = resolvedDataRange.data;

    // If we are already on a declaration, return its location to indicate use find all references instead
    if (resolved.declaration || resolved.symbolConfig.referenceOnly) {
      return buildLocation(resolvedDataRange.start, resolvedDataRange.end, position.line, fileInfo.uri);
    }

    if (resolved.symbol.declaration) {
      return decodeToLocation(fsPathToUri(resolved.symbol.declaration.fsPath), resolved.symbol.declaration.ref) ?? null;
    }
  });
}
