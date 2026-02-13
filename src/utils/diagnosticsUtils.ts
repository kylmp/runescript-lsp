import type { Connection, Diagnostic } from "vscode-languageserver/node.js";

let connection: Connection | undefined;

export function initDiagnostics(conn: Connection): void {
  connection = conn;
}

export function sendDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
  connection?.sendDiagnostics({ uri, diagnostics });
}

export function clearDiagnostics(uri: string): void {
  connection?.sendDiagnostics({ uri, diagnostics: [] });
}
