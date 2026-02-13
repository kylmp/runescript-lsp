import type { Connection, CompletionItem, CompletionParams } from "vscode-languageserver/node.js";
import { getLanguage } from "../utils/handlerUtils.js";

const runescriptCompletionTriggers = ['$', '^', '%', '~', '@', '`', '>', ',', '[', '(', ' '];
const configCompletionTriggers = ['=', ',', '`', '>'];
export const allTriggers = [...new Set([...runescriptCompletionTriggers, ...configCompletionTriggers])];

export function registerCompletionHandler(connection: Connection): void {
  connection.onCompletion((params: CompletionParams): CompletionItem[] => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'runescript') {
      return runescriptCompletionHandler(params);
    } else if (language.endsWith('config') || language === 'interface') {
      return configCompletionHandler(params);
    }
    return [];
  });
}

function configCompletionHandler(params: CompletionParams): CompletionItem[] {
  return [];
}

function runescriptCompletionHandler(params: CompletionParams): CompletionItem[] {
  return [];
}
