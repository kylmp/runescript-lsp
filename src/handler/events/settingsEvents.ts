import type { Connection, DidChangeConfigurationParams } from "vscode-languageserver/node.js";
import { handleSettingsChange } from "../../utils/settingsUtils.js";
import { getIsInitializing } from "../../utils/initUtils.js";

export function registerSettingsChangeHandlers(connection: Connection): void {
  // fires when config (settings) change
  connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    if (getIsInitializing()) return;
    handleSettingsChange(change);
  }); 
} 
