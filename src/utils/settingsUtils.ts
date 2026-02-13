import type { Connection, DidChangeConfigurationParams } from "vscode-languageserver/node.js";
import { logSettingsChange } from "./logger.js";
import { rebuildAllWorkspaces } from "../manager.js";
import { clearAllHighlights } from "./highlightUtils.js";

export interface Settings {
  enableDiagnostics: boolean;
  enableHover: boolean;
  enableDevMode: boolean;
}

export const SETTINGS_SECTION = "runescript";
export const SETTINGS_KEYS = {
  ENABLE_DIAGNOSTICS: "runescript.enableDiagnostics",
  ENABLE_HOVER: "runescript.enableHover",
  ENABLE_DEV_MODE: "runescript.enableDevMode"
} as const;

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
  const result = await connection.workspace.getConfiguration({ section: SETTINGS_SECTION });
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
  diagnosticsToggled(prevSettings.enableDiagnostics, currentSettings.enableDiagnostics);
  hoverToggled(prevSettings.enableHover, currentSettings.enableHover);
  devModeToggled(prevSettings.enableDevMode, currentSettings.enableDevMode);
}

function diagnosticsToggled(prevValue: boolean, newValue: boolean) {
  const changed = prevValue != newValue;
  if (changed) {
    logSettingsChange('enableDiagnostics', newValue);
  }
}

function hoverToggled(prevValue: boolean, newValue: boolean) {
  const changed = prevValue != newValue;
  if (changed) {
    logSettingsChange('enableHover', newValue);
  }
}

function devModeToggled(prevValue: boolean, newValue: boolean) {
  const changed = prevValue != newValue;
  if (changed) { 
    logSettingsChange('enableDevMode', newValue);
    if (newValue) {
      rebuildAllWorkspaces();
    } else {
      clearAllHighlights();
    }
  }
}
