import type { Connection, SignatureHelp, SignatureHelpParams } from "vscode-languageserver/node.js";

export function registerSignatureHelpHandler(connection: Connection): void {
  connection.onSignatureHelp((_params: SignatureHelpParams): SignatureHelp | null => {
    return null;
  });
}
