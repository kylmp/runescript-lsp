import type { Connection, DidChangeConfigurationParams } from "vscode-languageserver/node.js";
import { handleSettingsChange } from "../utils/settingsUtils.js";

export function registerSettingsChangeHandlers(connection: Connection): void {
  // fires when config (settings) change
  connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    handleSettingsChange(change);
  }); 
} 
