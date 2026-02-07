import type { ParsedWord } from "../types.js";
import { ParserKind, type ParseRequest, type ParseResult } from "./parser.js";

interface PackData {
  id: string;
  value: ParsedWord;
}

export interface PackFile {
  packLines: Map<number, PackData>
}

export const packFileParser = (request: ParseRequest): ParseResult | undefined => {
  const packLines = new Map<number, PackData>();

  request.lines.forEach((line, lineNumber) => {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) return;
    const valueParsedWord: ParsedWord = { text: line.substring(separatorIndex + 1), start: separatorIndex + 1, end: line.length }
    packLines.set(lineNumber, { id: line.slice(0, separatorIndex), value: valueParsedWord })
  });

  return packLines.size > 0 ? { kind: ParserKind.Pack, data: { packLines }, fileInfo: request.fileInfo } : undefined;
}
