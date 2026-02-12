import type { ConfigData, FileConfigData } from "../types.js";
import { FileType } from "./enum/fileTypes.js";
import { Type } from "./enum/types.js";
import { SymbolType } from "./enum/symbolTypes.js";
import { monitoredFileTypes } from "../utils/fileUtils.js";

const configDataByFileType: Map<FileType, FileConfigData> = new Map();

export function getFileConfigData(fileType: FileType): FileConfigData {
  if (configDataByFileType.size === 0) {
    initConfigDataByFileType();
  }
  return configDataByFileType.get(fileType) ?? { directMap: new Map(), regexMap: new Map() };
}

interface RegexConfigData extends ConfigData {
  /** The regex to test against config keys */
  regex: RegExp,
  /** The file types this configKeyData applies to, if not defined will apply to all file types */
  fileTypes: FileType[];
}

/**
 * The source of the identifier for config keys which have dynamic varargs
 * Used by the matcher to retrieve the identifier which contains the signature type params 
 */
export enum ConfigVarArgSrc {
  BlockName = 'blockName',
  FirstParam = 'firstParam',
  Column = 'column',
}

/**
 * Defines static config keys (direct match)
 * No need to specify fileType here with a simple key lookup
 */
const configKeys: ConfigData[] = [
  { key: 'walkanim', params: [SymbolType.Seq, SymbolType.Seq, SymbolType.Seq, SymbolType.Seq]},
  { key: 'multivar', params: [SymbolType.GameVar] },
  { key: 'multiloc', params: [SymbolType.Number, SymbolType.Loc] },
  { key: 'multinpc', params: [SymbolType.Number, SymbolType.Npc] },
  { key: 'basevar', params: [SymbolType.GameVar] },
  { key: 'category', params: [SymbolType.Category] },
  { key: 'huntmode', params: [SymbolType.Hunt] },
  { key: 'table', params: [SymbolType.Dbtable] },
  { key: 'check_category', params: [SymbolType.Category] },
  { key: 'check_inv', params: [SymbolType.Inv, SymbolType.Obj] },
  { key: 'param', params: [SymbolType.Param], varArgs: {symbolSource: ConfigVarArgSrc.FirstParam, symbolType: SymbolType.Param}},
  { key: 'val', params: [], varArgs: {symbolSource: ConfigVarArgSrc.BlockName, symbolType: SymbolType.Enum}},
  { key: 'data', params: [SymbolType.Dbcolumn], varArgs: {symbolSource: ConfigVarArgSrc.Column, symbolType: SymbolType.Dbcolumn}},
];

/**
 * Defines regex config keys (check key against regex to find match)
 * Need to specify file types here to limit excessive regex matching
 */
const regexConfigKeys: RegexConfigData[] = [
  { regex: /stock\d+/, params: [SymbolType.Obj, SymbolType.Number, SymbolType.Number], fileTypes: [FileType.Inv] },
  { regex: /count\d+/, params: [SymbolType.Obj, SymbolType.Number], fileTypes: [FileType.Obj] },
  { regex: /frame\d+/, params: [SymbolType.Frame], fileTypes: [FileType.Seq] },
  { regex: /(model|head|womanwear|manwear|womanhead|manhead|activemodel)\d*/, params: [SymbolType.Model], fileTypes: [FileType.Npc, FileType.Loc, FileType.Obj, FileType.Spotanim, FileType.If, FileType.Idk] },
  { regex: /\w*anim\w*/, params: [SymbolType.Seq], fileTypes: [FileType.Loc, FileType.Npc, FileType.If, FileType.Spotanim] },
  { regex: /replaceheldleft|replaceheldright/, params: [SymbolType.Obj], fileTypes: [FileType.Seq], ignoreValues: ["hide"] },
];

/**
 * Build the "known config keys" by file type map used by the parser
 */
const nonConfigTypes = new Set<FileType>([FileType.Pack, FileType.Rs2, FileType.Constant]);

function initConfigDataByFileType(): void {
  monitoredFileTypes.forEach(fileType => {
    if (fileType in nonConfigTypes) return;
    const fileTypeConfig: FileConfigData = { directMap: new Map(), regexMap: new Map() };
    configKeys.forEach(ck => fileTypeConfig.directMap.set(ck.key!, ck));
    regexConfigKeys.forEach(rck => { 
      if (rck.fileTypes.includes(fileType as FileType)) fileTypeConfig.regexMap.set(rck.regex, rck) 
    });
    configDataByFileType.set(fileType, fileTypeConfig);
  });
}

/**
 * Caches config keys found during matching, used by completion provider to suggest values
 */
const observedConfigKeys = new Set<string>();

/**
 * Learn a new config key name (save to the cache)
 * @param key config key name
 */
export function learnConfigKey(key: string): void {
  observedConfigKeys.add(key);
}

/**
 * Returns all of the learned config keys so far
 */
export function getObservedConfigKeys(): Set<string> {
  return observedConfigKeys;
}
