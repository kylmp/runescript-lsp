import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import type { ParseResult } from "../parser/parser.js";
import type { DataRange, ResolvedData } from "../types.js";
import type { Resolver } from "./resolver.js";
import { getScriptTriggerSymbol } from "../resource/scriptTriggers.js";
import { RunescriptFile } from "../parser/runescriptParser.js";
import { warn } from "../utils/logger.js";
import { buildSymbolFromRef, buildSymbolFromDec } from "../utils/symbolBuilder.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { resolveRefDataRange, resolveDefDataRange } from "../utils/resolverUtils.js";

export const ScriptResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as RunescriptFile;
  const fileCache = cache.getFileCache(parseResult.fileInfo.fsPath);
  const resolvedDefs: DataRange<ResolvedData>[] = [];
  for (const script of file.scripts) {
    fileCache?.addScriptRange(script.parsedScript.source.line, script.parsedScript.source.endLine, script.parsedScript.nameString);
    const trigger = script.parsedScript.trigger;
    const triggerType = getScriptTriggerSymbol(trigger.text);
    if (!triggerType) {
      warn(`Unable to resolve trigger details for trigger ${trigger.text}`);
      continue;
    }
    // Resolve trigger symbol
    const triggerSymbol = buildSymbolFromRef(trigger.text, SymbolType.Trigger, parseResult.fileInfo.type);
    resolvedDefs.push(resolveDefDataRange(trigger.source.column, trigger.source.endColumn, trigger.source.line, triggerSymbol, false));

    // Resolve script symbol
    const source = script.parsedScript.name.source;
    const end = script.parsedScript.isStar ? source.endColumn + 1 : source.endColumn;
    if (triggerType.declaration) {
      const scriptSymbol = buildSymbolFromDec(script.parsedScript.nameString, triggerType.symbolType, parseResult.fileInfo, source.line, source.column, source.endColumn, {info: script.info, signature: script.signature});
      resolvedDefs.push(resolveDefDataRange(source.column, end, source.line, scriptSymbol, triggerType.declaration));
    } else {
      resolvedDefs.push(resolveRefDataRange(triggerType.symbolType, source.column, end, source.line, script.parsedScript.nameString, parseResult.fileInfo.type));
    }
 
    // Resolve param (local vars)
    if (fileCache) {
      for (const param of (script.parsedScript.parameters ?? [])) {
        const paramSymbol = buildSymbolFromDec(param.name.text, SymbolType.LocalVar, parseResult.fileInfo, param.source.line, param.name.source.column, param.name.source.endColumn, {extraData: {type: param.typeToken.text}});
        paramSymbol.block = `${param.typeToken.text} ${param.name.text} (parameter)`;
        fileCache.addLocalVariable(paramSymbol, param.source.line, param.name.source.column, param.name.source.endColumn);
      }
    }
  }
  return resolvedDefs;
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  return [];
}
