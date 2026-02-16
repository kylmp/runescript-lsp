import { CompletionItem, CompletionParams } from "vscode-languageserver";
import { uriToFileInfo } from "../../utils/fileUtils.js";
import { completionBySymbolType, runescriptCompletionTriggers } from "./completion.js";
import { getDocument } from "../../utils/documentUtils.js";
import { getWorkspaceCache } from "../../cache/cacheManager.js";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { SymbolType } from "../../resource/enum/symbolTypes.js";
import { WorkspaceCache } from "../../cache/WorkspaceCache.js";
import { FileInfo } from "../../types.js";
import { parseScript } from "../../parser/runescriptParser.js";
import { resolveSymbolTypeFromScriptPosition } from "../../resolver/runescriptResolver.js";
import { getScriptTriggerSymbol } from "../../resource/scriptTriggers.js";

const SEARCH_DEDUP_MS = 100;
let pendingSearch: { timer: NodeJS.Timeout; resolve: (items: CompletionItem[]) => void } | null = null;

export async function runescriptCompletionHandler(params: CompletionParams): Promise<CompletionItem[]> {
  const document = getDocument(params.textDocument.uri);
  if (!document) return [];
  
  const fileInfo = uriToFileInfo(params.textDocument.uri);
  const index = params.position.character;
  const lineNum = params.position.line;
  const lineText = document.getText({ start: {line: lineNum, character: 0}, end: params.position});
  const triggerIndex = findTriggerIndex(lineText, index, runescriptCompletionTriggers);
  const trigger = lineText.charAt(triggerIndex);
  const completionPrefix = lineText.substring(triggerIndex + 1);
  const cache = getWorkspaceCache(fileInfo.workspace);

  return invokeRunescriptCompletion(document, params.position, trigger, completionPrefix, cache, fileInfo, lineText, triggerIndex);
}

async function invokeRunescriptCompletion(document: TextDocument, position: Position, trigger: string, prefix: string, cache: WorkspaceCache, fileInfo: FileInfo, lineText: string, triggerIndex: number): Promise<CompletionItem[]> {
  switch (trigger) {
    case '[': return completionBySymbolType(prefix, SymbolType.Trigger, position.line, cache, fileInfo);
    case '^': return completionBySymbolType(prefix, SymbolType.Constant, position.line, cache, fileInfo);
    case '%': return completionBySymbolType(prefix, SymbolType.GameVar, position.line, cache, fileInfo);
    case '~': return completionBySymbolType(prefix, SymbolType.Proc, position.line, cache, fileInfo);
    case '@': return completionBySymbolType(prefix, SymbolType.Label, position.line, cache, fileInfo);
    case '$': return completionBySymbolType(prefix, SymbolType.LocalVar, position.line, cache, fileInfo);
    case ',': return completionByComma(lineText, triggerIndex, position.line, cache, fileInfo, document, position, prefix);
    case '(': case ' ': return searchForMatchType(document, position, prefix, cache, fileInfo);
    default: return searchForMatchType(document, position, prefix, cache, fileInfo, SymbolType.Command);
  }
}

function findTriggerIndex(line: string, start: number, completionTriggers: Set<string>): number {
  let i = start;
  while (i >= 0) {
    const char = line.charAt(i);
    if (char === ' ') {
      if (i === 0) return -1;
      const prev = line.charAt(i - 1);
      if (prev === ',' || prev === '=') return i;
    }
    if (completionTriggers.has(char)) {
      return i;
    }
    i--;
  } 
  return i;
}

async function searchForMatchType(document: TextDocument, position: Position, prefix: string, cache: WorkspaceCache, fileInfo: FileInfo, defaultSymbolType = SymbolType.Unknown): Promise<CompletionItem[]> {
  if (pendingSearch) {
    clearTimeout(pendingSearch.timer);
    pendingSearch.resolve([]);
    pendingSearch = null;
  }

  return new Promise<CompletionItem[]>((resolve) => {
    const timer = setTimeout(() => {
      pendingSearch = null;
      const fileCache = cache.getFileCache(fileInfo.fsPath);
      if (!fileCache) return resolve([]);
      const scriptRange = fileCache.getScriptRange(position.line);
      if (!scriptRange) return resolve([]);
      const scriptText = document.getText({ start: {line: scriptRange.start, character: 0}, end: position}) + 'temp' + document.getText({ start: position, end: {line: scriptRange.end + 1, character: 0}});
      const parsedScript = parseScript(scriptText);
      if (!parsedScript) return resolve([]);
      const lineNum = position.line - scriptRange.start;
      const resolvedType = resolveSymbolTypeFromScriptPosition(parsedScript, fileInfo, cache, lineNum, position.character);
      resolve(completionBySymbolType(prefix, resolvedType, position.line, cache, fileInfo));
    }, SEARCH_DEDUP_MS);

    pendingSearch = { timer, resolve };
  });
}

async function completionByComma(lineText: string, triggerIndex: number, lineNum: number, cache: WorkspaceCache, fileInfo: FileInfo, document: TextDocument, position: Position, prefix: string): Promise<CompletionItem[]> {
  if (triggerIndex > 1 && lineText.charAt(triggerIndex - 1) === 'p' && lineText.charAt(triggerIndex - 2) === '<') {
    return completionBySymbolType('', SymbolType.Mesanim, lineNum, cache, fileInfo);
  }
  const scriptDefMatch = lineText.match(/^\[([^,]+),/);
  if (scriptDefMatch !== null) {
    const triggerSymbolType = getScriptTriggerSymbol(scriptDefMatch?.[1]);
    if (triggerSymbolType) return completionBySymbolType('', triggerSymbolType.symbolType, lineNum, cache, fileInfo);
  }
  return searchForMatchType(document, position, prefix, cache, fileInfo);
}
