import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { ConfigFile } from "../parser/configParser.js";
import type { ParseResult } from "../parser/parser.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { fileTypeToSymbolType, getSymbolConfig } from "../resource/symbolConfig.js";
import type { DataRange, ResolvedData } from "../types.js";
import { warn } from "../utils/logger.js";
import { resolveDefDataRange } from "../utils/resolverUtils.js";
import { buildModifiedWordContext, buildSymbolFromDec } from "../utils/symbolBuilder.js";
import type { Resolver } from "./resolver.js";

export const ConfigResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as ConfigFile;
  const symbolType = fileTypeToSymbolType(parseResult.fileInfo.type);
  const fileCache = cache.getFileCache(parseResult.fileInfo.fsPath);
  const resolvedDefs: DataRange<ResolvedData>[] = [];
  for (const configItem of file.configItems) {
    const definitionLineWords = configItem.parsedWords.get(configItem.startLine);
    if (!definitionLineWords || definitionLineWords.length !== 1) {
      warn(`Unexpected parsed words on config definition [line: ${configItem.startLine}, file: ${parseResult.fileInfo.fsPath}]`);
      continue;
    }

    let context: Record<string, any> | undefined;
    const definitionWord = definitionLineWords[0];
    let wordText = definitionWord.text; 
    if (symbolType === SymbolType.Component) {
      wordText = `${parseResult.fileInfo.name}:${definitionWord.text}`; 
      context = buildModifiedWordContext(definitionWord.text);
    }

    const symbol = buildSymbolFromDec(wordText, symbolType, parseResult.fileInfo, configItem.startLine, definitionWord.start, definitionWord.end, { info: configItem.info, configLines: configItem.displayLines });
    fileCache?.addScriptRange(configItem.startLine, configItem.endLine, definitionWord.text);
    resolvedDefs.push(resolveDefDataRange(definitionWord.start, definitionWord.end, configItem.startLine, symbol, true, context));
  }
  return resolvedDefs;
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  return [];
}
