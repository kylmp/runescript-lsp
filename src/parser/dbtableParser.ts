import { ParsedWord } from "../types.js";
import { ParserKind, type ParseRequest, type ParseResult } from "./parser.js";

interface ParsedColumn {
  name: ParsedWord;
  types: string[];
  line: number;
}

interface ParsedTable {
  name: ParsedWord;
  columns: ParsedColumn[];
  startLine: number;
  endLine: number;
}

export interface DbTableFile {
  tables: ParsedTable[];
}

const columnIgnoreTypes = new Set(['LIST','INDEXED','REQUIRED']);

export const dbtableFileParser = (request: ParseRequest): ParseResult | undefined => {
  const tables: ParsedTable[] = [];
  let lineIndex = 0;

  while (lineIndex < request.lines.length) {
    const table = parseTable(request.lines, lineIndex);
    if (!table) break;
    tables.push(table);
    lineIndex = table.endLine + 1;
  }

  return tables.length > 0 ? { kind: ParserKind.DbTable, data: { tables }, fileInfo: request.fileInfo } : undefined;
}

function parseTable(lines: string[], startLine: number): ParsedTable | undefined {
  let definitionLine = -1;

  for (let i = startLine; i < lines.length; i++) {
    if (isDefinitionLine(lines[i])) {
      definitionLine = i;
      break;
    }
  }

  if (definitionLine < 0) return undefined;

  const definitionWord = parseDefinitionWord(lines[definitionLine]);
  if (!definitionWord) return undefined;

  const columns: ParsedColumn[] = [];
  let endLine = lines.length - 1;

  for (let i = definitionLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//")) continue;
    if (isDefinitionLine(line)) {
      endLine = i - 1;
      break;
    }

    const column = parseColumnLine(line, i);
    if (column) columns.push(column);
  }

  return {
    name: definitionWord,
    columns,
    startLine: definitionLine,
    endLine
  };
}

function isDefinitionLine(line: string): boolean {
  const trimmed = stripInlineComment(line).trim();
  if (trimmed.startsWith("//")) return false;
  return trimmed.startsWith("[") && trimmed.endsWith("]") && trimmed.length > 2;
}

function parseDefinitionWord(line: string): ParsedWord | undefined {
  const cleanedLine = stripInlineComment(line);
  const startBracket = cleanedLine.indexOf("[");
  const endBracket = cleanedLine.indexOf("]", startBracket + 1);
  if (startBracket < 0 || endBracket < 0 || endBracket <= startBracket + 1) {
    return undefined;
  }

  return {
    text: cleanedLine.slice(startBracket + 1, endBracket),
    start: startBracket + 1,
    end: endBracket
  };
}

function parseColumnLine(line: string, lineNum: number): ParsedColumn | undefined {
  const cleanedLine = stripInlineComment(line);
  const equalsIndex = cleanedLine.indexOf("=");
  if (equalsIndex < 0) return undefined;

  const key = cleanedLine.slice(0, equalsIndex).trim();
  if (key !== "column") return undefined;

  const valueStart = cleanedLine.slice(equalsIndex + 1).search(/\S/);
  if (valueStart < 0) return undefined;
  const valueOffset = equalsIndex + 1 + valueStart;
  const rawValue = cleanedLine.slice(valueOffset);
  const parts = rawValue.split(",");
  if (parts.length === 0) return undefined;

  const namePart = parts[0].trim();
  if (!namePart) return undefined;
  const leadingSpaceMatch = parts[0].match(/^\s*/);
  const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0].length : 0;
  const nameStart = valueOffset + leadingSpace;
  const nameEnd = nameStart + namePart.length;

  const types: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const type = parts[i].trim();
    if (!type) continue;
    if (columnIgnoreTypes.has(type)) continue;
    types.push(type);
  }

  return {
    name: {
      text: namePart,
      start: nameStart,
      end: nameEnd
    },
    types,
    line: lineNum
  };
}

function stripInlineComment(value: string): string {
  const commentIndex = value.indexOf("//");
  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value;
}
