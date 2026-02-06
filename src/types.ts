import type { ConfigVarArgSrc } from "./resource/configKeys.js";
import type { DisplayItem } from "./resource/enum/displayItems.js";
import type { FileType } from "./resource/enum/fileTypes.js";
import type { Language } from "./resource/enum/languages.js";
import type { SemanticTokenType } from "./resource/enum/semanticTokens.js";
import type { SymbolType } from "./resource/enum/symbolTypes.js";
import type { Type } from "./resource/enum/types.js";

export interface FileInfo { 
  name: string;
  type: FileType;
  uri: string,
  fsPath: string,
  workspace: string
  isOpen: () => boolean
}

/**
 * The MatchType is the config that controls how identifiers are built, cached, and displayed
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
  /** Whether or not identifiers of this match type should be cached */
  cache: boolean;
  /** Whether or not this match type can be a callable or have parameters (like PROC, LOC, COMMAND...) */
  callable?: boolean;
  /** Whether or not identifiers of this type have only references (no definition/declaration). Used mainly for identifiers which refer to a file, like synths. */
  referenceOnly?: boolean;
  /** Whether or not identifiers of this type should be allowed to be renamed (code change) */
  allowRename: boolean;
  /** Whether or not identifiers declaration file name can be renamed (actual file rename) */
  renameFile?: boolean;
  /** Whether or not identifiers of this type is no operation (used for finding matches and terminating matching early, but not ever cached or displayed) */
  noop?: boolean;
  /** The config settings for the hover display of identifiers of this type */
  hoverConfig?: HoverConfig;
  /** The comparison type that is *always* used for this matchType, if it has multiple possible comparison types such as constants, handle that in the identifier instead */
  comparisonType?: Type;
  /** Function that is executed after identifiers of this type have been created (allows for more dynamic runtime info with full context to be tied to an identifier) */
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
  /** Number of lines to skip for displaying a code block (defaults to 1 to skip the declaration line that most types have) */
  blockSkipLines?: number;
  /** Config line items to include in code block. Undefined shows all config items (default). */
  configInclusions?: string[];
}

/**
 * Function format for post processors which run when an identifier is created
 */
export type PostProcessor = (symbol: RunescriptSymbol) => void;

/** Data which defines info about the values a config key expects (key=value(s)) */
export interface ConfigData {
  /** The config key to look for, can be a direct string or a regex to match multiple keys */
  key?: string
  /** The types of the params for this config key, in order */
  params: Type[],
  /** Words to be ignored as params if they belong to this config key */
  ignoreValues?: string[]
  /** If this config key has var args, this data is used by the matcher to figure out the arg match types */
  varArgs?: { 
    /** The param index that the varags start on */
    startIndex: number, 
    /** The source of the symbol where the vararg param types are defined */
    symbolSource: ConfigVarArgSrc, 
    /** The symbol type the identifier where the varag param types are defined */
    symbolType: SymbolType 
  }
}

export type ConfigKey = string;
export interface FileConfigData {
  /** Direct file keys to parse (direct string value) */
  directMap: Map<ConfigKey, ConfigData>,
  /** Regex file keys to test the key against to decide if to parse that config row */
  regexMap: Map<RegExp, ConfigData>
}

/**
 * The data used to represent a signature of a proc or other type
 */
export interface Signature {
  /** The parameters for the signature */
  params: Type[];
  /** The return types for the signature */
  returns: Type[];
  /** The precomputed single line text of the parameters, for display purposes */
  paramsText: string;
  /** The precomputed single line text of the return types, for display purposes */
  returnsText: string;
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
  cacheKey: string;
  /** The location of the declaration/definition of the symbol, if it has one */
  declaration?: { uri: string; ref: string };
  /** The locations (encoded as string) of the references of the symbol */
  references: Record<string, Set<string>>;
  /** The file type where the symbol exists/defined in */
  fileType: string;
  /** The code language the symbol should use for syntax highlighting display purposes */
  language: Language;
  /** For displaying the symbol info text on hover (italicized body text, always on first line of body text) */
  info?: string;
  /** For referencing and displaying on hover the symbol params and return types. */
  signature?: Signature;
  /** For displaying the symbols code block on hover */
  block?: string;
  /** For displaying the symbols value text on hover (plain body text, positioned below info text but above signature or code blocks) */
  value?: string;
  /** Any extra data tied to this symbol */
  extraData?: Record<string, any>;
  /** Boolean indicating if hover text should not display for this symbol */
  hideDisplay?: boolean;
  /** The type(s) this symbol resolves to for comparison operations */
  comparisonTypes?: Type[];
}

export interface ParsedWord {
  text: string;
  start: number;
  end: number;
}
