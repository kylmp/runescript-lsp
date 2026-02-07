import { SymbolType } from "../resource/enum/symbolTypes.js";
import { SymbolKey } from "../types.js";

export function resolveSymbolKey(name: string, symbolType: SymbolType): SymbolKey {
  return name + symbolType;
}

export function encodeReference(line: number, startIndex: number, endIndex: number): string {
  return `${line}|${startIndex}|${endIndex}`;
}

export function decodeReference(encodedValue: string): { line: number, start: number, end: number } | undefined {
  const split = encodedValue.split('|');
  return (split.length !== 3) ? undefined : { line: Number(split[0]), start: Number(split[1]), end: Number(split[2]) };
}
