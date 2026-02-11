import { Location, Range } from "vscode-languageserver";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { SymbolKey } from "../types.js";
import { buildLocation, buildRange } from "./resolverUtils.js";

export function resolveSymbolKey(name: string, symbolType: SymbolType): SymbolKey {
  return `${symbolType}=>${name}`;
}

export function encodeReference(line: number, startIndex: number, endIndex: number): string {
  return `${line}|${startIndex}|${endIndex}`;
}

export function decodeReference(encodedValue?: string): { line: number, start: number, end: number } | undefined {
  if (!encodedValue) return undefined;
  const split = encodedValue.split('|');
  return (split.length !== 3) ? undefined : { line: Number(split[0]), start: Number(split[1]), end: Number(split[2]) };
}

export function decodeToRange(encodedValue?: string): Range | undefined {
  const decoded = decodeReference(encodedValue);
  if (!decoded) return undefined; 
  return buildRange(decoded.start, decoded.end, decoded.line);
}

export function decodeToLocation(uri: string, encodedValue?: string): Location | undefined {
  const decoded = decodeReference(encodedValue);
  if (!decoded) return undefined; 
  return buildLocation(decoded.start, decoded.end, decoded.line, uri);
}
