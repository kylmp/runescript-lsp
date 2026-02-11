import type { Connection, TextDocuments } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { FileChangeType, FileEvent, TextDocumentChangeEvent } from "vscode-languageserver/node.js";
import { isOpenDocument } from "../utils/documentUtils.js";
import { uriToFileInfo } from "../utils/fileUtils.js";
import { logFileEvent } from "../utils/logger.js";
import { disposeFile, rebuildFile } from "../manager.js";
import { getIsInitializing } from "../utils/initUtils.js";

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
  if (getIsInitializing()) return;
  const fileInfo = uriToFileInfo(event.document.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('file closed', fileInfo);
  //disposeFile(fileInfo);
}

function handleDocumentOpened(event: TextDocumentChangeEvent<TextDocument>) {
  if (getIsInitializing()) return;
  // This fires along with the active file changed event 
  const fileInfo = uriToFileInfo(event.document.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('file opened', fileInfo);
  //rebuildFile(fileInfo, event.document.getText());
}

function handleDocumentSaved(event: TextDocumentChangeEvent<TextDocument>) {
  if (getIsInitializing()) return;
  const fileInfo = uriToFileInfo(event.document.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('file saved', fileInfo);
  rebuildFile(fileInfo, event.document.getText());
}

function handleDocumentChanged(event: TextDocumentChangeEvent<TextDocument>) {
  if (getIsInitializing()) return;
  const fileInfo = uriToFileInfo(event.document.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('active file changed', fileInfo);
  rebuildFile(fileInfo, event.document.getText());
}

function handleFileChanged(event: FileEvent) {
  if (getIsInitializing()) return;
  if (isOpenDocument(event.uri)) return; // Opened document changes are covered by handleDocumentChanged
  const fileInfo = uriToFileInfo(event.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('inactive file changed', fileInfo);
  rebuildFile(fileInfo);
}

function handleFileDeleted(event: FileEvent) {
  if (getIsInitializing()) return;
  const fileInfo = uriToFileInfo(event.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('file deleted', fileInfo);
  disposeFile(fileInfo);
}

function handleFileCreated(event: FileEvent) {
  if (getIsInitializing()) return;
  const fileInfo = uriToFileInfo(event.uri);
  if (!fileInfo.isMonitored) return;
  logFileEvent('file created', fileInfo);
  rebuildFile(fileInfo);
}
