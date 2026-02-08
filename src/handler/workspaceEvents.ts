import type { Connection, WorkspaceFoldersChangeEvent } from "vscode-languageserver/node.js";
import { log, logWorkspaceEvent } from "../utils/logger.js";
import { mapUri } from "../utils/fileUtils.js";
import { URI } from "vscode-uri";
import { disposeWorkspace, rebuildWorkspace } from "../manager.js";
import { getIsInitializing } from "../utils/initUtils.js";
import { getWorkspaceFolders, setWorkspaceFolders } from "../utils/workspaceUtils.js";

export function registerWorkspaceEventHandlers(connection: Connection): void {
  connection.workspace.onDidChangeWorkspaceFolders((event: WorkspaceFoldersChangeEvent) => {
    if (getIsInitializing()) return;

    const existing = new Set(getWorkspaceFolders());
    for (const removed of event.removed) {
      const fsPath = mapUri(removed.uri);
      logWorkspaceEvent(fsPath, false);
      existing.delete(fsPath);
      disposeWorkspace(fsPath);
    }
    for (const added of event.added) {
      const fsPath = mapUri(added.uri);
      logWorkspaceEvent(fsPath, true);
      existing.add(fsPath);
      void rebuildWorkspace(fsPath);
    }

    setWorkspaceFolders(
      Array.from(existing).map((fsPath) => ({
        uri: URI.file(fsPath).toString(),
        name: fsPath,
      })),
    );
  });
}
