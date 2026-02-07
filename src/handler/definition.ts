import type { Connection, Location, TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";

export function registerDefinitionHandler(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  connection.onDefinition((params) => {
    const doc = documents.get(params.textDocument.uri);
    void doc;

    const locations: Location[] = [];
    return locations;
  });
}
