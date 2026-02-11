import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { DbTableFile } from "../parser/dbtableParser.js";
import type { ParseResult } from "../parser/parser.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import type { DataRange, ResolvedData } from "../types.js";
import { resolveDefDataRange } from "../utils/resolverUtils.js";
import { buildModifiedWordContext, buildSymbolFromDec } from "../utils/symbolBuilder.js";
import type { Resolver } from "./resolver.js";

export const DbTableResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as DbTableFile;
  const fileCache = cache.getFileCache(parseResult.fileInfo.fsPath);
  const resolvedDefs: DataRange<ResolvedData>[] = [];
  for (const table of file.tables) {
    fileCache?.addScriptRange(table.startLine, table.endLine, table.name.text);

    const tableSymbol = buildSymbolFromDec(table.name.text, SymbolType.Dbtable, parseResult.fileInfo, table.startLine, table.name.start, table.name.end);
    resolvedDefs.push(resolveDefDataRange(table.name.start, table.name.end, table.startLine, tableSymbol, true));

    for (const column of table.columns) {
      const name = `${table.name.text}:${column.name.text}`;
      const context = buildModifiedWordContext(column.name.text)
      const columnSymbol = buildSymbolFromDec(name, SymbolType.Dbcolumn, parseResult.fileInfo, column.line, column.name.start, column.name.end, {extraData: {columnTypes: column.types}});
      resolvedDefs.push(resolveDefDataRange(column.name.start, column.name.end, column.line, columnSymbol, true, context));
    }
  }
  return resolvedDefs;
}

function resolveReferences(): DataRange<ResolvedData>[] {
  return [];
}
