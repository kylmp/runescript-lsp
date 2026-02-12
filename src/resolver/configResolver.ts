import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { ConfigFile, ConfigWordType } from "../parser/configParser.js";
import type { ParseResult } from "../parser/parser.js";
import { ConfigVarArgSrc, learnConfigKey } from "../resource/configKeys.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { fileTypeToSymbolType } from "../resource/symbolConfig.js";
import type { DataRange, ResolvedData } from "../types.js";
import { warn } from "../utils/logger.js";
import { resolveDefDataRange, resolveRefDataRange } from "../utils/resolverUtils.js";
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
    if (symbolType === SymbolType.Dbrow) {
      wordText = `${configItem.displayLines.get('table')}:${definitionWord.text}`;
      context = buildModifiedWordContext(definitionWord.text);
    }
    const symbol = buildSymbolFromDec(wordText, symbolType, parseResult.fileInfo, configItem.startLine, definitionWord.start, definitionWord.end, { info: configItem.info, configLines: configItem.displayLines });
    fileCache?.addScriptRange(configItem.startLine, configItem.endLine, definitionWord.text);
    resolvedDefs.push(resolveDefDataRange(definitionWord.start, definitionWord.end, configItem.startLine, symbol, true, context));
  }
  return resolvedDefs;
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as ConfigFile;
  const fileInfo = parseResult.fileInfo;
  const resolvedRefs: DataRange<ResolvedData>[] = [];
  for (const configItem of file.configItems) {
    for (const [lineNum, configWords] of configItem.parsedWords) {
      const configKeyData = configItem.configData.get(lineNum);
      configWords.forEach(word => {
        if (word.type === ConfigWordType.Key) {
          resolvedRefs.push(resolveRefDataRange(SymbolType.ConfigKey, word.start, word.end, lineNum, word.text, fileInfo.type));
        }
        else if (word.type === ConfigWordType.Constant) {
          resolvedRefs.push(resolveRefDataRange(SymbolType.Constant, word.start, word.end, lineNum, word.text, fileInfo.type));
        }
        else if (word.type === ConfigWordType.GameVar) {
          resolvedRefs.push(resolveRefDataRange(SymbolType.GameVar, word.start, word.end, lineNum, word.text, fileInfo.type));
        }
        else if (word.type === ConfigWordType.Value && configKeyData) {
          if ((configKeyData.ignoreValues ?? []).includes(word.text)) return;

          const valueIndex = word.valueIndex!;
          const valueSymbolType = configKeyData.params[valueIndex]
          if (valueSymbolType) {
            let name = word.text;
            let context = undefined;
            if (valueSymbolType === SymbolType.Dbcolumn) {
              name = `${configItem.displayLines.get('table')}:${word.text}`;
              context = buildModifiedWordContext(word.text);
            }
            resolvedRefs.push(resolveRefDataRange(valueSymbolType, word.start, word.end, lineNum, name, fileInfo.type, context));
            return;
          }

          if (configKeyData.varArgs) {
            let varargSourceName = '';
            if (configKeyData.varArgs.symbolSource === ConfigVarArgSrc.BlockName) {
              const definitionLineWords = configItem.parsedWords.get(configItem.startLine);
              if (definitionLineWords?.length !== 1) return;
              varargSourceName = definitionLineWords[0].text;
            }
            else if (configKeyData.varArgs.symbolSource === ConfigVarArgSrc.FirstParam) {
              varargSourceName = configWords[1].text;
            }
            else if (configKeyData.varArgs.symbolSource === ConfigVarArgSrc.Column) {
              varargSourceName = `${configItem.displayLines.get('table')}:${configWords[1].text}`;
            }
            if (!varargSourceName) return;

            const varargSourceSymbol = cache.getSymbolCache().get(varargSourceName, configKeyData.varArgs.symbolType);
            if (!varargSourceSymbol || !varargSourceSymbol.dynamicConfigTypes) return;

            const varargSymbolType = varargSourceSymbol.dynamicConfigTypes.get(valueIndex);
            if (varargSymbolType) {
              resolvedRefs.push(resolveRefDataRange(varargSymbolType, word.start, word.end, lineNum, word.text, fileInfo.type));
            }
          }
        }
      });
    }
  }
  return resolvedRefs;
}
