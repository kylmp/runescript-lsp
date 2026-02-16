import { CompletionItem, CompletionParams, CompletionTriggerKind } from "vscode-languageserver";
import { getDocument } from "../../utils/documentUtils.js";
import { uriToFileInfo } from "../../utils/fileUtils.js";
import { configCompletionTriggers, findTriggerIndex } from "./completion.js";
import { getWorkspaceCache } from "../../cache/cacheManager.js";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { SymbolType } from "../../resource/enum/symbolTypes.js";

export async function configCompletionHandler(params: CompletionParams): Promise<CompletionItem[]> {
  const document = getDocument(params.textDocument.uri);
  if (!document) return [];

  const fileInfo = uriToFileInfo(params.textDocument.uri);
  const index = params.position.character;
  const lineNum = params.position.line;
  const lineText = document.getText({ start: {line: lineNum, character: 0}, end: params.position});
  const triggerIndex = findTriggerIndex(lineText, index, configCompletionTriggers);
  const trigger = lineText.charAt(triggerIndex);
  const completionPrefix = lineText.substring(triggerIndex + 1);
  const cache = getWorkspaceCache(fileInfo.workspace);

  if (params.context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
    return invokeConfigCompletion(document, params.position, trigger, '');
  }
  return invokeConfigCompletion(document, params.position, trigger, completionPrefix);
}

async function invokeConfigCompletion(document: TextDocument, position: Position, trigger: string, prefix: string): Promise<CompletionItem[]> {
  switch (trigger) {
    case ',': return searchForMatchType(document, position);
    case '=': return searchForMatchType(document, position);
    default: return searchForMatchType(document, position, SymbolType.ConfigKey);
  }
}

function searchForMatchType(document: TextDocument, position: Position, defaultSymbol = SymbolType.Unknown): CompletionItem[] {
  return [];
}
