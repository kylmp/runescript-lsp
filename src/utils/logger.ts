import type { Connection } from "vscode-languageserver/node.js";

let connection: Connection | undefined;

export function initLogger(conn: Connection): void {
  connection = conn;
}

function prefix(message: string): string {
  return `[runescript-lsp] ${message}`;
}

export function log(message: string): void {
  connection?.console.log(prefix(message));
}

export function info(message: string): void {
  connection?.console.info(prefix(message));
}

export function warn(message: string): void {
  connection?.console.warn(prefix(message));
}

export function error(message: string): void {
  connection?.console.error(prefix(message));
}
