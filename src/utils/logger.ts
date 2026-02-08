import type { Connection } from "vscode-languageserver/node.js";
import { isDevMode } from "./settingsUtils.js";
import { FileInfo } from "../types.js";

let connection: Connection | undefined;

export function initLogger(conn: Connection): void {
  connection = conn;
}

function prefix(message: string, type?: string): string {
  return type? `[runescript-lsp] ${type}: ${message}` : `[runescript-lsp] ${message}`;
}

export function log(message: string): void {
  if (isDevMode()) connection?.console.log(prefix(message));
}

export function info(message: string): void {
  if (isDevMode()) connection?.console.log(prefix(message, ' info'));
}

export function warn(message: string): void {
  if (isDevMode()) connection?.console.log(prefix(message, ' warn'));
}

export function error(message: string): void {
  if (isDevMode()) connection?.console.log(prefix(message, 'error'));
}

export function logSettingsChange(name: string, value: boolean): void {
  if (isDevMode()) connection?.console.log(prefix(`Setting [${name}] ${value ? 'enabled' : 'disabled'}`));
}

export function logFileEvent(eventName: string, fileInfo: FileInfo) {
  log(`${eventName}: ${fileInfo.name}.${fileInfo.type} [workspace: ${fileInfo.workspace}]`);
}

export function logWorkspaceEvent(workspace: string, opened: boolean) {
  log(`Workspace change event: workspace ${opened ? 'opened' : 'closed'} [${workspace}]`); 
}
