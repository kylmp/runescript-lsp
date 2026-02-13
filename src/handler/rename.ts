import type { Connection, RenameParams, WorkspaceEdit } from "vscode-languageserver/node.js";

export function registerRenameHandler(connection: Connection): void {
  connection.onRenameRequest((_params: RenameParams): WorkspaceEdit | null => {
    return null;
  });
}
