import type { ScriptFile } from "runescript-parser";
import type { FileInfo } from "../types.js";
import { uriToFileInfo, getFileText, getLines } from "../utils/fileUtils.js";
import { type ConfigFile, configFileParser, gameVarFileParser } from "./configParser.js";
import { type ConstantFile, constantFileParser } from "./constantParser.js";
import { scriptFileParser } from "./scriptParser.js";
import { FileType } from "../resource/enum/fileTypes.js";
import { PackFile, packFileParser } from "./packParser.js";

export enum ParserKind {
  Config = "config",
  Script = "script",
  Constant = "constant",
  Pack = "pack",
  Gamevar = "gamevar"
}

export type ParseRequest = {
  fileInfo: FileInfo,
  lines: string[]
}

export type ParseResult =
  | { kind: ParserKind.Config; data: ConfigFile, fileInfo: FileInfo }
  | { kind: ParserKind.Gamevar; data: ConfigFile, fileInfo: FileInfo }
  | { kind: ParserKind.Script; data: ScriptFile, fileInfo: FileInfo }
  | { kind: ParserKind.Constant; data: ConstantFile, fileInfo: FileInfo }
  | { kind: ParserKind.Pack; data: PackFile, fileInfo: FileInfo }
  | undefined;

type Parser = (request: ParseRequest) => ParseResult;

function getParser(fileType: FileType): Parser {
  switch(fileType) {
    case FileType.Constant: return constantFileParser;
    case FileType.Pack: return packFileParser;
    case FileType.Rs2: return scriptFileParser;
    case FileType.Varbit: case FileType.Varn: case FileType.Varp: case FileType.Vars: return gameVarFileParser;
    default: return configFileParser;
  }
}

export async function parseFile(fileInfo: FileInfo, fileText?: string): Promise<ParseResult> {
  const parser = getParser(fileInfo.type);
  return parser({ fileInfo, lines: getLines(fileText ?? await getFileText(fileInfo.fsPath)) });
}
