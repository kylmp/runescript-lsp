import type { FileCache } from "../cache/FileCache.js";
import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import type { ParseResult } from "../parser/parser.js";
import type { DataRange, ResolvedDefData, ResolvedRefData } from "../types.js";
import type { Resolver } from "./resolver.js";

export const ConstantResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined): DataRange<ResolvedDefData>[] {
  return [];
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache, fileCache: FileCache | undefined): DataRange<ResolvedRefData>[] {
  return [];
}
