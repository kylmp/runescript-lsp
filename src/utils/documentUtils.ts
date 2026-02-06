import type { TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";

let documents: TextDocuments<TextDocument> | undefined;

export function setDocuments(inputDocs: TextDocuments<TextDocument>): void {
  documents = inputDocs;
}

export function getDocuments(): TextDocuments<TextDocument> {
  if (!documents) {
    throw new Error("Documents manager not initialized.");
  }
  return documents;
}

export function isOpenDocument(uri: string): boolean {
  return getDocuments().get(uri) !== undefined;
}
