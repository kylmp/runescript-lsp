import { parseFile, ParseResult, ParserKind } from "./parser/parser.js";
import { ResolutionMode, resolveParsedResult } from "./resolver/resolver.js";
import type { FileInfo } from "./types.js";
import { log } from "./utils/logger.js";
import { startProgress } from "./utils/progressUtils.js";
import { getMonitoredWorkspaceFiles } from "./utils/workspaceUtils.js";

export async function rebuildWorkspace(workspace: string) {
  // Clear workspace caches

  // Scan for workspace files
  let start = performance.now();
  const progress = await startProgress('Indexing Workspace', 'Scanning files...');
  const files: FileInfo[] = await getMonitoredWorkspaceFiles(workspace);
  if (files.length === 0) {
    progress.done();
    return;
  }
  log(`File retrieval duration: ${performance.now() - start} ms`);

  // Parse files
  let done = 0;
  const total = files.length;
  const parsingStartPct = 10;
  const parsingEndPct = 70;
  start = performance.now();
  progress.report(parsingStartPct, 'Parsing files...');
  const parsedFiles: ParseResult[] = await Promise.all(
    files.map(async fileInfo => { 
      const result = await parseFile(fileInfo);
      const current = ++done;
      if (current % 250 === 0 || current === total) {
        const pct = parsingStartPct + Math.floor(((current / total) * (parsingEndPct - parsingStartPct)));
        progress.report(pct, `Parsed ${current}/${total}`);
      }
      return result;
    })
  );
  log(`Parsing duration: ${performance.now() - start} ms`);

  // Partition parsed files
  const constants: ParseResult[] = [];
  const gameVars: ParseResult[] = [];
  const configs: ParseResult[] = [];
  const scripts: ParseResult[] = [];
  const packs: ParseResult[] = [];
  for (const pf of parsedFiles) {
    if (!pf) continue;
    switch (pf.kind) {
      case ParserKind.Gamevar: gameVars.push(pf); break;
      case ParserKind.Constant: constants.push(pf); break;
      case ParserKind.Config: configs.push(pf); break;
      case ParserKind.Script: scripts.push(pf); break;
      case ParserKind.Pack: packs.push(pf); break;
    }
  }
  log(`File counts: [${constants.length} constant files, ${gameVars.length} game var files, ${configs.length} config files, ${scripts.length} runescript files, ${packs.length} pack files]`);

  // Resolve and cache symbols
  start = performance.now();
  progress.report(parsingEndPct, 'Resolving indexes...');
  constants.forEach(constantParsedResult => resolveParsedResult(constantParsedResult, ResolutionMode.All));
  gameVars.forEach(gameVarParsedResult => resolveParsedResult(gameVarParsedResult, ResolutionMode.All));
  configs.forEach(configParsedResult => resolveParsedResult(configParsedResult, ResolutionMode.Definitions));
  scripts.forEach(scriptParsedResult => resolveParsedResult(scriptParsedResult, ResolutionMode.Definitions));
  configs.forEach(configParsedResult => resolveParsedResult(configParsedResult, ResolutionMode.References));
  scripts.forEach(scriptParsedResult => resolveParsedResult(scriptParsedResult, ResolutionMode.References));
  packs.forEach(packParsedResult => resolveParsedResult(packParsedResult, ResolutionMode.All));
  log(`Resolving duration: ${performance.now() - start} ms`);

  // Report diagnostics

  // Re-process all of the opened documents to ensure caches and semantic tokens are up to date
  rebuildOpenDocuments();

  progress.report(100, "Indexing complete");
  await new Promise((r) => setTimeout(r, 1000));
  progress.done();
}

export async function rebuildFile(fileInfo: FileInfo, text?: string) {
  // clear caches

  // parse file
  const parsedFile = await parseFile(fileInfo, text);

  // resolve file (ALL)
  const symbols = resolveParsedResult(parsedFile, ResolutionMode.All);

  // if open file => add to open files cache, process semantic tokens, process highlights
}

function rebuildOpenDocuments() {
  // const openedDocuments = getDocuments().all();
  // for (const doc of openedDocuments) {
  //   doc.
  // }
}
