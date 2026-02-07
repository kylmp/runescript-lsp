import type { Connection } from "vscode-languageserver/node.js";
import { isDevMode } from "./settingsUtils.js";

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
