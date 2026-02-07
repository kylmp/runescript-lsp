import type { Connection } from "vscode-languageserver/node.js";
import { NotificationType } from "vscode-languageserver/node.js";
import { rebuildWorkspace } from "../manager.js";
import { mapUri } from "../utils/fileUtils.js";
import { getWorkspaceFolders } from "../utils/workspaceUtils.js";
import { log } from "../utils/logger.js";

export const GitBranchChanged = new NotificationType<{ workspaceUri?: string }>(
  "runescript/gitBranchChanged",
);

export function registerGitEventHandlers(connection: Connection): void {
  connection.onNotification(GitBranchChanged, async (params) => {
    const workspaceUri = params?.workspaceUri;
    if (workspaceUri) {
      const workspace = mapUri(workspaceUri);
      log(`Recieved git branch change event on workspace=${workspace}`);
      await rebuildWorkspace(workspace);
      return;
    }
    log(`Recieved git branch change event without a workspace param - rebuilding all workspaces`);
    for (const workspace of getWorkspaceFolders()) {
      await rebuildWorkspace(workspace);
    }
  });
}
