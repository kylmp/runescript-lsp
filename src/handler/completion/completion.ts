import { CompletionItem, type Connection, type CompletionParams, CompletionTriggerKind, CompletionItemKind } from "vscode-languageserver/node.js";
import { getLanguage } from "../../utils/handlerUtils.js";
import { Position, TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import { getDocument } from "../../utils/documentUtils.js";
import { uriToFileInfo } from "../../utils/fileUtils.js";
import { resolveAtHandlerPosition } from "../../utils/resolverUtils.js";
import { waitForFileRebuild } from "../events/fileEvents.js";
import { SymbolType } from "../../resource/enum/symbolTypes.js";
import { getAllTriggers } from "../../resource/scriptTriggers.js";
import { getObservedConfigKeys } from "../../resource/configKeys.js";
import { getWorkspaceCache } from "../../cache/cacheManager.js";
import { CompletionCache } from "../../cache/CompletionCache.js";
import { WorkspaceCache } from "../../cache/WorkspaceCache.js";
import { FileInfo } from "../../types.js";
import { parseScript } from "../../parser/runescriptParser.js";
import { runescriptCompletionHandler } from "./runescriptCompletion.js";
import { configCompletionHandler } from "./configCompletion.js";

export const runescriptCompletionTriggers = new Set(['$', '^', '%', '~', '@', ',', '[', '(', ' ']);
export const configCompletionTriggers = new Set(['=', ',']);
export const allTriggers = [...new Set([...runescriptCompletionTriggers, ...configCompletionTriggers])];

export function registerCompletionHandler(connection: Connection): void {
  connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'runescript') {
      return runescriptCompletionHandler(params);
    } else if (language.endsWith('config') || language === 'interface') {
      return configCompletionHandler(params);
    }
    return [];
  });
}

export function findTriggerIndex(line: string, start: number, completionTriggers: Set<string>): number {
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

export function getCompletionItemKind(symbolType: SymbolType): CompletionItemKind {
  switch (symbolType) {
    case SymbolType.Constant: return CompletionItemKind.Constant;
    case SymbolType.LocalVar:
    case SymbolType.GameVar: return CompletionItemKind.Variable;
    case SymbolType.Queue:
    case SymbolType.Command:
    case SymbolType.Proc:
    case SymbolType.Label: return CompletionItemKind.Function;
    case SymbolType.Mesanim:
    case SymbolType.Enum: return CompletionItemKind.Enum;
    default: return CompletionItemKind.Text;
  }
}

export function buildCompletionItem(label: string, kind: CompletionItemKind, desc: string, additionalTextEdits?: TextEdit[]): CompletionItem {
  const res = CompletionItem.create(label);
  res.kind = kind;
  res.detail = desc.toLowerCase();
  res.labelDetails = { description: desc.toLowerCase() };
  if (additionalTextEdits) res.additionalTextEdits = additionalTextEdits;
  return res;
}

export function completionBySymbolType(prefix: string, symbolType: SymbolType, lineNum: number, cache: WorkspaceCache, fileInfo: FileInfo, additionalTextEdits?: TextEdit[]): CompletionItem[] {
  if (symbolType === SymbolType.Unknown) return [];
  const completionCache = cache.getCompletionCache();
  const completionItems: CompletionItem[] = [];
  let completions: { name: string, desc: string }[] = [];
  switch(symbolType) {
    case SymbolType.ConfigKey:
      completions = [...getObservedConfigKeys()].map(configKey => ({ name: configKey, desc: SymbolType.ConfigKey }));
      break;
    case SymbolType.Trigger:
      completions = getAllTriggers().map(trigger => ({ name: trigger, desc: SymbolType.Trigger }));
      break;
    case SymbolType.LocalVar:
      const fileCache = cache.getFileCache(fileInfo.fsPath);
      if (!fileCache) break;
      completions = Array.from(fileCache.getLocalVariableNames(lineNum));
      break;
    case SymbolType.GameVar:
      completions = (completionCache.getAllWithPrefix(prefix, symbolType) ?? []).map(iden => ({ name: iden, desc: cache.getSymbolCache().get(iden, SymbolType.GameVar)!.fileType ?? 'varp' }));
      break;
    default:
      completions = (completionCache.getAllWithPrefix(prefix, symbolType) ?? []).map(iden => ({ name: iden, desc: symbolType }));
  }
  const completionKind = getCompletionItemKind(symbolType);
  completions.forEach(completionData => completionItems.push(
    buildCompletionItem(completionData.name, completionKind, completionData.desc, additionalTextEdits)));
  return completionItems;
}
