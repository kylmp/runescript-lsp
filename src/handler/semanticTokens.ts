import type { Connection } from "vscode-languageserver/node.js";
import type { SemanticTokens, SemanticTokensParams, SemanticTokensLegend } from "vscode-languageserver/node.js";
import { SemanticTokensBuilder } from "vscode-languageserver/node.js";
import { SemanticTokenType } from "../resource/enum/semanticTokens.js";
import { uriToFileInfo } from "../utils/fileUtils.js";
import { getWorkspaceCache } from "../cache/cacheManager.js";

const tokenTypes = Object.values(SemanticTokenType);
const tokenTypeIndex = new Map(tokenTypes.map((t, i) => [t, i]));

export function registerSemanticTokensHandler(connection: Connection): void {
  connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
    const builder = new SemanticTokensBuilder();
    const fileInfo = uriToFileInfo(params.textDocument.uri);
    const fileCache = getWorkspaceCache(fileInfo.workspace).getFileCache(fileInfo.fsPath);
    if (!fileCache) return builder.build();

    const tokens: { line: number; start: number; length: number; type: number }[] = [];
    fileCache.getSymbols().forEach((symbols, line) => {
      symbols.forEach(symbol => {
        const token = symbol.data.declaration
          ? symbol.data.symbolConfig.semanticTokenConfig?.declaration
          : symbol.data.symbolConfig.semanticTokenConfig?.reference;
        if (!token) return;
        tokens.push({
          line,
          start: symbol.start,
          length: symbol.end - symbol.start,
          type: tokenTypeIndex.get(token)!,
        });
      });
    });

    tokens.sort((a, b) => (a.line - b.line) || (a.start - b.start)).forEach(t => builder.push(t.line, t.start, t.length, t.type, 0));

    return builder.build();
  });
}

export function getSemanticTokensLegend(): SemanticTokensLegend {
  return {
    tokenTypes: tokenTypes,
    tokenModifiers: [],
  };
}
