import type { Connection, Hover, Position } from "vscode-languageserver/node.js";
import { isDevMode, isHoverEnabled } from "../utils/settingsUtils.js";
import { uriToFileInfo } from "../utils/fileUtils.js";
import { getFileCache } from "../cache/cacheManager.js";
import { DataRange, ResolvedSymbol } from "../types.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { DisplayItem, getDeclarationDisplayItems, getReferenceDisplayItems } from "../resource/enum/displayItems.js";

export function registerHoverHandler(connection: Connection): void {
  connection.onHover((params) => {
    if (!isHoverEnabled() && !isDevMode()) return null;

    const fileInfo = uriToFileInfo(params.textDocument.uri);
    const position = params.position;
    const fileCache = getFileCache(fileInfo.workspace, fileInfo.fsPath);
    if (!fileCache) return null;

    const markdown: string[] = [];

    const resolved = fileCache.getAtPosition(position);
    if (!resolved) return null;

    appendSymbolHoverText(markdown, resolved.data);
    if (isDevMode()) appendDevModeHoverText(markdown, resolved, position);

    const contents = {
      kind: "markdown",
      value: markdown.join('\n')
    } satisfies Hover["contents"];

    return { contents } satisfies Hover;
  });
}

function appendSymbolHoverText(markdown: string[], resolved: ResolvedSymbol): void {
  const displayItems = resolved.declaration 
      ? getDeclarationDisplayItems(resolved.symbolConfig.symbolType) 
      : getReferenceDisplayItems(resolved.symbolConfig.symbolType);
  
  if (displayItems.size === 0) return;

  appendTitle(markdown, resolved);
  appendInfo(markdown, resolved, displayItems);
  appendValue(markdown, resolved, displayItems);
  appendSignature(markdown, resolved, displayItems);
  appendCodeBlock(markdown, resolved, displayItems);
}

function appendDevModeHoverText(markdown: string[], resolvedDataRange: DataRange<ResolvedSymbol>, position: Position): void {
  if (markdown.length > 0 && markdown[markdown.length - 1] !== '>') {
    addNewLine('---', markdown);
    markdown.push('>');
  }
  const resolved = resolvedDataRange.data;
  markdown.push(`#### Debug ${resolved.symbol.name}`);
  const debugData = {
    declaration: resolved.declaration,
    parseData: { line: position.line, startIdx: resolvedDataRange.start, endIdx: resolvedDataRange.end },
    context: resolved.context,
    symbolType: resolved.symbolConfig.symbolType,
    symbol: resolved.symbol,
  };
  addNewLine('```json', markdown);
  markdown.push(stringifyForDebug(debugData));
  markdown.push('```');
}

function addNewLine(str: string, markdown: string[]) {
  markdown.push('');
  markdown.push(str);
}

function appendTitle(markdown: string[], resolved: ResolvedSymbol): void {
  let name = resolved.symbol.name;
  if (resolved.context?.isCert) name = `${name} (cert)`;
  if (resolved.symbol.id) name = `${name} [${resolved.symbol.id}]`;
  markdown.push(`#### **${resolved.symbolConfig.symbolType === SymbolType.GameVar ? resolved.symbol.fileType!.toUpperCase() : resolved.symbolConfig.symbolType.toUpperCase()}** ${name}`);
  addNewLine('---', markdown);
  markdown.push('>');
}

function appendInfo(markdown: string[], resolved: ResolvedSymbol, displayItems: Set<DisplayItem>): void {
  if (displayItems.has(DisplayItem.Info) && resolved.symbol.info) {
    addNewLine(`_${resolved.symbol.info}_`, markdown);
  }
}

function appendValue(markdown: string[], resolved: ResolvedSymbol, displayItems: Set<DisplayItem>): void {
  if (displayItems.has(DisplayItem.Value) && resolved.symbol.value) {
    addNewLine(resolved.symbol.value, markdown);
  }
}

function appendSignature(markdown: string[], resolved: ResolvedSymbol, displayItems: Set<DisplayItem>): void {
  if (displayItems.has(DisplayItem.Signature) && resolved.symbol.signature) {
    const params = resolved.symbol.signature.getParamsDisplayText();
    const returns = resolved.symbol.signature.getReturnsDisplayText();
    if (!params && !returns) return;
    addNewLine('```' + resolved.symbol.language, markdown);
    if (params) markdown.push(`params: ${params}`);
    if (returns) markdown.push(`returns: ${returns}`);
    markdown.push('```');
  }
}

function appendCodeBlock(markdown: string[], resolved: ResolvedSymbol, displayItems: Set<DisplayItem>): void {
  if (displayItems.has(DisplayItem.Codeblock) && resolved.symbol.block) {
    addNewLine('```' + resolved.symbol.language, markdown);
    markdown.push(resolved.symbol.block);
    markdown.push('```');
  }
}

function stringifyForDebug(value: unknown): string {
  const seen = new WeakSet<object>();
  const replacer = (_key: string, input: unknown) => {
    if (typeof input === "function") return "[Function]";
    if (input instanceof Map) return Object.fromEntries(input);
    if (input instanceof Set) return Array.from(input);
    if (input && typeof input === "object") {
      const obj = input as object;
      if (seen.has(obj)) return "[Circular]";
      seen.add(obj);
    }
    return input;
  };

  try {
    const serialized = JSON.stringify(value, replacer, 2);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
}
