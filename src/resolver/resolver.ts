import type { DataRange, ResolvedData, ResolvedSymbol, RunescriptSymbol } from "../types.js";
import { type ParseResult, ParserKind } from "../parser/parser.js";
import { ConfigResolver } from "./configResolver.js";
import { ConstantResolver } from "./constantResolver.js";
import { PackResolver } from "./packResolver.js";
import { ScriptResolver } from "./runescriptResolver.js";
import { buildSymbolFromRef } from "../utils/symbolBuilder.js";
import { WorkspaceCache } from "../cache/WorkspaceCache.js";
import { warn } from "../utils/logger.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { SymbolCache } from "../cache/SymbolCache.js";
import { DbTableResolver } from "./dbtableResolver.js"; 

export enum ResolutionMode {
  Definitions = "definitions",
  References = "references",
  All = "all"
}

type resolveFn = (parseResult: ParseResult, cache: WorkspaceCache) => DataRange<ResolvedData>[];
export type Resolver = {
  resolveDefinitions: resolveFn
  resolveReferences: resolveFn
}

function getResolver(parserKind: ParserKind): Resolver | undefined {
  switch(parserKind) {
    case ParserKind.Pack: return PackResolver;
    case ParserKind.Script: return ScriptResolver;
    case ParserKind.Config: return ConfigResolver;
    case ParserKind.Gamevar: return ConfigResolver;
    case ParserKind.Constant: return ConstantResolver;
    case ParserKind.DbTable: return DbTableResolver;
  }
}

export function resolveParsedResult(parseResult: ParseResult, cache: WorkspaceCache, resolutionMode = ResolutionMode.All): number {
  if (!parseResult) return 0;
  const resolver = getResolver(parseResult.kind);
  if (!resolver) return 0;
  let resolvedCount = 0;
  if (resolutionMode === ResolutionMode.All || resolutionMode === ResolutionMode.Definitions) {
    resolvedCount += resolveAndCacheSymbols(resolver.resolveDefinitions, parseResult, cache);
  }
  if (resolutionMode === ResolutionMode.All || resolutionMode === ResolutionMode.References) {
    resolvedCount += resolveAndCacheSymbols(resolver.resolveReferences, parseResult, cache);
  }
  return resolvedCount;
}

function resolveAndCacheSymbols(resolveFn: resolveFn, parseResult: ParseResult, cache: WorkspaceCache): number {
  const resolvedSymbols = resolveFn(parseResult, cache);
  const symbolCache = cache.getSymbolCache();
  const fileCache = cache.getFileCache(parseResult.fileInfo.fsPath);
  for (const resolved of resolvedSymbols) {
    const symbol = resolveSymbol(resolved, parseResult, symbolCache);
    if (fileCache) {
      const resolvedSymbol: DataRange<ResolvedSymbol> = { 
        start: resolved.start, 
        end: resolved.end, 
        data: {
          symbol: symbol,
          symbolConfig: resolved.data.symbolConfig,
          declaration: resolved.data.declaration,
          context: resolved.data.context
        }
      }
      fileCache.addSymbol(resolved.data.line, resolvedSymbol);
    }
  }
  return resolvedSymbols.length;
}

function validateResolvedData(resolved: DataRange<ResolvedData>, parseResult: ParseResult): boolean {
  if (resolved.data.declaration && (!resolved.data.symbol || !resolved.data.symbolConfig.cache)) {
    warn(`Resolved declarations must provide a symbol and be cachable. line=${resolved.data.line}, start=${resolved.start}, end=${resolved.end}, expectedType=${resolved.data.symbolConfig.symbolType} file=${parseResult.fileInfo.fsPath}`);
    return false;
  }
  if (!resolved.data.declaration && resolved.data.symbolConfig.cache && !resolved.data.name) {
    warn(`Cachable references must provide name. line=${resolved.data.line}, start=${resolved.start}, end=${resolved.end}, expectedType=${resolved.data.symbolConfig.symbolType} file=${parseResult.fileInfo.fsPath}`);
    return false;
  }
  if (!resolved.data.declaration && !resolved.data.symbolConfig.cache && !resolved.data.symbol) {
    warn(`Non-cachable references must provide symbol. line=${resolved.data.line}, start=${resolved.start}, end=${resolved.end}, expectedType=${resolved.data.symbolConfig.symbolType} file=${parseResult.fileInfo.fsPath}`);
    return false;
  }
  return true;
}

function resolveSymbol(resolved: DataRange<ResolvedData>, parseResult: ParseResult, symbolCache: SymbolCache): RunescriptSymbol {
  if (resolved.data.symbolConfig.symbolType === SymbolType.Unknown || !validateResolvedData(resolved, parseResult)) {
    const name = resolved.data.symbol?.name ?? resolved.data.name ?? 'unknown';
    return buildSymbolFromRef(name, SymbolType.Unknown, parseResult.fileInfo.type);
  }
  if (resolved.data.declaration) {
    return symbolCache.put(resolved.data.symbol!, parseResult.fileInfo.fsPath)!;
  } else {
    if (resolved.data.symbolConfig.cache) {
      return symbolCache.putReference(
        resolved.data.name!,
        resolved.data.symbolConfig.symbolType, 
        parseResult.fileInfo.fsPath,
        parseResult.fileInfo.type,
        resolved.data.line,
        resolved.start, 
        resolved.end,
        resolved.data.id
      );
    } else {
      return resolved.data.symbol!;
    }
  }
}
