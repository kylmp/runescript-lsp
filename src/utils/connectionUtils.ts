import type { Connection } from "vscode-languageserver/node.js";

let connection: Connection | undefined;

export function initConnection(conn: Connection): void {
  connection = conn;
}

export function getConnection(): Connection | undefined {
  return connection;
}
