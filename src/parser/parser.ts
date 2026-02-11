import type { FileInfo } from "../types.js";
import { getFileText, getLines } from "../utils/fileUtils.js";
import { type ConfigFile, configFileParser, gameVarFileParser } from "./configParser.js";
import { type ConstantFile, constantFileParser } from "./constantParser.js";
import { RunescriptFile, scriptFileParser } from "./runescriptParser.js";
import { FileType } from "../resource/enum/fileTypes.js";
import { PackFile, packFileParser } from "./packParser.js";
import { DbTableFile, dbtableFileParser } from "./dbtableParser.js";

export enum ParserKind {
  Config = "config",
  Script = "script",
  Constant = "constant",
  Pack = "pack",
  Gamevar = "gamevar",
  DbTable = "dbtable"
}

export type ParseRequest = {
  fileInfo: FileInfo,
  lines: string[]
}

export type ParseResult =
  | { kind: ParserKind.Config; data: ConfigFile; fileInfo: FileInfo }
  | { kind: ParserKind.Gamevar; data: ConfigFile; fileInfo: FileInfo }
  | { kind: ParserKind.Script; data: RunescriptFile; fileInfo: FileInfo }
  | { kind: ParserKind.Constant; data: ConstantFile; fileInfo: FileInfo }
  | { kind: ParserKind.Pack; data: PackFile; fileInfo: FileInfo }
  | { kind: ParserKind.DbTable; data: DbTableFile; fileInfo: FileInfo}

type Parser = (request: ParseRequest) => ParseResult | undefined;

function getParser(fileType: FileType): Parser {
  switch(fileType) {
    case FileType.Constant: return constantFileParser;
    case FileType.Pack: return packFileParser;
    case FileType.Rs2: return scriptFileParser;
    case FileType.Dbtable: return dbtableFileParser;
    case FileType.Varbit: case FileType.Varn: case FileType.Varp: case FileType.Vars: return gameVarFileParser;
    default: return configFileParser;
  }
}

export async function parseFile(fileInfo: FileInfo, fileText?: string): Promise<ParseResult | undefined> {
  const parser = getParser(fileInfo.type);
  return parser({ fileInfo, lines: getLines(fileText ?? await getFileText(fileInfo.fsPath)) });
}
