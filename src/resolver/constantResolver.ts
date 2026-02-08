import type { FileCache } from "../cache/FileCache.js";
import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { ConstantFile } from "../parser/constantParser.js";
import type { ParseResult } from "../parser/parser.js";
import { COORD_REGEX, NUMBER_REGEX } from "../resource/enum/regex.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import type { DataRange, ResolvedDefData, ResolvedRefData } from "../types.js";
import { buildDefDataRange } from "../utils/resolverUtils.js";
import { buildFromReference } from "../utils/symbolBuilder.js";
import type { Resolver } from "./resolver.js";

export const ConstantResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined): DataRange<ResolvedDefData>[] {
  const file = parseResult.data as ConstantFile;
  const symbols: DataRange<ResolvedDefData>[] = [];
  for (const [line, constantWords] of file.constants) {
    if (constantWords.length === 2) {
      const value = constantWords[1];
      const valueType = resolveLiteral(value.text);
      const valueSymbol = buildFromReference(value.text, valueType);

      const constant = constantWords[0];
      const constantSymbol = buildFromReference(constant.text, SymbolType.Constant);
      
      symbols.push(buildDefDataRange(constant, line, constantSymbol));
      symbols.push(buildDefDataRange(value, line, valueSymbol));
    }
  }
  return symbols;
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined): DataRange<ResolvedRefData>[] {
  return [];
}

function resolveLiteral(value: string): SymbolType {
  if (COORD_REGEX.test(value)) return SymbolType.Coordinates;
  if (NUMBER_REGEX.test(value)) return SymbolType.Number;
  return SymbolType.String;
}
