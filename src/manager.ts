import { addWorkspaceCache, clearFile, clearWorkspaceCache, getWorkspaceCache } from "./cache/cacheManager.js";
import { parseFile, ParseResult, ParserKind } from "./parser/parser.js";
import { ResolutionMode, resolveParsedResult } from "./resolver/resolver.js";
import type { FileInfo } from "./types.js";
import { sendAllHighlights, sendFileHighlights } from "./utils/highlightUtils.js";
import { formatMs, log, warn } from "./utils/logger.js";
import { startProgress } from "./utils/progressUtils.js";
import { getMonitoredWorkspaceFiles, getWorkspaceFolders } from "./utils/workspaceUtils.js";

export async function rebuildAllWorkspaces() {
  await Promise.all(getWorkspaceFolders().map(ws => rebuildWorkspace(ws)));
}

export async function rebuildWorkspace(workspace: string) {
  const startRescan = performance.now();
  log(`Starting rescan of workspace ${workspace}`);

  // Clear workspace caches
  let cache = clearWorkspaceCache(workspace);
  if (!cache) cache = addWorkspaceCache(workspace);

  // Scan for workspace files
  let start = performance.now();
  const progress = await startProgress('Indexing Workspace', 'Scanning files...');
  const files: FileInfo[] = await getMonitoredWorkspaceFiles(workspace);
  if (files.length === 0) {
    log(`Not a runescript workspace, no further work will be done on workspace [${workspace}]`);
    progress.done();
    return;
  }
  log(`Rescan: Found ${files.length} files in ${formatMs(performance.now() - start)}`);
 
  // Parse files
  let done = 0;
  const total = files.length;
  const parsingStartPct = 10;
  const parsingEndPct = 70;
  start = performance.now();
  progress.report(parsingStartPct, 'Parsing files...');
  const parsedFiles: ParseResult[] = (await Promise.all(
    files.map(async fileInfo => { 
      cache.addFileCache(fileInfo);
      const result = await parseFile(fileInfo);
      const current = ++done;
      if (current % 250 === 0 || current === total) {
        const pct = parsingStartPct + Math.floor(((current / total) * (parsingEndPct - parsingStartPct)));
        progress.report(pct, `Parsed ${current}/${total}`);
      }
      return result;
    })
  )).filter(pf => pf !== undefined);
  log(`Rescan: Parsed ${parsedFiles.length} files in ${formatMs(performance.now() - start)}`);

  // Partition parsed files
  const constants: ParseResult[] = [];
  const gameVars: ParseResult[] = [];
  const configs: ParseResult[] = [];
  const scripts: ParseResult[] = [];
  const packs: ParseResult[] = [];
  const tables: ParseResult[] = [];
  for (const pf of parsedFiles) {
    switch (pf.kind) {
      case ParserKind.Gamevar: gameVars.push(pf); break;
      case ParserKind.Constant: constants.push(pf); break;
      case ParserKind.Config: configs.push(pf); break;
      case ParserKind.Script: scripts.push(pf); break; 
      case ParserKind.Pack: packs.push(pf); break;
      case ParserKind.DbTable: tables.push(pf); break;
    }
  }

  // Resolve and cache symbols
  start = performance.now();
  let resolved = 0;
  progress.report(parsingEndPct, 'Resolving symbols...');
  constants.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.All));
  gameVars.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.All));
  tables.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.All));
  configs.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.Definitions));
  scripts.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.Definitions));
  configs.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.References));
  scripts.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.References));
  packs.forEach(parsedResult => resolved += resolveParsedResult(parsedResult, cache, ResolutionMode.All));
  log(`Rescan: Resolved ${resolved} symbols in ${formatMs(performance.now() - start)}`);

  // Report diagnostics?
  sendAllHighlights(cache);

  log(`Finished rescan of workspace [${workspace}] in ${formatMs(performance.now() - startRescan)}`);
  progress.report(100, "Indexing complete");
  await new Promise((r) => setTimeout(r, 1000));
  progress.done();
}

export async function rebuildFile(fileInfo: FileInfo, text?: string) {
  const start = performance.now();

  // clear and init new caches
  clearFile(fileInfo.workspace, fileInfo.fsPath);
  const cache = getWorkspaceCache(fileInfo.workspace);
  cache.addFileCache(fileInfo);

  // parse file
  const parsedFile = await parseFile(fileInfo, text);
  if (!parsedFile) return;

  // resolve file 
  const symbolCount = resolveParsedResult(parsedFile, cache, ResolutionMode.All);
  sendFileHighlights(fileInfo);

  // diagnostics?
  log(`Rebuilt file [${fileInfo.name}.${fileInfo.type}] and resolved ${symbolCount} symbols in ${formatMs(performance.now() - start)}`);
}

export function disposeWorkspace(workspace: string) {
  clearWorkspaceCache(workspace);
}

export function disposeFile(fileInfo: FileInfo) {
  getWorkspaceCache(fileInfo.workspace).clearFile(fileInfo.fsPath);
}
