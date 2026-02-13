import type { Range } from "vscode-languageserver";
import type { ConfigVarArgSrc } from "./resource/configKeys.js";
import type { DisplayItem } from "./resource/enum/displayItems.js";
import type { FileType } from "./resource/enum/fileTypes.js";
import type { Language } from "./resource/enum/languages.js";
import type { SemanticTokenType } from "./resource/enum/semanticTokens.js";
import type { SymbolType } from "./resource/enum/symbolTypes.js";
import type { Type } from "./resource/enum/types.js";
import { HighlightKind } from "./utils/highlightUtils.js";

export type ConfigKey = string;
export type SymbolKey = string;
export type FileKey = string;

export interface FileInfo { 
  name: string;
  type: FileType;
  uri: string;
  fsPath: string;
  workspace: string;
  isMonitored: boolean;
  isOpen: () => boolean;
}

/**
 * The MatchType is the config that controls how symbols are built, cached, and displayed
 */
export interface SymbolConfig {
  /** The type of symbol this config is for */
  symbolType: SymbolType;
  /** The types which can correspond to a matchtype (ex: [namedobj, obj] are types for the OBJ matchType) */
  types: Type[];
  /** The file types where a matchType can be defined/declared */
  fileTypes?: FileType[];
  /** Override the color this type will show up as by assigning it to a semantic token type */
  semanticTokenConfig?: { declaration?: SemanticTokenType, reference?: SemanticTokenType }
  /** Whether or not symbols of this match type should be cached */
  cache: boolean;
  /** Whether or not this match type can be a callable or have parameters (like PROC, LOC, COMMAND...) */
  callable?: boolean;
  /** Whether or not symbols of this type have only references (no definition/declaration). Used mainly for symbols which refer to a file, like synths. */
  referenceOnly?: boolean;
  /** Whether or not symbols of this type should be allowed to be renamed (code change) */
  allowRename: boolean;
  /** Whether or not symbols declaration file name can be renamed (actual file rename) */
  renameFile?: boolean;
  /** Whether or not symbols of this type is no operation (used for finding matches and terminating matching early, but not ever cached or displayed) */
  noop?: boolean;
  /** The config settings for the hover display of symbols of this type */
  hoverConfig?: HoverConfig;
  /** The comparison type that is *always* used for this matchType, if it has multiple possible comparison types such as constants, handle that in the symbol instead */
  comparisonType?: Type;
  qualifiedName?: boolean;
  /** Function that is executed after symbols of this type have been created (allows for more dynamic runtime info with full context to be tied to an symbol) */
  postProcessor?: PostProcessor;
}

/**
 * Config which controls how the hover display is built
 */
export interface HoverConfig {
  /** Hover items shown for declarations of a matchType */
  declarationItems?: DisplayItem[];
  /** Hover items shown for references of a matchType */
  referenceItems?: DisplayItem[];
  /** Language used for displaying code blocks of this matchType (for proper syntax highlighting) */
  language?: Language;
  /** Config line items to include in code block. Undefined shows all config items (default). */
  configInclusions?: string[];
}

/**
 * Function format for post processors which run when an symbol is created
 */
export type PostProcessor = (symbol: RunescriptSymbol) => void;

/** Data which defines info about the values a config key expects (key=value(s)) */
export interface ConfigData {
  /** The config key to look for, can be a direct string or a regex to match multiple keys */
  key?: string;
  /** The types of the params for this config key, in order */
  params: SymbolType[];
  /** Words to be ignored as params if they belong to this config key */
  ignoreValues?: string[];
  /** If this config key has var args, this data is used by the matcher to figure out the arg match types */
  varArgs?: { 
    /** The source of the symbol where the vararg param types are defined */
    symbolSource: ConfigVarArgSrc; 
    /** The symbol type the symbol where the varag param types are defined */
    symbolType: SymbolType;
  }
}

export interface FileConfigData {
  /** Direct file keys to parse (direct string value) */
  directMap: Map<ConfigKey, ConfigData>;
  /** Regex file keys to test the key against to decide if to parse that config row */
  regexMap: Map<RegExp, ConfigData>;
}

export interface SignatureReturn {
  type: Type;
  symbolType: SymbolType;
}

export interface SignatureParam extends SignatureReturn {
  name: string;
}

/**
 * The data used to represent a signature of a proc or other type
 */
export interface Signature {
  /** The parameters for the signature */
  params: SignatureParam[];
  /** The return types for the signature */
  returns: SignatureReturn[];
  getParamsDisplayText: () => string;
  getReturnsDisplayText: () => string;
}

/**
 * The definition of a runescript symbol
 * This stores all of the data necessary for the core functions of the extension 
 * (finding references, going to definitions, showing hover display info, etc...)
 */
export interface RunescriptSymbol {
  /** The name of a symbol */
  name: string;
  /** The type of symbol */
  symbolType: SymbolType;
  /** This is the pack id (such as Obj ID 1234), if it has one */
  id?: string;
  /** The cache key for this symbol */
  cacheName?: string;
  /** The location of the declaration/definition of the symbol, if it has one */
  declaration?: { fsPath: string; ref: string };
  /** The locations (encoded as string) of the references of the symbol */
  references: Record<string, Set<string>>;
  /** The file type where the symbol exists/defined in */
  fileType?: string;
  /** The code language the symbol should use for syntax highlighting display purposes */
  language: Language;
  /** For displaying the symbol info text on hover (italicized body text, always on first line of body text) */
  info?: string;
  /** For referencing and displaying on hover the symbol params and return types. */
  signature?: Signature;
  /** For holding type data about dynamic configs */
  dynamicConfigTypes?: Map<number, SymbolType>;
  /** Lines from the config that are saved with the symbol */
  configLines?: Map<string, string[]>;
  /** For displaying the symbols code block on hover */
  block?: string;
  /** For displaying the symbols value text on hover (plain body text, positioned below info text but above signature or code blocks) */
  value?: string;
  /** Any extra data tied to this symbol */
  extraData?: Record<string, any>;
  /** Boolean indicating if hover text should not display for this symbol */
  hideDisplay?: boolean;
  /** The type(s) this symbol resolves to for comparison operations */
  comparisonTypes?: SymbolType[];
  /** Qualifier name, if it has one */
  qualifier?: string;
}

export interface ParsedWord {
  text: string;
  start: number;
  end: number;
}

/**
  * Tracks the keys of symbol declarations and references within a file
  */
export interface FileSymbols {
  declarations: Set<SymbolKey>;
  references: Set<SymbolKey>;
}

export interface SymbolBuilderExtraItems { 
  info?: string;
  signature?: Signature;
  configLines?: Map<string, string[]>;
  extraData?: Record<string, any>;
}

export interface ResolvedSymbol {
  symbol: RunescriptSymbol;
  symbolConfig: SymbolConfig;
  declaration: boolean;
  context?: Record<string, any>;
}

export interface ResolvedData {
  declaration: boolean,
  symbolConfig: SymbolConfig;
  line: number;
  symbol?: RunescriptSymbol;
  name?: string;
  id?: string;
  context?: Record<string, any>;
  extraData?: Record<string, any>;
}

/**
 * A wrapper interface that holds data and the start and end positions that data is contained in
 */
export interface DataRange<T> {
  start: number;
  end: number;
  data: T;
}

export type DevModeHighlightsResponse = {
  uri: string;
  ranges: {kind: HighlightKind, range: Range}[];
};
