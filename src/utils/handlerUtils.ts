import { getDocuments } from "./documentUtils.js";

export function getLanguage(params: any): string | undefined {
  return getDocuments().get(params.textDocument.uri)?.languageId;
}
