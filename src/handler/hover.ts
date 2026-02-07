import type { Connection, Hover } from "vscode-languageserver/node.js";
import type { TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { isHoverEnabled } from "../utils/settingsUtils.js";

export function registerHoverHandler(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  connection.onHover((params) => {
    if (!isHoverEnabled()) return null;

    const doc = documents.get(params.textDocument.uri);
    const position = params.position;
    if (!doc) {
      return null;
    }

    const contents = {
      kind: "markdown",
      value: `**RuneScript LSP**\n\nHover at ${position.line + 1}:${position.character + 1}`
    } satisfies Hover["contents"];

    return { contents } satisfies Hover;
  });
}
