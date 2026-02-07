import { ScriptFile, ScriptParser } from "runescript-parser";
import { ParserKind, type ParseRequest, type ParseResult } from "./parser.js";

export const scriptFileParser = (request: ParseRequest): ParseResult | undefined => {
  const scriptFile = parseScriptFile(request.lines);
  return scriptFile ? { kind: ParserKind.Script, data: scriptFile, fileInfo: request.fileInfo } : undefined;
}

function parseScriptFile(lines: string[]): ScriptFile | undefined {
  return ScriptParser.parseFileTextLines(lines) ?? undefined;
}
