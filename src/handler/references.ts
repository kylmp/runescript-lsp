import type { Connection } from "vscode-languageserver/node.js";
import type { ReferenceParams, Location } from "vscode-languageserver/node.js";
import { fsPathToUri, uriToFileInfo } from "../utils/fileUtils.js";
import { decodeToLocation } from "../utils/cacheUtils.js";
import { resolveAtHandlerPosition } from "../utils/resolverUtils.js";

export function registerReferencesHandler(connection: Connection): void {
  connection.onReferences((params: ReferenceParams): Location[] => {
    const fileInfo = uriToFileInfo(params.textDocument.uri);
    const resolvedDataRange = resolveAtHandlerPosition(params.position, fileInfo);
    if (!resolvedDataRange) return [];
    const resolved = resolvedDataRange.data;

    // These symbol types have no references to find
    if (resolved.symbolConfig.noop || !resolved.symbolConfig.cache) {
      return [];
    }

    // Decode all the references for the identifier into an array of vscode Location objects
    const referenceLocations: Location[] = [];
    Object.keys(resolved.symbol.references).forEach(fsPath => {
      const uri = fsPathToUri(fsPath);
      resolved.symbol.references[fsPath].forEach(encodedReference => {
        const location = decodeToLocation(uri, encodedReference);
        if (location) {
          referenceLocations.push(location);
        }
      });
    });

    // If there is only one reference and its the declaration, return empty list as theres no other references to show
    if (resolved.declaration && referenceLocations.length === 1) {
      return [];
    }

    return referenceLocations;
  });
}
