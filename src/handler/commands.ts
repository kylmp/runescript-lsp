import type { Connection } from "vscode-languageserver/node.js";
import { rebuildWorkspace } from "../manager.js";
import { mapUri } from "../utils/fileUtils.js";
import { findWorkspaceFolder, getWorkspaceFolders } from "../utils/workspaceUtils.js";

export const COMMANDS = {
  rescanWorkspace: "runescript.rescanWorkspace"
} as const;

export const COMMAND_IDS = [COMMANDS.rescanWorkspace] as const;

export function registerCommandHandlers(connection: Connection): void {
  connection.onExecuteCommand(async (params) => {
    if (params.command === COMMANDS.rescanWorkspace) {
      const workspaceArg = params.arguments?.[0];
      if (typeof workspaceArg === "string") {
        const fsPath = workspaceArg.startsWith("file:") ? mapUri(workspaceArg) : workspaceArg;
        const workspace = findWorkspaceFolder(fsPath) ?? fsPath;
        await rebuildWorkspace(workspace);
        return;
      }
      for (const workspace of getWorkspaceFolders()) {
        await rebuildWorkspace(workspace);
      }
      return;
    }
  });
}
