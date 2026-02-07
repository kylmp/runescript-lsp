import { getFileConfigData } from "../resource/configKeys.js";
import { getConfigInclusions } from "../resource/enum/displayItems.js";
import { fileTypeToSymbolType } from "../resource/symbolConfig.js";
import type { ConfigData, FileConfigData, ParsedWord } from "../types.js";
import { type ParseRequest, type ParseResult, ParserKind } from "./parser.js";

enum ConfigWordType {
  Definition = "definition",
  Key = "key",
  Value = "value",
  GameVar = "gamevar",
  Constant = "constant"
}

interface ConfigWord extends ParsedWord {
  type: ConfigWordType;
  valueIndex?: number;
}

interface ConfigItem {
  parsedWords: Map<number, ConfigWord[]>;
  configData: Map<number, ConfigData>;
  displayLines: Map<string, string>;
  startLine: number;
  endLine: number;
}

export interface ConfigFile {
  configItems: ConfigItem[]
}

export const gameVarFileParser = (request: ParseRequest): ParseResult | undefined => {
  const result = configFileParser(request);
  if (!result) return undefined;
  result.kind = ParserKind.Gamevar;
  return result;
}

export const configFileParser = (request: ParseRequest): ParseResult | undefined => {
  const fileConfigData = getFileConfigData(request.fileInfo.type);
  const fileSymbol = fileTypeToSymbolType(request.fileInfo.type);
  const displayKeys = fileSymbol ? getConfigInclusions(fileSymbol) ?? [] : [];
  const configFile = parseConfigFile(request.lines, fileConfigData, new Set(displayKeys));
  return configFile.configItems.length > 0 ? { kind: ParserKind.Config, data: configFile, fileInfo: request.fileInfo } : undefined;
}

function isDefinitionLine(line: string): boolean {
  const trimmed = stripInlineComment(line).trim();
  if (trimmed.startsWith("//")) return false;
  return trimmed.startsWith("[") && trimmed.endsWith("]") && trimmed.length > 2;
}

function parseDefinitionWord(line: string): ConfigWord | undefined {
  const cleanedLine = stripInlineComment(line);
  const startBracket = cleanedLine.indexOf("[");
  const endBracket = cleanedLine.indexOf("]", startBracket + 1);
  if (startBracket < 0 || endBracket < 0 || endBracket <= startBracket + 1) {
    return undefined;
  }

  return {
    text: cleanedLine.slice(startBracket + 1, endBracket),
    start: startBracket + 1,
    end: endBracket,
    type: ConfigWordType.Definition
  };
}

function parseKey(line: string): { key: string; equalsIndex: number; keyStart: number } | undefined {
  const equalsIndex = line.indexOf("=");
  if (equalsIndex < 0) return undefined;

  const keyStart = 0;
  if (equalsIndex === 0) return undefined;

  const key = line.slice(keyStart, equalsIndex);
  if (!key) return undefined;

  return { key, equalsIndex, keyStart };
}

function stripInlineComment(value: string): string {
  const commentIndex = value.indexOf("//");
  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value;
}

function splitOnCommasOutsideQuotes(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inDoubleQuote = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\"") {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }
    if (ch === "," && !inDoubleQuote) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  parts.push(current);
  return parts;
}

function parseKeyValueWords(line: string, key: string, equalsIndex: number, keyStart: number): { value: string; words: ConfigWord[] } {
  const valueStart = line.slice(equalsIndex + 1).search(/\S/);
  const valueOffset = valueStart < 0 ? -1 : equalsIndex + 1 + valueStart;
  const rawValue = valueOffset < 0 ? "" : line.slice(valueOffset);
  const value = stripInlineComment(rawValue).trim();

  const words: ConfigWord[] = [{
    text: key,
    start: keyStart,
    end: equalsIndex,
    type: ConfigWordType.Key
  }];

  if (valueOffset >= 0 && value.length > 0) {
    const valueStartOffset = valueOffset;
    const rawValueNoComment = stripInlineComment(rawValue);
    const parts = splitOnCommasOutsideQuotes(rawValueNoComment);
    let cursor = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const trimmed = part.trim();
      if (!trimmed) {
        cursor += part.length + 1;
        continue;
      }
      const leadingSpaceMatch = part.match(/^\s*/);
      const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0].length : 0;
      let start = valueStartOffset + cursor + leadingSpace;
      let end = start + trimmed.length;
      let text = trimmed;
      let type = ConfigWordType.Value;

      if (!trimmed.startsWith("\"") && trimmed.length > 1) {
        const first = trimmed[0];
        if (first === "%") {
          type = ConfigWordType.GameVar;
          text = trimmed.slice(1);
          start += 1;
        } else if (first === "^") {
          type = ConfigWordType.Constant;
          text = trimmed.slice(1);
          start += 1;
        }
      }

      words.push({
        text,
        start,
        end,
        type,
        valueIndex: i
      });
      cursor += part.length + 1;
    }
  }

  return { value, words };
}

function matchConfigData(configData: FileConfigData, key: string): ConfigData | undefined {
  const direct = configData.directMap.get(key);
  if (direct) return direct;

  for (const [regex, data] of configData.regexMap.entries()) {
    if (regex.test(key)) {
      return data.key ? data : { ...data, key };
    }
  }

  return undefined;
}

export function parseConfigFile(lines: string[], configData: FileConfigData, displayKeys: Set<string>): ConfigFile {
  const configItems: ConfigItem[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const item = parseConfigItem(lines, lineIndex, configData, displayKeys);
    if (!item) break;
    configItems.push(item);
    lineIndex = item.endLine + 1;
  }

  return { configItems };
}

export function parseConfigItem(lines: string[], startLine: number, configData: FileConfigData, displayKeys: Set<string>): ConfigItem | undefined {
  let definitionLine = -1;

  for (let i = startLine; i < lines.length; i++) {
    if (isDefinitionLine(lines[i])) {
      definitionLine = i;
      break;
    }
  }

  if (definitionLine < 0) return undefined;

  const parsedWords = new Map<number, ConfigWord[]>();
  const configDataByLine = new Map<number, ConfigData>();
  const displayLines = new Map<string, string>();

  const definitionWord = parseDefinitionWord(lines[definitionLine]);
  if (definitionWord) {
    parsedWords.set(definitionLine, [definitionWord]);
  }

  let endLine = lines.length - 1;

  for (let i = definitionLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//")) continue;
    if (isDefinitionLine(line)) {
      endLine = i - 1;
      break;
    }

    const parsedKey = parseKey(line);
    if (!parsedKey) continue;

    const match = matchConfigData(configData, parsedKey.key);
    const isDisplayKey = displayKeys.has(parsedKey.key);
    if (!match && !isDisplayKey) continue;

    const parsed = parseKeyValueWords(line, parsedKey.key, parsedKey.equalsIndex, parsedKey.keyStart);

    if (isDisplayKey) {
      displayLines.set(parsedKey.key, parsed.value);
    }

    if (match) {
      configDataByLine.set(i, match);
    }

    parsedWords.set(i, parsed.words);
  }

  return {
    parsedWords,
    configData: configDataByLine,
    displayLines,
    startLine: definitionLine,
    endLine
  };
}
