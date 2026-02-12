import type { SymbolConfig } from '../types.js';
import { DisplayItem } from "./enum/displayItems.js";
import { SemanticTokenType } from './enum/semanticTokens.js';
import { SymbolType } from './enum/symbolTypes.js';
import { Type } from './enum/types.js';
import { Language } from './enum/languages.js';
import { FileType } from './enum/fileTypes.js';
import { categoryPostProcessor, columnPostProcessor, componentPostProcessor, coordPostProcessor, enumPostProcessor, fileNamePostProcessor, gameVarPostProcessor, localVarPostProcessor, paramPostProcessor, rowPostProcessor } from './symbolPostProcessors.js';

export function getSymbolConfig(symbolType: SymbolType): SymbolConfig {
  return symbolConfigs.get(symbolType) ?? symbolConfigs.get(SymbolType.Unknown)!;
}

export function getAllSymbolConfigs(): SymbolConfig[] {
  return [...symbolConfigs.values()];
}

export function typeToSymbolType(type: Type): SymbolType {
  return typeToSymbolTypeMap[type] ?? SymbolType.Unknown;
}

export function typeToSymbolConfig(type: Type): SymbolConfig {
  return getSymbolConfig(typeToSymbolType(type))!;
}

export function fileTypeToSymbolType(fileType: FileType): SymbolType {
  return fileTypeToSymbolTypeMap[fileType] ?? SymbolType.Unknown;
}

export function fileTypeToSymbolConfig(fileType: FileType): SymbolConfig {
  return getSymbolConfig(fileTypeToSymbolType(fileType));
}

const symbolConfigs = new Map<SymbolType, SymbolConfig>([
  [SymbolType.GameVar, {
    symbolType: SymbolType.GameVar, types: [Type.Var], fileTypes: [FileType.Varp, FileType.Varbit, FileType.Vars, FileType.Varn], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Varpconfig, configInclusions: ['type'] },
    postProcessor: gameVarPostProcessor
  }],

  [SymbolType.Constant, {
    symbolType: SymbolType.Constant, types: [], fileTypes: [FileType.Constant], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Constants }
  }],

  [SymbolType.Label, {
    symbolType: SymbolType.Label, types: [Type.Label], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Proc, {
    symbolType: SymbolType.Proc, types: [Type.Proc], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Timer, {
    symbolType: SymbolType.Timer, types: [Type.Timer], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Softtimer, {
    symbolType: SymbolType.Softtimer, types: [Type.Softtimer], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Queue, {
    symbolType: SymbolType.Queue, types: [Type.Queue], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Seq, {
    symbolType: SymbolType.Seq, types: [Type.Seq], fileTypes: [FileType.Seq], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Seqconfig }
  }],

  [SymbolType.Spotanim, {
    symbolType: SymbolType.Spotanim, types: [Type.Spotanim], fileTypes: [FileType.Spotanim], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Spotanimconfig }
  }],

  [SymbolType.Hunt, {
    symbolType: SymbolType.Hunt, types: [Type.Hunt], fileTypes: [FileType.Hunt], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Huntconfig, configInclusions: ['type'] }
  }],

  [SymbolType.Loc, {
    symbolType: SymbolType.Loc, types: [Type.Loc], fileTypes: [FileType.Loc], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Locconfig, configInclusions: ['name', 'desc', 'category'] },
    semanticTokenConfig: { declaration: SemanticTokenType.Function }
  }],

  [SymbolType.Npc, {
    symbolType: SymbolType.Npc, types: [Type.Npc], fileTypes: [FileType.Npc], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Npcconfig, configInclusions: ['name', 'desc', 'category'] }
  }],

  [SymbolType.Obj, {
    symbolType: SymbolType.Obj, types: [Type.Namedobj, Type.Obj], fileTypes: [FileType.Obj], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Objconfig, configInclusions: ['name', 'desc', 'category'] }
  }],

  [SymbolType.Inv, {
    symbolType: SymbolType.Inv, types: [Type.Inv], fileTypes: [FileType.Inv], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Invconfig, configInclusions: ['scope', 'size'] },
    semanticTokenConfig: { declaration: SemanticTokenType.Function, reference: SemanticTokenType.Property }
  }],

  [SymbolType.Enum, {
    symbolType: SymbolType.Enum, types: [Type.Enum], fileTypes: [FileType.Enum], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Enumconfig, configInclusions: ['inputtype', 'outputtype'] },
    postProcessor: enumPostProcessor
  }],

  [SymbolType.Dbcolumn, {
    symbolType: SymbolType.Dbcolumn, types: [Type.Dbcolumn], fileTypes: [FileType.Dbtable], cache: true, allowRename: true, qualifiedName: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Runescript },
    postProcessor: columnPostProcessor
  }],

  [SymbolType.Dbrow, {
    symbolType: SymbolType.Dbrow, types: [Type.Dbrow], fileTypes: [FileType.Dbrow], cache: true, allowRename: true, qualifiedName: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Dbrowconfig, configInclusions: ['table'] },
    semanticTokenConfig: { declaration: SemanticTokenType.Function },
    postProcessor: rowPostProcessor
  }],

  [SymbolType.Dbtable, {
    symbolType: SymbolType.Dbtable, types: [Type.Dbtable], fileTypes: [FileType.Dbtable], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Dbtableconfig }
  }],

  [SymbolType.Interface, {
    symbolType: SymbolType.Interface, types: [Type.Interface], fileTypes: [FileType.If], cache: true, allowRename: false, referenceOnly: true,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Interface },
    postProcessor: fileNamePostProcessor
  }],

  [SymbolType.Component, {
    symbolType: SymbolType.Component, types: [Type.Component], fileTypes: [FileType.If], cache: true, allowRename: true, qualifiedName: true, 
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Interface },
    postProcessor: componentPostProcessor
  }],

  [SymbolType.Param, {
    symbolType: SymbolType.Param, types: [Type.Param], fileTypes: [FileType.Param], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Paramconfig, configInclusions: ['type'] },
    postProcessor: paramPostProcessor
  }],

  [SymbolType.Command, {
    symbolType: SymbolType.Command, types: [], fileTypes: [FileType.Rs2], cache: true, allowRename: false, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] },
    semanticTokenConfig: { declaration: SemanticTokenType.Function, reference: SemanticTokenType.Function }
  }],

  [SymbolType.Synth, {
    symbolType: SymbolType.Synth, types: [Type.Synth], fileTypes: [FileType.Synth], cache: true, allowRename: true, referenceOnly: true, renameFile: true,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Info] },
    postProcessor: fileNamePostProcessor
  }],

  [SymbolType.Model, {
    symbolType: SymbolType.Model, types: [Type.Ob2, Type.Model], fileTypes: [FileType.Ob2], cache: true, allowRename: true, referenceOnly: true, renameFile: true,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Info] }
  }],

  [SymbolType.Walktrigger, {
    symbolType: SymbolType.Walktrigger, types: [Type.Walktrigger], fileTypes: [FileType.Rs2], cache: true, allowRename: true, callable: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Signature] }
  }],

  [SymbolType.Idk, {
    symbolType: SymbolType.Idk, types: [Type.Idk, Type.Idkit], fileTypes: [FileType.Idk], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info, DisplayItem.Codeblock], language: Language.Idkconfig }
  }],

  [SymbolType.Mesanim, {
    symbolType: SymbolType.Mesanim, types: [Type.Mesanim], fileTypes: [FileType.Mesanim], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Mesanimconfig }
  }],

  [SymbolType.Struct, {
    symbolType: SymbolType.Struct, types: [Type.Struct], fileTypes: [FileType.Struct], cache: true, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Info], referenceItems: [DisplayItem.Title, DisplayItem.Info], language: Language.Structconfig }
  }],

  [SymbolType.Category, {
    symbolType: SymbolType.Category, types: [Type.Category], cache: true, allowRename: true, referenceOnly: true,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Value] },
    postProcessor: categoryPostProcessor
  }],

  // =========== UNCACHED SYMBOLS =========== //

  [SymbolType.LocalVar, {
    symbolType: SymbolType.LocalVar, types: [], fileTypes: [FileType.Rs2], cache: false, allowRename: true,
    hoverConfig: { declarationItems: [DisplayItem.Title, DisplayItem.Codeblock], referenceItems: [DisplayItem.Title, DisplayItem.Codeblock], language: Language.Runescript },
    postProcessor: localVarPostProcessor
  }],

  [SymbolType.Coordinates, {
    symbolType: SymbolType.Coordinates, types: [Type.Coord], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Value] },
    postProcessor: coordPostProcessor
  }],

  [SymbolType.ConfigKey, {
    symbolType: SymbolType.ConfigKey, types: [], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Info] },
  }],

  [SymbolType.Trigger, {
    symbolType: SymbolType.Trigger, types: [], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title, DisplayItem.Info] },
  }],

  [SymbolType.Stat, {
    symbolType: SymbolType.Stat, types: [Type.Stat], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title] }
  }],

  [SymbolType.NpcStat, {
    symbolType: SymbolType.NpcStat, types: [Type.NpcStat], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title] }
  }],

  [SymbolType.NpcMode, {
    symbolType: SymbolType.NpcMode, types: [Type.NpcMode], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title] }
  }],

  [SymbolType.Locshape, {
    symbolType: SymbolType.Locshape, types: [Type.Locshape], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title] }
  }],

  [SymbolType.Fontmetrics, {
    symbolType: SymbolType.Fontmetrics, types: [Type.Fontmetrics], cache: false, allowRename: false,
    hoverConfig: { referenceItems: [DisplayItem.Title] }
  }],

  // =========== NO-OPERATION SYMBOLS =========== //

  [SymbolType.Unknown, { 
    symbolType: SymbolType.Unknown, types: [], fileTypes: [], cache: false, allowRename: false, noop: true 
  }],

  [SymbolType.Skip, { 
    symbolType: SymbolType.Skip, types: [], fileTypes: [], cache: false, allowRename: false, noop: true 
  }],

  [SymbolType.Number, { 
    symbolType: SymbolType.Number, types: [Type.Int], fileTypes: [], cache: false, allowRename: false, noop: true, comparisonType: Type.Int  
  }],

  [SymbolType.Keyword, { 
    symbolType: SymbolType.Keyword, types: [], fileTypes: [], cache: false, allowRename: false, noop: true 
  }],

  [SymbolType.Type, { 
    symbolType: SymbolType.Type, types: [], fileTypes: [], cache: false, allowRename: false, noop: true 
  }],

  [SymbolType.Boolean, { 
    symbolType: SymbolType.Boolean, types: [Type.Boolean], fileTypes: [], cache: false, allowRename: false, noop: true, comparisonType: Type.Boolean 
  }],

  [SymbolType.Null, { 
    symbolType: SymbolType.Null, types: [], fileTypes: [], cache: false, allowRename: false, noop: true 
  }],

  [SymbolType.String, { 
    symbolType: SymbolType.String, types: [Type.String], fileTypes: [], cache: false, allowRename: false, noop: true, comparisonType: Type.String 
  }]
]);

// =========== type to symbol functions ===========

const typeToSymbolTypeMap: Partial<Record<Type, SymbolType>> = {};
getAllSymbolConfigs().forEach(config => {
  for (const type of (config.types || [])) {
    typeToSymbolTypeMap[type] = config.symbolType;
  }
});

const fileTypeToSymbolTypeMap: Partial<Record<FileType, SymbolType>> = {};
getAllSymbolConfigs().forEach(config => {
  for (const fileType of (config.fileTypes || [])) {
    fileTypeToSymbolTypeMap[fileType] = config.symbolType;
  }
});
