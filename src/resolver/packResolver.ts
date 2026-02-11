import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { PackFile } from "../parser/packParser.js";
import type { ParseResult } from "../parser/parser.js";
import { FileType } from "../resource/enum/fileTypes.js";
import { fileTypeToSymbolType, getSymbolConfig, typeToSymbolType } from "../resource/symbolConfig.js";
import type { DataRange, ResolvedData } from "../types.js";
import { resolveRefDataRange } from "../utils/resolverUtils.js";
import type { Resolver } from "./resolver.js";

export const PackResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(): DataRange<ResolvedData>[] {
  return [];
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as PackFile;
  const idCache = cache.getIdCache();
  let fileName = parseResult.fileInfo.name;
  if (fileName === 'model') fileName = FileType.Ob2;
  if (fileName === 'interface') fileName = FileType.If;
  const symbolType = fileTypeToSymbolType(fileName as FileType);
  const resolvedRefs: DataRange<ResolvedData>[] = [];
  for (const [line, packObj] of file.packLines) {
    const resolved = resolveRefDataRange(symbolType, packObj.value.start, packObj.value.end, line, packObj.value.text, parseResult.fileInfo.type, {id: packObj.id});
    idCache.add(symbolType, resolved.data.id!, resolved.data.name!);
    resolvedRefs.push(resolved);
  }
  return resolvedRefs;
}
