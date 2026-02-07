import type { DataRange, ResolvedDefData, ResolvedRefData, ResolvedSymbol, RunescriptSymbol } from "../types.js";
import { type ParseResult, ParserKind } from "../parser/parser.js";
import { ConfigResolver } from "./configResolver.js";
import { ConstantResolver } from "./constantResolver.js";
import { PackResolver } from "./packResolver.js";
import { ScriptResolver } from "./scriptResolver.js";
import { buildFromReference } from "../utils/symbolBuilder.js";
import { FileCache } from "../cache/FileCache.js";
import { WorkspaceCache } from "../cache/WorkspaceCache.js";

export enum ResolutionMode {
  Definitions = "definitions",
  References = "references",
  All = "all"
}

type resolveDefFn = (parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined) => DataRange<ResolvedDefData>[];
type resolveRefFn = (parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined) => DataRange<ResolvedRefData>[];
export type Resolver = {
  resolveDefinitions: resolveDefFn
  resolveReferences: resolveRefFn
}

function getResolver(parserKind: ParserKind): Resolver | undefined {
  switch(parserKind) {
    case ParserKind.Pack: return PackResolver;
    case ParserKind.Script: return ScriptResolver;
    case ParserKind.Config: return ConfigResolver;
    case ParserKind.Gamevar: return ConfigResolver;
    case ParserKind.Constant: return ConstantResolver;
  }
}

export function resolveParsedResult(parseResult: ParseResult, cache: WorkspaceCache, resolutionMode = ResolutionMode.All): number {
  if (!parseResult) return 0;
  const resolver = getResolver(parseResult.kind);
  if (!resolver) return 0;
  let resolvedCount = 0;
  const fileCache = parseResult.fileInfo.isOpen() ? cache.getOrCreateFileCache(parseResult.fileInfo.fsPath) : undefined;
  if (resolutionMode === ResolutionMode.All || resolutionMode === ResolutionMode.Definitions) {
    resolvedCount += resolveAndCacheDefinitions(resolver.resolveDefinitions, parseResult, cache, fileCache);
  }
  if (resolutionMode === ResolutionMode.All || resolutionMode === ResolutionMode.References) {
    resolvedCount += resolveAndCacheReferences(resolver.resolveReferences, parseResult, cache, fileCache);
  }
  return resolvedCount;
}

function resolveAndCacheDefinitions(resolveFn: resolveDefFn, parseResult: ParseResult, cache: WorkspaceCache, fileCache?: FileCache): number {
  const resolvedDefs = resolveFn(parseResult, cache, fileCache);
  for (const resolved of resolvedDefs) {
    if (resolved.data.symbolConfig.cache) {
      cache.getSymbolCache().put(resolved.data.symbol, parseResult!.fileInfo.fsPath);
    }
    if (fileCache) {
      const resolvedSymbol: DataRange<ResolvedSymbol> = { 
        start: resolved.start, 
        end: resolved.end, 
        data: {
          symbol: resolved.data.symbol,
          symbolConfig: resolved.data.symbolConfig,
          definition: true
        }
      }
      fileCache.addSymbol(resolved.data.line, resolvedSymbol);
    }
  }
  return resolvedDefs.length;
}

function resolveAndCacheReferences(resolveFn: resolveRefFn, parseResult: ParseResult, cache: WorkspaceCache, fileCache?: FileCache): number {
  const resolvedRefs = resolveFn(parseResult, cache, fileCache)
  for (const resolved of resolvedRefs) {
    let symbol: RunescriptSymbol | undefined;
    if (resolved.data.symbolConfig.cache) {
      symbol = cache.getSymbolCache().putReference(
        resolved.data.name,
        resolved.data.symbolConfig.symbolType, 
        parseResult!.fileInfo.fsPath,
        resolved.data.line,
        resolved.start, 
        resolved.end,
        resolved.data.id
      );
    } else {
      symbol = buildFromReference(resolved.data.name, resolved.data.symbolConfig.symbolType);
    }
    if (fileCache) {
      const resolvedSymbol: DataRange<ResolvedSymbol> = { 
        start: resolved.start, 
        end: resolved.end, 
        data: {
          symbol: symbol,
          symbolConfig: resolved.data.symbolConfig,
          definition: false
        }
      }
      fileCache.addSymbol(resolved.data.line, resolvedSymbol);
    }
  }
  return resolvedRefs.length;
}
