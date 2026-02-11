import { ConstantFile } from "../parser/constantParser.js";
import type { ParseResult } from "../parser/parser.js";
import { COORD_REGEX, NUMBER_REGEX } from "../resource/enum/regex.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import type { DataRange, ResolvedData } from "../types.js";
import { resolveDefDataRange } from "../utils/resolverUtils.js";
import { buildSymbolFromRef, buildSymbolFromDec } from "../utils/symbolBuilder.js";
import type { Resolver } from "./resolver.js";

export const ConstantResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult): DataRange<ResolvedData>[] {
  const file = parseResult.data as ConstantFile;
  const symbols: DataRange<ResolvedData>[] = [];
  for (const [line, constantWords] of file.constants) {
    if (constantWords.length === 2) {
      const value = constantWords[1];
      const valueType = resolveLiteral(value.text);
      const valueSymbol = buildSymbolFromRef(value.text, valueType, parseResult.fileInfo.type);

      const constant = constantWords[0];
      const constantSymbol = buildSymbolFromDec(constant.text, SymbolType.Constant, parseResult.fileInfo, line, constant.start, constant.end);
      constantSymbol.block = `^${constant.text} = ${value.text}`;
      constantSymbol.comparisonTypes = [valueType];

      symbols.push(resolveDefDataRange(constant.start, constant.end, line, constantSymbol, true));
      symbols.push(resolveDefDataRange(value.start, value.end, line, valueSymbol, false));
    }
  }
  return symbols;
}

function resolveReferences(): DataRange<ResolvedData>[] {
  return [];
}

function resolveLiteral(value: string): SymbolType {
  if (COORD_REGEX.test(value)) return SymbolType.Coordinates;
  if (NUMBER_REGEX.test(value)) return SymbolType.Number;
  return SymbolType.String;
}
