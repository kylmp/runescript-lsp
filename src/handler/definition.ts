import type { Connection } from "vscode-languageserver/node.js";
import { fsPathToUri, uriToFileInfo } from "../utils/fileUtils.js";
import { getFileCache } from "../cache/cacheManager.js";
import { buildLocation, resolveAtHandlerPosition } from "../utils/resolverUtils.js";
import { decodeToLocation } from "../utils/cacheUtils.js";

export function registerDefinitionHandler(connection: Connection): void {
  connection.onDefinition((params) => {
    const fileInfo = uriToFileInfo(params.textDocument.uri);
    const resolvedDataRange = resolveAtHandlerPosition(params.position, fileInfo);
    if (!resolvedDataRange) return null;
    const resolved = resolvedDataRange.data;

    // If we are already on a declaration, return its location to indicate use find all references instead
    if (resolved.declaration || resolved.symbolConfig.referenceOnly) {
      return buildLocation(resolvedDataRange.start, resolvedDataRange.end, params.position.line, fileInfo.uri);
    }

    if (resolved.symbol.declaration) {
      return decodeToLocation(fsPathToUri(resolved.symbol.declaration.fsPath), resolved.symbol.declaration.ref) ?? null;
    }
  });
}
