import { Range } from "vscode-languageserver";
import { DataRange, FileInfo, ResolvedSymbol, RunescriptSymbol } from "../types.js";
import { findMatchInRange } from "../utils/resolverUtils.js";

export class FileCache {
  // Cache of all symbols in the file, per line
  private readonly fileSymbols: Map<number, DataRange<ResolvedSymbol>[]>;

  // key => block name | value => map of local variable symbols keyed by variable name
  private readonly localVarCache: Map<string, Map<string, RunescriptSymbol>>;

  // Tracks the line number range of scripts in the file
  private readonly scriptRanges: DataRange<string>[];

  private readonly symbolRanges: Range[];

  private readonly fileInfo: FileInfo;

  constructor(fileInfo: FileInfo) {
    this.fileSymbols = new Map<number, DataRange<ResolvedSymbol>[]>();
    this.localVarCache = new Map<string, Map<string, RunescriptSymbol>>();
    this.scriptRanges = [];
    this.symbolRanges = [];
    this.fileInfo = fileInfo;
  }

  addSymbol(lineNum: number, symbol: DataRange<ResolvedSymbol>): void {
    this.symbolRanges.push({ 
      start: {line: lineNum, character: symbol.start}, 
      end: {line: lineNum, character: symbol.end}
    });

    let symbols = this.fileSymbols.get(lineNum);
    if (!symbols) {
      this.fileSymbols.set(lineNum, [symbol]);
      return;
    }

    if (symbols.length === 0 || symbols[symbols.length - 1].start <= symbol.start) {
      symbols.push(symbol);
      return;
    }

    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i].start > symbol.start) {
        symbols.splice(i, 0, symbol);
        return;
      }
    }

    symbols.push(symbol);
  }

  getSymbols(): Map<number, DataRange<ResolvedSymbol>[]> {
    return this.fileSymbols;
  }

  getSymbolRanges(): Range[] {
    return this.symbolRanges;
  }

  getLocalVariable(lineNum: number, name: string): RunescriptSymbol | undefined {
    const script = this.getScriptName(lineNum);
    if (!script) return undefined;
    const scriptLocalVariables = this.localVarCache.get(script.data);
    if (!scriptLocalVariables) return undefined;
    return scriptLocalVariables.get(name);
  }

  addScriptRange(startLine: number, endLine: number, blockName: string): void {
    this.scriptRanges.push({ start: startLine, end: endLine, data: blockName });
  }

  getScriptName(lineNum: number) {
    return findMatchInRange(lineNum, this.scriptRanges);
  }

  getFileInfo(): FileInfo {
    return this.fileInfo;
  }
}
