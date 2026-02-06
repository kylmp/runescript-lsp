import { promises as fs } from "fs";
import path from "path";
import { URI } from "vscode-uri";
import { END_OF_LINE_REGEX } from "../resource/enum/regex.js";
import { FileInfo } from "../types.js";
import { FileType } from "../resource/enum/fileTypes.js";
import { getAllSymbolConfigs } from "../resource/symbolConfig.js";
import { findWorkspaceFolder, getWorkspaceFolders } from "./workspaceUtils.js";
import { isOpenDocument } from "./documentUtils.js";

/**
 * Map a uri into a resolved fsPath
 * @param uri the uri string that comes from the LSP file events
 * @returns the resolved fsPath of the uri
 */
export function mapUri(uri: string): string {
  return path.resolve(URI.parse(uri).fsPath);
}

/**
 * Returns the file contents of a uri as a string
 * @param fsPath 
 */
export async function getFileText(fsPath: string) {
  return await fs.readFile(fsPath, "utf8");
}

/**
 * Returns the file info for a uri
 * @param uri the uri to get file info for
 */
export function uriToFileInfo(uri: string): FileInfo {
  const fsPath = mapUri(uri);
  const workspace = findWorkspaceFolder(fsPath) ?? 'none';
  const fileSplit = fsPath.split('\\').pop()!.split('/').pop()!.split('.');
  return { uri, fsPath, workspace, name: fileSplit[0], type: fileSplit[1] as FileType, isOpen: () => isOpenDocument(uri) };
}

/**
 * Returns the file info for a uri
 * @param uri the uri to get file info for
 */
export function fsPathToFileInfo(fsPath: string): FileInfo {
  const uri = URI.file(fsPath).toString();
  const workspace = findWorkspaceFolder(fsPath) ?? 'none';
  const fileSplit = fsPath.split('\\').pop()!.split('/').pop()!.split('.');
  return { uri, fsPath, workspace, name: fileSplit[0], type: fileSplit[1] as FileType, isOpen: () => isOpenDocument(uri) };
}

/**
 * Returns the first line of the input string 
 * @param input string input
 */
export function getLineText(input: string): string {
  const endOfLine = END_OF_LINE_REGEX.exec(input);
  return !endOfLine ? input : input.substring(0, endOfLine.index);
}

/**
 * Returns the input string converted to an array of strings, one for each line
 * @param input string input
 */
export function getLines(input: string): string[] {
  return input.split(END_OF_LINE_REGEX);
}

/**
* Files which this extension is interested in
*/
export const monitoredFileTypes = new Set<FileType>();
monitoredFileTypes.add(FileType.Pack);
getAllSymbolConfigs().filter(config => !config.referenceOnly).forEach(config => {
  const fileTypes = config.fileTypes || [];
  for (const fileType of fileTypes) {
    monitoredFileTypes.add(fileType);
  }
});

/**
* Checks if the file extension of the uri is in the list of monitored file types
*/
export function isValidFile(uri: string): boolean {
  const ext = uri.split(/[#?]/)[0].split('.').pop()?.trim();
  return ext !== undefined && monitoredFileTypes.has(ext as FileType);
}
