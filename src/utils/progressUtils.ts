import type { Connection, WorkDoneProgressReporter } from "vscode-languageserver/node.js";

export type ProgressHandle = {
  report: (percentageOrMessage?: number | string, message?: string) => void;
  done: () => void;
};

let connection: Connection | undefined;

export function initProgress(conn: Connection): void {
  connection = conn;
}

export async function startProgress(title: string, message?: string, percentage = 0, cancellable = false): Promise<ProgressHandle> {
  if (!connection) {
    throw new Error("progressUtils not initialized. Call initProgress(connection) first.");
  }
  const progress = await connection.window.createWorkDoneProgress();
  progress.begin(title, percentage, message, cancellable);
  return wrapProgress(progress);
}

function wrapProgress(progress: WorkDoneProgressReporter): ProgressHandle {
  return {
    report: (percentageOrMessage?: number | string, message?: string) => {
      if (typeof percentageOrMessage === "number") {
        if (message !== undefined) {
          progress.report(percentageOrMessage, message);
          return;
        }
        progress.report(percentageOrMessage);
        return;
      }
      if (typeof percentageOrMessage === "string") {
        progress.report(percentageOrMessage);
      }
    },
    done: () => progress.done(),
  };
}
