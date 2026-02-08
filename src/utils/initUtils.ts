import { log } from "./logger.js";

let isInitializing = true;
let initPromise: Promise<void> | null = null;

export function startInit(promise: Promise<void>): void {
  isInitializing = true;
  initPromise = promise.finally(() => {
    isInitializing = false;
    initPromise = null;
    log(`Initialization and initial workspace indexing complete`);
  });
}

export function getIsInitializing(): boolean {
  return isInitializing;
}

export function getInitPromise(): Promise<void> | null {
  return initPromise;
}
