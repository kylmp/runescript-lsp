import { Node, NodeKind, Script, ScriptFile, ScriptParser } from "runescript-parser";
import { ParserKind, type ParseRequest, type ParseResult } from "./parser.js";
import { Signature } from "../types.js";
import { buildSignature, getInfo } from "../utils/symbolBuilder.js";

interface RunescriptScript {
  parsedScript: Script,
  signature: Signature,
  info: string | undefined
}

export interface RunescriptFile {
  scripts: RunescriptScript[]
}

export const scriptFileParser = (request: ParseRequest): ParseResult | undefined => {
  const scriptFile = parseScriptFile(request.lines);
  return scriptFile ? { kind: ParserKind.Script, data: scriptFile, fileInfo: request.fileInfo } : undefined;
}

function parseScriptFile(lines: string[]): RunescriptFile | undefined {
  const scripts: RunescriptScript[] = [];
  const parserResult = ScriptParser.parseFileTextLines(lines, { tolerant: true }) ?? undefined;
  if (!parserResult) return undefined;
  for (const parsedScript of parserResult.children) {
    if (isScript(parsedScript)) {
      const lineNum = parsedScript.source.line;
      scripts.push({ 
        parsedScript,
        signature: buildSignature(lines[lineNum]),
        info: getInfo(lines[lineNum - 1])
      });
    }
  }
  return { scripts };
}

function isScript(node: Node): node is Script {
  return node.kind === NodeKind.Script;
}
