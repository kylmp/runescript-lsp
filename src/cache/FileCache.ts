import { Range } from "vscode-languageserver";
import { DataRange, FileInfo, ResolvedSymbol, RunescriptSymbol } from "../types.js";
import { findMatchInRange, resolveDefDataRange } from "../utils/resolverUtils.js";
import { Position } from "vscode-languageserver-textdocument";
import { addReference, buildSymbolFromDec } from "../utils/symbolBuilder.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { warn } from "../utils/logger.js";
import { getSymbolConfig } from "../resource/symbolConfig.js";
import { HighlightKind } from "../utils/highlightUtils.js";

export class FileCache {
  // Cache of all symbols in the file, per line
  private readonly fileSymbols: Map<number, DataRange<ResolvedSymbol>[]>;

  // key => block name | value => map of local variable symbols keyed by variable name
  private readonly localVarCache: Map<string, Map<string, RunescriptSymbol>>;

  // Tracks the line number range of scripts in the file
  private readonly scriptRanges: DataRange<string>[];

  private readonly symbolRanges: {kind: HighlightKind, range: Range}[];

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
      kind: symbol.data.symbol.symbolType === SymbolType.Unknown ? HighlightKind.Unknown : HighlightKind.Symbol,
      range: { 
        start: {line: lineNum, character: symbol.start}, 
        end: {line: lineNum, character: symbol.end}
      }
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

  getAtPosition(position: Position): DataRange<ResolvedSymbol> | undefined {
    return findMatchInRange(position.character, this.fileSymbols.get(position.line))
  }

  getSymbols(): Map<number, DataRange<ResolvedSymbol>[]> {
    return this.fileSymbols;
  }

  getSymbolRanges(): {kind: HighlightKind, range: Range}[] {
    return this.symbolRanges;
  }

  addLocalVariable(localVar: RunescriptSymbol, lineNum: number, start: number, end: number) {
    const scriptName = this.getScriptName(lineNum);
    if (!scriptName) return undefined;
    const scriptLocalVariables = this.localVarCache.get(scriptName.data) ?? new Map<string, RunescriptSymbol>();
    scriptLocalVariables.set(localVar.name, localVar);
    this.localVarCache.set(scriptName.data, scriptLocalVariables);
    const resolvedLocalVar = { start, end, data: { symbol: localVar, symbolConfig: getSymbolConfig(SymbolType.LocalVar), declaration: true}};
    this.addSymbol(lineNum, resolvedLocalVar);
  }

  addLocalVariableReference(name: string, lineNum: number, start: number, end: number) {
    const scriptName = this.getScriptName(lineNum);
    if (!scriptName) return undefined;
    const scriptLocalVariables = this.localVarCache.get(scriptName.data) ?? new Map<string, RunescriptSymbol>();
    const localVarSymbol = scriptLocalVariables.get(name);
    if (!localVarSymbol) {
      warn(`Tried to add local var reference but the definition doesn't exist. localVar=${name}, file=${this.fileInfo.fsPath}`);
      return;
    }
    const refs = addReference(localVarSymbol, this.fileInfo.fsPath, lineNum, start, end);
    localVarSymbol.references[this.fileInfo.fsPath] = refs;
    const resolvedLocalVar = { start, end, data: { symbol: localVarSymbol, symbolConfig: getSymbolConfig(SymbolType.LocalVar), declaration: false}};
    this.addSymbol(lineNum, resolvedLocalVar); 
  }

  getLocalVariable(lineNum: number, name: string): RunescriptSymbol | undefined {
    const scriptName = this.getScriptName(lineNum);
    if (!scriptName) return undefined;
    const scriptLocalVariables = this.localVarCache.get(scriptName.data);
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
