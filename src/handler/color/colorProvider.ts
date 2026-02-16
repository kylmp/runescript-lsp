import type { Connection, ColorInformation, ColorPresentation, DocumentColorParams, ColorPresentationParams } from "vscode-languageserver/node.js";
import { getLanguage } from "../../utils/handlerUtils.js";
import { color24Presentation, color24Provider } from "./color24Provider.js";
import { recolorPresentation, recolorProvider } from "./recolorProvider.js";

export function registerColorProviderHandler(connection: Connection): void {
  connection.onDocumentColor((params: DocumentColorParams): ColorInformation[] => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'floconfig' || language === 'interface') {
      return color24Provider(params);
    } else if (language.endsWith('config')) {
      return recolorProvider(params);
    }
    return [];
  });

  connection.onColorPresentation((params: ColorPresentationParams): ColorPresentation[] => {
    const language = getLanguage(params);
    if (!language) return [];
    if (language === 'floconfig' || language === 'interface') {
      return color24Presentation(params);
    } else if (language.endsWith('config')) {
      return recolorPresentation(params);
    }
    return [];
  });
}
