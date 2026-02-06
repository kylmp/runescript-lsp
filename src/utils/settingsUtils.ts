import type { Connection, DidChangeConfigurationParams } from "vscode-languageserver/node.js";
import { log } from "./logger.js";

export interface Settings {
  enableDiagnostics: boolean;
  enableHover: boolean;
  enableDevMode: boolean;
}

const defaultSettings: Settings = {
  enableDiagnostics: true,
  enableHover: true,
  enableDevMode: false
};

let currentSettings: Settings = { ...defaultSettings };

export function getSettings(): Settings {
  return currentSettings;
}

export function setSettings(next: Settings): void {
  currentSettings = next;
}

export function isHoverEnabled(): boolean {
  return currentSettings.enableHover ?? false;
}

export function isDiagnosticsEnabled(): boolean {
  return currentSettings.enableDiagnostics ?? false;
}

export function isDevMode(): boolean {
  return currentSettings.enableDevMode ?? false;
}

export async function initSettings(connection: Connection): Promise<void> {
  const result = await connection.workspace.getConfiguration({ section: "runescript" });
  if (result && typeof result === "object") {
    const partial = result as Record<string, unknown>;
    currentSettings = {
      ...defaultSettings,
      enableDiagnostics: typeof partial.enableDiagnostics === "boolean" ? partial.enableDiagnostics : defaultSettings.enableDiagnostics,
      enableHover: typeof partial.enableHover === "boolean" ? partial.enableHover : defaultSettings.enableHover,
      enableDevMode: typeof partial.enableDevMode === "boolean" ? partial.enableDevMode : defaultSettings.enableDevMode
    };
  } else {
    currentSettings = { ...defaultSettings };
  }
  log(`settings initialized ${JSON.stringify(currentSettings)}`);
}

export function handleSettingsChange(change: DidChangeConfigurationParams): void {
  const prevSettings = currentSettings;
  if (change.settings && typeof change.settings === "object") {
    const next = (change.settings as Record<string, unknown>).runescript;
    if (next && typeof next === "object") {
      const partial = next as Record<string, unknown>;
      currentSettings = {
        ...defaultSettings,
        enableDiagnostics: typeof partial.enableDiagnostics === "boolean" ? partial.enableDiagnostics : defaultSettings.enableDiagnostics,
        enableHover: typeof partial.enableHover === "boolean" ? partial.enableHover : defaultSettings.enableHover,
        enableDevMode: typeof partial.enableDevMode === "boolean" ? partial.enableDevMode : defaultSettings.enableDevMode
      };
    }
  }
  const changed = prevSettings.enableDiagnostics !== currentSettings.enableDiagnostics || prevSettings.enableHover !== currentSettings.enableHover || prevSettings.enableDevMode !== currentSettings.enableDevMode;
  if (changed) log(`settings update ${JSON.stringify(currentSettings)}`);
}
