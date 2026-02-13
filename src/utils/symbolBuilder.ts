import { getDisplayLanguage } from "../resource/enum/displayItems.js";
import { INFO_MATCHER_REGEX } from "../resource/enum/regex.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { Type } from "../resource/enum/types.js";
import { getSymbolConfig, typeToSymbolType } from "../resource/symbolConfig.js";
import { FileInfo, RunescriptSymbol, Signature, SignatureParam, SignatureReturn, SymbolBuilderExtraItems } from "../types.js";
import { encodeReference } from "./cacheUtils.js";
import { warn } from "./logger.js";

export function buildSymbolFromDec(name: string, symbolType: SymbolType, fileInfo: FileInfo, lineNum: number, startIndex: number, endIndex: number, extraItems?: SymbolBuilderExtraItems) {
  const symbol: RunescriptSymbol = {
    name,
    symbolType,
    fileType: fileInfo.type,
    language: getDisplayLanguage(symbolType),
    declaration: { fsPath: fileInfo.fsPath, ref: encodeReference(lineNum, startIndex, endIndex) },
    references: {}
  }

  const symbolConfig = getSymbolConfig(symbolType);
  if (symbolConfig.cache) {
    symbol.cacheName = name;
  }

  if (symbolConfig.qualifiedName) {
    if (name.indexOf(':') === -1) warn(`Expected qualified name for ${symbolType}, line=${lineNum}, start=${startIndex}, file=${fileInfo.fsPath}`);
    else {
      const split = name.split(':');
      symbol.name = split[1];
      symbol.qualifier = split[0];
    }
  }

  if (extraItems) {
    if (extraItems.extraData) symbol.extraData = extraItems.extraData;
    if (extraItems.info) symbol.info = extraItems.info;
    if (extraItems.signature) symbol.signature = extraItems.signature;
    if ((extraItems.configLines?.size ?? 0) > 0) {
      symbol.configLines = extraItems.configLines;
      const blockInclusionLines: string[] = [];
      extraItems.configLines!.forEach((lines, key) => {
        lines.forEach(value => blockInclusionLines.push(`${key}=${value}`));
      });
      symbol.block = blockInclusionLines.join('\n');
    }
  }

  if (symbolConfig.postProcessor !== undefined) {
    symbolConfig.postProcessor(symbol);
  }
  cleanupSymbol(symbol);
  return symbol;
}

export function buildSymbolFromRef(name: string, symbolType: SymbolType, fileType: string, extraData?: Record<string, any>): RunescriptSymbol {
  const symbol: RunescriptSymbol = {
    name,
    symbolType,
    fileType,
    language: getDisplayLanguage(symbolType),
    references: {}
  }

  const symbolConfig = getSymbolConfig(symbolType);
  if (symbolConfig.qualifiedName) {
    if (name.indexOf(':') === -1) {
      warn(`Expected qualified name for ${symbolType}, name=${name}`);
    }
    else {
      const split = name.split(':');
      symbol.name = split[1];
      symbol.qualifier = split[0];
    }
  }

  if (extraData) symbol.extraData = extraData;

  if (symbolConfig.postProcessor !== undefined && (symbolConfig.referenceOnly || !symbolConfig.cache)) {
    symbolConfig.postProcessor(symbol);
  }
  cleanupSymbol(symbol);
  return symbol;
}

export function addReference(symbol: RunescriptSymbol, fileKey: string, lineNum: number, startIndex: number, endIndex: number, id?: string): Set<string> {
  const fileReferences = symbol.references[fileKey] || new Set<string>();
  fileReferences.add(encodeReference(lineNum, startIndex, endIndex));
  if (id) symbol.id = id;
  symbol.references[fileKey] = fileReferences;
  return fileReferences;
}

function cleanupSymbol(symbol: RunescriptSymbol): void {
  delete symbol.configLines;
}

export function getInfo(line?: string): string | undefined {
  if (!line) return undefined;
  const infoMatch = INFO_MATCHER_REGEX.exec(line);
  if (infoMatch && infoMatch[2]) {
    return infoMatch[2].trim();
  }
}

export function buildSignature(line: string): Signature {
  // Parse input params
  const params: SignatureParam[] = [];
  let openingIndex = line.indexOf('(');
  let closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    line.substring(openingIndex, closingIndex).split(',').forEach(param => {
      if (param.startsWith(' ')) param = param.substring(1);
      const split = param.split(' ');
      if (split.length === 2) {
        params.push({ type: split[0] as Type, name: split[1], symbolType: typeToSymbolType(split[0] as Type) });
      }
    });
  }
  // Parse response type
  let returns: SignatureReturn[] = [];
  line = line.substring(closingIndex + 1);
  openingIndex = line.indexOf('(');
  closingIndex = line.indexOf(')');
  if (openingIndex >= 0 && closingIndex >= 0 && ++openingIndex !== closingIndex) {
    returns = line.substring(openingIndex, closingIndex).split(',').map(t => t.trim() as Type).map(t => ({ type: t, symbolType: typeToSymbolType(t) }));
  }
  // Build signature object
  return {
    params,
    returns,
    getParamsDisplayText: () => params.map(param => `${param.type} ${param.name}`).join(', '),
    getReturnsDisplayText: () => returns.map(returnToken => returnToken.type).join(', ')
  }
}

export function buildModifiedWordContext(original: string, prefix?: string, suffix?: string) {
  const modifiedWordContext = { originalWord: original } as any;
  if (prefix) modifiedWordContext.originalPrefix = prefix;
  if (suffix) modifiedWordContext.originalSuffix = suffix;
  return { modifiedWord: modifiedWordContext };
}
