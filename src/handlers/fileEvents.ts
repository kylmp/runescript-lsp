import type { Connection, TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { FileChangeType, FileEvent, TextDocumentChangeEvent } from "vscode-languageserver/node.js";
import { isOpenDocument } from "../utils/documentUtils.js";
import { uriToFileInfo } from "../utils/fileUtils.js";
import { FileInfo } from "../types.js";
import { log } from "../utils/logger.js";
import { rebuildWorkspace } from "../manager.js";

export function registerFileEventHandlers(documents: TextDocuments<TextDocument>, connection: Connection): void {
  documents.onDidOpen(handleDocumentOpened);
  documents.onDidChangeContent(handleDocumentChanged);
  documents.onDidSave(handleDocumentSaved);
  documents.onDidClose(handleDocumentClosed);
  connection.onDidChangeWatchedFiles((event) => {
    for (const change of event.changes) {
      if (change.type === FileChangeType.Changed) handleFileChanged(change);
      if (change.type === FileChangeType.Created) handleFileCreated(change);
      if (change.type === FileChangeType.Deleted) handleFileDeleted(change);
    }
  });
}

function handleDocumentClosed(event: TextDocumentChangeEvent<TextDocument>) {
  const fileInfo = uriToFileInfo(event.document.uri);
  logEvent('file closed', fileInfo);
  rebuildWorkspace(fileInfo.workspace);
}

function handleDocumentOpened(event: TextDocumentChangeEvent<TextDocument>) {
  // This fires along with the active file changed event
  const fileInfo = uriToFileInfo(event.document.uri);
  logEvent('file opened', fileInfo);
}

function handleDocumentSaved(event: TextDocumentChangeEvent<TextDocument>) {
  const fileInfo = uriToFileInfo(event.document.uri);
  logEvent('file saved', fileInfo);
}

function handleDocumentChanged(event: TextDocumentChangeEvent<TextDocument>) {
  const fileInfo = uriToFileInfo(event.document.uri);
  logEvent('active file changed', fileInfo);
}

function handleFileChanged(event: FileEvent) {
  if (isOpenDocument(event.uri)) return; // Opened document changes are covered by handleDocumentChanged
  const fileInfo = uriToFileInfo(event.uri);
  logEvent('inactive file changed', fileInfo);
}

function handleFileDeleted(event: FileEvent) {
  const fileInfo = uriToFileInfo(event.uri);
  logEvent('file deleted', fileInfo);
}

function handleFileCreated(event: FileEvent) {
  const fileInfo = uriToFileInfo(event.uri);
  logEvent('file created', fileInfo);
}

function logEvent(eventName: string, fileInfo: FileInfo) {
  log(`${eventName}: ${fileInfo.name}.${fileInfo.type} [isOpen: ${fileInfo.isOpen()}] [workspace: ${fileInfo.workspace}]`);
}
