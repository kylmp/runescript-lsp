import path from "path";
import type { WorkspaceFolder } from "vscode-languageserver/node.js";
import { fsPathToFileInfo, mapUri, monitoredFileTypes } from "./fileUtils.js";
import { FileInfo } from "../types.js";
import { readdir } from "fs/promises";
import { FileType } from "../resource/enum/fileTypes.js";

let workspaceFolders: string[] = [];

export function setWorkspaceFolders(folders: WorkspaceFolder[]): void {
  workspaceFolders = folders.map((folder) => mapUri(folder.uri));
}

export function getWorkspaceFolders(): string[] {
  return workspaceFolders;
}

/**
 * Return the workspace folder (as resolved fsPath)
 * @param fsPath The mapped fsPath (should go thru fileUtils.mapUri() before calling this function)
 * @returns The matching workspace folder, if any
 */
export function findWorkspaceFolder(fsPath: string): string | undefined {
  let best: string | undefined;
  let bestLength = -1;

  for (const folderPath of workspaceFolders) {
    if (fsPath === folderPath || fsPath.startsWith(folderPath + path.sep)) {
      if (folderPath.length > bestLength) {
        best = folderPath;
        bestLength = folderPath.length;
      }
    }
  }

  return best;
}

export async function getMonitoredWorkspaceFiles(workspace: string): Promise<FileInfo[]> {
  const skipDirs = new Set(['node_modules', '.git', '.vscode', '.idea']) //'maps', 'models', 'songs', 'synth'
  const stack = [workspace];
  const results: string[] = [];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          stack.push(path.join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1) as FileType;
        if (monitoredFileTypes.has(ext)) {
          results.push(path.join(dir, entry.name));
        }
      }
    }
  }
  return results.map(fsPathToFileInfo);
}
