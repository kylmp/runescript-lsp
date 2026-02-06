import type { ConfigData, FileConfigData } from "../types.js";
import { FileType } from "./enum/fileTypes.js";
import { Type } from "./enum/types.js";
import { SymbolType } from "./enum/symbolTypes.js";
import { monitoredFileTypes } from "../utils/fileUtils.js";

const configDataByFileType: Map<FileType, FileConfigData> = new Map();

export function getFileConfigData(fileType: FileType): FileConfigData {
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
  FirstParam = 'firstParam'
}

/**
 * Defines static config keys (direct match)
 * No need to specify fileType here with a simple key lookup
 */
const configKeys: ConfigData[] = [
  { key: 'walkanim', params: [Type.Seq, Type.Seq, Type.Seq, Type.Seq]},
  { key: 'multivar', params: [Type.Var] },
  { key: 'multiloc', params: [Type.Int, Type.Loc] },
  { key: 'multinpc', params: [Type.Int, Type.Npc] },
  { key: 'basevar', params: [Type.Var] },
  { key: 'category', params: [Type.Category] },
  { key: 'huntmode', params: [Type.Hunt] },
  { key: 'table', params: [Type.Dbtable] },
  { key: 'check_category', params: [Type.Category] },
  { key: 'check_inv', params: [Type.Inv, Type.Namedobj] },
  { key: 'param', params: [Type.Param], varArgs: {startIndex: 1, symbolSource: ConfigVarArgSrc.FirstParam, symbolType: SymbolType.Param}},
  { key: 'val', params: [], varArgs: {startIndex: 0, symbolSource: ConfigVarArgSrc.BlockName, symbolType: SymbolType.Enum}},
  { key: 'data', params: [Type.Dbcolumn], varArgs: {startIndex: 1, symbolSource: ConfigVarArgSrc.FirstParam, symbolType: SymbolType.Dbcolumn}},
];

/**
 * Defines regex config keys (check key against regex to find match)
 * Need to specify file types here to limit excessive regex matching
 */
const regexConfigKeys: RegexConfigData[] = [
  { regex: /stock\d+/, params: [Type.Obj, Type.Int, Type.Int], fileTypes: [FileType.Inv] },
  { regex: /count\d+/, params: [Type.Obj, Type.Int], fileTypes: [FileType.Obj] },
  { regex: /frame\d+/, params: [Type.Frame], fileTypes: [FileType.Seq] },
  { regex: /(model|head|womanwear|manwear|womanhead|manhead|activemodel)\d*/, params: [Type.Ob2], fileTypes: [FileType.Npc, FileType.Loc, FileType.Obj, FileType.Spotanim, FileType.If, FileType.Idk] },
  { regex: /\w*anim\w*/, params: [Type.Seq], fileTypes: [FileType.Loc, FileType.Npc, FileType.If, FileType.Spotanim] },
  { regex: /replaceheldleft|replaceheldright/, params: [Type.Obj], fileTypes: [FileType.Seq], ignoreValues: ["hide"] },
];

/**
 * Build the "known config keys" by file type map used by the parser
 */
const nonConfigTypes = [FileType.Pack, FileType.Rs2, FileType.Constant];
monitoredFileTypes.forEach(fileType => {
  if (fileType in nonConfigTypes) return;
  const fileTypeConfig: FileConfigData = { directMap: new Map(), regexMap: new Map() };
  configKeys.forEach(ck => fileTypeConfig.directMap.set(ck.key!, ck));
  regexConfigKeys.forEach(rck => { if (fileType in rck.fileTypes) fileTypeConfig.regexMap.set(rck.regex, rck) });
  configDataByFileType.set(fileType, fileTypeConfig);
});

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
