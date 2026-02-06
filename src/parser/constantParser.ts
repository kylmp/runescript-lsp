import { ParsedWord } from "../types.js";
import { ParserKind, type ParseRequest, type ParseResult } from "./parser.js";

enum ConstantWordType {
  Definition = "definition",
  Value = "value"
}

interface ConstantWord extends ParsedWord {
  type: ConstantWordType
}

export interface ConstantFile {
  constants: Map<number, ConstantWord[]>
}

export const constantFileParser = (request: ParseRequest): ParseResult => {
  const constants = new Map<number, ConstantWord[]>();

  request.lines.forEach((line, lineNumber) => {
    if (!line.startsWith("^")) return;
    const separatorIndex = line.indexOf(" = ");
    if (separatorIndex < 0) return;

    const definitionText = line.slice(1, separatorIndex);
    const valueStart = separatorIndex + 3;
    const rawValue = line.slice(valueStart);
    const commentIndex = rawValue.indexOf("//");
    const valueText = (commentIndex >= 0 ? rawValue.slice(0, commentIndex) : rawValue).trimEnd();
    if (valueText.length === 0) return;

    const words: ConstantWord[] = [
      {
        text: definitionText,
        start: 1,
        end: separatorIndex,
        type: ConstantWordType.Definition
      },
      {
        text: valueText,
        start: valueStart,
        end: valueStart + valueText.length,
        type: ConstantWordType.Value
      }
    ];

    constants.set(lineNumber, words);
  });

  return constants.size > 0 ? { kind: ParserKind.Constant, data: { constants }, fileInfo: request.fileInfo } : undefined;
}
