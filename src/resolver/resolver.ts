import { ParseResult } from "../parser/parser.js";
import { RunescriptSymbol } from "../types.js";

export enum ResolutionMode {
  Definitions = "definitions",
  References = "references",
  All = "all"
}

export function resolveParsedResult(parseResult: ParseResult, resolutionMode = ResolutionMode.All): RunescriptSymbol[] {
  return [];
}
